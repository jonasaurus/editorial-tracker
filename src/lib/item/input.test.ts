import { describe, expect, it } from 'vitest'

import { parseItemInput } from './input'

const VALID = {
  title: 'Budget 2027',
  status: 'draft',
  type: 'video',
  deadline: '2026-12-01',
  authors: [3, 1],
}

describe('parseItemInput', () => {
  it('accepts a valid input', () => {
    expect(parseItemInput(VALID)).toEqual({ ok: true, input: VALID })
  })

  it('trims the title', () => {
    const result = parseItemInput({ ...VALID, title: '  Budget  ' })
    expect(result).toEqual({ ok: true, input: { ...VALID, title: 'Budget' } })
  })

  it('drops unknown keys (createdBy, archived, publishedAt)', () => {
    const result = parseItemInput({
      ...VALID,
      createdBy: 9,
      archived: true,
      publishedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(result).toEqual({ ok: true, input: VALID })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
  ])('reads a deadline that is %s as no deadline', (_name, deadline) => {
    const result = parseItemInput({ ...VALID, deadline })
    expect(result).toEqual({ ok: true, input: { ...VALID, deadline: null } })
  })

  it('reads a missing deadline as no deadline', () => {
    const { deadline, ...rest } = VALID
    void deadline
    expect(parseItemInput(rest)).toEqual({ ok: true, input: { ...VALID, deadline: null } })
  })

  it('removes duplicate authors and keeps the order', () => {
    const result = parseItemInput({ ...VALID, authors: [5, 2, 5, 7, 2] })
    expect(result).toEqual({ ok: true, input: { ...VALID, authors: [5, 2, 7] } })
  })

  it('accepts an empty author list', () => {
    expect(parseItemInput({ ...VALID, authors: [] })).toEqual({
      ok: true,
      input: { ...VALID, authors: [] },
    })
  })

  it.each([
    ['a string', 'input'],
    ['null', null],
    ['an array', [VALID]],
    ['a number', 1],
  ])('rejects an input that is %s', (_name, raw) => {
    const result = parseItemInput(raw)
    expect(result.ok).toBe(false)
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['a number', 5],
    ['missing', undefined],
  ])('gives a title error when the title is %s', (_name, title) => {
    expect(parseItemInput({ ...VALID, title })).toEqual({
      ok: false,
      errors: { title: 'Enter a title.' },
    })
  })

  it.each([
    ['unknown', 'done'],
    ['a label, not a value', 'Draft'],
    ['missing', undefined],
  ])('gives a status error when the status is %s', (_name, status) => {
    const result = parseItemInput({ ...VALID, status })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['status'])
  })

  it.each([
    ['unknown', 'blog'],
    ['missing', undefined],
  ])('gives a type error when the type is %s', (_name, type) => {
    const result = parseItemInput({ ...VALID, type })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['type'])
  })

  it.each([
    ['a day that does not exist', '2026-02-30'],
    ['a timestamp', '2026-12-01T00:00:00.000Z'],
    ['a number', 20261201],
    ['text', 'tomorrow'],
  ])('gives a deadline error when the deadline is %s', (_name, deadline) => {
    expect(parseItemInput({ ...VALID, deadline })).toEqual({
      ok: false,
      errors: { deadline: 'Use a real date.' },
    })
  })

  it.each([
    ['not an array', 3],
    ['missing', undefined],
    ['a string id', ['3']],
    ['zero', [0]],
    ['a negative id', [-1]],
    ['a fraction', [1.5]],
    ['an unsafe integer', [Number.MAX_SAFE_INTEGER + 1]],
    ['null in the list', [1, null]],
  ])('gives an authors error when the authors are %s', (_name, authors) => {
    expect(parseItemInput({ ...VALID, authors })).toEqual({
      ok: false,
      errors: { authors: 'Choose valid authors.' },
    })
  })

  it('collects all errors', () => {
    const result = parseItemInput({
      title: ' ',
      status: 'x',
      type: 'y',
      deadline: 'z',
      authors: 'w',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        title: 'Enter a title.',
        deadline: 'Use a real date.',
        authors: 'Choose valid authors.',
      })
      expect(Object.keys(result.errors).sort()).toEqual(
        ['authors', 'deadline', 'status', 'title', 'type'].sort(),
      )
    }
  })
})
