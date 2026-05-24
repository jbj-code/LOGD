// src/utils/log-entries.ts
// Merge sparse log_entries rows into in-memory Log objects.

import type { Log } from '../types';
import { normalizeSchedule } from './schedule';

export interface DbLogRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  archived: boolean;
  created_at: string;
  notes?: string | null;
  schedule_json?: unknown | null;
  sort_order?: number | null;
}

export interface DbEntryRow {
  log_id: string;
  logged_date: string;
}

export const normalizeEntryDate = (value: string): string => value.slice(0, 10);

export const entriesMapFromRows = (rows: DbEntryRow[]): Map<string, Record<string, boolean>> => {
  const map = new Map<string, Record<string, boolean>>();
  for (const row of rows) {
    const date = normalizeEntryDate(row.logged_date);
    const prev = map.get(row.log_id);
    if (prev) {
      prev[date] = true;
    } else {
      map.set(row.log_id, { [date]: true });
    }
  }
  return map;
};

export const buildLogsFromRows = (
  logRows: DbLogRow[],
  entryRows: DbEntryRow[],
  entryTotals: Record<string, number> = {},
): Log[] => {
  const entriesByLog = entriesMapFromRows(entryRows);
  return logRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    archived: row.archived,
    createdAt: row.created_at,
    notes: row.notes ?? '',
    schedule: normalizeSchedule(row.schedule_json),
    entries: entriesByLog.get(row.id) ?? {},
    totalEntries: entryTotals[row.id],
    sortOrder: row.sort_order ?? undefined,
  }));
};

export const mergeEntryRowsIntoLogs = (logs: Log[], rows: DbEntryRow[]): Log[] => {
  if (rows.length === 0) return logs;
  const additions = entriesMapFromRows(rows);
  let changed = false;
  const next = logs.map((log) => {
    const added = additions.get(log.id);
    if (!added) return log;
    changed = true;
    return { ...log, entries: { ...log.entries, ...added } };
  });
  return changed ? next : logs;
};

export const applyEntryTotals = (
  logs: Log[],
  entryTotals: Record<string, number>,
): Log[] => {
  if (Object.keys(entryTotals).length === 0) return logs;
  return logs.map((log) => {
    const total = entryTotals[log.id];
    if (total === undefined || log.totalEntries === total) return log;
    return { ...log, totalEntries: total };
  });
};

export const patchLogEntry = (
  log: Log,
  date: string,
  checked: boolean,
): Log => {
  const entries = { ...log.entries };
  if (checked) entries[date] = true;
  else delete entries[date];

  const prevTotal =
    typeof log.totalEntries === 'number'
      ? log.totalEntries
      : Object.values(log.entries).filter(Boolean).length;
  const nextTotal = Math.max(0, prevTotal + (checked ? 1 : -1));

  return { ...log, entries, totalEntries: nextTotal };
};
