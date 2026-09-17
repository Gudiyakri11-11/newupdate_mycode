import React, { useEffect, useState, useMemo } from "react";
import { navigate } from "../../router/miniRouter";
import { useRole } from "../../../src/gurds/userRole";
import { useApp } from "../../context/AppContext";
import NeuroITDashboard from "./NeuroITDashboard";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function NeuroITStore() {
  const { canAtLeast } = useRole();
  const { user } = useApp();
  const myEmpId = user?.employeeId;

  // View States
  const [activeSection, setActiveSection] = useState("HOME"); // 'HOME', 'APPROVED', 'PENDING', 'REWORK', 'DECLINED'
  const [selected, setSelected] = useState(null);

  // Data States
  const [myApproved, setMyApproved] = useState([]);
  const [myPending, setMyPending] = useState([]);
  const [myDeclined, setMyDeclined] = useState([]);
  const [myRework, setMyRework] = useState([]);

  // Search & Pagination & UI
  const [searchQuery, setSearchQuery] = useState("");
  const [pages, setPages] = useState({
    APPROVED: 1,
    PENDING: 1,
    REWORK: 1,
    DECLINED: 1,
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const isMine = (item) => item?.employeeId === myEmpId;

  useEffect(() => {
    setSelected(null);
    const submitFlag = sessionStorage.getItem("neuroit_submit_success");
    const resubmitFlag = sessionStorage.getItem("neuroit_resubmitted");

    if (submitFlag || resubmitFlag) {
      setShowSuccess(true);
      sessionStorage.removeItem("neuroit_submit_success");
      sessionStorage.removeItem("neuroit_resubmitted");
      setTimeout(() => setShowSuccess(false), 5000);
    }

    if (!myEmpId) return;

    (async () => {
      try {
        // 🔒 Added &scope=personal to lock data to the user's Employee ID
        const [approved, pending, declined, rework] = await Promise.all([
          api.get("/api/neuroit?status=APPROVED&scope=personal"),
          api.get("/api/neuroit?status=PENDING&scope=personal"),
          api.get("/api/neuroit?status=DECLINED&scope=personal"),
          api.get("/api/neuroit?status=REWORK&scope=personal"),
        ]);
        setMyApproved(approved.data || []);
        setMyPending(pending.data || []);
        setMyDeclined(declined.data || []);
        setMyRework(rework.data || []);
      } catch (e) {
        console.error(
          "Failed to fetch NeuroIT store data metrics securely:",
          e,
        );
      }
    })();
  }, [myEmpId]);

  /* =========================
     SEARCH & PAGINATION
  ========================= */
  const match = (r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.account?.toLowerCase().includes(q) ||
      r.applicationsImpacted?.toLowerCase().includes(q) ||
      r.executiveOutcome?.toLowerCase().includes(q) ||
      r.neuroitCapability?.toLowerCase().includes(q) ||
      r.contributors?.toLowerCase().includes(q) ||
      String(r.id || r.NeuroITId || "")
        .toLowerCase()
        .includes(q)
    );
  };

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
    setPages((prev) => ({ ...prev, [sectionKey]: 1 })); // Reset to page 1 on search
  };

  function handleEditResubmit(item) {
    sessionStorage.setItem("edit_neuroit_payload", JSON.stringify(item));
    navigate("/submitNeuroIT?mode=edit");
  }

  // Admin routing
  if (canAtLeast("admin")){
    return <NeuroITDashboard />;
  }

  /* =========================
     RENDER HELPERS
  ========================= */
  const renderListSection = (title, items, key, color) => {
    const filteredItems = items.filter(match);

    return (
      <div className="animate-fadeIn">
        {/* Top Controls: Back & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => {
              setActiveSection("HOME");
              searchQuery && setSearchQuery("");
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
              placeholder="Search by Title, Account, ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e, key)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-colors"
            />
          </div>
        </div>

        {/* Section Table */}
        <Section
          title={title}
          totalItems={filteredItems.length}
          page={pages[key]}
          color={color}
          onPage={(dir) => handlePageChange(key, dir)}
        >
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <TableHeader />
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {paginate(filteredItems, key).map((n) => (
                <NeuroITUserCard
                  key={n.id || n.NeuroITId}
                  data={n}
                  type={key}
                  onClick={() => setSelected(n)}
                  onEdit={() => handleEditResubmit(n)}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              NeuroIT Use Case Library
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage and track your operational AI submissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/neuroit-inventory")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Inventory
            </button>
            <button
              onClick={() => navigate("/submitNeuroIT")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + Submit Use Case
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="mb-6 p-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-start gap-3 animate-fadeIn">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Use case submitted successfully and is now awaiting review.
            </p>
          </div>
        )}

        {/* Dynamic View Rendering */}
        {selected ? (
          <NeuroITDetails
            data={selected}
            onBack={() => setSelected(null)}
            onEditResubmit={handleEditResubmit}
          />
        ) : activeSection === "HOME" ? (
          /* SUMMARY CARDS */
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
              Your Submissions Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                title="Approved"
                count={myApproved.length}
                color="green"
                onClick={() => setActiveSection("APPROVED")}
              />
              <SummaryCard
                title="Pending Approval"
                count={myPending.length}
                color="blue"
                onClick={() => setActiveSection("PENDING")}
              />
              <SummaryCard
                title="Needs Rework"
                count={myRework.length}
                color="orange"
                onClick={() => setActiveSection("REWORK")}
              />
              <SummaryCard
                title="Declined"
                count={myDeclined.length}
                color="red"
                onClick={() => setActiveSection("DECLINED")}
              />
            </div>
          </div>
        ) : (
          /* SPECIFIC LISTS */
          <>
            {activeSection === "APPROVED" &&
              renderListSection(
                "Approved Use Cases",
                myApproved,
                "APPROVED",
                "green",
              )}
            {activeSection === "PENDING" &&
              renderListSection("Pending Review", myPending, "PENDING", "blue")}
            {activeSection === "REWORK" &&
              renderListSection("Needs Rework", myRework, "REWORK", "orange")}
            {activeSection === "DECLINED" &&
              renderListSection("Declined", myDeclined, "DECLINED", "red")}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS: CARDS & LISTS
// ==========================================

function SummaryCard({ title, count, color, onClick }) {
  const colorStyles = {
    green:
      "bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40",
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
          View Details{" "}
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

function Section({ title, totalItems, page, color, onPage, children }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const colorMap = {
    green: "bg-green-500",
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
            No use cases found.
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
      <div className="w-16">ID</div>
      <div className="flex-1 min-w-0 pr-4">Title</div>
      <div className="w-32 hidden sm:block">Account</div>
      <div className="w-32 hidden md:block">Capability</div>
      <div className="w-28 hidden lg:block">Date</div>
      <div className="w-24 hidden xl:block">Status</div>
      <div className="w-40 text-right">Action</div>
    </div>
  );
}

function NeuroITUserCard({ data, type, onClick, onEdit }) {
  if (!data) return null;

  const title = data.title || data.Title || "Untitled";
  const status = data.status || data.Status || "PENDING";
  const account = data.account || data.Account || "N/A";
  const capability = data.neuroitCapability || data.NeuroITCapability || "N/A";
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
      <div className="w-32 hidden sm:block text-gray-600 dark:text-gray-400 truncate pr-2">
        {account}
      </div>
      <div className="w-32 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2">
        {capability}
      </div>
      <div className="w-28 hidden lg:block text-gray-500 dark:text-gray-400 text-xs">
        {formattedDate}
      </div>
      <div className="w-24 hidden xl:block">
        <StatusBadge status={status} />
      </div>

      <div className="w-40 flex items-center justify-end gap-2">
        {type === "REWORK" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded text-xs font-bold transition-all whitespace-nowrap"
          >
            Edit
          </button>
        )}
        <button
          onClick={onClick}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 hover:text-blue-700 dark:text-gray-300 dark:hover:text-blue-400 rounded text-xs font-bold transition-all shadow-sm whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export function NeuroITDetails({
  data,
  onBack,
  isAdmin,
  onApprove,
  onDecline,
  onRework,
}) {
  // ✅ FIX 1: Safely Parse Categories regardless of format
  const rawCategories = data.categories || data.Categories || "";
  const categories = Array.isArray(rawCategories)
    ? rawCategories.join(", ")
    : typeof rawCategories === "string"
      ? rawCategories.split("|").join(", ")
      : String(rawCategories);

  // ✅ FIX 2: Implement robust safe parsing to catch double-stringified objects
  const metrics = safeParse(data.metrics || data.Metrics);
  const benefits = safeParse(data.benefits || data.Benefits);

  const createdAt = data.createdAt || data.CreatedAt || Date.now();
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const executiveOutcome = data.executiveOutcome || data.ExecutiveOutcome;

  // ✅ FIX 3: Reliable function to render nested benefit/metric objects cleanly
  const renderDataBlock = (dataObj, colorClass) => {
    return Object.entries(dataObj).map(([key, val]) => {
      let display = null;

      // Handle nulls and undefined
      if (val === null || val === undefined) {
        return null;
      } else if (typeof val === "object") {
        // If it follows the expected { text, enabled } shape from the form
        if ("text" in val) {
          display = val.enabled !== false ? val.text : null;
        }
        // If it's an Array
        else if (Array.isArray(val)) {
          display = val.join(", ");
        }
        // If it's an unexpected object layout, format it clean so it isn't [object Object]
        else {
          display = Object.entries(val)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
        }
      } else {
        display = String(val); // Booleans, numbers, pure strings
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
            Submitted by{" "}
            <span className="font-bold">
              {data.submittedBy || data.SubmittedBy}
            </span>{" "}
            (ID: {data.employeeId || data.EmployeeId}) on {formattedDate}
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

// ✅ FIX 4: Recursively handle double stringified JSON from database
// ✅ FIX: Recursively unwrap JSON strings no matter how many layers deep they are encoded
function safeParse(data) {
  if (!data) return {};

  let parsed = data;

  // Keep parsing as long as the result is still a string
  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      // If it fails to parse (e.g., malformed string), return an empty object to prevent UI bleeding
      return {};
    }
  }

  // Ensure the final result is genuinely an object (not null, not a number, not a boolean)
  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }

  return parsed;
}

function beautify(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
