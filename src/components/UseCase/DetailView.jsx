import React from "react";

export default function DataInspectorPanel({ data, className = "" }) {
  // If no data is selected, show a beautiful idle state
  if (!data) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full p-8 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm ${className}`}
      >
        <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
          {/* Subtle pulse ring behind the icon */}
          <div className="absolute inset-0 rounded-full border-2 border-teal-500/20 animate-ping"></div>
          <svg
            className="w-10 h-10 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Inspector Idle
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] leading-relaxed">
          Waiting for input. Select a use case from your registry to view its
          complete specifications and metadata.
        </p>
      </div>
    );
  }

  // Active State UI
  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* HEADER: Sticky with a subtle gradient bar */}
      <div className="shrink-0 relative p-6 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>

        <div className="flex justify-between items-start gap-4">
          <div>
            <span className="inline-block px-2.5 py-1 mb-3 text-[10px] font-black tracking-widest text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30 rounded-lg uppercase">
              Asset Details
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight line-clamp-2">
              {data.title || data.name || "Untitled Asset"}
            </h2>
          </div>

          {/* Status Badge */}
          {data.status && (
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                data.status === "APPROVED"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {data.status}
            </div>
          )}
        </div>
      </div>

      {/* BODY: Scrollable Details Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {/* Section: Overview */}
        <section>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-teal-500 rounded-full mr-2"></span>
            Overview Overview
          </h4>
          <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50">
            <DataRow label="Category" value={data.category} />
            <DataRow label="Business Domain" value={data.domain} />
            <DataRow label="Industry / Client" value={data.client} />
          </div>
        </section>

        {/* Section: Ownership */}
        <section>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
            Ownership & Governance
          </h4>
          <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/50">
            <DataRow
              label="Submitted By"
              value={data.submittedBy || data.owner}
            />
            <DataRow label="Employee ID" value={data.employeeId} />
            <DataRow label="Team / Org" value={data.team} />
            {/* ✅ Added Contributors Row */}
            <DataRow label="Contributors" value={data.contributors} />
          </div>
        </section>

        {/* Section: Extended Description (if exists) */}
        {(data.description || data.useCase) && (
          <section>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
              Description
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              {data.description || data.useCase}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

// Internal helper for clean data rows
function DataRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 border-b border-gray-200 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
        {value}
      </span>
    </div>
  );
}
