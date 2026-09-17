import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Setup multer for in-memory file buffering (used for Excel upload)
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);

// Global Role Enforcement Security Guard
router.use((req, res, next) => {
    const cleanRole = String(req.user?.realRole || "").trim().toLowerCase();
    if (cleanRole !== "admin" && cleanRole !== "moderator") {
        return res.status(403).json({ error: "Access Denied: Administrative or Moderator clearance required." });
    }
    next();
});

// ============================================================================
// SHARED CTE: Evaluates the "Majority Rules" Project ID for every squad
// OPTIMIZED: Now utilizes the Clean_Squad_Name indexed column
// ============================================================================
const dominantProjectCTE = `
    WITH SquadEmpCounts AS (
        SELECT 
            g.Clean_Squad_Name AS ConcreteSquadName,
            a.ProjectID,
            COUNT(DISTINCT g.Employee_ID) as EmpCount
        FROM [dbo].[GenAI_Productivity_Index] g
        INNER JOIN AssociateDetails a ON LOWER(TRIM(CAST(g.Employee_ID AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
        WHERE g.Clean_Squad_Name IS NOT NULL AND g.Clean_Squad_Name <> '' AND a.ProjectID IS NOT NULL
        GROUP BY g.Clean_Squad_Name, a.ProjectID
    ),
    DominantProject AS (
        SELECT ConcreteSquadName, ProjectID AS DomProjectID
        FROM (
            SELECT 
                ConcreteSquadName, 
                ProjectID, 
                ROW_NUMBER() OVER(PARTITION BY ConcreteSquadName ORDER BY EmpCount DESC, ProjectID ASC) as rn
            FROM SquadEmpCounts
        ) tmp 
        WHERE rn = 1
    )
`;


/**
 * 1. POST: Upload Excel Client Hierarchy (Truncate & Load + Deduplication)
 */
router.post("/upload-client-hierarchy", upload.single("file"), async (req, res) => {
    const cleanRole = String(req.user?.realRole || "").trim().toLowerCase();
    if (cleanRole !== "admin") {
        return res.status(403).json({ error: "Access Denied: Only Admins can upload hierarchy data." });
    }

    if (!req.file) {
        return res.status(400).json({ error: "No Excel file provided." });
    }

    try {
        const pool = await getDbConnection();
        
        // Parse Excel File
        const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (sheetData.length === 0) {
            return res.status(400).json({ error: "The uploaded Excel sheet is empty." });
        }

        // Deduplicate the Excel data based on Project ID
        const uniqueProjectsMap = new Map();
        sheetData.forEach(row => {
            const projId = row["Project ID"] ? String(row["Project ID"]).trim() : null;
            if (projId) {
                // Safely overwrites older duplicates with the latest row
                uniqueProjectsMap.set(projId, row);
            }
        });
        const deduplicatedData = Array.from(uniqueProjectsMap.values());

        // Clear existing data (Complete Overwrite)
        await pool.request().query("TRUNCATE TABLE [dbo].[ClientProjectMapping]");

        // Bulk Insert New Data
        const table = new sql.Table("ClientProjectMapping");
        table.create = false;
        table.columns.add("Project_ID", sql.VarChar(100), { nullable: false });
        table.columns.add("Project_Name", sql.VarChar(255), { nullable: true });
        table.columns.add("Account_ID", sql.VarChar(100), { nullable: true });
        table.columns.add("Account_Name", sql.VarChar(150), { nullable: true });
        table.columns.add("Parent_Customer_ID", sql.VarChar(100), { nullable: true });
        table.columns.add("Parent_Customer_Name", sql.VarChar(150), { nullable: true });

        // Loop over the unique data
        deduplicatedData.forEach(row => {
            table.rows.add(
                String(row["Project ID"]).trim(),
                row["Project Name"] ? String(row["Project Name"]).trim() : null,
                row["Account ID"] ? String(row["Account ID"]).trim() : null,
                row["Account Name"] ? String(row["Account Name"]).trim() : null,
                row["Parent Customer ID"] ? String(row["Parent Customer ID"]).trim() : null,
                row["Parent Customer Name"] ? String(row["Parent Customer Name"]).trim() : null
            );
        });

        const request = pool.request();
        await request.bulk(table);

        return res.json({ message: "Hierarchy data successfully overwritten and updated.", rowsImported: table.rows.length });
    } catch (err) {
        console.error("Excel Upload Error:", err.message);
        return res.status(500).json({ error: "Failed to process and upload Excel data." });
    }
});


