import express from "express";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; // ✅ Core Authentication Integration

const router = express.Router();

// ✅ 1. Enforce JWT parsing to identify the user
router.use(authenticateToken);

// 🔒 2. STRICT SECURITY BOUNCER: Only Admins and Moderators can pass this point
const requireAdminOrModerator = (req, res, next) => {
  const role = req.user?.realRole?.toLowerCase();
  
  if (role !== "admin" && role !== "moderator") {
    return res.status(403).json({ 
      error: "Access Denied: This module is strictly restricted to Administrators and Moderators." 
    });
  }
  
  next(); // User is Admin/Mod, let them through
};

// Apply the bouncer to ALL routes in this file
router.use(requireAdminOrModerator);

/* ================= CREATE ================= */
router.post("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const r = req.body;

    await db.request()
      .input("ProjectId", sql.NVarChar, r.projectId)
      .input("Project", sql.NVarChar, r.project)
      .input("AssociateId", sql.NVarChar, r.associateId) 
      .input("AssociateName", sql.NVarChar, r.associateName)
      .input("MipPlanDate", sql.Date, r.mipPlanDate || null)
      .input("ExecutionDate", sql.Date, r.executionDate || null)
      .input("Action", sql.NVarChar, r.action)
      .input("Lever", sql.NVarChar, r.lever) 
      .input("PresentGrade", sql.NVarChar, r.presentGrade)
      .input("ReplacementGrade", sql.NVarChar, r.replacementGrade)
      .input("UpdatedStatus", sql.NVarChar, r.updatedStatus)
      .input("InternalTracking", sql.NVarChar, r.internalTracking)
      .input("OptimizationCategory", sql.NVarChar, r.optimizationCategory)
      .query(`
        INSERT INTO OptimizationTracker (
          ProjectId, Project, AssociateId, AssociateName,
          MipPlanDate, ExecutionDate, Action, Lever,
          PresentGrade, ReplacementGrade, UpdatedStatus,
          InternalTracking, OptimizationCategory,
          RowEntryDate, RowModifiedDate -- ✅ Added Missing Columns
        )
        VALUES (
          @ProjectId, @Project, @AssociateId, @AssociateName,
          @MipPlanDate, @ExecutionDate, @Action, @Lever,
          @PresentGrade, @ReplacementGrade, @UpdatedStatus,
          @InternalTracking, @OptimizationCategory,
          SYSDATETIME(), SYSDATETIME() -- ✅ SQL auto-generates the timestamps
        )
      `);

    res.status(201).json({ message: "Record created successfully" });
  } catch (err) {
    console.error("Insert Error:", err);
    res.status(500).json({ error: "Failed to create optimization record." });
  }
});

/* ================= READ ================= */
router.get("/", authenticateToken, async (req, res) => {
  try {
    // 1. 🔒 Role Validation: Strictly Prohibit standard users
    const currentRole = (req.user?.realRole || req.user?.role || "").toLowerCase();
    
    if (currentRole !== "admin" && currentRole !== "moderator") {
      return res.status(403).json({ error: "Access Denied: You do not have permission to view these records." });
    }

    const db = await getDbConnection();
    const request = db.request();
    const { search } = req.query;

    let query = "";

    // 2. 🔒 Query Building: Row-Level Security
    if (currentRole === "admin") {
      // Admins see all records globally
      query = `SELECT ot.* FROM OptimizationTracker ot WHERE 1=1`;
      
    } else if (currentRole === "moderator") {
      // Moderators ONLY see records where they manage the associated project
      query = `
        SELECT ot.* FROM OptimizationTracker ot
        INNER JOIN projects p ON ot.ProjectId = p.project_id
        WHERE (p.manager_id = @empId OR p.proxy_manager_id = @empId)
      `;
      // Securely bind the token's employeeId
      request.input("empId", sql.VarChar(50), String(req.user.employeeId).trim());
    }

    // 3. Optional Search Filtering
    if (search) {
      query += ` AND (ot.ProjectId LIKE '%' + @search + '%' OR ot.AssociateId LIKE '%' + @search + '%')`;
      request.input("search", sql.NVarChar, search);
    }
    
    query += " ORDER BY ot.RowEntryDate DESC";

    // 4. Execute and Return
    const result = await request.query(query);
    res.json(result.recordset);

  } catch (err) {
    console.error("Fetch OptimizationTracker Error:", err);
    res.status(500).json({ error: "Failed to fetch records securely." });
  }
});

