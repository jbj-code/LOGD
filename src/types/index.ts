// src/types/index.ts
// Core TypeScript interfaces and type aliases.

export interface Log {
  id: string;
  name: string;
  icon: string;                       // Material Symbol name
  color: string;                      // Hex color string
  entries: Record<string, boolean>;   // "YYYY-MM-DD" -> boolean
  createdAt: string;                  // ISO date string
  archived: boolean;
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
  | { tab: 'settings'; view: 'main' };
