// src/constants/schedule.ts
// Shared schedule labels and weekday ordering (Mon-first chips, JS getDay weekday values).

import type { LogSchedule, RecurrenceRule } from '../types';

/** JS weekday: Sun=0 … Sat=6 — matches Date.prototype.getDay() */
export type JsWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Chips left → right: Monday … Sunday columns (same heat map header order). */
export const WEEKDAY_CHIP_ORDER: readonly JsWeekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Short letters for-chip row (Tue / Thu share "T"). */
export const WEEKDAY_CHIP_LABELS: readonly string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Mon-first pills for add-log weekly picker. */
export const WEEKDAY_PILL_OPTIONS: readonly { js: JsWeekday; label: string }[] = [
  { js: 1, label: 'Mon' },
  { js: 2, label: 'Tue' },
  { js: 3, label: 'Wed' },
  { js: 4, label: 'Thu' },
  { js: 5, label: 'Fri' },
  { js: 6, label: 'Sat' },
  { js: 0, label: 'Sun' },
];

/** Full names for interval day dropdowns. */
export const WEEKDAY_SELECT_OPTIONS: readonly { js: JsWeekday; label: string }[] = [
  { js: 0, label: 'Sunday' },
  { js: 1, label: 'Monday' },
  { js: 2, label: 'Tuesday' },
  { js: 3, label: 'Wednesday' },
  { js: 4, label: 'Thursday' },
  { js: 5, label: 'Friday' },
  { js: 6, label: 'Saturday' },
];

export type IntervalPeriodKey = 'weekly-1' | 'weekly-2' | 'weekly-3' | 'weekly-4' | 'monthly';

export interface IntervalRuleDraft {
  periodKey: IntervalPeriodKey;
  weekday: JsWeekday;
}

export const INTERVAL_PERIOD_OPTIONS: readonly {
  key: IntervalPeriodKey;
  label: string;
}[] = [
  { key: 'weekly-1', label: 'Every week' },
  { key: 'weekly-2', label: 'Every other week' },
  { key: 'weekly-3', label: 'Every 3 weeks' },
  { key: 'weekly-4', label: 'Every 4 weeks' },
  { key: 'monthly', label: 'Every month' },
];

const DOW_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const parseIntervalPeriodKey = (
  key: IntervalPeriodKey,
): Pick<RecurrenceRule, 'cadence' | 'strideWeeks'> => {
  switch (key) {
    case 'weekly-1':
      return { cadence: 'weekly', strideWeeks: 1 };
    case 'weekly-2':
      return { cadence: 'weekly', strideWeeks: 2 };
    case 'weekly-3':
      return { cadence: 'weekly', strideWeeks: 3 };
    case 'weekly-4':
      return { cadence: 'weekly', strideWeeks: 4 };
    case 'monthly':
      return { cadence: 'monthly' };
  }
};

const sortedUniqueWeekdays = (days: number[]): number[] =>
  [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);

/** Turn interval-tab rows into a persisted `LogSchedule`. */
export function buildScheduleFromIntervalRules(rules: IntervalRuleDraft[]): LogSchedule {
  if (rules.length === 0) {
    return { cadence: 'weekly', weekdays: [6], strideWeeks: 2 };
  }

  const parsed: RecurrenceRule[] = rules.map((r) => ({
    weekday: r.weekday,
    ...parseIntervalPeriodKey(r.periodKey),
  }));

  const allWeekly = parsed.every((r) => r.cadence === 'weekly');
  const allMonthly = parsed.every((r) => r.cadence === 'monthly');

  if (allWeekly) {
    const strides = new Set(parsed.map((r) => r.strideWeeks ?? 1));
    if (strides.size === 1) {
      const stride = [...strides][0];
      const weekdays = sortedUniqueWeekdays(parsed.map((r) => r.weekday));
      if (stride <= 1) return { cadence: 'weekly', weekdays };
      return { cadence: 'weekly', weekdays, strideWeeks: stride };
    }
  }

  if (allMonthly) {
    return {
      cadence: 'monthly',
      weekdays: sortedUniqueWeekdays(parsed.map((r) => r.weekday)),
    };
  }

  return {
    cadence: 'weekly',
    weekdays: [],
    recurrenceRules: parsed,
  };
}

export const defaultIntervalRule = (): IntervalRuleDraft => ({
  periodKey: 'weekly-2',
  weekday: 6,
});

export const intervalRuleKey = (rule: IntervalRuleDraft): string =>
  `${rule.periodKey}:${rule.weekday}`;

/** First period+weekday combo not already in `existing`, or null if all taken. */
export const nextDistinctIntervalRule = (
  existing: readonly IntervalRuleDraft[],
): IntervalRuleDraft | null => {
  const used = new Set(existing.map(intervalRuleKey));
  for (const { key: periodKey } of INTERVAL_PERIOD_OPTIONS) {
    for (const { js: weekday } of WEEKDAY_SELECT_OPTIONS) {
      const candidate: IntervalRuleDraft = { periodKey, weekday };
      if (!used.has(intervalRuleKey(candidate))) return candidate;
    }
  }
  return null;
};

export const formatIntervalRuleLine = (rule: IntervalRuleDraft): string => {
  const period = INTERVAL_PERIOD_OPTIONS.find((o) => o.key === rule.periodKey)?.label ?? '';
  return `${period} on ${DOW_FULL[rule.weekday]}`;
};
