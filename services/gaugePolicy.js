const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoCalendarDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, iso: `${match[1]}-${match[2]}-${match[3]}` };
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

  return parseIsoCalendarDate(
    `${values.year}-${values.month}-${values.day}`,
  );
}

function monthIndex(date) {
  return date.year * 12 + date.month;
}

function dayIndex(date) {
  return Date.UTC(date.year, date.month - 1, date.day) / DAY_MS;
}

export function evaluateGaugeDatePolicy({
  targetDate,
  operation,
  isAdmin = false,
  today = getIndiaCalendarDate(),
}) {
  const target =
    typeof targetDate === "string"
      ? parseIsoCalendarDate(targetDate)
      : targetDate;
  const current = typeof today === "string" ? parseIsoCalendarDate(today) : today;

  if (!target) {
    return { allowed: false, code: "INVALID_DATE", reason: "A valid date is required." };
  }
  if (!current) {
    return {
      allowed: false,
      code: "INVALID_CURRENT_DATE",
      reason: "The current India calendar date could not be determined.",
    };
  }

  if (dayIndex(target) > dayIndex(current)) {
    return {
      allowed: false,
      code: "FUTURE_DATE",
      reason: "You cannot submit or modify Gauge data for a future date.",
    };
  }

  if (isAdmin) return { allowed: true, code: null, reason: null };

  const targetMonth = monthIndex(target);
  const currentMonth = monthIndex(current);
  const monthDifference = currentMonth - targetMonth;

  if (monthDifference < 0) {
    return {
      allowed: false,
      code: "FUTURE_MONTH",
      reason: "You cannot submit or modify Gauge data for a future month.",
    };
  }

  if (monthDifference > 1) {
    return {
      allowed: false,
      code: "OLDER_MONTH",
      reason: "Gauge data can only be submitted or modified for the current month, or for the previous month on the 1st and 2nd.",
    };
  }

  if (monthDifference === 1) {
    if (target.day <= 15) {
      return {
        allowed: false,
        code: "FIRST_HALF_LOCKED",
        reason: "Gauge data dated from the 1st through the 15th is locked from the 18th of the same month.",
      };
    }
    if (current.day >= 3) {
      return {
        allowed: false,
        code: "PREVIOUS_MONTH_LOCKED",
        reason: "Previous-month Gauge data is locked from the 3rd of the current month.",
      };
    }
  }

  if (
    monthDifference === 0 &&
    current.day >= 18 &&
    target.day >= 1 &&
    target.day <= 15
  ) {
    return {
      allowed: false,
      code: "FIRST_HALF_LOCKED",
      reason: "Gauge data dated from the 1st through the 15th is locked from the 18th of the same month.",
    };
  }

  if (
    monthDifference === 0 &&
    (operation === "update" || operation === "delete") &&
    dayIndex(current) - dayIndex(target) > 15
  ) {
    return {
      allowed: false,
      code: "OLDER_THAN_15_DAYS",
      reason: "Gauge entries older than 15 calendar days cannot be edited or deleted.",
    };
  }

  return { allowed: true, code: null, reason: null };
}

export function sqlDateToIso(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }
  return null;
}
