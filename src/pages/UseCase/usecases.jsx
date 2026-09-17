import React, { useEffect, useMemo, useState } from "react";
import { useRole } from "../../../src/gurds/userRole";
import { navigate } from "../../router/miniRouter";
import { useApp } from "../../context/AppContext";
import UseCaseDashboard from "./UseCaseDashboard";
import api from "../../Api";

const api_url = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

export default function UseCaseStore() {
  const { canAtLeast } = useRole();
  const { user } = useApp();
  const myEmpId = user?.employeeId;

  // View States
  const [activeSection, setActiveSection] = useState("HOME"); // 'HOME', 'APPROVED', 'PENDING', 'REWORK', 'DECLINED'
  const [pages, setPages] = useState({ APPROVED: 1, PENDING: 1, REWORK: 1, DECLINED: 1 });
  const [selectedUseCase, setSelectedUseCase] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Grouped lists (my submissions only)
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [declined, setDeclined] = useState([]);
  const [rework, setRework] = useState([]);

  /* =========================
      LOAD (MY) USE CASES
  ========================= */
  useEffect(() => {
    setSearchQuery("");
    setSelectedUseCase(null);

    const submitFlag = sessionStorage.getItem("usecase_submit_success");
    const resubmitFlag = sessionStorage.getItem("usecase_resubmitted");

    if (submitFlag || resubmitFlag) {
      setShowSuccess(true);
      sessionStorage.removeItem("usecase_submit_success");
      sessionStorage.removeItem("usecase_resubmitted");
      setTimeout(() => setShowSuccess(false), 4000);
    }

    if (!myEmpId) return;

    (async () => {
      try {
        // 🔒 Added &scope=personal to guarantee users only get their personal pipeline
        const [a, p, d, r] = await Promise.all([
          api.get("/api/usecases?status=APPROVED&scope=personal"),
          api.get("/api/usecases?status=PENDING&scope=personal"),
          api.get("/api/usecases?status=DECLINED&scope=personal"),
          api.get("/api/usecases?status=REWORK&scope=personal"),
        ]);

        setApproved(a.data || []);
        setPending(p.data || []);
        setDeclined(d.data || []);
        setRework(r.data || []);
      } catch (e) {
        console.error("Failed to fetch use cases safely from pipeline registry:", e);
      }
    })();
  }, [myEmpId]);

  /* =========================
     SEARCH MATCH & PAGINATION
  ========================= */
  const q = searchQuery.toLowerCase();
  const matchesSearch = (uc) =>
    (uc.title || "").toLowerCase().includes(q) ||
    (uc.category || "").toLowerCase().includes(q) ||
    (uc.domain || "").toLowerCase().includes(q) ||
    (uc.submittedBy || "").toLowerCase().includes(q) ||
    String(uc.id || "").toLowerCase().includes(q);

  const approvedFiltered = approved.filter(matchesSearch);
  const pendingFiltered = pending.filter(matchesSearch);
  const declinedFiltered = declined.filter(matchesSearch);
  const reworkFiltered = rework.filter(matchesSearch);

  const paginate = (items, sectionKey) => {
    const page = pages[sectionKey];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const handlePageChange = (sectionKey, direction) => {
    setPages(prev => ({
      ...prev,
      [sectionKey]: Math.max(1, prev[sectionKey] + direction)
    }));
  };

  const handleSearch = (e, sectionKey) => {
    setSearchQuery(e.target.value);
    setPages(prev => ({ ...prev, [sectionKey]: 1 }));
  };

  /* =========================
     ROLE SWITCH & ACTIONS
  ========================= */
  if (canAtLeast("admin")) {
    return <UseCaseDashboard />;
  }

  function handleEditRework(uc) {
    sessionStorage.setItem("edit_usecase_payload", JSON.stringify(uc));
    navigate("/submitUseCase?mode=edit");
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
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </button>

          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search by Title, Category, ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e, key)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-colors"
            />
          </div>
        </div>

        <Section title={title} totalItems={items.length} page={pages[key]} color={color} onPage={(dir) => handlePageChange(key, dir)}>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <TableHeader />
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {paginate(items, key).map(n => (
                <UseCaseRow 
                  key={n.id} 
                  data={n} 
                  type={key}
                  onClick={() => setSelectedUseCase(n)} 
                  onEdit={() => handleEditRework(n)}
                />
              ))}
            </div>
          </div>
        </Section>
      </div>
    );
  };

  /* =========================
     USER VIEW RENDER
  ========================= */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
              GenAI UseCases
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage and track your submitted Use Cases.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/usecase-inventory")}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              UseCase Library
            </button>
            <button
              onClick={() => navigate("/submitUseCase")}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              + Submit Use Case
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="mb-6 p-4 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-start gap-3 animate-fadeIn">
            <span className="text-xl">✅</span>
            <p className="text-sm font-medium text-green-800 dark:text-green-300 mt-1">
              Use case submitted successfully and is now awaiting admin review.
            </p>
          </div>
        )}

        {/* Dynamic View Rendering */}
        {selectedUseCase ? (
          <UseCaseDetails 
            data={selectedUseCase} 
            onBack={() => setSelectedUseCase(null)} 
            onEditResubmit={handleEditRework} 
          />
        ) : activeSection === "HOME" ? (
          /* SUMMARY CARDS */
          <div className="animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Your Submissions Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Approved" count={approved.length} color="green" onClick={() => setActiveSection("APPROVED")} />
              <SummaryCard title="Pending Review" count={pending.length} color="blue" onClick={() => setActiveSection("PENDING")} />
              <SummaryCard title="Needs Rework" count={rework.length} color="orange" onClick={() => setActiveSection("REWORK")} />
              <SummaryCard title="Declined" count={declined.length} color="red" onClick={() => setActiveSection("DECLINED")} />
            </div>
          </div>
        ) : (
          /* SPECIFIC LISTS */
          <>
            {activeSection === "APPROVED" && renderListSection("Approved Use Cases", approvedFiltered, "APPROVED", "green")}
            {activeSection === "PENDING" && renderListSection("Pending Review", pendingFiltered, "PENDING", "blue")}
            {activeSection === "REWORK" && renderListSection("Needs Rework", reworkFiltered, "REWORK", "orange")}
            {activeSection === "DECLINED" && renderListSection("Declined", declinedFiltered, "DECLINED", "red")}
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
    green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/40",
    blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/40",
    orange: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/40",
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
          View List <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </span>
      </div>
    </div>
  );
}

