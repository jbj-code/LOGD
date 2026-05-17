// src/hooks/use-logs-store.ts
// Logs persistence: Supabase when env is set, otherwise localStorage.

import { useState, useEffect, useCallback } from 'react';
import type { Log } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { createClientUuid } from '../utils/id';

const STORAGE_KEY = 'LOGD-logs';

interface DbLogRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  archived: boolean;
  created_at: string;
}

interface DbEntryRow {
  log_id: string;
  logged_date: string;
}

const normalizeDate = (value: string) => value.slice(0, 10);

const mergeLogs = (logRows: DbLogRow[], entryRows: DbEntryRow[]): Log[] => {
  const entriesByLog = new Map<string, Record<string, boolean>>();
  for (const row of entryRows) {
    const date = normalizeDate(row.logged_date);
    const prev = entriesByLog.get(row.log_id) ?? {};
    entriesByLog.set(row.log_id, { ...prev, [date]: true });
  }
  return logRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    archived: row.archived,
    createdAt: row.created_at,
    entries: entriesByLog.get(row.id) ?? {},
  }));
};

const fetchRemoteLogs = async (): Promise<Log[]> => {
  const sb = getSupabaseClient();
  const [logsRes, entriesRes] = await Promise.all([
    sb.from('logs').select('*').order('created_at', { ascending: true }),
    sb.from('log_entries').select('log_id, logged_date'),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (entriesRes.error) throw entriesRes.error;
  return mergeLogs(
    (logsRes.data ?? []) as DbLogRow[],
    (entriesRes.data ?? []) as DbEntryRow[],
  );
};

const loadFromStorage = (): Log[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Log[]) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (logs: Log[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('[useLogsStore] Failed to save logs to localStorage', err);
  }
};

export const useLogsStore = () => {
  const usesSupabase = isSupabaseConfigured();

  const [logs, setLogs] = useState<Log[]>(() => (usesSupabase ? [] : loadFromStorage()));
  const [logsLoading, setLogsLoading] = useState(usesSupabase);
  const [logsError, setLogsError] = useState<string | null>(null);

  const refetchLogs = useCallback(async () => {
    if (!usesSupabase) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await fetchRemoteLogs();
      setLogs(data);
    } catch (err) {
      console.error('[useLogsStore] Fetch failed', err);
      const msg = err instanceof Error ? err.message : 'Failed to load logs';
      setLogsError(msg);
    } finally {
      setLogsLoading(false);
    }
  }, [usesSupabase]);

  useEffect(() => {
    if (!usesSupabase) return;
    queueMicrotask(() => void refetchLogs());
  }, [usesSupabase, refetchLogs]);

  useEffect(() => {
    if (usesSupabase) return;
    saveToStorage(logs);
  }, [logs, usesSupabase]);

  const addLog = useCallback(
    async (data: Pick<Log, 'name' | 'icon' | 'color'>) => {
      if (usesSupabase) {
        const sb = getSupabaseClient();
        const { data: row, error } = await sb
          .from('logs')
          .insert({ name: data.name, icon: data.icon, color: data.color })
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
        };
        setLogs((prev) => [...prev, newLog]);
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
      };
      setLogs((prev) => [...prev, newLog]);
    },
    [usesSupabase],
  );

  const updateLog = useCallback(
    async (id: string, updates: Partial<Pick<Log, 'name' | 'icon' | 'color'>>) => {
      if (usesSupabase) {
        const patch: Partial<{ name: string; icon: string; color: string }> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.icon !== undefined) patch.icon = updates.icon;
        if (updates.color !== undefined) patch.color = updates.color;
        if (Object.keys(patch).length === 0) return;

        const sb = getSupabaseClient();
        const { error } = await sb.from('logs').update(patch).eq('id', id);
        if (error) {
          console.error('[useLogsStore] updateLog', error);
          return;
        }
      }

      setLogs((prev) =>
        prev.map((log) => (log.id === id ? { ...log, ...updates } : log)),
      );
    },
    [usesSupabase],
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
      }
      setLogs((prev) => prev.filter((log) => log.id !== id));
    },
    [usesSupabase],
  );

  const archiveLog = useCallback(
    async (id: string, archived: boolean) => {
      if (usesSupabase) {
        const sb = getSupabaseClient();
        const { error } = await sb.from('logs').update({ archived }).eq('id', id);
        if (error) {
          console.error('[useLogsStore] archiveLog', error);
          setLogsError(error.message);
          return;
        }
      }
      setLogs((prev) =>
        prev.map((log) => (log.id === id ? { ...log, archived } : log)),
      );
    },
    [usesSupabase],
  );

  const toggleEntry = useCallback(
    async (logId: string, date: string) => {
      const patchEntries = (log: Log, currentlyChecked: boolean) => {
        const entries = { ...log.entries };
        if (currentlyChecked) delete entries[date];
        else entries[date] = true;
        return entries;
      };

      if (!usesSupabase) {
        setLogs((prev) =>
          prev.map((log) => {
            if (log.id !== logId) return log;
            return {
              ...log,
              entries: patchEntries(log, !!log.entries[date]),
            };
          }),
        );
        if ('vibrate' in navigator) navigator.vibrate(10);
        return;
      }

      const log = logs.find((l) => l.id === logId);
      const currentlyChecked = !!log?.entries[date];
      const sb = getSupabaseClient();

      if (currentlyChecked) {
        const { error } = await sb
          .from('log_entries')
          .delete()
          .eq('log_id', logId)
          .eq('logged_date', date);
        if (error) {
          console.error('[useLogsStore] toggleEntry delete', error);
          await refetchLogs();
          return;
        }
      } else {
        const { error } = await sb.from('log_entries').insert({ log_id: logId, logged_date: date });
        if (error) {
          console.error('[useLogsStore] toggleEntry insert', error);
          await refetchLogs();
          return;
        }
      }

      setLogs((prev) =>
        prev.map((l) => {
          if (l.id !== logId) return l;
          return { ...l, entries: patchEntries(l, currentlyChecked) };
        }),
      );

      if ('vibrate' in navigator) navigator.vibrate(10);
    },
    [usesSupabase, logs, refetchLogs],
  );

  const getLog = useCallback(
    (id: string): Log | undefined => logs.find((l) => l.id === id),
    [logs],
  );

  const activeLogs = logs.filter((l) => !l.archived);
  const archivedLogs = logs.filter((l) => l.archived);

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
    refetchLogs,
  };
};
