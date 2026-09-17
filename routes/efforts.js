import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { getDbConnection, sql } from "../db/database.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  evaluateGaugeDatePolicy,
  parseIsoCalendarDate,
  sqlDateToIso,
} from "../services/gaugePolicy.js";

const router = express.Router();

const gaugeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isExcel =
      /\.(xlsx|xls)$/i.test(file.originalname || "") &&
      [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/octet-stream",
      ].includes(file.mimetype);
    callback(
      isExcel ? null : new Error("Only .xlsx or .xls Gauge files are allowed."),
      isExcel,
    );
  },
});

// ✅ Enforce authentication on ALL gauge routes
router.use(authenticateToken);

/* =========================================
   HARDCODED BUSINESS RULES & MAPPINGS
========================================= */

const VALID_STAGES_AND_ACTIVITIES = {
  "Business Requirements": [
    "Business case generation from historical cases",
    "Business Requirement generation from call transcripts",
    "Feasibility Analysis during requirement phase",
    "Functional & Non-Functional Requirements",
    "Project plan according to requirements",
  ],
  "Code & Build": [
    "Code conversion/migration",
    "Code documentation",
    "Code Generation",
    "Code Q&A",
    "Code refactoring",
    "Code Review",
    "Code Security Assessment & fix-OWAS & NIST",
    "Intelligent generation of commit messages",
    "Intelligent management of branch lifecycle",
    "Unit Test cases",
  ],
  Design: [
    "Auto generation of architecture document and flowcharts-Limited (Cloud Specific AWS, Azure)",
    "Auto generation of html from paper sketch",
    "Auto Generation of Personas",
    "Auto Generation of User Stories",
    "Creating research artifacts",
    "GenAl enabled Risk & feasibility analysis for User stories",
    "Intelligent planning of branch policies",
    "Rapid conceptual Prototype-build",
  ],
  "Test & Review": [
    "Al Code review in IDE and PR/M",
    "Auto remediation and CR Comments",
    "Code generation based on testcases",
    "Complex Boundary Value Analysis and Edge Case",
    "Enabling Performance Testing framework",
    "Functional testcase generation",
    "Synthetic Data generation",
    "Test data generation (SIT and Performance testing)",
  ],
  "Deploy & Hypercare": [
    "Al Assist for Troubleshotting- Correlating alerts",
    "Auto-configuration checks of environment parameters",
    "Automated blue-green or canary deployments",
    "Automatic remediation of production faults",
    "Dialogue based diagnosis",
    "GenAl enabled Roll back strategy for each release",
    "Incident writeups for ticket creation & RCA",
    "Intelligent generation of pipeline & Infra",
    "Ticket Analysis",
  ],
  "Domain or Business Use Case": ["Domain or Business Use Case"],
  Other: [],
};

// Maps the incoming stage to the correct DB column name dynamically
const STAGE_COLUMN_MAP = {
  "Business Requirements": "business_requirements_activity",
  "Code & Build": "code_build_activity",
  Design: "design_activity",
  "Test & Review": "test_review_activity",
  "Deploy & Hypercare": "deploy_hypercare_activity",
  "Domain or Business Use Case": "domain_usecase_activity",
  Other: "other_activity",
};

const ACTIVITY_COLUMNS = Object.values(STAGE_COLUMN_MAP);

function currentRole(req) {
  return String(req.user?.realRole || "").trim().toLowerCase();
}

function isStrictAdmin(req) {
  return currentRole(req) === "admin";
}

function applyDatePolicyOrRespond(
  req,
  res,
  targetDate,
  operation,
  adminOverride = isStrictAdmin(req),
) {
  const policy = evaluateGaugeDatePolicy({
    targetDate,
    operation,
    isAdmin: adminOverride,
  });
  if (!policy.allowed) {
    res.status(400).json({ error: policy.reason, code: policy.code });
    return false;
  }
  return true;
}

function sanitizeActivityFields(data) {
  if (data.is_on_leave === "Yes") {
    for (const column of ACTIVITY_COLUMNS) data[column] = null;
    data.stage = null;
    return;
  }

  const selectedColumn = STAGE_COLUMN_MAP[data.stage];
  for (const column of ACTIVITY_COLUMNS) {
    if (column !== selectedColumn) data[column] = null;
  }
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeYesNo(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "yes") return "Yes";
  if (normalized === "no") return "No";
  return null;
}

function normalizeStage(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.toLowerCase() === "others") return "Other";

  return (
    Object.keys(VALID_STAGES_AND_ACTIVITIES).find(
      (stage) => stage.toLowerCase() === raw.toLowerCase(),
    ) || raw
  );
}

function buildBulkExclusionReport(errors, normalizedRows) {
  const grouped = new Map();
  for (const error of errors) {
    if (!grouped.has(error.row)) {
      grouped.set(error.row, { columns: new Set(), reasons: [] });
    }
    const item = grouped.get(error.row);
    if (error.column) item.columns.add(error.column);
    if (!item.reasons.includes(error.message)) item.reasons.push(error.message);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([rowNumber, details]) => {
      const source = normalizedRows[rowNumber - 2] || {};
      return {
        excelRow: rowNumber,
        sourceId: source.Id ?? source.ID ?? null,
        employeeId: String(source["Employee ID"] ?? "").trim(),
        employeeName: String(source.Name ?? "").trim(),
        date: excelDateToIso(source.Date) || String(source.Date ?? ""),
        stage: normalizeStage(source.Stage) || String(source.Stage ?? ""),
        columns: Array.from(details.columns).join(", "),
        reasons: details.reasons.join("; "),
      };
    });
}

