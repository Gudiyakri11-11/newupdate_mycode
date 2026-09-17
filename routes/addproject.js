import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// ✅ 1. Identify the user via JWT for ALL routes
router.use(authenticateToken);

/* =========================================
   USER ROUTE: FETCH PROJECT IDs ONLY 
   (Placed BEFORE the Admin Bouncer)
========================================= */
router.get("/project-list", async (req, res) => {
  try {
    const db = await getDbConnection();

    // Query modified to ONLY return ProjectId for standard users
    const result = await db.request().query(`
      SELECT project_id AS ProjectId, 
      project_name AS ProjectName
      FROM projects
      ORDER BY project_name ASC
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching project IDs:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔒 2. STRICT SECURITY BOUNCER: Only pure 'admin' roles can pass this point
const requireAdminOnly = (req, res, next) => {
  const role = req.user?.realRole?.toLowerCase();
  
  if (role === "user") {
    return res.status(403).json({ 
      error: "Access Denied: This API module is strictly restricted to Administrators." 
    });
  }
  
  next(); // User is Admin, let them through
};

// ✅ Apply the bouncer to ALL SUBSEQUENT routes in this file
router.use(requireAdminOnly);

/* =========================================
   ADMIN ROUTE: FETCH ALL MASTER PROJECTS
========================================= */
router.get("/project-list-admin", async (req, res) => {
  try {
    // 1. Check if they are actually logged in
    if (!req.user || !req.user.employeeId) {
      return res.status(401).json({ error: "Unauthorized. Valid token required." });
    }

    // Determine the base identity role
    const currentRole = (req.user.realRole || req.user.role || "").toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";
    const isGuides = currentRole === "guides";

    // 2. 🔒 Strict Access Control: Reject normal users immediately
    if (!isAdmin && !isModerator && !isGuides) {
      return res.status(403).json({ error: "Access Denied: Admins, Moderators, and Guides only." });
    }

    const db = await getDbConnection();
    const request = db.request();

    const { department } = req.query;
    const filters = [];

    // Base query for both roles
    let query = `
      SELECT
        p.project_id         AS ProjectId, 
        p.project_name       AS ProjectName,
        p.project_manager    AS ProjectManager,
        p.manager_id         AS ManagerId,
        p.proxy_manager_name AS ProxyManagerName,
        p.proxy_manager_id   AS ProxyManagerId
      FROM projects p
    `;

    // 3. Apply Row-Level Isolation if they are merely a Moderator
    if (!isAdmin && !isGuides) {
      // Moderators ONLY get projects where they are listed as manager or proxy manager
      filters.push(`
        (
          LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@empId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@empId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@empId))) + '%'
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@empId))) + '%'
        )
      `);
      
      // Pass the employeeId securely to prevent SQL Injection
      request.input("empId", sql.VarChar(50), String(req.user.employeeId).trim());
    }

    if ((isAdmin || isGuides) && department && String(department).trim() !== "") {
      filters.push(`
        EXISTS (
          SELECT 1
          FROM AssociateDetails a
          WHERE LTRIM(RTRIM(CAST(a.ProjectID AS VARCHAR(50)))) = LTRIM(RTRIM(CAST(p.project_id AS VARCHAR(50))))
            AND LTRIM(RTRIM(a.Department)) = LTRIM(RTRIM(@department))
        )
      `);
      request.input("department", sql.VarChar(150), String(department).trim());
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(" AND ")}`;
    }

    // Finish building the query with the ORDER BY clause
    query += ` ORDER BY p.project_name ASC`;

    // 4. Execute the query
    const result = await request.query(query);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching admin project list:", err);
    res.status(500).json({ error: "Failed to fetch project list securely." });
  }
});

/* =========================================
   CREATE PROJECT 
========================================= */
router.post("/post", async (req, res) => {
  try {
    const db = await getDbConnection();
    const r = req.body;

    await db.request()
      .input("ProjectId", sql.NVarChar, r.projectId)
      .input("ProjectName", sql.NVarChar, r.projectName)
      .input("ProjectManager", sql.NVarChar, r.projectManager)
      .input("ManagerId", sql.NVarChar, r.managerId)
      .input("ProxyManagerName", sql.NVarChar, r.proxyManagerName || null)
      .input("ProxyManagerId", sql.NVarChar, r.proxyManagerId || null)
      .query(`
        INSERT INTO projects (
          project_id, project_name, project_manager, 
          manager_id, proxy_manager_name, proxy_manager_id
        )
        VALUES (
          @ProjectId, @ProjectName, @ProjectManager, 
          @ManagerId, @ProxyManagerName, @ProxyManagerId
        )
      `);

    res.status(201).json({ message: "Project created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   UPDATE PROJECT 
========================================= */
router.put("/edit/:projectId", async (req, res) => {
  try {
    const db = await getDbConnection();
    const r = req.body;
    const { projectId } = req.params;

    const result = await db.request()
      .input("ProjectId", sql.NVarChar, projectId)
      .input("ProjectName", sql.NVarChar, r.projectName)
      .input("ProjectManager", sql.NVarChar, r.projectManager)
      .input("ManagerId", sql.NVarChar, r.managerId)
      .input("ProxyManagerName", sql.NVarChar, r.proxyManagerName || null)
      .input("ProxyManagerId", sql.NVarChar, r.proxyManagerId || null)
      .query(`
        UPDATE projects 
        SET 
          project_name = @ProjectName, 
          project_manager = @ProjectManager, 
          manager_id = @ManagerId, 
          proxy_manager_name = @ProxyManagerName, 
          proxy_manager_id = @ProxyManagerId
        WHERE project_id = @ProjectId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(200).json({ message: "Project updated successfully" });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================
   READ OPTIMIZATION RECORDS 
========================================= */
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    const db = await getDbConnection();
    const request = db.request();

    let query = `SELECT * FROM OptimizationTracker WHERE 1=1`;

    if (search) {
      query += ` AND (ProjectId LIKE @search OR AssociateId LIKE @search)`;
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY RowEntryDate DESC`;

    const result = await request.query(query);
    res.status(200).json(result.recordset);

  } catch (err) {
    console.error("Error fetching optimization records:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
