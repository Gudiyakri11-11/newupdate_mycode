import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import SubmissionCalendar from "./SubmissionCalendar";
import api from "../../Api";
import InstructionsModal from "./InstructionsModal";
import GaugeAnnouncementCarousel from "./GaugeAnnouncementCarousel";
import TokenAnnouncementCarousel from "./TokenAnnouncementCarousel";
import TokenUsageModal from "./TokenUsageModal";

// External Imports
import {
  COL_WITH_ITEMS,
  COL_WITH_HOURS,
  COL_WO_ITEMS,
  COL_WO_HOURS,
  STAGE_TO_COLUMN,
} from "../../data/ConstantsEffortform";

import {
  isHoursValid,
  isInteger,
  isNonNegativeNumber,
  ddmmyyyyToInputValue,
  getTodayInputDate,
  getMinAllowedDateInput,
  isoToDDMMYYYY,
  isValidDDMMYYYY,
  getGaugeDatePolicyReason,
  getTokenSubmissionWindow,
} from "../../data/UtilsEffortform";

import { Info, LabelWithHelp, LockBadge } from "./EffortForm";

import {
  pageContainer,
  surface,
  textPrimary,
  textSecondary,
  textMuted,
  sectionTitle,
  heroTitle,
  primaryButton,
} from "../../styles";

