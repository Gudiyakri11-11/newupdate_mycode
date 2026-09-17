import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;

const CATEGORIES = [
  "IT Ops",
  "DevOps",
  "QA",
  "Security",
  "PMO",
  "Finance",
  "GenAI",
  "Other",
];

// ✅ keep only editable fields (avoid carrying status/reasons/id etc.)
function pickEditableFields(bot) {
  if (!bot) return {};
  return {
    name: bot.name ?? bot.Name ?? "",
    description: bot.description ?? bot.Description ?? "",
    useCase: bot.useCase ?? bot.UseCase ?? "",
    category: bot.category ?? bot.Category ?? "",
    capabilities: bot.capabilities ?? bot.Capabilities ?? "",
    demoLink: bot.demoLink ?? bot.DemoLink ?? "",
    owner: bot.owner ?? bot.Owner ?? "",
    projectName: bot.projectName ?? bot.ProjectName ?? "",
    projectId: bot.projectId ?? bot.ProjectId ?? "",
    contributors: bot.contributors ?? bot.Contributors ?? "", // ✅ Added Contributors
  };
}

export default function SubmitBot() {
  const [form, setForm] = useState({});
  const { user } = useApp(); // ✅ HOOK USED INSIDE COMPONENT
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBotMeta, setEditingBotMeta] = useState(null); // optional display info (botId, status)

  // ✅ State for project validation
  const [projectList, setProjectList] = useState([]);
  const [projectError, setProjectError] = useState("");

  // ✅ State for contributor validation
  const [contributorError, setContributorError] = useState("");
  const [contributorSuccess, setContributorSuccess] = useState("");

  // ✅ Fetch project list on mount
  useEffect(() => {
    // 🔒 Dispatched over the secure wrapper channel
    api
      .get("/api/addproject/project-list")
      .then((res) => setProjectList(res.data))
      .catch((err) =>
        console.error("Failed to fetch project list securely:", err),
      );
  }, []);

  // detect mode via url (no router library needed)
  const mode = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // ✅ If BotStore stored payload, prefill it
    const saved = sessionStorage.getItem("edit_bot_payload");

    if (mode === "edit" && saved) {
      try {
        const bot = JSON.parse(saved);
        setForm({
          ...pickEditableFields(bot),
          id: bot.id ?? bot.botId ?? bot.BotId,
        });

        setIsEditMode(true);

        // keep some non-editable meta just for showing user
        setEditingBotMeta({
          botId: bot.id ?? bot.botId ?? bot.BotId ?? null,
          status: bot.status ?? bot.Status ?? null,
        });
      } catch (e) {
        console.error("Failed to parse edit_bot_payload", e);
        sessionStorage.removeItem("edit_bot_payload");
      }
    }
  }, [mode]);

  function isValidUrl(v) {
    if (!v) return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }

  function clearEditMode() {
    sessionStorage.removeItem("edit_bot_payload");
    setIsEditMode(false);
    setEditingBotMeta(null);
    setForm({});
    // optional: remove query param by navigating cleanly
    navigate("/submit");
  }

  // ✅ Project Check Logic (UNCOMMENTED)
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
      setForm((f) => ({ ...f, projectName: name }));
      setProjectError("");
    } else {
      // Clear the project name and show error
      setForm((f) => ({ ...f, projectName: "" }));
      setProjectError("This project does not exist.");
    }
  }

  // ✅ Handle Project ID change (resets name and error)
  function handleProjectIdChange(e) {
    const val = e.target.value;
    setForm((f) => ({ ...f, projectId: val, projectName: "" }));
    setProjectError("");
  }

  // ✅ Contributor Check Logic (DUPLICATE REMOVED, SECURE ONE KEPT)
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
      // 🔒 Swapped native fetch for secure api client instance
      const response = await api.post("/api/auth/validate-contributors", {
        contributors: idArray,
      });
      const data = response.data;

      // Update the input box to ONLY contain valid IDs
      setForm((f) => ({
        ...f,
        contributors: data.validContributors.join(", "),
      }));

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

  // ✅ Secure Payload Dispatch
  function submitAgent() {
    if (!form.name || !form.description || !form.useCase) {
      alert("Agent Name, Description, and Use Case are required");
      return;
    }

    if (!isValidUrl(form.demoLink)) {
      alert("Please provide a valid demo URL");
      return;
    }

    if (!user?.employeeId) {
      alert("Unable to identify logged-in employee");
      return;
    }

    const payload = {
      ...pickEditableFields(form),
      employeeId: user.employeeId,
      submittedBy: user.name || user.employeeId,
      id: form.id,
    };

    const url = isEditMode ? `/api/bots/${payload.id}` : `/api/bots`;

    // 🔒 Dispatched over structural api methods to automatically enforce CSRF alignment
    const apiCall = isEditMode
      ? api.patch(url, payload)
      : api.post(url, payload);

    apiCall
      .then(() => {
        sessionStorage.removeItem("edit_bot_payload");

        if (isEditMode) {
          sessionStorage.setItem("bot_resubmitted", "1");
        } else {
          sessionStorage.setItem("bot_submit_success", "1");
        }

        navigate("/botstore");
      })
      .catch((err) => {
        const errMsg =
          err.response?.data?.error ||
          "Failed to submit bot context records securely.";
        alert(`❌ ${errMsg}`);
      });
  }
  
  const inputClass =
    "w-full px-4 py-3 rounded-lg border transition-colors " +
    "bg-gray-50 dark:bg-gray-800 " +
    "border-gray-300 dark:border-gray-700 " +
    "text-gray-900 dark:text-gray-100 " +
    "placeholder-gray-500 dark:placeholder-gray-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div
      className="min-h-screen px-8 py-10
                 bg-gray-100 dark:bg-gray-900
                 text-gray-900 dark:text-gray-100"
    >
      <div
        className="max-w-4xl mx-auto rounded-2xl p-8 shadow space-y-6
                   bg-white dark:bg-gray-800"
      >
        <h2 className="text-xl font-semibold">
          {isEditMode
            ? "Edit & Resubmit Your Bot"
            : "Submit Your Bot to the Store"}
        </h2>

        {/* ✅ show edit info if editing */}
        {isEditMode && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-4 text-sm">
            <div className="font-semibold">
              You are editing a previously declined/rework bot.
            </div>
            {editingBotMeta?.botId && (
              <div>
                Original Bot ID: <b>{editingBotMeta.botId}</b>
              </div>
            )}
            {editingBotMeta?.status && (
              <div>
                Previous Status: <b>{editingBotMeta.status}</b>
              </div>
            )}
            <div className="mt-3 flex gap-3">
              <button
                onClick={clearEditMode}
                className="px-4 py-2 rounded-lg border border-yellow-300 bg-white"
              >
                Clear Edit Mode
              </button>
            </div>
          </div>
        )}

        {/* ✅ READ-ONLY INFO */}
        <p className="text-sm text-gray-500">
          Submitting as <strong>{user?.employeeId}</strong>
        </p>

        <input
          className={inputClass}
          placeholder="Agent Name *"
          value={form.name || ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        {/* ✅ Project ID Field with Check Button */}
        <div>
          <div className="flex gap-3">
            <input
              className={`${inputClass} flex-1`}
              placeholder="Project ID"
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
          className={`${inputClass} bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-80`}
          placeholder="Project Name (Auto-filled)"
          value={form.projectName || ""}
          readOnly
          title="This field is auto-filled by checking the Project ID"
        />

        <textarea
          className={inputClass}
          placeholder="Short Description *"
          value={form.description || ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />

        <input
          className={inputClass}
          placeholder="Primary Use Case *"
          value={form.useCase || ""}
          onChange={(e) => setForm((f) => ({ ...f, useCase: e.target.value }))}
        />

        <select
          className={inputClass}
          value={form.category || ""}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="">Select Category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <textarea
          className={inputClass}
          placeholder="What the agent can do (| separated)"
          value={form.capabilities || ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, capabilities: e.target.value }))
          }
        />

        <input
          className={inputClass}
          placeholder="Demo / Video / Docs URL (optional)"
          value={form.demoLink || ""}
          onChange={(e) => setForm((f) => ({ ...f, demoLink: e.target.value }))}
        />

        <input
          className={inputClass}
          placeholder="Owner / SME"
          value={form.owner || ""}
          onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
        />

        {/* ✅ Contributors Field with Check Button */}
        <div>
          <div className="flex gap-3">
            <input
              className={`${inputClass} flex-1`}
              placeholder="Contributors (Comma-separated Employee IDs)"
              value={form.contributors || ""}
              onChange={(e) => {
                setForm((f) => ({ ...f, contributors: e.target.value }));
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

        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={() => navigate("/botstore")}
            className="px-6 py-2 rounded-lg border"
          >
            Cancel
          </button>

          <button
            onClick={submitAgent}
            className="bg-green-600 hover:bg-green-700
                       text-white px-8 py-3 rounded-xl"
          >
            {isEditMode ? "Resubmit for Review" : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}