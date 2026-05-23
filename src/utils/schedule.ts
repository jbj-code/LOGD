// src/utils/schedule.ts
// Log repeat rules — daily / strided weekly (Mon–Sun bands) / monthly; classify due dates.

import { startOfWeekMonday, toDateString } from './date';
import type { LogSchedule, MonthlyOrdinal, RecurrenceRule } from '../types';

const MS_PER_DAY = 86_400_000;

/** Clamp stride to a sensible range for JSON + UI spinners (add modal uses 1–4). */
export const clampStrideWeeks = (n: number): number => {
  if (!Number.isFinite(n)) return 1;
  return Math.min(52, Math.max(1, Math.floor(n)));
};

export const clampTimesPerWeek = (n: number): number => {
  if (!Number.isFinite(n)) return 1;
  return Math.min(7, Math.max(1, Math.floor(n)));
};

export const clampIntervalDays = (n: number): number => {
  if (!Number.isFinite(n)) return 2;
  return Math.min(30, Math.max(2, Math.floor(n)));
};

/** Flexible “N days per week” target — no fixed weekday slots. */
export function scheduleHasWeeklyQuota(schedule: LogSchedule): boolean {
  return (
    schedule.cadence === 'weekly' &&
    schedule.weekdays.length === 0 &&
    typeof schedule.timesPerWeek === 'number' &&
    schedule.timesPerWeek >= 1
  );
}

export function scheduleIsInterval(schedule: LogSchedule): boolean {
  return schedule.cadence === 'interval' && typeof schedule.intervalDays === 'number';
}

/** True when heat map / preview can outline specific due calendar days. */
export function scheduleHasFixedDueDays(schedule: LogSchedule): boolean {
  if (schedule.recurrenceRules?.length) return true;
  if (schedule.cadence === 'daily') return false;
  if (scheduleHasWeeklyQuota(schedule)) return false;
  return true;
}

export function scheduleHasRecurrenceRules(schedule: LogSchedule): boolean {
  return (schedule.recurrenceRules?.length ?? 0) > 0;
}

function normalizeRecurrenceRules(raw: unknown): RecurrenceRule[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const rules: RecurrenceRule[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const cadence = r.cadence === 'monthly' ? 'monthly' : 'weekly';
    const weekday = Number(r.weekday);
    if (weekday < 0 || weekday > 6) continue;
    const strideRaw = Number(r.strideWeeks);
    rules.push({
      cadence,
      weekday,
      ...(cadence === 'weekly'
        ? { strideWeeks: clampStrideWeeks(Number.isFinite(strideRaw) ? strideRaw : 1) }
        : {}),
    });
  }
  return rules.length ? rules : undefined;
}

function isRecurrenceRuleDue(
  date: Date,
  rule: RecurrenceRule,
  anchorMonday: Date,
): boolean {
  if (date.getDay() !== rule.weekday) return false;
  if (rule.cadence === 'monthly') return true;
  return weeklyStrideAllowsDate(date, rule.strideWeeks ?? 1, anchorMonday);
}

/** Stride applied when cadence === `weekly`; legacy `biweekly` normalizes to 2. */
export function effectiveStrideWeeks(schedule: LogSchedule): number {
  if (schedule.cadence !== 'weekly') return 1;
  return clampStrideWeeks(schedule.strideWeeks ?? 1);
}

