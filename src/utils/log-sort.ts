// src/utils/log-sort.ts
// Custom log list ordering (home grid, quick log, stats).

import type { Log } from '../types';

export const compareLogsBySortOrder = (a: Log, b: Log): number => {
  const ao = a.sortOrder;
  const bo = b.sortOrder;
  if (ao != null && bo != null && ao !== bo) return ao - bo;
  if (ao != null && bo == null) return -1;
  if (ao == null && bo != null) return 1;
  return a.createdAt.localeCompare(b.createdAt);
};

export const sortLogsByOrder = (logs: Log[]): Log[] => [...logs].sort(compareLogsBySortOrder);

/** Assign sequential sortOrder when missing (legacy localStorage / pre-migration rows). */
export const withDefaultSortOrders = (logs: Log[]): Log[] => {
  const sorted = sortLogsByOrder(logs);
  return sorted.map((log, index) => ({
    ...log,
    sortOrder: log.sortOrder ?? index,
  }));
};

export const nextSortOrder = (logs: Log[]): number =>
  logs.reduce((max, log) => Math.max(max, log.sortOrder ?? -1), -1) + 1;

export const moveIdInOrder = (ids: string[], fromIndex: number, toIndex: number): string[] => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return ids;
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};
