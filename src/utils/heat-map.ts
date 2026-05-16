// src/utils/heat-map.ts
// Helpers for heat-map month labels and visible ranges.

/** Heading for list-card heat maps (month name only). */
export const formatCalendarMonthHeading = (ref: Date): string =>
  ref.toLocaleString('default', { month: 'long' });

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
