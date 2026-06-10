// src/hooks/use-logs-store.ts
// Logs persistence: Supabase (tiered sync + IndexedDB cache) or localStorage.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Log, LogSchedule } from '../types';
import { normalizeSchedule } from '../utils/schedule';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { createClientUuid } from '../utils/id';
import { monthDateRange } from '../utils/date';
import {
  buildLogsFromRows,
  mergeEntryRowsIntoLogs,
  normalizeEntryDate,
  patchLogEntry,
  type DbEntryRow,
  type DbLogRow,
} from '../utils/log-entries';
import {
  fetchEntryRowsBefore,
  fetchEntryRowsForLog,
  fetchEntryRowsForRange,
  fetchInitialRemotePayload,
  type EntriesLoadPhase,
} from '../services/logs-remote';
import { clearLogsCache, readLogsCache, writeLogsCache } from '../services/log-entries-cache';
import { nextSortOrder, sortLogsByOrder, withDefaultSortOrders } from '../utils/log-sort';

const STORAGE_KEY = 'LOGD-logs';

const entryToggleKey = (logId: string, date: string): string => `${logId}:${date}`;

const loadFromStorage = (): Log[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Log[];
    return parsed.map((l) => ({
      ...l,
      notes: typeof l.notes === 'string' ? l.notes : '',
      schedule: normalizeSchedule((l as { schedule?: unknown }).schedule),
    }));
  } catch {
    return [];
  }
};

const normalizeLoadedLogs = (logs: Log[]): Log[] => withDefaultSortOrders(logs);

const saveToStorage = (logs: Log[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('[useLogsStore] Failed to save logs to localStorage', err);
  }
};

