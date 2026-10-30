import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { db } from '@/db/database'
import { useRecurringStore } from './recurringStore'
import { _resetMutationLaneForTests } from '@/db/mutationLane'

beforeEach(async () => {
  _resetMutationLaneForTests()
  await db.delete(); await db.open()
  useRecurringStore.setState({ recurringTasks: [] })
})

it('repeated page visits return no newly generated tasks instead of dereferencing a deduped result', async () => {
  await expect(useRecurringStore.getState().generateTodayTasks()).resolves.toEqual([])
  await expect(useRecurringStore.getState().generateTodayTasks()).resolves.toEqual([])
  expect(await db.tasks.count()).toBe(0)
})

it('generates persisted rules before hydration and concurrent re-entry creates only one fact', async () => {
  await db.recurringTasks.add({ id: 'daily', title: '复习', rule: { type: 'daily' }, time: '', priority: 'P2', category: '', startDate: '', endDate: '', enabled: true })
  const results = await Promise.all([
    useRecurringStore.getState().generateTodayTasks(),
    useRecurringStore.getState().generateTodayTasks(),
  ])
  expect(results.map(tasks => tasks.length)).toEqual([1, 0])
  expect(await db.tasks.count()).toBe(1)
  expect(await db.operationJournal.where('eventType').equals('recurring.generated').count()).toBe(1)
  useRecurringStore.setState({ recurringTasks: [] })
  await expect(useRecurringStore.getState().generateTodayTasks()).resolves.toEqual([])
})