/**
 * 2. GET: Fetch Filter Dropdowns metadata based on Active Session Roles & Cascading Hierarchy
 */
router.get("/filters", async (req, res) => {
    const tokenRole = req.user?.realRole ? String(req.user.realRole).trim().toLowerCase() : "";
    const targetRole = tokenRole;

    const rawEmpId = req.user?.employeeId || req.user?.id || req.user?.associateId || req.user?.sub;
    const employeeId = rawEmpId ? String(rawEmpId).trim() : null;

    const parentCustomer = req.query.parentCustomer ? String(req.query.parentCustomer).trim() : "";
    const account = req.query.account ? String(req.query.account).trim() : "";
    const projectId = req.query.projectId ? String(req.query.projectId).trim() : "";

    try {
        const pool = await getDbConnection();
        const request = pool.request();

        // --- CASCADING HIERARCHY LOGIC ---
        let parentCustomersQuery = "SELECT DISTINCT Parent_Customer_Name AS name FROM [dbo].[ClientProjectMapping] WHERE Parent_Customer_Name IS NOT NULL";
        let accountsQuery = "SELECT DISTINCT Account_Name AS name FROM [dbo].[ClientProjectMapping] WHERE Account_Name IS NOT NULL";
        let projectsQuery = "SELECT DISTINCT Project_ID AS id, Project_Name AS name FROM [dbo].[ClientProjectMapping] WHERE Project_ID IS NOT NULL";

        // Moderator override: Limit projects/hierarchy to what they manage
        if (targetRole === "moderator") {
            if (!employeeId) return res.status(403).json({ error: "Invalid session metadata mapping context." });
            request.input("userEmpId", sql.VarChar, employeeId);
            
            const modFilter = ` AND Project_ID IN (
                SELECT project_id FROM [dbo].[projects] 
                WHERE LOWER(TRIM(manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(proxy_manager_id)) LIKE '%' + LOWER(@userEmpId)
            )`;
            parentCustomersQuery += modFilter;
            accountsQuery += modFilter;
            projectsQuery += modFilter;
        }

        // Apply Cascade Filters
        if (parentCustomer && parentCustomer.toLowerCase() !== "all") {
            accountsQuery += " AND Parent_Customer_Name = @parentCustomer";
            projectsQuery += " AND Parent_Customer_Name = @parentCustomer";
            request.input("parentCustomer", sql.VarChar, parentCustomer);
        }

        if (account && account.toLowerCase() !== "all") {
            projectsQuery += " AND Account_Name = @accountFilter";
            request.input("accountFilter", sql.VarChar, account);
        }

        parentCustomersQuery += " ORDER BY name";
        accountsQuery += " ORDER BY name";
        projectsQuery += " ORDER BY name";

        const parentCustomersRes = await request.query(parentCustomersQuery);
        const accountsRes = await request.query(accountsQuery);
        const projectsRes = await request.query(projectsQuery);
        
        // --- STANDARD METADATA ---
        const departmentsRes = await pool.request().query("SELECT DISTINCT Department FROM AssociateDetails WHERE Department IS NOT NULL");
        const stagesRes = await pool.request().query(`
            SELECT DISTINCT UPPER(TRIM(stage)) AS StageName
            FROM [dbo].[Gauge]  
            WHERE stage IS NOT NULL AND TRIM(stage) <> ''
        `);

        // --- SQUADS LOGIC (Optimized with Clean_Squad_Name) ---
        let squadQuery = `
            ${dominantProjectCTE}
            SELECT DISTINCT ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER') AS Squad_Name
            FROM [dbo].[GenAI_Productivity_Index] gpi
            LEFT JOIN AssociateDetails a ON LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
            LEFT JOIN DominantProject dp ON gpi.Clean_Squad_Name = dp.ConcreteSquadName
            LEFT JOIN [dbo].[projects] dp_proj ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(dp_proj.project_id))
            LEFT JOIN [dbo].[ClientProjectMapping] cpm ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(cpm.Project_ID))
            WHERE gpi.Clean_Squad_Name IS NOT NULL AND gpi.Clean_Squad_Name <> ''
        `;

        if (targetRole === "moderator") {
            squadQuery += " AND (LOWER(TRIM(dp_proj.manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(dp_proj.proxy_manager_id)) LIKE '%' + LOWER(@userEmpId))";
        }
        if (parentCustomer && parentCustomer.toLowerCase() !== 'all') {
            squadQuery += " AND cpm.Parent_Customer_Name = @parentCustomer";
        }
        if (account && account.toLowerCase() !== 'all') {
            squadQuery += " AND cpm.Account_Name = @accountFilter";
        }
        if (projectId && projectId.toLowerCase() !== 'all') {
            squadQuery += " AND TRIM(dp.DomProjectID) = TRIM(@projectId)";
            request.input("projectId", sql.VarChar, projectId);
        }

        const squadsRes = await request.query(squadQuery);
        
        let squadsList = squadsRes.recordset.map(r => r.Squad_Name).filter(Boolean) || [];
        squadsList = [...new Set(squadsList)];

        if (!squadsList.includes('OTHER')) {
            squadsList.push('OTHER');
        }

        return res.json({
            parentCustomers: parentCustomersRes.recordset.map(r => r.name) || [],
            accounts: accountsRes.recordset.map(r => r.name) || [],
            projects: projectsRes.recordset || [],
            departments: departmentsRes.recordset.map(r => r.Department) || [],
            stages: stagesRes.recordset.map(r => r.StageName) || [],
            squads: squadsList
        });
    } catch (err) {
        console.error("Failed to compile target selector metadata lists:", err.message);
        return res.status(500).json({ error: "Internal engine metadata synchronization failure." });
    }
});


