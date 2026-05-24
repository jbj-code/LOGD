// src/services/log-entries-cache.ts
// IndexedDB snapshot for instant repeat loads when using Supabase.

import {
  LOGS_CACHE_DB_NAME,
  LOGS_CACHE_DB_VERSION,
  LOGS_CACHE_KEY,
  LOGS_CACHE_STORE,
} from '../constants/logs-sync';
import type { Log } from '../types';

interface LogsCacheSnapshot {
  logs: Log[];
  savedAt: string;
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOGS_CACHE_DB_NAME, LOGS_CACHE_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOGS_CACHE_STORE)) {
        db.createObjectStore(LOGS_CACHE_STORE);
      }
    };
  });
}

export async function readLogsCache(): Promise<Log[] | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openCacheDb();
    return await new Promise<Log[] | null>((resolve, reject) => {
      const tx = db.transaction(LOGS_CACHE_STORE, 'readonly');
      const store = tx.objectStore(LOGS_CACHE_STORE);
      const request = store.get(LOGS_CACHE_KEY);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
      request.onsuccess = () => {
        const snapshot = request.result as LogsCacheSnapshot | undefined;
        resolve(snapshot?.logs ?? null);
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('[log-entries-cache] read failed', err);
    return null;
  }
}

export async function writeLogsCache(logs: Log[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOGS_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(LOGS_CACHE_STORE);
      const snapshot: LogsCacheSnapshot = { logs, savedAt: new Date().toISOString() };
      const request = store.put(snapshot, LOGS_CACHE_KEY);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'));
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
  } catch (err) {
    console.warn('[log-entries-cache] write failed', err);
  }
}

export async function clearLogsCache(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LOGS_CACHE_STORE, 'readwrite');
      tx.objectStore(LOGS_CACHE_STORE).delete(LOGS_CACHE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
    });
  } catch (err) {
    console.warn('[log-entries-cache] clear failed', err);
  }
}
