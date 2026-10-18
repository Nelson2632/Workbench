import { describe, it, expect } from 'vitest'
import { shouldGenerateForDate } from './recurringGenerator'
import type { RecurringTask } from '@/types'

function rt(overrides: Partial<RecurringTask> = {}): RecurringTask {
  return {
    id: 'r1',
    title: '背单词',
    rule: { type: 'daily' },
    time: '',
    priority: 'P2',
    category: '',
    startDate: '',
    endDate: '',
    enabled: true,
    ...overrides,
  }
}

describe('recurringGenerator', () => {
  it('daily generates when enabled', () => {
    expect(shouldGenerateForDate(rt(), new Date('2026-08-23T08:00:00'))).toBe(true)
  })

  it('disabled rule never generates', () => {
    expect(shouldGenerateForDate(rt({ enabled: false }), new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('skips if already generated today', () => {
    const r = rt({ lastGeneratedDate: '2026-08-23' })
    expect(shouldGenerateForDate(r, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('weekly matches configured daysOfWeek', () => {
    // 2026-08-23 is Sunday (getDay() === 0)
    const sunday = rt({ rule: { type: 'weekly', daysOfWeek: [0] } })
    expect(shouldGenerateForDate(sunday, new Date('2026-08-23T08:00:00'))).toBe(true)

    const monday = rt({ rule: { type: 'weekly', daysOfWeek: [1] } })
    expect(shouldGenerateForDate(monday, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('monthly matches day of month', () => {
    const on23 = rt({ rule: { type: 'monthly', daysOfMonth: [23] } })
    expect(shouldGenerateForDate(on23, new Date('2026-08-23T08:00:00'))).toBe(true)

    const on1 = rt({ rule: { type: 'monthly', daysOfMonth: [1] } })
    expect(shouldGenerateForDate(on1, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('monthly -1 matches last day of month', () => {
    const lastDay = rt({ rule: { type: 'monthly', daysOfMonth: [-1] } })
    expect(shouldGenerateForDate(lastDay, new Date('2026-08-31T08:00:00'))).toBe(true)
  })

  it('respects startDate / endDate range', () => {
    const future = rt({ startDate: '2026-08-24' })
    expect(shouldGenerateForDate(future, new Date('2026-08-23T08:00:00'))).toBe(false)

    const expired = rt({ endDate: '2026-08-22' })
    expect(shouldGenerateForDate(expired, new Date('2026-08-23T08:00:00'))).toBe(false)
  })
})
