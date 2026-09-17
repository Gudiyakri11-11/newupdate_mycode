import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; // ✅ Import Security Middleware

const router = express.Router();

// ✅ Enforce authentication globally on this router
router.use(authenticateToken);

/* =========================================
   UTILITIES & NORMALIZERS
========================================= */

// ✅ FIX: Deep-cleans mangled JSON strings that were accidentally spread into character arrays
function cleanMangledJson(data) {
  if (!data) return {};
  
  let parsed = data;
  
  // 1. Unwrap strings if it was double-stringified
  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      return {}; 
    }
  }

  // 2. Strip out garbage numeric keys (0, 1, 2...) caused by string-spreading
  if (typeof parsed === "object" && parsed !== null) {
    const cleaned = {};
    for (const key in parsed) {
      // If the key is NOT a number, keep it (this saves the real keys like 'alertReduction')
      if (isNaN(key)) {
        cleaned[key] = parsed[key];
      }
    }
    return cleaned;
  }

  return {};
}

// Cleans frontend payloads before saving to DB
function cleanAndStringify(data) {
  const cleanedObject = cleanMangledJson(data);
  return JSON.stringify(cleanedObject);
}

// Ensures categories are properly joined whether they arrive as an array or a string
function formatCategories(categories) {
  if (Array.isArray(categories)) return categories.join("|");
  if (typeof categories === "string") return categories;
  return "";
}

function normalizeNeuroIT(row) {
  if (!row) return null;

  return {
    id: row.NeuroITId,
    employeeId: row.EmployeeId,
    submittedBy: row.EmployeeId, // ✅ FIX: Maps ID to submittedBy to satisfy frontend expectations
    title: row.Title,
    projectName: row.ProjectName,              
    projectId: row.ProjectId,                    
    contributors: row.Contributors,              
    account: row.Account,
    applicationsImpacted: row.ApplicationsImpacted,
    categories: row.Categories ? row.Categories.split("|") : [],
    statusType: row.StatusType,
    problemDescription: row.ProblemDescription,
    operationalImpact: row.OperationalImpact,
    neuroitCapability: row.NeuroITCapability,
    toolsUsed: row.ToolsUsed,
    solutionDescription: row.SolutionDescription,
    automationType: row.AutomationType,
    benefits: cleanMangledJson(row.Benefits), // ✅ Returns clean object to UI
    metrics: cleanMangledJson(row.Metrics),   // ✅ Returns clean object to UI
    reusable: row.Reusable,
    scalePotential: row.ScalePotential,
    executiveOutcome: row.ExecutiveOutcome,
    documentLink: row.DocumentLink,
    status: row.Status,
    reworkReason: row.ReworkReason,
    declineReason: row.DeclineReason,
    createdAt: row.CreatedAt,
    lastUpdated: row.LastUpdated
  };
}

/* =========================================
   REPOSITORY HELPERS (Secured & Aligned)
========================================= */

/**
 * Fetch NeuroIT use cases (Secured by Role)
 */
/* =========================================
   REPLACEABLE COMPONENT-LEVEL HELPERS
========================================= */

