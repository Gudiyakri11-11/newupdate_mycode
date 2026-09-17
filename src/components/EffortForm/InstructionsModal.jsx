import React from "react";

export default function InstructionsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-blue-50 px-5 py-4 dark:border-slate-800 dark:bg-blue-900/20 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            📖 Form Instructions & Rules
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar text-sm text-slate-600 dark:text-slate-300 space-y-4">
          
          <section>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">1. Calendar Date Restrictions</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>From the <strong>18th onward</strong>, Gauge data dated from the 1st through the 15th of the same month cannot be submitted, edited, or deleted.</li>
              <li>Previous-month Gauge data can be submitted, edited, or deleted only on the <strong>1st and 2nd</strong>. It is locked from the 3rd onward.</li>
              <li>Gauge entries older than <strong>15 calendar days</strong> cannot be edited or deleted.</li>
              <li>These rules compare calendar dates only; no time of day is considered.</li>
              <li>You cannot log effort for a future date.</li>
              <li>Total logged effort for a single day across all entries <strong>cannot exceed 12 hours</strong>.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">2. Leave Policy</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>If you log "Leave" for a specific date, you cannot log any other work efforts for that same date.</li>
              <li>Conversely, if you have already logged work efforts for a date, you cannot subsequently log "Leave" for that day.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">3. Activity Logging</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must select a specific <strong>Stage</strong> and <strong>Activity</strong>.</li>
              <li>If you select "Other", you must manually type out a description of the activity.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">4. GenAI Usage & Estimations</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must indicate whether you used GenAI tools. If yes, you must select the specific tools (and confirm your official license status).</li>
              <li><strong>Manual Estimation:</strong> The baseline effort—completely based on your own human estimation—indicating the total time (0.1-12 hours) and number of items you would need to complete the day's business requirements without any AI assistance.</li>
              <li><strong>GenAI Assisted Delivery:</strong> The actual effort recorded when utilizing GenAI tools. This indicates the exact number of items you delivered and the total time it actually took you to deliver them using AI.</li>
              <li>The number of items delivered using GenAI <strong>cannot</strong> exceed the total manually estimated items.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">5. Token Usage Submission Windows</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Token usage data can only be submitted during a <strong>continuous submission window</strong> each month, running from the <strong>2nd-to-last working day of the month</strong> through the <strong>2nd working day of the next month</strong>.</li>
              <li><strong>Every calendar day inside that range is open for submission</strong> — including weekends and holidays that fall in between, not just the working days at the edges.</li>
              <li>Submitting during this window records the data for the <strong>month the window belongs to</strong> (e.g. a window spanning the end of August and the start of September is for August's data).</li>
              <li>You cannot submit data for future months or for months older than the previous month.</li>
              <li>The "Submit Token Usage" button will be enabled only during these valid submission windows.</li>
              <li><strong>Example:</strong> If the last 2 working days of August are Aug 29 (Thu) and Aug 30 (Fri), and the first 2 working days of September are Mon Sep 1 and Tue Sep 2, the window for August's data is Aug 29 – Sep 2. If instead August ends on a Friday and September opens after a weekend (e.g. last working days Thu Jul 30 and Fri Jul 31, first working days Mon Aug 3 and Tue Aug 4), the window is Jul 30 – Aug 4 — <strong>Aug 1 and 2 (the weekend) are also open</strong>, even though they aren't working days themselves.</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
