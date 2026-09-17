import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;

function sanitizeForSubmit(d, isEditMode = false) {
  if (!d) return { categories: [], benefits: {}, metrics: {} };

  const copy = { ...d };

  if (!isEditMode) {
    delete copy.id;
  }

  delete copy.status;
  delete copy.declineReason;
  delete copy.reworkReason;
  delete copy.employeeId;
  delete copy.submittedBy;
  delete copy.createdAt;
  delete copy.lastUpdated;

  copy.categories = Array.isArray(copy.categories) ? copy.categories : [];
  copy.benefits =
    typeof copy.benefits === "object" && copy.benefits ? copy.benefits : {};
  copy.metrics =
    typeof copy.metrics === "object" && copy.metrics ? copy.metrics : {};

  return copy;
}

export default function SubmitNeuroIT() {
  const { user } = useApp();

  // ✅ detect edit mode from query
  const isEditMode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("mode") === "edit";
    } catch {
      return false;
    }
  }, []);

  const [form, setForm] = useState({
    categories: [],
    benefits: {},
    metrics: {},
    documentLink: "",
    projectId: "",
    projectName: "",
    contributors: "", // ✅ Added contributors state
  });

  // ✅ State for project validation
  const [projectList, setProjectList] = useState([]);
  const [projectError, setProjectError] = useState("");

  // ✅ State for contributor validation
  const [contributorError, setContributorError] = useState("");
  const [contributorSuccess, setContributorSuccess] = useState("");

  // ✅ Fetch project list on mount
  // ✅ Fetch project list on mount securely
  useEffect(() => {
    // 🔒 Dispatched over the secure configuration instance channel
    api
      .get("/api/addproject/project-list")
      .then((res) => setProjectList(res.data))
      .catch((err) =>
        console.error("Failed to fetch project list securely:", err),
      );
  }, []);

  // ✅ prefill when editing
  useEffect(() => {
    if (!isEditMode) return;

    const saved = sessionStorage.getItem("edit_neuroit_payload");
    if (!saved) return;

    try {
      const payload = JSON.parse(saved);
      setForm({
        ...payload,
        contributors: payload.contributors || payload.Contributors || "",
      });
    } catch (e) {
      console.error("Invalid edit_neuroit_payload", e);
      sessionStorage.removeItem("edit_neuroit_payload");
    }
  }, [isEditMode]);

  /* =========================
     HELPERS
  ========================= */
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ✅ Project Check Logic
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

  // ✅ Handle Project ID change (resets name and error)
  function handleProjectIdChange(e) {
    const val = e.target.value;
    setForm((f) => ({ ...f, projectId: val, projectName: "" }));
    setProjectError("");
  }

  // ✅ Contributor Check Logic
  // ✅ Contributor Check Logic (Refactored for Secure API)
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

  function toggleCategory(cat) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  function updateBenefit(key, enabled, text = "") {
    setForm((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        [key]: {
          enabled,
          text,
        },
      },
    }));
  }

  function updateMetric(key, value) {
    setForm((f) => ({
      ...f,
      metrics: {
        ...f.metrics,
        [key]: value,
      },
    }));
  }

  // Clear Edit Mode Function
  function clearEditMode() {
    sessionStorage.removeItem("edit_neuroit_payload");
    navigate("/submitNeuroIT");
  }

