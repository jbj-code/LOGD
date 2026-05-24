// src/utils/date.ts
// Date helpers used throughout the app.

/** Returns "YYYY-MM-DD" string for a given Date. */
export const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Returns today's date as "YYYY-MM-DD". */
export const today = (): string => toDateString(new Date());

/** Returns the date string `days` before today (local calendar). */
export const daysAgoDateString = (days: number): string => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return toDateString(d);
};

/** Inclusive calendar-month bounds as YYYY-MM-DD strings. */
export const monthDateRange = (
  year: number,
  monthIndex: number,
): { start: string; end: string } => ({
  start: toDateString(new Date(year, monthIndex, 1)),
  end: toDateString(new Date(year, monthIndex + 1, 0)),
});

/**
 * Returns an array of weeks (oldest first), each week being 7 Date objects
 * starting on Monday. The last week is the current week.
 */
export const getWeeksGrid = (numWeeks: number): Date[][] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Find Monday of the current week
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - daysFromMonday);

  const result: Date[][] = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(currentMonday);
      date.setDate(currentMonday.getDate() - w * 7 + d);
      week.push(date);
    }
    result.push(week);
  }

  return result;
};

/** Short month abbreviation for a given week column (used for heat map labels). */
export const monthLabelForWeek = (week: Date[]): string | null => {
  for (const date of week) {
    if (date.getDate() <= 7) {
      return date.toLocaleString('default', { month: 'short' });
    }
  }
  return null;
};

/**
 * Label for week column `weekIndex`: month abbreviation only when that week's Monday
 * starts a new calendar month vs the previous column (avoids repeated "Jun Jun Jun").
 */
export const monthLabelForWeekColumn = (weeks: Date[][], weekIndex: number): string => {
  const monday = weeks[weekIndex][0];
  if (weekIndex === 0) {
    return monday.toLocaleString('default', { month: 'short' });
  }
  const prevMonday = weeks[weekIndex - 1][0];
  const newMonth =
    monday.getFullYear() !== prevMonday.getFullYear() ||
    monday.getMonth() !== prevMonday.getMonth();
  return newMonth ? monday.toLocaleString('default', { month: 'short' }) : '';
};

/**
 * Label for week column in the detail heat map for calendar year `detailYear`.
 * Omits the label when that week's Monday falls before Jan 1 of that year (no stray "Dec"
 * beside January).
 */
export const monthLabelForWeekColumnInDetailYear = (
  weeks: Date[][],
  weekIndex: number,
  detailYear: number,
): string => {
  const monday = weeks[weekIndex][0];
  const yearStart = new Date(detailYear, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const m = new Date(monday);
  m.setHours(0, 0, 0, 0);
  if (m < yearStart) return '';
  return monthLabelForWeekColumn(weeks, weekIndex);
};

/** Formats a date string as a human-readable label like "Mon, May 5". */
export const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * Calendar rows for one month (Mon–Sun columns), with null padding before/after month days.
 */
export const getMonthCalendarGrid = (year: number, monthIndex: number): (Date | null)[][] => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startDow = new Date(year, monthIndex, 1).getDay();
  const offset = startDow === 0 ? 6 : startDow - 1;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(new Date(year, monthIndex, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
};

/** Current local month grid (Mon–Sun rows) — updates when the device calendar month changes. */
export const getCurrentMonthGrid = (): (Date | null)[][] => {
  const n = new Date();
  return getMonthCalendarGrid(n.getFullYear(), n.getMonth());
};

/** Six rows × seven columns, Sunday-first (column 0 = Sunday), padded with nulls to 42 cells. */
export function getSunStartMonthGridSixRows(year: number, monthIndex: number): (Date | null)[][] {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startDow = new Date(year, monthIndex, 1).getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(new Date(year, monthIndex, d));
  }
  while (cells.length < 42) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < 42; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

/** Monday 00:00:00 local time for the ISO-style week containing `date`. */
export const startOfWeekMonday = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Week columns (Mon→Sun) covering every week that overlaps `fullYear`
 * (includes partial weeks at Jan 1 / Dec 31).
 */
export const getWeeksForCalendarYear = (fullYear: number): Date[][] => {
  const jan1 = new Date(fullYear, 0, 1);
  jan1.setHours(0, 0, 0, 0);
  const dec31 = new Date(fullYear, 11, 31);
  dec31.setHours(23, 59, 59, 999);

  let monday = startOfWeekMonday(jan1);
  const weeks: Date[][] = [];

  while (true) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      week.push(dt);
    }
    const touchesYear = !(week[6] < jan1 || week[0] > dec31);
    if (touchesYear) weeks.push(week);
    if (week[0] > dec31) break;
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }

  return weeks;
};
export const findFirstWeekColumnIndexForMonth = (
  weeks: Date[][],
  monthIndex: number,
  fullYear: number,
): number => {
  const idx = weeks.findIndex((week) =>
    week.some((d) => d.getMonth() === monthIndex && d.getFullYear() === fullYear),
  );
  return idx >= 0 ? idx : Math.max(0, weeks.length - 1);
};
