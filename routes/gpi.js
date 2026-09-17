import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

const EXCLUSION_REASONS = new Set([
  "Deployment/Pipeline",
  "Test Execution Support",
  "Unsupported Tech Stack",
  "Recreate Defects",
  "Config Changes",
  "Others",
]);

const CATCHUP_SPRINT_START_DATE = "2026-06-29";
const CATCHUP_SPRINT_END_DATE = "2026-07-03";

function getIstDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function isCatchupSprintRange(start, end) {
  return start === CATCHUP_SPRINT_START_DATE && end === CATCHUP_SPRINT_END_DATE;
}

function canCreateCatchupSprint(date = new Date()) {
  return getIstDateString(date) <= CATCHUP_SPRINT_END_DATE;
}

function normalizeExclusions(data) {
  const errs = [];
  const {
    actualDeliveredStoryPointsWithGenAI,
    exclusionStoryPoints,
    exclusionReason,
    exclusionOtherReason,
  } = data;
  let details = [];

  if (Array.isArray(exclusionReason)) {
    details = exclusionReason;
  } else if (typeof exclusionReason === "string" && exclusionReason.trim()) {
    try {
      const parsed = JSON.parse(exclusionReason);
      details = Array.isArray(parsed)
        ? parsed
        : [{ reason: exclusionReason, storyPoints: exclusionStoryPoints }];
    } catch {
      details = [
        { reason: exclusionReason, storyPoints: exclusionStoryPoints },
      ];
    }
  }

  const normalizedDetails = details.map((detail) => ({
    reason: detail.reason,
    storyPoints: detail.storyPoints,
    otherReason: detail.otherReason,
  }));

  for (const detail of normalizedDetails) {
    if (!EXCLUSION_REASONS.has(detail.reason)) {
      errs.push("Invalid exclusion reason.");
      continue;
    }
    if (
      detail.storyPoints === undefined ||
      detail.storyPoints === null ||
      detail.storyPoints === ""
    ) {
      errs.push(
        "Story points are required for each selected exclusion reason.",
      );
      continue;
    }
    if (!Number.isInteger(Number(detail.storyPoints))) {
      errs.push("Exclusion story points must not be a decimal number.");
    }
    if (Number(detail.storyPoints) < 0) {
      errs.push("Exclusion story points cannot be negative.");
    }
    if (
      detail.reason === "Others" &&
      !String(detail.otherReason || exclusionOtherReason || "").trim()
    ) {
      errs.push("Other exclusion reason is required.");
    }
  }

  const total = normalizedDetails.reduce(
    (sum, detail) => sum + Number(detail.storyPoints || 0),
    0,
  );

  if (
    normalizedDetails.length > 0 &&
    actualDeliveredStoryPointsWithGenAI !== undefined &&
    actualDeliveredStoryPointsWithGenAI !== "" &&
    total > Number(actualDeliveredStoryPointsWithGenAI)
  ) {
    errs.push(
      "Total exclusion story points cannot exceed actual delivered story points.",
    );
  }

  const otherDetail = normalizedDetails.find(
    (detail) => detail.reason === "Others",
  );
  const normalizedOtherReason =
    otherDetail &&
    String(otherDetail.otherReason || exclusionOtherReason || "").trim()
      ? String(otherDetail.otherReason || exclusionOtherReason).trim()
      : null;
  const serializableDetails = normalizedDetails.map((detail) => ({
    reason: detail.reason,
    storyPoints: Number(detail.storyPoints),
    ...(detail.reason === "Others" && normalizedOtherReason
      ? { otherReason: normalizedOtherReason }
      : {}),
  }));

  return {
    errs,
    total: serializableDetails.length > 0 ? total : null,
    serialized:
      serializableDetails.length > 0
        ? JSON.stringify(serializableDetails)
        : null,
    otherReason: normalizedOtherReason,
  };
}

// Apply auth middleware to all routes in this file
router.use(authenticateToken);

