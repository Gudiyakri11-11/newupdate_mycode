// Reads an uploaded Excel workbook (buffer) and returns a normalized array of "idea" objects.
import xlsx from "xlsx";

// Normalize a header string: trim, remove all whitespace, lowercase.
function normalizeKey(key) {
  return String(key || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

// Map of normalized header aliases -> canonical field name used by the PPT generator.
const FIELD_ALIASES = {
  ideaid: "ideaId",
  id: "ideaId",
  ideatitle: "title",
  title: "title",
  ideaname: "title",
  description: "description",
  ideadescription: "description",
  submittedby: "submittedBy",
  submitter: "submittedBy",
  employeename: "submittedBy",
  employeeid: "employeeId",
  associateid: "employeeId",
  category: "category",
  department: "department",
  finalmisdepartment: "department",
  currentprocess: "currentProcess",
  asisprocess: "currentProcess",
  proposedsolution: "proposedSolution",
  tobesolution: "proposedSolution",
  solution: "solution",
  solutionapproach: "solution",
  expectedbenefit: "expectedBenefit",
  businessvalue: "expectedBenefit",
  benefit: "expectedBenefit",
  impact: "impact",
  status: "status",
  submissiondate: "submissionDate",
  date: "submissionDate",
  project: "project",
  projectname: "project",
  account: "account",
  accountname: "account",
};

function mapRowToIdea(row) {
  const idea = { raw: row };

  for (const [rawKey, value] of Object.entries(row)) {
    const normalized = normalizeKey(rawKey);
    const canonical = FIELD_ALIASES[normalized];
    if (canonical) {
      idea[canonical] = value ?? "";
    }
  }

  // Fallbacks so downstream slide generation always has something to render.
  idea.ideaId = String(idea.ideaId || "").trim();
  idea.title = String(idea.title || idea.ideaId || "Untitled Idea").trim();
  idea.description = String(idea.description || "").trim();
  idea.solution = String(idea.solution || idea.proposedSolution || "").trim();
  idea.submittedBy = String(idea.submittedBy || "Unknown").trim();
  idea.category = String(idea.category || "").trim();
  idea.department = String(idea.department || "").trim();
  idea.currentProcess = String(idea.currentProcess || "").trim();
  idea.proposedSolution = String(idea.proposedSolution || "").trim();
  idea.expectedBenefit = String(idea.expectedBenefit || "").trim();
  idea.impact = String(idea.impact || "").trim();
  idea.status = String(idea.status || "").trim();
  idea.project = String(idea.project || "").trim();
  idea.account = String(idea.account || "").trim();

  return idea;
}

function isRowEmpty(row) {
  return Object.values(row).every(
    (value) => value === null || value === undefined || String(value).trim() === "",
  );
}

/**
 * Reads ideas from an Excel buffer.
 * @param {Buffer} buffer - Raw bytes of the uploaded .xlsx/.xls file.
 * @returns {Array<Object>} Array of normalized idea objects (never empty rows).
 */
export function readIdeas(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

  return rawRows.filter((row) => !isRowEmpty(row)).map(mapRowToIdea);
}
