import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventBus } from './eventBus'
import type { AppEvent } from './eventBus'

describe('eventBus', () => {
  beforeEach(() => eventBus.clear())

  it('publishes to subscribed handler', () => {
    const handler = vi.fn()
    eventBus.subscribe('task.completed', handler)
    const event: AppEvent = { type: 'task.completed', taskId: 't1', completedAt: '2026-01-01T00:00:00.000Z' }
    eventBus.publish(event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('does not deliver to other event types', () => {
    const handler = vi.fn()
    eventBus.subscribe('task.completed', handler)
    eventBus.publish({ type: 'task.created', taskId: 't1' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('unsubscribe stops delivery', () => {
    const handler = vi.fn()
    const off = eventBus.subscribe('task.completed', handler)
    off()
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: 'x' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('isolates handler exceptions', () => {
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    eventBus.subscribe('task.completed', bad)
    eventBus.subscribe('task.completed', good)
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: 'x' })
    expect(good).toHaveBeenCalled()
  })
})
