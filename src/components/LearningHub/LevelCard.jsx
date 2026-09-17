import React from "react";
import { surface, hoverSurface, textPrimary, textSecondary, textMuted } from "../../styles";

export default function LevelCard({ level, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={level}
      className={[
        "w-full text-left rounded-xl p-5 transition",
        "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400",
        "shadow-sm hover:shadow-md active:shadow-sm",
        "ring-1 ring-black/5 dark:ring-white/10",
        surface,
        hoverSurface,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {/* Badge */}
        <div
          className={[
            "shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
            "bg-gray-100 text-gray-700",
            "dark:bg-gray-800 dark:text-gray-200",
          ].join(" ")}
          aria-hidden="true"
        >
          <span className="font-bold">{level?.[0] ?? "L"}</span>
        </div>

        {/* Text */}
        <div className="min-w-0">
          <h4 className={`font-semibold ${textPrimary}`}>{level}</h4>
          <p className={`mt-1 text-sm leading-relaxed ${textSecondary}`}>
            {desc}
          </p>

          {/* Optional subtle hint line (purely visual; remove if you want ultra-minimal) */}
          <p className={`mt-2 text-xs ${textMuted}`}>
            Click to explore this level
          </p>
        </div>
      </div>
    </button>
  );
}