async function getNeuroIT(status, scope, user) {
  const pool = await getDbConnection();
  const request = pool.request();

  let query = "SELECT * FROM NeuroITUseCases WHERE 1=1";

  if (status) {
    query += " AND Status = @status";
    request.input("status", sql.NVarChar(40), status);
  }

  // 🛑 CRITICAL SECURITY LOGIC 🛑
  const isAdmin = user && (user.realRole === "admin" || user.realRole === "moderator" || user.realRole === "ADMIN");

  if (scope === "all" && isAdmin) {
    // 1. ADMIN DASHBOARD: Admin explicitly asking for all data. No filter applied.
  } 
  else if (scope === "global" && status === "APPROVED") {
    // 2. PUBLIC INVENTORY: Public wall requesting only approved items. No filter applied.
  } 
  else {
    // 3. PERSONAL VIEW (Default) / HACK ATTEMPT:
    // Forcefully lock the query so the user ONLY sees their own data.
    // This applies to standard users AND Admins viewing their personal User Dashboard!
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return result.recordset.map(normalizeNeuroIT);
}

// ... (keep getNeuroITById, createNeuroIT, etc. exactly as they are)

/* =========================================
   ROUTES
========================================= */

/**
 * GET /api/neuroit
 */
router.get("/", async (req, res) => {
  try {
    // ✅ Extract scope from the URL, default to "personal" for maximum safety
    const scope = req.query.scope || "personal";
    
    const result = await getNeuroIT(req.query.status, scope, req.user);
    res.json(result);
  } catch (err) {
    console.error("Fetch NeuroIT failed:", err);
    res.status(500).json({ error: "Failed to load NeuroIT data" });
  }
});
/**
 * Fetch single NeuroIT use case by ID (Secured by Role)
 */
async function getNeuroITById(id, user) {
  const pool = await getDbConnection();
  const request = pool.request().input("id", sql.BigInt, id);

  let query = "SELECT * FROM NeuroITUseCases WHERE NeuroITId = @id";

  // 🔒 Security: Block user from viewing someone else's specific ID
  if (user.realRole === "user") {
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return normalizeNeuroIT(result.recordset[0]);
}

/**
 * Insert a new NeuroIT use case (Lengths Aligned to Schema)
 */
async function createNeuroIT(item) {
  const pool = await getDbConnection();

  const result = await pool.request()
    .input("EmployeeId", sql.VarChar(10), item.employeeId)
    .input("Title", sql.NVarChar(600), item.title)
    .input("ProjectName", sql.NVarChar(400), item.projectName)
    .input("ProjectId", sql.NVarChar(200), item.projectId) 
    .input("Contributors", sql.NVarChar(sql.MAX), item.contributors) 
    .input("Account", sql.NVarChar(300), item.account)
    .input("ApplicationsImpacted", sql.NVarChar(600), item.applicationsImpacted)
    .input("Categories", sql.NVarChar(400), item.categories)
    .input("StatusType", sql.NVarChar(100), item.statusType)
    .input("ProblemDescription", sql.NVarChar(sql.MAX), item.problemDescription)
    .input("OperationalImpact", sql.NVarChar(sql.MAX), item.operationalImpact)
    .input("NeuroITCapability", sql.NVarChar(400), item.neuroitCapability)
    .input("ToolsUsed", sql.NVarChar(600), item.toolsUsed)
    .input("SolutionDescription", sql.NVarChar(sql.MAX), item.solutionDescription)
    .input("AutomationType", sql.NVarChar(40), item.automationType)
    .input("Benefits", sql.NVarChar(sql.MAX), item.benefits)
    .input("Metrics", sql.NVarChar(sql.MAX), item.metrics)
    .input("Reusable", sql.NVarChar(20), item.reusable)
    .input("ScalePotential", sql.NVarChar(40), item.scalePotential)
    .input("ExecutiveOutcome", sql.NVarChar(sql.MAX), item.executiveOutcome)
    .input("DocumentLink", sql.NVarChar(sql.MAX), item.documentLink)
    .input("Status", sql.NVarChar(40), item.status)
    .query(`
      INSERT INTO NeuroITUseCases (
        EmployeeId, Title, ProjectName, ProjectId, Contributors, Account,
        ApplicationsImpacted, Categories, StatusType, ProblemDescription, OperationalImpact,
        NeuroITCapability, ToolsUsed, SolutionDescription, AutomationType, Benefits, Metrics,
        Reusable, ScalePotential, ExecutiveOutcome, DocumentLink, Status, CreatedAt, LastUpdated
      )
      OUTPUT INSERTED.NeuroITId
      VALUES (
        @EmployeeId, @Title, @ProjectName, @ProjectId, @Contributors, @Account,
        @ApplicationsImpacted, @Categories, @StatusType, @ProblemDescription, @OperationalImpact,
        @NeuroITCapability, @ToolsUsed, @SolutionDescription, @AutomationType, @Benefits, @Metrics,
        @Reusable, @ScalePotential, @ExecutiveOutcome, @DocumentLink, @Status, SYSDATETIME(), SYSDATETIME()
      )
    `);

  return result.recordset[0].NeuroITId;
}

/**
 * Edit and Resubmit a NeuroIT use case (Secured by Role & Lengths Aligned)
 */
async function updateNeuroIT(item, user) {
  const pool = await getDbConnection();
  const request = pool.request()
    .input("id", sql.BigInt, item.id)
    .input("title", sql.NVarChar(600), item.title)
    .input("projectName", sql.NVarChar(400), item.projectName) 
    .input("projectId", sql.NVarChar(200), item.projectId) 
    .input("contributors", sql.NVarChar(sql.MAX), item.contributors) 
    .input("account", sql.NVarChar(300), item.account)
    .input("applicationsImpacted", sql.NVarChar(600), item.applicationsImpacted)
    .input("categories", sql.NVarChar(400), item.categories)
    .input("problemDescription", sql.NVarChar(sql.MAX), item.problemDescription)
    .input("operationalImpact", sql.NVarChar(sql.MAX), item.operationalImpact)
    .input("neuroitCapability", sql.NVarChar(400), item.neuroitCapability)
    .input("toolsUsed", sql.NVarChar(600), item.toolsUsed)
    .input("solutionDescription", sql.NVarChar(sql.MAX), item.solutionDescription)
    .input("automationType", sql.NVarChar(40), item.automationType)
    .input("benefits", sql.NVarChar(sql.MAX), item.benefits)
    .input("metrics", sql.NVarChar(sql.MAX), item.metrics)
    .input("reusable", sql.NVarChar(20), item.reusable)
    .input("scalePotential", sql.NVarChar(40), item.scalePotential)
    .input("executiveOutcome", sql.NVarChar(sql.MAX), item.executiveOutcome)
    .input("documentLink", sql.NVarChar(sql.MAX), item.documentLink);

  let query = `
    UPDATE NeuroITUseCases
    SET
      Title=@title, ProjectName=@projectName, ProjectId=@projectId, Contributors=@contributors,
      Account=@account, ApplicationsImpacted=@applicationsImpacted, Categories=@categories,
      ProblemDescription=@problemDescription, OperationalImpact=@operationalImpact,
      NeuroITCapability=@neuroitCapability, ToolsUsed=@toolsUsed, SolutionDescription=@solutionDescription,
      AutomationType=@automationType, Benefits=@benefits, Metrics=@metrics, Reusable=@reusable,
      ScalePotential=@scalePotential, ExecutiveOutcome=@executiveOutcome, DocumentLink=@documentLink,
      Status='PENDING', ReworkReason=NULL, DeclineReason=NULL, LastUpdated=SYSDATETIME()
    WHERE NeuroITId=@id
  `;

  // 🔒 Security: Prevent users from updating someone else's use case
  if (user.realRole === "user") {
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return result.rowsAffected[0] > 0;
}

/**
 * Update Status (Admin/Moderator Only)
 */
async function updateNeuroITStatus(id, status, reason = null) {
  const pool = await getDbConnection();
  const result = await pool.request()
    .input("id", sql.BigInt, id)
    .input("status", sql.NVarChar(40), status)
    .input("reason", sql.NVarChar(sql.MAX), reason)
    .query(`
      UPDATE NeuroITUseCases
      SET
        Status = @status,
        DeclineReason = CASE WHEN @status = 'DECLINED' THEN @reason ELSE NULL END,
        ReworkReason = CASE WHEN @status = 'REWORK' THEN @reason ELSE NULL END,
        LastUpdated = SYSDATETIME()
      WHERE NeuroITId = @id
    `);

  return result.rowsAffected[0] > 0;
}

/* =========================================
   ROUTES
========================================= */

/**
 * GET /api/neuroit/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const item = await getNeuroITById(req.params.id, req.user);

    if (!item) {
      return res.status(404).json({ error: "NeuroIT use case not found or unauthorized" });
    }

    res.json(item);
  } catch (err) {
    console.error("Fetch by ID failed:", err);
    res.status(500).json({ error: "Failed to fetch NeuroIT use case" });
  }
});

/**
 * POST /api/neuroit
 */
router.post("/", async (req, res) => {
  try {
    const mandatoryFields = [
      "title", "projectName", "projectId", "account",
      "applicationsImpacted", "statusType", "problemDescription", "operationalImpact",
      "neuroitCapability", "toolsUsed", "solutionDescription", "automationType",
      "reusable", "scalePotential", "executiveOutcome"
    ];

    const missingField = mandatoryFields.find(field => !req.body[field] || !req.body[field].toString().trim());

    if (missingField) {
      return res.status(400).json({ error: `The field '${missingField}' is mandatory.` });
    }

    if (!req.body.metrics || Object.keys(req.body.metrics).length === 0) {
      return res.status(400).json({ error: "Measurable Impact metrics are mandatory." });
    }

    // 🔒 Security: Force employeeId from JWT to prevent spoofing
    let targetEmployeeId = req.body.employeeId;
    
    if (req.user.realRole === "user" || !targetEmployeeId) {
      targetEmployeeId = req.user.employeeId;
    }

    const newItem = {
      employeeId: targetEmployeeId,
      title: req.body.title,
      projectName: req.body.projectName || "",               
      projectId: req.body.projectId || "",                   
      contributors: req.body.contributors || null,         
      account: req.body.account || "",
      applicationsImpacted: req.body.applicationsImpacted || "",
      categories: formatCategories(req.body.categories),
      statusType: req.body.statusType || null,
      problemDescription: req.body.problemDescription || "",
      operationalImpact: req.body.operationalImpact || "",
      neuroitCapability: req.body.neuroitCapability || "",
      toolsUsed: req.body.toolsUsed || "",
      solutionDescription: req.body.solutionDescription || "",
      automationType: req.body.automationType || null,
      benefits: cleanAndStringify(req.body.benefits), // ✅ Cleans out garbage characters before saving
      metrics: cleanAndStringify(req.body.metrics),   // ✅ Cleans out garbage characters before saving
      reusable: req.body.reusable || null,
      scalePotential: req.body.scalePotential || null,
      executiveOutcome: req.body.executiveOutcome,
      documentLink: req.body.documentLink || null,
      status: "PENDING"
    };

    const id = await createNeuroIT(newItem);

    res.json({
      success: true,
      message: "NeuroIT use case submitted for review",
      id
    });

  } catch (err) {
    console.error("Create NeuroIT failed:", err);
    res.status(500).json({ error: "Failed to submit NeuroIT use case" });
  }
});

/**
 * PATCH /api/neuroit/:id/approve
 */
router.patch("/:id/approve", async (req, res) => {
  if (req.user.realRole === "user") return res.status(403).json({ error: "Admin/Moderator access required." });

  try {
    const success = await updateNeuroITStatus(req.params.id, "APPROVED");
    if (!success) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Approve failed:", err);
    res.status(500).json({ error: "Approve failed" });
  }
});

/**
 * PATCH /api/neuroit/:id/decline
 */
router.patch("/:id/decline", async (req, res) => {
  if (req.user.realRole === "user") return res.status(403).json({ error: "Admin/Moderator access required." });

  try {
    if (!req.body.reason || !req.body.reason.trim()) {
      return res.status(400).json({ error: "Decline reason required" });
    }
    const success = await updateNeuroITStatus(req.params.id, "DECLINED", req.body.reason);
    if (!success) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Decline failed:", err);
    res.status(500).json({ error: "Decline failed" });
  }
});

/**
 * PATCH /api/neuroit/:id/rework
 */
router.patch("/:id/rework", async (req, res) => {
  if (req.user.realRole === "user") return res.status(403).json({ error: "Admin/Moderator access required." });

  try {
    if (!req.body.reason || !req.body.reason.trim()) {
      return res.status(400).json({ error: "Rework reason required" });
    }
    const success = await updateNeuroITStatus(req.params.id, "REWORK", req.body.reason);
    if (!success) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Rework failed:", err);
    res.status(500).json({ error: "Rework failed" });
  }
});

/**
 * PATCH /api/neuroit/:id
 * Edit & Resubmit (REWORK → PENDING)
 */
router.patch("/:id", async (req, res) => {
  try {
    const success = await updateNeuroIT({
      id: req.params.id,
      title: req.body.title,
      projectName: req.body.projectName || "",               
      projectId: req.body.projectId || "",                   
      contributors: req.body.contributors || null,         
      account: req.body.account || "",
      applicationsImpacted: req.body.applicationsImpacted || "",
      categories: formatCategories(req.body.categories),
      problemDescription: req.body.problemDescription || "",
      operationalImpact: req.body.operationalImpact || "",
      neuroitCapability: req.body.neuroitCapability || "",
      toolsUsed: req.body.toolsUsed || "",
      solutionDescription: req.body.solutionDescription || "",
      automationType: req.body.automationType || "",
      benefits: cleanAndStringify(req.body.benefits), // ✅ Cleans out garbage characters before saving
      metrics: cleanAndStringify(req.body.metrics),   // ✅ Cleans out garbage characters before saving
      reusable: req.body.reusable || "",
      scalePotential: req.body.scalePotential || "",
      executiveOutcome: req.body.executiveOutcome || "",
      documentLink: req.body.documentLink || null
    }, req.user); 

    if (!success) {
      return res.status(404).json({ error: "NeuroIT use case not found or unauthorized to edit" });
    }

    res.json({
      success: true,
      message: "NeuroIT use case updated and resubmitted"
    });
  } catch (err) {
    console.error("Update NeuroIT failed:", err);
    res.status(500).json({ error: "Failed to update NeuroIT use case" });
  }
});

export default router;