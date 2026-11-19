import { describe, expect, it } from 'vitest'

import { decidePoll, formatVersion, type PollState, shouldPoll, toPollOutcome } from './live'

describe('formatVersion', () => {
  it('LIVE-1, DL-1: puts today first, then the count, then the latest updatedAt', () => {
    expect(formatVersion('2026-11-19', 3, '2026-11-19T08:00:00.123Z')).toBe(
      '2026-11-19:3:2026-11-19T08:00:00.123Z',
    )
  })

  it('LIVE-1: uses "-" when there is no item', () => {
    expect(formatVersion('2026-11-19', 0, null)).toBe('2026-11-19:0:-')
  })

  it('DL-1: a new day gives a new version for the same items', () => {
    const latest = '2026-11-19T08:00:00.000Z'
    expect(formatVersion('2026-11-19', 1, latest)).not.toBe(formatVersion('2026-11-20', 1, latest))
  })

  it('LIVE-1: a delete (count change) gives a new version for the same latest updatedAt', () => {
    const latest = '2026-11-19T08:00:00.000Z'
    expect(formatVersion('2026-11-19', 2, latest)).not.toBe(formatVersion('2026-11-19', 1, latest))
  })
})

describe('toPollOutcome', () => {
  it('reads the version from a 200 body', () => {
    expect(toPollOutcome(200, { version: '2026-11-19:0:-' })).toEqual({
      kind: 'version',
      version: '2026-11-19:0:-',
    })
  })

  it('ignores other keys in a 200 body', () => {
    expect(toPollOutcome(200, { version: 'v', other: 1 })).toEqual({
      kind: 'version',
      version: 'v',
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'v'],
    ['an array', [{ version: 'v' }]],
    ['an empty object', {}],
    ['a number version', { version: 1 }],
    ['a null version', { version: null }],
    ['an empty version', { version: '' }],
  ])('returns error for a 200 with %s as the body', (_, body) => {
    expect(toPollOutcome(200, body)).toEqual({ kind: 'error' })
  })

  it('ERR-5: returns unauthorized for 401, with any body', () => {
    expect(toPollOutcome(401, { message: 'Not logged in.' })).toEqual({ kind: 'unauthorized' })
    expect(toPollOutcome(401, null)).toEqual({ kind: 'unauthorized' })
    expect(toPollOutcome(401, { version: 'v' })).toEqual({ kind: 'unauthorized' })
  })

  it.each([0, 204, 304, 403, 404, 500, 503])(
    'returns error for status %i, also with a valid body',
    (status) => {
      expect(toPollOutcome(status, { version: 'v' })).toEqual({ kind: 'error' })
    },
  )
})

describe('shouldPoll', () => {
  const idle: PollState = {
    hidden: false,
    paused: false,
    inFlight: false,
    refreshing: false,
    stopped: false,
  }

  it('LIVE-1: polls when nothing blocks it', () => {
    expect(shouldPoll(idle)).toBe(true)
  })

  it.each(['hidden', 'paused', 'inFlight', 'refreshing', 'stopped'] as const)(
    'LIVE-2: does not poll when %s is true',
    (key) => {
      expect(shouldPoll({ ...idle, [key]: true })).toBe(false)
    },
  )

  it('does not poll when all flags are true', () => {
    expect(
      shouldPoll({ hidden: true, paused: true, inFlight: true, refreshing: true, stopped: true }),
    ).toBe(false)
  })
})

describe('decidePoll', () => {
  const baseline = '2026-11-19:2:2026-11-19T08:00:00.000Z'

  it('LIVE-1: does nothing when the version is equal to the baseline', () => {
    expect(decidePoll({ kind: 'version', version: baseline }, baseline)).toBe('none')
  })

  it('LIVE-1: refreshes when the version is not equal to the baseline', () => {
    expect(decidePoll({ kind: 'version', version: '2026-11-19:3:-' }, baseline)).toBe('refresh')
  })

  it('DL-1: refreshes when only the day changed', () => {
    const nextDay = baseline.replace('2026-11-19:', '2026-11-20:')
    expect(decidePoll({ kind: 'version', version: nextDay }, baseline)).toBe('refresh')
  })

  it('ERR-5: stops on unauthorized', () => {
    expect(decidePoll({ kind: 'unauthorized' }, baseline)).toBe('stop')
  })

  it('does nothing on error', () => {
    expect(decidePoll({ kind: 'error' }, baseline)).toBe('none')
  })
})
