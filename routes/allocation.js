import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticateToken } from "../middleware/authMiddleware.js";
import * as xlsx from "xlsx"; 
import { getDbConnection } from "../db/database.js";
import sql from "mssql";

const router = express.Router();

// ✅ 1. Enforce secure JWT session parsing globally across this router
router.use(authenticateToken);

// 🔒 2. STRICT SECURITY BOUNCER: Only pure 'admin' roles can pass this point
const requireAdminOnly = (req, res, next) => {
  const role = req.user?.realRole?.toLowerCase();

  if (role === "user") {
    return res.status(403).json({
      error: "Access Denied: This API module is strictly restricted to Administrators.",
    });
  }

  next(); // User is Admin, let them through
};

// Apply the bouncer to ALL routes in this file
router.use(requireAdminOnly);

// Define the absolute path for saving the allocation reports
const UPLOAD_DIR = "C:\\GenAI Buddy\\AllocationReport";
const FILE_NAME = "MasterAllocation.xlsx";

// Ensure the target directory exists, if not, create it
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 🚀 FIX: Use Memory Storage instead of Disk Storage
// This prevents "WriteStream" OS crashes if the file is locked or open in Excel.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/* =========================================================
   UPLOAD & PROCESS ALLOCATION REPORT (Admin Only)
   Reads from RAM, parses Excel, bulk inserts to DB, then saves
========================================================= */
router.post("/upload", upload.single("allocationReport"), async (req, res) => {
  try {
    // 1. Verify the file was uploaded via Multer
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    // 2. Read and Parse the Excel File directly from RAM (Buffer)
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON array, using the first row as headers
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      return res.status(400).json({ error: "The uploaded Excel sheet is empty." });
    }

    // 3. Connect to DB and configure the Bulk Load Table
    const pool = await getDbConnection();

    // Define the table schema for Bulk Load
    const table = new sql.Table("AssociateDetails");
    table.create = false; // Set to false because the table already exists

    // Define columns matching your SQL schema exactly
    table.columns.add("AssociateID", sql.Int, { nullable: false, primary: true });
    table.columns.add("AssociateName", sql.VarChar(100), { nullable: false });
    table.columns.add("SupervisorID", sql.Int, { nullable: true });
    table.columns.add("SupervisorName", sql.VarChar(100), { nullable: true });
    table.columns.add("Grade", sql.VarChar(50), { nullable: true });
    table.columns.add("Vertical", sql.VarChar(100), { nullable: true });
    table.columns.add("Location", sql.VarChar(100), { nullable: true });
    table.columns.add("ProjectID", sql.VarChar(50), { nullable: true });
    table.columns.add("ProjectName", sql.VarChar(150), { nullable: true });
    table.columns.add("AccountName", sql.VarChar(150), { nullable: true });
    table.columns.add("Department", sql.VarChar(150), { nullable: true });

    // 4. Populate the Bulk Table with Excel Data
    // 4. Populate the Bulk Table with Excel Data
    rawData.forEach((row) => {
      // Create a normalized copy of the row keys (lowercase, no spaces)
      const cleanRow = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.replace(/\s+/g, "").toLowerCase();
        cleanRow[cleanKey] = row[key];
      });

      // Now match using completely safe, lowercase keys without worrying about spaces
      const associateId = cleanRow["associateid"] ? parseInt(cleanRow["associateid"], 10) : null;

      // Skip row if there is no Associate ID
      if (!associateId) return;

      table.rows.add(
        associateId,
        cleanRow["associatename"] || "Unknown",
        cleanRow["hcmsupervisorid"] ? parseInt(cleanRow["hcmsupervisorid"], 10) : null,
        cleanRow["supervisorname"] || null,
        cleanRow["grade"] || null,
        cleanRow["vertical"] || null,
        cleanRow["location"] || null,
        cleanRow["projectid"] ? String(cleanRow["projectid"]) : null,   // 🟢 Bulletproof Match
        cleanRow["projectname"] || null,                               // 🟢 Bulletproof Match
        cleanRow["accountname"] || cleanRow["accountname"] || null,
        cleanRow["finalmisdepartment"] || null
      );
    });

    // 5. Database Execution
    await pool.request().query("TRUNCATE TABLE AssociateDetails");
    const result = await pool.request().bulk(table);

    // 6. ✅ ONLY save the file to disk AFTER a successful DB sync
    // This guarantees a broken upload won't overwrite your master file
    const filePath = path.join(UPLOAD_DIR, FILE_NAME);
    fs.writeFileSync(filePath, req.file.buffer);

    // 7. Return single unified success response
    return res.status(200).json({
      message: "Allocation report uploaded and data successfully synced to the database.",
      filePath: filePath,
      recordsProcessed: result.rowsAffected,
    });

  } catch (err) {
    console.error("Error processing allocation data:", err);
    return res.status(500).json({
      error: "Failed to process and save the Excel data.",
      details: err.message,
    });
  }
});

/* =========================================================
   DOWNLOAD ALLOCATION REPORT (Admin Only)
========================================================= */
router.get("/download", async (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, FILE_NAME);

    // Check if the file actually exists before trying to send it
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "No allocation report found. Please upload it first.",
      });
    }

    // res.download automatically sets the right headers and streams the file
    res.download(filePath, FILE_NAME, (err) => {
      if (err) {
        console.error("Error sending allocation report to client:", err);
      }
    });
  } catch (err) {
    console.error("Error fetching allocation report:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;