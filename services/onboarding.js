import { getDbConnection, sql } from "../db/database.js";

/* =========================================
   SAVE / UPDATE EMPLOYEE PROGRESS
========================================= */
export async function saveEmployeeProgress(data) {
  const {
    EmployeeId,
    milestone,
    status,
    score,
    techStack,
    location
  } = data;

  if (!EmployeeId || !milestone) {
    throw new Error("EmployeeId and milestone are required");
  }

  const pool = await getDbConnection();

  // ✅ Validate milestone
  if (![1, 2, 3].includes(Number(milestone))) {
    throw new Error("Invalid milestone number");
  }

  // ✅ Dynamic column names
  const statusColumn = `Milestone${milestone}Status`;
  const scoreColumn = `Milestone${milestone}Score`;
  const attemptsColumn = `Milestone${milestone}Attempts`;

  const request = pool.request()
    .input("EmployeeId", sql.VarChar(10), EmployeeId)
    .input("status", sql.VarChar(20), status.toUpperCase())
    .input("score", sql.Int, score)
    .input("TechStack", sql.VarChar(50), techStack)
    .input("Location", sql.VarChar(50), location);

  // ✅ Update correct milestone
  await request.query(`
    UPDATE EmployeeMilestones
    SET
      ${statusColumn} = @status,
      ${scoreColumn} = @score,
      ${attemptsColumn} = ${attemptsColumn} + 1,
      TechStack = @TechStack,
      Location = @Location,
      LastUpdated = SYSDATETIME()
    WHERE EmployeeId = @EmployeeId
  `);
}

/* =========================================
   GET SINGLE EMPLOYEE PROGRESS
========================================= */
export async function getEmployee(EmployeeId) {
  if (!EmployeeId) return null;

  const pool = await getDbConnection();

  const result = await pool.request()
    .input("EmployeeId", sql.VarChar(10), EmployeeId)
    .query(`
      SELECT *
      FROM EmployeeMilestones
      WHERE EmployeeId = @EmployeeId
    `);

  return result.recordset[0] || null;
}

/* =========================================
   GET ALL EMPLOYEE PROGRESS
========================================= */
export async function getAllEmployees() {
  const pool = await getDbConnection();

  // ✅ FIXED: Added LEFT JOIN so the Admin Dashboard receives the ManagerEmployeeId 
  // and knows whether the employee is deployed/mapped or "Waiting to onboard"
  const result = await pool.request().query(`
    SELECT 
      em.*, 
      map.ManagerEmployeeId, 
      map.Milestone1Name, map.Milestone1Link, 
      map.Milestone2Name, map.Milestone2Link, 
      map.Milestone3Name, map.Milestone3Link 
    FROM EmployeeMilestones em
    LEFT JOIN EmployeeMapping map ON em.EmployeeId = map.EmployeeId
  `);

  return result.recordset;
}