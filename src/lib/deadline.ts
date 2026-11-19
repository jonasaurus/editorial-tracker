/**
 * True when the value is a real calendar date in the format `YYYY-MM-DD` (ADR 0007).
 * Rejects timestamps and dates that do not exist, for example `2026-02-30`.
 */
export function isPlainDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
