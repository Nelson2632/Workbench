import { expect, it } from 'vitest'
import { formatDate, timestampDay } from './helpers'
it('absolute timestamps are grouped using the local calendar day, including midnight', () => {
  const early = new Date(2026, 9, 28, 0, 15)
  const late = new Date(2026, 9, 28, 23, 55)
  expect(timestampDay(early.toISOString())).toBe(formatDate(early))
  expect(timestampDay(late.toISOString())).toBe('2026-10-28')
  expect(timestampDay('invalid')).toBe('')
})