// ✅ Secure Use Case Payload Dispatch
  function submit() {
    const requiredFields = [
      "title", "projectName", "projectId", "account", "applicationsImpacted",
      "statusType", "problemDescription", "operationalImpact", "neuroitCapability",
      "toolsUsed", "automationType", "solutionDescription", "reusable",
      "scalePotential", "executiveOutcome"
    ];

    const requiredMetrics = [
      "effortSaved", "alertReductionPercent", "mttrImprovement", "psi"
    ];
    
    const missingField = requiredFields.some(key => !form[key]?.toString().trim());
    const missingMetric = requiredMetrics.some(key => !form.metrics?.[key]?.toString().trim());
    
    if (missingField || missingMetric) {
      alert("All fields are mandatory except NeuroIT Category and Business & Operational Benefits.");
      return;
    }

    if (!user?.employeeId) {
      alert("Unable to identify logged-in employee.");
      return;
    }

    const payload = {
      ...sanitizeForSubmit(form, isEditMode),
      employeeId: user.employeeId,
      submittedBy: user.name || user.employeeId,
      id: form.id
    };

    const url = isEditMode
      ? `/api/neuroit/${payload.id}`
      : `/api/neuroit`;

    // 🔒 Dispatched over proper semantic action paths to track mutations safely and block role-spoofing
    const apiCall = isEditMode ? api.patch(url, payload) : api.post(url, payload);

    apiCall
      .then(() => {
        sessionStorage.removeItem("edit_neuroit_payload");

        if (isEditMode) {
          sessionStorage.setItem("neuroit_resubmitted", "true");
        } else {
          sessionStorage.setItem("neuroit_submit_success", "1");
        }

        navigate("/neuroit");
      })
      .catch(err => {
        console.error(err);
        const errMsg = err.response?.data?.error || "Submission failed securely.";
        alert(`❌ ${errMsg}`);
      });
  }

  const input =
    "w-full px-4 py-3 rounded-lg border bg-gray-50 dark:bg-gray-800 " +
    "border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all";

  return (
    <div className="min-h-screen px-8 py-10 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">
              {isEditMode
                ? "Edit & Resubmit NeuroIT Use Case"
                : "NeuroIT Use Case Submission"}
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              Submitting as <strong>{user?.employeeId}</strong>
            </p>
          </div>

          {isEditMode && (
            <button
              onClick={clearEditMode}
              className="px-4 py-2 rounded-xl border bg-white dark:bg-gray-900 dark:text-white dark:border-gray-700 hover:bg-gray-50 transition-colors"
              title="Clear edit data"
            >
              Clear Edit Mode
            </button>
          )}
        </div>

        {/* SECTION 1 */}
        <Section title="Use Case Summary">
          <input
            className={input}
            placeholder="Use Case Title *"
            value={form.title || ""}
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

          <input
            className={input}
            placeholder="Account / LOB *"
            value={form.account || ""}
            onChange={(e) => update("account", e.target.value)}
          />

          <input
            className={input}
            placeholder="Application(s) Impacted *"
            value={form.applicationsImpacted || ""}
            onChange={(e) => update("applicationsImpacted", e.target.value)}
          />

          {/* ✅ Contributors Field with Check Button */}
          <div>
            <div className="flex gap-3">
              <input
                className={`${input} flex-1`}
                placeholder="Contributors (Comma-separated Employee IDs)"
                value={form.contributors || ""}
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

          <MultiSelect
            label="NeuroIT Category"
            options={[
              "Observability",
              "AIOps",
              "Automation",
              "GenAI",
              "Self-Healing",
            ]}
            selected={form.categories || []}
            onToggle={toggleCategory}
          />

          <select
            className={input}
            value={form.statusType || ""}
            onChange={(e) => update("statusType", e.target.value)}
          >
            <option value="">Status *</option>
            <option>Proposed</option>
            <option>Initiated</option>
            <option>Implemented</option>
          </select>
        </Section>

        {/* SECTION 2 */}
        <Section title="Problem Statement (Pre‑NeuroIT)">
          <textarea
            className={input}
            placeholder="Operational Challenge *"
            value={form.problemDescription || ""}
            onChange={(e) => update("problemDescription", e.target.value)}
          />

          <textarea
            className={input}
            placeholder="Impact on SLA / MTTR / Availability *"
            value={form.operationalImpact || ""}
            onChange={(e) => update("operationalImpact", e.target.value)}
          />
        </Section>

        {/* SECTION 3 */}
        <Section title="NeuroIT Solution Overview">
          <input
            className={input}
            placeholder="NeuroIT Capability Applied *"
            value={form.neuroitCapability || ""}
            onChange={(e) => update("neuroitCapability", e.target.value)}
          />

          <input
            className={input}
            placeholder="Tool(s) Used *"
            value={form.toolsUsed || ""}
            onChange={(e) => update("toolsUsed", e.target.value)}
          />

          <select
            className={input}
            value={form.automationType || ""}
            onChange={(e) => update("automationType", e.target.value)}
          >
            <option value="">Automation / AI Type *</option>
            <option>GenAI</option>
            <option>Non-GenAI</option>
          </select>

          <textarea
            className={input}
            placeholder="Solution Description *"
            value={form.solutionDescription || ""}
            onChange={(e) => update("solutionDescription", e.target.value)}
          />
        </Section>

        {/* SECTION 4 */}
        <Section title="Business & Operational Benefits">
          {[
            ["Alert Noise Reduction", "alertReduction"],
            ["Faster Triage / MTTR Improvement", "mttr"],
            ["Productivity / Effort Savings", "productivity"],
            ["Improved availability / SLA adherence", "availability"],
            ["Risk reduction", "risk"],
          ].map(([label, id]) => {
            const benefit = form.benefits?.[id] || { enabled: false, text: "" };

            return (
              <Benefit
                key={id}
                label={label}
                id={id}
                enabled={benefit.enabled}
                value={benefit.text}
                onChange={updateBenefit}
              />
            );
          })}
        </Section>

        {/* SECTION 5 */}
        <Section title="Measurable Impact">
          <input
            className={input}
            placeholder="Effort Saved (Hours) *"
            value={form.metrics?.effortSaved || ""}
            onChange={(e) => updateMetric("effortSaved", e.target.value)}
          />
          <input
            className={input}
            placeholder="Alert Reduction (%) *"
            value={form.metrics?.alertReductionPercent || ""}
            onChange={(e) =>
              updateMetric("alertReductionPercent", e.target.value)
            }
          />
          <input
            className={input}
            placeholder="MTTR / MTTD Improvement *"
            value={form.metrics?.mttrImprovement || ""}
            onChange={(e) => updateMetric("mttrImprovement", e.target.value)}
          />
          <input
            className={input}
            placeholder="Production Stability Improvement *"
            value={form.metrics?.psi || ""}
            onChange={(e) => updateMetric("psi", e.target.value)}
          />
        </Section>

        {/* SECTION 6 */}
        <Section title="Reusability & Scale">
          <select
            className={input}
            value={form.reusable || ""}
            onChange={(e) => update("reusable", e.target.value)}
          >
            <option value="">Reusable? *</option>
            <option>Yes</option>
            <option>No</option>
          </select>

          <select
            className={input}
            value={form.scalePotential || ""}
            onChange={(e) => update("scalePotential", e.target.value)}
          >
            <option value="">Scale Potential *</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </Section>

        {/* SECTION 7 */}
        <Section title="Executive One‑Line Outcome *">
          <textarea
            className={input}
            placeholder="This NeuroIT use case reduced..."
            value={form.executiveOutcome || ""}
            onChange={(e) => update("executiveOutcome", e.target.value)}
          />
        </Section>
        {/* SECTION 8: Document Link Field */}
        <Section title="Supporting Documentation">
          <input
            className={input}
            placeholder="Document Link "
            value={form.documentLink || ""}
            onChange={(e) => update("documentLink", e.target.value)}
          />
        </Section>

        <div className="flex justify-end gap-4 border-t dark:border-gray-700 pt-6">
          <button
            onClick={() => navigate("/neuroit")}
            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            {isEditMode
              ? "Resubmit NeuroIT Use Case"
              : "Submit NeuroIT Use Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   HELPERS
========================= */
function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-5">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function MultiSelect({ label, options, selected, onToggle }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {label}
      </p>
      <div className="flex flex-wrap gap-4">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
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

function Benefit({ label, id, enabled, value, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/80 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
      <div className="flex items-center gap-3 sm:w-64">
        <input
          type="checkbox"
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
          checked={enabled}
          onChange={(e) => onChange(id, e.target.checked, value)}
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>

      <input
        className="flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 disabled:bg-gray-100 disabled:dark:bg-gray-900 disabled:opacity-50 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        placeholder="Details"
        value={value}
        disabled={!enabled}
        onChange={(e) => onChange(id, true, e.target.value)}
      />
    </div>
  );
}
