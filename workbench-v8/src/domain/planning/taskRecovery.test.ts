import 'fake-indexeddb/auto'
import { beforeEach, afterEach, expect, it } from 'vitest'
import { db } from '@/db/database'
import { faultInjection } from '@/utils/faultInjection'
import { previewRecovery, applyRecovery, undoRecovery, isActiveTask } from './taskRecovery'
import { createBackupPayload, restoreBackup } from '@/db/backup'
import type { Task } from '@/types'
const task = (id: string): Task => ({ id, title: id, done: false, priority: 'P1', note: '', projectId: '', dueDate: '2026-10-20', pinned: false, createdAt: '2026-10-20', updatedAt: '2026-10-20' })
beforeEach(async () => { await db.delete(); await db.open(); await db.tasks.bulkAdd([task('a'), task('b')]) })
afterEach(() => { faultInjection.disable(); faultInjection.clear() })
it('old tasks are active; stash and abandon preserve records and restore is explicit', async () => {
  expect(isActiveTask(task('a'))).toBe(true)
  for (const action of ['stash', 'abandon', 'restore'] as const) {
    await applyRecovery(previewRecovery([(await db.tasks.get('a'))!], action))
    expect(await db.tasks.count()).toBe(2)
    expect(isActiveTask((await db.tasks.get('a'))!)).toBe(action === 'restore')
  }
})
it('batch failure is atomic; retry is idempotent; undo survives backup restore', async () => {
  const p = previewRecovery(await db.tasks.toArray(), 'reschedule', { date: '2026-10-30' })
  faultInjection.enable(); faultInjection.inject('after_journal_write', () => { throw new Error('disk') })
  await expect(applyRecovery(p)).rejects.toThrow('disk')
  expect((await db.tasks.toArray()).every(t => t.dueDate === '2026-10-20')).toBe(true)
  faultInjection.clear(); await applyRecovery(p); await applyRecovery(p)
  expect(await db.operationJournal.count()).toBe(2)
  const backup = await createBackupPayload(); await db.tasks.clear(); await db.settings.clear()
  await restoreBackup(JSON.stringify(backup)); await undoRecovery(p.commandId); await undoRecovery(p.commandId)
  expect((await db.tasks.toArray()).every(t => t.dueDate === '2026-10-20')).toBe(true)
})
it('split has no partial children; undo never deletes source or children', async () => {
  const p = previewRecovery([task('a')], 'split', { titles: ['one', 'two'] })
  faultInjection.enable(); faultInjection.inject('after_journal_write', () => { throw new Error('disk') })
  await expect(applyRecovery(p)).rejects.toThrow(); expect(await db.tasks.count()).toBe(2)
  faultInjection.clear(); await applyRecovery(p); await applyRecovery(p)
  expect(await db.tasks.count()).toBe(4); await undoRecovery(p.commandId)
  expect(await db.tasks.count()).toBe(4); expect(isActiveTask((await db.tasks.get('a'))!)).toBe(true)
  expect((await db.tasks.get(p.children[0].id))?.disposition).toBe('abandoned')
})
it('stale preview and undo cannot overwrite subsequent edits', async () => {
  const p = previewRecovery([task('a'), task('b')], 'reschedule', { date: '2026-10-30' })
  await db.tasks.update('b', { title: 'newer' }); await expect(applyRecovery(p)).rejects.toThrow('重新预览')
  expect((await db.tasks.get('a'))?.dueDate).toBe('2026-10-20')
  const fresh = previewRecovery(await db.tasks.toArray(), 'stash'); await applyRecovery(fresh)
  await db.tasks.update('b', { title: 'even newer' }); await expect(undoRecovery(fresh.commandId)).rejects.toThrow('重新预览')
  expect((await db.tasks.get('a'))?.disposition).toBe('stashed')
})
