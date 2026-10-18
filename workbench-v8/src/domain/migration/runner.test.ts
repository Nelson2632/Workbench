// ============================================================
// V9 Migration Runner 测试（V9-C-006 + Patch C-006-11/14）
// 用契约脱敏样例：Dry Run 全绿 / 真实迁移 counts+checksum 与源一致 /
// 幂等 / 回滚 / Rescue
// ============================================================

import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { sha256HexAsync } from '@/domain/security/crypto'
import { stableStringify, snapshotStorage } from '@/db/snapshot'
import {
  validateExport,
  dryRunMigration,
  runMigration,
  rollbackMigration,
  deriveLegacyId,
  stripForChecksum,
  type MigrationExport,
} from './runner'

const FIXTURE = fileURLToPath(new URL('../../../../docs/contracts/sample/expected_migration_export.json', import.meta.url))

function loadFixture(): MigrationExport {
  return JSON.parse(readFileSync(FIXTURE, 'utf8')) as MigrationExport
}

/** 测试环境无 localStorage → 快照载荷内存存储 */
function useMemoryStorage() {
  const map = new Map<string, string>()
  snapshotStorage.save = (k, v) => map.set(k, v)
  snapshotStorage.load = (k) => map.get(k) ?? null
  snapshotStorage.remove = (k) => void map.delete(k)
  return map
}

async function checksumOfInsertedRows(): Promise<string> {
  const [diaries, materials, friends, events] = await Promise.all([
    db.diaries.toArray(),
    db.materials.toArray(),
    db.friends.toArray(),
    db.events.toArray(),
  ])
  const combined = { diaries, materials, friends, events }
  return sha256HexAsync(stableStringify(stripForChecksum(combined)))
}

/** fixture 无 checksum 字段 → 用其 rows 计算源 hex */
async function sourceHex(exp: MigrationExport): Promise<string> {
  return sha256HexAsync(stableStringify(stripForChecksum(exp.rows)))
}

describe('Migration Runner（脱敏样例）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useMemoryStorage()
  })

  it('M7 验证 2：Dry Run 全绿（校验通过 + 零写入）', async () => {
    const exp = loadFixture()
    const validation = await validateExport(exp)
    expect(validation.ok).toBe(true)
    expect(validation.checksumOk).toBe(true)

    const manifest = await dryRunMigration(exp)
    expect(manifest.verified).toBe(true)
    expect(manifest.note).toContain('零写入')

    // 零写入
    expect(await db.diaries.count()).toBe(0)
    expect(await db.materials.count()).toBe(0)
    expect(await db.friends.count()).toBe(0)
    expect(await db.events.count()).toBe(0)
    expect(await db.migrationRuns.count()).toBe(0)
  })

  it('M7 验证 3：真实迁移后数据总数、校验和与源一致', async () => {
    const exp = loadFixture()
    const { targetCount } = await runMigration(exp)

    expect(targetCount).toBe(18)
    expect(await db.diaries.count()).toBe(10)
    expect(await db.materials.count()).toBe(3)
    expect(await db.friends.count()).toBe(3)
    expect(await db.events.count()).toBe(2)

    // 校验和与源一致（稳定字段口径：剔除 id 与运行期时间戳）
    expect(await checksumOfInsertedRows()).toBe(await sourceHex(exp))

    // ledger 18 行 ok + migrationRuns 1 行 done + migration.completed 发布
    expect(await db.migrationLedger.count()).toBe(18)
    const run = await db.migrationRuns.orderBy('id').first()
    expect(run?.status).toBe('done')
    expect(run?.targetCount).toBe(18)

    // 迁移后投影已重建（diaries 10 + events 2 = 12 行时间线）
    expect(await db.timelineEvents.count()).toBe(12)
  })

  it('幂等：重跑同一源 → 全部跳过，不重复导入', async () => {
    const exp = loadFixture()
    await runMigration(exp)
    const second = await runMigration(exp)
    expect(second.targetCount).toBe(0)
    // 18 行幂等跳过 + 源自带 2 项 skipped（diary 缺 diary 对象 + 空日记占位记录 RF-05）
    expect(second.skippedCount).toBe(20)
    expect(await db.diaries.count()).toBe(10)
  })

  it('回滚：删除导入行 + 恢复 safety snapshot（数据回到迁移前）', async () => {
    const exp = loadFixture()
    const { runId } = await runMigration(exp)
    expect(await db.diaries.count()).toBe(10)

    await rollbackMigration(runId)

    expect(await db.diaries.count()).toBe(0)
    expect(await db.materials.count()).toBe(0)
    expect(await db.migrationLedger.count()).toBe(0)
    expect(await db.migrationRuns.count()).toBe(0)
  })

  it('Rescue（Patch C-006-11）：校验失败 → 抛错不写入，V9 数据不受影响', async () => {
    const exp = loadFixture()
    exp.checksum = 'sha256:' + '0'.repeat(64) // 破坏校验和
    await expect(runMigration(exp)).rejects.toThrow('校验失败')
    expect(await db.diaries.count()).toBe(0)
    expect(await db.migrationRuns.count()).toBe(0)
  })

  it('legacyId 派生确定性', () => {
    expect(deriveLegacyId('diaries', { date: '2026-08-20' })).toBe('2026-08-20')
    expect(deriveLegacyId('friends', { relationship: '同学', name: '李小明' })).toBe('同学#李小明')
    expect(deriveLegacyId('events', { date: '2026-09-01', title: '开学典礼' })).toBe('2026-09-01#开学典礼')
  })
})
