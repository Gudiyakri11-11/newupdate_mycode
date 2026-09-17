import React from "react";
import { useApp, getRoadmapTypeByScore } from "../../context/AppContext";
import { roadmaps } from "../../data/roadmaps";
import ProgressBar from "../../components/LearningHub/ProgressBar";
import { navigate } from "../../router/miniRouter";

import {
  pageContainer,
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  hoverSurface,
} from "../../styles";

export default function Progress() {
  const { assessmentScore, progress, toggleModule, resetProgress } = useApp();
  const roadmapType = getRoadmapTypeByScore(assessmentScore);

  // If no assessment / roadmap yet
  if (assessmentScore == null || !roadmapType) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Track Progress</h1>
        <p className={`mt-2 ${textSecondary}`}>
          You don’t have a selected roadmap yet. Please take the assessment
          first.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate("/assessment")}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
          >
            Go to Assessment
          </button>
        </div>
      </div>
    );
  }

  const modules = roadmaps[roadmapType];
  const current = progress[roadmapType] || {};
  const total = modules.length;
  const completed = modules.filter((m) => current[m.id]).length;
  const pct = (completed / Math.max(1, total)) * 100;

  const checkboxClass =
    "h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 " +
    "dark:border-gray-700 dark:bg-gray-950 dark:focus:ring-brand-400";

  return (
    <div className={pageContainer}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Track Progress</h1>
          <p className={`mt-1 ${textSecondary}`}>
            Roadmap:{" "}
            <span className={`capitalize font-medium ${textPrimary}`}>
              {roadmapType}
            </span>
          </p>
        </div>

        <button
          onClick={() => resetProgress(roadmapType)}
          className={[
            "inline-flex items-center justify-center rounded-md px-4 py-2 transition",
            surface,
            hoverSurface,
            textPrimary,
            "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400",
          ].join(" ")}
        >
          Reset
        </button>
      </div>

      {/* Progress */}
      <div className="mt-6">
        <ProgressBar percent={pct} />
        <p className={`mt-2 text-sm ${textMuted}`}>
          Completed <span className={textPrimary}>{completed}</span> of{" "}
          <span className={textPrimary}>{total}</span> modules (
          <span className={textPrimary}>{Math.round(pct)}%</span>)
        </p>
      </div>

      {/* Modules */}
      <ul className="mt-6 space-y-3">
        {modules.map((m, idx) => {
          const checked = !!current[m.id];

          return (
            <li
              key={m.id}
              className={[
                "rounded-lg p-4 transition",
                surface,
                hoverSurface,
                "ring-1 ring-black/5 dark:ring-white/10",
              ].join(" ")}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={checked}
                  onChange={() => toggleModule(roadmapType, m.id)}
                />

                <span
                  className={[
                    "font-medium transition",
                    checked
                      ? `line-through ${textMuted}`
                      : `${textPrimary}`,
                  ].join(" ")}
                >
                  {idx + 1}. {m.title}
                </span>

                <a
                  href={m.href}
                  className="ml-auto text-sm text-brand-700 underline transition hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Resource
                </a>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}