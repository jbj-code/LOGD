// src/types/index.ts
// Core TypeScript interfaces and type aliases.

/** nth weekday slot in calendar month (-1 = last). Weekday matches Date.getDay(): Sun = 0. */
export type MonthlyOrdinal = {
  ordinal: 1 | 2 | 3 | 4 | -1;
  weekday: number;
};

/** One row in the interval picker — combined when strides differ. */
export type RecurrenceRule = {
  cadence: 'weekly' | 'monthly';
  weekday: number;
  /** Weekly only — 1 = every week, 2 = every other week, … */
  strideWeeks?: number;
};

/** How often an expected check-in lands on the calendar — drives streaks / consistency / heat map rings. */
export type LogSchedule = {
  cadence: 'daily' | 'weekly' | 'monthly' | 'interval';
  /** For weekly (fixed days) or monthly weekday patterns. Empty when using `timesPerWeek`. */
  weekdays: number[];
  /**
   * Mon–Sun week bands anchored to the log’s creation week (1 = weekly, 2 = every second week, …).
   * Only for fixed-day `weekly`. Legacy `{ cadence: 'biweekly' }` reads as stride 2.
   */
  strideWeeks?: number;
  /** Flexible weekly target — any N days in the Mon–Sun week (no fixed calendar slots). */
  timesPerWeek?: number;
  /** Every N calendar days from creation date (legacy interval cadence). */
  intervalDays?: number;
  /** When set with monthly cadence, due only on these nth weekdays. */
  monthlyOccurrences?: MonthlyOrdinal[];
  /** Multiple rhythm rows (e.g. every other week on Sat & Wed with different strides). */
  recurrenceRules?: RecurrenceRule[];
};

export const DEFAULT_LOG_SCHEDULE: LogSchedule = {
  cadence: 'daily',
  weekdays: [],
};

export interface Log {
  id: string;
  name: string;
  icon: string;                       // Material Symbol name
  color: string;                      // Hex color string
  entries: Record<string, boolean>;   // "YYYY-MM-DD" -> boolean
  createdAt: string;                  // ISO date string
  archived: boolean;
  /** Optional longer description for the log (detail screen). */
  notes: string;
  /** Repeat rhythm for streaks — daily by default when missing from storage. */
  schedule: LogSchedule;
  /** Server-side total when entries are partially loaded; kept in sync on toggle. */
  totalEntries?: number;
  /** Custom list order — lower appears first (top-left in the home grid). */
  sortOrder?: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
}

export type Tab = 'logs' | 'stats' | 'calendar' | 'settings';

export type NavScreen =
  | { tab: 'logs'; view: 'list' }
  | { tab: 'logs'; view: 'detail'; logId: string }
  | { tab: 'stats'; view: 'main' }
  | { tab: 'calendar'; view: 'main' }
  | { tab: 'settings'; view: 'main' | 'archived' };
