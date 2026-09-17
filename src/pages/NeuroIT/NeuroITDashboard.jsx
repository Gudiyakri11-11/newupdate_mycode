import React, { useEffect, useState } from "react";
import { navigate } from "../../router/miniRouter";
import api from "../../Api";
const api_url = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function NeuroITDashboard() {
  const [pending, setPending] = useState([]);
  const [declined, setDeclined] = useState([]);
  const [rework, setRework] = useState([]);

  // Navigation States
  const [activeSection, setActiveSection] = useState("HOME"); // 'HOME', 'PENDING', 'REWORK', 'DECLINED'
  const [selected, setSelected] = useState(null);

  // Pagination States
  const [pages, setPages] = useState({ PENDING: 1, REWORK: 1, DECLINED: 1 });
  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  // Action Modal State
  const [showActionBox, setShowActionBox] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [actionTarget, setActionTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approval Modal States
  const [approveTarget, setApproveTarget] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    const statuses = ["PENDING", "DECLINED", "REWORK"];
    const setters = {
      PENDING: setPending,
      DECLINED: setDeclined,
      REWORK: setRework,
    };

    statuses.forEach((status) => {
      // 🔒 Added &scope=all so Admins see the global pipeline
      api
        .get(`/api/neuroit?status=${status}&scope=all`)
        .then((res) => setters[status](res.data || []))
        .catch(console.error);
    });
  }
  /* =========================
      PAGINATION HELPER
  ========================= */
  const paginate = (items, sectionKey) => {
    const page = pages[sectionKey];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const handlePageChange = (sectionKey, direction) => {
    setPages((prev) => ({
      ...prev,
      [sectionKey]: Math.max(1, prev[sectionKey] + direction),
    }));
  };

  /* =========================
      ACTIONS
  ========================= */
  function triggerApprove(item) {
    setApproveTarget(item);
    setApproveError("");
  }

  function confirmApprove() {
    setIsApproving(true);
    setApproveError("");

    const id = approveTarget.id || approveTarget.NeuroITId;

    api
      .patch(`/api/neuroit/${id}/approve`)
      .then(() => {
        setApproveTarget(null);
        setSelected(null); // ✅ Navigates back to the previous list page
        loadData(); // ✅ Forces a fresh fetch of the data
      })
      .catch(() => {
        setApproveError(
          "Failed to approve the use case. Please try again or check your connection.",
        );
      })
      .finally(() => setIsApproving(false));
  }

  function openActionModal(item, type) {
    setActionTarget(item);
    setActionType(type);
    setActionReason("");
    setShowActionBox(true);
  }

  function confirmAction() {
    if (!actionReason.trim() || !actionTarget) return;
    setIsProcessing(true);
    const targetId = actionTarget.id || actionTarget.NeuroITId;
    const endpoint = actionType === "DECLINE" ? "decline" : "rework";

    api
      .patch(`/api/neuroit/${targetId}/${endpoint}`, { reason: actionReason })
      .then(() => {
        setShowActionBox(false);
        setSelected(null); // ✅ Navigates back to the previous list page
        loadData(); // ✅ Forces a fresh fetch of the data
      })
      .catch((err) =>
        console.error("Pipeline lifecycle transition failed", err),
      )
      .finally(() => setIsProcessing(false));
  }

  /* =========================
      SEARCH HELPER
  ========================= */
  const getFilteredData = (items) => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter((item) => {
      const idStr = String(item.id || item.NeuroITId || "").toLowerCase();
      const titleStr = String(item.title || item.Title || "").toLowerCase();
      const submitterStr = String(
        item.employeeId || item.EmployeeId || "", // ✅ Searching by ID now
      ).toLowerCase();
      const accountStr = String(
        item.account || item.Account || "",
      ).toLowerCase();
      const pNameStr = String(
        item.projectName || item.ProjectName || "",
      ).toLowerCase();
      const pIdStr = String(
        item.projectId || item.ProjectId || "",
      ).toLowerCase();
      const contribStr = String(
        item.contributors || item.Contributors || "",
      ).toLowerCase();

      return (
        idStr.includes(lower) ||
        titleStr.includes(lower) ||
        submitterStr.includes(lower) ||
        accountStr.includes(lower) ||
        pNameStr.includes(lower) ||
        pIdStr.includes(lower) ||
        contribStr.includes(lower)
      );
    });
  };

  /* =========================
      RENDER HELPERS
  ========================= */
  const renderListSection = (title, items, key, color) => {
    const filteredItems = getFilteredData(items);

    return (
      <div className="animate-fadeIn">
        {/* Top Controls: Back Button & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              setActiveSection("HOME");
              setSearchTerm("");
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
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
            Back to Dashboard
          </button>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search ID, Title, Project, Account..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPages((prev) => ({ ...prev, [key]: 1 }));
              }}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Section Table rendering Filtered Data */}
        <Section
          title={title}
          items={filteredItems}
          page={pages[key]}
          color={color}
          onPage={(dir) => handlePageChange(key, dir)}
        >
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <TableHeader />
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {paginate(filteredItems, key).map((n) => (
                <NeuroITCard
                  key={n.id || n.NeuroITId}
                  data={n}
                  onClick={() => setSelected(n)}
                />
              ))}
            </div>
          </div>
        </Section>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
            NeuroIT Approvals
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Admin Review Pipeline
          </p>
        </div>
        <button
          onClick={() => navigate("/neuroit-inventory")}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-all shadow-md"
        >
          View Inventory
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto h-full">
          {selected ? (
            /* DETAILS VIEW */
            <NeuroITDetails
              data={selected}
              onBack={() => setSelected(null)}
              isAdmin={true}
              onApprove={triggerApprove}
              onDecline={(item) => openActionModal(item, "DECLINE")}
              onRework={(item) => openActionModal(item, "REWORK")}
            />
          ) : activeSection === "HOME" ? (
            /* DASHBOARD CARDS VIEW */
            <div className="animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
                Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                  title="Pending Approvals"
                  count={pending.length}
                  color="blue"
                  onClick={() => setActiveSection("PENDING")}
                />
                <SummaryCard
                  title="Rework Requested"
                  count={rework.length}
                  color="orange"
                  onClick={() => setActiveSection("REWORK")}
                />
                <SummaryCard
                  title="Declined Requests"
                  count={declined.length}
                  color="red"
                  onClick={() => setActiveSection("DECLINED")}
                />
              </div>
            </div>
          ) : (
            /* SPECIFIC LIST VIEW */
            <>
              {activeSection === "PENDING" &&
                renderListSection(
                  "Pending Approval",
                  pending,
                  "PENDING",
                  "blue",
                )}
              {activeSection === "REWORK" &&
                renderListSection(
                  "Rework Requested",
                  rework,
                  "REWORK",
                  "orange",
                )}
              {activeSection === "DECLINED" &&
                renderListSection("Declined", declined, "DECLINED", "red")}
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionBox && (
        <ActionModal
          type={actionType}
          target={actionTarget}
          reason={actionReason}
          setReason={setActionReason}
          onClose={() => setShowActionBox(false)}
          onConfirm={confirmAction}
          loading={isProcessing}
        />
      )}

      {/* Approve Confirmation UI Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 md:p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <svg
                  className="h-8 w-8 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Approve Use Case
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Are you sure you want to approve{" "}
                <strong className="text-gray-700 dark:text-gray-200">
                  "{approveTarget.title || approveTarget.Title}"
                </strong>
                ?
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                This action will move it to the approved list.
              </p>

              {approveError && (
                <div className="mb-6 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {approveError}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setApproveTarget(null)}
                  disabled={isApproving}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={isApproving}
                  className="px-6 py-2.5 rounded-md text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-70 flex items-center justify-center min-w-[120px]"
                >
                  {isApproving ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Approving...
                    </span>
                  ) : (
                    "Yes, Approve"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
    COMPONENTS: DASHBOARD CARDS
========================= */
function SummaryCard({ title, count, color, onClick }) {
  const colorStyles = {
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40",
    orange:
      "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/40",
    red: "bg-red-50 hover:bg-red-100 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40",
  };

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-6 transition-all duration-200 flex flex-col justify-between h-36 ${colorStyles[color]}`}
    >
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="flex items-end justify-between">
        <span className="text-4xl font-black">{count}</span>
        <span className="text-sm font-semibold opacity-80 hover:opacity-100 flex items-center">
          View All{" "}
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* =========================
    COMPONENTS: LIST VIEW (TABLE)
========================= */
function TableHeader() {
  return (
    <div className="flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
      <div className="w-16">ID</div>
      <div className="flex-1 min-w-0 pr-4">Title</div>
      <div className="w-40 hidden sm:block">Submitter ID</div>
      <div className="w-32 hidden md:block">Account</div>
      <div className="w-28 hidden xl:block">Date</div>
      <div className="w-28 hidden lg:block">Status</div>
      <div className="w-28 text-right">Action</div>
    </div>
  );
}

function NeuroITCard({ data, onClick }) {
  if (!data) return null;

  const title = data.title || data.Title || "Untitled";
  const status = data.status || data.Status || "PENDING";
  const submitter = data.employeeId || data.EmployeeId || "Unknown ID"; // ✅ Uses EmployeeID
  const account = data.account || data.Account || "N/A";
  const formattedDate = new Date(
    data.createdAt || Date.now(),
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-16 text-xs font-mono text-gray-400">
        #{data.id || data.NeuroITId}
      </div>
      <div
        className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate"
        title={title}
      >
        {title}
      </div>
      <div className="w-40 hidden sm:block text-gray-600 dark:text-gray-400 font-mono truncate pr-2">
        {submitter}
      </div>
      <div className="w-32 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2">
        {account}
      </div>
      <div className="w-28 hidden xl:block text-gray-500 dark:text-gray-400 text-xs">
        {formattedDate}
      </div>
      <div className="w-28 hidden lg:block">
        <StatusBadge status={status} />
      </div>
      <div className="w-28 text-right flex justify-end">
        <button
          onClick={onClick}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-400 rounded-md text-xs font-bold transition-all shadow-sm whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function Section({ title, items, page, color, onPage, children }) {
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const colorMap = {
    blue: "bg-blue-600",
    orange: "bg-orange-500",
    red: "bg-red-600",
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${colorMap[color]} ${color === "blue" ? "animate-pulse" : ""}`}
          />
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
            {title}
          </h2>
          <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300 font-medium">
            {items.length} Total
          </span>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
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

      <div className="p-6">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No items found in this section.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/* =========================
    COMPONENTS: NEURO-IT DETAILS
========================= */
export function NeuroITDetails({
  data,
  onBack,
  isAdmin,
  onApprove,
  onDecline,
  onRework,
}) {
  const rawCategories = data.categories || data.Categories || "";
  const categories = Array.isArray(rawCategories)
    ? rawCategories.join(", ")
    : typeof rawCategories === "string"
      ? rawCategories.split("|").join(", ")
      : String(rawCategories);

  // ✅ Secure recursive parsing applied here!
  const metrics = safeParse(data.metrics || data.Metrics);
  const benefits = safeParse(data.benefits || data.Benefits);

  const createdAt = data.createdAt || data.CreatedAt || Date.now();
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const executiveOutcome = data.executiveOutcome || data.ExecutiveOutcome;

  // ✅ Safe rendering block for double-stringified database rows
  const renderDataBlock = (dataObj, colorClass) => {
    return Object.entries(dataObj).map(([key, val]) => {
      let display = null;

      if (val === null || val === undefined) {
        return null;
      } else if (typeof val === "object") {
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

      if (!display || String(display).trim() === "") return null;

      return (
        <div
          key={`block-${key}`}
          className={`p-4 rounded-md border ${colorClass}`}
        >
          <dt
            className={`text-xs font-bold tracking-wide uppercase ${colorClass.split(" ")[0]}`}
          >
            {beautify(key)}
          </dt>
          <dd
            className={`mt-1 text-base font-bold ${colorClass.split(" ")[1]}`}
          >
            {display}
          </dd>
        </div>
      );
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden animate-fadeIn mb-8">
      {/* Detail Header with Actions */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
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

          {/* ADMIN ACTION BUTTONS */}
          {isAdmin &&
            (data.status === "PENDING" || data.Status === "PENDING") && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onDecline(data)}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Decline
                </button>
                <button
                  onClick={() => onRework(data)}
                  className="px-4 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/50 dark:text-orange-400 dark:hover:bg-orange-900/20 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Rework
                </button>
                <button
                  onClick={() => onApprove(data)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={data.status || data.Status} />
            <span className="text-xs font-mono text-gray-500">
              ID: {data.id || data.NeuroITId}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
            {data.title || data.Title}
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Submitted by Employee ID:{" "}
            <span className="font-bold">
              {data.employeeId || data.EmployeeId || "Unknown"}
            </span>{" "}
            on {formattedDate}
          </div>
        </div>
      </div>

      {/* Admin Feedback Alerts */}
      {(data.declineReason ||
        data.DeclineReason ||
        data.reworkReason ||
        data.ReworkReason) && (
        <div
          className={`px-6 py-4 border-b ${data.status === "DECLINED" || data.Status === "DECLINED" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}
        >
          <h4
            className={`text-xs font-bold uppercase tracking-wide mb-1 ${data.status === "DECLINED" || data.Status === "DECLINED" ? "text-red-800" : "text-orange-800"}`}
          >
            {data.status === "DECLINED" || data.Status === "DECLINED"
              ? "Decline Reason"
              : "Rework Instructions"}
          </h4>
          <p
            className={`text-sm italic ${data.status === "DECLINED" || data.Status === "DECLINED" ? "text-red-700" : "text-orange-700"}`}
          >
            "
            {data.declineReason ||
              data.DeclineReason ||
              data.reworkReason ||
              data.ReworkReason}
            "
          </p>
        </div>
      )}

      {/* Body Content */}
      <div className="px-6 py-8 space-y-8">
        {/* Executive Outcome (Highlighted) */}
        {executiveOutcome && (
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <h3 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">
              Executive Outcome
            </h3>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed">
              {executiveOutcome}
            </p>
          </div>
        )}

        {/* General Information Grid */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            General Information
          </h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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

            <DetailItem
              label="Account / LOB"
              value={data.account || data.Account}
            />
            <DetailItem label="Category" value={categories} />
            <DetailItem
              label="Capability"
              value={data.neuroitCapability || data.NeuroITCapability}
            />
            <DetailItem
              label="Automation Type"
              value={data.automationType || data.AutomationType}
            />

            <DetailItem
              label="Tools Used"
              value={data.toolsUsed || data.ToolsUsed}
            />
            <DetailItem
              label="Status Type"
              value={data.statusType || data.StatusType}
            />
            <DetailItem
              label="Reusable"
              value={data.reusable || data.Reusable}
            />
            <DetailItem
              label="Scale Potential"
              value={data.scalePotential || data.ScalePotential}
            />

            <div className="col-span-2 md:col-span-3 lg:col-span-4">
              <DetailItem
                label="Applications Impacted"
                value={data.applicationsImpacted || data.ApplicationsImpacted}
              />
            </div>

            {/* Document Link Row */}
            {(data.documentLink || data.DocumentLink) && (
              <div className="col-span-2 md:col-span-3 lg:col-span-4">
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

        {/* Detailed Narrative Blocks */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Details
          </h3>
          <div className="space-y-6">
            <TextSection
              label="Problem / Challenge"
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
              {/* Render Metrics */}
              {renderDataBlock(
                metrics,
                "text-gray-500 text-blue-700 bg-gray-50 border-gray-200 dark:text-gray-400 dark:text-blue-400 dark:bg-gray-800/50 dark:border-gray-700",
              )}

              {/* Render Benefits */}
              {renderDataBlock(
                benefits,
                "text-green-700 text-green-800 bg-green-50 border-green-100 dark:text-green-500 dark:text-green-400 dark:bg-green-900/10 dark:border-green-900/30",
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
    SUB-COMPONENTS & UTILS
========================= */
function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-base font-medium text-gray-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    APPROVED:
      "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    PENDING:
      "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    REWORK:
      "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    DECLINED:
      "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config[status] || "bg-gray-100 border-gray-200 text-gray-500"}`}
    >
      {status}
    </span>
  );
}

function ActionModal({
  type,
  target,
  reason,
  setReason,
  onClose,
  onConfirm,
  loading,
}) {
  const isDecline = type === "DECLINE";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-6 md:p-8">
          <h3
            className={`text-2xl font-bold mb-2 ${isDecline ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}
          >
            {isDecline ? "Decline Submission" : "Request Rework"}
          </h3>
          <p className="text-base text-gray-600 dark:text-gray-300 mb-6 font-medium">
            Use Case:{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              {target?.title || target?.Title}
            </span>
          </p>

          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            Please provide a detailed reason:
          </label>
          <textarea
            autoFocus
            className="w-full h-36 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
            placeholder="Explain what needs to be changed or why this is being declined..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/80 p-5 px-6 flex justify-end gap-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className={`px-6 py-2.5 rounded-md text-sm font-bold text-white shadow-sm disabled:opacity-50 transition-colors ${isDecline ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
          >
            {loading ? "Processing..." : "Confirm Action"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ FIXED: Applies the recursive unwrap logic for broken database entries
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

function TextSection({ label, value }) {
  if (!value) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 tracking-wide">
        {label}
      </h4>
      <div className="text-base leading-relaxed text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}
