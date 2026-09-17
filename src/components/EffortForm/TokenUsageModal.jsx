import React, { useState, useEffect } from "react";
import api from "../../Api";
import { getTokenSubmissionWindow } from "../../data/UtilsEffortform";

const TOKEN_UNITS = [
  "Tokens",
  "Thousand (K)",
  "Million (M)",
  "Billion (B)",
  "Trillion (T)"
];

const ZERO_REASONS = [
  "No license available",
  "Unsupported tech stack",
  "Sprint had no development or coding work",
  "Token quota exhausted for this month",
  "Other"
];

export default function TokenUsageModal({ isOpen, onClose, onSubmit, isReminder = false, lastSubmission = null }) {
  const [tokenUsage, setTokenUsage] = useState("");
  const [tokenUnit, setTokenUnit] = useState("Tokens");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [zeroReason, setZeroReason] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectInfo, setProjectInfo] = useState({ projectId: null, projectName: null });
  const [windowInfo, setWindowInfo] = useState(null);

  // Fetch user's project information when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchProjectInfo = async () => {
        try {
          const response = await api.get("/api/efforts/token-usage/user-project");
          if (response.data) {
            setProjectInfo({
              projectId: response.data.projectId,
              projectName: response.data.projectName
            });
          }
        } catch (err) {
          console.warn("Could not fetch project info:", err);
          // Continue without project info
        }
      };
      fetchProjectInfo();
    }
  }, [isOpen]);

  // Calculate submission window when modal opens
  useEffect(() => {
    if (isOpen) {
      const window = getTokenSubmissionWindow();
      setWindowInfo(window);
      
      // Auto-select the only allowed month if in window
      if (window.isInWindow && window.allowedMonths.length > 0) {
        setSelectedMonth(window.allowedMonths[0].value);
      } else {
        setSelectedMonth("");
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (tokenUsage === "" || tokenUsage === null || tokenUsage === undefined) {
      setError("Please enter token usage amount");
      return;
    }

    const usage = Number(tokenUsage);
    if (!Number.isFinite(usage) || usage < 0) {
      setError("Token usage must be a non-negative number");
      return;
    }

    if (usage === 0 && !zeroReason) {
      setError("Please select a reason when token usage is 0");
      return;
    }

    if (usage === 0 && zeroReason === "Other" && !otherReasonText.trim()) {
      setError("Please provide details for the 'Other' reason");
      return;
    }

    if (!selectedMonth) {
      setError("Please select a month");
      return;
    }

    // Validate submission window
    if (!windowInfo?.isInWindow) {
      setError("Submissions are only allowed from the 2nd-to-last working day of a month through the 2nd working day of the next month (including any weekends/holidays in between)");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        tokenUsage: usage,
        tokenUnit,
        selectedMonth,
        zeroReason: usage === 0 ? (zeroReason === "Other" ? otherReasonText.trim() : zeroReason) : null
      });
      
      // Reset form
      setTokenUsage("");
      setTokenUnit("Tokens");
      setSelectedMonth("");
      setZeroReason("");
      setOtherReasonText("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to submit token usage");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTokenUsage("");
      setTokenUnit("Tokens");
      setSelectedMonth("");
      setZeroReason("");
      setOtherReasonText("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  const showZeroReason = Number(tokenUsage) === 0;
  const canSubmit = windowInfo?.isInWindow || false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl dark:border-blue-900 dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 p-5 dark:border-blue-900 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                🤖 Submit AI Token Usage
              </h3>
              {isReminder && (
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                  📢 Monthly Reminder: Please submit your token usage report
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Window Status Banner */}
          {windowInfo && (
            <div className={`rounded-xl border p-4 ${
              canSubmit 
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30'
                : 'border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">{canSubmit ? '✅' : '⏳'}</span>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-1 ${
                    canSubmit 
                      ? 'text-emerald-900 dark:text-emerald-300'
                      : 'text-amber-900 dark:text-amber-300'
                  }`}>
                    {canSubmit ? 'Submission Window Open' : 'Submission Window Closed'}
                  </h4>
                  <p className={`text-xs ${
                    canSubmit 
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {windowInfo.windowDescription}
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Track your AI token usage for {projectInfo.projectName ? <span className="font-semibold text-blue-600 dark:text-blue-400">{projectInfo.projectName}</span> : "your project"}
          </p>

          {/* Last Submission Info */}
          {lastSubmission && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">ℹ️</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    Last Submission
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Month:</strong> {lastSubmission.submissionMonth}/{lastSubmission.submissionYear} • 
                    <strong> Tokens:</strong> {lastSubmission.tokenUsage} {lastSubmission.tokenUnit}
                    {lastSubmission.zeroReason && (
                      <span> • <strong>Reason:</strong> {lastSubmission.zeroReason}</span>
                    )}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">
                    ⚠️ Submitting again will update your record for that month.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Month Selection Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Select Month *
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !canSubmit}
              >
                <option value="">-- Select Month --</option>
                {windowInfo?.allowedMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label} {month.isPrevious ? '(Previous Month)' : '(Current Month)'}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                ▼
              </div>
            </div>
            {!canSubmit && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                Month selection is only available during submission windows
              </p>
            )}
          </div>

          {/* Token Usage Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              No. of Tokens Used *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tokenUsage}
              onChange={(e) => setTokenUsage(e.target.value)}
              placeholder="e.g., 1500000"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Token Unit Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Unit *
            </label>
            <div className="relative">
              <select
                value={tokenUnit}
                onChange={(e) => setTokenUnit(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={isSubmitting}
              >
                {TOKEN_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                ▼
              </div>
            </div>
          </div>

          {/* Conditional Zero Reason Dropdown */}
          {showZeroReason && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
              <label className="block text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">
                Reason for Zero Usage *
              </label>
              <div className="relative">
                <select
                  value={zeroReason}
                  onChange={(e) => setZeroReason(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-slate-900 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select a reason --</option>
                  {ZERO_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  ▼
                </div>
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Please explain why you didn't use any AI tokens during this period
              </p>
              
              {/* Other Reason Text Input */}
              {zeroReason === "Other" && (
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-2">
                    Please provide details *
                  </label>
                  <textarea
                    value={otherReasonText}
                    onChange={(e) => setOtherReasonText(e.target.value)}
                    placeholder="Describe your reason for zero token usage..."
                    rows={3}
                    className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
                ❌ {error}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!canSubmit ? "Submissions are only allowed from the 2nd-to-last working day of a month through the 2nd working day of the next month (including any weekends/holidays in between)" : ""}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : (
                <>
                  {canSubmit ? "Submit Token Usage" : "🔒 Submission Closed"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
