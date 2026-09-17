import React from "react";
import { textPrimary, textSecondary } from "../../styles";

export default function ProgressBar({ percent }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex justify-between text-sm mb-1">
        <span className={textSecondary}>Progress</span>
        <span className={textPrimary}>{pct}%</span>
      </div>

      {/* Track */}
      <div className="h-3 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
        {/* Fill */}
        <div
          className="h-3 bg-brand-600 dark:bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>
    </div>
  );
}