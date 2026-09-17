import React, { useEffect, useMemo, useState } from "react";
import { navigate } from "../../router/miniRouter";
import api from "../../Api";
const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function NeuroITInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Details panel
  const [selected, setSelected] = useState(null);

  // Filter UI values
  const [category, setCategory] = useState("ALL");
  const [project, setProject] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("");
  const [search, setSearch] = useState("");

  // Applied filters
  const [applied, setApplied] = useState({
    category: "ALL",
    project: "ALL",
    employeeId: "",
    search: "",
  });

  /* ===============================
      HELPERS
  ================================ */
  const getCategoryText = (d) => {
    const c = d?.categories || d?.Categories;
    if (Array.isArray(c)) return c.join(", ");
    if (typeof c === "string") return c.replaceAll("|", ", ");
    return "";
  };

  /* ===============================
      FETCH ONLY APPROVED USE CASES
  ================================ */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 🔒 Added &scope=global to fetch all approved public records
        const response = await api.get("/api/neuroit?status=APPROVED&scope=global");

        setItems(response.data);
      } catch (e) {
        console.error(
          "Failed to load NeuroIT inventory from secure registry channel",
          e,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  /* ===============================
     CATEGORY OPTIONS
  ================================ */
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((d) => {
      const c = d?.categories || d?.Categories;
      if (Array.isArray(c)) c.forEach((x) => x && set.add(x));
      else if (typeof c === "string") {
        c.split("|")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((x) => set.add(x));
      }
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [items]);

  /* ===============================
     PROJECTS OPTIONS DROPDOWN
  ================================ */
  const projectOptions = useMemo(() => {
    const set = new Set(
      items.map((d) => d.projectName || d.ProjectName).filter(Boolean),
    );
    return ["ALL", ...Array.from(set).sort()];
  }, [items]);

  /* ===============================
     FILTERING
  ================================ */
  const filtered = useMemo(() => {
    const { category, project, employeeId, search } = applied;

    return items.filter((d) => {
      const matchesCategory =
        category === "ALL"
          ? true
          : getCategoryText(d).toLowerCase().includes(category.toLowerCase());

      const botProjectName = d.projectName || d.ProjectName || "";
      const matchesProject =
        project === "ALL" ? true : botProjectName === project;

      const matchesEmployee = employeeId.trim()
        ? String(d.employeeId || d.EmployeeId || "")
            .toLowerCase()
            .includes(employeeId.trim().toLowerCase())
        : true;

      const blob = [
        d.employeeId || d.EmployeeId,
        d.projectName || d.ProjectName,
        d.projectId || d.ProjectId,
        d.title || d.Title,
        d.account || d.Account,
        d.executiveOutcome || d.ExecutiveOutcome,
        d.neuroitCapability || d.NeuroITCapability,
        d.contributors || d.Contributors,
        getCategoryText(d),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = search.trim()
        ? blob.includes(search.trim().toLowerCase())
        : true;

      return (
        matchesCategory &&
        matchesProject &&
        matchesEmployee &&
        matchesSearch
      );
    });
  }, [items, applied]);

  const applyFilters = () =>
    setApplied({ category, project, employeeId, search });

  const clearFilters = () => {
    setCategory("ALL");
    setProject("ALL");
    setEmployeeId("");
    setSearch("");
    setApplied({
      category: "ALL",
      project: "ALL",
      employeeId: "",
      search: "",
    });
  };

  /* ===============================
     MAXIMUM FIDELITY EXCEL/CSV DOWNLOAD
  ================================ */
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

  const handleDownloadCSV = () => {
    if (filtered.length === 0) {
      alert("No matching records found to download.");
      return;
    }

    const headers = [
      "NeuroIT ID",
      "Employee ID",
      "Contributors",
      "Use Case Title",
      "Project Name",
      "Project ID",
      "Account / LOB",
      "Applications Impacted",
      "Categories",
      "Status Type",
      "Problem Description",
      "Operational Impact",
      "NeuroIT Capability Applied",
      "Tools Used",
      "Automation / AI Type",
      "Benefit: Alert Noise Reduction",
      "Benefit: Faster Triage / MTTR",
      "Benefit: Productivity / Effort Savings",
      "Benefit: Availability / SLA Adherence",
      "Benefit: Risk Reduction",
      "Metric: Effort Saved (Hours)",
      "Metric: Alert Reduction (%)",
      "Metric: MTTR / MTTD Improvement",
      "Metric: Production Stability Improvement",
      "Reusable?",
      "Scale Potential",
      "Executive One-Line Outcome",
    ];

    const rows = filtered.map((d) => {
      const metricsRaw = d.metrics || d.Metrics;
      const metrics =
        typeof metricsRaw === "string"
          ? safeParse(metricsRaw)
          : metricsRaw || {};

      const benefitsRaw = d.benefits || d.Benefits;
      const benefits =
        typeof benefitsRaw === "string"
          ? safeParse(benefitsRaw)
          : benefitsRaw || {};

      return [
        escapeCSV(d.id || d.NeuroITId),
        escapeCSV(d.employeeId || d.EmployeeId),
        escapeCSV(d.contributors || d.Contributors),
        escapeCSV(d.title || d.Title),
        escapeCSV(d.projectName || d.ProjectName),
        escapeCSV(d.projectId || d.ProjectId),
        escapeCSV(d.account || d.Account),
        escapeCSV(d.applicationsImpacted || d.ApplicationsImpacted),
        escapeCSV(getCategoryText(d)),
        escapeCSV(d.statusType || d.StatusType),
        escapeCSV(d.problemDescription || d.ProblemDescription),
        escapeCSV(d.operationalImpact || d.OperationalImpact),
        escapeCSV(d.neuroitCapability || d.NeuroITCapability),
        escapeCSV(d.toolsUsed || d.ToolsUsed),
        escapeCSV(d.automationType || d.AutomationType),

        escapeCSV(
          benefits?.alertReduction?.enabled
            ? `Yes - ${benefits?.alertReduction?.text || ""}`
            : "No",
        ),
        escapeCSV(
          benefits?.mttr?.enabled
            ? `Yes - ${benefits?.mttr?.text || ""}`
            : "No",
        ),
        escapeCSV(
          benefits?.productivity?.enabled
            ? `Yes - ${benefits?.productivity?.text || ""}`
            : "No",
        ),
        escapeCSV(
          benefits?.availability?.enabled
            ? `Yes - ${benefits?.availability?.text || ""}`
            : "No",
        ),
        escapeCSV(
          benefits?.risk?.enabled
            ? `Yes - ${benefits?.risk?.text || ""}`
            : "No",
        ),

        escapeCSV(metrics?.effortSaved),
        escapeCSV(metrics?.alertReductionPercent),
        escapeCSV(metrics?.mttrImprovement),
        escapeCSV(metrics?.psi),

        escapeCSV(d.reusable || d.Reusable),
        escapeCSV(d.scalePotential || d.ScalePotential),
        escapeCSV(d.executiveOutcome || d.ExecutiveOutcome),
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
        ? "all_neuroit_inventory_report.csv"
        : `${applied.project.toLowerCase().replace(/\s+/g, "_")}_neuroit_report.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", targetFileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              NeuroIT Inventory
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Browse and search all officially approved NeuroIT use cases.
            </p>
          </div>

          <button
            onClick={() => navigate("/neuroit")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            ← Back to Store
          </button>
        </div>

        {selected ? (
          <NeuroITDetails
            data={selected}
            getCategoryText={getCategoryText}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Filters Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <FilterSelect
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={categories}
                />
                <FilterSelect
                  label="Project Filter"
                  value={project}
                  onChange={setProject}
                  options={projectOptions}
                />
                <FilterInput
                  label="Employee ID"
                  value={employeeId}
                  onChange={setEmployeeId}
                  placeholder="Search ID..."
                />
                <FilterInput
                  label="Keyword Search"
                  value={search}
                  onChange={setSearch}
                  placeholder="Title, outcome, capability..."
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={applyFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
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

            {/* Table Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <Th>ID</Th>
                      <Th>Employee ID</Th>
                      <Th>Project (ID/Name)</Th>
                      <Th>Account</Th>
                      <Th>Title</Th>
                      <Th>Capability</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Loading approved use cases...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          No approved NeuroIT use cases found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((d) => {
                        const pName = d.projectName || d.ProjectName;
                        const pId = d.projectId || d.ProjectId;
                        const projectDisplay =
                          pName && pId
                            ? `${pName} (${pId})`
                            : pName || pId || "—";

                        return (
                          <tr
                            key={d.id || d.NeuroITId}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <Td className="font-medium text-gray-900 dark:text-white">
                              #{d.id || d.NeuroITId}
                            </Td>
                            <Td className="font-mono text-gray-600 dark:text-gray-400">
                              {d.employeeId || d.EmployeeId || "-"}
                            </Td>
                            <Td className="text-gray-600 dark:text-gray-400 truncate max-w-xs">
                              {projectDisplay}
                            </Td>
                            <Td>{d.account || d.Account || "-"}</Td>
                            <Td
                              className="font-medium text-blue-600 dark:text-blue-400 max-w-xs truncate"
                              title={d.title || d.Title}
                            >
                              {d.title || d.Title || "-"}
                            </Td>
                            <Td>
                              {d.neuroitCapability ||
                                d.NeuroITCapability ||
                                "-"}
                            </Td>
                            <Td>
                              <StatusBadge />
                            </Td>
                            <Td className="text-right font-medium">
                              <button
                                onClick={() => setSelected(d)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                View Details
                              </button>
                            </Td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium">{filtered.length}</span>{" "}
                  approved record(s)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NeuroITDetails({ data, getCategoryText, onBack }) {
  const metrics = safeParse(data.metrics || data.Metrics);
  const benefits = safeParse(data.benefits || data.Benefits);

  const formattedDate = new Date(
    data.createdAt || data.CreatedAt || Date.now(),
  ).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn">
      {/* Detail Header */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <svg
            className="mr-1 h-4 w-4"
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
          Back to Inventory
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.title || data.Title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by Employee ID:{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {data.employeeId || data.EmployeeId || "Unknown"}
              </span>{" "}
              on {formattedDate}
            </p>
          </div>
          <StatusBadge />
        </div>
      </div>

      {/* Body Content */}
      <div className="px-6 py-6 space-y-8">
        {/* Executive Outcome */}
        {(data.executiveOutcome || data.ExecutiveOutcome) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Executive Outcome
            </h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-4 rounded-md border border-blue-100 dark:border-blue-900/30">
              {data.executiveOutcome || data.ExecutiveOutcome}
            </p>
          </div>
        )}

        {/* Metadata Grid */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            General Information
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
            <DetailItem
              label="Project Name"
              value={data.projectName || data.ProjectName}
            />
            <DetailItem
              label="Project ID"
              value={data.projectId || data.ProjectId}
            />

            <DetailItem
              label="Contributors"
              value={data.contributors || data.Contributors}
            />

            <DetailItem label="Account" value={data.account || data.Account} />
            <DetailItem label="Category" value={getCategoryText(data)} />
            <DetailItem
              label="Capability"
              value={data.neuroitCapability || data.NeuroITCapability}
            />
            <DetailItem
              label="Tools Used"
              value={data.toolsUsed || data.ToolsUsed}
            />
            <DetailItem
              label="Automation Type"
              value={data.automationType || data.AutomationType}
            />
            <DetailItem
              label="Reusable"
              value={data.reusable || data.Reusable}
            />
            <div className="sm:col-span-2 md:col-span-3">
              <DetailItem
                label="Impacted Applications"
                value={data.applicationsImpacted || data.ApplicationsImpacted}
              />
            </div>

            {(data.documentLink || data.DocumentLink) && (
              <div className="sm:col-span-2 md:col-span-3">
                <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Document Link
                </dt>
                <dd>
                  <a
                    href={data.documentLink || data.DocumentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 break-all"
                  >
                    View Document
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Long Text Blocks */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Technical Details
          </h3>
          <div className="space-y-6">
            <TextSection
              label="Problem Description"
              value={data.problemDescription || data.ProblemDescription}
            />
            <TextSection
              label="Operational Impact"
              value={data.operationalImpact || data.OperationalImpact}
            />
            <TextSection
              label="Solution Description"
              value={data.solutionDescription || data.SolutionDescription}
            />
          </div>
        </div>

        {/* Combined Impact & Benefits Grid */}
        {(Object.keys(metrics).length > 0 ||
          Object.keys(benefits).length > 0) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Impact & Benefits
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(metrics).map(([key, val]) => {
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
                    <Th className="!px-0 !py-0 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-normal border-none">
                      {beautify(key)}
                    </Th>
                    <dd className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {display}
                    </dd>
                  </div>
                );
              })}

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
                    <Th className="!px-0 !py-0 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-normal border-none">
                      {beautify(key)}
                    </Th>
                    <dd className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                      {display}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================
    SMALL UI HELPERS
================================ */

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col flex-1 min-w-[150px]">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors cursor-pointer"
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
    <div className="flex flex-col flex-1 min-w-[150px]">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
      />
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 ${className}`}
    >
      {children}
    </td>
  );
}

function StatusBadge() {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
      APPROVED
    </span>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

function TextSection({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {label}
      </h4>
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        {value}
      </div>
    </div>
  );
}

// ✅ FIXED: Applies recursive unwrap logic to handle old/broken database entries
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