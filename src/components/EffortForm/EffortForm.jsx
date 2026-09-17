import React from "react";

export function Info({ label, value }) {
  return (
    <div className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{String(value ?? "-")}</div>
    </div>
  );
}

export function FieldDecimal({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
        {label}
      </label>
      <input
        className={
          "mt-1 w-full rounded-lg border px-3 py-2 bg-white text-slate-900 border-slate-300 placeholder-slate-400 " +
          "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-blue-400/50" +
          (disabled ? " opacity-60 cursor-not-allowed" : "")
        }
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        disabled={disabled}
      />
    </div>
  );
}

export function HelpTip({ text }) {
  return (
    <span className="ml-2 relative inline-block group align-middle">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-help">
        ?
      </span>
      <span className="pointer-events-none absolute z-20 hidden group-hover:block left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow">
        {text}
      </span>
    </span>
  );
}

export function LabelWithHelp({ text, help }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{text}</span>
      <HelpTip text={help} />
    </span>
  );
}

export function LockBadge({ reason = "This Gauge entry is locked." }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 text-xs"
      title={reason}
    >
      Locked
    </span>
  );
}
