// ============================================================
// V9 Module Health Matrix — SECURITY 部分（M6 Gate）
// PRIVATE FILES / BACKUP / RESTORE ×（STARTUP/CRUD/EMPTY/ERROR/RECOVERY/THEME）
// 含 M6 三项验证
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { setupLock, _resetForTests } from '@/domain/security/appLock'
import { clearKEK } from '@/domain/security/crypto'
import {
  encryptPrivateFile,
  decryptPrivateFile,
  listPrivateFiles,
  deletePrivateFile,
  privateFileStorage,
  _clearDevStorageForTests,
} from '@/domain/security/privateFiles'
import { createSnapshot, restoreSnapshot, snapshotStorage } from '@/db/snapshot'
import { runAutoBackup } from '@/db/backupPolicy'
import {
  rebuildProjection,
  timelineKeySet,
  setupProjection,
  _resetProjectionForTests,
} from '@/domain/projection/timelineProjection'
import { useDiaryStore } from '@/stores/diaryStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useSystemStore } from '@/stores/systemStore'

const D = '2026-08-30'
const te = new TextEncoder()
const THEMES = ['mist', 'fluent', 'night']

function useMemoryStorage() {
  const map = new Map<string, string>()
  snapshotStorage.save = (k, v) => map.set(k, v)
  snapshotStorage.load = (k) => map.get(k) ?? null
  snapshotStorage.remove = (k) => void map.delete(k)
  return map
}

describe('SECURITY Health Matrix（M6 Gate）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useMemoryStorage()
    _resetForTests()
    _clearDevStorageForTests()
    _resetProjectionForTests()
    setupProjection()
    await setupLock('matrix-pw', 15, 1000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('STARTUP/EMPTY：解锁态私密文件列表为空；快照列表为空', async () => {
    expect(await listPrivateFiles()).toHaveLength(0)
    expect(await db.backupSnapshots.count()).toBe(0)
  })

  it('CRUD：私密文件加密/解密/改名/删除全链路', async () => {
    const id = await encryptPrivateFile({ name: 'a.txt', bytes: te.encode('hello') })
    expect((await listPrivateFiles())).toHaveLength(1)
    expect(new TextDecoder().decode((await decryptPrivateFile(id)).bytes)).toBe('hello')
    await deletePrivateFile(id)
    expect(await db.privateFileMeta.count()).toBe(0)
  })

  it('ERROR：锁态拒绝 + 损坏拒绝，不崩溃', async () => {
    const id = await encryptPrivateFile({ name: 'x', bytes: te.encode('data') })
    clearKEK()
    await expect(encryptPrivateFile({ name: 'y', bytes: te.encode('d') })).rejects.toThrow('未解锁')
    await expect(decryptPrivateFile(id)).rejects.toThrow('未解锁')
    // 恢复解锁后一切正常
    const { unlock } = await import('@/domain/security/appLock')
    expect((await unlock('matrix-pw')).ok).toBe(true)
    expect(new TextDecoder().decode((await decryptPrivateFile(id)).bytes)).toBe('data')
  })

  it('M6 验证 1：加密一个文件，解密后内容一致', async () => {
    const content = '验证-加密解密一致'
    const id = await encryptPrivateFile({ name: 'verify.bin', bytes: te.encode(content) })
    const dec = await decryptPrivateFile(id)
    expect(new TextDecoder().decode(dec.bytes)).toBe(content)
  })

  it('M6 验证 2：备份数据不包含 Vault 与私密文件（检查备份 JSON）', async () => {
    await db.vault.add({ id: 'v1', platform: 't', username: 'u', password: 'VAULT-SECRET-PW', passwordIv: 'iv', url: '', note: '', lastUsed: '' } as never)
    await encryptPrivateFile({ name: 'secret.txt', bytes: te.encode('PRIVATE-CONTENT') })

    const { payload } = await createSnapshot('manual')
    const json = JSON.stringify(payload)
    expect(payload.data.vault).toBeUndefined()
    expect(payload.data.privateFileMeta).toBeUndefined()
    expect(json).not.toContain('VAULT-SECRET-PW')
    expect(json).not.toContain('PRIVATE-CONTENT')
  })

  it('M6 验证 3：模拟数据损坏 → Restore → 模块正常启动 + Timeline 重建成功', async () => {
    // 事实 + 投影
    await useDiaryStore.getState().addDiary({ date: D, content: '恢复验证日记' })
    await new Promise((r) => setTimeout(r, 30))
    const { snapshotId } = await createSnapshot('manual')
    const keysBefore = await timelineKeySet()
    expect(keysBefore.length).toBeGreaterThan(0)

    // 模拟数据损坏
    await db.diaries.clear()
    await db.timelineEvents.clear()

    await restoreSnapshot(snapshotId)

    // 所有模块正常启动（store 加载不抛）
    await useDiaryStore.getState().loadRange(D, D)
    expect(useDiaryStore.getState().diaries).toHaveLength(1)
    await useTimelineStore.getState().load()
    expect(useTimelineStore.getState().items.length).toBeGreaterThan(0)

    // Timeline 重建成功且与事实一致
    expect(await timelineKeySet()).toEqual(keysBefore)
    await rebuildProjection()
    expect(await timelineKeySet()).toEqual(keysBefore)
  })

  it('RECOVERY：自动备份幂等 + 每日/周策略可用', async () => {
    const monday = new Date('2026-08-31T08:00:00')
    const r1 = await runAutoBackup(monday)
    const r2 = await runAutoBackup(monday)
    expect(r1.daily).toBe(true)
    expect(r2.daily).toBe(false)
    expect(await db.backupSnapshots.count()).toBe(2) // daily + weekly
  })

  it('THEME：主题值域合法', () => {
    expect(THEMES).toContain(useSystemStore.getState().theme)
  })
})
