import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { getDbConnection, sql } from "../db/database.js";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// 🔒 STRICT SECURITY BOUNCER: Admins ONLY
const requireAdminOnly = (req, res, next) => {
  const role = req.user?.realRole?.toLowerCase();
  if (role !== "admin" && role !== "guides") {
    return res.status(403).json({ message: "Access Denied: Administrative or Support privileges required." });
  }
  next();
};

/**
 * POST /api/auth/register (OPEN)
 */
router.post("/register", async (req, res) => {
  try {
    const { employeeId, name, password } = req.body;

    if (!employeeId || !name || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if employeeId is an integer and less than 8 digits
    if (!/^\d+$/.test(employeeId) || employeeId.length >= 8) {
      return res.status(400).json({ message: "Employee ID must be an integer and less than 8 digits long." });
    }

    if (!/^[a-zA-Z ]+$/.test(name)) {
      return res.status(400).json({ message: "Name must contain only letters and spaces." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const emp = employeeId.trim();
    const nm = name.trim();
    // Auto-generate email based on employee ID
    const em = `${emp}@cognizant.com`.toLowerCase(); 
    const role = "user"; // FORCE role to 'user'

    const pool = await getDbConnection();

    const exists = await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp)
      .input("email", sql.VarChar(100), em).query(`
        SELECT employee_id FROM Users
        WHERE employee_id = @employee_id OR email = @email
      `);

    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: "Employee ID or Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp)
      .input("name", sql.VarChar(100), nm)
      .input("email", sql.VarChar(100), em)
      .input("password_hash", sql.VarChar(200), passwordHash)
      .input("role", sql.VarChar(20), role).query(`
        INSERT INTO Users (employee_id, name, email, password_hash, role)
        VALUES (@employee_id, @name, @email, @password_hash, @role)
      `);

    return res.status(201).json({ message: "Registration successful." });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * POST /api/auth/login (OPEN)
 */
router.post("/login", async (req, res) => {
  try {
    // Removed role from req.body as we are fetching it exclusively from the DB
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ message: "Employee ID and password are required." });
    }

    // Check if employeeId is an integer
    if (!/^\d+$/.test(employeeId)) {
      return res.status(400).json({ message: "Employee ID must be an integer." });
    }

    const pool = await getDbConnection();
    const result = await pool
      .request()
      .input("employee_id", sql.VarChar(10), employeeId.trim())
      .query(
        `SELECT employee_id, name, email, password_hash, role, is_active 
         FROM Users 
         WHERE employee_id = @employee_id`
      );

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = result.recordset[0];

    if (user.is_active === false) {
      return res.status(403).json({ message: "Account has been deactivated. Please contact an administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Fetch and assign the actual role directly from the database
    const actualRole = user.role.toLowerCase();

    let clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "Unknown";
    if (clientIp.includes(",")) clientIp = clientIp.split(",")[0].trim();

    await pool
      .request()
      .input("employee_id", sql.VarChar(10), user.employee_id)
      .input("last_login_ip", sql.VarChar(45), clientIp.substring(0, 45))
      .query(`
        UPDATE Users 
        SET last_login_at = GETDATE(), last_login_ip = @last_login_ip 
        WHERE employee_id = @employee_id
      `);

    const tokenPayload = {
      employeeId: user.employee_id,
      name: user.name,
      realRole: actualRole,
      activeRole: actualRole, // Enforcing strict DB-assigned role
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful.",
      user: {
        employeeId: user.employee_id,
        name: user.name,
        email: user.email,
        role: actualRole,
        activeRole: actualRole,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * GET /api/auth/me (SECURED)
 */
router.get("/me", authenticateToken, (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

/**
 * POST /api/auth/logout (SECURED)
 */
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;
    if (employeeId) {
      const pool = await getDbConnection();
      await pool.request().input("employee_id", sql.VarChar(10), employeeId)
        .query(`
          UPDATE Users 
          SET last_logout_at = GETDATE() 
          WHERE employee_id = @employee_id
        `);
    }
  } catch (err) {
    console.error("Failed to log logout time:", err);
  }

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out successfully." });
});

/**
 * POST /api/auth/reset-password (OPEN - User Trade-in)
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { employeeId, tempPassword, newPassword } = req.body;

    if (!employeeId || !tempPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if employeeId is an integer
    if (!/^\d+$/.test(employeeId)) {
      return res.status(400).json({ message: "Employee ID must be an integer." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password does not meet the security criteria." });
    }

    const emp = employeeId.trim();
    const pool = await getDbConnection();

    const result = await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp).query(`
        SELECT password_hash FROM Users WHERE employee_id = @employee_id
      `);

    // Check if user exists, advise registration if not
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found. Please Register First." });
    }

    const isMatch = await bcrypt.compare(tempPassword, result.recordset[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid temporary password." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp)
      .input("password_hash", sql.VarChar(200), newHash).query(`
        UPDATE Users 
        SET password_hash = @password_hash 
        WHERE employee_id = @employee_id
      `);

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset Password error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/**
 * POST /api/auth/validate-contributors (SECURED)
 */
router.post("/validate-contributors", authenticateToken, async (req, res) => {
  try {
    const { contributors } = req.body;

    if (!contributors || !Array.isArray(contributors) || contributors.length === 0) {
      return res.status(200).json({ validContributors: [], invalidContributors: [] });
    }

    const pool = await getDbConnection();
    const request = pool.request();

    const params = [];
    contributors.forEach((id, index) => {
      const paramName = `emp${index}`;
      request.input(paramName, sql.VarChar(10), id.trim());
      params.push(`@${paramName}`);
    });

    const query = `
      SELECT employee_id 
      FROM Users 
      WHERE employee_id IN (${params.join(", ")})
    `;

    const result = await request.query(query);
    const validIds = result.recordset.map((row) => row.employee_id);
    const invalidIds = contributors.filter((id) => !validIds.includes(id.trim()));

    return res.status(200).json({
      validContributors: validIds,
      invalidContributors: invalidIds,
    });
  } catch (error) {
    console.error("Validate contributors error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

/* =========================================================
   ADMIN EXCLUSIVE ROUTES
========================================================= */

/**
 * GET /api/auth/users
 * Returns a list of all users for the Admin Dashboard
 */
router.get("/users", authenticateToken, requireAdminOnly, async (req, res) => {
  try {
    const pool = await getDbConnection();
    const result = await pool.request().query(`
      SELECT employee_id AS employeeId, name, email, role AS realRole
      FROM Users
      ORDER BY name ASC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch user list." });
  }
});

/**
 * PUT /api/auth/update-role
 */
// router.put("/update-role", authenticateToken, requireAdminOnly, async (req, res) => {
//   try {
//     const { employeeId, newRole } = req.body;

//     if (!employeeId || !newRole) {
//       return res.status(400).json({ message: "Employee ID and new role are required." });
//     }

//     const targetEmp = employeeId.trim();
//     const targetRole = newRole.trim().toLowerCase();

//     const validRoles = ["user", "guides", "moderator", "admin"];
//     if (!validRoles.includes(targetRole)) {
//       return res.status(400).json({ message: `Invalid role. Allowed roles are: ${validRoles.join(", ")}` });
//     }

//     const activeUserRole = req.user?.realRole?.toLowerCase();

//     // ✅ Prevent Guides from assigning the Admin role to anyone
//     if (activeUserRole === "guides" && targetRole === "admin") {
//       return res.status(403).json({ message: "Access Denied: Guides cannot assign the 'admin' role." });
//     }

//     const pool = await getDbConnection();

//     // ✅ Fetch the target user's CURRENT role before updating
//     const targetCheck = await pool
//       .request()
//       .input("employee_id", sql.VarChar(10), targetEmp)
//       .query(`SELECT role FROM Users WHERE employee_id = @employee_id`);

//     if (targetCheck.recordset.length === 0) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     const targetCurrentRole = targetCheck.recordset[0].role.toLowerCase();

//     // ✅ BACKEND GUARD: Prevent Guides from demoting an existing Admin
//     if (activeUserRole === "guides" && targetCurrentRole === "admin") {
//       return res.status(403).json({ message: "Access Denied: You cannot change the admin access." });
//     }

//     // Prevent users from demoting themselves (unless they are an admin doing it intentionally)
//     if (req.user.employeeId === targetEmp && targetRole !== "admin") {
//       return res.status(403).json({ message: "You cannot demote your own admin account." });
//     }

//     // Finally, update the role
//     const result = await pool
//       .request()
//       .input("employee_id", sql.VarChar(10), targetEmp)
//       .input("role", sql.VarChar(20), targetRole).query(`
//         UPDATE Users 
//         SET role = @role 
//         WHERE employee_id = @employee_id
//       `);

//     return res.status(200).json({ message: `Role updated successfully to '${targetRole}'.` });
//   } catch (error) {
//     console.error("Update role error:", error);
//     return res.status(500).json({ message: "Internal server error." });
//   }
// });

/**

* PUT /api/auth/update-role

*/
router.put("/update-role", authenticateToken, requireAdminOnly, async (req, res) => {
  try {
    const { employeeId, newRole } = req.body;
 
    if (!employeeId || !newRole) {
      return res.status(400).json({ message: "Employee ID and new role are required." });
    }
 
    const targetEmp = String(employeeId).trim();
    const targetRole = String(newRole).trim().toLowerCase();
 
    const validRoles = ["user", "guides", "moderator", "admin"];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ message: `Invalid role. Allowed roles are: ${validRoles.join(", ")}` });
    }
 
    const activeUserRole = req.user?.realRole?.toLowerCase();
 
    // ✅ Prevent Guides from assigning the Admin role to anyone
    if (activeUserRole === "guides" && targetRole === "admin") {
      return res.status(403).json({ message: "Access Denied: Guides cannot assign the 'admin' role." });
    }
 
    const pool = await getDbConnection();
 
    // ✅ Fetch the target user's CURRENT role before updating
    const targetCheck = await pool
      .request()
      .input("employee_id", sql.VarChar(10), targetEmp)
      .query(`SELECT role FROM Users WHERE employee_id = @employee_id`);
 
    if (targetCheck.recordset.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
 
    const targetCurrentRole = targetCheck.recordset[0].role.toLowerCase();
 
    // ✅ BACKEND GUARD: Prevent Guides from demoting an existing Admin
    if (activeUserRole === "guides" && targetCurrentRole === "admin") {
      return res.status(403).json({ message: "Access Denied: You cannot change the admin access." });
    }
 
    // Prevent users from demoting themselves (unless they are an admin doing it intentionally)
    if (req.user.employeeId === targetEmp && targetRole !== "admin") {
      return res.status(403).json({ message: "You cannot demote your own admin account." });
    }
 
    // Finally, update the role
    const result = await pool
      .request()
      .input("employee_id", sql.VarChar(10), targetEmp)
      .input("role", sql.VarChar(20), targetRole).query(`
        UPDATE Users
        SET role = @role
        WHERE employee_id = @employee_id
      `);
 
    return res.status(200).json({ message: `Role updated successfully to '${targetRole}'.` });
  } catch (error) {
    console.error("Update role error details:", error.message || error); 
    let string1 = error.message || error;
    return res.status(500).json({ message: string1 });
  }
});
 
 

/**
 * PUT /api/auth/dev-reset-password
 * Auto-generates a temporary password and returns it to the Admin
 */
router.put("/dev-reset-password", authenticateToken, requireAdminOnly, async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: "Employee ID is required." });
    }

    const emp = employeeId.trim();
    const pool = await getDbConnection();

    // Verify user exists
    const userCheck = await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp)
      .query(`SELECT employee_id FROM Users WHERE employee_id = @employee_id`);

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    // Auto-generate temp password
    const randomHex = crypto.randomBytes(4).toString("hex");
    const generatedTempPassword = `Temp@${randomHex}`;
    const passwordHash = await bcrypt.hash(generatedTempPassword, 10);

    await pool
      .request()
      .input("employee_id", sql.VarChar(10), emp)
      .input("password_hash", sql.VarChar(200), passwordHash).query(`
        UPDATE Users 
        SET password_hash = @password_hash 
        WHERE employee_id = @employee_id
      `);

    return res.status(200).json({
      message: `Password reset successfully.`,
      tempPassword: generatedTempPassword,
    });
  } catch (error) {
    console.error("Dev Reset error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default router;