const sortedUniqueWeekdays = (days: readonly number[]): number[] =>
  Array.from(new Set(days.filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);

/** Clamp schedule from JSON/API — maps legacy `biweekly` → `{ weekly, strideWeeks: 2 }`. */
export function normalizeSchedule(raw: unknown): LogSchedule {
  if (!raw || typeof raw !== 'object') {
    return { cadence: 'daily', weekdays: [] };
  }
  const obj = raw as Record<string, unknown>;

  const rawCadence =
    typeof obj.cadence === 'string'
      ? obj.cadence
      : '';

  let cadence: 'daily' | 'weekly' | 'monthly' | 'interval';

  switch (rawCadence) {
    case 'weekly':
      cadence = 'weekly';
      break;
    case 'biweekly':
      cadence = 'weekly';
      break;
    case 'monthly':
      cadence = 'monthly';
      break;
    case 'interval':
      cadence = 'interval';
      break;
    case 'cycle':
      cadence = 'daily';
      break;
    case 'daily':
      cadence = 'daily';
      break;
    default:
      cadence = 'daily';
  }

  const weekdays = Array.isArray(obj.weekdays)
    ? sortedUniqueWeekdays(obj.weekdays.map((d) => Number(d)))
    : [];

  const monthlyRaw = obj.monthlyOccurrences;
  const monthlyOccurrences: MonthlyOrdinal[] = [];
  if (Array.isArray(monthlyRaw)) {
    for (const row of monthlyRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const ord = Number(r.ordinal);
      const wd = Number(r.weekday);
      if (!(ord >= 1 && ord <= 4) && ord !== -1) continue;
      if (wd < 0 || wd > 6) continue;
      monthlyOccurrences.push({ ordinal: ord as MonthlyOrdinal['ordinal'], weekday: wd });
    }
  }

  if (cadence === 'daily') {
    const rules = normalizeRecurrenceRules(obj.recurrenceRules);
    if (rules) return { cadence: 'daily', weekdays: [], recurrenceRules: rules };
    return { cadence: 'daily', weekdays: [] };
  }

  if (cadence === 'interval') {
    const intervalDays = clampIntervalDays(Number(obj.intervalDays));
    return { cadence: 'interval', weekdays: [], intervalDays };
  }

  if (cadence === 'weekly') {
    const rawTimesPerWeek = Number(obj.timesPerWeek);
    if (
      obj.timesPerWeek !== undefined &&
      Number.isFinite(rawTimesPerWeek) &&
      rawTimesPerWeek >= 1
    ) {
      return {
        cadence: 'weekly',
        weekdays: [],
        timesPerWeek: clampTimesPerWeek(rawTimesPerWeek),
      };
    }

    let strideWeeks = Number(obj.strideWeeks);
    if (rawCadence === 'biweekly') {
      strideWeeks =
        Number.isFinite(strideWeeks) && strideWeeks >= 2
          ? clampStrideWeeks(strideWeeks)
          : 2;
    } else {
      strideWeeks = Number.isFinite(strideWeeks) ? clampStrideWeeks(strideWeeks) : 1;
    }
    const wd = weekdays.length ? weekdays : [1];
    if (strideWeeks <= 1) {
      return { cadence: 'weekly', weekdays: wd };
    }
    return { cadence: 'weekly', weekdays: wd, strideWeeks };
  }

  /* monthly */
  if (monthlyOccurrences.length > 0) {
    return {
      cadence: 'monthly',
      weekdays: [],
      monthlyOccurrences,
    };
  }

  return {
    cadence: 'monthly',
    weekdays: weekdays.length ? weekdays : [3],
    ...(normalizeRecurrenceRules(obj.recurrenceRules)
      ? { recurrenceRules: normalizeRecurrenceRules(obj.recurrenceRules) }
      : {}),
  };
}

/** First calendar date (YYYY-MM-DD) covered by createdAt ISO string. */
export const createdBoundaryDateStr = (createdAtIso: string): string => {
  const d = new Date(createdAtIso);
  return toDateString(d);
};

/** Monday 00:00 local for the ISO-style week containing the log creation instant. */
export const scheduleAnchorMonday = (createdAtIso: string): Date =>
  startOfWeekMonday(new Date(createdAtIso));

function nthWeekdayInMonth(year: number, monthIndex: number, weekday: number, n: number): Date | null {
  if (!(n >= 1 && n <= 4)) return null;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let hits = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dt = new Date(year, monthIndex, day);
    if (dt.getDay() !== weekday) continue;
    hits++;
    if (hits === n) return dt;
  }
  return null;
}

function lastWeekdayInMonth(year: number, monthIndex: number, weekday: number): Date | null {
  for (let day = new Date(year, monthIndex + 1, 0).getDate(); day >= 1; day--) {
    const dt = new Date(year, monthIndex, day);
    if (dt.getDay() === weekday) return dt;
  }
  return null;
}

/** Calendar date matching this ordinal rule in the date's calendar month (or null). */
export function nthWeekdayOccurrence(target: Date, occ: MonthlyOrdinal): Date | null {
  const y = target.getFullYear();
  const m = target.getMonth();
  const { ordinal, weekday } = occ;

  let ref: Date | null = null;
  if (ordinal === -1) {
    ref = lastWeekdayInMonth(y, m, weekday);
  } else {
    ref = nthWeekdayInMonth(y, m, weekday, ordinal);
  }
  return ref ? new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0, 0) : null;
}