function excelDateToIso(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  const raw = String(value || "").trim();
  if (parseIsoCalendarDate(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) return null;
  const iso = `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return parseIsoCalendarDate(iso) ? iso : null;
}

function excelDateTimeToDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(
      Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H || 0,
        parsed.M || 0,
        Math.floor(parsed.S || 0),
      ),
    );
  }
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function gaugeBusinessSignature(data, employeeId) {
  return JSON.stringify([
    String(employeeId || "").trim(),
    data.date,
    data.is_on_leave,
    data.stage,
    ...ACTIVITY_COLUMNS.map((column) => data[column] ?? null),
    data.has_ghcp_license ?? null,
    data.using_genai_tools ?? null,
    data.which_genai_tool ?? null,
    nullableNumber(data.items_with_genai_tools),
    nullableNumber(data.hours_with_genai_tools),
    nullableNumber(data.items_without_genai_tools),
    nullableNumber(data.hours_without_genai_tools),
  ]);
}

/* =========================================
   HELPER: SHARED BUSINESS LOGIC VALIDATOR
========================================= */
async function validateEffortBusinessLogic(
  pool,
  data,
  targetEmployeeId,
  editGaugeId = null,
  pendingDayRecords = [],
  options = {},
) {
  const errs = [];

  // --- 1. DATE VALIDATIONS (Current Month Freeze, 15-Day Limit & Future Date Check) ---
  // ✅ Force Node to construct the date in the local timezone directly
  if (!parseIsoCalendarDate(data.date)) {
    errs.push("A valid Gauge date in YYYY-MM-DD format is required.");
    return errs;
  }

  // --- 2. STRICT LEAVE ENFORCEMENT & PAYLOAD SANITIZATION ---
  if (data.is_on_leave !== "Yes" && data.is_on_leave !== "No") {
    errs.push("is_on_leave must be strictly 'Yes' or 'No'.");
    return errs; // Stop here if core status is missing/invalid
  }

  if (data.is_on_leave === "Yes") {
    // SECURITY: Force clear all work data so API bypassers can't log "Dirty Leave"
    data.stage = null;
    data.business_requirements_activity = null;
    data.code_build_activity = null;
    data.design_activity = null;
    data.test_review_activity = null;
    data.deploy_hypercare_activity = null;
    data.domain_usecase_activity = null;
    data.other_activity = null;
    data.using_genai_tools = null;
    data.which_genai_tool = null;
    data.has_ghcp_license = null;
    data.items_with_genai_tools = null;
    data.hours_with_genai_tools = null;
    data.items_without_genai_tools = null;
    data.hours_without_genai_tools = null;
  }

  // --- 3. WORK DATA VALIDATION ---
  const withItems = Number(data.items_with_genai_tools);
  const withHours = Number(data.hours_with_genai_tools);
  const withoutItems = Number(data.items_without_genai_tools);
  const withoutHours = Number(data.hours_without_genai_tools);

  if (data.is_on_leave === "No") {
    if (
      data.using_genai_tools !== "Yes" &&
      data.using_genai_tools !== "No"
    ) {
      errs.push("using_genai_tools must be strictly 'Yes' or 'No'.");
    }

    const allowedActivities = VALID_STAGES_AND_ACTIVITIES[data.stage];
    const activityColumnName = STAGE_COLUMN_MAP[data.stage];
    const submittedActivity = data[activityColumnName];

    if (!allowedActivities || !activityColumnName) {
      errs.push(`Invalid stage provided: ${data.stage}`);
    } else if (data.stage !== "Other") {
      if (!allowedActivities.includes(submittedActivity)) {
        errs.push(
          `Invalid activity '${submittedActivity}' for the stage '${data.stage}'.`,
        );
      }
    } else if (data.stage === "Other") {
      // ✅ NEW: Prevent empty descriptions and enforce the 200-character database limit
      if (!data.other_activity || data.other_activity.trim() === "") {
        errs.push(
          "You must provide an activity description when selecting 'Other'.",
        );
      } else if (data.other_activity.length > 200) {
        errs.push(
          `The custom activity description cannot exceed 200 characters. You entered ${data.other_activity.length} characters.`,
        );
      }
    }

    // --- GenAI Tools & License Validation ---
    if (data.using_genai_tools === "Yes") {
      const ALLOWED_TOOLS = [
        "GHCP Licence",
        "Copilot Assist M365",
        "Other Tool",
      ];

      if (
        !Array.isArray(data.selected_genai_tools) ||
        data.selected_genai_tools.length === 0
      ) {
        errs.push("You must select at least one GenAI tool.");
      } else {
        let hasOtherTool = false;
        let formattedToolsToSave = [];

        data.selected_genai_tools.forEach((tool) => {
          if (!ALLOWED_TOOLS.includes(tool)) {
            errs.push(`Invalid GenAI tool selected: ${tool}`);
          }
          if (tool === "Other Tool") hasOtherTool = true;
          else formattedToolsToSave.push(tool);
        });

        if (hasOtherTool) {
          if (
            !data.specify_other_tool ||
            data.specify_other_tool.trim() === ""
          ) {
            errs.push(
              "You selected 'Other Tool' but did not specify the tool name.",
            );
          } else {
            formattedToolsToSave.push(
              `Other: ${data.specify_other_tool.trim()}`,
            );
          }
        }

        data.which_genai_tool = formattedToolsToSave.join(", ");
        if (data.which_genai_tool.length > 100) {
          errs.push(
            "The combined length of selected GenAI tools exceeds database limits (100 chars).",
          );
        }
      }

      if (data.has_ghcp_license !== "Yes" && data.has_ghcp_license !== "No") {
        errs.push(
          "You must declare whether you have an official license ('Yes' or 'No').",
        );
      }

      // SECURITY: Added isNaN checks, kept original > 0 and >= 0.1 bounds
      if (!Number.isFinite(withItems) || withItems <= 0)
        errs.push("Number of items with GenAI must be a positive number.");
      if (isNaN(withHours) || withHours < 0.1 || withHours > 12)
        errs.push("GenAI hours must be between 0.1 and 12.");
      if (withItems > withoutItems)
        errs.push(
          "GenAI items cannot be greater than the Total Estimated items.",
        );
    } else {
      data.which_genai_tool = null;
      if (!options.preserveLicenseWhenUnused) data.has_ghcp_license = null;
    }

    // SECURITY: Added isNaN checks, kept original > 0 and >= 0.1 bounds
    if (!Number.isFinite(withoutItems) || withoutItems <= 0)
      errs.push("Total Estimated items must be a positive number.");
    if (isNaN(withoutHours) || withoutHours < 0.1 || withoutHours > 12)
      errs.push("Total Manual hours must be between 0.1 and 12.");
  }

  // --- 4. Fetch Existing DB Records ---
  const dayRecords = await pool
    .request()
    .input("empId", sql.VarChar(10), targetEmployeeId)
    .input("dt", sql.Date, data.date).query(`
      SELECT *
      FROM Gauge 
      WHERE employee_id = @empId AND [date] = @dt
    `);

  let existingHours = 0;
  let hasLeave = false;
  let hasWork = false;

  const matchingPendingRecords = pendingDayRecords.filter(
    (record) =>
      String(record.employee_id || "").trim() ===
        String(targetEmployeeId || "").trim() &&
      String(record.date || "") === data.date,
  );

  [...dayRecords.recordset, ...matchingPendingRecords].forEach((r) => {
    if (editGaugeId && r.gauge_id === editGaugeId) return;

    if (r.is_on_leave === "Yes") hasLeave = true;
    if (r.is_on_leave === "No") hasWork = true;

    const isAI = r.using_genai_tools === "Yes";
    const hrs = isAI
      ? Number(r.hours_with_genai_tools || 0)
      : Number(r.hours_without_genai_tools || 0);
    existingHours += hrs;
  });

  // --- 5. Leave Collision Logic ---
  if (data.is_on_leave === "Yes" && hasWork) {
    errs.push(
      "You cannot log leave for a day that already has work effort logged.",
    );
  }
  if (data.is_on_leave === "No" && hasLeave) {
    errs.push("You were on leave. You cannot submit work effort for this day.");
  }
  if (data.is_on_leave === "Yes" && hasLeave) {
    errs.push("Leave is already logged for this date.");
  }

  // --- 6. Max 12-Hour Limit Logic ---
  if (data.is_on_leave === "No") {
    const currentActualHours =
      data.using_genai_tools === "Yes" ? withHours : withoutHours;
    if (existingHours + currentActualHours > 12) {
      errs.push(
        `Total logged effort for a single day cannot exceed 12 hours. You already have ${existingHours} hours logged for this date.`,
      );
    }
  }

  return errs;
}
/* =========================================
   GET STAGES AND ACTIVITIES LIST
========================================= */
router.get("/stages-activities", (req, res) => {
  res.status(200).json(VALID_STAGES_AND_ACTIVITIES);
});

/* =========================================
   ADMIN BULK GAUGE UPLOAD
========================================= */
router.post(
  "/gauge-bulk-upload",
  (req, res, next) => {
    if (!isStrictAdmin(req)) {
      return res.status(403).json({
        error: "Only administrators can upload Gauge data.",
      });
    }

    gaugeUpload.single("gaugeFile")(req, res, (error) => {
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Select a Gauge Excel file." });
    }

    try {
      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        return res.status(400).json({ error: "The workbook has no worksheet." });
      }

      const rawRows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: null,
        raw: true,
      });
      if (rawRows.length === 0) {
        return res.status(400).json({ error: "The Gauge worksheet has no data rows." });
      }

      const normalizedRows = rawRows.map((rawRow) =>
        Object.fromEntries(
          Object.entries(rawRow).map(([header, value]) => [
            normalizeHeader(header),
            value,
          ]),
        ),
      );

      const requiredHeaders = [
        "Employee ID",
        "Date",
        "Are you on Leave?",
        "Stage",
        "Business Requirements- Activity",
        "Code & Build- Activity",
        "Design- Activity",
        "Test & Review- Activity",
        "Deploy & Hypercare- Activity",
        "Domain or Business Use Case- Activity",
        "Other Activity",
        "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?",
        "Total Number of Planned items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.)",
        "Estimated Manual Hours",
        "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) Delivered Through GenAI Out of Total Estimated Items",
        "Actual Hours",
      ];
      const availableHeaders = new Set(
        Object.keys(normalizedRows[0]).map(normalizeHeader),
      );
      const missingHeaders = requiredHeaders.filter(
        (header) => !availableHeaders.has(header),
      );
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          error: "The Gauge workbook format is invalid.",
          errors: missingHeaders.map((header) => ({
            row: 1,
            column: header,
            message: "Required column is missing.",
          })),
        });
      }

      const pool = await getDbConnection();
      const validatedRows = [];
      const pendingRows = [];
      const fileSignatures = new Set();
      const errors = [];

      for (let index = 0; index < normalizedRows.length; index += 1) {
        const rowNumber = index + 2;
        const row = normalizedRows[index];
        const employeeId = String(row["Employee ID"] ?? "").trim();
        const email = String(row.Email || "").trim();
        const name = String(row.Name || "").trim();
        const date = excelDateToIso(row.Date);
        const leave = normalizeYesNo(row["Are you on Leave?"]);
        const licenseAnswer = normalizeYesNo(
          row[
            "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?"
          ],
        );
        const genAiItems = nullableNumber(
          row[
            "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) Delivered Through GenAI Out of Total Estimated Items"
          ],
        );
        const genAiHours = nullableNumber(row["Actual Hours"]);
        const hasGenAiDelivery =
          Number(genAiItems || 0) > 0 || Number(genAiHours || 0) > 0;

        const rowErrors = [];
        if (!employeeId || employeeId.length > 10) {
          rowErrors.push({
            column: "Employee ID",
            message: "Employee ID is required and cannot exceed 10 characters.",
          });
        }
        if (email.length > 100) {
          rowErrors.push({
            column: "Email",
            message: "Email cannot exceed 100 characters.",
          });
        }
        if (name.length > 100) {
          rowErrors.push({
            column: "Name",
            message: "Name cannot exceed 100 characters.",
          });
        }
        if (!date) {
          rowErrors.push({
            column: "Date",
            message: "Date must contain a valid Excel or calendar date.",
          });
        }
        if (!leave) {
          rowErrors.push({
            column: "Are you on Leave?",
            message: "Value must be Yes or No.",
          });
        }
        if (leave === "No" && !licenseAnswer) {
          rowErrors.push({
            column:
              "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?",
            message: "Value must be Yes or No for a work entry.",
          });
        }
        if (hasGenAiDelivery && licenseAnswer !== "Yes") {
          rowErrors.push({
            column:
              "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?",
            message: "Positive GenAI delivery metrics require a Yes tool/license answer.",
          });
        }

        const startTimeValue = row["Start time"];
        const startTime = excelDateTimeToDate(startTimeValue);
        if (startTimeValue && !startTime) {
          rowErrors.push({
            column: "Start time",
            message: "Start time is not a valid Excel date/time.",
          });
        }

        if (rowErrors.length > 0) {
          errors.push(
            ...rowErrors.map((error) => ({ row: rowNumber, ...error })),
          );
          continue;
        }

        const data = {
          start_time: startTime,
          email: email || null,
          name: name || null,
          employee_id: employeeId,
          date,
          is_on_leave: leave,
          stage: normalizeStage(row.Stage),
          business_requirements_activity:
            String(row["Business Requirements- Activity"] || "").trim() ||
            null,
          code_build_activity:
            String(row["Code & Build- Activity"] || "").trim() || null,
          design_activity:
            String(row["Design- Activity"] || "").trim() || null,
          test_review_activity:
            String(row["Test & Review- Activity"] || "").trim() || null,
          deploy_hypercare_activity:
            String(row["Deploy & Hypercare- Activity"] || "").trim() || null,
          domain_usecase_activity:
            String(
              row["Domain or Business Use Case- Activity"] || "",
            ).trim() || null,
          other_activity: String(row["Other Activity"] || "").trim() || null,
          has_ghcp_license: licenseAnswer,
          using_genai_tools: hasGenAiDelivery ? "Yes" : "No",
          selected_genai_tools: hasGenAiDelivery ? ["GHCP Licence"] : [],
          specify_other_tool: null,
          which_genai_tool: hasGenAiDelivery ? "GHCP Licence" : null,
          items_without_genai_tools: nullableNumber(
            row[
              "Total Number of Planned items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.)"
            ],
          ),
          hours_without_genai_tools: nullableNumber(
            row["Estimated Manual Hours"],
          ),
          items_with_genai_tools: hasGenAiDelivery ? genAiItems : null,
          hours_with_genai_tools: hasGenAiDelivery ? genAiHours : null,
        };

        const datePolicy = evaluateGaugeDatePolicy({
          targetDate: data.date,
          operation: "create",
          isAdmin: true,
        });
        if (!datePolicy.allowed) {
          errors.push({
            row: rowNumber,
            column: "Date",
            message: datePolicy.reason,
          });
          continue;
        }

        sanitizeActivityFields(data);
        const validationErrors = await validateEffortBusinessLogic(
          pool,
          data,
          employeeId,
          null,
          pendingRows,
          { preserveLicenseWhenUnused: true },
        );
        if (validationErrors.length > 0) {
          errors.push(
            ...validationErrors.map((message) => ({
              row: rowNumber,
              column: null,
              message,
            })),
          );
          continue;
        }

        const signature = gaugeBusinessSignature(data, employeeId);
        if (fileSignatures.has(signature)) {
          errors.push({
            row: rowNumber,
            column: null,
            message: "This row duplicates another row in the uploaded file.",
          });
          continue;
        }

        const existingRows = await pool
          .request()
          .input("employeeId", sql.VarChar(10), employeeId)
          .input("date", sql.Date, date)
          .query(
            "SELECT * FROM Gauge WHERE employee_id = @employeeId AND [date] = @date",
          );
        const duplicatesDatabaseRow = existingRows.recordset.some((record) =>
          gaugeBusinessSignature(
            { ...record, date: sqlDateToIso(record.date) },
            record.employee_id,
          ) === signature,
        );
        if (duplicatesDatabaseRow) {
          errors.push({
            row: rowNumber,
            column: null,
            message: "This Gauge entry already exists in the database.",
          });
          continue;
        }

        fileSignatures.add(signature);
        validatedRows.push(data);
        pendingRows.push(data);
      }

      const exclusions = buildBulkExclusionReport(errors, normalizedRows);
      if (validatedRows.length === 0) {
        return res.status(400).json({
          error: "No valid Gauge rows were found. No rows were inserted.",
          insertedCount: 0,
          excludedCount: exclusions.length,
          exclusions,
        });
      }

      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        for (const data of validatedRows) {
          await new sql.Request(transaction)
            .input("start_time", sql.DateTime, data.start_time || null)
            .input("email", sql.VarChar(100), data.email || null)
            .input("name", sql.VarChar(100), data.name || null)
            .input("employee_id", sql.VarChar(10), data.employee_id)
            .input("date", sql.Date, data.date)
            .input("is_on_leave", sql.VarChar(10), data.is_on_leave)
            .input("stage", sql.VarChar(100), data.stage || null)
            .input(
              "business_requirements_activity",
              sql.VarChar(200),
              data.business_requirements_activity || null,
            )
            .input(
              "code_build_activity",
              sql.VarChar(200),
              data.code_build_activity || null,
            )
            .input(
              "design_activity",
              sql.VarChar(200),
              data.design_activity || null,
            )
            .input(
              "test_review_activity",
              sql.VarChar(200),
              data.test_review_activity || null,
            )
            .input(
              "deploy_hypercare_activity",
              sql.VarChar(200),
              data.deploy_hypercare_activity || null,
            )
            .input(
              "domain_usecase_activity",
              sql.VarChar(200),
              data.domain_usecase_activity || null,
            )
            .input(
              "other_activity",
              sql.VarChar(200),
              data.other_activity || null,
            )
            .input(
              "has_ghcp_license",
              sql.VarChar(10),
              data.has_ghcp_license || null,
            )
            .input(
              "using_genai_tools",
              sql.VarChar(10),
              data.using_genai_tools || null,
            )
            .input(
              "which_genai_tool",
              sql.VarChar(100),
              data.which_genai_tool || null,
            )
            .input(
              "items_with_genai_tools",
              sql.Float,
              data.items_with_genai_tools,
            )
            .input(
              "hours_with_genai_tools",
              sql.Float,
              data.hours_with_genai_tools,
            )
            .input(
              "items_without_genai_tools",
              sql.Float,
              data.items_without_genai_tools,
            )
            .input(
              "hours_without_genai_tools",
              sql.Float,
              data.hours_without_genai_tools,
            ).query(`
              INSERT INTO Gauge (
                start_time, email, name, employee_id, [date], is_on_leave,
                stage, business_requirements_activity, code_build_activity,
                design_activity, test_review_activity, deploy_hypercare_activity,
                domain_usecase_activity, other_activity, has_ghcp_license,
                using_genai_tools, which_genai_tool, items_with_genai_tools,
                hours_with_genai_tools, items_without_genai_tools,
                hours_without_genai_tools
              )
              VALUES (
                @start_time, @email, @name, @employee_id, @date, @is_on_leave,
                @stage, @business_requirements_activity, @code_build_activity,
                @design_activity, @test_review_activity,
                @deploy_hypercare_activity, @domain_usecase_activity,
                @other_activity, @has_ghcp_license, @using_genai_tools,
                @which_genai_tool, @items_with_genai_tools,
                @hours_with_genai_tools, @items_without_genai_tools,
                @hours_without_genai_tools
              )
            `);
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      return res.status(201).json({
        success: true,
        insertedCount: validatedRows.length,
        excludedCount: exclusions.length,
        exclusions,
        message:
          exclusions.length > 0
            ? `${validatedRows.length} Gauge record(s) uploaded; ${exclusions.length} invalid record(s) excluded.`
            : `${validatedRows.length} Gauge record(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error("Gauge bulk upload failed:", error);
      return res.status(500).json({
        error: "Failed to process the Gauge workbook. No rows were inserted.",
      });
    }
  },
);

