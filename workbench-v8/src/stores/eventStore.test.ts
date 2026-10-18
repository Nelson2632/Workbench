// ============================================================
// V9 LIFE EventStore 测试（独立实体 CRUD / doneAt / 事件发布）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useEventStore } from './eventStore'

describe('EventStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useEventStore.setState({ events: [], loading: false })
  })

  it('EMPTY：空库加载区间返回空', async () => {
    await useEventStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useEventStore.getState().events).toHaveLength(0)
    expect(useEventStore.getState().loading).toBe(false)
  })

  it('CRUD：add 固定 custom / update / delete + 事件', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    const id = await useEventStore.getState().addEvent({
      date: '2026-09-01',
      title: '开学典礼',
      note: '带录取通知书',
    })
    const row = useEventStore.getState().events.find((e) => e.id === id)!
    expect(row).toMatchObject({
      type: 'custom',
      sourceType: null,
      sourceId: null,
      doneAt: null,
      allDay: true,
    })

    await useEventStore.getState().updateEvent(id, { title: '开学典礼（改）' })
    expect(useEventStore.getState().events[0].title).toBe('开学典礼（改）')

    await useEventStore.getState().deleteEvent(id)
    expect(useEventStore.getState().events).toHaveLength(0)

    expect(seen).toContain('event.created')
    expect(seen).toContain('event.updated')
    expect(seen).toContain('event.deleted')
  })

  it('toggleDone：完成发布 event.completed，撤销发布 event.updated', async () => {
    const id = await useEventStore.getState().addEvent({ date: '2026-09-01', title: '测试' })
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    await useEventStore.getState().toggleDone(id)
    let row = useEventStore.getState().events.find((e) => e.id === id)!
    expect(row.doneAt).not.toBeNull()
    expect(seen).toContain('event.completed')

    seen.length = 0
    await useEventStore.getState().toggleDone(id)
    row = useEventStore.getState().events.find((e) => e.id === id)!
    expect(row.doneAt).toBeNull()
    expect(seen).toContain('event.updated')
  })

  it('ERROR→RECOVERY：读取失败不抛出，恢复后正常', async () => {
    await useEventStore.getState().addEvent({ date: '2026-09-01', title: '保留数据' })

    const spy = vi.spyOn(db.events, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useEventStore.getState().loadRange('2026-09-01', '2026-09-30')
    expect(useEventStore.getState().events).toHaveLength(0)
    spy.mockRestore()

    await useEventStore.getState().loadRange('2026-09-01', '2026-09-30')
    expect(useEventStore.getState().events).toHaveLength(1)
  })
})
