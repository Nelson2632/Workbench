// ============================================================
// Personal Workbench V9 — Backup 快照（V9-C-001 §4.18 / V9-C-003 §4）
// Snapshot + Journal：SHA-256 校验、排除 vault/privateFileMeta/
// backupSnapshots、恢复前 safety snapshot、恢复后 journal
// （快照落盘 Tauri PrivateWorkbench/backup/；浏览器/测试回退 localStorage）
// ============================================================

import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { uid } from '@/utils/helpers'
import { faultInjection } from '@/utils/faultInjection'
import { sha256HexAsync } from '@/domain/security/crypto'
import { rebuildProjection } from '@/domain/projection/timelineProjection'
import type { BackupSnapshot } from '@/types'
import { journalEvent } from './journal'

const SNAPSHOT_VERSION = 1
export const SNAPSHOT_KEY_PREFIX = 'v9-snapshot-'
/** 普通快照永不包含（V9-C-003 §4）：
 *  vault / privateFileMeta / backupSnapshots / operationJournal / appLock
 *  - Journal 是审计日志，随快照回滚会丢失"刚刚发生过什么"的证据
 *  - appLock 认证态（salt/verifier）绝不随备份走，仅记录策略元数据
 *    （Patch C-003-02：数据恢复 ≠ 身份恢复） */
const SNAPSHOT_EXCLUDES = new Set([
  'vault',
  'privateFileMeta',
  'backupSnapshots',
  'operationJournal',
  'appLock',
  // commandId 幂等表：瞬态缓存，不随快照；历史 bug 曾膨胀到 GB 级，纳入会导致启动卡死
  'systemCommandIds',
])

export interface AppLockPolicyMeta {
  enabled: boolean
  autoLockMinutes: number
  kdfParamsVersion: number
}

export interface SnapshotPayload {
  version: number
  snapshotId: string
  createdAt: string
  checksum: string
  data: Record<string, unknown[]>
  /** App Lock 仅策略元数据（Patch C-003-02）；认证态（salt/verifier）不随备份 */
  appLockPolicy: AppLockPolicyMeta | null
}

/** 可注入的载荷存储（测试环境无 localStorage 时替换为内存 Map） */
export const snapshotStorage = {
  save(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
  load(key: string): string | null {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key)
    return null
  },
  remove(key: string): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
  },
}

function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 快照载荷落盘：Tauri 文件系统（PrivateWorkbench/backup/）优先，浏览器/测试回退 snapshotStorage */
async function writeSnapshotFile(snapshotId: string, json: string): Promise<void> {
  if (inTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('v9_save_backup_snapshot', { snapshotId, data: json })
    return
  }
  snapshotStorage.save(SNAPSHOT_KEY_PREFIX + snapshotId, json)
}

/** 读取快照载荷：Tauri 文件系统优先，浏览器/测试回退 snapshotStorage */
async function readSnapshotFile(snapshotId: string): Promise<string | null> {
  if (inTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    return (await invoke<string | null>('v9_load_backup_snapshot', { snapshotId })) ?? null
  }
  return snapshotStorage.load(SNAPSHOT_KEY_PREFIX + snapshotId)
}

/** 键排序的规范序列化（与 contract-gate.mjs 一致） */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return (
      '{' +
      Object.keys(obj)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(value)
}

/** 导出快照表集（排除安全边界表） */
export async function exportSnapshotTables(): Promise<Record<string, unknown[]>> {
  const tables = db.tables.map((t) => t.name).filter((n) => !SNAPSHOT_EXCLUDES.has(n))
  const data: Record<string, unknown[]> = {}
  for (const t of tables) {
    data[t] = await db.table(t).toArray()
  }
  return data
}

/** 快照类型（快照 ID 前缀编码，不占用 schema 字段） */
export type SnapshotKind = 'manual' | 'daily' | 'weekly' | 'safety'

