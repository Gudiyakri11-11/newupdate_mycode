import React from "react";

export default function NeuroITCard({ data, onClick }) {
  if (!data) return null;

  const title = data.title || data.Title || "Untitled";
  const status = data.status || data.Status || "PENDING";
  const submittedBy = data.submittedBy || data.SubmittedBy || "Unknown";
  const account = data.account || data.Account || "N/A";
  const formattedDate = new Date(data.createdAt || Date.now()).toLocaleDateString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric'
  });

  return (
    <div className="group flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors text-sm">

      {/* Row Data */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="w-10 text-xs font-mono text-gray-400">#{data.id || data.NeuroITId}</span>
        <span className="w-1/4 font-bold text-gray-900 dark:text-white truncate pr-2" title={title}>{title}</span>
        <span className="w-1/6 text-gray-600 dark:text-gray-400 truncate hidden sm:block">{submittedBy}</span>
        <span className="w-1/6 text-gray-600 dark:text-gray-400 truncate hidden md:block">{account}</span>
        <span className="w-24 text-gray-500 dark:text-gray-400 text-xs hidden lg:block">{formattedDate}</span>
        <span className="w-24"><StatusBadge status={status} /></span>
      </div>

      {/* Action */}
      <button
        onClick={onClick}
        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 dark:bg-gray-700 dark:hover:bg-blue-900/40 dark:text-gray-300 dark:hover:text-blue-400 rounded text-xs font-bold transition-all whitespace-nowrap"
      >
        View Details
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    APPROVED: "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
    PENDING: "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
    REWORK: "text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
    DECLINED: "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config[status] || "text-gray-500 bg-gray-100"}`}>
      {status}
    </span>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={value}>{value}</dd>
    </div>
  );
}

function TextSection({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</h4>
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        {value}
      </div>
    </div>
  );
}

// ✅ FIXED: Correctly handles nested {enabled, text} objects for the Card component
function MetricBlock({ label, value, type }) {
  // 1. Check if the value is a nested object
  const isObject = typeof value === 'object' && value !== null;

  // 2. If it's an object with {enabled: false}, don't render it at all
  if (isObject && value.enabled === false) return null;

  // 3. Extract the string value safely
  const displayValue = isObject ? (value.text || "") : value;

  // 4. If empty string, don't render
  if (!displayValue) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
      <dt className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate" title={label}>
        {label}
      </dt>
      <dd className={`mt-1 text-base font-semibold ${type === 'metric' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'} truncate`} title={String(displayValue)}>
        {displayValue}
      </dd>
    </div>
  );
}

function safeParse(str) {
  try { return JSON.parse(str || "{}"); } catch { return {}; }
}

function beautify(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}