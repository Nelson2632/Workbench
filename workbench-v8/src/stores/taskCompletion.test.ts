import 'fake-indexeddb/auto'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { db } from '@/db/database'
import { useTaskStore as store } from './taskStore'
import { eventBus } from '@/domain/events/eventBus'
import { faultInjection } from '@/utils/faultInjection'
import { formatDate } from '@/utils/helpers'
import { _resetMutationLaneForTests } from '@/db/mutationLane'

const intent = { taskId: 't', desiredDone: true, commandId: 'complete-one' }
beforeEach(async () => {
  faultInjection.disable(); faultInjection.clear(); eventBus.clear(); _resetMutationLaneForTests()
  await db.delete(); await db.open()
  store.setState({ tasks: [], completions: {}, feedback: [] })
  await store.getState().addTask({ title: '数学卷', dueDate: formatDate(new Date()) })
  const task = store.getState().tasks[0]
  await db.tasks.delete(task.id)
  await db.tasks.add({ ...task, id: 't' })
  await store.getState().loadTasks()
})
afterEach(() => { faultInjection.disable(); faultInjection.clear() })

describe('Completion intent truth and recovery', () => {
  it('rapid duplicate requests yield one committed event, timeline row and feedback', async () => {
    await Promise.all([store.getState().setDone(intent), store.getState().setDone(intent)])
    expect(await db.operationJournal.where('eventType').equals('task.completed').count()).toBe(1)
    expect(await db.timelineEvents.count()).toBe(1)
    expect(store.getState().feedback).toHaveLength(1)
    await store.getState().setDone(intent)
    expect(store.getState().feedback).toHaveLength(1)
  })
  it('persist failure retains state and retries the identical intent', async () => {
    faultInjection.enable(); faultInjection.inject('before_domain_commit', () => { throw new Error('disk') })
    await store.getState().setDone(intent)
    expect((await db.tasks.get('t'))?.done).toBe(false)
    expect(store.getState().completions.t).toMatchObject({ phase: 'failed-persist', commandId: intent.commandId })
    faultInjection.clear()
    await store.getState().setDone(intent)
    expect((await db.tasks.get('t'))?.done).toBe(true)
    expect(store.getState().completions.t.phase).toBe('projected')
  })
  it('projection failure keeps committed facts and retry only repairs derived rows', async () => {
    const once = { ...intent, commandId: 'projection-retry' }
    faultInjection.enable(); faultInjection.inject('mid_projection', () => { throw new Error('index') })
    await store.getState().setDone(once)
    const before = await db.tasks.get('t')
    expect(before?.done).toBe(true)
    expect(store.getState().feedback).toHaveLength(0)
    expect(store.getState().completions.t.phase).toBe('sync-pending')
    faultInjection.clear()
    await store.getState().setDone(once)
    expect((await db.tasks.get('t'))?.completedAt).toBe(before?.completedAt)
    expect(await db.operationJournal.where('eventType').equals('task.completed').count()).toBe(1)
    expect(await db.timelineEvents.count()).toBe(1)
    expect(store.getState().feedback).toHaveLength(1)
  })
  it('delayed projection cannot produce early feedback', async () => {
    let release!: () => void
    faultInjection.enable(); faultInjection.inject('mid_projection', () => new Promise<void>((resolve) => { release = resolve }))
    const running = store.getState().setDone({ ...intent, commandId: 'delayed' })
    while (!release) await new Promise((resolve) => setTimeout(resolve, 1))
    expect((await db.tasks.get('t'))?.done).toBe(true)
    expect(store.getState().feedback).toHaveLength(0)
    release(); await running
    expect(store.getState().feedback).toHaveLength(1)
  })
  it('uncertain post-commit failure is repaired without repeating the business write', async () => {
    const once = { ...intent, commandId: 'uncertain' }
    faultInjection.enable(); faultInjection.inject('after_domain_commit', () => { throw new Error('crash') })
    await store.getState().setDone(once)
    expect(store.getState().completions.t.phase).toBe('sync-pending')
    faultInjection.clear(); await store.getState().setDone(once)
    expect(await db.operationJournal.where('eventType').equals('task.completed').count()).toBe(1)
    expect(await db.timelineEvents.count()).toBe(1)
  })
  it('undo completion removes derived completion and updates local day memory', async () => {
    await store.getState().setDone({ ...intent, commandId: 'complete-undo-test' })
    await store.getState().setDone({ taskId: 't', desiredDone: false, commandId: 'undo' })
    expect(await db.timelineEvents.count()).toBe(0)
    const row = await db.dailyMemory.where('date').equals(formatDate(new Date())).first()
    expect(row?.facts.work.tasksCompleted).toBe(0)
  })
  it('restart restores projection-only repair and never replays historical celebration', async () => {
    const once = { ...intent, commandId: 'restart' }
    faultInjection.enable(); faultInjection.inject('mid_projection', () => { throw new Error('index') })
    await store.getState().setDone(once)
    store.setState({ completions: {}, feedback: [] })
    await db.pruneSystemCommandIds(-1)
    await store.getState().loadTasks()
    expect(store.getState().completions.t.phase).toBe('sync-pending')
    faultInjection.clear()
    await store.getState().setDone(store.getState().completions.t)
    expect(await db.timelineEvents.count()).toBe(1)
    expect(store.getState().feedback).toHaveLength(0)
    expect((await db.systemCommandIds.get('task.setDone:restart'))?.projectionRecovery).toBeUndefined()
  })
  it('cold replay does not celebrate a historical command', async () => {
    await store.getState().setDone({ ...intent, commandId: 'cold' })
    store.setState({ completions: {}, feedback: [] })
    await store.getState().setDone({ ...intent, commandId: 'cold' })
    expect(store.getState().feedback).toHaveLength(0)
  })
})