function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isMonthlyNthDue(date: Date, occs: readonly MonthlyOrdinal[]): boolean {
  const y = date.getFullYear();
  const m = date.getMonth();
  const midday = new Date(y, m, date.getDate(), 12, 0, 0, 0);
  for (const occ of occs) {
    const ref = nthWeekdayOccurrence(midday, occ);
    if (ref && sameLocalCalendarDay(ref, date)) return true;
  }
  return false;
}

function isMonthlyWeekdaysDue(date: Date, weekdays: readonly number[]): boolean {
  return weekdays.includes(date.getDay());
}

/**
 * Same Mon–Sun “week bands” alignment as anchor; true on weeks 0, N, 2N, … from anchor.
 */
export function weeklyStrideAllowsDate(
  date: Date,
  strideWeeks: number,
  anchorMonday: Date,
): boolean {
  const n = clampStrideWeeks(strideWeeks);
  if (n <= 1) return true;
  const dMonday = startOfWeekMonday(date);
  const anchorMs = anchorMonday.getTime();
  const diffWeeks = Math.round((dMonday.getTime() - anchorMs) / MS_PER_DAY / 7);
  const mod = ((diffWeeks % n) + n) % n;
  return mod === 0;
}

/** Back-compat export name — now supports any stride 1+. */
export const weeklyIntervalAllowsDate = weeklyStrideAllowsDate;

function isIntervalDue(date: Date, anchorDateStr: string, intervalDays: number): boolean {
  const targetStr = toDateString(date);
  if (targetStr < anchorDateStr) return false;
  const start = new Date(anchorDateStr + 'T12:00:00');
  const target = new Date(targetStr + 'T12:00:00');
  const diffDays = Math.round((target.getTime() - start.getTime()) / MS_PER_DAY);
  return diffDays >= 0 && diffDays % intervalDays === 0;
}

function isDueOnDateIgnoringBoundary(date: Date, schedule: LogSchedule, anchorMonday: Date): boolean {
  if (schedule.cadence === 'daily') return true;

  if (scheduleHasWeeklyQuota(schedule)) return false;

  if (schedule.cadence === 'weekly') {
    if (schedule.weekdays.length === 0) return false;
    if (!schedule.weekdays.includes(date.getDay())) return false;
    const stride = effectiveStrideWeeks(schedule);
    return weeklyStrideAllowsDate(date, stride, anchorMonday);
  }

  /* monthly */
  if (schedule.monthlyOccurrences && schedule.monthlyOccurrences.length > 0) {
    return isMonthlyNthDue(date, schedule.monthlyOccurrences);
  }
  if (schedule.weekdays.length === 0) return false;
  return isMonthlyWeekdaysDue(date, schedule.weekdays);
}

/** True when this calendar day is an expected occurrence for `schedule`. */
export function isDueDateStr(schedule: LogSchedule, createdAtIso: string, dateStr: string): boolean {
  const boundary = createdBoundaryDateStr(createdAtIso);
  if (dateStr < boundary) return false;
  const date = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(date.getTime())) return false;

  if (scheduleHasWeeklyQuota(schedule)) return false;

  if (schedule.recurrenceRules?.length) {
    const anchor = scheduleAnchorMonday(createdAtIso);
    return schedule.recurrenceRules.some((rule) => isRecurrenceRuleDue(date, rule, anchor));
  }

  if (scheduleIsInterval(schedule)) {
    return isIntervalDue(date, boundary, clampIntervalDays(schedule.intervalDays ?? 2));
  }

  const anchor = scheduleAnchorMonday(createdAtIso);
  return isDueOnDateIgnoringBoundary(date, schedule, anchor);
}

const maxDateStr = (a: string, b: string): string => (a > b ? a : b);

