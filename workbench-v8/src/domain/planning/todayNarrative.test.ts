import { describe, it, expect } from 'vitest'
import { selectTodayNarrative } from './todayNarrative'
import type { Task } from '@/types'
const tasks = Array.from({ length: 10 }, (_, i) => ({ id: String(i), title: String(i), priority: 'P1', done: false, pinned: false, dueDate: '2026-10-28', createdAt: '2026-10-01', sourceRecurringId: i % 2 ? 'cycle' : undefined } as Task))
describe('Today narrative', () => {
  it('one Now, at most four Next, all planned tasks retained and no duplicate summary', () => {
    const result = selectTodayNarrative(tasks, '2026-10-28', '5')
    expect(result.now?.id).toBe('5'); expect(result.next).toHaveLength(4)
    expect(result.next.some((t) => t.id === '5')).toBe(false)
    expect(result.plan).toHaveLength(10)
  })
  it('invalid selected task falls back; empty/completed/future tasks do not fill slots', () => {
    expect(selectTodayNarrative([], '2026-10-28').now).toBeNull()
    const result = selectTodayNarrative([{ ...tasks[0], done: true }, { ...tasks[1], dueDate: '2026-10-29' }], '2026-10-28', '0')
    expect(result.next).toEqual([]); expect(result.now).toBeNull()
  })
})
