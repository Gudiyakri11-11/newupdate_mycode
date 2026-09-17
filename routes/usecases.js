import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; // ✅ Core Authentication Integration

const router = express.Router();

// ✅ Force secure JWT session parsing on all underlying routes
router.use(authenticateToken);

/* =========================================
   UTILITIES & NORMALIZERS
========================================= */

// ✅ FIX: Deep-cleans mangled JSON strings that were accidentally spread into character arrays
function cleanMangledJson(data) {
  if (!data) return {};
  
  let parsed = data;
  while (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } 
    catch (e) { return {}; }
  }

  if (typeof parsed === "object" && parsed !== null) {
    const cleaned = {};
    for (const key in parsed) {
      if (isNaN(key)) { cleaned[key] = parsed[key]; }
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

/* =========================================
   NORMALIZER (DB → FRONTEND SHAPE)
========================================= */
function normalizeUseCase(row) {
  if (!row) return null;

  return {
    id: row.UseCaseId,
    employeeId: row.EmployeeId,
    submittedBy: row.SubmittedBy || row.EmployeeId, // ✅ FIX: Maps ID to submittedBy 
    submissionDate: row.SubmissionDate,
    title: row.Title,
    projectName: row.ProjectName, 
    projectId: row.ProjectId,    
    contributors: row.Contributors, 
    category: row.Category,
    domain: row.Domain,
    client: row.Client,
    team: row.Team,
    problemDescription: row.ProblemDescription,
    painPoints: row.PainPoints,
    processImpacted: row.ProcessImpacted,
    solutionDescription: row.SolutionDescription,
    genaiTypes: row.GenAITypes ? row.GenAITypes.split("|") : [],
    requirementsHelp: row.RequirementsHelp,
    designHelp: row.DesignHelp,
    developmentHelp: row.DevelopmentHelp,
    testingHelp: row.TestingHelp,
    supportHelp: row.SupportHelp,
    platforms: row.Platforms,
    models: row.Models,
    integrationPoints: row.IntegrationPoints,
    benefits: cleanMangledJson(row.Benefits), // ✅ Returns clean object to UI
    beforeProcess: row.BeforeProcess,
    afterProcess: row.AfterProcess,
    accuracyImprovement: row.AccuracyImprovement,
    scalabilityImprovement: row.ScalabilityImprovement,
    reusable: row.Reusable,
    scalabilityPotential: row.ScalabilityPotential,
    futureEnhancements: row.FutureEnhancements,
    demoLink: row.DemoLink,
    docLink: row.DocLink,
    repoLink: row.RepoLink,
    status: row.Status,
    declineReason: row.DeclineReason,
    reworkReason: row.ReworkReason,
    createdAt: row.CreatedAt,
    lastUpdated: row.LastUpdated
  };
}

/* =========================================
   REPOSITORY HELPERS (Secured At Data-Access Layer)
========================================= */

async function getUseCases(status, scope, user) {
  const pool = await getDbConnection();
  const request = pool.request();

  // ✅ FIX: Selecting * but adding EmployeeId AS SubmittedBy to satisfy frontend
  let query = "SELECT *, EmployeeId AS SubmittedBy FROM GenAIUseCases WHERE 1=1";

  if (status) {
    query += " AND Status = @status";
    request.input("status", sql.NVarChar(40), status); // ✅ ALIGNED length
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
    // 3. PERSONAL VIEW (Default) / HACK ATTEMPT: Forcefully lock query to user's own data.
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return result.recordset.map(normalizeUseCase);
}

async function getUseCaseById(id, user) {
  const pool = await getDbConnection();
  const request = pool.request().input("id", sql.BigInt, id);

  let query = "SELECT *, EmployeeId AS SubmittedBy FROM GenAIUseCases WHERE UseCaseId = @id";

  // 🔒 Security: Prevent non-admins from direct target ID snooping via the URL
  if (user && user.realRole === "user") {
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return normalizeUseCase(result.recordset[0]);
}

/**
 * Insert new GenAI use case
 */
async function createUseCase(uc) {
  const pool = await getDbConnection();

  const result = await pool.request()
    .input("EmployeeId", sql.VarChar(10), uc.employeeId)
    .input("SubmissionDate", sql.Date, uc.submissionDate || null)
    .input("Title", sql.NVarChar(600), uc.title)                       // ✅ ALIGNED length
    .input("ProjectName", sql.NVarChar(400), uc.projectName || null)   // ✅ ALIGNED length
    .input("ProjectId", sql.NVarChar(200), uc.projectId || null)       // ✅ ALIGNED length
    .input("Contributors", sql.NVarChar(sql.MAX), uc.contributors || null) 
    .input("Category", sql.NVarChar(200), uc.category || null)         // ✅ ALIGNED length
    .input("Domain", sql.NVarChar(300), uc.domain || null)             // ✅ ALIGNED length
    .input("Client", sql.NVarChar(300), uc.client || null)             // ✅ ALIGNED length
    .input("Team", sql.NVarChar(300), uc.team || null)                 // ✅ ALIGNED length
    .input("ProblemDescription", sql.NVarChar(sql.MAX), uc.problemDescription)
    .input("PainPoints", sql.NVarChar(sql.MAX), uc.painPoints || null)
    .input("ProcessImpacted", sql.NVarChar(600), uc.processImpacted || null) // ✅ ALIGNED length
    .input("SolutionDescription", sql.NVarChar(sql.MAX), uc.solutionDescription)
    .input("GenAITypes", sql.NVarChar(400), uc.genaiTypes || null)     // ✅ ALIGNED length
    .input("RequirementsHelp", sql.NVarChar(sql.MAX), uc.requirementsHelp || null)
    .input("DesignHelp", sql.NVarChar(sql.MAX), uc.designHelp || null)
    .input("DevelopmentHelp", sql.NVarChar(sql.MAX), uc.developmentHelp || null)
    .input("TestingHelp", sql.NVarChar(sql.MAX), uc.testingHelp || null)
    .input("SupportHelp", sql.NVarChar(sql.MAX), uc.supportHelp || null)
    .input("Platforms", sql.NVarChar(400), uc.platforms || null)       // ✅ ALIGNED length
    .input("Models", sql.NVarChar(400), uc.models || null)             // ✅ ALIGNED length
    .input("IntegrationPoints", sql.NVarChar(600), uc.integrationPoints || null) // ✅ ALIGNED length
    .input("Benefits", sql.NVarChar(sql.MAX), uc.benefits || null)
    .input("BeforeProcess", sql.NVarChar(sql.MAX), uc.beforeProcess || null)
    .input("AfterProcess", sql.NVarChar(sql.MAX), uc.afterProcess || null)
    .input("AccuracyImprovement", sql.NVarChar(400), uc.accuracyImprovement || null) // ✅ ALIGNED length
    .input("ScalabilityImprovement", sql.NVarChar(400), uc.scalabilityImprovement || null) // ✅ ALIGNED length
    .input("Reusable", sql.NVarChar(20), uc.reusable || null)          // ✅ ALIGNED length
    .input("ScalabilityPotential", sql.NVarChar(40), uc.scalabilityPotential || null) // ✅ ALIGNED length
    .input("FutureEnhancements", sql.NVarChar(sql.MAX), uc.futureEnhancements || null)
    .input("DemoLink", sql.NVarChar(1000), uc.demoLink || null)        // ✅ ALIGNED length
    .input("DocLink", sql.NVarChar(1000), uc.docLink || null)          // ✅ ALIGNED length
    .input("RepoLink", sql.NVarChar(1000), uc.repoLink || null)        // ✅ ALIGNED length
    .input("Status", sql.NVarChar(40), uc.status)                      // ✅ ALIGNED length
    .query(`
      INSERT INTO GenAIUseCases (
        EmployeeId, SubmissionDate,
        Title, ProjectName, ProjectId, Contributors, Category, Domain, Client, Team,
        ProblemDescription, PainPoints, ProcessImpacted, SolutionDescription, GenAITypes,
        RequirementsHelp, DesignHelp, DevelopmentHelp, TestingHelp, SupportHelp,
        Platforms, Models, IntegrationPoints, Benefits, BeforeProcess, AfterProcess,
        AccuracyImprovement, ScalabilityImprovement, Reusable, ScalabilityPotential,
        FutureEnhancements, DemoLink, DocLink, RepoLink, Status, CreatedAt, LastUpdated
      )
      OUTPUT INSERTED.UseCaseId
      VALUES (
        @EmployeeId, @SubmissionDate,
        @Title, @ProjectName, @ProjectId, @Contributors, @Category, @Domain, @Client, @Team,
        @ProblemDescription, @PainPoints, @ProcessImpacted, @SolutionDescription, @GenAITypes,
        @RequirementsHelp, @DesignHelp, @DevelopmentHelp, @TestingHelp, @SupportHelp,
        @Platforms, @Models, @IntegrationPoints, @Benefits, @BeforeProcess, @AfterProcess,
        @AccuracyImprovement, @ScalabilityImprovement, @Reusable, @ScalabilityPotential,
        @FutureEnhancements, @DemoLink, @DocLink, @RepoLink, @Status, SYSDATETIME(), SYSDATETIME()
      )
    `);

  return result.recordset[0].UseCaseId;
}

/**
 * Update status (Admin / Moderator Verified Endpoint)
 */
async function updateUseCaseStatus(id, status, reason = null) {
  const pool = await getDbConnection();

  const result = await pool.request()
    .input("id", sql.BigInt, id)
    .input("status", sql.NVarChar(40), status) // ✅ ALIGNED length
    .input("reason", sql.NVarChar(sql.MAX), reason)
    .query(`
      UPDATE GenAIUseCases
      SET
        Status = @status,
        DeclineReason = CASE WHEN @status = 'DECLINED' THEN @reason ELSE DeclineReason END,
        ReworkReason  = CASE WHEN @status = 'REWORK'   THEN @reason ELSE ReworkReason  END,
        LastUpdated = SYSDATETIME()
      WHERE UseCaseId = @id
    `);

  return result.rowsAffected[0] > 0;
}

/* =========================================
   ROUTES
========================================= */

router.get("/", async (req, res) => {
  try {
    const scope = req.query.scope || "personal"; // ✅ Explicit Scope applied
    const all = await getUseCases(req.query.status, scope, req.user); 
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load use cases" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const found = await getUseCaseById(req.params.id, req.user); // 🔒 Restricts non-owners
    if (!found) return res.status(404).json({ error: "Use case not found or unauthorized" });
    res.json(found);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch use case" });
  }
});

router.post("/", async (req, res) => {
  try {
    if (!req.body.title || !req.body.category || !req.body.problemDescription || !req.body.solutionDescription) {
      return res.status(400).json({
        error: "title, category, problemDescription, solutionDescription are required"
      });
    }

    // 🔒 Security: Force current session identification data over incoming body requests
    const targetEmployeeId = req.user?.employeeId || "UNKNOWN";

    const newUseCase = {
      ...req.body,
      employeeId: targetEmployeeId,
      genaiTypes: (req.body.genaiTypes || []).join("|"),
      benefits: cleanAndStringify(req.body.benefits), // ✅ Safe Stringify
      reusable: req.body.reusable?.trim() ? req.body.reusable : null,
      scalabilityPotential: req.body.scalabilityPotential?.trim() ? req.body.scalabilityPotential : null,
      status: "PENDING"
    };

    const id = await createUseCase(newUseCase);

    res.json({
      success: true,
      message: "Use case submitted for review",
      id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit use case" });
  }
});

router.patch("/:id/approve", async (req, res) => {
  if (req.user?.realRole === "user") return res.status(403).json({ error: "Unauthorized operation constraint." });

  try {
    const success = await updateUseCaseStatus(req.params.id, "APPROVED");
    if (!success) return res.status(404).json({ error: "Use case not found" });

    const updated = await getUseCaseById(req.params.id, req.user);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Approve failed" });
  }
});

router.patch("/:id/decline", async (req, res) => {
  if (req.user?.realRole === "user") return res.status(403).json({ error: "Unauthorized operation constraint." });

  try {
    if (!req.body.reason?.trim()) {
      return res.status(400).json({ error: "Decline reason required" });
    }

    const success = await updateUseCaseStatus(req.params.id, "DECLINED", req.body.reason);
    if (!success) return res.status(404).json({ error: "Use case not found" });

    const updated = await getUseCaseById(req.params.id, req.user);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Decline failed" });
  }
});

router.patch("/:id/rework", async (req, res) => {
  if (req.user?.realRole === "user") return res.status(403).json({ error: "Unauthorized operation constraint." });

  try {
    if (!req.body.reason?.trim()) {
      return res.status(400).json({ error: "Rework reason required" });
    }

    const success = await updateUseCaseStatus(req.params.id, "REWORK", req.body.reason);
    if (!success) return res.status(404).json({ error: "Use case not found" });

    const updated = await getUseCaseById(req.params.id, req.user);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Rework failed" });
  }
});

/**
 * PATCH /api/usecases/:id
 * Edit & Resubmit (REWORK → PENDING)
 */
router.patch("/:id", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const request = pool.request();

    // 🔒 Security: Check ownership constraints if the execution is contextually standard role
    let lookupQuery = "SELECT EmployeeId FROM GenAIUseCases WHERE UseCaseId = @lookupId";
    const lookupResult = await pool.request().input("lookupId", sql.BigInt, req.params.id).query(lookupQuery);
    
    if (lookupResult.recordset.length === 0) {
      return res.status(404).json({ error: "Use case not found" });
    }
    
    if (req.user?.realRole === "user" && lookupResult.recordset[0].EmployeeId !== req.user.employeeId) {
      return res.status(403).json({ error: "Access Denied: Modification of external data resources prohibited." });
    }

    const result = await request
      .input("id", sql.BigInt, req.params.id)
      .input("Title", sql.NVarChar(600), req.body.title)                           // ✅ ALIGNED length
      .input("ProjectName", sql.NVarChar(400), req.body.projectName || null)       // ✅ ALIGNED length
      .input("ProjectId", sql.NVarChar(200), req.body.projectId || null)           // ✅ ALIGNED length
      .input("Contributors", sql.NVarChar(sql.MAX), req.body.contributors || null) 
      .input("Category", sql.NVarChar(200), req.body.category || null)             // ✅ ALIGNED length
      .input("Domain", sql.NVarChar(300), req.body.domain || null)                 // ✅ ALIGNED length
      .input("Client", sql.NVarChar(300), req.body.client || null)                 // ✅ ALIGNED length
      .input("Team", sql.NVarChar(300), req.body.team || null)                     // ✅ ALIGNED length
      .input("SubmissionDate", sql.Date, req.body.submissionDate || null)
      .input("ProblemDescription", sql.NVarChar(sql.MAX), req.body.problemDescription)
      .input("PainPoints", sql.NVarChar(sql.MAX), req.body.painPoints || null)
      .input("ProcessImpacted", sql.NVarChar(600), req.body.processImpacted || null) // ✅ ALIGNED length
      .input("SolutionDescription", sql.NVarChar(sql.MAX), req.body.solutionDescription)
      .input("GenAITypes", sql.NVarChar(400), (req.body.genaiTypes || []).join("|")) // ✅ ALIGNED length
      .input("RequirementsHelp", sql.NVarChar(sql.MAX), req.body.requirementsHelp || null)
      .input("DesignHelp", sql.NVarChar(sql.MAX), req.body.designHelp || null)
      .input("DevelopmentHelp", sql.NVarChar(sql.MAX), req.body.developmentHelp || null)
      .input("TestingHelp", sql.NVarChar(sql.MAX), req.body.testingHelp || null)
      .input("SupportHelp", sql.NVarChar(sql.MAX), req.body.supportHelp || null)
      .input("Platforms", sql.NVarChar(400), req.body.platforms || null)           // ✅ ALIGNED length
      .input("Models", sql.NVarChar(400), req.body.models || null)                 // ✅ ALIGNED length
      .input("IntegrationPoints", sql.NVarChar(600), req.body.integrationPoints || null) // ✅ ALIGNED length
      .input("Benefits", sql.NVarChar(sql.MAX), cleanAndStringify(req.body.benefits))    // ✅ Safe Stringify
      .input("BeforeProcess", sql.NVarChar(sql.MAX), req.body.beforeProcess || null)
      .input("AfterProcess", sql.NVarChar(sql.MAX), req.body.afterProcess || null)
      .input("AccuracyImprovement", sql.NVarChar(400), req.body.accuracyImprovement || null) // ✅ ALIGNED length
      .input("ScalabilityImprovement", sql.NVarChar(400), req.body.scalabilityImprovement || null) // ✅ ALIGNED length
      .input("Reusable", sql.NVarChar(20), req.body.reusable?.trim() ? req.body.reusable : null) // ✅ ALIGNED length
      .input("ScalabilityPotential", sql.NVarChar(40), req.body.scalabilityPotential?.trim() ? req.body.scalabilityPotential : null) // ✅ ALIGNED length
      .input("FutureEnhancements", sql.NVarChar(sql.MAX), req.body.futureEnhancements || null)
      .input("DemoLink", sql.NVarChar(1000), req.body.demoLink || null)            // ✅ ALIGNED length
      .input("DocLink", sql.NVarChar(1000), req.body.docLink || null)              // ✅ ALIGNED length
      .input("RepoLink", sql.NVarChar(1000), req.body.repoLink || null)            // ✅ ALIGNED length
      .query(`
        UPDATE GenAIUseCases
        SET
          Title = @Title, ProjectName = @ProjectName, ProjectId = @ProjectId, Contributors = @Contributors,
          Category = @Category, Domain = @Domain, Client = @Client, Team = @Team, SubmissionDate = @SubmissionDate,
          ProblemDescription = @ProblemDescription, PainPoints = @PainPoints, ProcessImpacted = @ProcessImpacted,
          SolutionDescription = @SolutionDescription, GenAITypes = @GenAITypes, RequirementsHelp = @RequirementsHelp,
          DesignHelp = @DesignHelp, DevelopmentHelp = @DevelopmentHelp, TestingHelp = @TestingHelp, SupportHelp = @SupportHelp,
          Platforms = @Platforms, Models = @Models, IntegrationPoints = @IntegrationPoints, Benefits = @Benefits,
          BeforeProcess = @BeforeProcess, AfterProcess = @AfterProcess, AccuracyImprovement = @AccuracyImprovement,
          ScalabilityImprovement = @ScalabilityImprovement, Reusable = @Reusable, ScalabilityPotential = @ScalabilityPotential,
          FutureEnhancements = @FutureEnhancements, DemoLink = @DemoLink, DocLink = @DocLink, RepoLink = @RepoLink,
          Status = 'PENDING', ReworkReason = NULL, DeclineReason = NULL, LastUpdated = SYSDATETIME()
        WHERE UseCaseId = @id
      `);

    const updated = await getUseCaseById(req.params.id, req.user);
    res.json(updated);

  } catch (err) {
    console.error("Update use case failed:", err);
    res.status(500).json({ error: "Failed to update use case" });
  }
});

export default router;