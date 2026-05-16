// src/hooks/use-logs-store.ts
// Central data hook — manages all log CRUD and persistence via localStorage.
// Interface is designed to be swapped for Supabase without changing call sites.

import { useState, useEffect, useCallback } from 'react';
import type { Log } from '../types';
import { createClientUuid } from '../utils/id';

const STORAGE_KEY = 'logd-logs';

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
  const [logs, setLogs] = useState<Log[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(logs);
  }, [logs]);

  const addLog = useCallback(
    (data: Pick<Log, 'name' | 'icon' | 'color'>) => {
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
    [],
  );

  const updateLog = useCallback(
    (id: string, updates: Partial<Pick<Log, 'name' | 'icon' | 'color'>>) => {
      setLogs((prev) =>
        prev.map((log) => (log.id === id ? { ...log, ...updates } : log)),
      );
    },
    [],
  );

  const deleteLog = useCallback((id: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== id));
  }, []);

  const archiveLog = useCallback((id: string, archived: boolean) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, archived } : log)),
    );
  }, []);

  const toggleEntry = useCallback((logId: string, date: string) => {
    setLogs((prev) =>
      prev.map((log) => {
        if (log.id !== logId) return log;
        const current = !!log.entries[date];
        const entries = { ...log.entries };
        if (current) {
          delete entries[date];
        } else {
          entries[date] = true;
        }
        return { ...log, entries };
      }),
    );
    // Subtle haptic feedback on supported devices
    if ('vibrate' in navigator) navigator.vibrate(10);
  }, []);

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
  };
};
