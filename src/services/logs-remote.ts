// src/services/logs-remote.ts
// Supabase reads for tiered log + entry loading.

import type { SupabaseClient } from '@supabase/supabase-js';
import { RECENT_ENTRIES_DAYS } from '../constants/logs-sync';
import { getSupabaseClient } from '../lib/supabase';
import { daysAgoDateString } from '../utils/date';
import type { DbEntryRow, DbLogRow } from '../utils/log-entries';

export type EntriesLoadPhase = 'none' | 'recent' | 'full';

/** PostgREST default page size — paginate so large histories load completely. */
const ENTRY_PAGE_SIZE = 1000;

export const recentEntriesSince = (): string => daysAgoDateString(RECENT_ENTRIES_DAYS);

type EntryPageQuery = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: DbEntryRow[] | null;
    error: { message: string } | null;
  }>;
};

async function fetchAllEntryPages(
  buildQuery: (sb: SupabaseClient) => EntryPageQuery,
): Promise<DbEntryRow[]> {
  const all: DbEntryRow[] = [];
  let offset = 0;

  while (true) {
    const sb = getSupabaseClient();
    const { data, error } = await buildQuery(sb).range(offset, offset + ENTRY_PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data ?? []) as DbEntryRow[];
    all.push(...rows);
    if (rows.length < ENTRY_PAGE_SIZE) break;
    offset += ENTRY_PAGE_SIZE;
  }

  return all;
}

export async function fetchLogRows(): Promise<DbLogRow[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('logs')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbLogRow[];
}

export async function fetchRecentEntryRows(): Promise<DbEntryRow[]> {
  return fetchEntryRowsSince(recentEntriesSince());
}

export async function fetchEntryRowsSince(fromDate: string): Promise<DbEntryRow[]> {
  return fetchAllEntryPages((sb) =>
    sb
      .from('log_entries')
      .select('log_id, logged_date')
      .gte('logged_date', fromDate)
      .order('logged_date', { ascending: true }),
  );
}

export async function fetchEntryRowsBefore(beforeDate: string): Promise<DbEntryRow[]> {
  return fetchAllEntryPages((sb) =>
    sb
      .from('log_entries')
      .select('log_id, logged_date')
      .lt('logged_date', beforeDate)
      .order('logged_date', { ascending: true }),
  );
}

export async function fetchEntryRowsForLog(logId: string): Promise<DbEntryRow[]> {
  return fetchAllEntryPages((sb) =>
    sb
      .from('log_entries')
      .select('log_id, logged_date')
      .eq('log_id', logId)
      .order('logged_date', { ascending: true }),
  );
}

export async function fetchEntryRowsForRange(
  startDate: string,
  endDate: string,
): Promise<DbEntryRow[]> {
  return fetchAllEntryPages((sb) =>
    sb
      .from('log_entries')
      .select('log_id, logged_date')
      .gte('logged_date', startDate)
      .lte('logged_date', endDate)
      .order('logged_date', { ascending: true }),
  );
}

/** Per-log check-in counts without loading every entry row. */
export async function fetchEntryTotals(): Promise<Record<string, number>> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('log_entry_totals').select('log_id, total');
  if (error) {
    console.warn('[logs-remote] log_entry_totals unavailable — run supabase/schema.sql', error.message);
    return {};
  }
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as { log_id: string; total: number };
    totals[r.log_id] = r.total;
  }
  return totals;
}

export interface InitialRemotePayload {
  logRows: DbLogRow[];
  recentEntries: DbEntryRow[];
  entryTotals: Record<string, number>;
  recentSince: string;
}

export async function fetchInitialRemotePayload(): Promise<InitialRemotePayload> {
  const recentSince = recentEntriesSince();
  const [logRows, recentEntries, entryTotals] = await Promise.all([
    fetchLogRows(),
    fetchEntryRowsSince(recentSince),
    fetchEntryTotals(),
  ]);
  return { logRows, recentEntries, entryTotals, recentSince };
}
