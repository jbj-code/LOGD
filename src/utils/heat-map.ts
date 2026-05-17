// src/utils/heat-map.ts
// Helpers for heat-map month labels and visible ranges.

/** English ordinal suffix for calendar day (1st, 2nd, 3rd, 11th, …). */
export const ordinalDayLabel = (day: number): string => {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

/** Logs list header: full month name + ordinal day, e.g. "March 2nd". */
export const formatCalendarMonthHeading = (ref: Date): string => {
  const month = ref.toLocaleString('default', { month: 'long' });
  return `${month} ${ordinalDayLabel(ref.getDate())}`;
};

export const formatMonthRangeForWeeks = (weeks: Date[][]): string => {
  if (weeks.length === 0) return '';

  const first = weeks[0][0];
  const last = weeks[weeks.length - 1][6];

  const m1 = first.toLocaleString('default', { month: 'short' });
  const m2 = last.toLocaleString('default', { month: 'short' });
  const y1 = first.getFullYear();
  const y2 = last.getFullYear();

  if (y1 !== y2) return `${m1} ${y1} — ${m2} ${y2}`;
  if (m1 === m2) return `${m1} ${y1}`;
  return `${m1} — ${m2} ${y1}`;
};