/* =========================================
   CREATE (POST)
========================================= */
router.post("/", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const data = req.body;

    if (!req.user || !req.user.employeeId) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Valid token required." });
    }

    const currentRole = req.user?.realRole?.toLowerCase();
    const isPrivileged = currentRole === "admin";

    let targetEmployeeId = req.user.employeeId;
    if (isPrivileged && data.employee_id) {
      targetEmployeeId = data.employee_id;
    }

    if (!targetEmployeeId || !data.date) {
      return res
        .status(400)
        .json({ error: "Employee ID and Date are required." });
    }

    if (!applyDatePolicyOrRespond(req, res, data.date, "create")) return;
    sanitizeActivityFields(data);

    const validationErrors = await validateEffortBusinessLogic(
      pool,
      data,
      targetEmployeeId,
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    const result = await pool
      .request()
      .input("start_time", sql.DateTime, data.start_time || null)
      .input("employee_id", sql.VarChar(10), targetEmployeeId)
      .input("date", sql.Date, data.date)
      .input("is_on_leave", sql.VarChar(10), data.is_on_leave || null)
      .input("stage", sql.VarChar(100), data.stage || null)
      .input(
        "business_requirements_activity",
        sql.VarChar(200),
        data.business_requirements_activity || null,
      )
      .input(
        "code_build_activity",
        sql.VarChar(200),
        data.code_build_activity || null,
      )
      .input("design_activity", sql.VarChar(200), data.design_activity || null)
      .input(
        "test_review_activity",
        sql.VarChar(200),
        data.test_review_activity || null,
      )
      .input(
        "deploy_hypercare_activity",
        sql.VarChar(200),
        data.deploy_hypercare_activity || null,
      )
      .input(
        "domain_usecase_activity",
        sql.VarChar(200),
        data.domain_usecase_activity || null,
      )
      .input("other_activity", sql.VarChar(200), data.other_activity || null)
      .input("has_ghcp_license", sql.VarChar(10), data.has_ghcp_license || null)
      .input(
        "using_genai_tools",
        sql.VarChar(10),
        data.using_genai_tools || null,
      )
      .input(
        "which_genai_tool",
        sql.VarChar(100),
        data.which_genai_tool || null,
      )
      .input(
        "items_with_genai_tools",
        sql.Float,
        data.items_with_genai_tools || null,
      )
      .input(
        "hours_with_genai_tools",
        sql.Float,
        data.hours_with_genai_tools || null,
      )
      .input(
        "items_without_genai_tools",
        sql.Float,
        data.items_without_genai_tools || null,
      )
      .input(
        "hours_without_genai_tools",
        sql.Float,
        data.hours_without_genai_tools || null,
      ).query(`
        INSERT INTO Gauge (
          start_time, employee_id, [date], is_on_leave, stage,
          business_requirements_activity, code_build_activity, design_activity,
          test_review_activity, deploy_hypercare_activity, domain_usecase_activity, other_activity,
          has_ghcp_license, using_genai_tools, which_genai_tool,
          items_with_genai_tools, hours_with_genai_tools,
          items_without_genai_tools, hours_without_genai_tools
        )
        OUTPUT INSERTED.gauge_id
        VALUES (
          @start_time, @employee_id, @date, @is_on_leave, @stage,
          @business_requirements_activity, @code_build_activity, @design_activity,
          @test_review_activity, @deploy_hypercare_activity, @domain_usecase_activity, @other_activity,
          @has_ghcp_license, @using_genai_tools, @which_genai_tool,
          @items_with_genai_tools, @hours_with_genai_tools,
          @items_without_genai_tools, @hours_without_genai_tools
        )
      `);

    res
      .status(201)
      .json({ success: true, gauge_id: result.recordset[0].gauge_id });
  } catch (err) {
    console.error("Gauge create failed:", err);
    res.status(500).json({ error: "Failed to create record." });
  }
});

