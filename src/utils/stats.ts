// src/utils/stats.ts
// Streak and consistency calculations for logs.

import type { Log } from '../types';
import { startOfWeekMonday, today, toDateString } from './date';
import {
  normalizeSchedule,
  scheduleIsNonDaily,
  scheduleHasWeeklyQuota,
  enumerateDueDateStringsDescending,
  enumerateDueDateStringsAscending,
  enumerateIsoWeekMondaysAscending,
  countScheduledConsistency,
  isDueDateStr,
  weekMeetsWeeklyQuota,
} from './schedule';

/** Compare YYYY-MM-DD strings. */
function maxDateStr(...dates: string[]): string {
  return dates.reduce((acc, cur) => (cur > acc ? cur : acc), '');
}

/** Upper bound for iterating scheduled occurrences (captures streaks touching last logged slot). */
const scheduleIterateEndDate = (log: Log): string =>
  maxDateStr(today(), ...Object.keys(log.entries).filter((d) => log.entries[d]));

/** Number of consecutive due instances ending at today (today optional if unchecked). For daily habits = calendar days logged. */
export const getCurrentStreak = (log: Log): number => {
  const schedule = normalizeSchedule(log.schedule);

  if (!scheduleIsNonDaily(schedule)) {
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    const todayStr = today();
    if (!log.entries[todayStr]) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const dateStr = toDateString(cursor);
      if (!log.entries[dateStr]) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  if (scheduleHasWeeklyQuota(schedule)) {
    const thisMonday = startOfWeekMonday(new Date());
    let monday = new Date(thisMonday);
    if (!weekMeetsWeeklyQuota(schedule, log.entries, thisMonday)) {
      monday.setDate(monday.getDate() - 7);
    }
    const createdMonday = startOfWeekMonday(new Date(log.createdAt));
    let streak = 0;
    while (monday >= createdMonday) {
      if (!weekMeetsWeeklyQuota(schedule, log.entries, monday)) break;
      streak++;
      monday.setDate(monday.getDate() - 7);
    }
    return streak;
  }

  const todayStr = today();
  let dueDesc = enumerateDueDateStringsDescending(schedule, log.createdAt, todayStr);
  if (dueDesc[0] === todayStr && !log.entries[todayStr]) dueDesc = dueDesc.slice(1);

  let streak = 0;
  for (const ds of dueDesc) {
    if (log.entries[ds]) streak++;
    else break;
  }
  return streak;
};

/** Longest run of consecutive due slots with a log row (daily = consecutive calendar days with entries). */
export const getLongestStreak = (log: Log): number => {
  const schedule = normalizeSchedule(log.schedule);

  if (!scheduleIsNonDaily(schedule)) {
    const dates = Object.keys(log.entries)
      .filter((d) => log.entries[d])
      .sort();

    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000;

      if (diff === 1) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }

  if (scheduleHasWeeklyQuota(schedule)) {
    const endDate = scheduleIterateEndDate(log);
    const weeks = enumerateIsoWeekMondaysAscending(log.createdAt, endDate);
    let longest = 0;
    let current = 0;
    for (const monday of weeks) {
      if (weekMeetsWeeklyQuota(schedule, log.entries, monday)) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    return longest;
  }

  const endDate = scheduleIterateEndDate(log);
  const duesAsc = enumerateDueDateStringsAscending(schedule, log.createdAt, endDate);
  if (duesAsc.length === 0) return 0;

  let longest = 0;
  let current = 0;
  for (const ds of duesAsc) {
    if (log.entries[ds]) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
};

/** Total number of logged days / check-ins. */
export const getTotalLogged = (log: Log): number =>
  Object.values(log.entries).filter(Boolean).length;

/**
 * Completed expected slots divided by slots since creation (through today).
 * Daily habits use calendar days eligible.
 */
export const getConsistency = (log: Log): number => {
  const schedule = normalizeSchedule(log.schedule);
  const endStr = today();
  const created = new Date(log.createdAt);
  created.setHours(0, 0, 0, 0);

  if (!scheduleIsNonDaily(schedule)) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.round((now.getTime() - created.getTime()) / 86_400_000) + 1);
    const logged = getTotalLogged(log);

    return Math.round((logged / totalDays) * 100);
  }

  const { due, hit } = countScheduledConsistency(schedule, log.createdAt, endStr, log.entries);
  if (due === 0) return 100;
  return Math.round((hit / due) * 100);
};

/**
 * Returns daily logged counts across all logs for the last N days.
 * Used for the stats bar chart.
 */
export const getDailyTotals = (logs: Log[], days: number): number[] => {
  const result: number[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const cursor = new Date(now);
    cursor.setDate(now.getDate() - i);
    const dateStr = toDateString(cursor);
    const count = logs.filter((l) => l.entries[dateStr]).length;
    result.push(count);
  }

  return result;
};

/**
 * Returns weekly rhythm score (0–100) per log over last N ISO-style weeks ending this week.
 * Daily logs — share of calendar days logged. Scheduled logs — share of due days hit.
 */
export const getWeeklyConsistency = (log: Log, weeks: number): number[] => {
  const result: number[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const schedule = normalizeSchedule(log.schedule);

  for (let w = weeks - 1; w >= 0; w--) {
    if (scheduleHasWeeklyQuota(schedule)) {
      const target = schedule.timesPerWeek ?? 1;
      let logged = 0;
      for (let d = 0; d < 7; d++) {
        const cursor = new Date(now);
        cursor.setDate(now.getDate() - w * 7 - d);
        if (log.entries[toDateString(cursor)]) logged++;
      }
      result.push(Math.round((Math.min(logged, target) / target) * 100));
      continue;
    }

    if (!scheduleIsNonDaily(schedule)) {
      let logged = 0;
      for (let d = 0; d < 7; d++) {
        const cursor = new Date(now);
        cursor.setDate(now.getDate() - w * 7 - d);
        if (log.entries[toDateString(cursor)]) logged++;
      }
      result.push(Math.round((logged / 7) * 100));
      continue;
    }

    let due = 0;
    let hit = 0;

    for (let d = 0; d < 7; d++) {
      const cursor = new Date(now);
      cursor.setDate(now.getDate() - w * 7 - d);
      const ds = toDateString(cursor);
      if (!isDueDateStr(schedule, log.createdAt, ds)) continue;
      due++;
      if (log.entries[ds]) hit++;
    }

    result.push(due === 0 ? 100 : Math.round((hit / due) * 100));
  }

  return result;
};
