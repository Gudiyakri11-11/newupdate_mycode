import { Router } from "express";
import { getDbConnection, sql } from "../db/database.js";

import {
  authenticateToken,
  catchIdentityTheft,
} from "../middleware/authMiddleware.js";
const router = Router();

// ✅ Enforce secure JWT session parsing on all underlying routes
router.use(authenticateToken);

// Helper to calculate T+Days in YYYY-MM-DD format based on server time
const getTPlusDateString = (daysToAdd) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toLocaleDateString('en-CA');
};

// Defensive parsing helper
function safeStringify(data) {
    if (!data) return "[]";
    if (typeof data === "string") return data;
    return JSON.stringify(data);
}

/**
 * @route   GET /api/panel/employee/:id
 * @desc    Fetch profile name from the user authentication system table
 * @access  OPEN READ
 */
router.get("/employee/:id", async (req, res) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request()
            .input("emp_id", sql.VarChar(10), req.params.id.trim())
            .query("SELECT name FROM Users WHERE employee_id = @emp_id");

        if (result.recordset.length > 0) {
            return res.json({ success: true, name: result.recordset[0].name });
        } else {
            return res.json({ success: true, name: "Fallback Test User" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: "Failed to fetch employee profile." });
    }
});

/**
 * @route   GET /api/panel/nominations/:employeeId
 * @desc    Fetch and cross-map all raw SQL entries for a specific employee
 * @access  OPEN READ
 */
router.get("/nominations/:employeeId", async (req, res) => {
    try {
        const targetId = req.params.employeeId.trim();

        const pool = await getDbConnection();
        const result = await pool.request()
            .input("emp_id", sql.VarChar(10), targetId)
            .query(`SELECT * FROM PanelNominations WHERE employee_id = @emp_id ORDER BY NominationId DESC`);

        const normalizedData = result.recordset.map(row => ({
            NominationId: row.NominationId,
            employeeId: row.employee_id,
            name: row.name,
            grade: row.grade,
            location: row.location,
            parentCustomer: row.parent_customer,
            contactNo: row.contact_no,
            interviewSkills: row.interview_skills,
            booked_slots: row.booked_slots
        }));

        return res.json({ success: true, data: normalizedData });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Failed to fetch nominations securely." });
    }
});

/**
 * @route   POST /api/panel/nomination
 * @desc    Process transactional updates and log audit changes inside SQL Server
 * @access  STRICT WRITE (Zero-Trust JWT Enforcement)
 */
