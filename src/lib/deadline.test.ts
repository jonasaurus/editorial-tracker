import { describe, expect, it } from 'vitest'

import {
  addDays,
  formatDeadline,
  getDeadlineState,
  isPlainDate,
  todayInCopenhagen,
} from './deadline'

describe('isPlainDate', () => {
  it.each(['2026-11-20', '2024-02-29', '2026-12-31', '2027-01-01'])('accepts %s', (value) => {
    expect(isPlainDate(value)).toBe(true)
  })

  it.each([
    ['a timestamp', '2026-11-20T00:00:00.000Z'],
    ['a day that does not exist', '2026-02-30'],
    ['February 29 in a year that is not a leap year', '2026-02-29'],
    ['month 13', '2026-13-01'],
    ['no leading zeros', '2026-1-5'],
    ['another format', '20/11/2026'],
    ['an empty string', ''],
  ])('rejects %s', (_name, value) => {
    expect(isPlainDate(value)).toBe(false)
  })
})

describe('todayInCopenhagen', () => {
  it.each([
    ['winter time (UTC+1), late evening UTC', '2026-11-18T23:30:00.000Z', '2026-11-19'],
    [
      'winter time (UTC+1), before midnight in Copenhagen',
      '2026-11-18T22:59:59.000Z',
      '2026-11-18',
    ],
    ['summer time (UTC+2), late evening UTC', '2026-07-01T22:30:00.000Z', '2026-07-02'],
    [
      'summer time (UTC+2), before midnight in Copenhagen',
      '2026-07-01T21:59:59.000Z',
      '2026-07-01',
    ],
    ['the spring change day, just after midnight', '2026-03-28T23:00:00.000Z', '2026-03-29'],
    ['the spring change day, just before midnight', '2026-03-29T21:59:59.000Z', '2026-03-29'],
    ['the day after the spring change, at midnight', '2026-03-29T22:00:00.000Z', '2026-03-30'],
    ['the autumn change day, just after midnight', '2026-10-24T22:00:00.000Z', '2026-10-25'],
    ['the autumn change day, just before midnight', '2026-10-25T22:59:59.000Z', '2026-10-25'],
    ['the day after the autumn change, at midnight', '2026-10-25T23:00:00.000Z', '2026-10-26'],
    ["New Year's Eve, late evening UTC", '2026-12-31T23:30:00.000Z', '2027-01-01'],
  ])('gives the Copenhagen date in %s', (_name, now, expected) => {
    expect(todayInCopenhagen(new Date(now))).toBe(expected)
  })

  it('gives a plain date for the current time', () => {
    expect(isPlainDate(todayInCopenhagen())).toBe(true)
  })
})

describe('addDays', () => {
  it.each([
    ['2026-11-19', 0, '2026-11-19'],
    ['2026-11-19', 1, '2026-11-20'],
    ['2026-11-30', 1, '2026-12-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-03-01', -1, '2024-02-29'],
    ['2026-03-28', 2, '2026-03-30'],
    ['2026-10-24', 2, '2026-10-26'],
    ['2026-11-19', -30, '2026-10-20'],
    ['2026-11-19', 365, '2027-11-19'],
  ])('%s + %i days = %s', (day, days, expected) => {
    expect(addDays(day, days)).toBe(expected)
  })
})

describe('getDeadlineState', () => {
  const today = '2026-11-19'

  it.each([
    ['no deadline', { deadline: null, status: 'draft', archived: false }, 'none'],
    ['an undefined deadline', { deadline: undefined, status: 'idea' }, 'none'],
    ['an empty deadline', { deadline: '', status: 'idea', archived: null }, 'none'],
    ['a past deadline', { deadline: '2026-11-18', status: 'review', archived: false }, 'overdue'],
    ['a deadline last year', { deadline: '2025-12-31', status: 'draft' }, 'overdue'],
    ["today's deadline", { deadline: '2026-11-19', status: 'draft', archived: false }, 'today'],
    ['a future deadline', { deadline: '2026-11-20', status: 'idea', archived: false }, 'upcoming'],
    ['a deadline next year', { deadline: '2027-01-01', status: 'idea' }, 'upcoming'],
    ['a published item', { deadline: '2026-11-01', status: 'published', archived: false }, 'done'],
    ['an archived item', { deadline: '2026-11-01', status: 'draft', archived: true }, 'done'],
    [
      'an archived item with a future deadline',
      { deadline: '2026-12-01', status: 'idea', archived: true },
      'done',
    ],
    ['a published item with no deadline', { deadline: null, status: 'published' }, 'done'],
    [
      'an archived item with no deadline',
      { deadline: null, status: 'idea', archived: true },
      'done',
    ],
  ] as const)('gives the state for %s', (_name, item, expected) => {
    expect(getDeadlineState(item, today)).toBe(expected)
  })
})

describe('formatDeadline', () => {
  const today = '2026-11-19'

  it.each([
    // Upcoming
    ['2026-11-24', 'upcoming', 'short', '24 Nov'],
    ['2026-11-24', 'upcoming', 'long', '24 Nov 2026'],
    ['2026-12-05', 'upcoming', 'short', '5 Dec'],
    ['2027-01-08', 'upcoming', 'short', '8 Jan 2027'],
    ['2027-01-08', 'upcoming', 'long', '8 Jan 2027'],
    ['2026-09-03', 'upcoming', 'short', '3 Sep'],
    // Today
    ['2026-11-19', 'today', 'short', 'Today'],
    ['2026-11-19', 'today', 'long', 'Today · 19 Nov 2026'],
    // Overdue
    ['2026-11-17', 'overdue', 'short', '17 Nov · 2 days overdue'],
    ['2026-11-17', 'overdue', 'long', '17 Nov 2026 · 2 days overdue'],
    ['2026-11-18', 'overdue', 'short', '18 Nov · 1 day overdue'],
    ['2026-11-18', 'overdue', 'long', '18 Nov 2026 · 1 day overdue'],
    ['2025-12-31', 'overdue', 'short', '31 Dec 2025 · 323 days overdue'],
    ['2026-10-25', 'overdue', 'short', '25 Oct · 25 days overdue'],
    // Done
    ['2026-11-13', 'done', 'short', '13 Nov'],
    ['2026-11-13', 'done', 'long', '13 Nov 2026'],
    ['2025-06-01', 'done', 'short', '1 Jun 2025'],
    [null, 'done', 'short', 'No deadline'],
    [null, 'done', 'long', 'No deadline'],
    // None
    [null, 'none', 'short', 'No deadline'],
    [undefined, 'none', 'long', 'No deadline'],
    ['', 'none', 'short', 'No deadline'],
  ] as const)('formats %s (%s, %s) as "%s"', (deadline, state, variant, expected) => {
    expect(formatDeadline(deadline, state, today, variant)).toBe(expected)
  })

  it('uses all 12 month names, with no "Sept"', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatDeadline(`2026-${String(i + 1).padStart(2, '0')}-01`, 'done', today, 'short'),
    )
    expect(months).toEqual([
      '1 Jan',
      '1 Feb',
      '1 Mar',
      '1 Apr',
      '1 May',
      '1 Jun',
      '1 Jul',
      '1 Aug',
      '1 Sep',
      '1 Oct',
      '1 Nov',
      '1 Dec',
    ])
  })

  it('uses the year of today to decide the short form', () => {
    expect(formatDeadline('2027-01-08', 'upcoming', '2027-01-02', 'short')).toBe('8 Jan')
    expect(formatDeadline('2026-12-30', 'overdue', '2027-01-02', 'short')).toBe(
      '30 Dec 2026 · 3 days overdue',
    )
  })
})
