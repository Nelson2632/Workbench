// ============================================================
// V9 SYSTEM — MyDiary 迁移 Runner（V9-C-006 冻结）
// Source(migration_export.json) → Transform(校验) → Target(Dexie 单事务)
// → Validate(counts/checksum) → Commit(manifest + ledger)
// Dry Run 零写入；Rescue Mode：失败不阻塞 V9；回滚按 runId
// ============================================================

import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { uid } from '@/utils/helpers'
import { faultInjection } from '@/utils/faultInjection'
import { sha256HexAsync } from '@/domain/security/crypto'
import { createSnapshot } from '@/db/snapshot'
import { rebuildProjection } from '@/domain/projection/timelineProjection'
import { refreshDailyMemory } from '@/domain/projection/dailyMemory'
import { stableStringify } from '@/db/snapshot'
import type { MigrationRun } from '@/types'

export interface MigrationRow {
  [key: string]: unknown
}

export interface MigrationExport {
  schemaVersion: string
  generatedAt?: string
  source?: { app: string; version: string; files: string[] }
  checksum?: string
  counts: {
    diaries?: number
    materials?: number
    friends?: number
    events?: number
    sourceCount: number
    targetCount: number
    failedCount: number
    skippedCount: number
  }
  rows: Record<string, MigrationRow[]>
  issues?: { file: string; legacyId: string; reason: string; disposition: string }[]
}

export interface MigrationManifest {
  runId: string
  mode: 'dry' | 'real'
  verified: boolean
  counts: MigrationExport['counts']
  checksum: string | null
  checksumOk: boolean
  issues: MigrationExport['issues']
  note: string
}

/** 校验用稳定投影：剔除 id 与运行期时间戳（与源 checksum 口径一致） */
export function stripForChecksum(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripForChecksum)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id' || /^(createdAt|updatedAt|generatedAt|finishedAt|exportedAt|addedAt)$/.test(k)) continue
      out[k] = stripForChecksum(v)
    }
    return out
  }
  return value
}

/** 行校验和：SHA-256 over 稳定字段 canonical JSON */
export async function rowChecksum(row: MigrationRow): Promise<string> {
  return sha256HexAsync(stableStringify(stripForChecksum(row)))
}

/** 源导出校验：计数一致 + checksum 一致 */
export async function validateExport(exp: MigrationExport): Promise<{ ok: boolean; checksumOk: boolean; error?: string }> {
  const rowsTotal = Object.values(exp.rows ?? {}).reduce((s, list) => s + (Array.isArray(list) ? list.length : 0), 0)
  if (rowsTotal !== exp.counts.targetCount) {
    return { ok: false, checksumOk: false, error: `行数不一致：rows=${rowsTotal}, targetCount=${exp.counts.targetCount}` }
  }
  if (!exp.checksum) return { ok: true, checksumOk: true }
  const computed = await sha256HexAsync(stableStringify(stripForChecksum(exp.rows)))
  const expected = exp.checksum.replace(/^sha256:/, '')
  if (computed !== expected) {
    return { ok: false, checksumOk: false, error: `checksum 不一致：期望 ${expected.slice(0, 12)}…，实际 ${computed.slice(0, 12)}…` }
  }
  return { ok: true, checksumOk: true }
}

/** legacyId 派生（runner 侧确定性规则，V9-C-006 ledger 依据） */
export function deriveLegacyId(targetTable: string, row: MigrationRow): string {
  switch (targetTable) {
    case 'diaries':
      return String(row.date)
    case 'friends':
      return `${row.relationship}#${row.name}`
    case 'events':
      return `${row.date}#${row.title}`
    case 'materials':
      return `${row.sourceDate}#${row.category}#${row.title}`
    default:
      return `${targetTable}#${row.id ?? Object.keys(row).join('|')}`
  }
}

/** Dry Run：全流程校验、零 Dexie 写入、零文件复制（V9-C-006 §1） */
export async function dryRunMigration(exp: MigrationExport): Promise<MigrationManifest> {
  const { ok, checksumOk, error } = await validateExport(exp)
  return {
    runId: `dry-${Date.now()}-${uid().slice(0, 6)}`,
    mode: 'dry',
    verified: ok,
    counts: exp.counts,
    checksum: exp.checksum ?? null,
    checksumOk,
    issues: exp.issues ?? [],
    note: ok ? 'Dry Run 全绿：零写入' : `Dry Run 未通过：${error ?? '未知错误'}`,
  }
}

const SAFETY_SNAPSHOT_MARK = 'safety:'

