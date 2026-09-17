import React, { useEffect, useState, useMemo } from "react";
import { navigate } from "../../router/miniRouter";
import { useRole } from "../../../src/gurds/userRole";
import BotDashboard from "./BotDashboard";
import { useApp } from "../../context/AppContext";
import api from "../../Api";

const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

// ✅ normalize bot keys
function normalizeBot(b) {
  if (!b) return b;
  return {
    ...b,
    id: b.id ?? b.botId ?? b.BotId,
    name: b.name ?? b.Name,
    description: b.description ?? b.Description,
    useCase: b.useCase ?? b.UseCase,
    category: b.category ?? b.Category,
    capabilities: b.capabilities ?? b.Capabilities,
    projectName: b.projectName ?? b.ProjectName,
    projectId: b.projectId ?? b.ProjectId,
    contributors: b.contributors ?? b.Contributors,
    demoLink: b.demoLink ?? b.DemoLink,
    owner: b.owner ?? b.Owner,
    submittedBy: b.submittedBy ?? b.SubmittedBy,
    employeeId: b.employeeId ?? b.EmployeeId,
    status: b.status ?? b.Status,
    declineReason: b.declineReason ?? b.DeclineReason,
    reworkReason: b.reworkReason ?? b.ReworkReason,
  };
}