/**
 * 3. POST: Fetch Metrics Aggregations (PARALLEL EXECUTION)
 */
router.post("/dashboard-metrics", async (req, res) => {
    const { parentCustomer, account, projectId, department, startDate, endDate, squads } = req.body;
    
    const tokenRole = req.user?.realRole ? String(req.user.realRole).trim().toLowerCase() : "";
    const targetRole = tokenRole;

    const rawEmpId = req.user?.employeeId || req.user?.id || req.user?.associateId || req.user?.sub;
    const employeeId = rawEmpId ? String(rawEmpId).trim() : null;

    try {
        const pool = await getDbConnection();
        const request = pool.request();

        let coreFilter = " WHERE 1=1";
        let projectLicenseFilter = " WHERE 1=1";

        if (startDate && startDate.trim() !== "") {
            request.input("startDate", sql.Date, startDate.trim());
        } else {
            request.input("startDate", sql.Date, "2000-01-01");
        }

        if (endDate && endDate.trim() !== "") {
            request.input("endDate", sql.Date, endDate.trim());
        } else {
            request.input("endDate", sql.Date, "2099-12-31");
        }

        // Hierarchy Filters mapped to the ClientProjectMapping (cpm)
        if (parentCustomer && parentCustomer.toLowerCase() !== 'all') {
            coreFilter += " AND cpm.Parent_Customer_Name = @parentCustomer";
            projectLicenseFilter += " AND cpm.Parent_Customer_Name = @parentCustomer";
            request.input("parentCustomer", sql.VarChar, parentCustomer);
        }

        if (account && account.toLowerCase() !== 'all') {
            coreFilter += " AND cpm.Account_Name = @account";
            projectLicenseFilter += " AND cpm.Account_Name = @account";
            request.input("account", sql.VarChar, account);
        }

        // Apply Whole-Squad Project filtering
        if (targetRole === "moderator") {
            if (!employeeId) return res.status(403).json({ error: "Invalid session metadata mapping context." });
            request.input("userEmpId", sql.VarChar, employeeId);

            if (projectId && String(projectId).trim() !== "" && String(projectId).toLowerCase() !== 'all') {
                coreFilter += " AND TRIM(dp.DomProjectID) = TRIM(@projectId) AND (LOWER(TRIM(dp_proj.manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(dp_proj.proxy_manager_id)) LIKE '%' + LOWER(@userEmpId))";
                projectLicenseFilter += " AND TRIM(CAST(a.ProjectID AS VARCHAR(100))) = TRIM(@projectId) AND (LOWER(TRIM(p.manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(p.proxy_manager_id)) LIKE '%' + LOWER(@userEmpId))";
                request.input("projectId", sql.VarChar, String(projectId).trim());
            } else {
                coreFilter += " AND (LOWER(TRIM(dp_proj.manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(dp_proj.proxy_manager_id)) LIKE '%' + LOWER(@userEmpId))";
                projectLicenseFilter += " AND (LOWER(TRIM(p.manager_id)) LIKE '%' + LOWER(@userEmpId) OR LOWER(TRIM(p.proxy_manager_id)) LIKE '%' + LOWER(@userEmpId))";
            }
        } else {
            if (projectId && String(projectId).toLowerCase() !== 'all') { 
                coreFilter += " AND TRIM(dp.DomProjectID) = TRIM(@projectId)"; 
                projectLicenseFilter += " AND TRIM(CAST(a.ProjectID AS VARCHAR(100))) = TRIM(@projectId)"; 
                request.input("projectId", sql.VarChar, projectId); 
            }
            if (department) { 
                coreFilter += " AND a.Department = @department"; 
                projectLicenseFilter += " AND a.Department = @department"; 
                request.input("department", sql.VarChar, department); 
            }
        }

        // Concrete Squad Checkbox Formatting (Optimized)
        if (Array.isArray(squads) && squads.length > 0) {
            let squadFilterSnippets = [];
            let includeUnassigned = false;

            squads.forEach((squad, index) => {
                if (squad === 'OTHER' || squad === 'Other') {
                    includeUnassigned = true;
                } else {
                    const paramName = `squad_param_${index}`;
                    request.input(paramName, sql.VarChar, squad);
                    squadFilterSnippets.push(`@${paramName}`);
                }
            });

            let conditions = [];
            if (squadFilterSnippets.length > 0) {
                conditions.push(`gpi.Clean_Squad_Name IN (${squadFilterSnippets.join(', ')})`);
            }
            if (includeUnassigned) {
                conditions.push(`gpi.Clean_Squad_Name IS NULL OR gpi.Clean_Squad_Name = ''`);
            }

            if (conditions.length > 0) {
                coreFilter += ` AND (${conditions.join(' OR ')})`;
                projectLicenseFilter += ` AND (${conditions.join(' OR ')})`;
            }
        }

        const strictTimeFilter = coreFilter + " AND gpi.Start_Date >= @startDate AND gpi.End_Date <= @endDate";

        // --- Chart 1 Query: GHCP License Adaptation (Updated for Latest Squad Mapping) ---
        const licenseQuery = `
            ${dominantProjectCTE},
            EmployeeLatestSquad AS (
                SELECT Employee_ID, Clean_Squad_Name
                FROM (
                    -- Rank squads by End_Date to find the most recent assignment for each employee
                    SELECT Employee_ID, Clean_Squad_Name,
                           ROW_NUMBER() OVER(PARTITION BY Employee_ID ORDER BY End_Date DESC) as rn
                    FROM [dbo].[GenAI_Productivity_Index]
                    WHERE Clean_Squad_Name IS NOT NULL AND Clean_Squad_Name <> ''
                ) tmp
                WHERE rn = 1
            ),
            UniqueEmployeeLicenses AS (
                SELECT
                    g.employee_id,
                    MAX(CASE WHEN LOWER(TRIM(g.has_ghcp_license)) = 'yes' THEN 1 ELSE 0 END) AS HasLicenseFlag,
                    ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER') AS ConcreteSquadName
                FROM [dbo].[Gauge] g
                -- Join mapping using the Latest Squad logic instead of date overlap
                LEFT JOIN EmployeeLatestSquad gpi ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) = LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50))))
                LEFT JOIN AssociateDetails a ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
                LEFT JOIN DominantProject dp ON gpi.Clean_Squad_Name = dp.ConcreteSquadName
                LEFT JOIN [dbo].[projects] dp_proj ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(dp_proj.project_id))
                LEFT JOIN [dbo].[ClientProjectMapping] cpm ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(cpm.Project_ID))
                ${coreFilter}
                AND g.date >= @startDate AND g.date <= @endDate
                GROUP BY 
                    g.employee_id, 
                    ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER')
            )
            SELECT
                ConcreteSquadName AS Squad,
                SUM(HasLicenseFlag) AS HasLicense,
                SUM(CASE WHEN HasLicenseFlag = 0 THEN 1 ELSE 0 END) AS NoLicense
            FROM UniqueEmployeeLicenses
            GROUP BY ConcreteSquadName
        `;

        // --- Project-wise GHCP License Adaptation ---
        const projectLicenseQuery = `
            WITH UniqueEmployeeProjectLicenses AS (
                SELECT
                    g.employee_id,
                    COALESCE(
                        NULLIF(TRIM(CAST(a.ProjectID AS VARCHAR(100))), ''),
                        'UNASSIGNED'
                    ) AS ProjectID,
                    COALESCE(
                        NULLIF(TRIM(cpm.Project_Name), ''),
                        NULLIF(TRIM(p.project_name), ''),
                        NULLIF(TRIM(CAST(a.ProjectID AS VARCHAR(100))), ''),
                        'UNASSIGNED'
                    ) AS ProjectName,
                    MAX(
                        CASE
                            WHEN LOWER(TRIM(g.has_ghcp_license)) = 'yes' THEN 1
                            ELSE 0
                        END
                    ) AS HasLicenseFlag
                FROM [dbo].[Gauge] g
                LEFT JOIN AssociateDetails a
                    ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) =
                       LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
                LEFT JOIN [dbo].[projects] p
                    ON LOWER(TRIM(CAST(a.ProjectID AS VARCHAR(100)))) =
                       LOWER(TRIM(CAST(p.project_id AS VARCHAR(100))))
                LEFT JOIN [dbo].[ClientProjectMapping] cpm 
                    ON LOWER(TRIM(CAST(a.ProjectID AS VARCHAR(100)))) = LOWER(TRIM(cpm.Project_ID))
                LEFT JOIN [dbo].[GenAI_Productivity_Index] gpi
                    ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) =
                       LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50))))
                    AND g.date >= gpi.Start_Date
                    AND g.date <= gpi.End_Date
                ${projectLicenseFilter}
                AND g.date >= @startDate
                AND g.date <= @endDate
                GROUP BY
                    g.employee_id,
                    COALESCE(NULLIF(TRIM(CAST(a.ProjectID AS VARCHAR(100))), ''), 'UNASSIGNED'),
                    COALESCE(NULLIF(TRIM(cpm.Project_Name), ''), NULLIF(TRIM(p.project_name), ''), NULLIF(TRIM(CAST(a.ProjectID AS VARCHAR(100))), ''), 'UNASSIGNED')
            )
            SELECT
                ProjectID,
                ProjectName,
                SUM(HasLicenseFlag) AS HasLicense,
                SUM(CASE WHEN HasLicenseFlag = 0 THEN 1 ELSE 0 END) AS NoLicense
            FROM UniqueEmployeeProjectLicenses
            GROUP BY ProjectID, ProjectName
            ORDER BY ProjectName ASC
        `;

        // --- Chart 2 Query: Copilot Exclusion (Optimized) ---
        const exclusionQuery = `
            ${dominantProjectCTE}
            SELECT
                ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER') AS Squad_Name,
                ISNULL(parsed.Exclusion_Reason, 'Others') AS Exclusion_Reason,
                SUM(ISNULL(TRY_CAST(parsed.Story_Points AS INT), 0)) AS TotalStoryPoints
            FROM [dbo].[GenAI_Productivity_Index] gpi
            LEFT JOIN AssociateDetails a ON LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
            LEFT JOIN DominantProject dp ON gpi.Clean_Squad_Name = dp.ConcreteSquadName
            LEFT JOIN [dbo].[projects] dp_proj ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(dp_proj.project_id))
            LEFT JOIN [dbo].[ClientProjectMapping] cpm ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(cpm.Project_ID))
            CROSS APPLY OPENJSON(
                CASE 
                    WHEN ISJSON(gpi.Exclusion_Reason) = 1 THEN gpi.Exclusion_Reason 
                    ELSE NULL 
                END
            )
            WITH (
                Exclusion_Reason VARCHAR(255) '$.reason',
                Story_Points VARCHAR(50) '$.storyPoints'
            ) AS parsed
            ${strictTimeFilter}
            GROUP BY 
                ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER'), 
                parsed.Exclusion_Reason
        `;

        // --- Chart 3 Query: Sprint Velocity (Optimized) ---
        const velocityQuery = `
            ${dominantProjectCTE},
            SprintAggregations AS (
                SELECT 
                    ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER') AS Squad_Name,
                    gpi.Start_Date,
                    SUM(ISNULL(gpi.Actual_Delivered_Story_Points_With_GenAI, 0)) AS DeliveredPoints
                FROM [dbo].[GenAI_Productivity_Index] gpi
                LEFT JOIN AssociateDetails a ON LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
                LEFT JOIN DominantProject dp ON gpi.Clean_Squad_Name = dp.ConcreteSquadName
                LEFT JOIN [dbo].[projects] dp_proj ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(dp_proj.project_id))
                LEFT JOIN [dbo].[ClientProjectMapping] cpm ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(cpm.Project_ID))
                ${strictTimeFilter}
                GROUP BY 
                    ISNULL(NULLIF(gpi.Clean_Squad_Name, ''), 'OTHER'),
                    gpi.Start_Date
            ),
            RankedSprints AS (
                SELECT 
                    Squad_Name,
                    Squad_Name + ' (' + FORMAT(Start_Date, 'MMM dd') + ')' AS Sprint_Name,
                    DeliveredPoints,
                    Start_Date,
                    DENSE_RANK() OVER (PARTITION BY Squad_Name ORDER BY Start_Date DESC) AS SprintRank
                FROM SprintAggregations
            )
            SELECT Squad_Name, Sprint_Name, DeliveredPoints
            FROM RankedSprints
            WHERE SprintRank <= 6
            ORDER BY Squad_Name ASC, Start_Date ASC
        `;

        // --- Chart 4 Query: GenAI Usage Trend (Updated to match JS logic exactly) ---
        const usageTrendQuery = `
            ${dominantProjectCTE},
            StandardizedPulseItems AS (
                SELECT 
                    CASE 
                        WHEN LOWER(TRIM(g.stage)) IN ('business requirements', 'business requirement') THEN 'BUSINESS REQUIREMENT'
                        WHEN LOWER(TRIM(g.stage)) IN ('code & build', 'code and build') THEN 'CODE & BUILD'
                        WHEN LOWER(TRIM(g.stage)) = 'design' THEN 'DESIGN'
                        WHEN LOWER(TRIM(g.stage)) IN ('test & review', 'test and review') THEN 'TEST & REVIEW'
                        WHEN LOWER(TRIM(g.stage)) IN ('deploy & hypercare', 'deploy and hypercare') THEN 'DEPLOY & HYPERCARE'
                        WHEN LOWER(TRIM(g.stage)) IN ('domain or business use case', 'domain use case') THEN 'DOMAIN OR BUSINESS USE CASE'
                        ELSE 'OTHER'
                    END AS StandardStageName,
                    SUM(ISNULL(g.items_with_genai_tools, 0)) AS TotalGenAIItems,
                    SUM(ISNULL(g.items_without_genai_tools, 0)) AS TotalEstimatedItems
                FROM [dbo].[Gauge] g
                LEFT JOIN AssociateDetails a ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) = LOWER(TRIM(CAST(a.AssociateID AS VARCHAR(50))))
                LEFT JOIN [dbo].[GenAI_Productivity_Index] gpi ON LOWER(TRIM(CAST(g.employee_id AS VARCHAR(50)))) = LOWER(TRIM(CAST(gpi.Employee_ID AS VARCHAR(50))))
                    AND g.date >= gpi.Start_Date AND g.date <= gpi.End_Date
                LEFT JOIN DominantProject dp ON gpi.Clean_Squad_Name = dp.ConcreteSquadName
                LEFT JOIN [dbo].[projects] dp_proj ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(dp_proj.project_id))
                LEFT JOIN [dbo].[ClientProjectMapping] cpm ON LOWER(TRIM(dp.DomProjectID)) = LOWER(TRIM(cpm.Project_ID))
                ${coreFilter}
                ${startDate && startDate.trim() !== "" ? ` AND g.date >= '${startDate.trim()}'` : ""}
                ${endDate && endDate.trim() !== "" ? ` AND g.date <= '${endDate.trim()}'` : ""}
                AND g.stage IS NOT NULL AND TRIM(g.stage) <> ''
                GROUP BY 
                    CASE 
                        WHEN LOWER(TRIM(g.stage)) IN ('business requirements', 'business requirement') THEN 'BUSINESS REQUIREMENT'
                        WHEN LOWER(TRIM(g.stage)) IN ('code & build', 'code and build') THEN 'CODE & BUILD'
                        WHEN LOWER(TRIM(g.stage)) = 'design' THEN 'DESIGN'
                        WHEN LOWER(TRIM(g.stage)) IN ('test & review', 'test and review') THEN 'TEST & REVIEW'
                        WHEN LOWER(TRIM(g.stage)) IN ('deploy & hypercare', 'deploy and hypercare') THEN 'DEPLOY & HYPERCARE'
                        WHEN LOWER(TRIM(g.stage)) IN ('domain or business use case', 'domain use case') THEN 'DOMAIN OR BUSINESS USE CASE'
                        ELSE 'OTHER'
                    END
            ),
            PulseMath AS (
                SELECT 
                    StandardStageName AS StageName,
                    TotalGenAIItems,
                    TotalEstimatedItems,
                    -- Step 1: Prevent Division by Zero
                    CASE WHEN TotalEstimatedItems > 0 THEN CAST(TotalEstimatedItems AS FLOAT) ELSE 1.0 END AS SafeEstimatedItems,
                    -- Step 2: Calculate Manual Items
                    CAST((TotalEstimatedItems - TotalGenAIItems) AS FLOAT) AS ManualItems
                FROM StandardizedPulseItems
            )
            SELECT 
                StageName,
                TotalGenAIItems,
                TotalEstimatedItems,
                -- Step 3: Exact Human/Machine Percent Math
                ROUND((ManualItems / SafeEstimatedItems) * 100.0, 2) AS HumanPercent,
                ROUND((CAST(TotalGenAIItems AS FLOAT) / SafeEstimatedItems) * 100.0, 2) AS MachinePercent
            FROM PulseMath
            ORDER BY StageName ASC
        `;

        // --- NEW: Execute all queries concurrently to prevent bottlenecks ---
        const executeConcurrently = (queryStr) => {
            const req = pool.request();
            // Map over the input parameters established on the main 'request' object
            Object.keys(request.parameters).forEach(key => {
                const param = request.parameters[key];
                req.input(key, param.type, param.value);
            });
            return req.query(queryStr);
        };

        const [
            licenseRes, 
            projectLicenseRes, 
            exclusionRes, 
            velocityRes, 
            usageTrendRes
        ] = await Promise.all([
            executeConcurrently(licenseQuery),
            executeConcurrently(projectLicenseQuery),
            executeConcurrently(exclusionQuery),
            executeConcurrently(velocityQuery),
            executeConcurrently(usageTrendQuery)
        ]);

        return res.json({
            licenseData: licenseRes.recordset || [],
            projectLicenseData: projectLicenseRes.recordset || [],
            exclusionData: exclusionRes.recordset || [],
            velocityData: velocityRes.recordset || [],
            usageTrendData: usageTrendRes.recordset || []
        });
    } catch (err) {
        console.error("SQL Metrics Error context tracker:", err.message);
        return res.status(500).json({ error: "Failed to calculate dashboard data metrics", details: err.message });
    }
});

export default router;