import React from "react";
import { surface, hoverSurface, textPrimary, textSecondary } from "../styles";

export default function Card({ title, desc, onClick, icon, className = "" }) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      className={[
        "w-full text-left rounded-xl p-5 transition",
        "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400",
        "shadow-sm hover:shadow-md active:shadow-sm",
        "ring-1 ring-black/5 dark:ring-white/10",
        surface,
        hoverSurface,
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-brand-600 dark:text-brand-400">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className={`font-semibold ${textPrimary}`}>{title}</h3>
          <p className={`mt-1 text-sm leading-relaxed ${textSecondary}`}>
            {desc}
          </p>
        </div>
      </div>
    </button>
  );
}