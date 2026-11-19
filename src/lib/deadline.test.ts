import { describe, expect, it } from 'vitest'

import { isPlainDate } from './deadline'

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
