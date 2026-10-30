import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { db, WorkbenchDB } from './database'
import { aggregateDailyMemoryFacts } from '@/domain/projection/dailyMemory'
import { createBackupPayload, restoreBackup } from './backup'
import { deriveAllRows } from '@/domain/projection/timelineProjection'
import { vi } from 'vitest'
afterEach(() => vi.restoreAllMocks())
it('v8 to v9 adds fact indexes without inventing timestamps or losing lifecycle fields', async () => {
  await db.delete()
  const schemas = Object.fromEntries(db.tables.map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.filter(i => !['completedAt', 'endedAt', 'masteredAt'].includes(i.name)).map(i => i.src)].join(',')]))
  const old = new Dexie('WorkbenchV8'); old.version(8).stores(schemas); await old.open()
  await old.table('tasks').bulkAdd([
    { id: 'legacy', title: '旧记录', done: true },
    { id: 'known', title: '已知', priority: 'P1', done: true, completedAt: new Date(2026, 9, 29, 0, 15).toISOString(), disposition: 'stashed', parentTaskId: 'parent' },
  ])
  old.close(); await db.open()
  expect(db.verno).toBe(9)
  expect((await db.tasks.get('legacy'))?.completedAt).toBeUndefined()
  expect((await aggregateDailyMemoryFacts('2026-10-29')).work.tasksCompleted).toBe(1)
  const backup = await createBackupPayload(); await db.tasks.clear(); await restoreBackup(JSON.stringify(backup))
  expect((await db.tasks.get('known'))).toMatchObject({ disposition: 'stashed', parentTaskId: 'parent' })
  expect(db.systemCommandIds.schema.indexes.map(i => i.name)).not.toContain('processedAt')
})
it('rebuild prefetches facts instead of issuing one get per row', async () => {
  await db.delete(); await db.open()
  const now = new Date().toISOString()
  await db.tasks.bulkAdd(Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}`, title: `task${i}`, priority: 'P2', done: true, completedAt: now, createdAt: now, updatedAt: now } as never)))
  const get = vi.spyOn(db.tasks, 'get')
  const rows = await deriveAllRows()
  expect(rows).toHaveLength(1000)
  expect(get).not.toHaveBeenCalled()
})
