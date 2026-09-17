import { useEffect, useMemo, useState } from "react";
import { surface, textPrimary, textSecondary } from "../../styles";
import { useApp } from "../../context/AppContext.jsx";
import { navigate } from "../../router/miniRouter.jsx";
import api from "../../Api";
import Gpi_admin from "./Gpi_admin.jsx";
import { useRole } from "../../gurds/userRole.jsx";

const api_url = import.meta.env.VITE_API_URL;

const EXCLUSION_REASONS = [
  "Deployment/Pipeline",
  "Test Execution Support",
  "Unsupported Tech Stack",
  "Recreate Defects",
  "Config Changes",
  "Others",
];

const CATCHUP_SPRINT_START_DATE = "2026-06-29";
const CATCHUP_SPRINT_END_DATE = "2026-07-03";

function getIstDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function isCatchupSprintRange(start, end) {
  return start === CATCHUP_SPRINT_START_DATE && end === CATCHUP_SPRINT_END_DATE;
}

function canCreateCatchupSprint(date = new Date()) {
  return getIstDateString(date) <= CATCHUP_SPRINT_END_DATE;
}

function createEmptyExclusionSelections() {
  return EXCLUSION_REASONS.reduce((acc, reason) => {
    acc[reason] = { checked: false, storyPoints: "" };
    return acc;
  }, {});
}

function parseExclusionDetails(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [{ reason: value, storyPoints: null }];
  }
}

function createExclusionSelectionsFromEntry(entry) {
  const selections = createEmptyExclusionSelections();
  const details = parseExclusionDetails(
    entry.Exclusion_Reason || entry.exclusionReason,
  );

  details.forEach((detail) => {
    if (EXCLUSION_REASONS.includes(detail.reason)) {
      selections[detail.reason] = {
        checked: true,
        storyPoints:
          detail.storyPoints !== null && detail.storyPoints !== undefined
            ? String(detail.storyPoints)
            : "",
      };
    }
  });

  return selections;
}

function formatExclusionDetails(value, otherReason) {
  const details = parseExclusionDetails(value);
  if (details.length === 0) return "-";

  return details
    .map((detail) => {
      const label =
        detail.reason === "Others" && otherReason
          ? `Others (${otherReason})`
          : detail.reason;
      return detail.storyPoints !== null && detail.storyPoints !== undefined
        ? `${label}: ${detail.storyPoints}`
        : label;
    })
    .join(", ");
}