export default function BotStore() {
  const { user } = useApp();
  const myEmpId = user?.employeeId;

  const [activeSection, setActiveSection] = useState("HOME");
  const [pages, setPages] = useState({
    APPROVED: 1,
    PENDING: 1,
    REWORK: 1,
    DECLINED: 1,
  });

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const [myApproved, setMyApproved] = useState([]);
  const [myPending, setMyPending] = useState([]);
  const [myDeclined, setMyDeclined] = useState([]);
  const [myRework, setMyRework] = useState([]);

  const { canAtLeast } = useRole();

  useEffect(() => {
    // 🛑 CRITICAL FIX: Prevent API requests before user is loaded to stop 500 errors!
    if (!myEmpId) return;

    setSearchQuery("");
    setSelectedAgent(null);

    if (sessionStorage.getItem("bot_submit_success")) {
      setShowSuccess(true);
      sessionStorage.removeItem("bot_submit_success");
      setTimeout(() => setShowSuccess(false), 4000);
    }

    // ✅ Secure Parallel Data Gathering
    (async () => {
      try {
        // In BotStore.jsx
        const [approved, pending, declined, rework] = await Promise.all([
          api.get("/api/bots?status=APPROVED&scope=personal"),
          api.get("/api/bots?status=PENDING&scope=personal"),
          api.get("/api/bots?status=DECLINED&scope=personal"),
          api.get("/api/bots?status=REWORK&scope=personal"),
        ]);

        setMyApproved((approved.data || []).map(normalizeBot));
        setMyPending((pending.data || []).map(normalizeBot));
        setMyDeclined((declined.data || []).map(normalizeBot));
        setMyRework((rework.data || []).map(normalizeBot));
      } catch (err) {
        console.error("Failed to collect authorized bot listings:", err);
      }
    })();
  }, [myEmpId]);

  if (canAtLeast("admin")) {
    return <BotDashboard />;
  }

  /* =========================
      SEARCH & PAGINATION
  ========================= */
  const q = searchQuery.toLowerCase();
  const matchesSearch = (a) => {
    const b = normalizeBot(a);
    return [
      b.name,
      b.category,
      b.useCase,
      b.projectName,
      b.projectId,
      String(b.id || ""),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  const myApprovedFiltered = myApproved.filter(matchesSearch);
  const myPendingFiltered = myPending.filter(matchesSearch);
  const myDeclinedFiltered = myDeclined.filter(matchesSearch);
  const myReworkFiltered = myRework.filter(matchesSearch);

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

  function handleEditResubmit(bot) {
    const b = normalizeBot(bot);
    sessionStorage.setItem("edit_bot_payload", JSON.stringify(b));
    navigate("/submit?mode=edit");
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
              placeholder="Search by Name, Category, ID, Project..."
              value={searchQuery}
              onChange={(e) => handleSearch(e, key)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-colors"
            />
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
                <BotUserCard
                  key={n.id}
                  agent={n}
                  type={key}
                  onClick={() => setSelectedAgent(n)}
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              Bot Store
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage and track your submitted GenAI bots.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/botinventory")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Bot Wall
            </button>
            <button
              onClick={() => navigate("/submit")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + Submit Bot
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 p-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-start gap-3 animate-fadeIn">
            <span className="text-xl">✅</span>
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mt-1">
              Bot submitted successfully and is now awaiting review.
            </p>
          </div>
        )}

        {selectedAgent ? (
          <AgentDetails
            agent={normalizeBot ? normalizeBot(selectedAgent) : selectedAgent}
            onBack={() => setSelectedAgent(null)}
            onEditResubmit={handleEditResubmit}
          />
        ) : activeSection === "HOME" ? (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">
              Your Submissions Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard
                title="Approved Bots"
                count={myApproved.length}
                color="green"
                onClick={() => setActiveSection("APPROVED")}
              />
              <SummaryCard
                title="Pending Review"
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
          <>
            {activeSection === "APPROVED" &&
              renderListSection(
                "Approved Bots",
                myApprovedFiltered,
                "APPROVED",
                "green",
              )}
            {activeSection === "PENDING" &&
              renderListSection(
                "Pending Review",
                myPendingFiltered,
                "PENDING",
                "blue",
              )}
            {activeSection === "REWORK" &&
              renderListSection(
                "Needs Rework",
                myReworkFiltered,
                "REWORK",
                "orange",
              )}
            {activeSection === "DECLINED" &&
              renderListSection(
                "Declined",
                myDeclinedFiltered,
                "DECLINED",
                "red",
              )}
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
            No bots found in this section.
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
      <div className="flex-1 min-w-0 pr-4">Bot Name</div>
      <div className="w-32 hidden md:block">Category</div>
      <div className="w-40 hidden lg:block">Use Case</div>
      <div className="w-24 hidden xl:block">Status</div>
      <div className="w-40 text-right">Action</div>
    </div>
  );
}

function BotUserCard({ agent, type, onClick, onEdit }) {
  if (!agent) return null;

  const id = agent.id || "—";
  const name = agent.name || "Untitled Bot";
  const category = agent.category || "N/A";
  const useCase = agent.useCase || "N/A";
  const status = agent.status || "PENDING";

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-16 text-xs font-mono text-gray-400">#{id}</div>
      <div
        className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate"
        title={name}
      >
        {name}
      </div>
      <div
        className="w-32 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={category}
      >
        {category}
      </div>
      <div
        className="w-40 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2"
        title={useCase}
      >
        {useCase}
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

// ==========================================
// DETAILS COMPONENT (Full Width)
// ==========================================

export function AgentDetails({ agent, onBack, onEditResubmit }) {
  const capabilities = agent.capabilities
    ? agent.capabilities
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(", ")
    : "N/A";

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn">
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
              {agent.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by{" "}
              <strong>{agent.submittedBy || agent.owner || "Unknown"}</strong>{" "}
              (ID: {agent.employeeId})
            </p>
          </div>
          <StatusBadge status={agent.status} size="lg" />
        </div>
      </div>

      {agent.status === "REWORK" && onEditResubmit && (
        <div className="bg-orange-50 dark:bg-orange-900/20 px-6 py-4 border-b border-orange-200 dark:border-orange-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center text-orange-800 dark:text-orange-300">
            <svg
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-bold">Rework Required:</span>
            <span className="text-sm ml-1 italic">"{agent.reworkReason}"</span>
          </div>
          <button
            onClick={() => onEditResubmit(agent)}
            className="whitespace-nowrap inline-flex items-center px-4 py-2 text-sm font-bold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit & Resubmit
          </button>
        </div>
      )}

      {agent.status === "DECLINED" && agent.declineReason && (
        <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800 flex flex-col gap-2">
          <div className="flex items-center text-red-800 dark:text-red-300">
            <span className="text-sm font-bold uppercase tracking-wide">
              Decline Reason:
            </span>
          </div>
          <p className="text-sm italic text-red-700 dark:text-red-400">
            "{agent.declineReason}"
          </p>
        </div>
      )}

      <div className="px-6 py-6 space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            General Information
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem label="Use Case" value={agent.useCase} />
            <DetailItem label="Category" value={agent.category} />
            <DetailItem label="Owner" value={agent.owner} />
            <DetailItem label="Contributors" value={agent.contributors} />
            <DetailItem label="Project Name" value={agent.projectName} />
            <DetailItem label="Project ID" value={agent.projectId} />
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
            <TextSection label="Bot Description" value={agent.description} />
          </div>
        </div>

        {agent.demoLink && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Resources
            </h3>
            <a
              href={agent.demoLink}
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
