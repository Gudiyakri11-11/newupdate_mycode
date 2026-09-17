import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;

const GENAI_TYPE_OPTIONS = [
  "Copilot",
  "LLM",
  "RAG",
  "Agentic AI",
  "Prompt Engineering",
  "Other",
];

const BENEFIT_FIELDS = [
  { key: "effortReduction", label: "Effort Reduction Achieved" },
  { key: "productivityImprovement", label: "Productivity Improvement" },
  { key: "costSavings", label: "Cost Savings" },
  { key: "qualityImprovement", label: "Quality Improvement" },
  { key: "turnaroundTimeReduction", label: "Turnaround Time Reduction" },
  { key: "riskComplianceImprovement", label: "Risk / Compliance Improvement" },
];

// ✅ Replace your current safeParseJSON with this robust version
function safeParseJSON(v, fallback) {
  if (!v) return fallback;

  let parsed = v;

  // Keep unwrapping if the database accidentally double-stringified it
  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }

  // Ensure it's actually an object, otherwise return the fallback {}
  if (typeof parsed !== "object" || parsed === null) {
    return fallback;
  }

  return parsed;
}

function sanitizeForEdit(raw) {
  if (!raw) return null;

  const copy = { ...raw };

  delete copy.status;
  delete copy.declineReason;
  delete copy.reworkReason;
  delete copy.employeeId;
  delete copy.submittedBy;
  delete copy.createdAt;
  delete copy.lastUpdated;

  const genaiTypes = Array.isArray(copy.genaiTypes)
    ? copy.genaiTypes
    : typeof copy.genaiTypes === "string"
      ? copy.genaiTypes
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const benefits = safeParseJSON(copy.benefits, {});

  return {
    ...copy,
    genaiTypes,
    benefits,
  };
}