/* =========================================
   UPDATE (PUT) - SECURE PARTIAL UPDATE
========================================= */
router.put("/:id", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const gaugeId = Number(req.params.id);
    const data = req.body;
    const request = pool.request();

    if (!Number.isInteger(gaugeId)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    if (!req.user || !req.user.employeeId) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Valid token required." });
    }

    const currentRole = req.user?.realRole?.toLowerCase();
    const isPrivileged = currentRole === "admin";

    // 1. Fetch the COMPLETE existing record
    const ownershipCheck = await request
      .input("checkId", sql.Int, gaugeId)
      .query("SELECT * FROM Gauge WHERE gauge_id = @checkId");

    if (ownershipCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Record not found." });
    }

    const existingRecord = ownershipCheck.recordset[0];

    if (!isPrivileged && existingRecord.employee_id !== req.user.employeeId) {
      return res.status(403).json({
        error: "Access Denied: You cannot modify someone else's record.",
      });
    }

    const existingDate = sqlDateToIso(existingRecord.date);
    if (
      !applyDatePolicyOrRespond(
        req,
        res,
        existingDate,
        "update",
        isPrivileged,
      )
    ) {
      return;
    }

    // 2. Reconstruct the GenAI tools array so it passes the validator smoothly
    let selectedTools = [];
    let otherToolName = null;
    if (existingRecord.which_genai_tool) {
      const tools = existingRecord.which_genai_tool
        .split(",")
        .map((s) => s.trim());
      tools.forEach((t) => {
        if (t.startsWith("Other:")) {
          selectedTools.push("Other Tool");
          otherToolName = t.replace("Other:", "").trim();
        } else {
          selectedTools.push(t);
        }
      });
    }
    const fromRequestOrExisting = (field) =>
      data[field] !== undefined ? data[field] : existingRecord[field];

    // Merge the complete editable form payload while keeping ownership immutable.
    const mergedData = {
      date: data.date !== undefined ? data.date : existingDate,
      is_on_leave: fromRequestOrExisting("is_on_leave"),
      stage: fromRequestOrExisting("stage"),
      business_requirements_activity: fromRequestOrExisting(
        "business_requirements_activity",
      ),
      code_build_activity: fromRequestOrExisting("code_build_activity"),
      design_activity: fromRequestOrExisting("design_activity"),
      test_review_activity: fromRequestOrExisting("test_review_activity"),
      deploy_hypercare_activity: fromRequestOrExisting(
        "deploy_hypercare_activity",
      ),
      domain_usecase_activity: fromRequestOrExisting(
        "domain_usecase_activity",
      ),
      other_activity: fromRequestOrExisting("other_activity"),
      using_genai_tools: fromRequestOrExisting("using_genai_tools"),
      has_ghcp_license: fromRequestOrExisting("has_ghcp_license"),
      selected_genai_tools:
        data.selected_genai_tools !== undefined
          ? data.selected_genai_tools
          : selectedTools,
      specify_other_tool:
        data.specify_other_tool !== undefined
          ? data.specify_other_tool
          : otherToolName,
      items_with_genai_tools: fromRequestOrExisting(
        "items_with_genai_tools",
      ),
      hours_with_genai_tools: fromRequestOrExisting(
        "hours_with_genai_tools",
      ),
      items_without_genai_tools: fromRequestOrExisting(
        "items_without_genai_tools",
      ),
      hours_without_genai_tools: fromRequestOrExisting(
        "hours_without_genai_tools",
      ),
    };

    if (
      mergedData.date !== existingDate &&
      !applyDatePolicyOrRespond(
        req,
        res,
        mergedData.date,
        "create",
        isPrivileged,
      )
    ) {
      return;
    }

    sanitizeActivityFields(mergedData);

    // 4. Validate the merged data
    const validationErrors = await validateEffortBusinessLogic(
      pool,
      mergedData,
      existingRecord.employee_id,
      gaugeId,
    );
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    let updateQuery = `
        UPDATE Gauge SET
          start_time = GETDATE(),
          [date] = @date,
          is_on_leave = @is_on_leave,
          stage = @stage,
          business_requirements_activity = @business_requirements_activity,
          code_build_activity = @code_build_activity,
          design_activity = @design_activity,
          test_review_activity = @test_review_activity,
          deploy_hypercare_activity = @deploy_hypercare_activity,
          domain_usecase_activity = @domain_usecase_activity,
          other_activity = @other_activity,
          using_genai_tools = @using_genai_tools,
          which_genai_tool = @which_genai_tool,
          has_ghcp_license = @has_ghcp_license,
          items_with_genai_tools = @items_with_genai_tools,
          hours_with_genai_tools = @hours_with_genai_tools,
          items_without_genai_tools = @items_without_genai_tools,
          hours_without_genai_tools = @hours_without_genai_tools
        OUTPUT INSERTED.*
        WHERE gauge_id = @gauge_id
    `;

    const updateResult = await pool
      .request()
      .input("gauge_id", sql.Int, gaugeId)
      .input("date", sql.Date, mergedData.date)
      .input("is_on_leave", sql.VarChar(10), mergedData.is_on_leave)
      .input("stage", sql.VarChar(100), mergedData.stage || null)
      .input(
        "business_requirements_activity",
        sql.VarChar(200),
        mergedData.business_requirements_activity || null,
      )
      .input(
        "code_build_activity",
        sql.VarChar(200),
        mergedData.code_build_activity || null,
      )
      .input(
        "design_activity",
        sql.VarChar(200),
        mergedData.design_activity || null,
      )
      .input(
        "test_review_activity",
        sql.VarChar(200),
        mergedData.test_review_activity || null,
      )
      .input(
        "deploy_hypercare_activity",
        sql.VarChar(200),
        mergedData.deploy_hypercare_activity || null,
      )
      .input(
        "domain_usecase_activity",
        sql.VarChar(200),
        mergedData.domain_usecase_activity || null,
      )
      .input(
        "other_activity",
        sql.VarChar(200),
        mergedData.other_activity || null,
      )
      .input("using_genai_tools", sql.VarChar(10), mergedData.using_genai_tools || null)
      .input("which_genai_tool", sql.VarChar(100), mergedData.which_genai_tool || null)
      .input("has_ghcp_license", sql.VarChar(10), mergedData.has_ghcp_license || null)
      .input("items_with_genai_tools", sql.Float, mergedData.items_with_genai_tools !== null ? mergedData.items_with_genai_tools : null)
      .input("hours_with_genai_tools", sql.Float, mergedData.hours_with_genai_tools !== null ? mergedData.hours_with_genai_tools : null)
      .input("items_without_genai_tools", sql.Float, mergedData.items_without_genai_tools !== null ? mergedData.items_without_genai_tools : null)
      .input("hours_without_genai_tools", sql.Float, mergedData.hours_without_genai_tools !== null ? mergedData.hours_without_genai_tools : null)
      .query(updateQuery);

    res
      .status(200)
      .json({
        success: true,
        message: "Record updated successfully.",
        entry: updateResult.recordset[0],
      });
  } catch (err) {
    console.error("Gauge update failed:", err);
    res.status(500).json({ error: "Failed to update gauge record" });
  }
});

