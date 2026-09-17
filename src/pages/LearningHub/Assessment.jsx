// src/pages/Assessment.jsx
import React, { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { navigate } from "../../router/miniRouter";
import Data from "../../data/question.json";
import {
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  hoverSurface,
} from "../../styles";

// ----- helpers (no external deps) -----
function sampleWithoutReplacement(arr, n) {
  const a = Array.isArray(arr) ? [...arr] : [];
  const len = a.length;
  const take = Math.min(n, len);
  // partial Fisher–Yates shuffle for first "take" items
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (len - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}

function normalizeLevel(level) {
  const v = String(level || "").toLowerCase().trim();
  // your JSON uses: beginner | medium | proficient
  if (v === "beginner") return "beginner";
  if (v === "medium" || v === "intermediate") return "medium";
  if (v === "proficient" || v === "expert") return "proficient";
  return v || "unknown";
}

function getRandomMixedQuestions(allQuestions, total = 10) {
  const all = Array.isArray(allQuestions) ? allQuestions : [];

  const groups = {
    beginner: [],
    medium: [],
    proficient: [],
    other: [],
  };

  for (const q of all) {
    const lvl = normalizeLevel(q.level);
    if (lvl === "beginner") groups.beginner.push(q);
    else if (lvl === "medium") groups.medium.push(q);
    else if (lvl === "proficient") groups.proficient.push(q);
    else groups.other.push(q);
  }

  // "mixed" distribution (balanced by default)
  const desired = { beginner: 4, medium: 3, proficient: 3 };

  const picked = [];
  const pickedIds = new Set();

  // pick per level first
  for (const lvl of ["beginner", "medium", "proficient"]) {
    const candidates = groups[lvl];
    const chosen = sampleWithoutReplacement(candidates, desired[lvl]);
    for (const item of chosen) {
      if (!pickedIds.has(item.id)) {
        picked.push(item);
        pickedIds.add(item.id);
      }
    }
  }

  // fill remaining from the rest of the pool (excluding already picked)
  const remainingNeeded = Math.max(0, total - picked.length);
  if (remainingNeeded > 0) {
    const remainingPool = all.filter((q) => !pickedIds.has(q.id));
    const filler = sampleWithoutReplacement(remainingPool, remainingNeeded);
    for (const item of filler) {
      if (!pickedIds.has(item.id)) {
        picked.push(item);
        pickedIds.add(item.id);
      }
    }
  }

  // final shuffle so levels are mixed in display order
  const final = sampleWithoutReplacement(picked, picked.length);
  return final.slice(0, total);
}

export default function Assessment() {
  const { setScore } = useApp();

  // Random 10 questions on each component mount
  const [questions] = useState(() => getRandomMixedQuestions(Data, 10));
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null));

  const answeredCount = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers]
  );
  const allAnswered = answeredCount === questions.length;

  function selectAnswer(qIdx, optIdx) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    const total = questions.reduce((acc, q, i) => {
      const selectedIdx = answers[i];
      if (selectedIdx === null || selectedIdx === undefined) return acc;
      const selectedValue = q?.options?.[selectedIdx];
      return acc + (selectedValue === q.answer ? 1 : 0);
    }, 0);

    setScore(total);
    navigate("/personalized");
  }

  // UI-only helpers (no behavior change)
  const progressPct = Math.round((answeredCount / Math.max(1, questions.length)) * 100);

  const primaryBtn =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-white transition " +
    "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400";

  const ghostBtn =
    `inline-flex items-center justify-center rounded-md border px-4 py-2 transition ` +
    `${hoverSurface} dark:border-gray-700 ${textPrimary} ` +
    "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>
            AI-Powered Assessment
          </h1>
          <p className={`mt-2 ${textSecondary}`}>
            Answer the following 10 questions. Each correct answer is worth{" "}
            <strong>1 mark</strong>. Your total score will determine your
            personalized roadmap.
          </p>
        </div>

        {/* Small progress pill (visual only) */}
        <div
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs",
            surface,
            "ring-1 ring-black/5 dark:ring-white/10",
          ].join(" ")}
          aria-label="Assessment progress"
        >
          <span className={textSecondary}>Answered</span>
          <span className={`font-semibold ${textPrimary}`}>
            {answeredCount}/{questions.length}
          </span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className={`font-semibold ${textPrimary}`}>{progressPct}%</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Top info row */}
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm ${textSecondary}`}>
          <span>
            Answered: <strong className={textPrimary}>{answeredCount}</strong> /{" "}
            {questions.length}
          </span>

          {!allAnswered && (
            <span className="text-amber-700 dark:text-amber-300">
              Please answer all questions to submit.
            </span>
          )}
        </div>

        {/* Questions */}
        {questions.map((item, qIdx) => (
          <fieldset
            key={item.id ?? qIdx}
            className={[
              surface,
              "rounded-xl p-5",
              "ring-1 ring-black/5 dark:ring-white/10",
            ].join(" ")}
          >
            <legend className={`font-medium ${textPrimary}`}>
              {qIdx + 1}. {item.question}
            </legend>

            <div className="mt-3 space-y-2">
              {item.options.map((opt, optIdx) => {
                const id = `q-${qIdx}-opt-${optIdx}`;
                const checked = answers[qIdx] === optIdx;

                // ✅ FIXED: ensure selected option has good contrast in dark mode
                const optionClass = checked
                  ? [
                      "border-brand-500",
                      "bg-brand-50 text-gray-900",            // light mode
                      "dark:bg-brand-500/15 dark:text-gray-100", // dark mode (no white bg)
                      "ring-1 ring-brand-500/40 dark:ring-brand-400/40",
                    ].join(" ")
                  : [
                      "border-gray-200 dark:border-gray-700",
                      hoverSurface,
                      "text-gray-900 dark:text-gray-100",
                    ].join(" ");

                return (
                  <label
                    key={id}
                    htmlFor={id}
                    className={[
                      "flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition",
                      "focus-within:ring-2 focus-within:ring-brand-500/40 dark:focus-within:ring-brand-400/40",
                      optionClass,
                    ].join(" ")}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`q-${qIdx}`}
                      value={optIdx}
                      checked={checked}
                      onChange={() => selectAnswer(qIdx, optIdx)}
                      className="mt-0.5 h-4 w-4 text-brand-600 focus:ring-brand-500 dark:focus:ring-brand-400"
                    />

                    {/* ✅ FIXED: text color changes when selected so it never disappears */}
                    <span
                      className={[
                        "text-sm leading-relaxed",
                        checked
                          ? "text-gray-900 dark:text-gray-100"
                          : textPrimary,
                      ].join(" ")}
                    >
                      {opt}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 pt-2">
          <button
            type="submit"
            disabled={!allAnswered}
            className={[
              primaryBtn,
              allAnswered
                ? "bg-brand-600 hover:bg-brand-700"
                : "bg-gray-300 cursor-not-allowed dark:bg-gray-700",
            ].join(" ")}
            title={allAnswered ? "Submit Quiz" : "Answer all questions to submit"}
          >
            Submit Quiz
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className={ghostBtn}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => setAnswers(Array(questions.length).fill(null))}
            className={[
              "sm:ml-auto",
              `inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm transition`,
              hoverSurface,
              "dark:border-gray-700",
              textPrimary,
              "focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400",
            ].join(" ")}
            title="Clear all selected answers"
          >
            Reset Answers
          </button>
        </div>

        {/* Optional note area */}
        <div className={`pt-2 text-xs ${textMuted}`} />
      </form>
    </div>
  );
}