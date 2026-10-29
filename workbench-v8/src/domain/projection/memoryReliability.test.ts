import 'fake-indexeddb/auto'
import { beforeEach, afterEach, expect, it } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { getDailyMemory, refreshDailyMemory, setDailyReflection, setupDailyMemory, _resetDailyMemoryForTests, flushDailyMemoryEvents } from './dailyMemory'
import { useDailyMemoryStore } from '@/stores/dailyMemoryStore'
import { enqueue } from '@/db/mutationLane'
import { resolveTimelineTarget } from '@/domain/navigation/timelineTarget'
const D = '2026-10-20'
beforeEach(async () => { await flushDailyMemoryEvents(); eventBus.clear(); _resetDailyMemoryForTests(); await db.delete(); await db.open() })
afterEach(async () => { await flushDailyMemoryEvents(); eventBus.clear() })
it('historical creation, date changes and deletion refresh both old and new facts', async () => {
  setupDailyMemory()
  const id = await db.diaries.add({ date: D, title: '日记', content: '', createdAt: D, updatedAt: D } as never)
  eventBus.publish({ type: 'diary.created', diaryId: id }); await flushDailyMemoryEvents()
  expect((await getDailyMemory(D))?.facts.life.diaries).toBe(1)
  await db.diaries.update(id, { date: '2026-10-21' }); eventBus.publish({ type: 'diary.updated', diaryId: id }); await flushDailyMemoryEvents()
  expect((await getDailyMemory(D))?.facts.life.diaries).toBe(0)
  expect((await getDailyMemory('2026-10-21'))?.facts.life.diaries).toBe(1)
  await db.diaries.delete(id); eventBus.publish({ type: 'diary.deleted', diaryId: id }); await flushDailyMemoryEvents()
  expect((await getDailyMemory('2026-10-21'))?.facts.life.diaries).toBe(0)
})
it('queued manual fact refresh preserves reflection written after aggregation', async () => {
  await refreshDailyMemory(D)
  let release!: () => void
  const blocker = enqueue(() => new Promise<void>(resolve => { release = resolve }))
  const refresh = useDailyMemoryStore.getState().refresh(D)
  while (!release) await new Promise(r => setTimeout(r, 1))
  await setDailyReflection(D, '不可覆盖')
  release(); await blocker; await refresh
  expect((await getDailyMemory(D))?.reflection).toBe('不可覆盖')
})
it('navigation encodes task identity and rejects unknown/internal sources', () => {
  expect(resolveTimelineTarget({ sourceType: 'task', sourceId: 'a/?x' })).toBe('/plan/today?task=a%2F%3Fx')
  expect(resolveTimelineTarget({ sourceType: 'diary', sourceId: '7' })).toBe('/source/diary/7')
  expect(resolveTimelineTarget({ sourceType: 'vault' as never, sourceId: '7' })).toBeNull()
})