/** 真实迁移：safety snapshot → 预计算 → 单事务纯写 → ledger → manifest（可回滚） */
export async function runMigration(exp: MigrationExport): Promise<{ runId: string; targetCount: number; skippedCount: number; manifest: MigrationManifest }> {
  const { ok, error } = await validateExport(exp)
  if (!ok) throw new Error(`迁移前校验失败：${error}`)

  // 高风险操作前 safety snapshot（V9-C-006 §6）
  const { snapshotId } = await createSnapshot('pre-migration-safety', 'safety')
  const runId = `v9-mig-${Date.now()}-${uid().slice(0, 6)}`
  let targetCount = 0
  let skippedCount = 0

  // 阶段 1（事务外）：幂等检查 + 行校验和预计算（事务内只做纯写入）
  const existingLegacyIds = new Set((await db.migrationLedger.toArray()).map((l) => l.legacyId))
  const plans: { table: string; row: MigrationRow; legacyId: string; checksum: string }[] = []
  for (const [table, rows] of Object.entries(exp.rows ?? {})) {
    if (!db.tables.some((t) => t.name === table)) continue
    for (const row of rows) {
      const legacyId = deriveLegacyId(table, row)
      if (existingLegacyIds.has(legacyId)) {
        skippedCount++
        continue
      }
      const now = new Date().toISOString()
      plans.push({
        table,
        row: { ...row, createdAt: now, updatedAt: now },
        legacyId,
        checksum: await rowChecksum(row),
      })
      existingLegacyIds.add(legacyId)
    }
  }

  // 阶段 2：单事务纯写入（不包含任何异步外部调用）
  await faultInjection.fire('mid_migration_transform')
  await db.transaction(
    'rw',
    [db.diaries, db.materials, db.friends, db.events, db.migrationLedger],
    async () => {
      for (const p of plans) {
        const id = await db.table(p.table).add(p.row as never)
        targetCount++
        await db.migrationLedger.add({
          runId,
          legacyId: p.legacyId,
          targetTable: p.table,
          targetId: String(id),
          checksum: p.checksum,
          status: 'ok',
          note: null,
          createdAt: p.row.createdAt as string,
        })
      }
    },
  )

  const runRow: Omit<MigrationRun, 'id'> = {
    runId,
    mode: 'real',
    status: 'done',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    sourceCount: exp.counts.sourceCount,
    targetCount,
    failedCount: exp.counts.failedCount,
    skippedCount: exp.counts.skippedCount + skippedCount,
    checksum: exp.checksum ?? null,
    manifestPath: SAFETY_SNAPSHOT_MARK + snapshotId,
    error: null,
  }
  await db.migrationRuns.add(runRow)

  // 迁移后动作（V9-C-006 §7）
  eventBus.publish({ type: 'migration.completed', runId })
  await rebuildProjection()
  await refreshDailyMemory(new Date().toISOString().slice(0, 10)).catch(() => {})

  const manifest: MigrationManifest = {
    runId,
    mode: 'real',
    verified: true,
    counts: { ...exp.counts, targetCount },
    checksum: exp.checksum ?? null,
    checksumOk: true,
    issues: exp.issues ?? [],
    note: `迁移完成：目标 ${targetCount} 行（跳过 ${exp.counts.skippedCount + skippedCount}）`,
  }
  return { runId, targetCount, skippedCount: exp.counts.skippedCount + skippedCount, manifest }
}

/** 回滚：删 ledger 目标行 + 恢复 safety snapshot + 删除 ledger/run 记录（V9-C-006 §6.2） */
export async function rollbackMigration(runId: string): Promise<void> {
  const runRow = await db.migrationRuns.where('runId').equals(runId).first()
  if (!runRow) throw new Error('迁移运行记录不存在')

  const ledger = await db.migrationLedger.where('runId').equals(runId).toArray()
  await db.transaction('rw', db.tables, async () => {
    for (const l of ledger) {
      const table = db.table(l.targetTable)
      const id = Number(l.targetId)
      await table.delete(Number.isNaN(id) ? l.targetId : id)
    }
  })
  await db.migrationLedger.where('runId').equals(runId).delete()
  await db.migrationRuns.where('runId').equals(runId).delete()

  // 恢复 safety snapshot（manifestPath 内编码）
  const marker = runRow.manifestPath ?? ''
  if (marker.startsWith(SAFETY_SNAPSHOT_MARK)) {
    const snapshotId = marker.slice(SAFETY_SNAPSHOT_MARK.length)
    const { restoreSnapshot } = await import('@/db/snapshot')
    await restoreSnapshot(snapshotId)
  }
}