/* =========================================
   DELETE
========================================= */
router.delete("/:id", async (req, res) => {
  try {
    const gaugeId = Number(req.params.id);
    if (!Number.isInteger(gaugeId) || gaugeId <= 0) {
      return res.status(400).json({ error: "Invalid Gauge ID." });
    }

    const pool = await getDbConnection();
    const lookup = await pool
      .request()
      .input("gaugeId", sql.Int, gaugeId)
      .query(
        "SELECT gauge_id, employee_id, [date] FROM Gauge WHERE gauge_id = @gaugeId",
      );

    if (lookup.recordset.length === 0) {
      return res.status(404).json({ error: "Gauge entry not found." });
    }

    const record = lookup.recordset[0];
    const admin = isStrictAdmin(req);
    if (!admin && record.employee_id !== req.user?.employeeId) {
      return res.status(403).json({
        error: "Access Denied: You cannot delete another user's Gauge entry.",
      });
    }

    if (
      !applyDatePolicyOrRespond(
        req,
        res,
        sqlDateToIso(record.date),
        "delete",
        admin,
      )
    ) {
      return;
    }

    const result = await pool
      .request()
      .input("gaugeId", sql.Int, gaugeId)
      .query("DELETE FROM Gauge WHERE gauge_id = @gaugeId");

    if (result.rowsAffected[0] !== 1) {
      return res.status(409).json({
        error: "The Gauge entry changed before it could be deleted. Refresh and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gauge entry deleted successfully.",
      gauge_id: gaugeId,
    });
  } catch (err) {
    console.error("Gauge delete failed:", err);
    return res.status(500).json({ error: "Failed to delete Gauge entry." });
  }
});

/* =========================================
   READ (GET)
========================================= */
router.get("/", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const { date } = req.query;
    let requestedEmployeeId = req.query.employeeId;

    const request = pool.request();

    const currentRole = req.user?.realRole?.toLowerCase();
    const isPrivileged = currentRole === "admin";

    if (!isPrivileged) {
      if (requestedEmployeeId && requestedEmployeeId !== req.user.employeeId) {
        return res.status(403).json({
          error:
            "Access Denied: You cannot view another user's effort records.",
        });
      }
      requestedEmployeeId = req.user.employeeId;
    }

    let query = `SELECT * FROM Gauge WHERE 1=1`;

    if (requestedEmployeeId) {
      query += ` AND employee_id = @employeeId`;
      request.input("employeeId", sql.VarChar(10), requestedEmployeeId);
    }
    if (date) {
      query += ` AND [date] = @date`;
      request.input("date", sql.Date, date);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Gauge fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

router.get("/allrecords", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const request = pool.request();
    let query = "SELECT * FROM Gauge";

    const currentRole = req.user?.realRole?.toLowerCase();
    const isPrivileged = currentRole === "admin" || currentRole === "moderator" || currentRole === "guides";

    if (!isPrivileged) {
      query += " WHERE employee_id = @empId";
      request.input("empId", sql.VarChar(10), req.user.employeeId);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Gauge fetch all failed:", err);
    res.status(500).json({ error: "Failed to fetch all records" });
  }
});

/* =========================================
   ADMIN DEPARTMENT FILTER METADATA
========================================= */
router.get("/departments", async (req, res) => {
  try {
    const currentRole = req.user?.realRole?.toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";
    const isGuides = currentRole === "guides";

    if (!isAdmin && !isModerator && !isGuides) {
      return res
        .status(403)
        .json({ error: "Access denied. Admins , Moderators, and Guides only." });
    }

    const { projectName } = req.query;
    const pool = await getDbConnection();
    const request = pool.request();
    const filters = [
      "a.Department IS NOT NULL",
      "LTRIM(RTRIM(a.Department)) <> ''",
    ];

    if (
      projectName &&
      String(projectName).trim() !== "" &&
      projectName !== "ALL"
    ) {
      filters.push(`
        (
          LTRIM(RTRIM(a.ProjectName)) = LTRIM(RTRIM(@projectName))
          OR LTRIM(RTRIM(p.project_name)) = LTRIM(RTRIM(@projectName))
        )
      `);
      request.input(
        "projectName",
        sql.VarChar(150),
        String(projectName).trim(),
      );
    }

    if (isModerator) {
      filters.push(`
        (
          LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
        )
      `);
      request.input(
        "userId",
        sql.VarChar(50),
        String(req.user?.employeeId || "").trim(),
      );
    }

    const result = await request.query(`
      SELECT DISTINCT LTRIM(RTRIM(a.Department)) AS Department
      FROM AssociateDetails a
      LEFT JOIN projects p ON LTRIM(RTRIM(CAST(a.ProjectID AS VARCHAR(100)))) = LTRIM(RTRIM(CAST(p.project_id AS VARCHAR(100))))
      WHERE ${filters.join(" AND ")}
      ORDER BY Department ASC
    `);

    res.json(result.recordset.map((row) => row.Department));
  } catch (err) {
    console.error("Gauge department fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.get("/associates", async (req, res) => {
  try {
    const currentRole = req.user?.realRole?.toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";
    const isGuides = currentRole === "guides";

    if (!isAdmin && !isModerator && !isGuides) {
      return res
        .status(403)
        .json({ error: "Access denied. Admins , Moderators, and Guides only." });
    }

    const { department, projectName } = req.query;
    if (
      (!department || String(department).trim() === "") &&
      (!projectName || String(projectName).trim() === "")
    ) {
      return res
        .status(400)
        .json({ error: "Project name or department is required." });
    }

    const pool = await getDbConnection();
    const request = pool.request();
    const filters = [];

    let query = `
      SELECT
        a.AssociateID,
        a.AssociateName,
        a.SupervisorName,
        a.ProjectID,
        a.ProjectName,
        a.Department,
        a.AccountName
      FROM AssociateDetails a
      LEFT JOIN projects p ON LTRIM(RTRIM(CAST(a.ProjectID AS VARCHAR(100)))) = LTRIM(RTRIM(CAST(p.project_id AS VARCHAR(100))))
    `;

    if (department && String(department).trim() !== "") {
      filters.push("LTRIM(RTRIM(a.Department)) = LTRIM(RTRIM(@department))");
      request.input("department", sql.VarChar(150), String(department).trim());
    }

    if (
      projectName &&
      String(projectName).trim() !== "" &&
      projectName !== "ALL"
    ) {
      filters.push(`
        (
          LTRIM(RTRIM(a.ProjectName)) = LTRIM(RTRIM(@projectName))
          OR LTRIM(RTRIM(p.project_name)) = LTRIM(RTRIM(@projectName))
        )
      `);
      request.input(
        "projectName",
        sql.VarChar(150),
        String(projectName).trim(),
      );
    }

    if (isModerator) {
      filters.push(`
        (
          LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) = LOWER(LTRIM(RTRIM(@userId)))
          OR LOWER(LTRIM(RTRIM(CAST(p.manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
          OR LOWER(LTRIM(RTRIM(CAST(p.proxy_manager_id AS VARCHAR(100))))) LIKE '%' + LOWER(LTRIM(RTRIM(@userId))) + '%'
        )
      `);
      request.input(
        "userId",
        sql.VarChar(50),
        String(req.user?.employeeId || "").trim(),
      );
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(" AND ")}`;
    }

    query += ` ORDER BY a.AssociateName ASC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Gauge associates fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch associates" });
  }
});

/* =========================================
   READ ALL / PROJECT EFFORTS (Merged)
========================================= */
router.get("/all", async (req, res) => {
  try {
    const pool = await getDbConnection();
    const { startDate, endDate, employeeId, department, projectName } =
      req.query;
    const request = pool.request();

    const currentRole = req.user?.realRole?.toLowerCase();
    const userId = req.user?.employeeId;
    const isGuides = currentRole === "guides";

    if (
      (currentRole === "admin" || isGuides)  &&
      (!department || String(department).trim() === "")
    ) {
      return res.json([]);
    }

    // ✅ Merged Query: LEFT JOINs ensure Admins still see efforts even if an
    // employee isn't assigned to a project in AssociateDetails or Projects table yet.
    let query = `
      SELECT 
        g.*, 
        u.name, 
        u.email,
        a.AssociateName,
        a.ProjectID,
        a.ProjectName AS AssociateProjectName,
        a.Department,
        a.AccountName,
        p.project_name
      FROM Gauge g
      LEFT JOIN Users u ON LTRIM(RTRIM(CAST(g.employee_id AS VARCHAR(50)))) = LTRIM(RTRIM(CAST(u.employee_id AS VARCHAR(50))))
      LEFT JOIN AssociateDetails a ON LTRIM(RTRIM(CAST(a.AssociateID AS VARCHAR(50)))) = LTRIM(RTRIM(CAST(g.employee_id AS VARCHAR(50))))
      LEFT JOIN projects p ON LTRIM(RTRIM(CAST(a.ProjectID AS VARCHAR(100)))) = LTRIM(RTRIM(CAST(p.project_id AS VARCHAR(100))))
      WHERE 1=1
    `;

    // 🔒 Dynamic Role-Based Access Control
    if (currentRole === "admin" || isGuides) {
      query += " AND LTRIM(RTRIM(a.Department)) = LTRIM(RTRIM(@department))";
      request.input("department", sql.VarChar(150), String(department).trim());

      // Admins see everything. Allow them to optionally filter by a specific employeeId.
      if (employeeId) {
        query += " AND g.employee_id = @searchId";
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

      // Allow moderators to optionally filter by a specific employeeId within their allowed projects
      if (employeeId) {
        query += " AND g.employee_id = @searchId";
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
      // Standard users are strictly isolated and can ONLY see their own records.
      query += " AND g.employee_id = @userId";
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

    // Optional Date Filtering
    if (startDate) {
      query += ` AND g.[date] >= @startDate`;
      request.input("startDate", sql.Date, startDate);
    }
    if (endDate) {
      query += ` AND g.[date] <= @endDate`;
      request.input("endDate", sql.Date, endDate);
    }

    query += ` ORDER BY g.[date] DESC`;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Gauge fetch all failed:", err);
    res.status(500).json({ error: "Failed to fetch all records" });
  }
});

/* =========================================
   AGGREGATION & REPORTING
========================================= */
router.post("/pulse-data", async (req, res) => {
  try {
    const pool = await getDbConnection();
    let { employeeIds, startDate, endDate } = req.body;

    const currentRole = req.user?.realRole?.toLowerCase();
    const isPrivileged = currentRole === "admin" || currentRole === "moderator" || currentRole === "guides";

    if (!isPrivileged) {
      employeeIds = [req.user.employeeId];
    }

    if (!employeeIds || employeeIds.length === 0) {
      return res
        .status(400)
        .json({ error: "No associates found in allocation" });
    }

    const CHUNK_SIZE = 1500;
    let allRecords = [];

    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      const chunk = employeeIds.slice(i, i + CHUNK_SIZE);
      const request = pool.request();

      const idList = chunk
        .map((id, index) => {
          request.input(`id${index}`, sql.VarChar, id);
          return `@id${index}`;
        })
        .join(",");

      let query = `SELECT * FROM Gauge WHERE employee_id IN (${idList})`;

      if (startDate && startDate.trim() !== "") {
        query += ` AND [date] >= @startDate`;
        request.input("startDate", sql.Date, startDate);
      }
      if (endDate && endDate.trim() !== "") {
        query += ` AND [date] <= @endDate`;
        request.input("endDate", sql.Date, endDate);
      }

      const result = await request.query(query);
      allRecords = allRecords.concat(result.recordset);
    }

    const pulseMap = {};
    let totalLeaves = 0;
    const uniqueGHCPLicenses = new Set();

    allRecords.forEach((rec) => {
      if (rec.is_on_leave === "Yes") totalLeaves++;
      if (rec.has_ghcp_license === "Yes")
        uniqueGHCPLicenses.add(rec.employee_id);
      if (!rec.stage) return;

      const activity =
        rec.business_requirements_activity ||
        rec.code_build_activity ||
        rec.design_activity ||
        rec.test_review_activity ||
        rec.deploy_hypercare_activity ||
        rec.domain_usecase_activity ||
        rec.other_activity ||
        "N/A";

      const key = `${rec.stage}-||-${activity}`;
      if (!pulseMap[key]) {
        pulseMap[key] = {
          Stage: rec.stage,
          Activity: activity,
          genaiItems: 0,
          genaiActualHrs: 0,
          estimatedItems: 0,
          estimatedHrs: 0,
        };
      }

      pulseMap[key].genaiItems += rec.items_with_genai_tools || 0;
      pulseMap[key].genaiActualHrs += rec.hours_with_genai_tools || 0;
      pulseMap[key].estimatedItems += rec.items_without_genai_tools || 0;
      pulseMap[key].estimatedHrs += rec.hours_without_genai_tools || 0;
    });

    const finalReport = Object.values(pulseMap).map((item) => {
      const safeEstimatedItems =
        item.estimatedItems > 0 ? item.estimatedItems : 1;
      const manualItems = item.estimatedItems - item.genaiItems;
      const manualEffortsHrs = item.estimatedHrs - item.genaiActualHrs;
      const machinePulse = (item.genaiItems / safeEstimatedItems) * 100;
      const humanPulse = (manualItems / safeEstimatedItems) * 100;

      return {
        Stage: item.Stage,
        Activity: item.Activity,
        "GenAI Items": item.genaiItems,
        "GenAI Efforts(hrs)": Number(item.genaiActualHrs.toFixed(2)),
        "Estimated Items": item.estimatedItems,
        "Estimated Efforts(hrs)": Number(item.estimatedHrs.toFixed(2)),
        "Manual Items": manualItems,
        "Manual Efforts(hrs)": Number(manualEffortsHrs.toFixed(2)),
        "Machine Pulse": machinePulse.toFixed(2) + "%",
        "Human Pulse": humanPulse.toFixed(2) + "%",
      };
    });

    finalReport.sort((a, b) => {
      if (a.Stage === b.Stage) return a.Activity.localeCompare(b.Activity);
      return a.Stage.localeCompare(b.Stage);
    });

    const summaryTable = [
      { Metric: "No. of leaves Taken", Count: totalLeaves },
      { Metric: "GenAI Licence Count", Count: uniqueGHCPLicenses.size },
    ];

    res.json({ mainTable: finalReport, summaryTable: summaryTable });
  } catch (err) {
    console.error("Pulse fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch project data" });
  }
});

/* =========================================
   DEFAULTER LIST (SUBMITTED DATES)
========================================= */
router.post("/submitted-dates", async (req, res) => {
  const currentRole = req.user?.realRole?.toLowerCase();
  const isPrivileged = currentRole === "admin" || currentRole === "moderator" || currentRole === "guides";

  if (!isPrivileged) {
    return res
      .status(403)
      .json({ error: "Access denied. Admins , Moderators, and Guides only." });
  }

  try {
    const pool = await getDbConnection();
    const { employeeIds, startDate, endDate } = req.body;

    if (!employeeIds || employeeIds.length === 0) {
      return res.status(400).json({ error: "No associates provided" });
    }

    const CHUNK_SIZE = 1500;
    const submittedDatesMap = {};

    for (let i = 0; i < employeeIds.length; i += CHUNK_SIZE) {
      const chunk = employeeIds.slice(i, i + CHUNK_SIZE);
      const request = pool.request();

      const idList = chunk
        .map((id, index) => {
          request.input(`id${index}`, sql.VarChar, id);
          return `@id${index}`;
        })
        .join(",");

      // ✅ FIXED: Fetching Name from Users table in the JOIN
      let query = `
        SELECT g.employee_id, g.[date], u.name 
        FROM Gauge g
        LEFT JOIN Users u ON g.employee_id = u.employee_id
        WHERE g.employee_id IN (${idList})
      `;

      if (startDate && startDate.trim() !== "") {
        query += ` AND g.[date] >= @startDate`;
        request.input("startDate", sql.Date, startDate);
      }
      if (endDate && endDate.trim() !== "") {
        query += ` AND g.[date] <= @endDate`;
        request.input("endDate", sql.Date, endDate);
      }

      const result = await request.query(query);

      result.recordset.forEach((row) => {
        const empId = row.employee_id;
        const dateStr = new Date(row.date).toISOString().split("T")[0];

        // Store dates alongside the user's actual name
        if (!submittedDatesMap[empId]) {
          submittedDatesMap[empId] = {
            name: row.name || "Unknown",
            dates: new Set(),
          };
        }
        submittedDatesMap[empId].dates.add(dateStr);
      });
    }

    const finalMap = {};
    for (const emp in submittedDatesMap) {
      finalMap[emp] = {
        name: submittedDatesMap[emp].name,
        dates: Array.from(submittedDatesMap[emp].dates),
      };
    }

    res.json(finalMap);
  } catch (err) {
    console.error("Failed to fetch submitted dates:", err);
    res.status(500).json({ error: "Failed to fetch submitted dates" });
  }
});

/* =========================================
   AI TOKEN USAGE SUBMISSION
========================================= */
router.post("/token-usage", async (req, res) => {
  try {
    const { tokenUsage, tokenUnit, zeroReason, selectedMonth } = req.body;
    const employeeId = req.user?.employeeId;
    const userName = req.user?.name || "Unknown";
    const userEmail = req.user?.email || `${employeeId}@cognizant.com`;

    if (!employeeId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validation
    if (tokenUsage === null || tokenUsage === undefined || tokenUsage === "") {
      return res.status(400).json({ error: "Token usage is required" });
    }

    const usage = Number(tokenUsage);
    if (!Number.isFinite(usage) || usage < 0) {
      return res.status(400).json({ error: "Token usage must be a non-negative number" });
    }

    if (!tokenUnit || !["Tokens", "Thousand (K)", "Million (M)", "Billion (B)", "Trillion (T)"].includes(tokenUnit)) {
      return res.status(400).json({ error: "Invalid token unit selected" });
    }

    // If usage is 0, reason is required
    if (usage === 0 && (!zeroReason || zeroReason.trim() === "")) {
      return res.status(400).json({ error: "Reason is required when token usage is 0" });
    }

    // Validate selected month is provided
    if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
      return res.status(400).json({ error: "Valid month selection is required (format: YYYY-MM)" });
    }

    const pool = await getDbConnection();
    
    // Use India timezone for consistency with frontend
    const todayIndia = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date(todayIndia);
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // Helper to check if date is working day
    const isWorkingDay = (date) => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    };
    
    // Get working days of a month
    const getWorkingDays = (year, month) => {
      const workingDays = [];
      const totalDays = new Date(year, month, 0).getDate();
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month - 1, day);
        if (isWorkingDay(date)) {
          workingDays.push(day);
        }
      }
      return workingDays;
    };

    // Calculate submission window: first 2 working days of current month for previous month data
    // OR last 2 working days of current month for current month data
    
    // Get first 2 working days of CURRENT month (for submitting PREVIOUS month data)
    const currentMonthWorkingDays = getWorkingDays(currentYear, currentMonth);
    const currentMonthFirstTwoWorkingDays = currentMonthWorkingDays.slice(0, 2);
    
    // Get last 2 working days of PREVIOUS month (for submitting PREVIOUS month data)
    const prevMonthForWindow = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYearForWindow = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthWorkingDays = getWorkingDays(prevYearForWindow, prevMonthForWindow);
    const prevMonthLastTwoWorkingDays = prevMonthWorkingDays.slice(-2);
    
    // Get last 2 working days of CURRENT month (for submitting CURRENT month data)
    const currentMonthLastTwoWorkingDays = currentMonthWorkingDays.slice(-2);
    
    // Get first 2 working days of NEXT month (for submitting CURRENT month data)
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonthWorkingDays = getWorkingDays(nextYear, nextMonth);
    const nextMonthFirstTwoWorkingDays = nextMonthWorkingDays.slice(0, 2);
    
    // Continuous date-range check: every calendar day between the two boundary
    // working days counts as "in window", including weekends/holidays in between.
    const dayIndex = (year, month, day) => Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
    const todayIndex = dayIndex(currentYear, currentMonth, currentDay);

    const prevWindowStartDay = prevMonthLastTwoWorkingDays[0];
    const prevWindowEndDay = currentMonthFirstTwoWorkingDays[1];
    const prevWindowStartIndex = dayIndex(prevYearForWindow, prevMonthForWindow, prevWindowStartDay);
    const prevWindowEndIndex = dayIndex(currentYear, currentMonth, prevWindowEndDay);

    const currentWindowStartDay = currentMonthLastTwoWorkingDays[0];
    const currentWindowEndDay = nextMonthFirstTwoWorkingDays[1];
    const currentWindowStartIndex = dayIndex(currentYear, currentMonth, currentWindowStartDay);
    const currentWindowEndIndex = dayIndex(nextYear, nextMonth, currentWindowEndDay);

    const isInPrevMonthWindow = todayIndex >= prevWindowStartIndex && todayIndex <= prevWindowEndIndex;
    const isInCurrentMonthWindow = todayIndex >= currentWindowStartIndex && todayIndex <= currentWindowEndIndex;

    const isInWindow = isInPrevMonthWindow || isInCurrentMonthWindow;
    
    if (!isInWindow) {
      return res.status(403).json({
        error: `Token usage submissions are only allowed from the 2nd-to-last working day of a month through the 2nd working day of the next month (all calendar days in between are included). Next windows: ${prevMonthForWindow}/${prevWindowStartDay} - ${currentMonth}/${prevWindowEndDay} OR ${currentMonth}/${currentWindowStartDay} - ${nextMonth}/${currentWindowEndDay}`
      });
    }

    // Parse selected month
    const [selectedYearStr, selectedMonthStr] = selectedMonth.split('-');
    const selectedYear = parseInt(selectedYearStr);
    const selectedMonthNum = parseInt(selectedMonthStr);

    // Validate selected month matches window rules
    let allowedMonth, allowedYear;
    
    // Determine which month can be submitted based on current position in window
    if (isInPrevMonthWindow) {
      // In first working days of current month - can submit for previous month
      allowedMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      allowedYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    } else if (isInCurrentMonthWindow) {
      // In last working days of current month - can submit for current month
      allowedMonth = currentMonth;
      allowedYear = currentYear;
    } else {
      // Shouldn't reach here if isInWindow validation is correct
      return res.status(403).json({ error: "Not in valid submission window" });
    }

    if (selectedMonthNum !== allowedMonth || selectedYear !== allowedYear) {
      return res.status(400).json({ 
        error: `Invalid month selection. You can only submit for ${allowedMonth}/${allowedYear} during this window` 
      });
    }

    // Calculate period start and end dates
    const periodStartDate = new Date(selectedYear, selectedMonthNum - 1, 1);
    const periodEndDate = new Date(selectedYear, selectedMonthNum, 0);

    // Lookup project information from AssociateDetails
    let projectId = null;
    let projectName = null;
    try {
      const projectLookup = await pool
        .request()
        .input("associateId", sql.Int, parseInt(employeeId))
        .query(`
          SELECT ProjectID, ProjectName 
          FROM AssociateDetails 
          WHERE AssociateID = @associateId
        `);
      
      if (projectLookup.recordset.length > 0) {
        projectId = projectLookup.recordset[0].ProjectID || null;
        projectName = projectLookup.recordset[0].ProjectName || null;
      }
    } catch (lookupErr) {
      console.warn("Project lookup failed, continuing without project info:", lookupErr);
    }

    // Check if already submitted for target month
    const checkQuery = `
      SELECT token_usage_id 
      FROM AI_Token_Usage 
      WHERE employee_id = @employeeId 
        AND submission_month = @month 
        AND submission_year = @year
    `;
    
    const checkResult = await pool
      .request()
      .input("employeeId", sql.VarChar(10), employeeId)
      .input("month", sql.Int, selectedMonthNum)
      .input("year", sql.Int, selectedYear)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE AI_Token_Usage
        SET 
          name = @name,
          email = @email,
          token_usage = @tokenUsage,
          token_unit = @tokenUnit,
          zero_reason = @zeroReason,
          submission_date = @submissionDate,
          project_id = @projectId,
          project_name = @projectName,
          period_start_date = @periodStartDate,
          period_end_date = @periodEndDate
        WHERE employee_id = @employeeId 
          AND submission_month = @month 
          AND submission_year = @year
      `;

      await pool
        .request()
        .input("employeeId", sql.VarChar(10), employeeId)
        .input("name", sql.VarChar(100), userName)
        .input("email", sql.VarChar(100), userEmail)
        .input("tokenUsage", sql.Float, usage)
        .input("tokenUnit", sql.VarChar(50), tokenUnit)
        .input("zeroReason", sql.VarChar(500), usage === 0 ? zeroReason : null)
        .input("month", sql.Int, selectedMonthNum)
        .input("year", sql.Int, selectedYear)
        .input("submissionDate", sql.Date, today)
        .input("projectId", sql.VarChar(50), projectId)
        .input("projectName", sql.VarChar(150), projectName)
        .input("periodStartDate", sql.Date, periodStartDate)
        .input("periodEndDate", sql.Date, periodEndDate)
        .query(updateQuery);

      res.status(200).json({
        success: true,
        message: "AI Token usage updated successfully",
        data: {
          tokenUsage: usage,
          tokenUnit,
          zeroReason: usage === 0 ? zeroReason : null,
          submissionDate: today.toISOString().split('T')[0],
          submissionMonth: selectedMonthNum,
          submissionYear: selectedYear,
          periodStartDate: periodStartDate.toISOString().split('T')[0],
          periodEndDate: periodEndDate.toISOString().split('T')[0],
          projectId,
          projectName
        }
      });
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO AI_Token_Usage (
          employee_id, name, email, token_usage, token_unit, 
          zero_reason, submission_month, submission_year, submission_date,
          project_id, project_name, period_start_date, period_end_date
        )
        VALUES (
          @employeeId, @name, @email, @tokenUsage, @tokenUnit, 
          @zeroReason, @month, @year, @submissionDate,
          @projectId, @projectName, @periodStartDate, @periodEndDate
        )
      `;

      await pool
        .request()
        .input("employeeId", sql.VarChar(10), employeeId)
        .input("name", sql.VarChar(100), userName)
        .input("email", sql.VarChar(100), userEmail)
        .input("tokenUsage", sql.Float, usage)
        .input("tokenUnit", sql.VarChar(50), tokenUnit)
        .input("zeroReason", sql.VarChar(500), usage === 0 ? zeroReason : null)
        .input("month", sql.Int, selectedMonthNum)
        .input("year", sql.Int, selectedYear)
        .input("submissionDate", sql.Date, today)
        .input("projectId", sql.VarChar(50), projectId)
        .input("projectName", sql.VarChar(150), projectName)
        .input("periodStartDate", sql.Date, periodStartDate)
        .input("periodEndDate", sql.Date, periodEndDate)
        .query(insertQuery);

      res.status(200).json({
        success: true,
        message: "AI Token usage submitted successfully",
        data: {
          tokenUsage: usage,
          tokenUnit,
          zeroReason: usage === 0 ? zeroReason : null,
          submissionDate: today.toISOString().split('T')[0],
          submissionMonth: selectedMonthNum,
          submissionYear: selectedYear,
          periodStartDate: periodStartDate.toISOString().split('T')[0],
          periodEndDate: periodEndDate.toISOString().split('T')[0],
          projectId,
          projectName
        }
      });
    }
  } catch (err) {
    console.error("Token usage submission failed:", err);
    res.status(500).json({ error: "Failed to submit token usage" });
  }
});

/* =========================================
   AI TOKEN USAGE ANALYTICS - INDIVIDUAL
========================================= */
router.get("/token-usage/analytics/individual", async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;
    const { startDate, endDate } = req.query;

    if (!employeeId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await getDbConnection();
    const request = pool.request().input("employeeId", sql.VarChar(10), employeeId);

    let dateFilter = "";
    if (startDate && endDate) {
      dateFilter = ` AND submission_date BETWEEN @startDate AND @endDate`;
      request.input("startDate", sql.Date, startDate);
      request.input("endDate", sql.Date, endDate);
    }

    const query = `
      SELECT 
        atu.employee_id,
        atu.name,
        atu.email,
        atu.project_id,
        atu.project_name,
        atu.token_usage,
        atu.token_unit,
        atu.zero_reason,
        atu.submission_month,
        atu.submission_year,
        atu.submission_date,
        ad.Department,
        ad.AccountName
      FROM AI_Token_Usage atu
      LEFT JOIN AssociateDetails ad ON atu.employee_id = CAST(ad.AssociateID AS VARCHAR(10))
      WHERE atu.employee_id = @employeeId${dateFilter}
      ORDER BY atu.submission_year DESC, atu.submission_month DESC
    `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Individual token analytics failed:", err);
    res.status(500).json({ error: "Failed to fetch individual token analytics" });
  }
});

