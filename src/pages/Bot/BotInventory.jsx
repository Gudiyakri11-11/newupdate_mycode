import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import api from "../../Api";

const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function Inventory() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Details panel
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Filter bar state
  const [category, setCategory] = useState("ALL");
  const [project, setProject] = useState("ALL");
  const [owner, setOwner] = useState("");
  const [search, setSearch] = useState("");

  const [applied, setApplied] = useState({
    category: "ALL",
    project: "ALL",
    owner: "",
    search: "",
  });

  /* ===============================
      FETCH ONLY APPROVED BOTS
  ================================ */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 🔒 Dispatched over the secure config wrapper channel to maintain session validation
        // In BotInventory.jsx
        const response = await api.get(
          "/api/bots?status=APPROVED&scope=global",
        );
        setBots(response.data);
      } catch (e) {
        console.error("Failed to load bots from secure endpoint registry", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===============================
     CATEGORY LIST
  ================================ */
  const categories = useMemo(() => {
    const set = new Set(bots.map((b) => b.category).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [bots]);

  /* ===============================
     PROJECTS DROPDOWN LIST
  ================================ */
  const projects = useMemo(() => {
    const set = new Set(
      bots.map((b) => b.projectName || b.ProjectName).filter(Boolean),
    );
    return ["ALL", ...Array.from(set).sort()];
  }, [bots]);

  /* ===============================
     FILTER LOGIC
  ================================ */
  const filtered = useMemo(() => {
    const { category, project, owner, search } = applied;

    return bots.filter((b) => {
      const matchesCategory =
        category === "ALL" ? true : (b.category || "") === category;

      const currentBotProject = b.projectName || b.ProjectName || "";
      const matchesProject =
        project === "ALL" ? true : currentBotProject === project;

      const ownerVal = (
        b.owner ||
        b.createdBy ||
        b.submittedBy ||
        ""
      ).toLowerCase();

      const matchesOwner = owner.trim()
        ? ownerVal.includes(owner.trim().toLowerCase())
        : true;

      const blob = [
        b.name,
        b.category,
        b.useCase,
        b.description,
        b.projectName,
        b.projectId,
        b.contributors || b.Contributors,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = search.trim()
        ? blob.includes(search.trim().toLowerCase())
        : true;

      return matchesCategory && matchesProject && matchesOwner && matchesSearch;
    });
  }, [bots, applied]);

  const applyFilters = () => {
    setApplied({ category, project, owner, search });
    setPage(1);
  };

  const clearFilters = () => {
    setCategory("ALL");
    setProject("ALL");
    setOwner("");
    setSearch("");
    setApplied({ category: "ALL", project: "ALL", owner: "", search: "" });
    setPage(1);
  };

  /* ===============================
     CSV DOWNLOAD DATA UTILITY
  ================================ */
  // Safe string escaper for CSV fields to handle commas or new lines cleanly
  const escapeCSV = (val) => {
    if (val === undefined || val === null) return "";
    let str = String(val);
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const downloadProjectData = () => {
    if (filtered.length === 0) {
      alert("No data found matching your current filter choices to download.");
      return;
    }

    // Table Columns Configuration
    const headers = [
      "Bot ID",
      "Bot Name",
      "Project Name",
      "Project ID",
      "Primary Use Case",
      "Category",
      "Owner / SME",
      "Submitted By",
      "Status",
      "Description",
      "Capabilities",
    ];

    const rows = filtered.map((b) => [
      escapeCSV(b.id || b.BotId),
      escapeCSV(b.name || b.Name),
      escapeCSV(b.projectName || b.ProjectName),
      escapeCSV(b.projectId || b.ProjectId),
      escapeCSV(b.useCase || b.UseCase),
      escapeCSV(b.category || b.Category),
      escapeCSV(b.owner || b.Owner),
      escapeCSV(b.submittedBy || b.SubmittedBy),
      escapeCSV(b.contributors || b.Contributors),
      escapeCSV(b.status || b.Status),
      escapeCSV(b.description || b.Description),
      escapeCSV(b.capabilities || b.Capabilities),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    // Browser Anchor Generation and Execution
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Dynamic Custom File Naming
    const targetFileName =
      applied.project === "ALL"
        ? "all_projects_inventory.csv"
        : `${applied.project.toLowerCase().replace(/\s+/g, "_")}_inventory.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", targetFileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Logic
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              Bot Inventory
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Verified Assets Cluster — {filtered.length} Units Found
            </p>
          </div>
          <button
            onClick={() => navigate("/botstore")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Store
          </button>
        </div>

        {/* Dynamic View Rendering */}
        {selectedAgent ? (
          <AgentDetails
            agent={selectedAgent}
            onBack={() => setSelectedAgent(null)}
          />
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px] w-full">
                <FilterInput
                  label="Search Registry"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search name, usecase..."
                />
              </div>
              <div className="flex-1 min-w-[140px] w-full">
                <FilterSelect
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={categories}
                />
              </div>
              <div className="flex-1 min-w-[140px] w-full">
                <FilterSelect
                  label="Project"
                  value={project}
                  onChange={setProject}
                  options={projects}
                />
              </div>
              <div className="flex-1 min-w-[140px] w-full">
                <FilterInput
                  label="Owner ID"
                  value={owner}
                  onChange={setOwner}
                  placeholder="Search owner..."
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={applyFilters}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-sm transition-colors"
                >
                  Reset
                </button>
                {/* ✅ Added dynamic Export Excel/CSV download button option */}
                <button
                  onClick={downloadProjectData}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  title="Download current filtered data slice to CSV spreadsheet"
                >
                  <svg
                    className="h-4 w-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Data
                </button>
              </div>
            </div>

            {/* Table Section */}
            <Section
              title="Approved Bots Archive"
              totalItems={filtered.length}
              page={page}
              onPage={(dir) => setPage((p) => p + dir)}
              loading={loading}
            >
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <TableHeader />
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {loading ? (
                    <div className="p-10 text-center text-gray-500 font-medium">
                      Fetching Registry...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 italic">
                      No matches found in archive.
                    </div>
                  ) : (
                    paginatedData.map((b) => (
                      <InventoryCard
                        key={b.id || b.BotId}
                        agent={b}
                        onClick={() => setSelectedAgent(b)}
                      />
                    ))
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS: TABLE & LISTS
// ==========================================

function Section({ title, totalItems, page, onPage, loading, children }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
            {title}
          </h2>
          <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300 font-medium">
            {totalItems} Total
          </span>
        </div>

        {totalPages > 1 && !loading && (
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
            <button
              disabled={page === 1}
              onClick={() => onPage(-1)}
              className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => onPage(1)}
              className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function TableHeader() {
  return (
    <div className="flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
      <div className="w-12">ID</div>
      <div className="flex-1 min-w-0 pr-4">Bot Name</div>
      <div className="w-44 hidden md:block pr-2">Project (ID/Name)</div>
      <div className="w-28 hidden lg:block pr-2">Use Case</div>
      <div className="w-24 hidden lg:block pr-2">Category</div>
      <div className="w-24 hidden lg:block pr-2">Owner</div>
      <div className="w-32 hidden lg:block pr-2">Submitted By</div>
      <div className="w-24 hidden sm:block pr-2">Status</div>
      <div className="w-32 text-right">Action</div>
    </div>
  );
}

function InventoryCard({ agent, onClick }) {
  if (!agent) return null;

  const id = agent.id || agent.BotId || "—";
  const name = agent.name || agent.Name || "Untitled Bot";

  const pName = agent.projectName || agent.ProjectName;
  const pId = agent.projectId || agent.ProjectId;
  const projectDisplay =
    pName && pId ? `${pName} (${pId})` : pName || pId || "—";

  const useCase = agent.useCase || agent.UseCase || "—";
  const category = agent.category || agent.Category || "N/A";
  const owner = agent.owner || agent.Owner || "N/A";
  const submitter = agent.submittedBy || agent.SubmittedBy || "—";
  const status = agent.status || agent.Status || "APPROVED";

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-12 text-xs font-mono text-gray-400">#{id}</div>

      <div
        className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate"
        title={name}
      >
        {name}
      </div>

      <div
        className="w-44 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={projectDisplay}
      >
        {projectDisplay}
      </div>

      <div
        className="w-28 hidden lg:block pr-2 text-gray-600 dark:text-gray-400 truncate"
        title={useCase}
      >
        {useCase}
      </div>

      <div
        className="w-24 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={category}
      >
        {category}
      </div>

      <div
        className="w-24 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={owner}
      >
        {owner}
      </div>

      <div
        className="w-32 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={submitter}
      >
        {submitter}
      </div>

      <div className="w-24 hidden sm:block pr-2">
        <StatusBadge status={status} />
      </div>

      <div className="w-32 flex items-center justify-end">
        <button
          onClick={onClick}
          className="px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-400 rounded-md text-xs font-bold transition-all shadow-sm whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// ==========================================
// DETAILS COMPONENT (Full Width)
// ==========================================

function AgentDetails({ agent, onBack }) {
  const rawCapabilities = agent.capabilities || agent.Capabilities || "";
  const capabilities = rawCapabilities
    ? rawCapabilities
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(", ")
    : "N/A";

  const ownerName = agent.owner || agent.Owner || "N/A";
  const submitter = agent.submittedBy || agent.SubmittedBy || ownerName;
  const contributors = agent.contributors || agent.Contributors;
  const useCase = agent.useCase || agent.UseCase || "N/A";
  const category = agent.category || agent.Category || "N/A";

  const projectName = agent.projectName || agent.ProjectName || "N/A";
  const projectId = agent.projectId || agent.ProjectId || "N/A";

  const description =
    agent.description || agent.Description || "No description provided.";
  const demoLink = agent.demoLink || agent.DemoLink || "";

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn">
      {/* Detail Header */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to List
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {agent.name || agent.Name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by <strong>{submitter}</strong>
            </p>
          </div>
          <StatusBadge
            status={agent.status || agent.Status || "APPROVED"}
            size="lg"
          />
        </div>
      </div>

      {/* Body Content */}
      <div className="px-6 py-6 space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            General Information
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem label="Use Case" value={useCase} />
            <DetailItem label="Category" value={category} />
            <DetailItem label="Primary Owner" value={ownerName} />

            <DetailItem label="Project Name" value={projectName} />
            <DetailItem label="Project ID" value={projectId} />
            <DetailItem label="Contributors" value={contributors} />
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="Capabilities" value={capabilities} />
            </div>
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Details
          </h3>
          <div className="space-y-6">
            <TextSection label="Bot Description" value={description} />
          </div>
        </div>

        {demoLink && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Resources
            </h3>
            <a
              href={demoLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors border border-blue-200 dark:border-blue-800"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
              </svg>
              View Demo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// FILTER INPUTS & HELPERS
// ==========================================

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// Keeping rest of components exact same as prior solution
function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">
          {label}
        </label>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
  );
}

function StatusBadge({ status, size = "sm" }) {
  const padding =
    size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded uppercase tracking-wider font-bold bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ${padding}`}
    >
      {status || "APPROVED"}
    </span>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

function TextSection({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
        {label}
      </h4>
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        {value}
      </div>
    </div>
  );
}
