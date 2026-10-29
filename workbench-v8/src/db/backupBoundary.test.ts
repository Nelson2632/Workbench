import 'fake-indexeddb/auto'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { db } from './database'
import { exportSnapshotTables, createSnapshot, restoreSnapshot, snapshotStorage, SNAPSHOT_KEY_PREFIX, stableStringify } from './snapshot'
import { createBackupPayload, verifyAndParseBackup } from './backup'
import { sha256HexAsync } from '@/domain/security/crypto'
const vaultKeys = [{ key: 'vaultMasterHash', value: 'existing hash' }, { key: 'vaultMasterSalt', value: 'existing salt' }]
beforeEach(async () => {
  await db.delete(); await db.open(); await db.settings.bulkPut(vaultKeys)
  await db.vault.put({ id: 'secret', password: 'ciphertext' } as never)
  const memory = new Map<string, string>()
  snapshotStorage.save = (k, v) => memory.set(k, v)
  snapshotStorage.load = k => memory.get(k) ?? null
  snapshotStorage.remove = k => { memory.delete(k) }
})
afterEach(() => vi.restoreAllMocks())
it('ordinary export and snapshots exclude vault authentication; restore preserves local keys', async () => {
  expect((await db.exportAllData()).settings).toEqual([])
  expect((await exportSnapshotTables()).settings).toEqual([])
  await db.importAllData({ settings: [{ key: 'vaultMasterHash', value: 'foreign' }, { key: 'theme', value: 'mist' }] })
  expect(await db.settings.where('key').anyOf(vaultKeys.map(k => k.key)).toArray()).toEqual(vaultKeys)
  expect(await db.vault.count()).toBe(1)
})
it('snapshot restore excludes all security tables even in checksummed legacy payload', async () => {
  const { snapshotId, payload } = await createSnapshot()
  payload.data.vault = []
  payload.data.privateFileMeta = []
  payload.data.settings = [{ key: 'vaultMasterSalt', value: 'foreign' }]
  payload.checksum = await sha256HexAsync(stableStringify(payload.data))
  snapshotStorage.save(SNAPSHOT_KEY_PREFIX + snapshotId, JSON.stringify(payload))
  await restoreSnapshot(snapshotId)
  expect(await db.vault.count()).toBe(1)
  expect((await db.settings.get('vaultMasterSalt'))?.value).toBe('existing salt')
})
it('unreadable table fails export instead of creating a partial success', async () => {
  const original = db.table.bind(db)
  vi.spyOn(db, 'table').mockImplementation((name: string) => {
    const table = original(name)
    if (name === 'diaries') vi.spyOn(table, 'toArray').mockRejectedValue(new Error('disk failure'))
    return table as never
  })
  await expect(db.exportAllData()).rejects.toThrow('disk failure')
})
it('missing checksum and malformed table do not clear existing data', async () => {
  const payload = await createBackupPayload()
  delete (payload as Partial<typeof payload>).checksum
  expect(() => verifyAndParseBackup(JSON.stringify(payload))).toThrow('checksum')
  await expect(db.importAllData({ tasks: 'bad' as never })).rejects.toThrow('格式无效')
  expect(await db.vault.count()).toBe(1)
})
