import { describe, it, expect } from 'vitest'
import { bucketTask, sortTasks } from './taskScheduler'
import type { Task } from '@/types'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'x',
    priority: 'P2',
    done: false,
    note: '',
    projectId: '',
    dueDate: '',
    pinned: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('taskScheduler', () => {
  const now = new Date('2026-08-23T08:00:00')

  it('buckets tasks by dueDate', () => {
    expect(bucketTask(task({ dueDate: '2026-08-23' }), now)).toBe('today')
    expect(bucketTask(task({ dueDate: '2026-08-20' }), now)).toBe('overdue')
    expect(bucketTask(task({ dueDate: '2026-08-25' }), now)).toBe('future')
    expect(bucketTask(task({ dueDate: '' }), now)).toBe('inbox')
    expect(bucketTask(task({ dueDate: '2026-08-23', done: true }), now)).toBe('done')
  })

  it('sorts pinned first, then date, then priority', () => {
    const a = task({ id: 'a', dueDate: '2026-08-24', priority: 'P0' })
    const b = task({ id: 'b', dueDate: '2026-08-23', priority: 'P2', pinned: true })
    const c = task({ id: 'c', dueDate: '2026-08-23', priority: 'P0' })
    expect(sortTasks([a, b, c]).map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})
