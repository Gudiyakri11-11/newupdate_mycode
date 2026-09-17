import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import api from "../../Api";
const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function UseCaseInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Details panel
  const [selected, setSelected] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Filter UI
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

  /* =========================
        HELPERS
  ========================= */
  const getCategoryText = (d) => {
    const c = d?.categories || d?.Categories;
    if (Array.isArray(c)) return c.join(", ");
    if (typeof c === "string") return c.replaceAll("|", ", ");
    return "";
  };

  /* =========================
        FETCH ONLY APPROVED USE CASES
  ========================= */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 🔒 Dispatched over the secure centralized wrapper layer to automatically bundle session tracking cookies
        const response = await api.get("/api/usecases?status=APPROVED&scope=global");

        setItems(response.data || []);
      } catch (e) {
        console.error("Failed to load approved use cases from secure archive registry:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* =========================
        DERIVED DATA
  ========================= */
  const categories = useMemo(() => {
    return [
      "ALL",
      ...new Set(items.map((i) => i.category || i.Category).filter(Boolean)),
    ];
  }, [items]);

  // ✅ Generates unique project names list for the select component
  const projectOptions = useMemo(() => {
    return [
      "ALL",
      ...new Set(
        items.map((i) => i.projectName || i.ProjectName).filter(Boolean),
      ),
    ].sort();
  }, [items]);

  /* =========================
        FILTERING LOGIC
  ========================= */
  const filtered = useMemo(() => {
    const { category, project, owner, search } = applied;

    return items.filter((i) => {
      const matchesCategory =
        category === "ALL" || (i.category || i.Category) === category;

      // ✅ Evaluate the current item project name against dropdown filter selection
      const currentProjectName = i.projectName || i.ProjectName || "";
      const matchesProject =
        project === "ALL" || currentProjectName === project;

      const ownerVal = i.submittedBy || i.SubmittedBy || "";
      const matchesOwner = owner.trim()
        ? ownerVal.toLowerCase().includes(owner.trim().toLowerCase())
        : true;

      // ✅ Added project metadata components to build the target search index blob
      const blob = [
        i.title,
        i.category || i.Category,
        i.projectName || i.ProjectName,
        i.projectId || i.ProjectId,
        i.domain || i.Domain,
        i.client || i.Client,
        i.team || i.Team,
        ownerVal,
        i.problemDescription || i.ProblemDescription,
        i.solutionDescription || i.SolutionDescription,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = search.trim()
        ? blob.includes(search.trim().toLowerCase())
        : true;

      return matchesCategory && matchesProject && matchesOwner && matchesSearch;
    });
  }, [items, applied]);

  const applyFilters = () => {
    setApplied({ category, project, owner, search });
    setPage(1); // Reset pagination on new filter
  };

  const clearFilters = () => {
    setCategory("ALL");
    setProject("ALL");
    setOwner("");
    setSearch("");
    setApplied({
      category: "ALL",
      project: "ALL",
      owner: "",
      search: "",
    });
    setPage(1);
  };

  /* =========================================
       COMPREHENSIVE UNROLLED CSV DOWNLOAD UTILITY
  ========================================= */
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

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("No matching data available to download.");
      return;
    }

    const headers = [
      "Use Case ID",
      "Use Case Title",
      "Project Name",
      "Project ID",
      "Category",
      "Business Domain",
      "Industry/Client",
      "Team/Organization",
      "Submitted By",
      "Employee ID",
      "Contributors",
      "GenAI Architecture Types",
      "Problem Description",
      "Key Pain Points",
      "Process Impacted",
      "Solution Description",
      "Platform Tools",
      "LLM Models",
      "Integration Points",
      "Benefit: Effort Reduction",
      "Benefit: Productivity",
      "Benefit: Cost Savings",
      "Benefit: Quality",
      "Benefit: Turnaround Time",
      "Benefit: Risk & Compliance",
      "Process Before GenAI",
      "Process After GenAI",
      "Accuracy Gains",
      "Scalability Gains",
      "Reusable Asset?",
      "Scale Scope Potential",
      "Future Roadmap Enhancements",
    ];

    const rows = filtered.map((i) => {
      let b = {};
      try {
        b =
          typeof i.benefits === "string"
            ? safeParse(i.benefits)
            : i.benefits || {};
      } catch {
        b = {};
      }

      const typesArr = i.genaiTypes || i.GenAITypes || [];
      const typesText = Array.isArray(typesArr)
        ? typesArr.join(" | ")
        : String(typesArr);

      return [
        escapeCSV(i.id || i.UseCaseId),
        escapeCSV(i.title || i.Title),
        escapeCSV(i.projectName || i.ProjectName),
        escapeCSV(i.projectId || i.ProjectId),
        escapeCSV(i.category || i.Category),
        escapeCSV(i.domain || i.Domain),
        escapeCSV(i.client || i.Client),
        escapeCSV(i.team || i.Team),
        escapeCSV(i.submittedBy || i.SubmittedBy),
        escapeCSV(i.employeeId || i.EmployeeId),
        escapeCSV(i.contributors || i.Contributors),
        escapeCSV(typesText),
        escapeCSV(i.problemDescription || i.ProblemDescription),
        escapeCSV(i.painPoints || i.PainPoints),
        escapeCSV(i.processImpacted || i.ProcessImpacted),
        escapeCSV(i.solutionDescription || i.SolutionDescription),
        escapeCSV(i.platforms || i.Platforms),
        escapeCSV(i.models || i.Models),
        escapeCSV(i.integrationPoints || i.IntegrationPoints),

        // Flattened Structured Form Checklist Values
        escapeCSV(
          b.effortReduction?.enabled
            ? `Yes - ${b.effortReduction?.text || ""}`
            : "No",
        ),
        escapeCSV(
          b.productivityImprovement?.enabled
            ? `Yes - ${b.productivityImprovement?.text || ""}`
            : "No",
        ),
        escapeCSV(
          b.costSavings?.enabled ? `Yes - ${b.costSavings?.text || ""}` : "No",
        ),
        escapeCSV(
          b.qualityImprovement?.enabled
            ? `Yes - ${b.qualityImprovement?.text || ""}`
            : "No",
        ),
        escapeCSV(
          b.turnaroundTimeReduction?.enabled
            ? `Yes - ${b.turnaroundTimeReduction?.text || ""}`
            : "No",
        ),
        escapeCSV(
          b.riskComplianceImprovement?.enabled
            ? `Yes - ${b.riskComplianceImprovement?.text || ""}`
            : "No",
        ),

        escapeCSV(i.beforeProcess || i.BeforeProcess),
        escapeCSV(i.afterProcess || i.AfterProcess),
        escapeCSV(i.accuracyImprovement || i.AccuracyImprovement),
        escapeCSV(i.scalabilityImprovement || i.ScalabilityImprovement),
        escapeCSV(i.reusable || i.Reusable),
        escapeCSV(i.scalabilityPotential || i.ScalabilityPotential),
        escapeCSV(i.futureEnhancements || i.FutureEnhancements),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const targetFileName =
      applied.project === "ALL"
        ? "all_genai_usecases_inventory.csv"
        : `${applied.project.toLowerCase().replace(/\s+/g, "_")}_genai_inventory.csv`;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              GenAI Use Case Inventory
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Verified Use Cases Archive — {filtered.length} Records Found
            </p>
          </div>
          <button
            onClick={() => navigate("/usecase")}
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
        {selected ? (
          <UseCaseDetails data={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px] w-full">
                <FilterInput
                  label="Search Registry"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search title, details..."
                />
              </div>
              <div className="flex-1 min-w-[130px] w-full">
                <FilterSelect
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={categories}
                />
              </div>
              {/* ✅ Added Project UI Dropdown Select Field */}
              <div className="flex-1 min-w-[130px] w-full">
                <FilterSelect
                  label="Project"
                  value={project}
                  onChange={setProject}
                  options={projectOptions}
                />
              </div>
              <div className="flex-1 min-w-[130px] w-full">
                <FilterInput
                  label="Owner / Submitter"
                  value={owner}
                  onChange={setOwner}
                  placeholder="Search submitter..."
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
                {/* ✅ Added dynamic CSV export interaction trigger anchor */}
                <button
                  onClick={handleExportCSV}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <svg
                    className="h-4 w-4 text-gray-500"
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
              title="Approved Use Cases Archive"
              totalItems={filtered.length}
              page={page}
              onPage={(dir) => setPage((p) => p + dir)}
              loading={loading}
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
                <TableHeader />

                <div className="bg-white dark:bg-slate-800 transition-colors divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <div className="p-20 text-center">
                      <div className="animate-pulse flex flex-col items-center">
                        <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                          Fetching Registry...
                        </div>
                      </div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                      <span className="text-4xl mb-4 opacity-20">📂</span>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        No matches found in archive.
                      </div>
                    </div>
                  ) : (
                    <div className="animate-fadeIn">
                      {paginatedData.map((i) => (
                        <InventoryRow
                          key={i.id || i.UseCaseId}
                          data={i}
                          onClick={() => setSelected(i)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {!loading && filtered.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      End of List • Showing {paginatedData.length} of{" "}
                      {filtered.length} entries
                    </p>
                  </div>
                )}
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
      <div className="w-12 shrink-0">ID</div>
      <div className="flex-1 min-w-0 pr-4">Title</div>
      <div className="w-44 hidden md:block pr-2">Project (ID/Name)</div>
      <div className="w-32 hidden lg:block pr-4">Category</div>
      <div className="w-32 hidden lg:block pr-4">Domain</div>
      <div className="w-36 hidden xl:block pr-4">Submitted By</div>
      <div className="w-24 hidden sm:block pr-4">Status</div>
      <div className="w-28 lg:w-32 shrink-0 text-right">Action</div>
    </div>
  );
}

function InventoryRow({ data, onClick }) {
  if (!data) return null;

  const id = data.id || data.UseCaseId || "—";
  const title = data.title || data.Title || "Untitled";

  const pName = data.projectName || data.ProjectName;
  const pId = data.projectId || data.ProjectId;
  const projectDisplay =
    pName && pId ? `${pName} (${pId})` : pName || pId || "—";

  const category = data.category || data.Category || "N/A";
  const domain = data.domain || data.Domain || "N/A";
  const submittedBy = data.submittedBy || data.SubmittedBy || "N/A";
  const status = data.status || data.Status || "APPROVED";

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-12 shrink-0 text-xs font-mono text-gray-400">#{id}</div>

      <div
        className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate"
        title={title}
      >
        {title}
      </div>

      <div
        className="w-44 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={projectDisplay}
      >
        {projectDisplay}
      </div>

      <div
        className="w-32 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-4"
        title={category}
      >
        {category}
      </div>

      <div
        className="w-32 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-4"
        title={domain}
      >
        {domain}
      </div>

      <div
        className="w-36 hidden xl:block text-gray-600 dark:text-gray-400 truncate pr-4"
        title={submittedBy}
      >
        {submittedBy}
      </div>

      <div className="w-24 hidden sm:block pr-4">
        <StatusBadge status={status} />
      </div>

      <div className="w-28 lg:w-32 flex items-center justify-end shrink-0">
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

export function UseCaseDetails({ data, onBack }) {
  if (!data) return null;

  // ✅ Secure recursive parse implementation
  const benefits = safeParse(data.benefits || data.Benefits);

  const genaiTypesText = Array.isArray(data.genaiTypes)
    ? data.genaiTypes.join(", ")
    : (data.genaiTypes || "").replaceAll("|", ", ");
  const hasAny = (...vals) => vals.some((v) => (v ?? "").toString().trim());

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn mb-8">
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
              {data.title || data.Title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by{" "}
              <strong>{data.submittedBy || data.SubmittedBy}</strong> (ID:{" "}
              {data.employeeId || data.EmployeeId}) on {data.submissionDate}
            </p>
          </div>
          <StatusBadge status={data.status || "APPROVED"} size="lg" />
        </div>
      </div>

      {/* Body Content */}
      <div className="px-6 py-6 space-y-8">
        {/* SECTION 1 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Basic Details
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem
              label="Project Name"
              value={data.projectName || data.ProjectName}
            />
            <DetailItem
              label="Project ID"
              value={data.projectId || data.ProjectId}
            />

            <DetailItem
              label="Category"
              value={data.category || data.Category}
            />
            <DetailItem
              label="Business Domain"
              value={data.domain || data.Domain}
            />
            <DetailItem
              label="Industry / Client"
              value={data.client || data.Client}
            />
            <DetailItem
              label="Team / Organization"
              value={data.team || data.Team}
            />

            <DetailItem
              label="Contributors"
              value={data.contributors || data.Contributors}
            />

            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem
                label="Process / Area Impacted"
                value={data.processImpacted || data.ProcessImpacted}
              />
            </div>
          </dl>
        </div>

        {/* SECTION 2 & 3 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Narrative & Solution
          </h3>
          <div className="space-y-6">
            <TextSection
              label="Problem Description (Pre-GenAI)"
              value={data.problemDescription || data.ProblemDescription}
            />
            <TextSection
              label="Key Pain Points"
              value={data.painPoints || data.PainPoints}
            />
            <TextSection
              label="GenAI Solution Description"
              value={data.solutionDescription || data.SolutionDescription}
            />
            <DetailItem label="Type of GenAI Used" value={genaiTypesText} />
          </div>
        </div>

        {/* SECTION 4: How GenAI Helped */}
        {hasAny(
          data.requirementsHelp,
          data.designHelp,
          data.developmentHelp,
          data.testingHelp,
          data.supportHelp,
        ) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Development Contribution
            </h3>
            <div className="space-y-6">
              <TextSection
                label="Requirements & Analysis"
                value={data.requirementsHelp}
              />
              <TextSection
                label="Design & Architecture"
                value={data.designHelp}
              />
              <TextSection
                label="Development & Coding"
                value={data.developmentHelp}
              />
              <TextSection
                label="Testing & Validation"
                value={data.testingHelp}
              />
              <TextSection
                label="Support & Maintenance"
                value={data.supportHelp}
              />
            </div>
          </div>
        )}

        {/* SECTION 5: Tools & Tech */}
        {hasAny(data.platforms, data.models, data.integrationPoints) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Tools & Technologies
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailItem label="GenAI Platform(s)" value={data.platforms} />
              <DetailItem label="Models / Agents" value={data.models} />
              <div className="sm:col-span-2">
                <DetailItem
                  label="Integration Points"
                  value={data.integrationPoints}
                />
              </div>
            </dl>
          </div>
        )}

        {/* SECTION 6: Business Benefits */}
        {Object.keys(benefits).length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Business Benefits
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(benefits).map(([key, val]) => {
                let display = null;
                if (val !== null && val !== undefined) {
                  if (typeof val === "object") {
                    if ("text" in val) {
                      display = val.enabled !== false ? val.text : null;
                    } else if (Array.isArray(val)) {
                      display = val.join(", ");
                    } else {
                      display = Object.entries(val)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ");
                    }
                  } else {
                    display = String(val);
                  }
                }

                if (!display || String(display).trim() === "") return null;

                return (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {beautify(key)}
                    </dt>
                    <dd className="mt-1 text-base font-bold text-blue-700 dark:text-blue-400">
                      {display}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {/* SECTION 8: Before vs After */}
        {hasAny(
          data.beforeProcess,
          data.afterProcess,
          data.accuracyImprovement,
          data.scalabilityImprovement,
        ) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Before vs After Transformation
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TextSection
                label="Before GenAI"
                value={data.beforeProcess}
                bgHighlight="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-gray-800 dark:text-gray-200"
              />
              <TextSection
                label="After GenAI"
                value={data.afterProcess}
                bgHighlight="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 text-gray-800 dark:text-gray-200"
              />
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailItem
                label="Accuracy Improvement"
                value={data.accuracyImprovement}
              />
              <DetailItem
                label="Scalability Improvement"
                value={data.scalabilityImprovement}
              />
            </dl>
          </div>
        )}

        {/* SECTION 11: Reusability */}
        {hasAny(
          data.reusable,
          data.scalabilityPotential,
          data.futureEnhancements,
        ) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Reusability & Scalability
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <DetailItem
                label="Reusable Across Teams/Projects"
                value={data.reusable}
              />
              <DetailItem
                label="Scalability Potential"
                value={data.scalabilityPotential}
              />
            </dl>
            <TextSection
              label="Future Enhancements Planned"
              value={data.futureEnhancements}
            />
          </div>
        )}

        {/* SECTION 12: Artifacts */}
        {hasAny(data.demoLink, data.docLink, data.repoLink) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Supporting Artifacts
            </h3>
            <div className="flex flex-wrap gap-4">
              <LinkItem label="Demo / Screenshot" value={data.demoLink} />
              <LinkItem label="Documentation" value={data.docLink} />
              <LinkItem label="Repository / Code" value={data.repoLink} />
            </div>
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

function TextSection({ label, value, bgHighlight }) {
  if (!value) return null;
  const defaultBg =
    "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
        {label}
      </h4>
      <div
        className={`text-sm whitespace-pre-wrap p-4 rounded-md border ${bgHighlight || defaultBg}`}
      >
        {value}
      </div>
    </div>
  );
}

function LinkItem({ label, value }) {
  if (!value) return null;
  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors border border-blue-200 dark:border-blue-800 text-sm shadow-sm"
    >
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
      </svg>
      {label}
    </a>
  );
}

function safeParse(data) {
  if (!data) return {};

  let parsed = data;

  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      return {};
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  return parsed;
}

function beautify(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}