export default function EffortForm() {
  const [stageMap, setStageMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { user } = useApp();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("");

  const [showInstructions, setShowInstructions] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showTokenReminder, setShowTokenReminder] = useState(false);
  const [tokenReminderDismissed, setTokenReminderDismissed] = useState(false);
  const [lastTokenSubmission, setLastTokenSubmission] = useState(null);
  const [tokenWindowInfo, setTokenWindowInfo] = useState(null);

  const [employeeId, setEmployeeId] = useState("");
  const [employeeIdLocked, setEmployeeIdLocked] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [onLeave, setOnLeave] = useState("");
  const [stage, setStage] = useState("");
  const [activity, setActivity] = useState("");
  const [withItems, setWithItems] = useState("");
  const [withHours, setWithHours] = useState("");
  const [withoutItems, setWithoutItems] = useState("");
  const [withoutHours, setWithoutHours] = useState("");
  const [activityOther, setActivityOther] = useState("");
  const isOther = stage === "Other";
  const [usesGenAI, setUsesGenAI] = useState("");
  const [genAITool, setGenAITool] = useState([]);
  const [otherGenAITool, setOtherGenAITool] = useState("");
  const [hasLicense, setHasLicense] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Tracks if we are editing an existing entry
  const [editingEntryId, setEditingEntryId] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Calculate token submission window
  useEffect(() => {
    const window = getTokenSubmissionWindow();
    setTokenWindowInfo(window);
  }, []);

  // ✅ Secure History Fetch Hook
  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    // 🔒 Rewritten from browser fetch to Axios client wrapper
    api
      .get(`/api/efforts?employeeId=${employeeId}`)
      .then((res) => {
        const data = res.data;
        const mapped = data.map((e) => {
          const activity =
            e.business_requirements_activity ||
            e.code_build_activity ||
            e.design_activity ||
            e.test_review_activity ||
            e.deploy_hypercare_activity ||
            e.domain_usecase_activity ||
            e.other_activity ||
            "";

          return {
            ID: e.gauge_id,
            is_on_leave: e.is_on_leave,
            "Employee ID": e.employee_id,
            Date: isoToDDMMYYYY(e.date),
            "Are you on Leave?": e.is_on_leave,
            Stage: e.stage,
            ...(e.stage && {
              [STAGE_TO_COLUMN[e.stage]]: activity,
            }),
            "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?":
              e.using_genai_tools || e.has_ghcp_license,
            [COL_WITH_ITEMS]: e.items_with_genai_tools,
            [COL_WITH_HOURS]: e.hours_with_genai_tools,
            [COL_WO_ITEMS]: e.items_without_genai_tools,
            [COL_WO_HOURS]: e.hours_without_genai_tools,
            "Last modified time": e.start_time || "",
            which_genai_tool: e.which_genai_tool,
            has_ghcp_license_db: e.has_ghcp_license,
            using_genai_tools_db: e.using_genai_tools,
          };
        });

        setEntries(mapped);
      })
      .catch((err) => {
        const serverError =
          err.response?.data?.error || err.response?.data?.message;
        setStatus(
          serverError
            ? `❌ ${serverError}`
            : "❌ Failed to load submission history",
        );
      })
      .finally(() => setLoading(false));
  }, [employeeId]);

  useEffect(() => {
    try {
      const id = user?.employeeId;
      if (id) {
        setEmployeeId(String(id));
        setEmployeeIdLocked(true);
      }
    } catch {
      // swallow
    }
  }, [user]);

  useEffect(() => {
    setDateStr(isoToDDMMYYYY(getTodayInputDate()));
  }, []);

  useEffect(() => {
    if (onLeave === "Yes") {
      setStage("");
      setActivity("");
      setUsesGenAI("");
      setGenAITool([]);
      setOtherGenAITool("");
      setHasLicense("");
      setWithItems("");
      setWithHours("");
      setWithoutItems("");
      setWithoutHours("");
    }
  }, [onLeave]);

  const stages = useMemo(
    () => (stageMap ? Object.keys(stageMap) : []),
    [stageMap],
  );
  const activities = useMemo(() => {
    if (!stageMap || !stage || isOther) return [];
    return stageMap[stage] || [];
  }, [stageMap, stage, isOther]);

  const handleDateSelect = (ddmmyyyy) => {
    setHistoryDateFilter(ddmmyyyyToInputValue(ddmmyyyy));
    setShowHistory(true);
    setTimeout(() => {
      document
        .getElementById("history-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    // Fetch the dynamic Stage & Activity mapping from the secure backend
    api
      .get("/api/efforts/stages-activities")
      .then((res) => {
        setStageMap(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch stages and activities:", err);
        setLoadError(
          "❌ Failed to load stage definitions from the server. Please refresh.",
        );
      })
      .finally(() => {
        // Only stop the initial loading spinner once this essential data is fetched
        setLoading(false);
      });
  }, []);

  // Check for token usage reminder - only at mid-month (15th) and month-end (last day)
  useEffect(() => {
    const checkTokenReminder = async () => {
      if (!employeeId || tokenReminderDismissed) return;

      // Use token window info to check if in valid submission window
      if (!tokenWindowInfo?.isInWindow) {
        return; // Not in submission window
      }

      try {
        const response = await api.get("/api/efforts/token-usage/last-submission");
        const { lastSubmission } = response.data;

        // Check if already submitted this month
        if (lastSubmission) {
          const today = new Date();
          const currentMonth = today.getMonth() + 1;
          const currentYear = today.getFullYear();
          
          const lastDate = new Date(lastSubmission);
          const lastMonth = lastDate.getMonth() + 1;
          const lastYear = lastDate.getFullYear();
          
          // Determine target month based on window
          const targetMonth = tokenWindowInfo.currentWorkingDayInfo.isInLastWorkingDays 
            ? currentMonth 
            : (currentMonth === 1 ? 12 : currentMonth - 1);
          const targetYear = tokenWindowInfo.currentWorkingDayInfo.isInLastWorkingDays 
            ? currentYear 
            : (currentMonth === 1 ? currentYear - 1 : currentYear);
          
          // If already submitted for target month, don't show reminder
          if (lastMonth === targetMonth && lastYear === targetYear) {
            return;
          }
        }

        // Show reminder if never submitted or not submitted for target month
        setShowTokenReminder(true);
      } catch (err) {
        console.error("Failed to check token reminder:", err);
      }
    };

    checkTokenReminder();
  }, [employeeId, tokenReminderDismissed, tokenWindowInfo]);

  // Auto-open modal if reminder is active
  useEffect(() => {
    if (showTokenReminder && !tokenReminderDismissed) {
      setShowTokenModal(true);
    }
  }, [showTokenReminder, tokenReminderDismissed]);

  // Fetch last submission when modal opens
  useEffect(() => {
    if (showTokenModal && employeeId) {
      const fetchLastSubmission = async () => {
        try {
          const response = await api.get("/api/efforts/token-usage/last-submission");
          if (response.data.lastSubmission) {
            setLastTokenSubmission(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch last submission:", err);
        }
      };
      fetchLastSubmission();
    } else {
      setLastTokenSubmission(null);
    }
  }, [showTokenModal, employeeId]);

  const handleTokenSubmit = async (data) => {
    try {
      await api.post("/api/efforts/token-usage", data);
      setShowTokenModal(false);
      setShowTokenReminder(false);
      setTokenReminderDismissed(true);
      setStatus("✅ AI Token usage submitted successfully!");
      
      // Clear success message after 5 seconds
      setTimeout(() => setStatus(""), 5000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to submit token usage";
      throw new Error(errorMessage);
    }
  };

  const dismissTokenReminder = () => {
    setTokenReminderDismissed(true);
    setShowTokenReminder(false);
  };

  function validate() {
    const errs = [];

    if (!isInteger(employeeId)) errs.push("Employee ID must be an integer.");
    if (!isValidDDMMYYYY(dateStr))
      errs.push("Date must be valid and in dd/MM/yyyy format.");
    if (isValidDDMMYYYY(dateStr)) {
      if (editingEntryId) {
        const originalEntry = entries.find(
          (entry) => entry.ID === editingEntryId,
        );
        const sourceReason = originalEntry
          ? getGaugeDatePolicyReason(originalEntry.Date, "update")
          : "";
        if (sourceReason) errs.push(sourceReason);

        if (originalEntry && originalEntry.Date !== dateStr) {
          const destinationReason = getGaugeDatePolicyReason(dateStr, "create");
          if (destinationReason) errs.push(destinationReason);
        }
      } else {
        const submissionReason = getGaugeDatePolicyReason(dateStr, "create");
        if (submissionReason) errs.push(submissionReason);
      }
    }
    if (onLeave !== "Yes" && onLeave !== "No")
      errs.push("Please select Are you on leave?");

    // 1. Leave Logic Collision Edge Cases
    const existingLeave = entries.find(
      (e) =>
        e.Date === dateStr &&
        e["Are you on Leave?"] === "Yes" &&
        e.ID !== editingEntryId,
    );
    if (existingLeave) {
      errs.push("You were on leave, you can't edit/submit form for that day.");
    }

    if (onLeave === "Yes") {
      const existingWork = entries.find(
        (e) =>
          e.Date === dateStr &&
          e["Are you on Leave?"] !== "Yes" &&
          e.ID !== editingEntryId,
      );
      if (existingWork) {
        errs.push(
          "You cannot log leave for a day that already has work effort logged.",
        );
      }
    }

    if (onLeave === "No") {
      if (!stage) errs.push("Please select a Stage.");

      if (isOther) {
        if (!activityOther.trim())
          errs.push("Please enter an Activity for 'Other'.");
      } else {
        if (!activity) errs.push("Please select an Activity.");
      }

      if (usesGenAI !== "Yes" && usesGenAI !== "No")
        errs.push("Please answer the GHCP/Copilot/GenAI tools question.");

      if (usesGenAI === "Yes") {
        if (!isNonNegativeNumber(withItems) || Number(withItems) <= 0)
          errs.push(
            "Number of items with GenAI must be a positive number.",
          );
        if (!isHoursValid(withHours))
          errs.push("Hours with GenAI must be between 0 and 12.");
        if (!isNonNegativeNumber(withoutItems) || Number(withoutItems) <= 0)
          errs.push("Total planned items must be a positive number.");
        if (!isHoursValid(withoutHours))
          errs.push("Manual hours must be between 0 and 12.");

        if (Number(withItems) > Number(withoutItems)) {
          errs.push(
            "GenAI items cannot be greater than the Total Estimated items.",
          );
        }

        if (genAITool.length <= 0) {
          errs.push("Please select at least one GenAI tool.");
        }
        if (
          genAITool.length > 0 &&
          hasLicense !== "Yes" &&
          hasLicense !== "No"
        ) {
          errs.push(
            "Please answer if you have a license for the selected tools.",
          );
        }
      }

      if (usesGenAI === "No") {
        if (!isNonNegativeNumber(withoutItems) || Number(withoutItems) <= 0)
          errs.push("Total planned items must be a positive number.");
        if (!isHoursValid(withoutHours))
          errs.push("Manual hours must be between 0 and 12.");
      }

      // 2. Track 12-Hour Limit Per Day across Multiple Submissions
      const existingEntriesForDate = entries.filter(
        (e) => e.Date === dateStr && e.ID !== editingEntryId,
      );

      const existingActualHours = existingEntriesForDate.reduce((sum, e) => {
        const isAI =
          e[
            "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?"
          ] === "Yes";
        const hrs = isAI ? Number(e[COL_WITH_HOURS]) : Number(e[COL_WO_HOURS]);
        return sum + (hrs || 0);
      }, 0);

      const currentActualHours =
        usesGenAI === "Yes" ? Number(withHours) : Number(withoutHours);

      if (existingActualHours + currentActualHours > 12) {
        errs.push(
          `Total logged effort for a single day cannot exceed 12 hours. You already have ${existingActualHours} hours logged for ${dateStr}.`,
        );
      }
    }
    return errs;
  }

  function resetForm() {
    setDateStr(isoToDDMMYYYY(getTodayInputDate()));
    setOnLeave("");
    setStage("");
    setActivity("");
    setActivityOther("");
    setUsesGenAI("");
    setGenAITool([]);
    setOtherGenAITool("");
    setWithItems("");
    setWithHours("");
    setWithoutItems("");
    setWithoutHours("");
    setHasLicense("");
    setEditingEntryId(null);
  }

  function onSubmit(e) {
    e.preventDefault();
    setStatus("");

    const errors = validate();
    if (errors.length) {
      setStatus("❌ " + errors[0]);
      return;
    }

    setShowConfirmModal(true);
  }

  // ✅ Secure Payload Dispatch
  async function submitGaugeData() {
    setShowConfirmModal(false);
    setStatus("");

    const finalActivity = isOther ? activityOther.trim() : activity;

    try {
      const activityPayload = {
        business_requirements_activity: null,
        code_build_activity: null,
        design_activity: null,
        test_review_activity: null,
        deploy_hypercare_activity: null,
        domain_usecase_activity: null,
        other_activity: null,
      };

      if (onLeave === "No" && stage) {
        const dbActivityColumn =
          stage === "Business Requirements"
            ? "business_requirements_activity"
            : stage === "Code & Build"
              ? "code_build_activity"
              : stage === "Design"
                ? "design_activity"
                : stage === "Test & Review"
                  ? "test_review_activity"
                  : stage === "Deploy & Hypercare"
                    ? "deploy_hypercare_activity"
                    : stage === "Domain or Business Use Case"
                      ? "domain_usecase_activity"
                      : stage === "Other"
                        ? "other_activity"
                        : null;

        if (dbActivityColumn) {
          activityPayload[dbActivityColumn] = finalActivity;
        }
      }

      // Simulate what the backend will build for local state update
      let simulatedWhichGenAiTool = null;
      if (usesGenAI === "Yes" && genAITool.length > 0) {
        const formattedTools = [];
        genAITool.forEach((tool) => {
          if (tool !== "Other Tool") formattedTools.push(tool);
        });
        if (genAITool.includes("Other Tool") && otherGenAITool?.trim()) {
          formattedTools.push(`Other: ${otherGenAITool.trim()}`);
        }
        simulatedWhichGenAiTool = formattedTools.join(", ");
      }

      // Exact Payload Expected by Backend
      const payload = {
        employee_id: employeeId,
        name: user?.name || "Unknown",
        email: employeeId + "@cognizant.com",
        date: ddmmyyyyToInputValue(dateStr),
        is_on_leave: onLeave,
        stage: onLeave === "Yes" ? null : stage,
        ...activityPayload,
        has_ghcp_license: onLeave === "Yes" ? null : hasLicense,
        using_genai_tools: onLeave === "Yes" ? null : usesGenAI,

        // --- NEW ALIGNED FRONTEND VARIABLES ---
        selected_genai_tools: usesGenAI === "Yes" ? genAITool : [],
        specify_other_tool:
          usesGenAI === "Yes" && genAITool.includes("Other Tool")
            ? otherGenAITool.trim()
            : null,

        items_with_genai_tools: usesGenAI === "Yes" ? Number(withItems) : null,
        hours_with_genai_tools: usesGenAI === "Yes" ? Number(withHours) : null,
        items_without_genai_tools:
          onLeave === "No" ? Number(withoutItems) : null,
        hours_without_genai_tools:
          onLeave === "No" ? Number(withoutHours) : null,
      };

      if (editingEntryId) {
        await api.put(`/api/efforts/${editingEntryId}`, payload);

        setEntries((prev) =>
          prev.map((entry) => {
            if (entry.ID === editingEntryId) {
              return {
                ...entry,
                Date: dateStr,
                "Are you on Leave?": onLeave,
                Stage: payload.stage,
                ...Object.fromEntries(
                  Object.values(STAGE_TO_COLUMN).map((column) => [column, null]),
                ),
                ...(payload.stage && {
                  [STAGE_TO_COLUMN[payload.stage]]: finalActivity,
                }),
                "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?":
                  payload.using_genai_tools,
                [COL_WITH_ITEMS]: payload.items_with_genai_tools,
                [COL_WITH_HOURS]: payload.hours_with_genai_tools,
                [COL_WO_ITEMS]: payload.items_without_genai_tools,
                [COL_WO_HOURS]: payload.hours_without_genai_tools,
                "Last modified time": new Date().toISOString(),
                which_genai_tool: simulatedWhichGenAiTool,
                has_ghcp_license_db: payload.has_ghcp_license,
                using_genai_tools_db: payload.using_genai_tools,
              };
            }
            return entry;
          }),
        );

        setStatus("✅ Updated successfully");
      } else {
        // CREATE MODE
        // 🔒 Intercepted via the secure global Axios config instance
        const response = await api.post("/api/efforts", payload);
        const result = response.data;

        const newGaugeId =
          result.gauge_id ||
          result.entry?.gauge_id ||
          result.id ||
          result.entry?.id;

        setEntries((prev) => [
          ...prev,
          {
            ID: newGaugeId,
            "Employee ID": employeeId,
            Date: dateStr,
            "Are you on Leave?": onLeave,
            Stage: stage,
            ...(stage && {
              [STAGE_TO_COLUMN[stage]]: finalActivity,
            }),
            "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?":
              usesGenAI,
            [COL_WITH_ITEMS]: withItems,
            [COL_WITH_HOURS]: withHours,
            [COL_WO_ITEMS]: withoutItems,
            [COL_WO_HOURS]: withoutHours,
            "Last modified time": new Date().toISOString(),
            which_genai_tool: simulatedWhichGenAiTool,
            has_ghcp_license_db: hasLicense,
            using_genai_tools_db: usesGenAI,
          },
        ]);

        setStatus("✅ Saved successfully");
      }

      resetForm();
    } catch (err) {
      const serverErrorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message;
      setStatus(
        `❌ Failed to ${editingEntryId ? "update" : "save"}: ` +
          serverErrorMessage,
      );
    }
  }

  function startEdit(entryId) {
    if (!entryId) {
      setStatus("❌ Cannot edit this entry until the page is refreshed.");
      return;
    }

    setStatus("");
    const row = entries.find((e) => e.ID === entryId);

    if (!row) return;

    const lockReason = getGaugeDatePolicyReason(row.Date, "update");
    if (lockReason) {
      setStatus(`Locked: ${lockReason}`);
      return;
    }

    setEditingEntryId(entryId);

    // Set Basic Info
    setDateStr(row["Date"]);
    setOnLeave(row["Are you on Leave?"] || "");
    setStage(row["Stage"] || "");

    const activityCol = STAGE_TO_COLUMN[row["Stage"]];
    const actVal = activityCol ? row[activityCol] : "";
    if (row["Stage"] === "Other") {
      setActivityOther(actVal || "");
      setActivity("");
    } else {
      setActivity(actVal || "");
      setActivityOther("");
    }

    const usesGenAIVal =
      row[
        "Do you have GHCP Licence, Copilot Assist M365 or any other GenAI tools?"
      ] ||
      row["using_genai_tools_db"] ||
      "";
    setUsesGenAI(usesGenAIVal);
    setWithItems(row[COL_WITH_ITEMS] ?? "");
    setWithHours(row[COL_WITH_HOURS] ?? "");
    setWithoutItems(row[COL_WO_ITEMS] ?? "");
    setWithoutHours(row[COL_WO_HOURS] ?? "");
    setHasLicense(row["has_ghcp_license_db"] || "");

    // 🔒 Aligned Logic: Parses the exact format generated by the backend string builder
    const toolsStr = row["which_genai_tool"] || "";
    if (toolsStr) {
      const toolsArr = toolsStr.split(",").map((t) => t.trim());
      const standardTools = ["GHCP Licence", "Copilot Assist M365"];
      const parsedTools = [];
      let otherVal = "";

      toolsArr.forEach((t) => {
        if (standardTools.includes(t)) {
          parsedTools.push(t);
        } else if (t.startsWith("Other: ")) {
          parsedTools.push("Other Tool");
          otherVal = t.substring(7); // Extracts text after "Other: "
        } else if (t) {
          // Fallback catch for legacy records
          parsedTools.push("Other Tool");
          otherVal = t;
        }
      });
      setGenAITool(parsedTools);
      setOtherGenAITool(otherVal);
    } else {
      setGenAITool([]);
      setOtherGenAITool("");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requestDelete(entryId) {
    const row = entries.find((entry) => entry.ID === entryId);
    if (!row) {
      setStatus("Cannot delete this entry until the page is refreshed.");
      return;
    }
    const lockReason = getGaugeDatePolicyReason(row.Date, "delete");
    if (lockReason) {
      setStatus(`Locked: ${lockReason}`);
      return;
    }
    setDeleteTarget(row);
  }

  async function confirmDelete() {
    if (!deleteTarget?.ID) return;
    try {
      await api.delete(`/api/efforts/${deleteTarget.ID}`);
      setEntries((previous) =>
        previous.filter((entry) => entry.ID !== deleteTarget.ID),
      );
      if (editingEntryId === deleteTarget.ID) resetForm();
      setStatus("Gauge entry deleted successfully.");
      setDeleteTarget(null);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      setStatus(`Failed to delete: ${message}`);
      setDeleteTarget(null);
    }
  }

  function cancelMainEdit() {
    resetForm();
    setStatus("Edit Cancelled.");
  }

  const filteredEntries = useMemo(() => {
    if (!historyDateFilter) return entries;
    const targetDDMMYYYY = isoToDDMMYYYY(historyDateFilter);
    return entries.filter((r) => (r["Date"] || "") === targetDDMMYYYY);
  }, [entries, historyDateFilter]);

  const now = new Date();
  const allDatesWithDataMap = useMemo(() => {
    const map = new Map();
    for (const r of entries) {
      const ddmmyyyy = r["Date"] || "";
      map.set(ddmmyyyy, { isOnLeave: r["Are you on Leave?"] === "Yes" });
    }
    return map;
  }, [entries]);

  useEffect(() => {
    if (!historyDateFilter) {
      setShowHistory(false);
      return;
    }
    const ddmmyyyy = isoToDDMMYYYY(historyDateFilter);
    setShowHistory(allDatesWithDataMap.has(ddmmyyyy));
  }, [historyDateFilter, allDatesWithDataMap]);

  if (loading)
    return (
      <div
        className={`p-4 ${textSecondary} flex items-center justify-center min-h-[50vh]`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        Loading…
      </div>
    );
  if (loadError)
    return (
      <div className={`p-4 text-red-600 dark:text-red-400 font-medium`}>
        {loadError}
      </div>
    );

  const disabledWork = onLeave === "Yes";
  const ghcpYes = !disabledWork && usesGenAI === "Yes";
  const ghcpNo = !disabledWork && usesGenAI === "No";

  const inputBase =
    "mt-1.5 w-full rounded-xl border px-4 py-2.5 transition-colors " +
    "bg-slate-50 text-slate-900 border-slate-200 placeholder-slate-400 " +
    "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500";

  const selectBase = inputBase;

  const cardRing = "ring-1 ring-slate-900/5 dark:ring-white/10 shadow-sm";
  const formDateLockReason = isValidDDMMYYYY(dateStr)
    ? getGaugeDatePolicyReason(
        dateStr,
        editingEntryId ? "update" : "create",
      )
    : "";

  const formBgClass = editingEntryId
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50 transition-colors duration-300"
    : `${surface} transition-colors duration-300`;

  return (
    <div className={`${pageContainer} max-w-6xl mx-auto effort-form-container`}>
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
      <TokenUsageModal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          dismissTokenReminder();
        }}
        onSubmit={handleTokenSubmit}
        isReminder={showTokenReminder}
        lastSubmission={lastTokenSubmission}
      />
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-blue-50 p-4 dark:border-slate-800 dark:bg-blue-900/20">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Confirm Gauge Submission
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Are you sure to {editingEntryId ? "update" : "submit"} the Gauge
                data on <strong>{dateStr}</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitGaugeData}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Gauge entry?
              </h3>
            </div>
            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                This permanently deletes the Gauge entry for{" "}
                <strong>{deleteTarget.Date}</strong>. This action cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-700"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      {/* Hero Header */}
      <div className="mb-2 rounded-2xl p-4 md:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h5 className={`${heroTitle} ${textPrimary} tracking-tight text-lg md:text-xl`}>
            GenAI Effort Tracker
          </h5>
          <p className={`mt-1 text-sm ${textSecondary} max-w-2xl`}>
            Submit your daily effort and evaluate your productivity using GenAI
            tools seamlessly.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowInstructions(true)}
            className="shrink-0 rounded-lg border border-blue-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 shadow-sm transition hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <span>📖</span> Read Instructions
          </button>
          <button
            type="button"
            onClick={() => setShowTokenModal(true)}
            disabled={!tokenWindowInfo?.isInWindow}
            title={
              tokenWindowInfo?.isInWindow
                ? "Submit your monthly AI token usage"
                : tokenWindowInfo?.windowDescription || "Token submission window is currently closed"
            }
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition flex items-center gap-2 ${
              tokenWindowInfo?.isInWindow
                ? "border-purple-200 dark:border-purple-600 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            }`}
          >
            <span>🤖</span> Submit Token Usage
            {!tokenWindowInfo?.isInWindow && <span className="text-xs">🔒</span>}
          </button>
        </div>
      </div>

      {/* Token Reminder Banner */}
      {showTokenReminder && !tokenReminderDismissed && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm dark:border-blue-800/60 dark:bg-blue-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📢</span>
              <div>
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                  AI Token Usage Reminder
                </h3>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                  Please submit your monthly AI token usage. This reminder appears during the last 2 and first 2 working days of each month.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissTokenReminder}
              className="rounded-md p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:text-blue-500 dark:hover:bg-blue-900/50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <TokenAnnouncementCarousel />

      <GaugeAnnouncementCarousel />

      <div
        className={`rounded-2xl p-4 md:p-6 ${cardRing} ${formBgClass} glass-panel border`}
      >
        <h2
          className={`${sectionTitle} text-lg border-b border-slate-100 dark:border-slate-700 pb-2 mb-4 flex items-center gap-2`}
        >
          {editingEntryId ? "✏️ Edit Daily Entry" : "Log Daily Entry"}
        </h2>

        <form className="space-y-5" onSubmit={onSubmit}>
          {/* Top Section: Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className={`block text-xs font-semibold ${textPrimary}`}>
                Employee ID *
              </label>
              <input
                className={
                  inputBase +
                  " !py-2" +
                  (employeeIdLocked ? " opacity-70 cursor-not-allowed" : "")
                }
                inputMode="numeric"
                placeholder="e.g., 123456"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                readOnly={employeeIdLocked}
              />
              <p className={`text-[10px] mt-1 ${textMuted}`}>
                {employeeIdLocked
                  ? "Fetched securely from your profile"
                  : "Integer only"}
              </p>
            </div>

            <div>
              <label className={`block text-xs font-semibold ${textPrimary}`}>
                Date *
              </label>
              <input
                type="date"
                className={
                  inputBase +
                  " !py-2"
                }
                value={ddmmyyyyToInputValue(dateStr)}
                min={getMinAllowedDateInput()}
                max={getTodayInputDate()}
                onChange={(e) => setDateStr(isoToDDMMYYYY(e.target.value))}
              />
              {formDateLockReason && (
                <p className="text-[10px] mt-1 text-rose-500 dark:text-rose-400 font-medium">
                  Locked: {formDateLockReason}
                </p>
              )}
            </div>
          </div>

          {/* Leave Status & GenAI Usage Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="">
              <label
                className={`block text-xs font-semibold mb-2 ${textPrimary}`}
              >
                Are you on leave? *
              </label>
              <div className="flex flex-wrap gap-2">
                {["Yes", "No"].map((option) => (
                  <label
                    key={`leave-${option}`}
                    className="custom-pill-label"
                  >
                    <input
                      type="radio"
                      name="on-leave"
                      className="peer sr-only custom-pill-input"
                      checked={onLeave === option}
                      onChange={() => setOnLeave(option)}
                    />
                    <div className="custom-pill-bg px-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                      {option}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {!disabledWork && (
              <div
                className={
                  disabledWork
                    ? "opacity-50 pointer-events-none transition-opacity"
                    : "transition-opacity"
                }
              >
                <label
                  className={`block text-xs font-semibold mb-2 ${textPrimary}`}
                >
                  Do you use any GenAI tool?
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Yes", "No"].map((option) => (
                    <label
                      key={`genai-${option}`}
                      className="custom-pill-label"
                    >
                      <input
                        type="radio"
                        name="uses-genai"
                        className="peer sr-only custom-pill-input"
                        checked={usesGenAI === option}
                        onChange={() => {
                          setUsesGenAI(option);
                          if (option === "No") {
                            setGenAITool([]);
                            setOtherGenAITool("");
                          }
                        }}
                        disabled={disabledWork}
                      />
                      <div className="custom-pill-bg px-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
                        {option}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GenAI Detailed Questions */}
          <div className="">
            {usesGenAI === "Yes" && (
              <div className={`bg-blue-50/40 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 animation-fadeIn`}>
                <label
                  className={`block text-xs font-semibold mb-2 ${textPrimary}`}
                >
                  Which GenAI tools are you using?{" "}
                  <span className="font-normal text-[10px] text-slate-500">
                    (Select all that apply)
                  </span>
                </label>

                <div className="flex flex-wrap gap-2">
                  {[
                    // 🔒 Aligned with strict backend requirements
                    { value: "GHCP Licence", label: "GHCP Licence" },
                    {
                      value: "Copilot Assist M365",
                      label: "Copilot Assist M365",
                    },
                    { value: "Other Tool", label: "Other Tool" },
                  ].map((tool) => (
                    <label key={tool.value} className="custom-pill-label">
                      <input
                        type="checkbox"
                        className="peer sr-only custom-pill-input"
                        checked={genAITool.includes(tool.value)}
                        onChange={(e) => {
                          setGenAITool((prev) =>
                            e.target.checked
                              ? [...prev, tool.value]
                              : prev.filter((t) => t !== tool.value),
                          );
                          if (!e.target.checked && tool.value === "Other Tool")
                            setOtherGenAITool("");
                        }}
                        disabled={disabledWork}
                      />
                      <div className="custom-pill-bg px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        {tool.label}
                      </div>
                    </label>
                  ))}
                </div>

                {genAITool.includes("Other Tool") && (
                  <div className="mt-3 max-w-md">
                    <input
                      type="text"
                      placeholder="Specify the other GenAI tool..."
                      value={otherGenAITool}
                      onChange={(e) => setOtherGenAITool(e.target.value)}
                      disabled={disabledWork}
                      className={inputBase + " !py-2 !text-sm"}
                    />
                  </div>
                )}

                {genAITool.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-blue-100 dark:border-slate-700">
                    <label
                      className={`block text-xs font-semibold mb-2 ${textPrimary}`}
                    >
                      Do you have an official License for any of these?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Yes", "No"].map((option) => (
                        <label
                          key={`license-${option}`}
                          className="custom-pill-label"
                        >
                          <input
                            type="radio"
                            name="has-license"
                            className="peer sr-only custom-pill-input"
                            checked={hasLicense === option}
                            onChange={() => setHasLicense(option)}
                            disabled={disabledWork}
                          />
                          <div className="custom-pill-bg px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
                            {option}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Work Stages Section */}
            {/* Work Stages Section */}
<div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${disabledWork ? "opacity-50 pointer-events-none" : ""}`}>
              {!disabledWork && (
                <div>
                  <label
                    className={`block text-xs font-semibold ${textPrimary}`}
                  >
                    Stage *
                  </label>
                  <div className="relative">
                    <select
                      className={`${selectBase} !py-2 appearance-none`}
                      value={stage}
                      onChange={(e) => {
                        setStage(e.target.value);
                        setActivity("");
                        setActivityOther("");
                      }}
                      disabled={disabledWork}
                    >
                      <option value="">-- Select Work Stage --</option>
                      {stages.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      ▼
                    </div>
                  </div>
                </div>
              )}
              {!disabledWork && (
                <div>
                  <label
                    className={`block text-xs font-semibold ${textPrimary}`}
                  >
                    Activity {disabledWork ? "(disabled)" : "*"}
                  </label>
                  {!isOther ? (
                    <div className="relative">
                      <select
                        className={`${selectBase} !py-2 appearance-none`}
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        disabled={
                          disabledWork ||
                          !stage ||
                          activities.length === 0
                        }
                      >
                        <option value="">
                          {stage
                            ? activities.length
                              ? "-- Select Specific Activity --"
                              : "No predefined activities"
                            : "-- Select Stage First --"}
                        </option>
                        {(activities || []).map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                        ▼
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      className={inputBase + " !py-2"}
                      placeholder="Describe your specific activity..."
                      value={activityOther}
                      onChange={(e) => setActivityOther(e.target.value)}
                      disabled={disabledWork || !stage}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Effort Estimations */}
          {!disabledWork && (ghcpYes || ghcpNo) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {/* Manual Estimation Card */}
              <div
                className={`rounded-xl p-4 ${cardRing} bg-slate-50/70 dark:bg-slate-800/40 border-l-4 border-l-slate-400 dark:border-l-slate-600`}
              >
                <h3 className={`font-bold text-sm mb-0.5 ${textPrimary}`}>
                  Manual Estimation
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">
                  Baseline effort without GenAI assistance
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`block text-[11px] font-medium mb-1 ${textPrimary}`}
                    >
                      <LabelWithHelp
                        text="Total Number of Planned items *"
                        help="Count of total deliverables Estimated manually (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.) "
                      />
                    </label>
                    <input
                      className={inputBase + " !py-1.5 text-sm"}
                      inputMode="decimal"
                      value={withoutItems}
                      onChange={(e) => setWithoutItems(e.target.value)}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-[11px] font-medium mb-1 ${textPrimary}`}
                    >
                      <LabelWithHelp
                        text="Manual Hours *"
                        help="Estimation in hours to deliver task manually.(0-12)"
                      />
                    </label>
                    <input
                      className={inputBase + " !py-1.5 text-sm"}
                      inputMode="decimal"
                      value={withoutHours}
                      onChange={(e) => setWithoutHours(e.target.value)}
                      placeholder="e.g., 4"
                    />
                  </div>
                </div>
              </div>

              {/* GenAI Estimation Card */}
              {ghcpYes && (
                <div
                  className={`rounded-xl p-4 ${cardRing} bg-blue-50/70 dark:bg-blue-900/10 border-l-4 border-l-blue-500`}
                >
                  <h3
                    className={`font-bold text-sm text-blue-900 dark:text-blue-300 mb-0.5`}
                  >
                    GenAI Assisted Delivery
                  </h3>
                  <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mb-3">
                    Effort metrics while utilizing AI tools
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${textPrimary}`}
                      >
                        <LabelWithHelp
                          text="Number of Items Delivered *"
                          help="Number of Items Delivered through GenAI out of Total Estimated Items (Lines of Code, No of Documents, No of Test Cases, No of Scripts etc.)"
                        />
                      </label>
                      <input
                        className={`${inputBase} !py-1.5 text-sm border-blue-200 dark:border-blue-800/50 focus:border-blue-500`}
                        inputMode="decimal"
                        value={withItems}
                        onChange={(e) => setWithItems(e.target.value)}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${textPrimary}`}
                      >
                        <LabelWithHelp
                          text="Actual Hours *"
                          help="Actual time spent utilizing the GenAI tools (0-12)"
                        />
                      </label>
                      <input
                        className={`${inputBase} !py-1.5 text-sm border-blue-200 dark:border-blue-800/50 focus:border-blue-500`}
                        inputMode="decimal"
                        value={withHours}
                        onChange={(e) => setWithHours(e.target.value)}
                        placeholder="e.g., 1.5"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className={`${primaryButton} py-2 px-6 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-95`}
            >
              {editingEntryId ? "💾 Update Entry" : "💾 Save Entry"}
            </button>
            {editingEntryId && (
              <button
                type="button"
                onClick={cancelMainEdit}
                className="py-2 px-6 text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg transition-all active:scale-95"
              >
                ❌ Cancel Edit
              </button>
            )}
            {status && (
              <div
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${status.includes("❌") ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}
              >
                {status}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* --- BOTTOM SECTION: CALENDAR & HISTORY SPLIT --- */}
      <div
        className={`mt-6 grid grid-cols-1 ${showHistory ? "lg:grid-cols-2" : ""} gap-6 items-stretch`}
      >
        {/* 1. Calendar Panel */}
        <div className="w-full h-full">
          <SubmissionCalendar
            now={now}
            datesWithDataMap={allDatesWithDataMap}
            onDateSelect={handleDateSelect}
            cardRing={cardRing}
            surface={surface}
            textPrimary={textPrimary}
          />
        </div>

        {/* 2. History Mode Section */}
        {showHistory && (
          <div
            id="history-section"
            className={`rounded-2xl p-4 md:p-6 ${cardRing} ${surface} glass-panel effort-form-container flex flex-col h-full`}
          >
            {/* Header (Stays at the top) */}
            <div className="flex flex-col xl:flex-row xl:items-end gap-4 justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 shrink-0">
              <div>
                <h2 className={`${sectionTitle} text-base mb-0.5`}>
                  History & Modifications
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  Viewing entries for{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {isoToDDMMYYYY(historyDateFilter)}
                  </span>
                </p>
              </div>
              <div className="w-full xl:w-48 relative">
                <label
                  className={`block text-[10px] font-semibold mb-1 uppercase tracking-wider ${textMuted}`}
                >
                  Filter Log
                </label>
                <input
                  type="date"
                  className={`${inputBase} !py-1.5 text-sm !mt-0`}
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                />
                {!!historyDateFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryDateFilter("");
                      setShowHistory(false);
                    }}
                    className="absolute right-0 -bottom-5 text-[10px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 transition-colors"
                  >
                    Clear View
                  </button>
                )}
              </div>
            </div>

            {/* Content Container (Scrollable if content is longer than the calendar) */}
            <div
              className="space-y-4 overflow-y-auto flex-grow pr-1"
              style={{ maxHeight: "400px" }}
            >
              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="text-3xl mb-2 opacity-50">📭</div>
                  <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    No entries found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                    There is no logged effort for the selected date.
                  </p>
                </div>
              ) : (
                (() => {
                  // Group and Render
                  const grouped = filteredEntries.reduce((acc, row) => {
                    const d = row["Date"] || "(no date)";
                    (acc[d] = acc[d] || []).push(row);
                    return acc;
                  }, {});

                  const toKey = (ddmmyyyy) => {
                    const m = (ddmmyyyy || "").match(
                      /^(\d{2})\/(\d{2})\/(\d{4})$/,
                    );
                    if (!m) return ddmmyyyy;
                    return `${m[3]}-${m[2]}-${m[1]}`;
                  };

                  return Object.entries(grouped)
                    .sort((a, b) => toKey(b[0]).localeCompare(toKey(a[0])))
                    .map(([dateKey, rows]) => (
                      <div key={dateKey} className="space-y-3">
                        {rows.map((r) => {
                          const id = r.ID;
                          const activityCol = STAGE_TO_COLUMN[r["Stage"]] || "";
                          const activityVal = activityCol ? r[activityCol] : "";
                          const lockReason = getGaugeDatePolicyReason(
                            r.Date,
                            "update",
                          );
                          const isCurrentlyEditing = editingEntryId === id;

                          return (
                            <div
                              key={id || `temp-key-${r["Date"]}-${r["Stage"]}`}
                              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                                isCurrentlyEditing
                                  ? "border-yellow-400 shadow-md shadow-yellow-500/20 bg-yellow-50 dark:bg-yellow-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900/50"
                              }`}
                            >
                              <div className="p-3 md:p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                                <Info label="Stage" value={r["Stage"] || "-"} />
                                <div className="md:col-span-2">
                                  <Info
                                    label="Activity"
                                    value={activityVal || "-"}
                                  />
                                </div>
                                <div className="flex justify-end items-center gap-2">
                                  {lockReason ? (
                                    <LockBadge reason={lockReason} />
                                  ) : !isCurrentlyEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEdit(id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => requestDelete(id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) : (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400">
                                      Editing Above...
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`px-4 py-2 bg-slate-50/50 dark:bg-slate-800/40 border-t ${isCurrentlyEditing ? "border-yellow-200 dark:border-yellow-800" : "border-slate-100 dark:border-slate-800"} flex justify-between items-center text-[10px] ${textMuted}`}
                              >
                                <span>
                                  Employee:{" "}
                                  <span className="font-medium text-slate-600 dark:text-slate-400">
                                    {r["Employee ID"]}
                                  </span>
                                </span>
                                <span>
                                  Modified:{" "}
                                  {r["Last modified time"]
                                    ? new Date(
                                        r["Last modified time"],
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                })()
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
