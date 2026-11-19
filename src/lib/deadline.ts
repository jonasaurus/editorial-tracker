import type { ContentItem } from '@/payload-types'

/**
 * True when the value is a real calendar date in the format `YYYY-MM-DD` (ADR 0007).
 * Rejects timestamps and dates that do not exist, for example `2026-02-30`.
 */
export function isPlainDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** DL-2: the state of a deadline. `done`: the item is published or archived. */
export type DeadlineState = 'none' | 'upcoming' | 'today' | 'overdue' | 'done'

/** DL-4: `short` on cards and in the list, `long` in the dialog. */
export type DeadlineVariant = 'short' | 'long'

/** DL-1: today as `YYYY-MM-DD` in Europe/Copenhagen. */
export function todayInCopenhagen(now: Date = new Date()): string {
  // The en-CA locale writes dates as `YYYY-MM-DD`.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen' }).format(now)
}

/** Adds days to a plain date. UTC math, so daylight saving time has no effect. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** DL-2, DL-3: the state of the item's deadline on `today`. Compares plain dates only. */
export function getDeadlineState(
  item: Pick<ContentItem, 'deadline' | 'status' | 'archived'>,
  today: string,
): DeadlineState {
  if (item.status === 'published' || item.archived === true) return 'done'
  if (!item.deadline) return 'none'
  // Plain `YYYY-MM-DD` strings sort in date order.
  if (item.deadline < today) return 'overdue'
  if (item.deadline === today) return 'today'
  return 'upcoming'
}

/** Own names: `Intl` with en-GB gives "Sept". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SEPARATOR = ' \u00b7 '

/** The number of whole days from `from` to `to`. UTC math on plain dates. */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)
  return Math.round(ms / 86_400_000)
}

/** "24 Nov", or "24 Nov 2026" when `withYear`. */
function formatDate(day: string, withYear: boolean): string {
  const [year, month, date] = day.split('-')
  const text = `${Number(date)} ${MONTHS[Number(month) - 1]}`
  return withYear ? `${text} ${year}` : text
}

/** DL-4: all deadline text (design-system §5). */
export function formatDeadline(
  deadline: string | null | undefined,
  state: DeadlineState,
  today: string,
  variant: DeadlineVariant,
): string {
  if (state === 'none' || !deadline) return 'No deadline'
  // The short form shows the year only when it is not the current year.
  const withYear = variant === 'long' || deadline.slice(0, 4) !== today.slice(0, 4)
  const date = formatDate(deadline, withYear)

  switch (state) {
    case 'today':
      return variant === 'short' ? 'Today' : `Today${SEPARATOR}${date}`
    case 'overdue': {
      const days = daysBetween(deadline, today)
      return `${date}${SEPARATOR}${days} ${days === 1 ? 'day' : 'days'} overdue`
    }
    case 'upcoming':
    case 'done':
      return date
  }
}
