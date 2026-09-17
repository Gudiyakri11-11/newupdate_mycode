// // Allowed Stage keys
// export const STAGE_KEYS = [
//   "Business Requirements",
//   "Code & Build",
//   "Design",
//   "Test & Review",
//   "Deploy & Hypercare",
//   "Domain or Business Use Case",
//   "Other",
// ];

// // Stage → Activity mapping
// export const STATIC_STAGE_MAP = {
//   "Business Requirements": [
//     "Business case generation from historical cases",
//     "Business Requirement generation from call transcripts",
//     "Feasibility Analysis during requirement phase",
//     "Functional & Non-Functional Requirements",
//     "Project plan according to requirements",
//   ],
//   "Code & Build": [
//     "Code conversion/migration",
//     "Code documentation",
//     "Code Generation",
//     "Code Q&A",
//     "Code refactoring",
//     "Code Review",
//     "Code Security Assessment & fix-OWAS & NIST",
//     "Intelligent generation of commit messages",
//     "Intelligent management of branch lifecycle",
//     "Unit Test cases",
//   ],
//   Design: [
//     "Auto generation of architecture document and flowcharts-Limited (Cloud Specific AWS, Azure)",
//     "Auto generation of html from paper sketch",
//     "Auto Generation of Personas",
//     "Auto Generation of User Stories",
//     "Creating research artifacts",
//     "GenAI enabled Risk & feasibility analysis for User stories",
//     "Intelligent planning of branch policies",
//     "Rapid conceptual Prototype-build",
//   ],
//   "Test & Review": [
//     "AI Code review in IDE and PR/M",
//     "Auto remediation and CR Comments",
//     "Code generation based on testcases",
//     "Complex Boundary Value Analysis and Edge Case",
//     "Enabling Performance Testing framework",
//     "Functional testcase generation",
//     "Synthetic Data generation",
//     "Test data generation (SIT and Performance testing)",
//   ],
//   "Deploy & Hypercare": [
//     "AI Assist for Troubleshooting- Correlating alerts",
//     "Auto-configuration checks of environment parameters",
//     "Automated blue-green or canary deployments",
//     "Automatic remediation of production faults",
//     "Dialogue based diagnosis",
//     "GenAI enabled Roll back strategy for each release",
//     "Incident writeups for ticket creation & RCA",
//     "Intelligent generation of pipeline & Infra",
//     "Ticket Analysis",
//   ],
//   "Domain or Business Use Case": [
//     "Al Assist for Troubleshotting- Correlating alerts",
//     "Auto-configuration checks of environment parameters",
//     "Automated blue-green or canary deployments",
//     "Automatic remediation of production faults",
//     "Dialogue based diagnosis",
//     "GenAl enabled Roll back strategy for each release",
//     "Incident writeups for ticket creation & RCA",
//     "Intelligent generation of pipeline & Infra",
//     "Ticket Analysis",
//   ],
//   Other: [],
// };

// export const HEADERS = [
//   "ID",
//   "Last modified time",
//   "Employee ID",
//   "Date",
//   "Are you on Leave?",
//   "Stage",
//   "Business Requirements- Activity",
//   "Code & Build- Activity",
//   "Design- Activity",
//   "Test & Review- Activity",
//   "Deploy & Hypercare- Activity",
//   "Domain or Business Use Case- Activity",
//   "Other Activity",
//   "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?",
//   "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed with GHCP",
//   "Hours taken to develop with GHCP",
//   "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed without GHCP",
//   "Hours taken to develop without GHCP",
// ];

// export const COL_WITH_ITEMS = "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed with GHCP";
// export const COL_WITH_HOURS = "Hours taken to develop with GHCP";
// export const COL_WO_ITEMS = "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed without GHCP";
// export const COL_WO_HOURS = "Hours taken to develop without GHCP";

// export const STAGE_TO_COLUMN = {
//   "Business Requirements": "Business Requirements- Activity",
//   "Code & Build": "Code & Build- Activity",
//   Design: "Design- Activity",
//   "Test & Review": "Test & Review- Activity",
//   "Deploy & Hypercare": "Deploy & Hypercare- Activity",
//   "Domain or Business Use Case": "Domain or Business Use Case- Activity",
//   Other: "Other Activity",
// };

// ✅ Removed STAGE_KEYS and STATIC_STAGE_MAP because they are now fetched securely from the backend API.

export const HEADERS = [
  "ID",
  "Last modified time",
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
  "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed with GHCP",
  "Hours taken to develop with GHCP",
  "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed without GHCP",
  "Hours taken to develop without GHCP",
];

export const COL_WITH_ITEMS = "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed with GHCP";
export const COL_WITH_HOURS = "Hours taken to develop with GHCP";
export const COL_WO_ITEMS = "Number of items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) developed without GHCP";
export const COL_WO_HOURS = "Hours taken to develop without GHCP";

export const STAGE_TO_COLUMN = {
  "Business Requirements": "Business Requirements- Activity",
  "Code & Build": "Code & Build- Activity",
  Design: "Design- Activity",
  "Test & Review": "Test & Review- Activity",
  "Deploy & Hypercare": "Deploy & Hypercare- Activity",
  "Domain or Business Use Case": "Domain or Business Use Case- Activity",
  Other: "Other Activity",
};