// ============================================================
// V9 Backup 快照测试（V9-C-001 §4.18 / V9-C-003 §4）
// 排除安全边界表 / SHA-256 校验 / 恢复前 safety snapshot / 恢复往返
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from './database'
import { eventBus } from '@/domain/events/eventBus'
import {
  createSnapshot,
  listSnapshots,
  readSnapshotPayload,
  restoreSnapshot,
  snapshotStorage,
  exportSnapshotTables,
} from './snapshot'
import { setupLock, unlock, lock, changePassword, _resetForTests } from '@/domain/security/appLock'

/** 测试环境无 localStorage，替换为内存 Map */
function useMemoryStorage() {
  const map = new Map<string, string>()
  snapshotStorage.save = (k, v) => map.set(k, v)
  snapshotStorage.load = (k) => map.get(k) ?? null
  snapshotStorage.remove = (k) => void map.delete(k)
  return map
}

async function seed(): Promise<void> {
  await db.tasks.add({
    id: 't1', title: '完成数学卷', priority: 'P0', done: false, note: '',
    projectId: '', dueDate: '2026-08-31', pinned: false,
    createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
  } as never)
  await db.diaries.add({
    date: '2026-08-30', type: 'quick', mood: 'good', weather: 'sunny',
    title: '今天', content: '很好', photos: [], tags: [],
    createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
  } as never)
  await db.vault.add({
    id: 'v1', platform: 'test', username: 'u', password: 'TOP-SECRET',
    passwordIv: 'iv', url: '', note: '', lastUsed: '',
  } as never)
  await db.privateFileMeta.add({
    name: 'secret.txt', size: 10, mimeType: null, sha256Plain: 'a'.repeat(64),
    encPath: 'files/x.enc', dekIv: 'iv', dekCt: 'ct', fileIv: 'iv', fileTag: 'tg',
    createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
  } as never)
  await db.appLock.put({
    id: 'main', kdfParamsVersion: 1, salt: 'c2FsdA==', iterations: 600000,
    verifier: 'dg==', enabled: true, autoLockMinutes: 15,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  } as never)
}

describe('Backup 快照', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useMemoryStorage()
    await seed()
  })

  afterEach(() => {
    _resetForTests()
  })

  it('快照排除 vault / privateFileMeta / backupSnapshots / appLock 认证态，仅携带策略元数据', async () => {
    const { payload, itemCounts } = await createSnapshot('manual')
    expect(payload.data.vault).toBeUndefined()
    expect(payload.data.privateFileMeta).toBeUndefined()
    expect(payload.data.backupSnapshots).toBeUndefined()
    expect(payload.data.appLock).toBeUndefined()
    expect(payload.data.tasks).toHaveLength(1)
    expect(payload.data.diaries).toHaveLength(1)
    // Patch C-003-02：只记录策略元数据（不含 salt/verifier）
    expect(payload.appLockPolicy).toEqual({ enabled: true, autoLockMinutes: 15, kdfParamsVersion: 1 })
    expect(JSON.stringify(payload)).not.toContain('c2FsdA==')
    expect(itemCounts.tasks).toBe(1)

    const rows = await listSnapshots()
    expect(rows).toHaveLength(1)
    expect(rows[0].scope).toBe('noVault')
    expect(rows[0].status).toBe('ready')
    expect(rows[0].snapshotId).toBe(payload.snapshotId)
  })

  it('SHA-256 校验：完整载荷可读，篡改后拒绝', async () => {
    const map = useMemoryStorage()
    const { snapshotId } = await createSnapshot()
    const ok = await readSnapshotPayload(snapshotId)
    expect(ok?.snapshotId).toBe(snapshotId)

    // 篡改存储中的载荷
    const key = `v9-snapshot-${snapshotId}`
    const raw = map.get(key)!
    const parsed = JSON.parse(raw)
    parsed.data.tasks[0].title = '被篡改'
    map.set(key, JSON.stringify(parsed))
    await expect(readSnapshotPayload(snapshotId)).rejects.toThrow('checksum 不匹配')
  })

  it('恢复往返：数据回到快照时点，且恢复前自动 safety snapshot', async () => {
    const { snapshotId } = await createSnapshot()

    // 模拟数据损坏：清空业务数据并写入垃圾
    await db.tasks.clear()
    await db.diaries.clear()
    await db.diaries.add({
      date: '2026-08-30', type: 'quick', mood: null, weather: null,
      title: '垃圾数据', content: 'x', photos: [], tags: [],
      createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)

    await restoreSnapshot(snapshotId)

    const tasks = await db.tasks.toArray()
    const diaries = await db.diaries.toArray()
    expect(tasks.map((t) => t.title)).toEqual(['完成数学卷'])
    expect(diaries.map((d) => d.title)).toEqual(['今天'])

    // 恢复前 safety snapshot + 原始快照 = 至少 2 份
    expect((await listSnapshots()).length).toBeGreaterThanOrEqual(2)

    // Journal 记录了 backup.created ×N 与 restore.completed
    const journal = await db.operationJournal.toArray()
    expect(journal.some((j) => j.eventType === 'restore.completed')).toBe(true)
    expect(journal.filter((j) => j.eventType === 'backup.created').length).toBeGreaterThanOrEqual(2)

    // 事件发布
    const events: string[] = []
    eventBus.subscribeAll((e) => events.push(e.type))
    await restoreSnapshot(snapshotId)
    expect(events).toContain('restore.completed')
  })

  it('恢复不存在的快照 → 抛错', async () => {
    await expect(restoreSnapshot('v9-snap-none')).rejects.toThrow('快照不存在')
  })

  it('exportSnapshotTables 与 V8 exportAllData 互补（vault 边界不破坏）', async () => {
    const data = await exportSnapshotTables()
    expect(data.vault).toBeUndefined()
    const v8All = await db.exportAllData()
    expect(v8All.vault).toBeUndefined()
    expect(data.diaries).toBeDefined()
  })

  it('Restore 不回退认证态（Patch C-003-02 验收）：改密后恢复旧快照，新密码仍有效', async () => {
    await setupLock('password-A', 15, 1000)
    const { snapshotId } = await createSnapshot()
    // seed 的 privateFileMeta 是伪造数据，改密前清掉（本测试聚焦认证态）
    await db.privateFileMeta.clear()
    await changePassword('password-A', 'password-B')
    lock()

    await restoreSnapshot(snapshotId)

    // 新密码有效、旧密码失效（认证态未被快照回滚）
    expect((await unlock('password-B')).ok).toBe(true)
    lock()
    expect((await unlock('password-A')).ok).toBe(false)

    // 策略元数据确实进了快照（salt/verifier 未进入）
    const payload = await readSnapshotPayload(snapshotId)
    expect(payload?.appLockPolicy).toMatchObject({ enabled: true, autoLockMinutes: 15, kdfParamsVersion: 1 })
  })
})