/* ================= UPDATE ================= */
// Don't forget to import your auth middleware at the top if you haven't!
// import { authenticateToken } from "../middleware/auth.js";

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    // 🔒 Security Check: Only allow Admins and Moderators to update
    const currentRole = (req.user?.realRole || req.user?.role || "").toLowerCase();
    if (currentRole !== "admin" && currentRole !== "moderator") {
        return res.status(403).json({ error: "Access Denied: You do not have permission to edit these records." });
    }

    const db = await getDbConnection();
    const request = db.request();
    const r = req.body;

    const updateQuery = `
      UPDATE OptimizationTracker
      SET
        ProjectId = @ProjectId,
        Project = @Project,
        AssociateId = @AssociateId,
        AssociateName = @AssociateName,
        MipPlanDate = @MipPlanDate,
        ExecutionDate = @ExecutionDate,
        Action = @Action,
        Lever = @Lever,
        PresentGrade = @PresentGrade,
        ReplacementGrade = @ReplacementGrade,
        UpdatedStatus = @UpdatedStatus,
        InternalTracking = @InternalTracking,
        OptimizationCategory = @OptimizationCategory,
        RowModifiedDate = SYSDATETIME()
      WHERE Id = @Id
    `;

    const result = await request
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .input("ProjectId", sql.NVarChar, r.projectId)
      .input("Project", sql.NVarChar, r.project)
      .input("AssociateId", sql.NVarChar, r.associateId)
      .input("AssociateName", sql.NVarChar, r.associateName)
      // ✅ FIX: Fallback to null to prevent empty string crashes
      .input("MipPlanDate", sql.Date, r.mipPlanDate || null)
      .input("ExecutionDate", sql.Date, r.executionDate || null)
      .input("Action", sql.NVarChar, r.action)
      .input("Lever", sql.NVarChar, r.lever) 
      .input("PresentGrade", sql.NVarChar, r.presentGrade)
      .input("ReplacementGrade", sql.NVarChar, r.replacementGrade)
      .input("UpdatedStatus", sql.NVarChar, r.updatedStatus)
      .input("InternalTracking", sql.NVarChar, r.internalTracking)
      .input("OptimizationCategory", sql.NVarChar, r.optimizationCategory)
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Record not found." });
    }

    res.json({ message: "Record updated successfully" });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Failed to update record securely." });
  }
});

/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const request = db.request();

    const result = await request
      .input("Id", sql.UniqueIdentifier, req.params.id)
      .query(`DELETE FROM OptimizationTracker WHERE Id = @Id`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Record not found." });
    }

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;


// More Secured code but not tested

// import express from "express";
// import { getDbConnection, sql } from "../db/database.js";
// import { authenticateToken } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // ✅ 1. Global Authentication
// router.use(authenticateToken);

// // 🔒 2. STRICT SECURITY BOUNCER
// const requireAdminOrModerator = (req, res, next) => {
//   const role = req.user?.realRole?.toLowerCase() || req.user?.role?.toLowerCase();
  
//   if (role !== "admin" && role !== "moderator") {
//     return res.status(403).json({ 
//       error: "Access Denied: This module is strictly restricted to Administrators and Moderators." 
//     });
//   }
  
//   // Attach the normalized role to req.user so we don't have to keep checking it below!
//   req.user.normalizedRole = role;
//   next(); 
// };

// // Apply to all routes
// router.use(requireAdminOrModerator);


// /* ================= CREATE (POST) ================= */
// router.post("/", async (req, res) => {
//   try {
//     const db = await getDbConnection();
//     const r = req.body;
//     const request = db.request();
    
