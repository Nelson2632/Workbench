import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { WorkbenchDB } from './database'
import { portableBackup } from './fixtures/portableBackup'
import { verifyAndParseBackup } from './backup'

it('imports the shared Unicode/ISO/date-only fixture with Windows or Unix line endings', async () => {
  const db = new WorkbenchDB('portable-backup-test')
  try {
    await db.open()
    await db.settings.put({ key: 'vaultMasterHash', value: 'local-secret' })
    for (const fixture of [portableBackup, portableBackup.replace(/\n/g, '\r\n')]) {
      await db.importAllData(verifyAndParseBackup(fixture))
      expect((await db.tasks.get('unicode'))?.title).toBe('中文任务🍵')
      expect((await db.tasks.get('unicode'))?.dueDate).toBe('2026-10-30')
      expect(await db.tasks.where('completedAt').equals('2026-10-30T01:02:03.000Z').count()).toBe(1)
      expect((await db.settings.get('vaultMasterHash'))?.value).toBe('local-secret')
    }
    expect(() => verifyAndParseBackup(portableBackup.replace('中文任务', '被改写'))).toThrow('checksum')
  } finally { await db.delete() }
})
