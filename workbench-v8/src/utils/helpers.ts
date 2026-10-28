// ============================================================
// Personal Workbench V8 — Utility Helpers
// ============================================================

/** Generate a unique ID (crypto-based with fallback) */
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
}

/** Format a Date object to yyyy-MM-dd */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Check if a date string (yyyy-MM-dd) is today */
export function isToday(date: string): boolean {
  return date === formatDate(new Date())
}

/** Absolute timestamp → local business day. Date-only fields must not use this. */
export function timestampDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : formatDate(date)
}

/** Return a Chinese greeting based on the current hour */
export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/** Difference in days between two date strings (yyyy-MM-dd) */
export function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
}

/** Deep clone an object via structuredClone with JSON fallback */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj)
  }
  return JSON.parse(JSON.stringify(obj))
}
