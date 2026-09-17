import React, { useState } from "react";
import { useApp, getRoadmapTypeByScore } from "../../context/AppContext";
import { roadmaps } from "../../data/roadmaps";
import { navigate } from "../../router/miniRouter";

import {
  pageContainer,
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  hoverSurface,
} from "../../styles";

function LearningPathAlert({ score, roadmapType, onClose }) {
  const labels = {
    foundational: "Foundational",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };

  const levelLabel = labels[roadmapType] || "Personalized";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-path-alert-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/10">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close alert"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {/* Simple icon */}
            <span className="text-xl">✨</span>
          </div>

          <div className="flex-1">
            <h3
              id="learning-path-alert-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Your Learning Path is Ready!
            </h3>

            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Based on the AI‑powered assessment, you scored{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {score}
              </span>{" "}
              and the{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {levelLabel}
              </span>{" "}
              learning path has been assigned to you.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-200">
          <p className="leading-relaxed">
            Please complete this learning path to reattempt the quiz and improve
            your score. Track your progress regularly for the best results.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {/* <button
            onClick={() => navigate("/progress")}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
          >
            Start Tracking
          </button> */}

          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-gray-200 dark:hover:bg-white/10"
          >
            Start learning
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Personalized() {
  const { assessmentScore } = useApp();
  const roadmapType = getRoadmapTypeByScore(assessmentScore);

  // Empty state: user hasn't taken assessment yet
  if (assessmentScore == null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className={`text-2xl font-bold ${textPrimary}`}>
          Personalized Path
        </h1>

        <p className={`mt-2 ${textSecondary}`}>
          We don't have your assessment score yet. Take the assessment to unlock
          your personalized roadmap.
        </p>

        <div className="mt-6">
          <button
            onClick={() => navigate("/assessment")}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
          >
            Take Assessment
          </button>
        </div>
      </div>
    );
  }

  const modules = roadmapType ? roadmaps[roadmapType] : [];

  const titles = {
    foundational: "Foundational Roadmap",
    intermediate: "Intermediate Roadmap",
    advanced: "Advanced Roadmap",
  };

  const title = titles[roadmapType] || "Your Personalized Roadmap";

  // ✅ Popup logic: show every time page loads/refreshes until user closes
  const [showAlert, setShowAlert] = useState(true);

  const closeAlert = () => {
    setShowAlert(false);
  };

  return (
    <div className={pageContainer}>
      {/* ✅ Alert popup */}
      {showAlert && (
        <LearningPathAlert
          score={assessmentScore}
          roadmapType={roadmapType}
          onClose={closeAlert}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>
            Personalized Path
          </h1>

          <p className={`mt-1 ${textSecondary}`}>
            Your score:{" "}
            <span className={`font-semibold ${textPrimary}`}>
              {assessmentScore}
            </span>{" "}
            →{" "}
            <span className={`font-semibold capitalize ${textPrimary}`}>
              {roadmapType}
            </span>{" "}
            journey.
          </p>
        </div>

        <button
          onClick={() => navigate("/progress")}
          className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400"
        >
          Start Tracking
        </button>
      </div>

      {/* Roadmap */}
      <div className="mt-6">
        <h2 className={`text-lg font-semibold ${textPrimary}`}>{title}</h2>

        <ul className="mt-3 space-y-3">
          {modules.map((m, idx) => (
            <li
              key={m.id}
              className={[
                "rounded-lg p-4 transition",
                surface,
                hoverSurface,
                "ring-1 ring-black/5 dark:ring-white/10",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold",
                      "bg-gray-100 text-gray-700",
                      "dark:bg-gray-800 dark:text-gray-200",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>

                  <span className={`font-medium ${textPrimary}`}>
                    {m.title}
                  </span>
                </div>

                <a
                  href={m.href}
                  className="text-sm text-brand-700 underline decoration-from-font transition hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                  target="_blank"
                  rel="noreferrer"
                >
                  Resource
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}