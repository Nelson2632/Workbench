// ============================================================
// V9 SECURITY — 自动备份策略（V9-C-003 §4 / V9_MASTER_PLAN §25）
// Daily × 7 + Weekly × 4；每日一次 + 周一周快照；过期裁剪
// ============================================================

import { db } from '@/db/database'
import { createSnapshot, snapshotStorage, SNAPSHOT_KEY_PREFIX } from './snapshot'

export const DAILY_KEEP = 7
export const WEEKLY_KEEP = 4
export const DAILY_PREFIX = 'v9-snap-daily-'
export const WEEKLY_PREFIX = 'v9-snap-weekly-'

const LAST_DAILY_KEY = 'lastDailySnapshotAt'
const LAST_WEEKLY_KEY = 'lastWeeklySnapshotAt'

/** 确保今日已有一份日快照；已有则返回 false（settings 记录上次时间，与 V8 lastBackupTime 同模式） */
export async function ensureDailySnapshot(now = new Date()): Promise<boolean> {
  const row = await db.settings.get(LAST_DAILY_KEY)
  const last = row?.value as string | undefined
  if (last && last.slice(0, 10) === now.toISOString().slice(0, 10)) return false
  await createSnapshot('daily-auto', 'daily')
  await db.settings.put({ key: LAST_DAILY_KEY, value: now.toISOString() })
  return true
}

/** 周一确保本周周快照 */
export async function ensureWeeklySnapshot(now = new Date()): Promise<boolean> {
  if (now.getDay() !== 1) return false
  const row = await db.settings.get(LAST_WEEKLY_KEY)
  const last = row?.value as string | undefined
  if (last && last.slice(0, 10) === now.toISOString().slice(0, 10)) return false
  await createSnapshot('weekly-auto', 'weekly')
  await db.settings.put({ key: LAST_WEEKLY_KEY, value: now.toISOString() })
  return true
}

/** 裁剪：Daily 保留最新 7 份、Weekly 保留最新 4 份（注册表 + 载荷存储一并删除） */
export async function pruneSnapshots(): Promise<number> {
  const daily = (await db.backupSnapshots.where('snapshotId').startsWith(DAILY_PREFIX).toArray()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )
  const weekly = (await db.backupSnapshots.where('snapshotId').startsWith(WEEKLY_PREFIX).toArray()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )
  const toRemove = [...daily.slice(DAILY_KEEP), ...weekly.slice(WEEKLY_KEEP)]
  for (const s of toRemove) {
    await db.backupSnapshots.delete(s.id)
    snapshotStorage.remove(SNAPSHOT_KEY_PREFIX + s.snapshotId)
  }
  return toRemove.length
}

/** 自动备份主入口（应用启动调用；幂等） */
export async function runAutoBackup(now = new Date()): Promise<{ daily: boolean; weekly: boolean; pruned: number }> {
  const daily = await ensureDailySnapshot(now)
  const weekly = await ensureWeeklySnapshot(now)
  const pruned = await pruneSnapshots()
  return { daily, weekly, pruned }
}
