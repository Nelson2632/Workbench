// ============================================================
// V9 Operation Journal 测试（V9-C-001 §4.19）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from './database'
import { eventBus, markJournaled } from '@/domain/events/eventBus'
import { faultInjection, _resetFaultInjectionForTests } from '@/utils/faultInjection'
import { journalEvent, setupJournalSink } from './journal'

describe('Operation Journal', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetFaultInjectionForTests()
  })

  afterEach(() => {
    eventBus.clear()
    _resetFaultInjectionForTests()
  })

  it('journalEvent 写入且 seq 单调递增', async () => {
    const a = await journalEvent('task.created', { taskId: 't1' })
    const b = await journalEvent('task.completed', { taskId: 't1' })
    expect(b).toBeGreaterThan(a)
    const rows = await db.operationJournal.toArray()
    expect(rows).toHaveLength(2)
    expect(rows[0].eventType).toBe('task.created')
    expect(rows[0].payload).toEqual({ taskId: 't1' })
  })

  it('空载荷存 null', async () => {
    await journalEvent('timeline.rebuilt', null)
    const rows = await db.operationJournal.toArray()
    expect(rows[0].payload).toBeNull()
  })

  it('Journal 汇流：EventBus 事件自动落库', async () => {
    const off = setupJournalSink()
    try {
      eventBus.publish({ type: 'diary.created', diaryId: 1 })
      eventBus.publish({ type: 'flexStudy.fallback', reason: 'exception' })
      // 等异步落库
      await new Promise((r) => setTimeout(r, 10))
      const rows = await db.operationJournal.toArray()
      expect(rows.map((r) => r.eventType)).toEqual(['diary.created', 'flexStudy.fallback'])
      expect(rows[1].payload).toEqual({ reason: 'exception' })
      // payload 不含 type 冗余键
      expect(rows[0].payload).not.toHaveProperty('type')
    } finally {
      off()
    }
  })

  it('journalEvent 不触发 after_journal_write（Hook 已归 Mutation Lane）', async () => {
    faultInjection.enable()
    faultInjection.inject('after_journal_write', () => {
      throw new Error('should not fire')
    })
    await expect(journalEvent('task.created', { taskId: 't1' })).resolves.toBeGreaterThan(0)
  })

  it('sink 跳过 markJournaled 事件（避免二次写）；未标记事件仍汇流', async () => {
    const off = setupJournalSink()
    try {
      eventBus.publish(markJournaled({ type: 'diary.created', diaryId: 1 }))
      eventBus.publish({ type: 'flexStudy.fallback', reason: 'x' })
      await new Promise((r) => setTimeout(r, 10))
      const rows = await db.operationJournal.toArray()
      expect(rows.map((r) => r.eventType)).toEqual(['flexStudy.fallback'])
    } finally {
      off()
    }
  })
})
