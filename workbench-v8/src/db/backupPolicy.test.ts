// ============================================================
// V9 自动备份策略测试（V9-C-003 §4：Daily ×7 + Weekly ×4）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { createSnapshot, snapshotStorage, SNAPSHOT_KEY_PREFIX } from './snapshot'
import {
  runAutoBackup,
  ensureDailySnapshot,
  ensureWeeklySnapshot,
  pruneSnapshots,
  DAILY_KEEP,
  WEEKLY_KEEP,
  DAILY_PREFIX,
  WEEKLY_PREFIX,
} from './backupPolicy'

const MONDAY = new Date('2026-08-31T08:00:00') // 2026-08-31 是周一
const TUESDAY = new Date('2026-09-01T08:00:00')

function useMemoryStorage() {
  const map = new Map<string, string>()
  snapshotStorage.save = (k, v) => map.set(k, v)
  snapshotStorage.load = (k) => map.get(k) ?? null
  snapshotStorage.remove = (k) => void map.delete(k)
  return map
}

describe('自动备份策略', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useMemoryStorage()
  })

  it('每日快照：当日只建一份（幂等）；周一只建周快照', async () => {
    const r1 = await runAutoBackup(MONDAY)
    expect(r1).toEqual({ daily: true, weekly: true, pruned: 0 })

    const r2 = await runAutoBackup(MONDAY)
    expect(r2).toEqual({ daily: false, weekly: false, pruned: 0 })

    const r3 = await runAutoBackup(TUESDAY)
    expect(r3.daily).toBe(true)
    expect(r3.weekly).toBe(false)

    const all = await db.backupSnapshots.toArray()
    expect(all.filter((s) => s.snapshotId.startsWith(DAILY_PREFIX))).toHaveLength(2)
    expect(all.filter((s) => s.snapshotId.startsWith(WEEKLY_PREFIX))).toHaveLength(1)
  })

  it('ensureDailySnapshot / ensureWeeklySnapshot 幂等语义', async () => {
    expect(await ensureDailySnapshot(TUESDAY)).toBe(true)
    expect(await ensureDailySnapshot(TUESDAY)).toBe(false)
    expect(await ensureWeeklySnapshot(TUESDAY)).toBe(false) // 非周一
    expect(await ensureWeeklySnapshot(MONDAY)).toBe(true)
    expect(await ensureWeeklySnapshot(MONDAY)).toBe(false)
  })

  it('裁剪：Daily 保留 7、Weekly 保留 4（载荷存储同步删除）', async () => {
    const map = useMemoryStorage()
    for (let i = 0; i < DAILY_KEEP + 3; i++) {
      const { snapshotId } = await createSnapshot('x', 'daily')
      await new Promise((r) => setTimeout(r, 2)) // 保证 createdAt 可区分
      void snapshotId
    }
    for (let i = 0; i < WEEKLY_KEEP + 2; i++) {
      await createSnapshot('x', 'weekly')
      await new Promise((r) => setTimeout(r, 2))
    }

    const removed = await pruneSnapshots()
    expect(removed).toBe(3 + 2)

    const daily = await db.backupSnapshots.where('snapshotId').startsWith(DAILY_PREFIX).toArray()
    const weekly = await db.backupSnapshots.where('snapshotId').startsWith(WEEKLY_PREFIX).toArray()
    expect(daily).toHaveLength(DAILY_KEEP)
    expect(weekly).toHaveLength(WEEKLY_KEEP)

    // 被裁剪的载荷已从存储移除
    const storedKeys = [...map.keys()].filter((k) => k.startsWith(SNAPSHOT_KEY_PREFIX))
    expect(storedKeys).toHaveLength(DAILY_KEEP + WEEKLY_KEEP)
  })
})
