// src/constants/logs-sync.ts
// Tunables for tiered Supabase entry loading and local cache.

/** Recent window: covers list heat maps, stats charts (28d + 12w), and quick log. */
export const RECENT_ENTRIES_DAYS = 90;

export const LOGS_CACHE_DB_NAME = 'logd-cache';
export const LOGS_CACHE_DB_VERSION = 1;
export const LOGS_CACHE_STORE = 'snapshots';
export const LOGS_CACHE_KEY = 'logs-data';