function Section({ title, totalItems, page, color, onPage, children }) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const colorMap = { green: "bg-green-500", blue: "bg-blue-600", orange: "bg-orange-500", red: "bg-red-600" };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-4 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${colorMap[color]} ${color === 'blue' ? 'animate-pulse' : ''}`} />
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
          <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300 font-medium">
            {totalItems} Total
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm">
            <button disabled={page === 1} onClick={() => onPage(-1)} className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
              Page {page} of {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => onPage(1)} className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
      <div className="p-6">
        {totalItems === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No items found in this section.</p> : children}
      </div>
    </section>
  );
}

function TableHeader() {
  return (
    <div className="flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
      <div className="w-16">ID</div>
      <div className="flex-1 min-w-0 pr-4">Title</div>
      <div className="w-32 hidden md:block">Category</div>
      <div className="w-32 hidden lg:block">Domain</div>
      <div className="w-24 hidden xl:block">Status</div>
      <div className="w-40 text-right">Action</div>
    </div>
  );
}

function UseCaseRow({ data, type, onClick, onEdit }) {
  if (!data) return null;

  const id = data.id || "—";
  const title = data.title || "Untitled Use Case";
  const category = data.category || "N/A";
  const domain = data.domain || "N/A";
  const status = data.status || "PENDING";

  return (
    <div className="group flex items-center px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-sm">
      <div className="w-16 text-xs font-mono text-gray-400">#{id}</div>
      <div className="flex-1 min-w-0 pr-4 font-bold text-gray-900 dark:text-white truncate" title={title}>{title}</div>
      <div className="w-32 hidden md:block text-gray-600 dark:text-gray-400 truncate pr-2" title={category}>{category}</div>
      <div className="w-32 hidden lg:block text-gray-600 dark:text-gray-400 truncate pr-2" title={domain}>{domain}</div>
      <div className="w-24 hidden xl:block"><StatusBadge status={status} /></div>
      
      <div className="w-40 flex items-center justify-end gap-2">
        {type === "REWORK" && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
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

export function UseCaseDetails({ data, onBack, onApprove, onDecline, onRework }) {
  if (!data) return null;

  // ✅ Secure recursive parse implementation replaces old try-catch logic
  const benefits = safeParse(data.benefits || data.Benefits);

  const genaiTypesText = Array.isArray(data.genaiTypes) ? data.genaiTypes.join(", ") : (data.genaiTypes || "").replaceAll("|", ", ");
  const hasAny = (...vals) => vals.some(v => (v ?? "").toString().trim());

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fadeIn mb-8">
      
      {/* Detail Header */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button onClick={onBack} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {data.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Submitted by <strong>{data.submittedBy}</strong> (ID: {data.employeeId}) on {data.submissionDate}
            </p>
          </div>
          <StatusBadge status={data.status} size="lg" />
        </div>
      </div>

      {/* Admin Feedback Alerts */}
      {(data.declineReason || data.reworkReason) && (
        <div className={`px-6 py-4 border-b flex flex-col gap-2 ${data.status === 'DECLINED' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center">
             <span className={`text-sm font-bold uppercase tracking-wide ${data.status === 'DECLINED' ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'}`}>
               {data.status === 'DECLINED' ? 'Decline Reason:' : 'Rework Instructions:'}
             </span>
          </div>
          <p className={`text-sm italic ${data.status === 'DECLINED' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
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
            {/* ✅ Appended explicit Project Name and Project ID values inside the dashboard look view */}
            <DetailItem label="Project Name" value={data.projectName || data.ProjectName} />
            <DetailItem label="Project ID" value={data.projectId || data.ProjectId} />
            
            <DetailItem label="Category" value={data.category} />
            <DetailItem label="Business Domain" value={data.domain} />
            <DetailItem label="Industry / Client" value={data.client} />
            <DetailItem label="Team / Organization" value={data.team} />
            <DetailItem label="Contributors" value={data.contributors} />
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="Process / Area Impacted" value={data.processImpacted} />
            </div>
          </dl>
        </div>

        {/* SECTION 2 & 3 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            Narrative & Solution
          </h3>
          <div className="space-y-6">
            <TextSection label="Problem Description (Pre-GenAI)" value={data.problemDescription} />
            <TextSection label="Key Pain Points" value={data.painPoints} />
            <TextSection label="GenAI Solution Description" value={data.solutionDescription} />
            <DetailItem label="Type of GenAI Used" value={genaiTypesText} />
          </div>
        </div>

        {/* SECTION 4: How GenAI Helped */}
        {hasAny(data.requirementsHelp, data.designHelp, data.developmentHelp, data.testingHelp, data.supportHelp) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Development Contribution
            </h3>
            <div className="space-y-6">
              <TextSection label="Requirements & Analysis" value={data.requirementsHelp} />
              <TextSection label="Design & Architecture" value={data.designHelp} />
              <TextSection label="Development & Coding" value={data.developmentHelp} />
              <TextSection label="Testing & Validation" value={data.testingHelp} />
              <TextSection label="Support & Maintenance" value={data.supportHelp} />
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
                <DetailItem label="Integration Points" value={data.integrationPoints} />
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
                // ✅ Defensive rendering evaluates safely
                let display = null;
                if (val !== null && val !== undefined) {
                  if (typeof val === "object") {
                    if ("text" in val) {
                      display = val.enabled !== false ? val.text : null;
                    } else if (Array.isArray(val)) {
                      display = val.join(", ");
                    } else {
                      display = Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(", ");
                    }
                  } else {
                    display = String(val);
                  }
                }

                if (!display || String(display).trim() === "") return null;

                return (
                  <div key={key} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{beautify(key)}</dt>
                    <dd className="mt-1 text-base font-bold text-blue-700 dark:text-blue-400">{display}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        {/* SECTION 8: Before vs After */}
        {hasAny(data.beforeProcess, data.afterProcess, data.accuracyImprovement, data.scalabilityImprovement) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Before vs After Transformation
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TextSection label="Before GenAI" value={data.beforeProcess} bgHighlight="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 text-gray-800 dark:text-gray-200" />
              <TextSection label="After GenAI" value={data.afterProcess} bgHighlight="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30 text-gray-800 dark:text-gray-200" />
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailItem label="Accuracy Improvement" value={data.accuracyImprovement} />
              <DetailItem label="Scalability Improvement" value={data.scalabilityImprovement} />
            </dl>
          </div>
        )}

        {/* SECTION 11: Reusability */}
        {hasAny(data.reusable, data.scalabilityPotential, data.futureEnhancements) && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              Reusability & Scalability
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <DetailItem label="Reusable Across Teams/Projects" value={data.reusable} />
              <DetailItem label="Scalability Potential" value={data.scalabilityPotential} />
            </dl>
            <TextSection label="Future Enhancements Planned" value={data.futureEnhancements} />
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

  if (status === 'APPROVED') {
    bgColor = "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800";
    textColor = "text-green-800 dark:text-green-400";
  } else if (status === 'REWORK') {
    bgColor = "bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800";
    textColor = "text-orange-800 dark:text-orange-400";
  } else if (status === 'DECLINED') {
    bgColor = "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800";
    textColor = "text-red-800 dark:text-red-400";
  } else if (status === 'PENDING') {
    bgColor = "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800";
    textColor = "text-blue-800 dark:text-blue-400";
  }

  const padding = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center rounded uppercase tracking-wider font-bold ${bgColor} ${textColor} ${padding}`}>
      {status || "UNKNOWN"}
    </span>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}

function TextSection({ label, value, bgHighlight }) {
  if (!value) return null;
  const defaultBg = "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
  
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{label}</h4>
      <div className={`text-sm whitespace-pre-wrap p-4 rounded-md border ${bgHighlight || defaultBg}`}>
        {value}
      </div>
    </div>
  );
}

function LinkItem({ label, value }) {
  if (!value) return null;
  return (
    <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors border border-blue-200 dark:border-blue-800 text-sm shadow-sm">
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg>
      {label}
    </a>
  );
}

function beautify(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

// ✅ Recursive unwrap logic placed reliably inside layout
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