//     // 🔒 RLS CHECK: Can this moderator add to this specific project?
//     if (req.user.normalizedRole === "moderator") {
//       const ownershipCheck = await request
//         .input("checkProjectId", sql.NVarChar, r.projectId)
//         .input("empId", sql.VarChar(50), String(req.user.employeeId).trim())
//         .query(`
//           SELECT 1 FROM projects 
//           WHERE project_id = @checkProjectId 
//           AND (manager_id = @empId OR proxy_manager_id = @empId)
//         `);
        
//       if (ownershipCheck.recordset.length === 0) {
//         return res.status(403).json({ error: "Access Denied: You do not manage this project." });
//       }
//     }

//     await request
//       .input("ProjectId", sql.NVarChar, r.projectId)
//       .input("Project", sql.NVarChar, r.project)
//       .input("AssociateId", sql.NVarChar, r.associateId) 
//       .input("AssociateName", sql.NVarChar, r.associateName)
//       .input("MipPlanDate", sql.Date, r.mipPlanDate || null)
//       .input("ExecutionDate", sql.Date, r.executionDate || null)
//       .input("Action", sql.NVarChar, r.action)
//       .input("Lever", sql.NVarChar, r.lever) 
//       .input("PresentGrade", sql.NVarChar, r.presentGrade)
//       .input("ReplacementGrade", sql.NVarChar, r.replacementGrade)
//       .input("UpdatedStatus", sql.NVarChar, r.updatedStatus)
//       .input("InternalTracking", sql.NVarChar, r.internalTracking)
//       .input("OptimizationCategory", sql.NVarChar, r.optimizationCategory)
//       .query(`
//         INSERT INTO OptimizationTracker (
//           ProjectId, Project, AssociateId, AssociateName,
//           MipPlanDate, ExecutionDate, Action, Lever,
//           PresentGrade, ReplacementGrade, UpdatedStatus,
//           InternalTracking, OptimizationCategory,
//           RowEntryDate, RowModifiedDate
//         )
//         VALUES (
//           @ProjectId, @Project, @AssociateId, @AssociateName,
//           @MipPlanDate, @ExecutionDate, @Action, @Lever,
//           @PresentGrade, @ReplacementGrade, @UpdatedStatus,
//           @InternalTracking, @OptimizationCategory,
//           SYSDATETIME(), SYSDATETIME()
//         )
//       `);

//     res.status(201).json({ message: "Record created successfully" });
//   } catch (err) {
//     console.error("Insert Error:", err);
//     res.status(500).json({ error: "Failed to create optimization record." });
//   }
// });


// /* ================= READ (GET) ================= */
// router.get("/", async (req, res) => {
//   try {
//     const db = await getDbConnection();
//     const request = db.request();
//     const { search } = req.query;

//     let query = "";

//     // 🔒 Query Building: Row-Level Security
//     if (req.user.normalizedRole === "admin") {
//       query = `SELECT ot.* FROM OptimizationTracker ot WHERE 1=1`;
//     } else {
//       query = `
//         SELECT ot.* FROM OptimizationTracker ot
//         INNER JOIN projects p ON ot.ProjectId = p.project_id
//         WHERE (p.manager_id = @empId OR p.proxy_manager_id = @empId)
//       `;
//       request.input("empId", sql.VarChar(50), String(req.user.employeeId).trim());
//     }

//     if (search) {
//       query += ` AND (ot.ProjectId LIKE '%' + @search + '%' OR ot.AssociateId LIKE '%' + @search + '%')`;
//       request.input("search", sql.NVarChar, search);
//     }
    
//     query += " ORDER BY ot.RowEntryDate DESC";

//     const result = await request.query(query);
//     res.json(result.recordset);
//   } catch (err) {
//     console.error("Fetch OptimizationTracker Error:", err);
//     res.status(500).json({ error: "Failed to fetch records securely." });
//   }
// });


// /* ================= UPDATE (PUT) ================= */
// router.put("/:id", async (req, res) => {
//   try {
//     const db = await getDbConnection();
//     const request = db.request();
//     const r = req.body;

