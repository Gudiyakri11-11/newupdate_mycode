import React, { useEffect, useState, useMemo } from "react";
import { navigate } from "../../router/miniRouter";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function UseCaseDashboard() {
  const [pendingUseCases, setPendingUseCases] = useState([]);
  const [declinedUseCases, setDeclinedUseCases] = useState([]);
  const [reworkUseCases, setReworkUseCases] = useState([]);

  // View States
  const [activeSection, setActiveSection] = useState("HOME"); // 'HOME', 'PENDING', 'REWORK', 'DECLINED'
  const [pages, setPages] = useState({ PENDING: 1, REWORK: 1, DECLINED: 1 });
  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Action Modal State (Decline / Rework)
  const [showActionBox, setShowActionBox] = useState(false);
  const [actionType, setActionType] = useState(null); // "DECLINE" | "REWORK"
  const [actionReason, setActionReason] = useState("");
  const [actionTarget, setActionTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Approve Modal State
  const [approveTarget, setApproveTarget] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState("");

  /* =========================
      LOAD DATA
  ========================= */
  /* =========================
      LOAD DATA
  ========================= */
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadData() {
    // 🔒 Added &scope=all so the Admin sees the entire pipeline
    api
      .get("/api/usecases?status=PENDING&scope=all")
      .then((res) => setPendingUseCases(res.data || []))
      .catch(console.error);

    api
      .get("/api/usecases?status=DECLINED&scope=all")
      .then((res) => setDeclinedUseCases(res.data || []))
      .catch(console.error);

    api
      .get("/api/usecases?status=REWORK&scope=all")
      .then((res) => setReworkUseCases(res.data || []))
      .catch(console.error);
  }

  /* =========================
      SEARCH & PAGINATION
  ========================= */
  const q = searchQuery.toLowerCase();
  const matchesSearch = (uc) => {
    return [
      uc.title,
      uc.category,
      uc.domain,
      uc.projectName,
      uc.projectId,
      String(uc.id || ""),
      uc.submittedBy,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  const pendingFiltered = pendingUseCases.filter(matchesSearch);
  const reworkFiltered = reworkUseCases.filter(matchesSearch);
  const declinedFiltered = declinedUseCases.filter(matchesSearch);

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

  const handleSearch = (e, sectionKey) => {
    setSearchQuery(e.target.value);
    setPages((prev) => ({ ...prev, [sectionKey]: 1 }));
  };

  /* =========================
      CSV QUEUE DOWNLOAD EXPORTER
  ========================= */
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

  const downloadQueueCSV = (items, sectionTitle) => {
    if (!items || items.length === 0) {
      alert("No data available in this queue section to download.");
      return;
    }

    const headers = [
      "Use Case ID",
      "Title",
      "Project Name",
      "Project ID",
      "Submitter",
      "Category",
      "Domain",
      "Client Name",
      "Status",
      "Decline/Rework Feedback Reason",
    ];
    const rows = items.map((uc) => [
      escapeCSV(uc.id),
      escapeCSV(uc.title),
      escapeCSV(uc.projectName || uc.ProjectName),
      escapeCSV(uc.projectId || uc.ProjectId),
      escapeCSV(uc.submittedBy),
      escapeCSV(uc.category),
      escapeCSV(uc.domain),
      escapeCSV(uc.client),
      escapeCSV(uc.status),
      escapeCSV(uc.declineReason || uc.reworkReason || "—"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${sectionTitle.toLowerCase().replace(/\s+/g, "_")}_queue_report.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* =========================
      ADMIN ACTIONS LOGIC
  ========================= */
  function triggerApprove(item) {
    setApproveTarget(item);
    setApproveError("");
  }

  function confirmApprove() {
    setIsApproving(true);
    setApproveError("");

    const id = approveTarget.id;

    // 🔒 Mutational PATCH call safely issued over verified Axios config parameters
    api
      .patch(`/api/usecases/${id}/approve`)
      .then(() => {
        setPendingUseCases((list) => list.filter((u) => u.id !== id));
        if (selectedUseCase?.id === id) setSelectedUseCase(null);
        setApproveTarget(null);
      })
      .catch(() => {
        setApproveError("Failed to approve the use case. Please try again.");
      })
      .finally(() => setIsApproving(false));
  }

  function openActionModal(useCase, type) {
    setActionTarget(useCase);
    setActionType(type);
    setActionReason("");
    setShowActionBox(true);
  }

  function closeActionModal() {
    setShowActionBox(false);
    setActionType(null);
    setActionReason("");
    setActionTarget(null);
  }

  function confirmAction() {
    if (!actionReason.trim() || !actionTarget || !actionType) return;
    setIsProcessing(true);

    const endpoint = actionType === "DECLINE" ? "decline" : "rework";
    const newStatus = actionType === "DECLINE" ? "DECLINED" : "REWORK";

    // 🔒 Mutational PATCH call using standard Axios data parameters to apply CSRF defenses automatically
    api
      .patch(`/api/usecases/${actionTarget.id}/${endpoint}`, {
        reason: actionReason,
      })
      .then((res) => {
        const updatedFromBackend = res.data;
        const updated =
          updatedFromBackend && updatedFromBackend.id
            ? updatedFromBackend
            : {
                ...actionTarget,
                status: newStatus,
                declineReason:
                  actionType === "DECLINE"
                    ? actionReason
                    : actionTarget.declineReason,
                reworkReason:
                  actionType === "REWORK"
                    ? actionReason
                    : actionTarget.reworkReason,
              };

        setPendingUseCases((list) =>
          list.filter((u) => u.id !== actionTarget.id),
        );

        if (newStatus === "DECLINED") {
          setDeclinedUseCases((list) => [...list, updated]);
        } else {
          setReworkUseCases((list) => [...list, updated]);
        }

        if (selectedUseCase?.id === actionTarget.id)
          setSelectedUseCase(updated);
        closeActionModal();
      })
      .catch(() =>
        alert(`${actionType === "DECLINE" ? "Decline" : "Rework"} failed`),
      )
      .finally(() => setIsProcessing(false));
  }

  /* =========================
      RENDER LIST SECTION
  ========================= */
  const renderListSection = (title, items, key, color) => {
    return (
      <div className="animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              setActiveSection("HOME");
              setSearchQuery("");
            }}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => downloadQueueCSV(items, title)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <svg
                className="h-4 w-4 mr-2 text-gray-500"
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
              Download List
            </button>

            <div className="relative w-full sm:w-64">
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
                placeholder="Search Title, Project, Submitter..."
                value={searchQuery}
                onChange={(e) => handleSearch(e, key)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-colors"
              />
            </div>
          </div>
        </div>

        <Section
          title={title}
          totalItems={items.length}
          page={pages[key]}
          color={color}
          onPage={(dir) => handlePageChange(key, dir)}
        >
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <TableHeader />
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {paginate(items, key).map((n) => (
                <UseCaseAdminRow
                  key={n.id}
                  data={n}
                  onClick={() => setSelectedUseCase(n)}
                  onApprove={() => triggerApprove(n)}
                  onDecline={() => openActionModal(n, "DECLINE")}
                  onRework={() => openActionModal(n, "REWORK")}
                />
              ))}
            </div>
          </div>
        </Section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              GenAI Usecases
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Admin Review Pipeline
            </p>
          </div>
          <button
            onClick={() => navigate("/usecase-inventory")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            UseCase Library
          </button>
        </div>

        {/* Dynamic View Rendering */}
        {selectedUseCase ? (
          <UseCaseDetails
            data={selectedUseCase}
            onBack={() => setSelectedUseCase(null)}
            onApprove={() => triggerApprove(selectedUseCase)}
            onDecline={() => openActionModal(selectedUseCase, "DECLINE")}
            onRework={() => openActionModal(selectedUseCase, "REWORK")}
          />
        ) : activeSection === "HOME" ? (
          /* SUMMARY CARDS */
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
              Queue Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <SummaryCard
                title="Pending Approval"
                count={pendingUseCases.length}
                color="blue"
                onClick={() => setActiveSection("PENDING")}
              />
              <SummaryCard
                title="Rework in Progress"
                count={reworkUseCases.length}
                color="orange"
                onClick={() => setActiveSection("REWORK")}
              />
              <SummaryCard
                title="Declined Submissions"
                count={declinedUseCases.length}
                color="red"
                onClick={() => setActiveSection("DECLINED")}
              />
            </div>
          </div>
        ) : (
          /* SPECIFIC LISTS */
          <>
            {activeSection === "PENDING" &&
              renderListSection(
                "Pending Review",
                pendingFiltered,
                "PENDING",
                "blue",
              )}
            {activeSection === "REWORK" &&
              renderListSection(
                "Rework Requested",
                reworkFiltered,
                "REWORK",
                "orange",
              )}
            {activeSection === "DECLINED" &&
              renderListSection(
                "Declined",
                declinedFiltered,
                "DECLINED",
                "red",
              )}
          </>
        )}
      </div>

      {/* ======================= MODALS =============================== */}

      {/* Decline / Rework Feedback Modal */}
      {showActionBox && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-gray-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div
              className={`h-1.5 w-full ${actionType === "DECLINE" ? "bg-red-500" : "bg-orange-500"}`}
            ></div>
            <div className="p-8">
              <h3
                className={`text-xl font-black uppercase tracking-tight ${actionType === "DECLINE" ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}
              >
                {actionType === "DECLINE"
                  ? "Reject Submission"
                  : "Request Rework"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                Please provide feedback for the submitter.
              </p>

              <textarea
                className="w-full mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[160px] text-sm leading-relaxed"
                placeholder={
                  actionType === "DECLINE"
                    ? "Reason for declining..."
                    : "Instructions for rework..."
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={closeActionModal}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Dismiss
                </button>
                <button
                  className={`px-8 py-2.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 ${actionType === "DECLINE" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
                  disabled={!actionReason.trim() || isProcessing}
                  onClick={confirmAction}
                >
                  {isProcessing ? "Processing..." : "Send Feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-fadeIn">
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
                  "{approveTarget.title}"
                </strong>
                ?
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                This action will move it to the approved registry.
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
                  {isApproving ? "Approving..." : "Yes, Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS: CARDS & LISTS
// ==========================================

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
      <h3 className="text-base font-bold">{title}</h3>
      <div className="flex items-end justify-between mt-4">
        <span className="text-4xl font-black">{count}</span>
        <span className="text-xs font-semibold opacity-80 hover:opacity-100 flex items-center">
          Review List{" "}
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

// ✅ Restored the Missing Section Component declaration
function Section({ title, totalItems, page, color, onPage, children }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
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
            {totalItems} Total
          </span>
        </div>
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
        {totalItems === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No use cases found in this section.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function TableHeader() {
  return (
    <div className="flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
      <div className="w-16 shrink-0">ID</div>
      <div className="flex-1 min-w-0 pr-4">Title</div>
      <div className="w-44 shrink-0 hidden md:block pr-2">
        Project (ID/Name)
      </div>
      <div className="w-32 shrink-0 hidden lg:block">Submitter</div>
      <div className="w-32 shrink-0 hidden lg:block">Category</div>
      <div className="w-24 shrink-0 hidden xl:block">Status</div>
      <div className="w-[340px] shrink-0 text-right">Action</div>
    </div>
  );
}

function UseCaseAdminRow({ data, onClick, onApprove, onDecline, onRework }) {
  if (!data) return null;

  const pName = data.projectName || data.ProjectName;
  const pId = data.projectId || data.ProjectId;
  const projectDisplay =
    pName && pId ? `${pName} (${pId})` : pName || pId || "—";

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-16 shrink-0 text-xs font-mono text-gray-400">
        #{data.id}
      </div>
      <div
        className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate"
        title={data.title}
      >
        {data.title}
      </div>

      <div
        className="w-44 shrink-0 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={projectDisplay}
      >
        {projectDisplay}
      </div>

      <div
        className="w-32 shrink-0 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={data.submittedBy}
      >
        {data.submittedBy}
      </div>
      <div
        className="w-32 shrink-0 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={data.category}
      >
        {data.category}
      </div>
      <div className="w-24 shrink-0 hidden xl:block">
        <StatusBadge status={data.status} />
      </div>

      <div className="w-[340px] shrink-0 flex items-center justify-end gap-2">
        <button
          onClick={onClick}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-bold transition-all whitespace-nowrap"
        >
          View Details
        </button>

        {data.status === "PENDING" && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDecline();
              }}
              className="px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs font-bold transition-colors"
            >
              Decline
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRework();
              }}
              className="px-2 py-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded text-xs font-bold transition-colors"
            >
              Rework
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-colors"
            >
              Approve
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DETAILS COMPONENT (Full Width)
// ==========================================

export function UseCaseDetails({
  data,
  onBack,
  onApprove,
  onDecline,
  onRework,
}) {
  if (!data) return null;

  // ✅ Use the new safeParse function
  const benefits = safeParse(data.benefits || data.Benefits);

  const genaiTypesText = Array.isArray(data.genaiTypes)
    ? data.genaiTypes.join(", ")
    : (data.genaiTypes || "").replaceAll("|", ", ");
  const hasAny = (...vals) => vals.some((v) => (v ?? "").toString().trim());

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn mb-8">
      {/* Detail Header */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
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

          {/* ADMIN ACTION BUTTONS IN DETAILS */}
          {data.status === "PENDING" && (
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

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by <strong>{data.submittedBy}</strong> (ID:{" "}
              {data.employeeId}) on {data.submissionDate}
            </p>
          </div>
          <StatusBadge status={data.status} size="lg" />
        </div>
      </div>

      {/* Admin Feedback Alerts */}
      {(data.declineReason || data.reworkReason) && (
        <div
          className={`px-6 py-4 border-b flex flex-col gap-2 ${data.status === "DECLINED" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}
        >
          <div className="flex items-center">
            <span
              className={`text-sm font-bold uppercase tracking-wide ${data.status === "DECLINED" ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}
            >
              {data.status === "DECLINED"
                ? "Decline Reason:"
                : "Rework Instructions:"}
            </span>
          </div>
          <p
            className={`text-sm italic ${data.status === "DECLINED" ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"}`}
          >
            "{data.declineReason || data.reworkReason}"
          </p>
        </div>
      )}

      {/* Body Content */}
      <div className="px-6 py-8 space-y-8">
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

            <DetailItem label="Category" value={data.category} />
            <DetailItem label="Business Domain" value={data.domain} />
            <DetailItem label="Industry / Client" value={data.client} />
            <DetailItem label="Team / Organization" value={data.team} />
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem
                label="Process / Area Impacted"
                value={data.processImpacted}
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
              value={data.problemDescription}
            />
            <TextSection label="Key Pain Points" value={data.painPoints} />
            <TextSection
              label="GenAI Solution Description"
              value={data.solutionDescription}
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
                // ✅ Defensive parsing to handle any weird object shapes
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
// SMALL UI HELPERS
// ==========================================

function StatusBadge({ status, size = "sm" }) {
  let bgColor = "bg-gray-100 dark:bg-gray-700";
  let textColor = "text-gray-800 dark:text-gray-200";

  if (status === "APPROVED") {
    bgColor =
      "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800";
    textColor = "text-green-800 dark:text-green-400";
  } else if (status === "REWORK") {
    bgColor =
      "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800";
    textColor = "text-orange-800 dark:text-orange-400";
  } else if (status === "DECLINED") {
    bgColor =
      "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800";
    textColor = "text-red-800 dark:text-red-400";
  } else if (status === "PENDING") {
    bgColor =
      "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800";
    textColor = "text-blue-800 dark:text-blue-400";
  }

  const padding =
    size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded uppercase tracking-wider font-bold ${bgColor} ${textColor} ${padding}`}
    >
      {status || "UNKNOWN"}
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

function beautify(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
// ✅ Recursively unwrap JSON strings to fix old/corrupted database rows
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