router.post("/nomination", catchIdentityTheft, async (req, res) => {
    // 🗑️ We completely ignore employeeId and name from req.body to prevent forgery.
    const { 
        nominationId, grade, location, 
        parentCustomer, contactNo, interviewSkills, bookedSlots = [], employeeId 
    } = req.body;

    try {
        const pool = await getDbConnection();

        // 🔒 ZERO-TRUST IDENTITY ENFORCEMENT
        if (!req.user || !req.user.employeeId) {
             return res.status(401).json({ success: false, message: "Unauthorized. Valid token required." });
        }
        
        let targetEmployeeId = req.user.employeeId;

        // 1. Allow 'admin' or 'moderator' to pass a different ID in req.body
        const isElevatedRole = req.user.activeRole === "admin" || req.user.activeRole === "moderator";
        if (isElevatedRole && employeeId) {
            targetEmployeeId = employeeId.trim();
        }

        // 2. Fetch the absolute truth for the user's name directly from the Database
        const userCheck = await pool.request()
            .input("emp_id", sql.VarChar(10), targetEmployeeId)
            .query("SELECT name FROM Users WHERE employee_id = @emp_id");

        if (userCheck.recordset.length === 0) {
             return res.status(404).json({ success: false, message: "User identity not found in database." });
        }
        
        const safeName = userCheck.recordset[0].name;

        // 🛡️ SANITIZATION: Forcefully strip normal times if a LEAVE exists for that date
        let parsedSlots = typeof bookedSlots === "string" ? JSON.parse(bookedSlots) : bookedSlots;
        if (!Array.isArray(parsedSlots)) parsedSlots = []; // Fallback if payload is malformed
        
        const leaveDates = new Set(parsedSlots.filter(s => s.time === "LEAVE").map(s => s.date));
        const sanitizedSlots = parsedSlots.filter(s => s.time === "LEAVE" || !leaveDates.has(s.date));

        // Use the sanitized array
        const slotsStringified = JSON.stringify(sanitizedSlots);

        // Defensive fallbacks
        const safeGrade = grade || null;
        const safeLocation = location || null;
        const safeParentCustomer = parentCustomer || null;
        const safeContactNo = contactNo || null;
        const safeInterviewSkills = typeof interviewSkills === 'string' ? interviewSkills : JSON.stringify(interviewSkills || []);

        if (nominationId) {
            // --- EDIT MODE LOGIC ---
            const ownershipCheck = await pool.request()
                .input("nom_id", sql.Int, nominationId)
                .query("SELECT employee_id, booked_slots FROM PanelNominations WHERE NominationId = @nom_id");

            if (ownershipCheck.recordset.length === 0) {
                return res.status(404).json({ success: false, message: "Nomination not found." });
            }

            // 🔒 Strict Ownership Check
            if (!isElevatedRole && ownershipCheck.recordset[0].employee_id !== req.user.employeeId) {
                return res.status(403).json({ success: false, message: "Access Denied: You cannot modify someone else's record." });
            }

            let totalOldSlots = [];
            try {
                const parsed = JSON.parse(ownershipCheck.recordset[0].booked_slots || "[]");
                if (Array.isArray(parsed)) totalOldSlots = parsed;
            } catch (e) { }

            const t2DateStr = getTPlusDateString(2);
            const pastSlotsRemoved = totalOldSlots.filter(old =>
                old.date < t2DateStr &&
                !bookedSlots.some(nb => nb.date === old.date && nb.time === old.time)
            );

            if (pastSlotsRemoved.length > 0) {
                return res.status(400).json({ success: false, message: "Update failed: You must provide at least 2 days' notice to remove an existing slot." });
            }

            // Delete duplicate nominations if they exist to keep 1 active per user
            await pool.request()
                .input("emp_id", sql.VarChar(10), targetEmployeeId)
                .input("active_id", sql.Int, nominationId)
                .query("DELETE FROM PanelNominations WHERE employee_id = @emp_id AND NominationId <> @active_id");

            // ✅ FIX: Added employee_id to the UPDATE query to allow Admins to successfully reassign profiles
            await pool.request()
                .input("id", sql.Int, nominationId)
                .input("emp_id", sql.VarChar(10), targetEmployeeId)
                .input("name", sql.VarChar(100), safeName)
                .input("grade", sql.VarChar(10), safeGrade)
                .input("location", sql.VarChar(100), safeLocation)
                .input("parent_customer", sql.VarChar(150), safeParentCustomer)
                .input("contact_no", sql.VarChar(20), safeContactNo)
                .input("interview_skills", sql.VarChar(sql.MAX), safeInterviewSkills)
                .input("booked_slots", sql.VarChar(sql.MAX), slotsStringified)
                .query(`
                    UPDATE PanelNominations 
                    SET employee_id = @emp_id, 
                        name = @name, 
                        grade = @grade, 
                        location = @location, 
                        parent_customer = @parent_customer, 
                        contact_no = @contact_no, 
                        interview_skills = @interview_skills, 
                        booked_slots = @booked_slots
                    WHERE NominationId = @id
                `);
                
            // ✅ FIX: Deleted the dangerous DELETE FROM PanelNominationHistory here.

            await pool.request()
                .input("nom_id", sql.Int, nominationId)
                .input("emp_id", sql.VarChar(10), targetEmployeeId)
                .input("action", sql.VarChar(20), "UPDATE")
                .input("old_slots", sql.VarChar(sql.MAX), JSON.stringify(totalOldSlots))
                .input("new_slots", sql.VarChar(sql.MAX), slotsStringified)
                .query(`
                    INSERT INTO PanelNominationHistory (NominationId, employee_id, ActionType, OldSlots, NewSlots, ModifiedAt)
                    VALUES (@nom_id, @emp_id, @action, @old_slots, @new_slots, SYSDATETIME())
                `);

            return res.json({ success: true, message: "Nomination updated successfully." });
        } else {
            // --- RAW FRESH SUBMISSION INSERTION ---
            const insertRes = await pool.request()
                .input("employee_id", sql.VarChar(10), targetEmployeeId)
                .input("name", sql.VarChar(100), safeName)
                .input("grade", sql.VarChar(10), safeGrade)
                .input("location", sql.VarChar(100), safeLocation)
                .input("parent_customer", sql.VarChar(150), safeParentCustomer)
                .input("contact_no", sql.VarChar(20), safeContactNo)
                .input("interview_skills", sql.VarChar(sql.MAX), safeInterviewSkills)
                .input("booked_slots", sql.VarChar(sql.MAX), slotsStringified)
                .query(`
                    INSERT INTO PanelNominations (employee_id, name, grade, location, parent_customer, contact_no, interview_skills, booked_slots, created_at)
                    OUTPUT INSERTED.NominationId
                    VALUES (@employee_id, @name, @grade, @location, @parent_customer, @contact_no, @interview_skills, @booked_slots, SYSDATETIME())
                `);

            const newId = insertRes.recordset[0].NominationId;

            await pool.request()
                .input("nom_id", sql.Int, newId)
                .input("emp_id", sql.VarChar(10), targetEmployeeId)
                .input("action", sql.VarChar(20), "INSERT")
                .input("new_slots", sql.VarChar(sql.MAX), slotsStringified)
                .query(`
                    INSERT INTO PanelNominationHistory (NominationId, employee_id, ActionType, NewSlots, ModifiedAt) 
                    VALUES (@nom_id, @emp_id, @action, @new_slots, SYSDATETIME())
                `);

            return res.json({ success: true, message: "Nomination created successfully." });
        }
    } catch (err) {
        console.error("Nomination submission error:", err);
        return res.status(500).json({ success: false, error: "Failed to process nomination securely." });
    }
});