/* =========================================
   AI TOKEN USAGE ANALYTICS - PROJECT-WISE
========================================= */
router.get("/token-usage/analytics/project", async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const currentRole = req.user?.realRole?.toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";

    if (!isAdmin && !isModerator) {
      return res.status(403).json({ error: "Access denied. Admin or Moderator role required." });
    }

    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    const pool = await getDbConnection();
    const request = pool.request().input("projectId", sql.VarChar(50), projectId);

    let dateFilter = "";
    if (startDate && endDate) {
      dateFilter = ` AND atu.submission_date BETWEEN @startDate AND @endDate`;
      request.input("startDate", sql.Date, startDate);
      request.input("endDate", sql.Date, endDate);
    }

    const query = `
      SELECT 
        atu.project_id,
        atu.project_name,
        atu.employee_id,
        atu.name,
        atu.token_usage,
        atu.token_unit,
        atu.zero_reason,
        atu.submission_month,
        atu.submission_year,
        atu.submission_date,
        ad.Department,
        ad.AccountName
      FROM AI_Token_Usage atu
      LEFT JOIN AssociateDetails ad ON atu.employee_id = CAST(ad.AssociateID AS VARCHAR(10))
      WHERE atu.project_id = @projectId${dateFilter}
      ORDER BY atu.submission_year DESC, atu.submission_month DESC, atu.name ASC
    `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Project token analytics failed:", err);
    res.status(500).json({ error: "Failed to fetch project token analytics" });
  }
});

