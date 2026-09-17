export function isNonNegativeNumber(value) {
  if ((value ?? "").toString().trim() === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isHoursValid(value) {
  if ((value ?? "").toString().trim() === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0.1 && n <= 12;
}

export function isInteger(value) {
  if ((value ?? "").toString().trim() === "") return false;
  const n = Number(value);
  return Number.isInteger(n);
}

export function ddmmyyyyToInputValue(ddmmyyyy) {
  const m = (ddmmyyyy || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [_, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayInputDate() {
  return getIndiaCalendarDate().iso;
}

export function getTodayLocal() {
  const today = getIndiaCalendarDate();
  return new Date(today.year, today.month - 1, today.day);
}

export function getMinAllowedDateInput() {
  const today = getIndiaCalendarDate();
  if (today.day <= 2) {
    const previousMonth = new Date(Date.UTC(today.year, today.month - 2, 1));
    return [
      previousMonth.getUTCFullYear(),
      String(previousMonth.getUTCMonth() + 1).padStart(2, "0"),
      "16",
    ].join("-");
  }

  return [
    today.year,
    String(today.month).padStart(2, "0"),
    String(today.day >= 18 ? 16 : 1).padStart(2, "0"),
  ].join("-");
}

export function isoToDDMMYYYY(isoString) {
  if (!isoString) return "";
  const datePart = isoString.split("T")[0]; 
  const parts = datePart.split("-");
  if (parts.length !== 3) return ""; 
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format working days array into readable date string
 * Example: formatWorkingDaysDisplay(2026, 8, [28, 31]) => "Aug 28 & 31"
 */
export function formatWorkingDaysDisplay(year, month, dayNumbers) {
  if (!dayNumbers || dayNumbers.length === 0) return '';
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = monthNames[month - 1];
  
  if (dayNumbers.length === 1) {
    return `${monthName} ${dayNumbers[0]}`;
  } else if (dayNumbers.length === 2) {
    return `${monthName} ${dayNumbers[0]} & ${dayNumbers[1]}`;
  } else {
    // For more than 2 days, use comma separation
    const allButLast = dayNumbers.slice(0, -1).join(', ');
    const last = dayNumbers[dayNumbers.length - 1];
    return `${monthName} ${allButLast} & ${last}`;
  }
}

export function isValidDDMMYYYY(ddmmyyyy) {
  const re = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m = (ddmmyyyy || "").match(re);
  if (!m) return false;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const dt = new Date(yyyy, mm - 1, dd);
  return (
    dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd
  );
}

export function nowIso() {
  return new Date().toISOString();
}

export function ddmmyyyyToDate(ddmmyyyy) {
  const m = (ddmmyyyy || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  return new Date(yyyy, mm - 1, dd);
}

export function getIndiaCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    iso: `${values.year}-${values.month}-${values.day}`,
  };
}

function calendarDayIndex({ year, month, day }) {
  return Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
}

export function getGaugeDatePolicyReason(
  ddmmyyyy,
  operation = "create",
  today = getIndiaCalendarDate(),
) {
  if (!isValidDDMMYYYY(ddmmyyyy)) return "Select a valid Gauge date.";
  const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const target = {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  };

  if (calendarDayIndex(target) > calendarDayIndex(today)) {
    return "You cannot submit or modify Gauge data for a future date.";
  }

  const monthDifference =
    today.year * 12 + today.month - (target.year * 12 + target.month);
  if (monthDifference > 1) {
    return "Gauge data can only be submitted or modified for the current month, or for the previous month on the 1st and 2nd.";
  }
  if (monthDifference === 1) {
    if (target.day <= 15) {
      return "Gauge data dated from the 1st through the 15th is locked from the 18th of the same month.";
    }
    if (today.day >= 3) {
      return "Previous-month Gauge data is locked from the 3rd of the current month.";
    }
  }
  if (
    monthDifference === 0 &&
    today.day >= 18 &&
    target.day >= 1 &&
    target.day <= 15
  ) {
    return "Gauge data dated from the 1st through the 15th is locked from the 18th of the same month.";
  }
  if (
    monthDifference === 0 &&
    (operation === "update" || operation === "delete") &&
    calendarDayIndex(today) - calendarDayIndex(target) > 15
  ) {
    return "Gauge entries older than 15 calendar days cannot be edited or deleted.";
  }
  return "";
}

// Helper function to get last N working days of a month (excluding weekends)
function getLastWorkingDaysOfMonth(year, month, count = 2) {
  const lastDay = new Date(year, month, 0); // Last day of month
  const workingDays = [];
  
  let currentDay = lastDay.getDate();
  while (workingDays.length < count && currentDay >= 1) {
    const date = new Date(year, month - 1, currentDay);
    const dayOfWeek = date.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(currentDay);
    }
    currentDay--;
  }
  
  return workingDays.reverse();
}

// Helper function to get first N working days of a month (excluding weekends)
function getFirstWorkingDaysOfMonth(year, month, count = 2) {
  const workingDays = [];
  let currentDay = 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  while (workingDays.length < count && currentDay <= daysInMonth) {
    const date = new Date(year, month - 1, currentDay);
    const dayOfWeek = date.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays.push(currentDay);
    }
    currentDay++;
  }
  
  return workingDays;
}

/**
 * Get token submission window information
 * Returns:
 * - isInWindow: boolean - whether current date is in valid submission window
 * - allowedMonths: array - list of {value: "YYYY-MM", label: "Month Year", isPrevious: boolean}
 * - windowDescription: string - description of when submission is allowed
 * - nextWindowStart: string - description of when next window opens
 */
export function getTokenSubmissionWindow(today = getIndiaCalendarDate()) {
  const { year, month, day } = today;
  const todayIndex = calendarDayIndex(today);

  // Get first 2 working days of CURRENT month (for submitting PREVIOUS month data)
  const currentMonthFirstWorkingDays = getFirstWorkingDaysOfMonth(year, month, 2);

  // Get last 2 working days of PREVIOUS month (for submitting PREVIOUS month data)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthLastWorkingDays = getLastWorkingDaysOfMonth(prevYear, prevMonth, 2);

  // Window for PREVIOUS month submission: last 2 working days of prev month + first 2 working days of current month
  const prevWindowStartDay = prevMonthLastWorkingDays[0];
  const prevWindowEndDay = currentMonthFirstWorkingDays[1];
  const prevWindowStartIndex = calendarDayIndex({ year: prevYear, month: prevMonth, day: prevWindowStartDay });
  const prevWindowEndIndex = calendarDayIndex({ year, month, day: prevWindowEndDay });

  // Get last 2 working days of CURRENT month (for submitting CURRENT month data)
  const currentMonthLastWorkingDays = getLastWorkingDaysOfMonth(year, month, 2);

  // Get first 2 working days of NEXT month (for submitting CURRENT month data)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthFirstWorkingDays = getFirstWorkingDaysOfMonth(nextYear, nextMonth, 2);

  // Window for CURRENT month submission: last 2 working days of current month + first 2 working days of next month
  const currentWindowStartDay = currentMonthLastWorkingDays[0];
  const currentWindowEndDay = nextMonthFirstWorkingDays[1];
  const currentWindowStartIndex = calendarDayIndex({ year, month, day: currentWindowStartDay });
  const currentWindowEndIndex = calendarDayIndex({ year: nextYear, month: nextMonth, day: currentWindowEndDay });

  // Continuous date-range check: every calendar day between the two boundary
  // working days counts as "in window", including weekends/holidays in between.
  const isInPrevMonthWindow = todayIndex >= prevWindowStartIndex && todayIndex <= prevWindowEndIndex;
  const isInCurrentMonthWindow = todayIndex >= currentWindowStartIndex && todayIndex <= currentWindowEndIndex;

  const isInWindow = isInPrevMonthWindow || isInCurrentMonthWindow;
  
  // Determine which month can be submitted based on current position in window
  const allowedMonths = [];
  let isInLastWorkingDaysPeriod = false;
  let isInFirstWorkingDaysPeriod = false;
  
  if (isInWindow) {
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    
    // In the window that allows submitting the PREVIOUS month's data
    if (isInPrevMonthWindow) {
      isInFirstWorkingDaysPeriod = true;
      allowedMonths.push({
        value: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
        label: `${monthNames[prevMonth - 1]} ${prevYear}`,
        isPrevious: true
      });
    }
    // In the window that allows submitting the CURRENT month's data
    else if (isInCurrentMonthWindow) {
      isInLastWorkingDaysPeriod = true;
      allowedMonths.push({
        value: `${year}-${String(month).padStart(2, '0')}`,
        label: `${monthNames[month - 1]} ${year}`,
        isPrevious: false
      });
    }
  }
  
  // Generate window description
  let windowDescription = '';
  let nextWindowStart = '';
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  if (isInWindow) {
    if (isInFirstWorkingDaysPeriod) {
      const startDateStr = `${monthNames[prevMonth - 1]} ${prevWindowStartDay}`;
      const endDateStr = `${monthNames[month - 1]} ${prevWindowEndDay}`;
      windowDescription = `You are in the submission window (${startDateStr} - ${endDateStr}). You can submit token usage for ${monthNames[prevMonth - 1]} ${prevYear}.`;
    } else if (isInLastWorkingDaysPeriod) {
      const startDateStr = `${monthNames[month - 1]} ${currentWindowStartDay}`;
      const endDateStr = `${monthNames[nextMonth - 1]} ${currentWindowEndDay}`;
      windowDescription = `You are in the submission window (${startDateStr} - ${endDateStr}). You can submit token usage for ${monthNames[month - 1]} ${year}.`;
    }
  } else {
    // Show when next window opens (first working days of current month or last working days of current month)
    const daysUntilFirstWorkingDays = currentMonthFirstWorkingDays[0] - day;
    const daysUntilLastWorkingDays = currentMonthLastWorkingDays[0] - day;
    
    if (daysUntilFirstWorkingDays > 0 && daysUntilFirstWorkingDays < daysUntilLastWorkingDays) {
      windowDescription = `Token usage submission is currently closed. The next submission window will open on ${monthNames[month - 1]} ${currentMonthFirstWorkingDays[0]} for ${monthNames[prevMonth - 1]} data.`;
      nextWindowStart = `Next window: ${monthNames[prevMonth - 1]} ${prevWindowStartDay} - ${monthNames[month - 1]} ${prevWindowEndDay}`;
    } else {
      windowDescription = `Token usage submission is currently closed. The next submission window will open on ${monthNames[month - 1]} ${currentWindowStartDay} for ${monthNames[month - 1]} data.`;
      nextWindowStart = `Next window: ${monthNames[month - 1]} ${currentWindowStartDay} - ${monthNames[nextMonth - 1]} ${currentWindowEndDay}`;
    }
  }
  
  return {
    isInWindow,
    allowedMonths,
    windowDescription,
    nextWindowStart,
    currentWorkingDayInfo: {
      isInLastWorkingDaysPeriod,
      isInFirstWorkingDaysPeriod,
      lastWorkingDays: currentMonthLastWorkingDays,
      firstWorkingDays: currentMonthFirstWorkingDays,
      windowStartDay: isInFirstWorkingDaysPeriod ? prevWindowStartDay : currentWindowStartDay,
      windowEndDay: isInFirstWorkingDaysPeriod ? prevWindowEndDay : currentWindowEndDay
    },
    // Formatted date strings for announcements
    formattedDates: {
      windowStart: isInFirstWorkingDaysPeriod 
        ? `${monthNames[prevMonth - 1]} ${prevWindowStartDay}` 
        : `${monthNames[month - 1]} ${currentWindowStartDay}`,
      windowEnd: isInFirstWorkingDaysPeriod 
        ? `${monthNames[month - 1]} ${prevWindowEndDay}` 
        : `${monthNames[nextMonth - 1]} ${currentWindowEndDay}`,
      currentMonthLast: formatWorkingDaysDisplay(year, month, currentMonthLastWorkingDays),
      nextMonthFirst: formatWorkingDaysDisplay(nextYear, nextMonth, nextMonthFirstWorkingDays),
      currentMonthName: ["January", "February", "March", "April", "May", "June",
                         "July", "August", "September", "October", "November", "December"][month - 1],
      nextMonthName: ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"][nextMonth - 1],
      currentYear: year,
      nextYear: nextYear,
      // The month/year the window actually lets you submit data FOR
      // (previous month while in the first-working-days period, current month otherwise)
      targetMonthName: ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"][
                          (isInFirstWorkingDaysPeriod ? prevMonth : month) - 1
                        ],
      targetYear: isInFirstWorkingDaysPeriod ? prevYear : year
    }
  };
}