/**
 * @route   GET /api/panel/admin/nominations
 * @desc    Master feed of all submitted user nominations
 * @access  OPEN READ
 */
router.get("/admin/nominations", async (req, res) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request().query(`
            SELECT 
                NominationId,
                employee_id AS employeeId,
                name,
                grade,
                location,
                parent_customer AS parentCustomer,
                contact_no AS contactNo,
                interview_skills AS interviewSkills,
                booked_slots,
                created_at
            FROM PanelNominations 
            ORDER BY NominationId DESC
        `);
        return res.json({ success: true, data: result.recordset });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Failed to fetch global nomination feed." });
    }
});

/**
 * @route   GET /api/panel/admin/audit/:employeeId
 * @desc    Fetch deep historical logs (UPDATE actions) for a targeted employee profile
 * @access  OPEN READ
 */
router.get("/admin/audit/:employeeId", async (req, res) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request()
            .input("emp_id", sql.VarChar(10), req.params.employeeId.trim())
            .query(`
                SELECT HistoryId, NominationId, ActionType, OldSlots, NewSlots, ModifiedAt 
                FROM PanelNominationHistory 
                WHERE employee_id = @emp_id AND ActionType = 'UPDATE'
                ORDER BY ModifiedAt DESC
            `);
        return res.json({ success: true, logs: result.recordset });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Failed to fetch audit trail." });
    }
});

/**
 * @route   GET /api/panel/admin/slot-bookings
 * @desc    Fetch all nominations AND their current reservation statuses
 * @access  RESTRICTED (SA and above / Admin)
 */
router.get("/admin/slot-bookings", async (req, res) => {
    try {
        const pool = await getDbConnection();
        
        // 1. Fetch all nominations
        const nomResult = await pool.request().query(`
            SELECT NominationId, employee_id AS employeeId, name, grade, location, 
                   parent_customer AS parentCustomer, contact_no AS contactNo, 
                   interview_skills AS interviewSkills, booked_slots 
            FROM PanelNominations
        `);

        // 2. Fetch all active reservations (Now including tagged_candidates and mode)
        const resResult = await pool.request().query(`
            SELECT ReservationId, NominationId, date, time, reserved_by_id, reserved_by_name, tagged_candidates, mode 
            FROM ReservedSlots
        `);

        const reservations = resResult.recordset;
        
        const data = nomResult.recordset.map(nom => {
            const nomReservations = reservations.filter(r => r.NominationId === nom.NominationId);
            return {
                ...nom,
                reservations: nomReservations
            };
        });

        return res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: "Failed to fetch booking data." });
    }
});

// router.post("/admin/reserve", async (req, res) => {
//     // ✅ FIX 1: Destructure 'targetEmployeeId' instead of 'employeeId'
//     const { nominationId, targetEmployeeId, date, time, taggedCandidates } = req.body;
    
//     if (!req.user || !req.user.employeeId) {
//         return res.status(401).json({ success: false, message: "Unauthorized." });
//     }