/* =========================================
   AI TOKEN USAGE ANALYTICS - SUMMARY
========================================= */
router.get("/token-usage/analytics/summary", async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const currentRole = req.user?.realRole?.toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";
    const employeeId = req.user?.employeeId;

    const pool = await getDbConnection();
    const request = pool.request();

    let projectFilter = "";
    let dateFilter = "";
    let userFilter = "";

    // Role-based filtering
    if (!isAdmin && !isModerator) {
      // Regular users only see their own data
      userFilter = " WHERE atu.employee_id = @employeeId";
      request.input("employeeId", sql.VarChar(10), employeeId);
    } else if (projectId) {
      projectFilter = " WHERE atu.project_id = @projectId";
      request.input("projectId", sql.VarChar(50), projectId);
    }

    if (startDate && endDate) {
      const connector = (projectFilter || userFilter) ? " AND" : " WHERE";
      dateFilter = `${connector} atu.submission_date BETWEEN @startDate AND @endDate`;
      request.input("startDate", sql.Date, startDate);
      request.input("endDate", sql.Date, endDate);
    }

    const query = `
      SELECT 
        COUNT(DISTINCT atu.employee_id) AS totalUsers,
        COUNT(DISTINCT atu.project_id) AS totalProjects,
        SUM(CASE WHEN atu.token_usage > 0 THEN 1 ELSE 0 END) AS activeSubmissions,
        SUM(CASE WHEN atu.token_usage = 0 THEN 1 ELSE 0 END) AS zeroSubmissions,
        AVG(CASE WHEN atu.token_usage > 0 THEN atu.token_usage ELSE NULL END) AS avgTokenUsage,
        MAX(atu.token_usage) AS maxTokenUsage,
        MIN(CASE WHEN atu.token_usage > 0 THEN atu.token_usage ELSE NULL END) AS minTokenUsage
      FROM AI_Token_Usage atu${userFilter}${projectFilter}${dateFilter}
    `;

    const result = await request.query(query);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("Token analytics summary failed:", err);
    res.status(500).json({ error: "Failed to fetch token analytics summary" });
  }
});

/* =========================================
   GET LAST TOKEN SUBMISSION DATE
========================================= */
router.get("/token-usage/last-submission", async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await getDbConnection();
    const query = `
      SELECT TOP 1 
        submission_date,
        submission_month,
        submission_year,
        token_usage,
        token_unit,
        zero_reason
      FROM AI_Token_Usage 
      WHERE employee_id = @employeeId
      ORDER BY submission_year DESC, submission_month DESC
    `;

    const result = await pool
      .request()
      .input("employeeId", sql.VarChar(10), employeeId)
      .query(query);

    if (result.recordset.length === 0) {
      return res.json({ lastSubmission: null });
    }

    const record = result.recordset[0];
    res.json({
      lastSubmission: record.submission_date,
      submissionMonth: record.submission_month,
      submissionYear: record.submission_year,
      tokenUsage: record.token_usage,
      tokenUnit: record.token_unit,
      zeroReason: record.zero_reason
    });
  } catch (err) {
    console.error("Failed to fetch last token submission:", err);
    res.status(500).json({ error: "Failed to fetch last token submission" });
  }
});

