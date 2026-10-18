// ============================================================
// V9 Restore 全链路测试（V9-C-003 §4 / V9-C-002 §9）
// 恢复 → Journal 重放 → Projection 重建一致性
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { setupJournalSink } from './journal'
import {
  createSnapshot,
  restoreSnapshot,
  replayRecentJournal,
  snapshotStorage,
} from './snapshot'
import {
  rebuildProjection,
  timelineKeySet,
  setupProjection,
  _resetProjectionForTests,
} from '@/domain/projection/timelineProjection'

const D = '2026-08-30'
const NOON = new Date(2026, 7, 30, 12).toISOString()
const flush = () => new Promise((r) => setTimeout(r, 25))

function useMemoryStorage() {
  const map = new Map<string, string>()
  snapshotStorage.save = (k, v) => map.set(k, v)
  snapshotStorage.load = (k) => map.get(k) ?? null
  snapshotStorage.remove = (k) => void map.delete(k)
  return map
}

async function seedTaskDone(): Promise<void> {
  const now = NOON
  await db.tasks.add({ id: 't1', title: '快照任务', priority: 'P0', done: true, completedAt: now, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now } as never)
  eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: now })
  await flush()
}

describe('Restore 全链路', () => {
  let sinkOff: () => void

  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useMemoryStorage()
    _resetProjectionForTests()
    setupProjection()
    sinkOff = setupJournalSink()
  })

  afterEach(() => {
    sinkOff?.()
    eventBus.clear()
  })

  it('恢复 → 数据回到快照时点 → Projection 自动重建且与事实一致', async () => {
    await seedTaskDone()
    await flush()
    const { snapshotId } = await createSnapshot('manual')
    const snapshotKeys = await timelineKeySet()
    expect(snapshotKeys).toContain('task.completed:t1:v1:1')

    // 模拟数据损坏：清空任务与时间线
    await db.tasks.clear()
    await db.timelineEvents.clear()

    await restoreSnapshot(snapshotId)

    // 任务恢复
    expect(await db.tasks.count()).toBe(1)
    // Timeline 已重建（restore 内部调用 rebuildProjection）
    const keysAfter = await timelineKeySet()
    expect(keysAfter).toEqual(snapshotKeys)
    // 与"从恢复后事实重新重建"完全一致（幂等）
    await rebuildProjection()
    expect(await timelineKeySet()).toEqual(keysAfter)
  })

  it('Journal 重放：快照时点之后的事件按 seq 顺序重新发布', async () => {
    const { snapshotId, payload } = await createSnapshot('manual')
    // 快照之后产生两条事件
    eventBus.publish({ type: 'diary.created', diaryId: 99 })
    await flush()
    eventBus.publish({ type: 'task.created', taskId: 'zzz' })
    await flush()

    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))
    const count = await replayRecentJournal(payload.createdAt)
    expect(count).toBeGreaterThanOrEqual(2)
    // 重放的事件包括快照后的事件（顺序按 seq）
    const idx1 = seen.indexOf('diary.created')
    const idx2 = seen.indexOf('task.created')
    expect(idx1).toBeGreaterThanOrEqual(0)
    expect(idx2).toBeGreaterThan(idx1)
    void snapshotId
  })

  it('损坏快照 → 抛错；恢复不存在的快照 → 抛错（降级路径由调用方回退上一份）', async () => {
    const map = useMemoryStorage()
    const { snapshotId } = await createSnapshot('manual')
    const key = `v9-snapshot-${snapshotId}`
    map.set(key, '{broken json')
    await expect(restoreSnapshot(snapshotId)).rejects.toThrow()
    await expect(restoreSnapshot('v9-snap-manual-999')).rejects.toThrow('快照不存在')
  })
})
