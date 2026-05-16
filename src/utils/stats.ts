// src/utils/stats.ts
// Streak and consistency calculations for logs.

import type { Log } from '../types';
import { today, toDateString } from './date';

/** Number of consecutive days logged ending at or before today. */
export const getCurrentStreak = (log: Log): number => {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // If today isn't logged yet, start checking from yesterday
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
};

/** The longest consecutive run of logged days ever. */
export const getLongestStreak = (log: Log): number => {
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
};

/** Total number of days logged. */
export const getTotalLogged = (log: Log): number =>
  Object.values(log.entries).filter(Boolean).length;

/**
 * Percentage of days logged since the log was created.
 * Returns 0–100 rounded to the nearest integer.
 */
export const getConsistency = (log: Log): number => {
  const created = new Date(log.createdAt);
  created.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.round((now.getTime() - created.getTime()) / 86_400_000) + 1);
  const logged = getTotalLogged(log);

  return Math.round((logged / totalDays) * 100);
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
 * Returns weekly consistency (0–100) for a single log over the last N weeks.
 * Used for the consistency line chart.
 */
export const getWeeklyConsistency = (log: Log, weeks: number): number[] => {
  const result: number[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let w = weeks - 1; w >= 0; w--) {
    let logged = 0;
    for (let d = 0; d < 7; d++) {
      const cursor = new Date(now);
      cursor.setDate(now.getDate() - w * 7 - d);
      if (log.entries[toDateString(cursor)]) logged++;
    }
    result.push(Math.round((logged / 7) * 100));
  }

  return result;
};