/** Expected check-in days in one calendar year (respects creation boundary). */
export function countDueDatesInCalendarYear(
  schedule: LogSchedule,
  createdAtIso: string,
  year: number,
  onlyFromDateStr?: string,
): number {
  const normalized = normalizeSchedule(schedule);
  const boundary = createdBoundaryDateStr(createdAtIso);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const start = maxDateStr(maxDateStr(yearStart, boundary), onlyFromDateStr ?? yearStart);
  if (start > yearEnd) return 0;

  let count = 0;
  let cursor = new Date(start + 'T12:00:00');
  const until = new Date(yearEnd + 'T12:00:00');
  let guard = 0;
  while (cursor <= until && guard++ < 400) {
    const ds = toDateString(cursor);
    if (isDueDateStr(normalized, createdAtIso, ds)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Expected check-in days in one calendar month. */
export function countDueDatesInMonth(
  schedule: LogSchedule,
  createdAtIso: string,
  year: number,
  monthIndex: number,
  onlyFromDateStr?: string,
): number {
  const normalized = normalizeSchedule(schedule);
  const boundary = createdBoundaryDateStr(createdAtIso);
  const monthStart = toDateString(new Date(year, monthIndex, 1));
  const monthEnd = toDateString(new Date(year, monthIndex + 1, 0));
  const start = maxDateStr(maxDateStr(monthStart, boundary), onlyFromDateStr ?? monthStart);
  if (start > monthEnd) return 0;

  let count = 0;
  let cursor = new Date(start + 'T12:00:00');
  const until = new Date(monthEnd + 'T12:00:00');
  let guard = 0;
  while (cursor <= until && guard++ < 40) {
    const ds = toDateString(cursor);
    if (isDueDateStr(normalized, createdAtIso, ds)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function scheduleIsNonDaily(schedule: LogSchedule): boolean {
  if (schedule.recurrenceRules?.length) return true;
  if (schedule.cadence === 'interval') return true;
  if (scheduleHasWeeklyQuota(schedule)) return true;
  return schedule.cadence !== 'daily';
}

/** Dates (YYYY-MM-DD) from `createdAtIso` … `maxDateStr` descending; cap scan length. */
export function enumerateDueDateStringsDescending(
  schedule: LogSchedule,
  createdAtIso: string,
  maxDateStr: string,
  maxScan = 24000,
): string[] {
  if (scheduleHasWeeklyQuota(schedule)) return [];

  if (scheduleIsInterval(schedule)) {
    const boundary = createdBoundaryDateStr(createdAtIso);
    const intervalDays = clampIntervalDays(schedule.intervalDays ?? 2);
    const results: string[] = [];
    let cursor = new Date(maxDateStr + 'T12:00:00');
    let guard = 0;
    while (guard++ < maxScan) {
      const dateStr = toDateString(cursor);
      if (dateStr < boundary) break;
      if (isIntervalDue(cursor, boundary, intervalDays)) results.push(dateStr);
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    }
    return results;
  }

  const boundary = createdBoundaryDateStr(createdAtIso);
  let cursor = new Date(maxDateStr + 'T12:00:00');
  const results: string[] = [];

  for (let guard = 0; guard < maxScan; guard++) {
    const dateStr = toDateString(cursor);
    if (dateStr < boundary) break;
    if (isDueDateStr(schedule, createdAtIso, dateStr)) results.push(dateStr);
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  return results;
}

/** Human-readable line for UI (short). */
export function formatScheduleSubtitle(schedule: LogSchedule): string {
  if (schedule.recurrenceRules?.length) {
    return schedule.recurrenceRules.map(formatRecurrenceRuleSubtitle).join(' · ');
  }

  switch (schedule.cadence) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      if (scheduleHasWeeklyQuota(schedule)) {
        const n = clampTimesPerWeek(schedule.timesPerWeek ?? 1);
        return n === 1 ? '1 day per week' : `${n} days per week`;
      }
      const s = effectiveStrideWeeks(schedule);
      const short =
        schedule.weekdays.length <= 2
          ? labelWeekdays(schedule.weekdays)
          : `${schedule.weekdays.length} days`;
      if (s <= 1) {
        return schedule.weekdays.length <= 2 ? `Weekly · ${short}` : `Weekly · ${short}/week`;
      }
      return `Every ${s} weeks · ${short}`;
    }
    case 'monthly': {
      if (schedule.monthlyOccurrences && schedule.monthlyOccurrences.length > 0)
        return `Monthly (${schedule.monthlyOccurrences.length} ${schedule.monthlyOccurrences.length === 1 ? 'date' : 'dates'})`;
      if (schedule.weekdays.length <= 2)
        return `Monthly · ${labelWeekdays(schedule.weekdays)} each month`;
      return `Monthly · ${schedule.weekdays.length} weekdays`;
    }
    case 'interval': {
      const n = clampIntervalDays(schedule.intervalDays ?? 2);
      return n === 1 ? 'Every day' : `Every ${n} days`;
    }
    default:
      return '';
  }
}

const DOW_LABELS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRecurrenceRuleSubtitle(rule: RecurrenceRule): string {
  const day = DOW_LABELS_FULL[rule.weekday] ?? '?';
  if (rule.cadence === 'monthly') return `Every month on ${day}`;
  const stride = clampStrideWeeks(rule.strideWeeks ?? 1);
  if (stride <= 1) return `Every week on ${day}`;
  if (stride === 2) return `Every other week on ${day}`;
  return `Every ${stride} weeks on ${day}`;
}

function labelWeekdays(days: readonly number[]): string {
  const sorted = sortedUniqueWeekdays([...days]);
  return sorted.map((d) => DOW_LABELS_FULL[d]).join(', ');
}

/** Logged check-ins in the Mon–Sun week starting `weekMonday`. */
export function countEntriesInIsoWeek(
  entries: Record<string, boolean>,
  weekMonday: Date,
): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    if (entries[toDateString(d)]) count++;
  }
  return count;
}

export function weekMeetsWeeklyQuota(
  schedule: LogSchedule,
  entries: Record<string, boolean>,
  weekMonday: Date,
): boolean {
  if (!scheduleHasWeeklyQuota(schedule)) return false;
  const target = clampTimesPerWeek(schedule.timesPerWeek ?? 1);
  return countEntriesInIsoWeek(entries, weekMonday) >= target;
}

/** Monday of each Mon–Sun week from log creation through `endDateStr` (inclusive). */
export function enumerateIsoWeekMondaysAscending(
  createdAtIso: string,
  endDateStr: string,
): Date[] {
  const createdMonday = startOfWeekMonday(new Date(createdAtIso));
  const endMonday = startOfWeekMonday(new Date(endDateStr + 'T12:00:00'));
  const weeks: Date[] = [];
  const cursor = new Date(createdMonday);
  while (cursor <= endMonday) {
    weeks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

/** Count streak instances (scheduled completions) / expected slots — for consistency %. */
export function countScheduledConsistency(
  schedule: LogSchedule,
  createdAtIso: string,
  endDateStr: string,
  entries: Record<string, boolean>,
): { due: number; hit: number } {
  if (scheduleHasWeeklyQuota(schedule)) {
    const target = clampTimesPerWeek(schedule.timesPerWeek ?? 1);
    let due = 0;
    let hit = 0;
    for (const monday of enumerateIsoWeekMondaysAscending(createdAtIso, endDateStr)) {
      due += target;
      hit += Math.min(countEntriesInIsoWeek(entries, monday), target);
    }
    return { due, hit };
  }

  let due = 0;
  let hit = 0;

  let cursor = new Date(createdBoundaryDateStr(createdAtIso) + 'T12:00:00');
  const until = new Date(endDateStr + 'T12:00:00');
  let guard = 0;

  while (cursor <= until && guard++ < 24000) {
    const ds = toDateString(cursor);
    if (isDueDateStr(schedule, createdAtIso, ds)) {
      due++;
      if (entries[ds]) hit++;
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return { due, hit };
}

/** Every expected occurrence from first due through `untilDateStr` (inclusive). */
export function enumerateDueDateStringsAscending(
  schedule: LogSchedule,
  createdAtIso: string,
  untilDateStr: string,
): string[] {
  if (scheduleHasWeeklyQuota(schedule)) return [];

  if (scheduleIsInterval(schedule)) {
    const boundary = createdBoundaryDateStr(createdAtIso);
    const intervalDays = clampIntervalDays(schedule.intervalDays ?? 2);
    const list: string[] = [];
    let cursor = new Date(boundary + 'T12:00:00');
    const until = new Date(untilDateStr + 'T12:00:00');
    let guard = 0;
    while (cursor <= until && guard++ < 24000) {
      const ds = toDateString(cursor);
      if (isIntervalDue(cursor, boundary, intervalDays)) list.push(ds);
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + intervalDays);
    }
    return list;
  }

  let cursor = new Date(createdBoundaryDateStr(createdAtIso) + 'T12:00:00');
  const until = new Date(untilDateStr + 'T12:00:00');
  const list: string[] = [];
  let guard = 0;

  while (cursor <= until && guard++ < 24000) {
    const ds = toDateString(cursor);
    if (isDueDateStr(schedule, createdAtIso, ds)) list.push(ds);
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return list;
}
