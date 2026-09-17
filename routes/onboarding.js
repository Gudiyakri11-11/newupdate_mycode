import express from "express";
import {
  saveEmployeeProgress,
  getEmployee,
  getAllEmployees
} from "../services/onboarding.js";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; // ✅ Core Authentication Integration

const router = express.Router();

// ✅ Enforce secure JWT session parsing globally across this router
router.use(authenticateToken);

// ============================================================================
// CONSTANTS
// ============================================================================
const SQL_ERR_DUPLICATE_KEY = 2627;

// ============================================================================
// PROGRESS TRACKING ROUTES
// ============================================================================

/**
 * @route   POST /store-result
 * @desc    Stores employee onboarding progress
 */
router.post("/store-result", async (req, res) => {
  // 🔒 Security: Force current session identification data over request body payload
  let targetEmployeeId = req.body?.EmployeeId;
  if (req.user.realRole === "user" || !targetEmployeeId) {
    targetEmployeeId = req.user.employeeId;
  }

  try {
    await saveEmployeeProgress({
      ...req.body,
      EmployeeId: targetEmployeeId, // ✅ Secured ID
      LastUpdated: new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[store-result] Error:", error);
    return res.status(500).json({ error: "Failed to store progress" });
  }
});

/**
 * @route   GET /progress/:EmployeeId
 * @desc    Fetches progress for a single employee
 */
router.get("/progress/:EmployeeId", async (req, res) => {
  const { EmployeeId } = req.params;

  // 🔒 Security: Prevent standard users from pulling details on other employee contexts
  if (req.user.realRole === "user" && EmployeeId !== req.user.employeeId) {
    return res.status(403).json({ error: "Access Denied: Unauthorized access to external progress structures." });
  }

  try {
    const user = await getEmployee(EmployeeId);

    if (user) {
      return res.status(200).json({ exists: true, user });
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("[get-progress] Error:", error);
    return res.status(500).json({ error: "Failed to fetch employee progress" });
  }
});

/**
 * @route   GET /all-progress
 * @desc    Fetches progress for all employees (Admin/Moderator Only)
 */
router.get("/all-progress", async (req, res) => {
  // 🔒 Role Isolation Guard
  if (req.user.realRole === "user") {
    return res.status(403).json({ error: "Access Denied: Administrative tier required." });
  }

  try {
    const data = await getAllEmployees();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[all-progress] Error:", error);
    return res.status(500).json({ error: "Failed to fetch all progress" });
  }
});

// ============================================================================
// SURVEY & MILESTONE ROUTES
// ============================================================================

/**
 * @route   POST /submitSurvey
 * @desc    Submits the initial developer survey and initializes milestones
 */
router.post("/submitSurvey", async (req, res) => {
  const { techStack, location } = req.body;

  if (!techStack || !location) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  // 🔒 Security Checkpoint: Bind dataset entry to the authenticated caller identity
  const employeeId = req.user.employeeId;

  try {
    const pool = await getDbConnection();
    await pool.request()
      .input("EmployeeId", sql.VarChar(10), employeeId)
      .input("TechStack", sql.VarChar(50), techStack)
      .input("Location", sql.VarChar(50), location)
      .query(`
        INSERT INTO EmployeeMilestones (
          EmployeeId, TechStack, Location,
          Milestone1Status, Milestone1Score, Milestone1Attempts,
          Milestone2Status, Milestone2Score, Milestone2Attempts,
          Milestone3Status, Milestone3Score, Milestone3Attempts,
          LastUpdated
        )
        VALUES (
          @EmployeeId, @TechStack, @Location,
          'PENDING', 0, 0,
          'PENDING', 0, 0,
          'PENDING', 0, 0,
          SYSDATETIME()
        )
      `);

    return res.status(201).json({ success: true, message: "Survey completed successfully." });
  } catch (error) {
    if (error.number === SQL_ERR_DUPLICATE_KEY) {
      return res.status(409).json({ success: false, message: "Survey already submitted for this employee." });
    }
    console.error("[submitSurvey] Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

/**
 * @route   GET /checkSurvey
 * @desc    Checks if an employee has completed the developer survey
 */
router.get("/checkSurvey", async (req, res) => {
  let targetId = req.query.employeeId;

  // 🔒 Security: Force standard users to verify only their own state
  if (req.user.realRole === "user" || !targetId) {
    targetId = req.user.employeeId;
  }

  try {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input("EmployeeId", sql.VarChar(10), targetId)
      .query(`
        SELECT EmployeeId 
        FROM EmployeeMilestones 
        WHERE EmployeeId = @EmployeeId
      `);

    const hasCompletedSurvey = result.recordset.length > 0;

    return res.status(200).json({ success: true, hasCompletedSurvey });
  } catch (error) {
    console.error("[checkSurvey] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify survey status" });
  }
});

// ============================================================================
// USER MAPPING & MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /addUser
 * @desc    Maps an employee to a manager and assigns milestone links (Admin/Moderator Only)
 */
router.post("/addUser", async (req, res) => {
  const {
    employeeId,
    milestone1Link, milestone1Name,
    milestone2Link, milestone2Name,
    milestone3Link, milestone3Name,
  } = req.body;

  // 🔒 Security: Use current manager's session Uid to map, unless it's a multi-tenant root admin
  let managerEmployeeId = req.user.employeeId;
  if (req.user.realRole === "user") {
    return res.status(403).json({ success: false, message: "Access Denied: Managers or Administrative contexts only." });
  }

  if (!employeeId) {
    return res.status(400).json({ success: false, message: "Employee ID is required" });
  }

  try {
    const pool = await getDbConnection();

    // Verify employee has completed the initial survey
    const checkRes = await pool.request()
      .input("EmployeeId", sql.VarChar(10), employeeId)
      .query(`SELECT EmployeeId FROM EmployeeMilestones WHERE EmployeeId = @EmployeeId`);

    if (checkRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Employee has not completed the Developer Survey yet." });
    }

    // Insert the manager-employee mapping
    await pool.request()
      .input("ManagerEmployeeId", sql.VarChar(10), managerEmployeeId)
      .input("EmployeeId", sql.VarChar(10), employeeId)
      .input("Milestone1Name", sql.VarChar(255), milestone1Name || null)
      .input("Milestone1Link", sql.VarChar(500), milestone1Link || null)
      .input("Milestone2Name", sql.VarChar(255), milestone2Name || null)
      .input("Milestone2Link", sql.VarChar(500), milestone2Link || null)
      .input("Milestone3Name", sql.VarChar(255), milestone3Name || null)
      .input("Milestone3Link", sql.VarChar(500), milestone3Link || null)
      .query(`
        INSERT INTO EmployeeMapping (
          ManagerEmployeeId, EmployeeId,
          Milestone1Name, Milestone1Link,
          Milestone2Name, Milestone2Link,
          Milestone3Name, Milestone3Link,
          CreatedAt, LastUpdated
        )
        VALUES (
          @ManagerEmployeeId, @EmployeeId,
          @Milestone1Name, @Milestone1Link,
          @Milestone2Name, @Milestone2Link,
          @Milestone3Name, @Milestone3Link,
          SYSDATETIME(), SYSDATETIME()
        )
      `);

    return res.status(201).json({ success: true, message: "Employee mapped successfully" });
  } catch (error) {
    if (error.number === SQL_ERR_DUPLICATE_KEY) {
      return res.status(409).json({ success: false, message: "Employee is already mapped to this manager." });
    }
    console.error("[addUser] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to add employee mapping" });
  }
});

/**
 * @route   GET /getUsers
 * @desc    Gets all mapped users under the current logged-in manager
 */
router.get("/getUsers", async (req, res) => {
  // 🔒 Security Checkpoint: Throw out incoming client parameter, force caller's session managerId
  if (req.user.realRole === "user") {
    return res.status(403).json({ success: false, message: "Access Denied: Managers or Administrative contexts only." });
  }
  
  const managerEmployeeId = req.user.employeeId;

  try {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input("managerEmployeeId", sql.VarChar(10), managerEmployeeId)
      .query(`
        SELECT 
          em.EmployeeId, em.TechStack, em.Location, em.LastUpdated, 
          em.Milestone1Status, em.Milestone2Status, em.Milestone3Status, 
          em.Milestone1Score, em.Milestone2Score, em.Milestone3Score, 
          map.ManagerEmployeeId, map.Milestone1Link, map.Milestone2Link, map.Milestone3Link 
        FROM EmployeeMilestones em
        INNER JOIN EmployeeMapping map ON em.EmployeeId = map.EmployeeId
        WHERE map.ManagerEmployeeId = @managerEmployeeId 
      `);

    const data = result.recordset.map(user => ({
      ...user,
      isMapped: user.ManagerEmployeeId !== null
    }));

    return res.status(200).json({ success: true, count: data.length, data: data });
  } catch (error) {
    console.error("[getUsers] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

/**
 * @route   POST /removeUser
 * @desc    Removes employee mapping and clears data (Admin / Manager Only)
 */
router.post("/removeUser", async (req, res) => {
  const { employeeId } = req.body;

  if (req.user.realRole === "user") {
    return res.status(403).json({ success: false, message: "Access Denied: Insufficient authorization scope." });
  }

  const managerEmployeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: "Employee ID is required" });
  }

  try {
    const pool = await getDbConnection();
    
    // 🔒 Security constraint: Ensure a manager can only delete mappings belonging to them
    await pool.request()
      .input("ManagerEmployeeId", sql.VarChar(10), managerEmployeeId)
      .input("EmployeeId", sql.VarChar(10), employeeId)
      .query(`
        DELETE FROM EmployeeMapping 
        WHERE ManagerEmployeeId = @ManagerEmployeeId 
          AND EmployeeId = @EmployeeId;

        DELETE FROM EmployeeMilestones 
        WHERE EmployeeId = @EmployeeId;
      `);
    return res.status(200).json({ success: true, message: "User removed from dashboard" });
  }
  catch (error) {
    console.error("[removeUser] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove user" });
  }
});

// ============================================================================
// DASHBOARD & CATALOG ROUTES
// ============================================================================

/**
 * @route   GET /getCatalog
 * @desc    Fetches the active milestone course catalog
 */
router.get("/getCatalog", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT MilestoneNumber, CourseLabel AS label, CourseLink AS value
      FROM MilestoneCatalog
      WHERE IsActive = 1
      ORDER BY MilestoneNumber ASC
    `);

    const catalog = {
      milestone1Link: [],
      milestone2Link: [],
      milestone3Link: []
    };

    result.recordset.forEach(course => {
      const key = `milestone${course.MilestoneNumber}Link`;
      if (catalog[key]) {
        catalog[key].push({ label: course.label, value: course.value });
      }
    });

    return res.status(200).json({ success: true, catalog });
  } catch (error) {
    console.error("[getCatalog] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch course catalog" });
  }
});

/**
 * @route   GET /getEmployeeDashboard
 * @desc    Retrieves specific dashboard data for an individual employee
 */
router.get("/getEmployeeDashboard", async (req, res) => {
  let targetId = req.query.employeeId;

  // 🔒 Security: Force current employeeId context over request parameters for standard user scopes
  if (req.user.realRole === "user" || !targetId) {
    targetId = req.user.employeeId;
  }

  try {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input("EmployeeId", sql.VarChar(10), targetId)
      .query(`
        SELECT 
          em.EmployeeId,
          em.Milestone1Status, em.Milestone2Status, em.Milestone3Status,
          em.Milestone1Score,  em.Milestone2Score,  em.Milestone3Score,
          em.Milestone1Attempts, em.Milestone2Attempts, em.Milestone3Attempts,
          map.ManagerEmployeeId,
          map.Milestone1Name, map.Milestone1Link,
          map.Milestone2Name, map.Milestone2Link,
          map.Milestone3Name, map.Milestone3Link
        FROM EmployeeMilestones em
        LEFT JOIN EmployeeMapping map ON em.EmployeeId = map.EmployeeId
        WHERE em.EmployeeId = @EmployeeId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Employee record not found." });
    }

    const data = result.recordset[0];
    const isMapped = data.ManagerEmployeeId !== null;

    return res.status(200).json({
      success: true,
      payload: {
        isMapped,
        milestone1Status: data.Milestone1Status,
        milestone1Score: data.Milestone1Score,
        milestone1Attempts: data.Milestone1Attempts,
        milestone1Name: data.Milestone1Name,
        milestone1Link: data.Milestone1Link,
        milestone2Status: data.Milestone2Status,
        milestone2Score: data.Milestone2Score,
        milestone2Attempts: data.Milestone2Attempts,
        milestone2Name: data.Milestone2Name,
        milestone2Link: data.Milestone2Link,
        milestone3Status: data.Milestone3Status,
        milestone3Score: data.Milestone3Score,
        milestone3Attempts: data.Milestone3Attempts,
        milestone3Name: data.Milestone3Name,
        milestone3Link: data.Milestone3Link,
      }
    });
  } catch (error) {
    console.error("[getEmployeeDashboard] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
});

// ============================================================================
// QUIZ ROUTES
// ============================================================================

/**
 * @route   POST /submitQuiz
 * @desc    Records quiz submission score and updates milestone status
 */
router.post("/submitQuiz", async (req, res) => {
  const { milestoneNumber, score } = req.body;

  if (milestoneNumber === undefined || score === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  // Prevent SQL injection by strictly validating the milestoneNumber
  if (![1, 2, 3].includes(Number(milestoneNumber))) {
    return res.status(400).json({ success: false, message: "Invalid milestone number." });
  }

  // 🔒 Security: Force target identifier configuration straight from JWT session mapping
  const employeeId = req.user.employeeId;

  const status = score >= 70 ? 'PASSED' : 'FAILED';
  const scoreCol = `Milestone${milestoneNumber}Score`;
  const statusCol = `Milestone${milestoneNumber}Status`;
  const attemptCol = `Milestone${milestoneNumber}Attempts`;

  try {
    const pool = await getDbConnection();
    await pool.request()
      .input("EmployeeId", sql.VarChar(10), employeeId)
      .input("Score", sql.Int, score)
      .input("Status", sql.VarChar(20), status)
      .query(`
        UPDATE EmployeeMilestones
        SET 
          ${scoreCol} = @Score,
          ${statusCol} = @Status,
          ${attemptCol} = ${attemptCol} + 1,
          LastUpdated = SYSDATETIME()
        WHERE EmployeeId = @EmployeeId
      `);

    return res.status(200).json({
      success: true,
      message: `Milestone ${milestoneNumber} updated successfully.`,
      status: status
    });
  } catch (error) {
    console.error("[submitQuiz] Error:", error);
    return res.status(500).json({ success: false, message: "Failed to update quiz results." });
  }
});

export default router;