/* =========================================
   HELPER: SHARED BUSINESS LOGIC VALIDATOR
========================================= */
function validateGpiBusinessLogic(data) {
  const errs = [];
  const {
    startDate,
    endDate,
    committedStoryPointsWithoutGenAI,
    actualDeliveredStoryPointsWithGenAI,
  } = data;

  // 1. Float/Decimal Validation
  if (
    committedStoryPointsWithoutGenAI !== undefined &&
    !Number.isInteger(Number(committedStoryPointsWithoutGenAI))
  ) {
    errs.push("Committed Story points must not be a decimal number.");
  }
  if (
    actualDeliveredStoryPointsWithGenAI !== undefined &&
    actualDeliveredStoryPointsWithGenAI !== "" &&
    !Number.isInteger(Number(actualDeliveredStoryPointsWithGenAI))
  ) {
    errs.push("Actual Delivered Story points must not be a decimal number.");
  }
  errs.push(...normalizeExclusions(data).errs);

  if (startDate && endDate) {
    const [sYear, sMonth, sDay] = startDate.split("-");
    const [eYear, eMonth, eDay] = endDate.split("-");
    
    const startD = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay));
    const endD = new Date(Number(eYear), Number(eMonth) - 1, Number(eDay));
    
    startD.setHours(0, 0, 0, 0);
    endD.setHours(0, 0, 0, 0);

    // End Date cannot be before Start Date
    if (endD < startD) {
      errs.push("End Date cannot be before Start Date.");
    }

    // Sprint Duration must be EXACTLY 14 days, except the one-time catchup sprint.
    const diffTime = Math.abs(endD - startD);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays !== 13 && !isCatchupSprintRange(startDate, endDate)) {
      errs.push(
        "Sprint duration must be exactly 14 days, except the June 29 to July 3 catchup sprint.",
      );
    }

    // Min Start Date: Jan 1, 2026
    const minDate = new Date("2026-01-01");
    if (startD < minDate) {
      errs.push("Start Date cannot be before January 1st, 2026.");
    }

    // Max Start Date: Today in IST (Cannot be a future date)
    const istDateString = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const maxDate = new Date(istDateString);
    maxDate.setHours(0, 0, 0, 0);

    if (startD > maxDate) {
      errs.push("Start Date cannot be a future date.");
    }
  }
  return errs;
}

/* -------------------- SUBMIT GPI RECORD (CREATE NEW SPRINT) -------------------- */

