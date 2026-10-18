import { describe, it, expect } from 'vitest'
import {
  RATING_INTERVAL_DAYS,
  isCorrectRating,
  computeNextReviewAt,
  computeMasteryDelta,
  clampMastery,
} from './flashcardScheduler'

describe('flashcardScheduler', () => {
  it('maps ratings to 1/3/7/14 days', () => {
    expect(RATING_INTERVAL_DAYS.forgot).toBe(1)
    expect(RATING_INTERVAL_DAYS.fuzzy).toBe(3)
    expect(RATING_INTERVAL_DAYS.got).toBe(7)
    expect(RATING_INTERVAL_DAYS.mastered).toBe(14)
  })

  it('isCorrectRating', () => {
    expect(isCorrectRating('got')).toBe(true)
    expect(isCorrectRating('mastered')).toBe(true)
    expect(isCorrectRating('forgot')).toBe(false)
    expect(isCorrectRating('fuzzy')).toBe(false)
  })

  it('computes next review date with correct offset', () => {
    const now = new Date('2026-08-23T10:00:00.000Z')
    const next = new Date(computeNextReviewAt(now, 'got'))
    const diffDays = (next.getTime() - now.getTime()) / 86_400_000
    expect(diffDays).toBe(7)
  })

  it('mastery delta +10 correct / -5 wrong', () => {
    expect(computeMasteryDelta('got')).toBe(10)
    expect(computeMasteryDelta('forgot')).toBe(-5)
  })

  it('clamps mastery to [0, 100]', () => {
    expect(clampMastery(150)).toBe(100)
    expect(clampMastery(-10)).toBe(0)
    expect(clampMastery(55)).toBe(55)
  })
})
