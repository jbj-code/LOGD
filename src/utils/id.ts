// src/utils/id.ts
// Client-side IDs for logs; falls back when crypto.randomUUID is unavailable (e.g. non-secure HTTP dev URLs on mobile Safari).

export function createClientUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* secure context or implementation failure */
    }
  }
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