// Helper to prevent ReferenceError
function ddmmyyyyToInputValue(ddmmyyyy) {
  if (!ddmmyyyy) return "";
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export default function GenAIProductivityIndex() {
  /** ✅ CONTEXT */
  const { user, activeRole } = useApp();
  const { canAtLeast } = useRole();
  const employee_id = user?.employeeId;

  // 👉 FIX: Simplified logic. If they are acting as admin/moderator, load the Admin view
  if (activeRole === "moderator" || activeRole === "admin" || activeRole === "guides") {
    return <Gpi_admin />;
  }
  /** ---------------- State ---------------- */
  const [entries, setEntries] = useState([]); // Used for Calendar
  const [gpiEntries, setGpiEntries] = useState([]); // Used for GPI List
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [squadName, setSquadName] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [committedSP, setCommittedSP] = useState("");
  const [deliveredSP, setDeliveredSP] = useState("");
  const [exclusionSelections, setExclusionSelections] = useState(() =>
    createEmptyExclusionSelections(),
  );
  const [exclusionOtherReason, setExclusionOtherReason] = useState("");
  const [customSquadName, setCustomSquadName] = useState("");
  const [availableSquads, setAvailableSquads] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [editingGpiId, setEditingGpiId] = useState(null);

  // Custom Popup State
  const [popup, setPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const cardRing = "ring-1 ring-slate-900/5 dark:ring-white/10 shadow-sm";

  /** ---------------- Stable date reference ---------------- */
  const now = useMemo(() => new Date(), []);

  // Calculate Today's Date String
  const todayStr = useMemo(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [now]);

  // BUSINESS RULE: Minimum Start Date is 1st Jan 2026
  const minStartDate = "2026-01-01";

  // Calculate Today + 7 Days (Max Start Date)
  const maxStartDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [now]);

  /** ---------------- Fetch GAUGE & GPI Data ---------------- */
  useEffect(() => {
    if (!employee_id) return;
    let isMounted = true;

    // Fetch Effort Dates for Calendar
    // 🔒 Removed unsafe client-side query parameters. Backend reads identity from cookie context.
    api
      .get("/api/efforts")
      .then((res) => {
        if (!isMounted) return;
        const mapped = res.data.map((e) => ({
          Date: new Date(e.date).toLocaleDateString("en-GB"),
        }));
        setEntries(mapped);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(
          "Failed to load efforts from secure registry channel",
          err,
        );
        setEntries([]);
      });

    // Fetch GPI Submissions
    // 🔒 Removed unsafe client-side query parameters. Backend reads identity from cookie context.
    api
      .get("/api/gpi")
      .then((res) => {
        if (!isMounted) return;
        const fetchedData = res.data.data || [];
        setGpiEntries(fetchedData);

        // A sprint is open if Last_Updated_At is missing/null
        const openSprint = fetchedData.find(
          (e) => !e.Last_Updated_At && !e.last_updated_at,
        );

        if (openSprint) {
          startEdit(openSprint);
        } else {
          resetForm();
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load GPI history securely", err);
      });

    return () => {
      isMounted = false;
    };
  }, [employee_id]);

  // Fetch available squad names
  useEffect(() => {
    api
      .get("/api/gpi/squad-names")
      .then((res) => {
        setAvailableSquads(res.data.squadNames || []);
      })
      .catch((err) => {
        console.error("Failed to load squad names:", err);
      });
  }, []);

  /** ---------------- Helpers & Logic ---------------- */
  function daysBetween(start, end) {
    if (!start || !end) return null;
    
    const [sYear, sMonth, sDay] = start.split('-');
    const [eYear, eMonth, eDay] = end.split('-');
    
    const startDateObj = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay));
    const endDateObj = new Date(Number(eYear), Number(eMonth) - 1, Number(eDay));
    
    // Using Math.round fixes minor millisecond offsets caused by DST changes
    return Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
  }

  // Auto-calculate End Date (+13 days for a 14-day inclusive sprint)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val === CATCHUP_SPRINT_START_DATE && canCreateCatchupSprint(now)) {
      setEndDate(CATCHUP_SPRINT_END_DATE);
      return;
    }

    if (val) {
      // FIX: Split the string to force local timezone construction
      const [year, month, day] = val.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      
      d.setDate(d.getDate() + 13);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const ddStr = String(d.getDate()).padStart(2, "0");
      setEndDate(`${yyyy}-${mm}-${ddStr}`);
    } else {
      setEndDate("");
    }
  };

  const diffDays = daysBetween(startDate, endDate);
  const isCatchupSprint = isCatchupSprintRange(startDate, endDate);
  const hasValidSprintDuration = diffDays === 13 || isCatchupSprint;
  const isActiveSprintMode = !!editingGpiId;

  // Check if current date is before the End Date
  const isBeforeEndDate = useMemo(() => {
    if (!endDate) return false;
    const endD = new Date(endDate);
    endD.setHours(0, 0, 0, 0); // End of the target day
    return now < endD;
  }, [endDate, now]);
  const hasExclusionData = gpiEntries.some(
    (entry) =>
      entry.Exclusion_Story_Points != null ||
      entry.exclusionStoryPoints != null ||
      entry.Exclusion_Reason ||
      entry.exclusionReason ||
      entry.Exclusion_Other_Reason ||
      entry.exclusionOtherReason,
  );

  /** ---------------- Validations ---------------- */
  const isCommittedFloat =
    committedSP !== "" && !Number.isInteger(Number(committedSP));
  const isDeliveredFloat =
    deliveredSP !== "" && !Number.isInteger(Number(deliveredSP));
  const isClosingSprint = isActiveSprintMode && deliveredSP !== "";
  const selectedExclusionDetails = EXCLUSION_REASONS.filter(
    (reason) => exclusionSelections[reason]?.checked,
  ).map((reason) => ({
    reason,
    storyPoints: Number(exclusionSelections[reason]?.storyPoints),
    ...(reason === "Others"
      ? { otherReason: exclusionOtherReason.trim() }
      : {}),
  }));
  const exclusionTotal = selectedExclusionDetails.reduce(
    (sum, detail) =>
      Number.isInteger(detail.storyPoints) && detail.storyPoints >= 0
        ? sum + detail.storyPoints
        : sum,
    0,
  );
  const hasInvalidExclusionStoryPoints = EXCLUSION_REASONS.some((reason) => {
    const selection = exclusionSelections[reason];
    if (!selection?.checked) return false;
    const value = selection.storyPoints;
    return (
      value === "" || !Number.isInteger(Number(value)) || Number(value) < 0
    );
  });
  const isExclusionOtherRequired =
    isClosingSprint && exclusionSelections.Others?.checked;
  const isExclusionTotalOverDelivered =
    isClosingSprint &&
    deliveredSP !== "" &&
    !isDeliveredFloat &&
    exclusionTotal > Number(deliveredSP);
  const isExclusionValid =
    !isClosingSprint ||
    (!hasInvalidExclusionStoryPoints &&
      !isExclusionTotalOverDelivered &&
      (!isExclusionOtherRequired || exclusionOtherReason.trim() !== ""));

  const isFormValid =
    startDate &&
    endDate &&
    (squadName === "Others" ? customSquadName.trim() : squadName.trim()) &&
    sprintName.trim() &&
    committedSP !== "" &&
    !isCommittedFloat &&
    user?.employeeId &&
    !submitting &&
    hasValidSprintDuration &&
    // Allow updating just committed SP if delivered SP is empty. Otherwise, validate delivered SP.
    (isActiveSprintMode
      ? deliveredSP === "" ||
        (!isDeliveredFloat && !isBeforeEndDate && isExclusionValid)
      : true);

  const showPopup = (title, message, type = "info") => {
    setPopup({ isOpen: true, title, message, type });
  };

  /** ---------------- Edit & Reset Handlers ---------------- */
  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setSquadName("");
    setCustomSquadName("");
    setSprintName("");
    setCommittedSP("");
    setDeliveredSP("");
    setExclusionSelections(createEmptyExclusionSelections());
    setExclusionOtherReason("");
    setEditingGpiId(null);
    setNote("");
  };

  const startEdit = (entry) => {
    const id = entry.GPI_ID || entry.id;
    setEditingGpiId(id);
    setStartDate(entry.Start_Date ? entry.Start_Date.split("T")[0] : "");
    setEndDate(entry.End_Date ? entry.End_Date.split("T")[0] : "");
    
    const squad = entry.Squad_Name || entry.squadName || "";
    if (availableSquads.includes(squad)) {
      setSquadName(squad);
      setCustomSquadName("");
    } else {
      setSquadName("Others");
      setCustomSquadName(squad);
    }
    
    setSprintName(entry.Sprint_Name || entry.sprintName || "");
    setCommittedSP(
      entry.Committed_Story_Points_Without_GenAI ??
        entry.committedStoryPointsWithoutGenAI ??
        "",
    );
    setDeliveredSP("");
    setExclusionSelections(createExclusionSelectionsFromEntry(entry));
    setExclusionOtherReason(
      entry.Exclusion_Other_Reason || entry.exclusionOtherReason || "",
    );
    setNote(entry.Note || entry.note || "");
  };

  /** ---------------- Submit Handler ---------------- */
  const handleSubmitGPI = async () => {
    if (!user?.employeeId) {
      showPopup(
        "Authentication Error",
        "Employee ID not available. Please re-login.",
        "error",
      );
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      showPopup(
        "Validation Error",
        "End Date cannot be before Start Date.",
        "error",
      );
      return;
    }

    if (!hasValidSprintDuration) {
      showPopup(
        "Validation Error",
        "Sprint duration must be exactly 14 days, except the June 29 to July 3 catchup sprint.",
        "error",
      );
      return;
    }

    // BUSINESS RULE: Prevent Duplicate/Overlapping Date Ranges
    const isDuplicateOrOverlap = gpiEntries.some((entry) => {
      // Skip checking against the entry we are currently editing/closing
      if (
        isActiveSprintMode &&
        (entry.GPI_ID === editingGpiId || entry.id === editingGpiId)
      ) {
        return false;
      }

      const existStart = new Date(entry.Start_Date || entry.startDate).setHours(
        0,
        0,
        0,
        0,
      );
      const existEnd = new Date(entry.End_Date || entry.endDate).setHours(
        0,
        0,
        0,
        0,
      );
      const newStart = new Date(startDate).setHours(0, 0, 0, 0);
      const newEnd = new Date(endDate).setHours(0, 0, 0, 0);

      // Date Range Overlap Logic: (StartA <= EndB) and (EndA >= StartB)
      return newStart <= existEnd && newEnd >= existStart;
    });

    if (isDuplicateOrOverlap) {
      showPopup(
        "Overlap Error",
        "You already have a submitted sprint that overlaps with this date range.",
        "error",
      );
      return;
    }

    if (isClosingSprint && isExclusionTotalOverDelivered) {
      showPopup(
        "Validation Error",
        "Total exclusion story points cannot exceed actual delivered story points.",
        "error",
      );
      return;
    }

    if (!isFormValid) {
      showPopup(
        "Validation Error",
        "Please fill all required fields correctly (No Decimals in SP).",
        "error",
      );
      return;
    }

    try {
      setSubmitting(true);
      const hasSelectedExclusions = selectedExclusionDetails.length > 0;
      const serializedExclusionDetails = hasSelectedExclusions
        ? JSON.stringify(selectedExclusionDetails)
        : null;
      const finalSquadName = squadName === "Others" ? customSquadName.trim() : squadName;
      
      const payload = {
        employee_id: user.employeeId,
        startDate,
        endDate,
        squadName: finalSquadName,
        sprintName,
        committedStoryPointsWithoutGenAI: Number(committedSP),
        ...(isClosingSprint && {
          actualDeliveredStoryPointsWithGenAI: Number(deliveredSP),
          note: note,
          exclusionStoryPoints: hasSelectedExclusions ? exclusionTotal : null,
          exclusionReason: serializedExclusionDetails,
          exclusionOtherReason: exclusionSelections.Others?.checked
            ? exclusionOtherReason.trim()
            : null,
        }),
      };

      const endpoint = isActiveSprintMode
        ? `/api/gpi/${editingGpiId}`
        : `/api/gpi/submit`;

      // 🔒 Forwarded via explicit structural Axios methods to attach dynamic headers cleanly
      const apiCall = isActiveSprintMode
        ? api.put(endpoint, payload)
        : api.post(endpoint, payload);
      const response = await apiCall;

      const result = response.data;

      // Dynamic Success Message based on action
      showPopup(
        "Success",
        !isActiveSprintMode
          ? "Sprint details saved successfully! Good luck with your sprint."
          : isClosingSprint
            ? "Sprint closed successfully! GPI recorded."
            : "Committed Story Points updated successfully!",
        "success",
      );

      if (isActiveSprintMode) {
        setGpiEntries((prev) =>
          prev.map((e) =>
            (e.GPI_ID || e.id) === editingGpiId
              ? {
                  ...e,
                  Squad_Name: squadName,
                  Sprint_Name: sprintName,
                  Committed_Story_Points_Without_GenAI: Number(committedSP),
                  ...(isClosingSprint
                    ? {
                        Actual_Delivered_Story_Points_With_GenAI:
                          Number(deliveredSP),
                        Last_Updated_At: new Date().toISOString(),
                        Note: note,
                        Exclusion_Story_Points: hasSelectedExclusions
                          ? exclusionTotal
                          : null,
                        Exclusion_Reason: serializedExclusionDetails,
                        Exclusion_Other_Reason: exclusionSelections.Others
                          ?.checked
                          ? exclusionOtherReason.trim()
                          : null,
                      }
                    : {}),
                }
              : e,
          ),
        );

        if (isClosingSprint) {
          resetForm();
        }
      } else {
        const newSprint = result.data || result;
        setGpiEntries((prev) => [newSprint, ...prev]);
        startEdit(newSprint);
      }
    } catch (err) {
      console.error("❌ GPI submit error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to submit GPI data.";
      showPopup("Submission Failed", errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /** ---------------- UI Render ---------------- */
  const formBgClass = isActiveSprintMode
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50 transition-colors duration-300"
    : `${surface} transition-colors duration-300`;

  const handleExclusionChecked = (reason, checked) => {
    setExclusionSelections((prev) => ({
      ...prev,
      [reason]: {
        checked,
        storyPoints: checked ? prev[reason]?.storyPoints || "" : "",
      },
    }));

    if (reason === "Others" && !checked) {
      setExclusionOtherReason("");
    }
  };

  const handleExclusionStoryPoints = (reason, value) => {
    setExclusionSelections((prev) => ({
      ...prev,
      [reason]: {
        checked: prev[reason]?.checked || false,
        storyPoints: value,
      },
    }));
  };

  const getExclusionStoryPointError = (reason) => {
    const selection = exclusionSelections[reason];
    if (!isClosingSprint || !selection?.checked) return null;
    if (selection.storyPoints === "") {
      return "Story points are required.";
    }
    if (!Number.isInteger(Number(selection.storyPoints))) {
      return "Story points should not be a decimal number.";
    }
    if (Number(selection.storyPoints) < 0) {
      return "Story points cannot be negative.";
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto effort-form-container pb-5 relative">
      {/* Custom Modal Popup */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden transform animate-scale-up">
            <div
              className={`h-2 ${popup.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`}
            ></div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                {popup.type === "error" ? "❌" : "✅"} {popup.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                {popup.message}
              </p>
              <button
                onClick={() => setPopup({ ...popup, isOpen: false })}
                className="w-full py-2.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Carousel Component */}
      <NoticeCarousel />

      {/* Hero Header */}
      <div className="mb-2 rounded-2xl p-4 md:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 shadow-sm">
        <h1
          className={`text-lg md:text-xl font-bold tracking-tight ${textPrimary}`}
        >
          GenAI Productivity Index (GPI)
        </h1>
        <p className={`mt-1 text-sm ${textSecondary} max-w-2xl`}>
          Log your sprint metrics to measure the impact of GenAI tools on your
          Individual overall productivity and delivery speed.
        </p>
      </div>

      <div
        className={`rounded-2xl p-4 md:p-6 border ${cardRing} ${formBgClass} glass-panel`}
      >
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
          {isActiveSprintMode
            ? "🔒 Active Sprint: Edit Details or Submit Delivered SP to Close"
            : "Start New Sprint"}
        </h2>

        {/* ---------------- Form ---------------- */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <Input
              label="Sprint Start Date *"
              type="date"
              value={startDate}
              set={handleStartDateChange}
              disabled={isActiveSprintMode}
              min={minStartDate}
              max={maxStartDate}
            />
            <Input
              label="Sprint End Date"
              type="date"
              value={endDate}
              set={setEndDate}
              disabled={true}
            />
            {/* Squad Name Dropdown with Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Squad Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="squad-list"
                  value={squadName}
                  onChange={(e) => {
                    setSquadName(e.target.value);
                    if (e.target.value !== "Others" && availableSquads.includes(e.target.value)) {
                      setCustomSquadName("");
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && !availableSquads.includes(value) && value !== "Others") {
                      setSquadName("Others");
                      setCustomSquadName(value);
                    }
                  }}
                  placeholder="Search or select squad..."
                  disabled={false}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors placeholder-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500"
                />
                <datalist id="squad-list">
                  {availableSquads.map((squad) => (
                    <option key={squad} value={squad} />
                  ))}
                  <option value="Others">Others (Enter Custom Squad)</option>
                </datalist>
              </div>
            </div>
            
            {/* Custom Squad Name Input - shown when Others is selected */}
            {squadName === "Others" ? (
              <Input
                label="Custom Squad Name *"
                placeholder="Enter your squad name"
                value={customSquadName}
                set={setCustomSquadName}
                disabled={false}
              />
            ) : (
              <Input
                label="Sprint Name *"
                placeholder=""
                value={sprintName}
                set={setSprintName}
                disabled={false} 
              />
            )}
          </div>
          
          {/* Sprint Name on second row if Others is selected */}
          {squadName === "Others" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <Input
                label="Sprint Name *"
                placeholder=""
                value={sprintName}
                set={setSprintName}
                disabled={false} 
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/40 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 relative">
            <Input
              label="Committed Story Points *"
              type="number"
              value={committedSP}
              set={setCommittedSP}
              disabled={false} // <--- Disabled flag removed to allow edits
              error={
                isCommittedFloat
                  ? "Story points should not be a decimal number."
                  : null
              }
            />

            <div className="relative">
              <Input
                label="Actual Delivered Story Points *"
                type="number"
                value={deliveredSP}
                set={setDeliveredSP}
                disabled={!isActiveSprintMode || isBeforeEndDate}
                placeholder={
                  !isActiveSprintMode
                    ? "Available when sprint ends"
                    : "Enter delivered points"
                }
                error={
                  isDeliveredFloat
                    ? "Story points should not be a decimal number."
                    : null
                }
              />
              {isActiveSprintMode && isBeforeEndDate && (
                <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  ⚠️ You can submit actual points on or after the Sprint End
                  Date.
                </p>
              )}
            </div>
          </div>
          <div className="bg-blue-50/40 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Exclusion Story Points
              </label>
              <span
                className={`text-xs font-semibold ${
                  isExclusionTotalOverDelivered
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Total: {exclusionTotal}
                {deliveredSP !== "" ? ` / ${deliveredSP}` : ""}
              </span>
            </div>
            <div className="space-y-3">
              {EXCLUSION_REASONS.map((reason) => {
                const selection = exclusionSelections[reason];
                const error = getExclusionStoryPointError(reason);

                return (
                  <div key={reason}>
                    <div className="flex flex-col md:flex-row md:items-start gap-3">
                      <label className="flex flex-1 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={selection?.checked || false}
                          disabled={!isClosingSprint}
                          onChange={(e) =>
                            handleExclusionChecked(reason, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span>{reason}</span>
                      </label>
                      <div className="md:w-56">
                        <input
                          type="number"
                          value={selection?.storyPoints || ""}
                          min="0"
                          placeholder={
                            selection?.checked
                              ? "Enter story points"
                              : "Select option first"
                          }
                          disabled={!isClosingSprint || !selection?.checked}
                          onChange={(e) =>
                            handleExclusionStoryPoints(reason, e.target.value)
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${
                            !isClosingSprint || !selection?.checked
                              ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-70 dark:bg-slate-800"
                              : "bg-white text-slate-900 border-slate-200 placeholder-slate-400 dark:bg-slate-900 dark:text-slate-100"
                          } dark:border-slate-700 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 ${
                            error
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/50"
                              : ""
                          }`}
                        />
                        {error && (
                          <p className="mt-1 text-[10px] font-medium text-rose-500">
                            {error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {exclusionSelections.Others?.checked && (
              <div className="mt-4">
                <Input
                  label="Other Exclusion Reason *"
                  value={exclusionOtherReason}
                  set={setExclusionOtherReason}
                  disabled={!isClosingSprint}
                  placeholder="Enter exclusion reason"
                  error={
                    isExclusionOtherRequired &&
                    exclusionOtherReason.trim() === ""
                      ? "Other exclusion reason is required."
                      : null
                  }
                />
              </div>
            )}
            {isExclusionTotalOverDelivered && (
              <p className="mt-2 text-[10px] font-medium text-rose-500">
                Total exclusion story points cannot exceed actual delivered
                story points.
              </p>
            )}
          </div>
          {/* 👈 NEW NOTE SECTION HERE */}
          <div className="bg-blue-50/40 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sprint Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isActiveSprintMode || isBeforeEndDate}
              placeholder={
                !isActiveSprintMode
                  ? "Available when sprint ends"
                  : "Add details about the sprint, blockers, or GenAI tools used..."
              }
              rows={3}
              className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors ${
                !isActiveSprintMode || isBeforeEndDate
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-70 dark:bg-slate-800"
                  : "bg-white text-slate-900 border-slate-200 placeholder-slate-400 dark:bg-slate-900 dark:text-slate-100"
              } dark:border-slate-700 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500`}
            />
          </div>
        </div>

        {startDate && endDate && !hasValidSprintDuration && (
          <p className="mt-2 text-[10px] font-medium text-rose-500">
            * Sprint duration must be exactly 14 days, except the June 29 to
            July 3 catchup sprint. Current duration:{" "}
            {diffDays !== null ? diffDays + 1 : 0} days.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <button
            disabled={!isFormValid || submitting}
            onClick={handleSubmitGPI}
            className={`py-2 px-6 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 ${
              isFormValid && !submitting
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none"
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Submitting...
              </span>
            ) : // Dynamic Button Text
            isActiveSprintMode ? (
              deliveredSP !== "" ? (
                "🎯 Submit & Close Sprint"
              ) : (
                "✏️ Update Committed SP"
              )
            ) : (
              "💾 Save Sprint Details"
            )}
          </button>

          <button
            className="py-2 px-6 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            onClick={() => navigate("/gauge")}
          >
            📋 Go to Gauge Submission
          </button>
        </div>
      </div>

      {/* ---------------- Submitted GPI List ---------------- */}
      <div
        className={`mt-6 rounded-2xl p-4 md:p-6 ${cardRing} ${surface} glass-panel`}
      >
        <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700 pb-2">
          Recent GPI Submissions
        </h2>

        {gpiEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-3xl mb-2 opacity-50">📭</div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No GPI data found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              You haven't submitted any Sprint records yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-[#1C2534] text-xs uppercase text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-4 font-semibold tracking-wider">
                    Employee ID
                  </th>
                  <th className="p-4 font-semibold tracking-wider">Squad</th>
                  <th className="p-4 font-semibold tracking-wider">Sprint</th>
                  <th className="p-4 font-semibold tracking-wider">
                    Start Date
                  </th>
                  <th className="p-4 font-semibold tracking-wider">End Date</th>
                  <th className="p-4 text-center font-semibold tracking-wider">
                    Committed
                  </th>
                  <th className="p-4 text-center font-semibold tracking-wider">
                    Delivered
                  </th>
                  {/* 👇 ADD THIS NEW HEADER 👇 */}
                  {hasExclusionData && (
                    <>
                      <th className="p-4 text-center font-semibold tracking-wider">
                        Exclusion SP
                      </th>
                      <th className="p-4 font-semibold tracking-wider">
                        Exclusion Reason
                      </th>
                    </>
                  )}
                  <th className="p-4 font-semibold tracking-wider">Note</th>
                  <th className="p-4 text-center font-semibold tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-white dark:bg-[#151C2C]">
                {gpiEntries.slice(0, 3).map((entry) => {
                  const id = entry.GPI_ID || entry.id;
                  const isCurrentlyEditing = editingGpiId === id;
                  const isSprintOpen =
                    !entry.Last_Updated_At && !entry.last_updated_at;

                  const startDateFormatted = entry.Start_Date
                    ? entry.Start_Date.split("T")[0]
                    : "-";
                  const endDateFormatted = entry.End_Date
                    ? entry.End_Date.split("T")[0]
                    : "-";

                  return (
                    <tr
                      key={id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-[#1E293B] ${isCurrentlyEditing ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}`}
                    >
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {entry.Employee_ID || entry.employee_id || "-"}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-[#0F352E] dark:text-[#4ADE80]">
                          {entry.Squad_Name || entry.squadName || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-[#172A46] dark:text-[#60A5FA]">
                          {entry.Sprint_Name || entry.sprintName || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {startDateFormatted}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {endDateFormatted}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                        {entry.Committed_Story_Points_Without_GenAI ??
                          entry.committedStoryPointsWithoutGenAI ??
                          "-"}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-[#4ADE80]">
                        {isSprintOpen
                          ? "-"
                          : (entry.Actual_Delivered_Story_Points_With_GenAI ??
                            entry.actualDeliveredStoryPointsWithGenAI ??
                            "-")}
                      </td>
                      {hasExclusionData && (
                        <>
                          <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                            {entry.Exclusion_Story_Points ??
                              entry.exclusionStoryPoints ??
                              "-"}
                          </td>
                          <td
                            className="p-4 text-slate-600 dark:text-slate-400 text-xs max-w-[170px] truncate"
                            title={formatExclusionDetails(
                              entry.Exclusion_Reason || entry.exclusionReason,
                              entry.Exclusion_Other_Reason ||
                                entry.exclusionOtherReason,
                            )}
                          >
                            {formatExclusionDetails(
                              entry.Exclusion_Reason || entry.exclusionReason,
                              entry.Exclusion_Other_Reason ||
                                entry.exclusionOtherReason,
                            )}
                          </td>
                        </>
                      )}
                      <td
                        className="p-4 text-slate-600 dark:text-slate-400 text-xs max-w-[150px] truncate"
                        title={entry.Note || entry.note || ""}
                      >
                        {entry.Note || entry.note || "-"}
                      </td>
                      <td className="p-4 text-center">
                        {isSprintOpen ? (
                          <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/40">
                            ⏳ In Progress
                          </span>
                        ) : (
                          <span
                            className="text-xs font-medium text-slate-400 dark:text-slate-500"
                            title="This sprint is closed and locked"
                          >
                            ✅ Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** ---------------- Reusable Components ---------------- */

// Auto-sliding Carousel for Business Messages
function NoticeCarousel() {
  const messages = [
    "💡 Please ensure your sprint duration does not overlap with past submissions.",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 4500); // changes every 4.5 seconds
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-3 rounded-xl mb-4 overflow-hidden relative h-12 flex items-center justify-center shadow-sm">
      {messages.map((msg, idx) => {
        let positionClass = "translate-y-full opacity-0";
        if (idx === currentIndex) {
          positionClass = "translate-y-0 opacity-100";
        } else if (
          idx ===
          (currentIndex - 1 + messages.length) % messages.length
        ) {
          positionClass = "-translate-y-full opacity-0";
        }

        return (
          <div
            key={idx}
            className={`absolute w-full text-center text-sm font-bold transition-all duration-500 ease-in-out transform ${positionClass}`}
          >
            {msg}
          </div>
        );
      })}
    </div>
  );
}

function Input({
  label,
  type = "text",
  value,
  set,
  placeholder,
  min,
  max,
  error,
  disabled,
}) {
  const inputBase =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-colors " +
    (disabled
      ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-70 dark:bg-slate-800 "
      : "bg-white text-slate-900 border-slate-200 placeholder-slate-400 dark:bg-slate-900 dark:text-slate-100 ") +
    "dark:border-slate-700 dark:placeholder-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 " +
    (error
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/50"
      : "") +
    (type === "number" ? " [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" : "");

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
        disabled={disabled}
        className={inputBase}
      />
      {error && (
        <p className="mt-1 text-[10px] font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
}