export default function SubmitUseCase() {
  const { user } = useApp();
  const [contributorError, setContributorError] = useState("");
  const [contributorSuccess, setContributorSuccess] = useState("");

  const isEditMode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("mode") === "edit";
    } catch {
      return false;
    }
  }, []);

  const [form, setForm] = useState({
    // Section 1
    title: "",
    projectName: "", // ✅ Added Project Name state
    projectId: "", // ✅ Added Project ID state
    contributors: "", // ✅ NEW: Contributors state added
    category: "",
    domain: "",
    client: "",
    team: "",
    submissionDate: "",

    // Section 2
    problemDescription: "",
    painPoints: "",
    processImpacted: "",

    // Section 3
    solutionDescription: "",
    genaiTypes: [],

    // Section 4
    requirementsHelp: "",
    designHelp: "",
    developmentHelp: "",
    testingHelp: "",
    supportHelp: "",

    // Section 5
    platforms: "",
    models: "",
    integrationPoints: "",

    // Section 6
    benefits: {},

    // Section 8
    beforeProcess: "",
    afterProcess: "",
    accuracyImprovement: "",
    scalabilityImprovement: "",

    // Section 11
    reusable: "",
    scalabilityPotential: "",
    futureEnhancements: "",

    // Section 12
    demoLink: "",
    docLink: "",
    repoLink: "",
  });

  // ✅ NEW: State for project validation
  const [projectList, setProjectList] = useState([]);
  const [projectError, setProjectError] = useState("");

  // ✅ NEW: Fetch project list on mount
  // ✅ NEW: Fetch project list on mount securely
  useEffect(() => {
    // 🔒 Dispatched over the secure configuration instance channel
    api
      .get("/api/addproject/project-list")
      .then((res) => setProjectList(res.data))
      .catch((err) =>
        console.error("Failed to fetch project list securely:", err),
      );
  }, []);

  useEffect(() => {
    if (!isEditMode) return;

    const saved = sessionStorage.getItem("edit_usecase_payload");
    if (!saved) return;

    try {
      const raw = JSON.parse(saved);
      const cleaned = sanitizeForEdit(raw);
      if (cleaned) setForm(cleaned);
    } catch {
      sessionStorage.removeItem("edit_usecase_payload");
    }
  }, [isEditMode]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ✅ NEW: Contributor Check Logic
  // ✅ NEW: Contributor Check Logic (Refactored for Secure API)
  async function handleCheckContributors() {
    if (!form.contributors) {
      setContributorError("Please enter contributor IDs first.");
      setContributorSuccess("");
      return;
    }

    const idArray = form.contributors
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    try {
      // 🔒 Swapped native fetch for secure api client instance containing token mapping metrics
      const response = await api.post("/api/auth/validate-contributors", {
        contributors: idArray,
      });
      const data = response.data;

      // Update the input box to ONLY contain valid IDs
      update("contributors", data.validContributors.join(", "));

      if (data.invalidContributors.length > 0) {
        setContributorError(
          `Invalid IDs removed: ${data.invalidContributors.join(", ")}`,
        );
        setContributorSuccess("");
      } else {
        setContributorError("");
        setContributorSuccess("✅ All contributor IDs are valid!");
      }
    } catch (err) {
      console.error(err);
      setContributorError("Failed to validate contributors securely.");
      setContributorSuccess("");
    }
  }

  // ✅ NEW: Project Check Logic
  function handleCheckProject() {
    if (!form.projectId) {
      setProjectError("Please enter a Project ID first.");
      return;
    }

    // Check against the fetched project list
    const foundProject = projectList.find(
      (p) =>
        String(p.ProjectId).trim() === String(form.projectId).trim() ||
        String(p.project_id).trim() === String(form.projectId).trim(),
    );

    if (foundProject) {
      // Auto-fill the project name and clear errors
      const name = foundProject.ProjectName || foundProject.project_name;
      update("projectName", name);
      setProjectError("");
    } else {
      // Clear the project name and show error
      update("projectName", "");
      setProjectError("This project does not exist.");
    }
  }

  // ✅ NEW: Handle Project ID change (resets name and error)
  function handleProjectIdChange(e) {
    const val = e.target.value;
    setForm((f) => ({ ...f, projectId: val, projectName: "" }));
    setProjectError("");
  }

  function toggleGenAIType(value) {
    setForm((f) => ({
      ...f,
      genaiTypes: f.genaiTypes.includes(value)
        ? f.genaiTypes.filter((v) => v !== value)
        : [...f.genaiTypes, value],
    }));
  }

  function setBenefit(key, enabled, text = "") {
    setForm((f) => ({
      ...f,
      benefits: {
        ...f.benefits,
        [key]: { enabled, text },
      },
    }));
  }

  function isValidUrl(v) {
    if (!v) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }

  // ✅ Secure Use Case Payload Dispatch
  function submit() {
    if (
      !form.title ||
      !form.category ||
      !form.problemDescription ||
      !form.solutionDescription
    ) {
      alert(
        "Please fill all required fields (Title, Category, Problem Description, Solution Description).",
      );
      return;
    }

    if (!user?.employeeId) {
      alert("Unable to identify logged‑in employee");
      return;
    }

    if (
      !isValidUrl(form.demoLink) ||
      !isValidUrl(form.docLink) ||
      !isValidUrl(form.repoLink)
    ) {
      alert(
        "Please provide valid URLs for Demo/Documentation/Repository links (or keep them empty).",
      );
      return;
    }

    const payload = {
      ...form,
      employeeId: user.employeeId,
      submittedBy: user.name || user.employeeId,
      id: form.id,
    };

    const url = isEditMode ? `/api/usecases/${payload.id}` : `/api/usecases`;

    // 🔒 Dispatched over proper semantic action paths to track background modifications safely
    const apiCall = isEditMode
      ? api.patch(url, payload)
      : api.post(url, payload);

    apiCall
      .then(() => {
        sessionStorage.removeItem("edit_usecase_payload");

        if (isEditMode) {
          sessionStorage.setItem("usecase_resubmitted", "1");
        } else {
          sessionStorage.setItem("usecase_submit_success", "1");
        }

        navigate("/usecase");
      })
      .catch((err) => {
        console.error(err);
        const errMsg =
          err.response?.data?.error || "Failed to submit use case.";
        alert(`❌ ${errMsg}`);
      });
  }

  function clearEditMode() {
    sessionStorage.removeItem("edit_usecase_payload");
    navigate("/submitUseCase");
  }

  const input =
    "w-full px-4 py-3 rounded-lg border transition-colors " +
    "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 " +
    "text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400";

  return (
    <div className="min-h-screen px-8 py-10 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditMode
                ? "Edit & Resubmit GenAI Use Case"
                : "GenAI Use Case Submission"}
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Submitting as <strong>{user?.employeeId}</strong> (Submitted By:{" "}
              <strong>{user?.name || user?.employeeId}</strong>)
            </p>
          </div>

          {isEditMode && (
            <button
              onClick={clearEditMode}
              className="px-4 py-2 rounded-xl border bg-white dark:bg-gray-900"
            >
              Clear Edit Mode
            </button>
          )}
        </div>

        {/* ========== Section 1: Basic Details ========== */}
        <Section title="Section 1: Basic Details">
          <input
            className={input}
            placeholder="Use Case Title *"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />

          {/* ✅ Project ID Field with Check Button */}
          <div>
            <div className="flex gap-3">
              <input
                className={`${input} flex-1`}
                placeholder="Project ID *"
                value={form.projectId || ""}
                onChange={handleProjectIdChange}
              />
              <button
                type="button"
                onClick={handleCheckProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md active:scale-95 transition-all"
              >
                Check
              </button>
            </div>
            {/* Error Message */}
            {projectError && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2 font-medium underline decoration-red-500 underline-offset-4">
                {projectError}
              </p>
            )}
          </div>

          {/* ✅ Project Name Field (Read Only) */}
          <input
            className={`${input} bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-80`}
            placeholder="Project Name (Auto-filled) *"
            value={form.projectName || ""}
            readOnly
            title="This field is auto-filled by checking the Project ID"
          />

          <select
            className={input}
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Select Category *</option>
            <option>Development</option>
            <option>Testing</option>
            <option>Support</option>
            <option>Compliance</option>
            <option>Analytics</option>
            <option>Other</option>
          </select>

          <input
            className={input}
            placeholder="Business Function / Domain"
            value={form.domain}
            onChange={(e) => update("domain", e.target.value)}
          />

          <input
            className={input}
            placeholder="Industry / Client Name (optional)"
            value={form.client}
            onChange={(e) => update("client", e.target.value)}
          />

          <input
            className={input}
            placeholder="Team / Organization"
            value={form.team}
            onChange={(e) => update("team", e.target.value)}
          />

          {/* ✅ NEW: Contributors Field Added */}
          {/* <input
            className={input}
            placeholder="Contributors (Comma-separated Employee IDs)"
            value={form.contributors}
            onChange={(e) => update("contributors", e.target.value)}
          /> */}

          {/* ✅ UPDATED: Contributors Field with Check Button */}
          <div>
            <div className="flex gap-3">
              <input
                className={`${input} flex-1`}
                placeholder="Contributors (Comma-separated Employee IDs)"
                value={form.contributors}
                onChange={(e) => {
                  update("contributors", e.target.value);
                  setContributorError("");
                  setContributorSuccess("");
                }}
              />
              <button
                type="button"
                onClick={handleCheckContributors}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md active:scale-95 transition-all"
              >
                Check
              </button>
            </div>

            {/* Error / Success Messages */}
            {contributorError && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2 font-medium underline decoration-red-500 underline-offset-4">
                {contributorError}
              </p>
            )}
            {contributorSuccess && (
              <p className="text-green-600 dark:text-green-400 text-sm mt-2 font-medium">
                {contributorSuccess}
              </p>
            )}
          </div>

          <input
            type="date"
            className={input}
            value={form.submissionDate}
            onChange={(e) => update("submissionDate", e.target.value)}
          />
        </Section>

        {/* ========== Section 2: Problem Statement ========== */}
        <Section title="Section 2: Problem Statement">
          <textarea
            className={input}
            placeholder="Problem Description (Pre‑GenAI) *"
            value={form.problemDescription}
            onChange={(e) => update("problemDescription", e.target.value)}
          />

          <textarea
            className={input}
            placeholder="Key Pain Points Identified"
            value={form.painPoints}
            onChange={(e) => update("painPoints", e.target.value)}
          />

          <input
            className={input}
            placeholder="Process / Area Impacted"
            value={form.processImpacted}
            onChange={(e) => update("processImpacted", e.target.value)}
          />
        </Section>

        {/* ========== Section 3: GenAI Solution Overview ========== */}
        <Section title="Section 3: GenAI Solution Overview">
          <textarea
            className={input}
            placeholder="GenAI Solution Description *"
            value={form.solutionDescription}
            onChange={(e) => update("solutionDescription", e.target.value)}
          />

          <MultiSelect
            label="Type of GenAI Used"
            options={GENAI_TYPE_OPTIONS}
            selected={form.genaiTypes}
            onToggle={toggleGenAIType}
          />
        </Section>

        {/* ========== Section 4: How GenAI Helped During Development ========== */}
        <Section title="Section 4: How GenAI Helped During Development">
          <textarea
            className={input}
            placeholder="Requirements & Analysis Contribution"
            value={form.requirementsHelp}
            onChange={(e) => update("requirementsHelp", e.target.value)}
          />
          <textarea
            className={input}
            placeholder="Design / Architecture Contribution"
            value={form.designHelp}
            onChange={(e) => update("designHelp", e.target.value)}
          />
          <textarea
            className={input}
            placeholder="Development / Coding Contribution"
            value={form.developmentHelp}
            onChange={(e) => update("developmentHelp", e.target.value)}
          />
          <textarea
            className={input}
            placeholder="Testing / Validation Contribution"
            value={form.testingHelp}
            onChange={(e) => update("testingHelp", e.target.value)}
          />
          <textarea
            className={input}
            placeholder="Support / Maintenance Contribution"
            value={form.supportHelp}
            onChange={(e) => update("supportHelp", e.target.value)}
          />
        </Section>

        {/* ========== Section 5: Tools & Technologies ========== */}
        <Section title="Section 5: Tools & Technologies">
          <input
            className={input}
            placeholder="GenAI Platform(s) Used"
            value={form.platforms}
            onChange={(e) => update("platforms", e.target.value)}
          />
          <input
            className={input}
            placeholder="Models / Agents Used"
            value={form.models}
            onChange={(e) => update("models", e.target.value)}
          />
          <input
            className={input}
            placeholder="Integration Points (if any)"
            value={form.integrationPoints}
            onChange={(e) => update("integrationPoints", e.target.value)}
          />
        </Section>

        {/* ========== Section 6: Business Benefits ========== */}
        <Section title="Section 6: Business Benefits">
          {BENEFIT_FIELDS.map((b) => {
            const benefit = form.benefits[b.key] || {
              enabled: false,
              text: "",
            };

            return (
              <BenefitRow
                key={b.key}
                label={b.label}
                enabled={benefit.enabled}
                value={benefit.text}
                onChange={(enabled, text) => setBenefit(b.key, enabled, text)}
              />
            );
          })}
        </Section>

        {/* ========== Section 7: Before vs After ========== */}
        <Section title="Section 7: Before vs After">
          <textarea
            className={input}
            placeholder="Before GenAI – Process Description"
            value={form.beforeProcess}
            onChange={(e) => update("beforeProcess", e.target.value)}
          />
          <textarea
            className={input}
            placeholder="After GenAI – Process Description"
            value={form.afterProcess}
            onChange={(e) => update("afterProcess", e.target.value)}
          />
          <input
            className={input}
            placeholder="Accuracy Improvement Observed"
            value={form.accuracyImprovement}
            onChange={(e) => update("accuracyImprovement", e.target.value)}
          />
          <input
            className={input}
            placeholder="Scalability Improvement Observed"
            value={form.scalabilityImprovement}
            onChange={(e) => update("scalabilityImprovement", e.target.value)}
          />
        </Section>

        {/* ========== Section 8: Reusability & Scalability ========== */}
        <Section title="Section 8: Reusability & Scalability">
          <select
            className={input}
            value={form.reusable}
            onChange={(e) => update("reusable", e.target.value)}
          >
            <option value="">Reusable Across Teams / Projects?</option>
            <option>Yes</option>
            <option>No</option>
          </select>

          <select
            className={input}
            value={form.scalabilityPotential}
            onChange={(e) => update("scalabilityPotential", e.target.value)}
          >
            <option value="">Scalability Potential</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <textarea
            className={input}
            placeholder="Future Enhancements Planned"
            value={form.futureEnhancements}
            onChange={(e) => update("futureEnhancements", e.target.value)}
          />
        </Section>

        {/* ========== Section 9: Supporting Artifacts ========== */}
        <Section title="Section 9: Supporting Artifacts">
          <input
            className={input}
            placeholder="Demo / Screenshot Link (optional)"
            value={form.demoLink}
            onChange={(e) => update("demoLink", e.target.value)}
          />
          <input
            className={input}
            placeholder="Documentation Link (optional)"
            value={form.docLink}
            onChange={(e) => update("docLink", e.target.value)}
          />
          <input
            className={input}
            placeholder="Repository / Code Link (optional)"
            value={form.repoLink}
            onChange={(e) => update("repoLink", e.target.value)}
          />
        </Section>

        {/* ========== SUBMIT ========== */}
        <div className="flex justify-end gap-3 pt-6">
          <button
            onClick={() => navigate("/UseCaseStore")}
            className="px-6 py-2 rounded-lg border"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl"
          >
            {isEditMode ? "Resubmit Use Case" : "Submit Use Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =================== HELPERS =================== */
function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function MultiSelect({ label, options, selected = [], onToggle }) {
  return (
    <div>
      <p className="font-medium mb-2">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={() => onToggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function BenefitRow({ label, enabled, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked, value)}
      />

      <span className="w-64 font-medium">{label}</span>

      <input
        className="flex-1 px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
        placeholder="Details"
        value={value}
        disabled={!enabled}
        onChange={(e) => onChange(true, e.target.value)}
      />
    </div>
  );
}