//     try {
//         const pool = await getDbConnection();
        
//         const check = await pool.request()
//             .input("nom_id", sql.Int, nominationId)
//             .input("date", sql.VarChar(20), date)
//             .input("time", sql.VarChar(30), time)
//             .query("SELECT ReservationId FROM ReservedSlots WHERE NominationId = @nom_id AND date = @date AND time = @time");

//         if (check.recordset.length > 0) {
//             return res.status(400).json({ success: false, message: "Slot is already reserved." });
//         }

//         await pool.request()
//             .input("nom_id", sql.Int, nominationId)
//             // ✅ FIX 2: Pass 'targetEmployeeId' to the SQL query
//             .input("emp_id", sql.VarChar(10), targetEmployeeId) 
//             .input("date", sql.VarChar(20), date)
//             .input("time", sql.VarChar(30), time)
//             .input("res_by_id", sql.VarChar(10), req.user.employeeId)
//             .input("res_by_name", sql.VarChar(100), req.user.name || "System User")
//             .input("tagged_candidates", sql.VarChar(sql.MAX), taggedCandidates || null)
//             .query(`
//                 INSERT INTO ReservedSlots (NominationId, employee_id, date, time, reserved_by_id, reserved_by_name, tagged_candidates)
//                 VALUES (@nom_id, @emp_id, @date, @time, @res_by_id, @res_by_name, @tagged_candidates)
//             `);

//         return res.json({ success: true, message: "Slot successfully reserved." });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ success: false, message: "Failed to reserve slot." });
//     }
// });

router.post("/admin/reserve", async (req, res) => {
    // ✅ FIX: Destructure 'mode' from req.body
    const { nominationId, targetEmployeeId, date, time, taggedCandidates, mode } = req.body;
    
    if (!req.user || !req.user.employeeId) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    try {
        const pool = await getDbConnection();
        
        const check = await pool.request()
            .input("nom_id", sql.Int, nominationId)
            .input("date", sql.VarChar(20), date)
            .input("time", sql.VarChar(30), time)
            .query("SELECT ReservationId FROM ReservedSlots WHERE NominationId = @nom_id AND date = @date AND time = @time");

        if (check.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Slot is already reserved." });
        }

        await pool.request()
            .input("nom_id", sql.Int, nominationId)
            .input("emp_id", sql.VarChar(10), targetEmployeeId) 
            .input("date", sql.VarChar(20), date)
            .input("time", sql.VarChar(30), time)
            .input("res_by_id", sql.VarChar(10), req.user.employeeId)
            .input("res_by_name", sql.VarChar(100), req.user.name || "System User")
            .input("tagged_candidates", sql.VarChar(sql.MAX), taggedCandidates || null)
            // ✅ FIX: Add 'mode' to the SQL inputs
            .input("mode", sql.VarChar(50), mode || null) 
            .query(`
                INSERT INTO ReservedSlots (NominationId, employee_id, date, time, reserved_by_id, reserved_by_name, tagged_candidates, mode)
                VALUES (@nom_id, @emp_id, @date, @time, @res_by_id, @res_by_name, @tagged_candidates, @mode)
            `);

        return res.json({ success: true, message: "Slot successfully reserved." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Failed to reserve slot." });
    }
});

/**
 * @route   POST /api/panel/admin/release
 * @desc    Release a previously booked slot
 * @access  RESTRICTED
 */
router.post("/admin/release", async (req, res) => {
    const { reservationId } = req.body;

    if (!req.user || !req.user.employeeId) {
        return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    try {
        const pool = await getDbConnection();
        // 🔒 ZERO-TRUST: EVERYONE can ONLY delete their OWN reserved slots. No exceptions.
        const result = await pool.request()
            .input("res_id", sql.Int, reservationId)
            .input("emp_id", sql.VarChar(10), req.user.employeeId)
            .query("DELETE FROM ReservedSlots WHERE ReservationId = @res_id AND reserved_by_id = @emp_id");

        // Check if a row was actually deleted
        if (result.rowsAffected[0] === 0) {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: Slot not found or you do not have permission to release it." 
            });
        }
        return res.json({ success: true, message: "Slot successfully released." });
    } catch (err) {
        console.error("Failed to release slot:", err);
        return res.status(500).json({ success: false, message: "Failed to release slot securely." });
    }
});


export default router;