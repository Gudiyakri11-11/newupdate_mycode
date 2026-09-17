const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateOnlyUtc = (value) => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const getWorkingDateStrings = (
  startDate,
  endDate,
  excludedDates = [],
) => {
  const current = parseDateOnlyUtc(startDate);
  const end = parseDateOnlyUtc(endDate);
  if (!current || !end || current > end) return [];

  const excluded = new Set(excludedDates);
  const workingDates = [];

  while (current <= end) {
    const weekday = current.getUTCDay();
    const dateString = current.toISOString().slice(0, 10);

    if (weekday !== 0 && weekday !== 6 && !excluded.has(dateString)) {
      workingDates.push(dateString);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return workingDates;
};