//     let updateQuery = "";

//     // 🔒 RLS CHECK: Use a subquery to restrict UPDATE to owned projects
//     if (req.user.normalizedRole === "admin") {
//         updateQuery = `WHERE Id = @Id`;
//     } else {
//         updateQuery = `
//           WHERE Id = @Id 
//           AND ProjectId IN (
//               SELECT project_id FROM projects 
//               WHERE manager_id = @empId OR proxy_manager_id = @empId
//           )
//         `;
//         request.input("empId", sql.VarChar(50), String(req.user.employeeId).trim());
//     }

//     const result = await request
//       .input("Id", sql.UniqueIdentifier, req.params.id)
//       .input("ProjectId", sql.NVarChar, r.projectId)
//       .input("Project", sql.NVarChar, r.project)
//       .input("AssociateId", sql.NVarChar, r.associateId)
//       .input("AssociateName", sql.NVarChar, r.associateName)
//       .input("MipPlanDate", sql.Date, r.mipPlanDate || null)
//       .input("ExecutionDate", sql.Date, r.executionDate || null)
//       .input("Action", sql.NVarChar, r.action)
//       .input("Lever", sql.NVarChar, r.lever) 
//       .input("PresentGrade", sql.NVarChar, r.presentGrade)
//       .input("ReplacementGrade", sql.NVarChar, r.replacementGrade)
//       .input("UpdatedStatus", sql.NVarChar, r.updatedStatus)
//       .input("InternalTracking", sql.NVarChar, r.internalTracking)
//       .input("OptimizationCategory", sql.NVarChar, r.optimizationCategory)
//       .query(`
//         UPDATE OptimizationTracker
//         SET
//           ProjectId = @ProjectId,
//           Project = @Project,
//           AssociateId = @AssociateId,
//           AssociateName = @AssociateName,
//           MipPlanDate = @MipPlanDate,
//           ExecutionDate = @ExecutionDate,
//           Action = @Action,
//           Lever = @Lever,
//           PresentGrade = @PresentGrade,
//           ReplacementGrade = @ReplacementGrade,
//           UpdatedStatus = @UpdatedStatus,
//           InternalTracking = @InternalTracking,
//           OptimizationCategory = @OptimizationCategory,
//           RowModifiedDate = SYSDATETIME()
//         ${updateQuery}
//       `);

//     // If rowsAffected is 0, it means the ID doesn't exist OR they don't own it.
//     if (result.rowsAffected[0] === 0) {
//       return res.status(404).json({ error: "Record not found or you do not have permission to edit it." });
//     }

//     res.json({ message: "Record updated successfully" });
//   } catch (err) {
//     console.error("Update Error:", err);
//     res.status(500).json({ error: "Failed to update record securely." });
//   }
// });


// /* ================= DELETE ================= */
// router.delete("/:id", async (req, res) => {
//   try {
//     const db = await getDbConnection();
//     const request = db.request();

//     let deleteFilter = "";

//     // 🔒 RLS CHECK: Use a subquery to restrict DELETE to owned projects
//     if (req.user.normalizedRole === "admin") {
//         deleteFilter = `WHERE Id = @Id`;
//     } else {
//         deleteFilter = `
//           WHERE Id = @Id 
//           AND ProjectId IN (
//               SELECT project_id FROM projects 
//               WHERE manager_id = @empId OR proxy_manager_id = @empId
//           )
//         `;
//         request.input("empId", sql.VarChar(50), String(req.user.employeeId).trim());
//     }

//     const result = await request
//       .input("Id", sql.UniqueIdentifier, req.params.id)
//       .query(`DELETE FROM OptimizationTracker ${deleteFilter}`);

//     // If rowsAffected is 0, the record doesn't exist or they are trying to delete another manager's record.
//     if (result.rowsAffected[0] === 0) {
//       return res.status(404).json({ error: "Record not found or you do not have permission to delete it." });
//     }

//     res.json({ message: "Record deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;