/* =========================================
   GET USER'S PROJECT INFORMATION
========================================= */
router.get("/token-usage/user-project", async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const pool = await getDbConnection();
    const query = `
      SELECT ProjectID, ProjectName
      FROM AssociateDetails
      WHERE AssociateID = @associateId
    `;

    const result = await pool
      .request()
      .input("associateId", sql.Int, parseInt(employeeId))
      .query(query);

    if (result.recordset.length === 0) {
      return res.json({ projectId: null, projectName: null });
    }

    const record = result.recordset[0];
    res.json({
      projectId: record.ProjectID,
      projectName: record.ProjectName
    });
  } catch (err) {
    console.error("Failed to fetch user project info:", err);
    res.status(500).json({ error: "Failed to fetch user project information" });
  }
});

/* =========================================
   AI TOKEN USAGE FOR COPILOT DASHBOARD
========================================= */
router.post("/token-usage/dashboard-metrics", async (req, res) => {
  try {
    const { projectId, squads, startDate, endDate } = req.body;
    const currentRole = req.user?.realRole?.toLowerCase();
    const isAdmin = currentRole === "admin";
    const isModerator = currentRole === "moderator";

    if (!isAdmin && !isModerator) {
      return res.status(403).json({ error: "Access denied. Admin or Moderator role required." });
    }

    const pool = await getDbConnection();
    const request = pool.request();

    let filters = [];
    
    if (projectId) {
      filters.push("atu.project_id = @projectId");
      request.input("projectId", sql.VarChar(50), projectId);
    }

    if (startDate && endDate) {
      filters.push("atu.submission_date BETWEEN @startDate AND @endDate");
      request.input("startDate", sql.Date, startDate);
      request.input("endDate", sql.Date, endDate);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // 1. Token usage by team members
    const teamUsageQuery = `
      SELECT 
        atu.name AS EmployeeName,
        atu.employee_id AS EmployeeID,
        SUM(atu.token_usage) AS TotalTokens,
        atu.token_unit AS TokenUnit,
        atu.project_name AS ProjectName
      FROM AI_Token_Usage atu
      ${whereClause}
      GROUP BY atu.name, atu.employee_id, atu.token_unit, atu.project_name
      ORDER BY TotalTokens DESC
    `;

    // 2. Monthly token usage trend
    const monthlyTrendQuery = `
      SELECT 
        atu.submission_month AS Month,
        atu.submission_year AS Year,
        SUM(atu.token_usage) AS TotalTokens,
        COUNT(DISTINCT atu.employee_id) AS ActiveUsers
      FROM AI_Token_Usage atu
      ${whereClause}
      GROUP BY atu.submission_year, atu.submission_month
      ORDER BY atu.submission_year, atu.submission_month
    `;

    // 3. Zero usage reasons breakdown
    const zeroReasonsQuery = `
      SELECT 
        atu.zero_reason AS Reason,
        COUNT(*) AS Count
      FROM AI_Token_Usage atu
      ${whereClause}
        ${filters.length > 0 ? 'AND' : 'WHERE'} atu.token_usage = 0 
        AND atu.zero_reason IS NOT NULL
      GROUP BY atu.zero_reason
      ORDER BY Count DESC
    `;

    // 4. Summary statistics (with token unit normalization)
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT atu.employee_id) AS TotalUsers,
        SUM(CASE WHEN atu.token_usage > 0 THEN 1 ELSE 0 END) AS ActiveSubmissions,
        SUM(CASE WHEN atu.token_usage = 0 THEN 1 ELSE 0 END) AS ZeroSubmissions,
        AVG(CASE 
          WHEN atu.token_usage > 0 THEN 
            CASE atu.token_unit
              WHEN 'Tokens' THEN atu.token_usage
              WHEN 'Thousand (K)' THEN atu.token_usage * 1000
              WHEN 'Million (M)' THEN atu.token_usage * 1000000
              WHEN 'Billion (B)' THEN atu.token_usage * 1000000000
              WHEN 'Trillion (T)' THEN atu.token_usage * 1000000000000
              ELSE atu.token_usage
            END
          ELSE NULL 
        END) AS AvgTokenUsage,
        MAX(CASE atu.token_unit
          WHEN 'Tokens' THEN atu.token_usage
          WHEN 'Thousand (K)' THEN atu.token_usage * 1000
          WHEN 'Million (M)' THEN atu.token_usage * 1000000
          WHEN 'Billion (B)' THEN atu.token_usage * 1000000000
          WHEN 'Trillion (T)' THEN atu.token_usage * 1000000000000
          ELSE atu.token_usage
        END) AS MaxTokenUsage
      FROM AI_Token_Usage atu
      ${whereClause}
    `;

    const [teamUsage, monthlyTrend, zeroReasons, summary] = await Promise.all([
      request.query(teamUsageQuery),
      pool.request()
        .input("projectId", sql.VarChar(50), projectId || null)
        .input("startDate", sql.Date, startDate || null)
        .input("endDate", sql.Date, endDate || null)
        .query(monthlyTrendQuery),
      pool.request()
        .input("projectId", sql.VarChar(50), projectId || null)
        .input("startDate", sql.Date, startDate || null)
        .input("endDate", sql.Date, endDate || null)
        .query(zeroReasonsQuery),
      pool.request()
        .input("projectId", sql.VarChar(50), projectId || null)
        .input("startDate", sql.Date, startDate || null)
        .input("endDate", sql.Date, endDate || null)
        .query(summaryQuery)
    ]);

    res.json({
      teamUsageData: teamUsage.recordset,
      monthlyTrendData: monthlyTrend.recordset,
      zeroReasonsData: zeroReasons.recordset,
      summaryStats: summary.recordset[0] || {}
    });
  } catch (err) {
    console.error("Token usage dashboard metrics failed:", err);
    res.status(500).json({ error: "Failed to fetch token usage dashboard metrics" });
  }
});

/* =========================================
   EXCEL EXPORT - TOKEN USAGE WITH ASSOCIATE DETAILS
========================================= */
router.post("/token-usage/export-excel", async (req, res) => {
  try {
    const { projectId, squads, startDate, endDate } = req.body;
    const pool = await getDbConnection();

    // Build dynamic filter
    const filters = [];
    const request = pool.request();

    if (projectId) {
      filters.push("ad.ProjectID = @projectId");
      request.input("projectId", sql.VarChar(50), projectId);
    }

    if (startDate) {
      filters.push("atu.submission_date >= @startDate");
      request.input("startDate", sql.Date, startDate);
    }

    if (endDate) {
      filters.push("atu.submission_date <= @endDate");
      request.input("endDate", sql.Date, endDate);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    // Main export query with all joins
    const exportQuery = `
      SELECT 
        ad.AssociateID,
        ad.AssociateName,
        ad.Grade,
        ad.SupervisorID,
        ad.SupervisorName,
        atu.submission_month AS SubmissionMonth,
        atu.submission_year AS SubmissionYear,
        CASE atu.token_unit
          WHEN 'Tokens' THEN atu.token_usage
          WHEN 'Thousand (K)' THEN atu.token_usage * 1000
          WHEN 'Million (M)' THEN atu.token_usage * 1000000
          WHEN 'Billion (B)' THEN atu.token_usage * 1000000000
          WHEN 'Trillion (T)' THEN atu.token_usage * 1000000000000
          ELSE atu.token_usage
        END AS TokenConsumption,
        atu.token_unit AS TokenUnit,
        atu.zero_reason AS ZeroReason,
        atu.submission_date AS LastSubmittedDate,
        (
          SELECT TOP 1 which_genai_tool 
          FROM Gauge g 
          WHERE g.employee_id = CAST(ad.AssociateID AS VARCHAR(10))
            AND g.which_genai_tool IS NOT NULL
            AND g.which_genai_tool != ''
          ORDER BY g.start_time DESC
        ) AS AIToolUsed
      FROM AssociateDetails ad
      LEFT JOIN AI_Token_Usage atu ON CAST(ad.AssociateID AS VARCHAR(10)) = atu.employee_id
      ${whereClause}
      ORDER BY atu.submission_year DESC, atu.submission_month DESC, ad.AssociateName
    `;

    const result = await request.query(exportQuery);
    const data = result.recordset;

    // Group data by month
    const dataByMonth = {};
    data.forEach(row => {
      if (!row.SubmissionMonth || !row.SubmissionYear) return; // Skip rows without submissions
      
      const monthKey = `${row.SubmissionYear}-${String(row.SubmissionMonth).padStart(2, '0')}`;
      const monthName = new Date(row.SubmissionYear, row.SubmissionMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      
      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = {
          name: monthName,
          data: []
        };
      }
      
      dataByMonth[monthKey].data.push({
        'Associate ID': row.AssociateID,
        'Associate Name': row.AssociateName || 'N/A',
        'Grade': row.Grade || 'N/A',
        'Supervisor ID': row.SupervisorID || 'N/A',
        'Supervisor Name': row.SupervisorName || 'N/A',
        'AI Tool Used': row.AIToolUsed || 'Not Recorded',
        'Token Consumption': row.TokenConsumption || 0,
        'Token Unit (Original)': row.TokenUnit || 'N/A',
        'Zero Reason': row.ZeroReason || '-',
        'Last Submitted Date': row.LastSubmittedDate ? new Date(row.LastSubmittedDate).toLocaleDateString() : 'N/A'
      });
    });

    res.json({
      success: true,
      dataByMonth: Object.keys(dataByMonth)
        .sort()
        .reverse()
        .map(key => dataByMonth[key])
    });

  } catch (err) {
    console.error("Excel export failed:", err);
    res.status(500).json({ error: "Failed to export token usage data" });
  }
});

export default router;