/** 创建快照：数据 → SHA-256 → 注册表行 → 载荷落存储 → 事件 + Journal */
export async function createSnapshot(
  reason?: string,
  kind: SnapshotKind = 'manual',
): Promise<{
  snapshotId: string
  payload: SnapshotPayload
  itemCounts: Record<string, number>
}> {
  const data = await exportSnapshotTables()
  const itemCounts: Record<string, number> = {}
  for (const [k, v] of Object.entries(data)) itemCounts[k] = v.length
  const snapshotId = `v9-snap-${kind}-${Date.now()}-${uid().slice(0, 8)}`
  const createdAt = new Date().toISOString()
  const checksum = await sha256HexAsync(stableStringify(data))
  // App Lock 仅策略元数据（Patch C-003-02）
  const lockRow = await db.appLock.get('main')
  const appLockPolicy: AppLockPolicyMeta | null = lockRow
    ? {
        enabled: lockRow.enabled,
        autoLockMinutes: lockRow.autoLockMinutes,
        kdfParamsVersion: lockRow.kdfParamsVersion,
      }
    : null
  const payload: SnapshotPayload = {
    version: SNAPSHOT_VERSION,
    snapshotId,
    createdAt,
    checksum,
    data,
    appLockPolicy,
  }
  const fileName = `${snapshotId}.json`

  await db.backupSnapshots.add({
    snapshotId,
    scope: 'noVault',
    fileName,
    checksum,
    itemCounts,
    status: 'ready',
    createdAt,
  })
  await faultInjection.fire('mid_backup_write')
  await writeSnapshotFile(snapshotId, JSON.stringify(payload))
  await journalEvent('backup.created', { snapshotId, reason: reason ?? null })
  eventBus.publish({ type: 'backup.created', snapshotId })
  return { snapshotId, payload, itemCounts }
}

/** 快照列表（新→旧） */
export async function listSnapshots(): Promise<BackupSnapshot[]> {
  return db.backupSnapshots.orderBy('createdAt').reverse().toArray()
}

/** 读取并校验快照载荷；损坏 → 抛错（降级路径：上一份快照，V9-C-003 §4） */
export async function readSnapshotPayload(snapshotId: string): Promise<SnapshotPayload | null> {
  const raw = await readSnapshotFile(snapshotId)
  if (!raw) return null
  let payload: SnapshotPayload
  try {
    payload = JSON.parse(raw) as SnapshotPayload
  } catch {
    throw new Error('快照文件格式无效（非 JSON）')
  }
  const checksum = await sha256HexAsync(stableStringify(payload.data))
  if (checksum !== payload.checksum) {
    throw new Error('快照完整性校验失败（checksum 不匹配）')
  }
  return payload
}

/** 恢复快照：先 safety snapshot → 单事务导入 → journal + 事件 */
export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const payload = await readSnapshotPayload(snapshotId)
  if (!payload) throw new Error('快照不存在')

  // 恢复前 safety snapshot（V9-C-003 §4 铁律）
  await createSnapshot('pre-restore-safety', 'safety')

  await db.transaction('rw', db.tables, async () => {
    for (const [table, rows] of Object.entries(payload.data)) {
      // 双保险（Patch C-003-02）：即使旧格式快照带 appLock 数据也绝不恢复认证态
      if (table === 'appLock') continue
      const t = db.table(table)
      await t.clear()
      if (rows.length > 0) await t.bulkAdd(rows)
    }
  })

  await journalEvent('restore.completed', { snapshotId })
  eventBus.publish({ type: 'restore.completed', snapshotId })

  // 恢复后动作（V9-C-002 §9 / V9-C-003 §4）：
  // 1) Journal 重放（快照时点之后的操作事件重新发布，触发联动）
  // 2) Projection 重建（时间线从恢复后的事实表重新派生，与快照一致）
  await replayRecentJournal(payload.createdAt)
  await rebuildProjection()
}

/** Journal 重放：将快照时点之后记录的事件按序重新发布到 EventBus（限流防雪崩） */
export async function replayRecentJournal(cutoffIso: string, limit = 1000): Promise<number> {
  const rows = await db.operationJournal.where('occurredAt').above(cutoffIso).toArray()
  const sorted = rows.sort((a, b) => a.seq - b.seq)
  let count = 0
  for (const r of sorted.slice(-limit)) {
    if (!r.payload) continue
    eventBus.publish({ type: r.eventType, ...r.payload } as import('@/domain/events/eventBus').DomainEvent)
    count++
  }
  return count
}
