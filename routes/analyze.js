import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { analyzeDataset, categorizeRecord, CATEGORIES } from "../engine/categorizer.js";
import { fileURLToPath } from "url";

const router = express.Router();

// __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- FILE UPLOAD CONFIG ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    [".csv", ".xlsx", ".xls"].includes(ext)
      ? cb(null, true)
      : cb(new Error("Only CSV and Excel files allowed"));
  }
});

// ---------------- UTILITIES ----------------
function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".csv") {
    return parse(fs.readFileSync(filePath), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  }

  const wb = XLSX.readFile(filePath);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    defval: ""
  });
}

// In-memory store
const resultsStore = {};

// ---------------- ROUTES ----------------
router.post("/analyze", upload.single("file"), (req, res) => {
  try {
    const records = parseFile(req.file.path, req.file.originalname);
    fs.unlinkSync(req.file.path);

    const textFields = req.body.textFields
      ? JSON.parse(req.body.textFields)
      : Object.keys(records[0]);

    const results = analyzeDataset(records, textFields);
    const id = uuidv4();

    resultsStore[id] = { id, ...results };

    res.json({
      id,
      filename: req.file.originalname,
      totalRecords: records.length,
      ...results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/analyze/text", (req, res) => {
  const result = categorizeRecord(
    { description: req.body.text },
    ["description"]
  );
  res.json(result);
});

router.get("/results/:id", (req, res) => {
  const result = resultsStore[req.params.id];
  result ? res.json(result) : res.status(404).json({ error: "Not found" });
});

router.get("/categories", (req, res) => {
  res.json(Object.values(CATEGORIES));
});

export default router;