router.post("/submit", async (req, res) => {
  const { startDate, squadName, sprintName, committedStoryPointsWithoutGenAI } =
    req.body;

  // 🔒 Security Pattern: Always trust the JWT for identity
  const employee_id = req.user.employeeId;
  const createdBy = req.user.employeeId;

  // Automatically calculate end date (14 days total duration = start + 13 days)
  let endDate;
  if (startDate) {
    if (startDate === CATCHUP_SPRINT_START_DATE && canCreateCatchupSprint()) {
      endDate = CATCHUP_SPRINT_END_DATE;
    } else {
      // Safely split the date to avoid UTC timezone shifts
      const [year, month, day] = startDate.split("-");
      const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
      
      dateObj.setDate(dateObj.getDate() + 13);
      
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const ddStr = String(dateObj.getDate()).padStart(2, "0");
      endDate = `${yyyy}-${mm}-${ddStr}`;
    }
    req.body.endDate = endDate; // Attach for the validator
  }

  if (
    !startDate ||
    !squadName ||
    !sprintName ||
    committedStoryPointsWithoutGenAI === undefined
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // 🔒 Enforce Backend Business Logic
  const validationErrors = validateGpiBusinessLogic(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0] });
  }

  try {
    const pool = await getDbConnection();

    // 1. CHECK FOR ACTIVE SPRINT
    const checkActive = await pool
      .request()
      .input("empId", sql.VarChar(10), String(employee_id))
      .query(
        `SELECT GPI_ID FROM GenAI_Productivity_Index WHERE Employee_ID = @empId AND Last_Updated_At IS NULL`,
      );

    if (checkActive.recordset.length > 0) {
      return res.status(400).json({
        message:
          "You already have an active sprint. Please close it before starting a new one.",
      });
    }

    // 2. CHECK FOR DATE OVERLAPS (StartA <= EndB AND EndA >= StartB)
    const checkOverlap = await pool
      .request()
      .input("empId", sql.VarChar(10), String(employee_id))
      .input("newStart", sql.Date, startDate)
      .input("newEnd", sql.Date, endDate).query(`
        SELECT GPI_ID FROM GenAI_Productivity_Index 
        WHERE Employee_ID = @empId 
        AND Start_Date <= @newEnd AND End_Date >= @newStart
      `);

    if (checkOverlap.recordset.length > 0) {
      return res.status(400).json({
        message:
          "You already have a submitted sprint that overlaps with this date range.",
      });
    }

    // 3. DB INSERT
    const query = `
      INSERT INTO GenAI_Productivity_Index (
        Employee_ID, Start_Date, End_Date, Squad_Name, Sprint_Name,
        Committed_Story_Points_Without_GenAI, Actual_Delivered_Story_Points_With_GenAI, Created_By, Created_At
      )
      OUTPUT INSERTED.GPI_ID
      VALUES (
        @employeeId, @startDate, @endDate, @squadName, @sprintName,
        @committedSP, 0, @createdBy, SYSDATETIME()
      )
    `;

    const result = await pool
      .request()
      .input("employeeId", sql.VarChar(10), String(employee_id))
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      .input("squadName", sql.NVarChar(200), squadName)
      .input("sprintName", sql.NVarChar(300), sprintName)
      .input("committedSP", sql.Int, Number(committedStoryPointsWithoutGenAI))
      .input("createdBy", sql.NVarChar(200), String(createdBy))
      .query(query);

    return res.status(201).json({
      message: "✅ Sprint started successfully",
      data: {
        GPI_ID: result.recordset[0].GPI_ID,
        Employee_ID: employee_id,
        Start_Date: startDate,
        End_Date: endDate,
        Squad_Name: squadName,
        Sprint_Name: sprintName,
        Committed_Story_Points_Without_GenAI: Number(
          committedStoryPointsWithoutGenAI,
        ),
        Actual_Delivered_Story_Points_With_GenAI: 0,
        Last_Updated_At: null,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save GPI data", error: error.message });
  }
});

/* -------------------- UPDATE GPI RECORD (EDIT OR CLOSE SPRINT) -------------------- */

router.put("/:id", async (req, res) => {
  const gpiId = req.params.id;
  const {
    committedStoryPointsWithoutGenAI,
    actualDeliveredStoryPointsWithGenAI,
    note,
    squadName,
    sprintName,
  } = req.body;

  // 🔒 Security: Use JWT for identity. We DO NOT take employeeId from req.body.
  const employee_id = req.user.employeeId;
  const updatedBy = req.user.employeeId;

  if (!gpiId) return res.status(400).json({ message: "GPI ID is required" });

  // 🔒 Enforce Backend Business Logic
  const validationErrors = validateGpiBusinessLogic(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors[0] });
  }

  try {
    const pool = await getDbConnection();

    // Verify Ownership & Get Current End Date
    // This strictly enforces that the user making the request is the owner of the GPI record
    const currentRecord = await pool
      .request()
      .input("gpiId", sql.BigInt, gpiId)
      .input("employeeId", sql.VarChar(10), String(employee_id))
      .query(
        `SELECT End_Date FROM GenAI_Productivity_Index WHERE GPI_ID = @gpiId AND Employee_ID = @employeeId`,
      );

    if (currentRecord.recordset.length === 0) {
      return res.status(404).json({
        message: "Record not found or you do not have permission to edit it.",
      });
    }

    // Determine if this is a "Close Sprint" request or just an "Edit Committed SP" request
    const isClosingSprint =
      actualDeliveredStoryPointsWithGenAI !== undefined &&
      actualDeliveredStoryPointsWithGenAI !== "";
    const normalizedExclusions = normalizeExclusions(req.body);

    // Premature Closing Validation: Block closing if current date is before Sprint End Date
    if (isClosingSprint) {
      const targetEndDate = new Date(currentRecord.recordset[0].End_Date);
      targetEndDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (today < targetEndDate) {
        return res.status(400).json({
          message:
            "You cannot submit actual points before the Sprint End Date.",
        });
      }
    }

    // Dynamic Update Query
    // Start Date, End Date, Squad Name, and Sprint Name have been strictly removed from the SET block
    const query = `
      UPDATE GenAI_Productivity_Index
      SET 
        Committed_Story_Points_Without_GenAI = COALESCE(@committedSP, Committed_Story_Points_Without_GenAI),
        Squad_Name = COALESCE(@squadName, Squad_Name),    
        Sprint_Name = COALESCE(@sprintName, Sprint_Name)  
        ${isClosingSprint ? `, Actual_Delivered_Story_Points_With_GenAI = @deliveredSP, Note = @note, Exclusion_Story_Points = @exclusionSP, Exclusion_Reason = @exclusionReason, Exclusion_Other_Reason = @exclusionOtherReason, Last_Updated_At = SYSDATETIME(), Last_Updated_By = @updatedBy` : ""}
      WHERE GPI_ID = @gpiId 
      AND Employee_ID = @employeeId 
    `;
    const dbRequest = pool
      .request()
      .input("gpiId", sql.BigInt, gpiId)
      .input("employeeId", sql.VarChar(10), String(employee_id))
      .input("squadName", sql.NVarChar(200), squadName || null)  
      .input("sprintName", sql.NVarChar(300), sprintName || null)
      .input(
        "committedSP",
        sql.Int,
        committedStoryPointsWithoutGenAI !== undefined
          ? Number(committedStoryPointsWithoutGenAI)
          : null,
      );

    if (isClosingSprint) {
      dbRequest.input(
        "deliveredSP",
        sql.Int,
        Number(actualDeliveredStoryPointsWithGenAI),
      );
      dbRequest.input("note", sql.NVarChar(sql.MAX), note || null);
      dbRequest.input("exclusionSP", sql.Int, normalizedExclusions.total);
      dbRequest.input(
        "exclusionReason",
        sql.NVarChar(sql.MAX),
        normalizedExclusions.serialized,
      );
      dbRequest.input(
        "exclusionOtherReason",
        sql.NVarChar(300),
        normalizedExclusions.otherReason,
      );
      dbRequest.input("updatedBy", sql.NVarChar(200), String(updatedBy));
    }

    await dbRequest.query(query);

    return res.status(200).json({
      message: isClosingSprint
        ? "✅ Sprint closed successfully"
        : "✅ Sprint updated successfully",
      data: {
        GPI_ID: gpiId,
        ...(isClosingSprint && {
          Actual_Delivered_Story_Points_With_GenAI: Number(
            actualDeliveredStoryPointsWithGenAI,
          ),
          Note: note || null,
          Exclusion_Story_Points: normalizedExclusions.total,
          Exclusion_Reason: normalizedExclusions.serialized,
          Exclusion_Other_Reason: normalizedExclusions.otherReason,
          Last_Updated_At: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update GPI data", error: error.message });
  }
});

/* -------------------- FETCH GPI RECORDS (SECURED) -------------------- */
// 👤 ROUTE 1: Get personal records (Accessible to ALL authenticated users)
router.get("/", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const request = pool.request();

    // 🔒 Extract identity from the secure JWT
    const currentUser = req.user.employeeId;

    if (!currentUser) {
      return res
        .status(400)
        .json({ error: "User identity missing from token." });
    }

    // Force the query to only look up the authenticated user's ID
    request.input("employeeId", sql.VarChar(10), String(currentUser));

    const query = `
      WITH RankedGPI AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY Employee_ID ORDER BY Start_Date DESC) as RowNum
        FROM GenAI_Productivity_Index
        WHERE Employee_ID = @employeeId
      )
      SELECT * FROM RankedGPI 
      WHERE RowNum <= 3
      ORDER BY Start_Date DESC
    `;

    const result = await request.query(query);

    return res.status(200).json({
      message: "✅ Personal GPI records fetched successfully",
      data: result.recordset,
    });
  } catch (error) {
    console.error("❌ Failed to fetch personal GPI (DB Error):", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch GPI data", error: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    // Extract search params and user identity
    const { startDate, endDate, employeeId, department, projectName } =
      req.query;
    const currentRole = req.user?.realRole?.toLowerCase() || "user";
    const isGuides = currentRole === "guides";
    const userId = req.user?.employeeId;

    if (
       (currentRole === "admin" || isGuides) &&
      (!department || String(department).trim() === "")
    ) {
      return res.status(200).json({
        message: "Department selection is required for admin GPI records.",
        data: [],
      });
    }

    // ✅ Base Query with LEFT JOINs to gather user and project details safely
    let query = `
      SELECT 
        gpi.*, 
        u.name AS Employee_Name,
        u.email,
        a.AssociateName,
        a.ProjectID,
        a.ProjectName AS AssociateProjectName,
        a.Department,
        a.AccountName,
        p.project_name
      FROM GenAI_Productivity_Index gpi
      LEFT JOIN Users u ON LTRIM(RTRIM(CAST(gpi.Employee_ID AS VARCHAR(50)))) = LTRIM(RTRIM(CAST(u.employee_id AS VARCHAR(50))))
      LEFT JOIN AssociateDetails a ON LTRIM(RTRIM(CAST(a.AssociateID AS VARCHAR(50)))) = LTRIM(RTRIM(CAST(gpi.Employee_ID AS VARCHAR(50))))
      LEFT JOIN projects p ON LTRIM(RTRIM(CAST(a.ProjectID AS VARCHAR(100)))) = LTRIM(RTRIM(CAST(p.project_id AS VARCHAR(100))))
      WHERE 1=1
    `;

    // 🔒 Dynamic Role-Based Access Control
    if (currentRole === "admin" || isGuides) {
      query += " AND LTRIM(RTRIM(a.Department)) = LTRIM(RTRIM(@department))";
      request.input("department", sql.VarChar(150), String(department).trim());

      // Admins see everything. Allow them to optionally filter by employeeId.
      if (employeeId) {
        query += " AND gpi.Employee_ID = @searchId";
        request.input("searchId", sql.VarChar(10), employeeId);
      }
    } else if (currentRole === "moderator") {
      // Moderators ONLY see records linked to projects they manage or proxy manage.
      query += `
        AND (
          LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
        )
      `;
      request.input("userId", sql.VarChar(50), String(userId || "").trim());

      // Allow moderators to optionally filter by employeeId within their scope
      if (employeeId) {
        query += " AND gpi.Employee_ID = @searchId";
        request.input("searchId", sql.VarChar(10), employeeId);
      }

      if (department && String(department).trim() !== "") {
        query += " AND LTRIM(RTRIM(a.Department)) = LTRIM(RTRIM(@department))";
        request.input(
          "department",
          sql.VarChar(150),
          String(department).trim(),
        );
      }
    } else {
      // Standard users are strictly isolated to their own records.
      query += " AND gpi.Employee_ID = @userId";
      request.input("userId", sql.VarChar(10), userId);
    }

    if (
      projectName &&
      String(projectName).trim() !== "" &&
      projectName !== "ALL"
    ) {
      query += `
        AND (
          LTRIM(RTRIM(a.ProjectName)) = LTRIM(RTRIM(@projectName))
          OR LTRIM(RTRIM(p.project_name)) = LTRIM(RTRIM(@projectName))
        )
      `;
      request.input(
        "projectName",
        sql.VarChar(150),
        String(projectName).trim(),
      );
    }

    // Optional Date Filtering (using Start_Date as the primary anchor)
    if (startDate) {
      query += ` AND gpi.Start_Date >= @startDate`;
      request.input("startDate", sql.Date, startDate);
    }
    if (endDate) {
      query += ` AND gpi.Start_Date <= @endDate`;
      request.input("endDate", sql.Date, endDate);
    }

    query += ` ORDER BY gpi.Start_Date DESC`;

    const result = await request.query(query);

    return res.status(200).json({
      message: "✅ GPI records fetched successfully",
      data: result.recordset,
    });
  } catch (error) {
    console.error("❌ Failed to fetch all GPI (DB Error):", error);
    return res.status(500).json({
      message: "Failed to fetch master GPI data",
      error: error.message,
    });
  }
});

/* -------------------- GET UNIQUE SQUAD NAMES -------------------- */
router.get("/squad-names", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const query = `
      SELECT DISTINCT Squad_Name 
      FROM GenAI_Productivity_Index 
      WHERE Squad_Name IS NOT NULL 
        AND Squad_Name <> ''
      ORDER BY Squad_Name ASC
    `;

    const result = await pool.request().query(query);
    const squadNames = result.recordset.map(row => row.Squad_Name);
    
    res.json({ squadNames });
  } catch (err) {
    console.error("Failed to fetch squad names:", err);
    res.status(500).json({ error: "Failed to fetch squad names" });
  }
});

/* -------------------- DEFAULTERS CHECK -------------------- */
router.post("/defaulters-check", async (req, res) => {
  const currentRole = req.user?.realRole?.toLowerCase();
  const isPrivileged = currentRole === "admin" || currentRole === "moderator" || currentRole === "guides";

  if (!isPrivileged) {
    return res.status(403).json({ error: "Access denied. Admins, Moderators, and Guides only." });
  }

  try {
    const pool = await getDbConnection();
    const { employeeIds, startDate, endDate } = req.body;

    if (!employeeIds || employeeIds.length === 0) {
      return res.status(400).json({ error: "No associates provided" });
    }

    const CHUNK_SIZE = 1500;
    const activeEmployees = new Set();

    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      const chunk = employeeIds.slice(i, i + CHUNK_SIZE);
      const request = pool.request();

      const idList = chunk
        .map((id, index) => {
          request.input(`id${index}`, sql.VarChar(10), String(id).trim());
          return `@id${index}`;
        })
        .join(",");

      let query = `
        SELECT DISTINCT Employee_ID 
        FROM GenAI_Productivity_Index 
        WHERE Employee_ID IN (${idList})
      `;

      if (startDate && startDate.trim() !== "") {
        query += ` AND End_Date >= @startDate`;
        request.input("startDate", sql.Date, startDate);
      }
      if (endDate && endDate.trim() !== "") {
        query += ` AND Start_Date <= @endDate`;
        request.input("endDate", sql.Date, endDate);
      }

      const result = await request.query(query);
      result.recordset.forEach((row) => activeEmployees.add(row.Employee_ID));
    }

    res.json(Array.from(activeEmployees));
  } catch (err) {
    console.error("Failed to check GPI defaulters:", err);
    res.status(500).json({ error: "Failed to check defaulters" });
  }
});

export default router;
