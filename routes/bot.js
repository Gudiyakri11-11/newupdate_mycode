import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

/* =========================================
   REPLACEABLE COMPONENT-LEVEL HELPERS
========================================= */

async function getBots(status, scope, user) {
  const pool = await getDbConnection();
  const request = pool.request();

  let query = `
    SELECT
      BotId        AS id,
      EmployeeId   AS employeeId,
      EmployeeId   AS submittedBy,
      Name         AS name,
      Description  AS description,
      UseCase      AS useCase,
      Category     AS category,
      Capabilities AS capabilities,
      ProjectName  AS projectName,
      ProjectId    AS projectId,
      Contributors AS contributors, 
      DemoLink     AS demoLink,
      Owner        AS owner,
      Status       AS status,
      DeclineReason AS declineReason,
      ReworkReason  AS reworkReason,
      UsersCount   AS usersCount,
      Rating       AS rating
    FROM Bots
    WHERE 1=1
  `;

  if (status) {
    query += " AND Status = @status";
    request.input("status", sql.NVarChar(40), status);
  }

  // 🛑 CRITICAL SECURITY LOGIC 🛑
  const isAdmin =
    user &&
    (user.realRole === "admin" ||
      user.realRole === "moderator" ||
      user.realRole === "ADMIN");

  if (scope === "all" && isAdmin) {
    // 1. ADMIN DASHBOARD: Admin explicitly asking for all data. No filter applied.
  } else if (scope === "global" && status === "APPROVED") {
    // 2. BOT WALL: Public wall requesting only approved items. No filter applied.
  } else {
    // 3. PERSONAL VIEW (Default) / HACK ATTEMPT:
    // Forcefully lock the query so the user ONLY sees their own data.
    // This applies to standard users AND Admins viewing their personal User Dashboard!
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return result.recordset;
}

// ... (keep your getBotById, createBot, updateBotStatus functions as they are) ...

/* =========================================
   ROUTES
========================================= */

router.get("/", async (req, res) => {
  try {
    // ✅ Extract the scope from the URL, defaulting to "personal" for maximum security
    const scope = req.query.scope || "personal";

    const bots = await getBots(req.query.status, scope, req.user);
    res.json(bots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bots" });
  }
});

async function getBotById(id, user) {
  const pool = await getDbConnection();
  const request = pool.request().input("id", sql.BigInt, id);

  let query = `
    SELECT
      BotId        AS id,
      EmployeeId   AS employeeId,
      EmployeeId   AS submittedBy, 
      Name         AS name,
      Description  AS description,
      UseCase      AS useCase,
      Category     AS category,
      Capabilities AS capabilities,
      ProjectName  AS projectName,
      ProjectId    AS projectId,
      Contributors AS contributors, 
      DemoLink     AS demoLink,
      Owner        AS owner,
      Status       AS status,
      DeclineReason AS declineReason,
      ReworkReason  AS reworkReason,
      UsersCount   AS usersCount,
      Rating       AS rating
    FROM Bots
    WHERE BotId = @id
  `;

  if (user && user.realRole === "user") {
    query += " AND EmployeeId = @empId";
    request.input("empId", sql.VarChar(10), user.employeeId);
  }

  const result = await request.query(query);
  return result.recordset[0] || null;
}

async function createBot(bot) {
  const pool = await getDbConnection();

  const result = await pool
    .request()
    .input("EmployeeId", sql.VarChar(10), bot.employeeId)
    .input("Name", sql.NVarChar(400), bot.name)
    .input("Description", sql.NVarChar(sql.MAX), bot.description)
    .input("UseCase", sql.NVarChar(1000), bot.useCase)
    .input("Category", sql.NVarChar(200), bot.category)
    .input("Capabilities", sql.NVarChar(sql.MAX), bot.capabilities)
    .input("ProjectName", sql.NVarChar(400), bot.projectName)
    .input("ProjectId", sql.NVarChar(200), bot.projectId)
    .input("Contributors", sql.NVarChar(sql.MAX), bot.contributors)
    .input("DemoLink", sql.NVarChar(1000), bot.demoLink)
    .input("Owner", sql.NVarChar(300), bot.owner)
    .input("Status", sql.NVarChar(40), "PENDING")
    .input("UsersCount", sql.Int, 0)
    .input("Rating", sql.Float, 0).query(`
      INSERT INTO Bots (
        EmployeeId, Name, Description, UseCase,
        Category, Capabilities, ProjectName, ProjectId, Contributors, DemoLink, Owner,
        Status, UsersCount, Rating, CreatedAt, LastUpdated 
      )
      OUTPUT INSERTED.BotId
      VALUES (
        @EmployeeId, @Name, @Description, @UseCase,
        @Category, @Capabilities, @ProjectName, @ProjectId, @Contributors, @DemoLink, @Owner,
        @Status, @UsersCount, @Rating, SYSDATETIME(), SYSDATETIME()
      )
    `);

  return result.recordset[0].BotId;
}

async function updateBotStatus(
  id,
  status,
  declineReason = null,
  reworkReason = null,
) {
  const pool = await getDbConnection();

  await pool
    .request()
    .input("id", sql.BigInt, id)
    .input("status", sql.NVarChar(40), status)
    .input("declineReason", sql.NVarChar(sql.MAX), declineReason)
    .input("reworkReason", sql.NVarChar(sql.MAX), reworkReason).query(`
      UPDATE Bots
      SET
        Status = @status,
        DeclineReason = @declineReason,
        ReworkReason = @reworkReason,
        LastUpdated = SYSDATETIME()
      WHERE BotId = @id
    `);

  return getBotById(id, null);
}

/* =========================================
   ROUTES
========================================= */

router.get("/", async (req, res) => {
  try {
    const isGlobalWall = req.query.global === "true"; // ✅ Check if the UI is specifically requesting the Public Wall
    const bots = await getBots(req.query.status, isGlobalWall, req.user);
    res.json(bots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bots" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      useCase,
      category,
      capabilities,
      projectName,
      projectId,
      contributors,
      demoLink,
      owner,
    } = req.body;

    if (!name || !description || !useCase) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const targetEmployeeId = req.user?.employeeId || "UNKNOWN";

    const botId = await createBot({
      employeeId: targetEmployeeId,
      name,
      description,
      useCase,
      category: category || null,
      capabilities: capabilities || null,
      projectName: projectName || null,
      projectId: projectId || null,
      contributors: contributors || null,
      demoLink: demoLink || null,
      owner: owner || null,
    });

    res.status(201).json({ success: true, botId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create bot submission" });
  }
});

router.patch("/:id/approve", async (req, res) => {
  if (req.user?.realRole === "user")
    return res.status(403).json({ error: "Access Denied" });

  try {
    const bot = await updateBotStatus(req.params.id, "APPROVED");
    if (!bot) return res.status(404).json({ error: "Bot entry not found" });
    res.json(bot);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal error processing approval execution" });
  }
});

router.patch("/:id/decline", async (req, res) => {
  if (req.user?.realRole === "user")
    return res.status(403).json({ error: "Access Denied" });

  try {
    const { reason } = req.body;
    if (!reason?.trim())
      return res.status(400).json({ error: "Decline reason required" });

    const bot = await updateBotStatus(req.params.id, "DECLINED", reason, null);
    if (!bot) return res.status(404).json({ error: "Bot entry not found" });
    res.json(bot);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal error processing decline execution" });
  }
});

router.patch("/:id/rework", async (req, res) => {
  if (req.user?.realRole === "user")
    return res.status(403).json({ error: "Access Denied" });

  try {
    const { reason } = req.body;
    if (!reason?.trim())
      return res.status(400).json({ error: "Rework reason required" });

    const bot = await updateBotStatus(req.params.id, "REWORK", null, reason);
    if (!bot) return res.status(404).json({ error: "Bot entry not found" });
    res.json(bot);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal error processing rework execution" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const pool = await getDbConnection();

    const lookupResult = await pool
      .request()
      .input("lookupId", sql.BigInt, req.params.id)
      .query("SELECT EmployeeId FROM Bots WHERE BotId = @lookupId");

    if (lookupResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ error: "Bot structure target variant not found" });
    }

    if (
      req.user?.realRole === "user" &&
      lookupResult.recordset[0].EmployeeId !== req.user.employeeId
    ) {
      return res
        .status(403)
        .json({ error: "Access Denied: Scope alignment error." });
    }

    const result = await pool
      .request()
      .input("id", sql.BigInt, req.params.id)
      .input("Name", sql.NVarChar(400), req.body.name)
      .input("Description", sql.NVarChar(sql.MAX), req.body.description)
      .input("UseCase", sql.NVarChar(1000), req.body.useCase)
      .input("Category", sql.NVarChar(200), req.body.category || null)
      .input(
        "Capabilities",
        sql.NVarChar(sql.MAX),
        req.body.capabilities || null,
      )
      .input("ProjectName", sql.NVarChar(400), req.body.projectName || null)
      .input("ProjectId", sql.NVarChar(200), req.body.projectId || null)
      .input(
        "Contributors",
        sql.NVarChar(sql.MAX),
        req.body.contributors || null,
      )
      .input("DemoLink", sql.NVarChar(1000), req.body.demoLink || null)
      .input("Owner", sql.NVarChar(300), req.body.owner || null).query(`
        UPDATE Bots
        SET
          Name = @Name, Description = @Description, UseCase = @UseCase, Category = @Category,
          Capabilities = @Capabilities, ProjectName = @ProjectName, ProjectId = @ProjectId,
          Contributors = @Contributors, DemoLink = @DemoLink, Owner = @Owner,
          Status = 'PENDING', DeclineReason = NULL, ReworkReason = NULL, LastUpdated = SYSDATETIME()
        WHERE BotId = @id
      `);

    const updated = await getBotById(req.params.id, req.user);
    res.json(updated);
  } catch (err) {
    console.error("Update bot failed:", err);
    res.status(500).json({ error: "Failed to update bot" });
  }
});

export default router;