export const useLogsStore = () => {
  const usesSupabase = isSupabaseConfigured();

  const [logs, setLogs] = useState<Log[]>(() =>
    usesSupabase ? [] : normalizeLoadedLogs(loadFromStorage()),
  );
  const [logsLoading, setLogsLoading] = useState(usesSupabase);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [entriesLoadPhase, setEntriesLoadPhase] = useState<EntriesLoadPhase>(
    usesSupabase ? 'none' : 'full',
  );

  const entriesLoadPhaseRef = useRef<EntriesLoadPhase>(usesSupabase ? 'none' : 'full');
  const backfillPromiseRef = useRef<Promise<void> | null>(null);
  const fullLogIdsRef = useRef<Set<string>>(new Set());
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const syncGenerationRef = useRef(0);
  const pendingTogglesRef = useRef<Set<string>>(new Set());

  const mergeRowsIntoLogs = useCallback((logs: Log[], rows: DbEntryRow[]): Log[] => {
    const pending = pendingTogglesRef.current;
    if (pending.size === 0) return mergeEntryRowsIntoLogs(logs, rows);

    const filtered = rows.filter((row) => {
      const date = normalizeEntryDate(row.logged_date);
      return !pending.has(entryToggleKey(row.log_id, date));
    });
    return mergeEntryRowsIntoLogs(logs, filtered);
  }, []);

  const persistCache = useCallback(
    (nextLogs: Log[]) => {
      if (!usesSupabase) return;
      void writeLogsCache(nextLogs);
    },
    [usesSupabase],
  );

  const runBackfill = useCallback(
    (recentSince: string, generation: number) => {
      if (backfillPromiseRef.current) return backfillPromiseRef.current;

      backfillPromiseRef.current = (async () => {
        try {
          const olderRows = await fetchEntryRowsBefore(recentSince);
          if (syncGenerationRef.current !== generation) return;

          setLogs((prev) => {
            const merged = mergeRowsIntoLogs(prev, olderRows);
            persistCache(merged);
            return merged;
          });
          entriesLoadPhaseRef.current = 'full';
          setEntriesLoadPhase('full');
        } catch (err) {
          console.error('[useLogsStore] Entry backfill failed', err);
        } finally {
          backfillPromiseRef.current = null;
        }
      })();

      return backfillPromiseRef.current;
    },
    [mergeRowsIntoLogs, persistCache],
  );

  const syncFromRemote = useCallback(async () => {
    if (!usesSupabase) return;

    const generation = ++syncGenerationRef.current;
    fullLogIdsRef.current.clear();
    loadedMonthsRef.current.clear();
    backfillPromiseRef.current = null;
    entriesLoadPhaseRef.current = 'none';
    setEntriesLoadPhase('none');
    setLogsLoading(true);
    setLogsError(null);

    const cached = await readLogsCache();
    if (cached && cached.length > 0 && syncGenerationRef.current === generation) {
      setLogs(normalizeLoadedLogs(cached));
      setLogsLoading(false);
    }

    try {
      const { logRows, recentEntries, entryTotals, recentSince } = await fetchInitialRemotePayload();
      if (syncGenerationRef.current !== generation) return;

      const built = normalizeLoadedLogs(buildLogsFromRows(logRows, recentEntries, entryTotals));
      setLogs(built);
      setLogsError(null);
      setLogsLoading(false);
      entriesLoadPhaseRef.current = 'recent';
      setEntriesLoadPhase('recent');
      persistCache(built);
      void runBackfill(recentSince, generation);
    } catch (err) {
      if (syncGenerationRef.current !== generation) return;
      console.error('[useLogsStore] Initial sync failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to load logs';
      setLogsError(msg);
      setLogsLoading(false);
    }
  }, [usesSupabase, persistCache, runBackfill]);

  useEffect(() => {
    if (!usesSupabase) return;
    queueMicrotask(() => void syncFromRemote());
  }, [usesSupabase, syncFromRemote]);

  useEffect(() => {
    if (usesSupabase) return;
    saveToStorage(logs);
  }, [logs, usesSupabase]);

  const ensureAllEntriesLoaded = useCallback(async () => {
    if (!usesSupabase || entriesLoadPhaseRef.current === 'full') return;
    if (backfillPromiseRef.current) {
      await backfillPromiseRef.current;
    }
  }, [usesSupabase]);

  const ensureLogEntriesFullyLoaded = useCallback(
    async (logId: string) => {
      if (!usesSupabase) return;
      await ensureAllEntriesLoaded();
      if (entriesLoadPhaseRef.current === 'full' || fullLogIdsRef.current.has(logId)) return;

      try {
        const rows = await fetchEntryRowsForLog(logId);
        fullLogIdsRef.current.add(logId);
        setLogs((prev) => {
          const merged = mergeRowsIntoLogs(prev, rows);
          persistCache(merged);
          return merged;
        });
      } catch (err) {
        console.error('[useLogsStore] ensureLogEntriesFullyLoaded', err);
      }
    },
    [usesSupabase, ensureAllEntriesLoaded, mergeRowsIntoLogs, persistCache],
  );

  const ensureEntriesForMonth = useCallback(
    async (year: number, monthIndex: number) => {
      if (!usesSupabase) return;
      await ensureAllEntriesLoaded();
      if (entriesLoadPhaseRef.current === 'full') return;

      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      if (loadedMonthsRef.current.has(key)) return;

      const { start, end } = monthDateRange(year, monthIndex);
      try {
        const rows = await fetchEntryRowsForRange(start, end);
        loadedMonthsRef.current.add(key);
        setLogs((prev) => {
          const merged = mergeRowsIntoLogs(prev, rows);
          persistCache(merged);
          return merged;
        });
      } catch (err) {
        console.error('[useLogsStore] ensureEntriesForMonth', err);
      }
    },
    [usesSupabase, ensureAllEntriesLoaded, mergeRowsIntoLogs, persistCache],
  );

  const addLog = useCallback(
    async (data: Pick<Log, 'name' | 'icon' | 'color'> & { schedule: LogSchedule }) => {
      const schedule = normalizeSchedule(data.schedule);
      const sortOrder = nextSortOrder(logs);

      if (usesSupabase) {
        const sb = getSupabaseClient();
        const { data: row, error } = await sb
          .from('logs')
          .insert({
            name: data.name,
            icon: data.icon,
            color: data.color,
            notes: '',
            schedule_json: schedule,
            sort_order: sortOrder,
          })
          .select()
          .single();
        if (error) {
          console.error('[useLogsStore] addLog', error);
          return;
        }
        const r = row as DbLogRow;
        const newLog: Log = {
          id: r.id,
          name: r.name,
          icon: r.icon,
          color: r.color,
          entries: {},
          createdAt: r.created_at,
          archived: r.archived,
          notes: r.notes ?? '',
          schedule: normalizeSchedule(r.schedule_json),
          totalEntries: 0,
          sortOrder: r.sort_order ?? sortOrder,
        };
        setLogs((prev) => {
          const next = sortLogsByOrder([...prev, newLog]);
          persistCache(next);
          return next;
        });
        return;
      }

      const newLog: Log = {
        id: createClientUuid(),
        name: data.name,
        icon: data.icon,
        color: data.color,
        entries: {},
        createdAt: new Date().toISOString(),
        archived: false,
        notes: '',
        schedule,
        totalEntries: 0,
        sortOrder: 0,
      };
      setLogs((prev) => {
        const withOrder = { ...newLog, sortOrder: nextSortOrder(prev) };
        return sortLogsByOrder([...prev, withOrder]);
      });
    },
    [usesSupabase, persistCache, logs],
  );

  const updateLog = useCallback(
    async (id: string, updates: Partial<Pick<Log, 'name' | 'icon' | 'color' | 'notes'>>) => {
      if (usesSupabase) {
        const patch: Partial<{ name: string; icon: string; color: string; notes: string }> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.icon !== undefined) patch.icon = updates.icon;
        if (updates.color !== undefined) patch.color = updates.color;
        if (updates.notes !== undefined) patch.notes = updates.notes;
        if (Object.keys(patch).length === 0) return;

        const sb = getSupabaseClient();
        const { error } = await sb.from('logs').update(patch).eq('id', id);
        if (error) {
          console.error('[useLogsStore] updateLog', error);
          return;
        }
      }

      setLogs((prev) => {
        const next = prev.map((log) => (log.id === id ? { ...log, ...updates } : log));
        if (usesSupabase) persistCache(next);
        return next;
      });
    },
    [usesSupabase, persistCache],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      if (usesSupabase) {
        const sb = getSupabaseClient();
        const { error } = await sb.from('logs').delete().eq('id', id);
        if (error) {
          console.error('[useLogsStore] deleteLog', error);
          return;
        }
        fullLogIdsRef.current.delete(id);
      }
      setLogs((prev) => {
        const next = prev.filter((log) => log.id !== id);
        if (usesSupabase) persistCache(next);
        return next;
      });
    },
    [usesSupabase, persistCache],
  );

  const archiveLog = useCallback(
    async (id: string, archived: boolean) => {
      if (usesSupabase) {
        const sb = getSupabaseClient();
        const { error } = await sb.from('logs').update({ archived }).eq('id', id);
        if (error) {
          console.error('[useLogsStore] archiveLog', error);
          return;
        }
      }
      setLogs((prev) => {
        const next = prev.map((log) => (log.id === id ? { ...log, archived } : log));
        if (usesSupabase) persistCache(next);
        return next;
      });
    },
    [usesSupabase, persistCache],
  );

  const toggleEntry = useCallback(
    async (logId: string, date: string) => {
      if (!usesSupabase) {
        setLogs((prev) =>
          prev.map((log) => {
            if (log.id !== logId) return log;
            const checked = !!log.entries[date];
            return patchLogEntry(log, date, !checked);
          }),
        );
        if ('vibrate' in navigator) navigator.vibrate(10);
        return;
      }

      let currentlyChecked = false;
      setLogs((prev) => {
        const match = prev.find((l) => l.id === logId);
        currentlyChecked = !!match?.entries[date];
        return prev;
      });

      const toggleKey = entryToggleKey(logId, date);
      pendingTogglesRef.current.add(toggleKey);
      const sb = getSupabaseClient();

      try {
        if (currentlyChecked) {
          const { data, error } = await sb
            .from('log_entries')
            .delete()
            .eq('log_id', logId)
            .eq('logged_date', date)
            .select('log_id');
          if (error) throw error;
          if (!data?.length) {
            throw new Error(
              'Delete matched no rows — run supabase/schema.sql grants (anon needs DELETE on log_entries)',
            );
          }
        } else {
          const { error } = await sb.from('log_entries').insert({ log_id: logId, logged_date: date });
          if (error) throw error;
        }

        setLogs((prev) => {
          const next = prev.map((l) =>
            l.id !== logId ? l : patchLogEntry(l, date, !currentlyChecked),
          );
          persistCache(next);
          return next;
        });
        if ('vibrate' in navigator) navigator.vibrate(10);
      } catch (err) {
        console.error('[useLogsStore] toggleEntry', err);
        await syncFromRemote();
      } finally {
        pendingTogglesRef.current.delete(toggleKey);
      }
    },
    [usesSupabase, syncFromRemote, persistCache],
  );

  const getLog = useCallback(
    (id: string): Log | undefined => logs.find((l) => l.id === id),
    [logs],
  );

  const reorderActiveLogs = useCallback(
    async (orderedIds: string[]) => {
      const orderMap = new Map(orderedIds.map((id, index) => [id, index]));

      setLogs((prev) => {
        const next = sortLogsByOrder(
          prev.map((log) => {
            if (log.archived) return log;
            const order = orderMap.get(log.id);
            if (order === undefined) return log;
            return { ...log, sortOrder: order };
          }),
        );
        if (!usesSupabase) saveToStorage(next);
        else persistCache(next);
        return next;
      });

      if (!usesSupabase) return;

      const sb = getSupabaseClient();
      const results = await Promise.all(
        orderedIds.map((id, index) => sb.from('logs').update({ sort_order: index }).eq('id', id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error('[useLogsStore] reorderActiveLogs', failed.error);
        await syncFromRemote();
      }
    },
    [usesSupabase, persistCache, syncFromRemote],
  );

  const activeLogs = sortLogsByOrder(logs.filter((l) => !l.archived));
  const archivedLogs = sortLogsByOrder(logs.filter((l) => l.archived));

  return {
    logs,
    activeLogs,
    archivedLogs,
    addLog,
    updateLog,
    deleteLog,
    archiveLog,
    toggleEntry,
    getLog,
    usesSupabase,
    logsLoading,
    logsError,
    entriesLoadPhase,
    refetchLogs: syncFromRemote,
    ensureAllEntriesLoaded,
    ensureLogEntriesFullyLoaded,
    ensureEntriesForMonth,
    reorderActiveLogs,
  };
};

export { clearLogsCache };
