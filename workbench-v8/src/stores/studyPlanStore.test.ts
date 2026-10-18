// ============================================================
// V9 StudyPlanStore 测试（V9-C-001 §4.15 / V9-C-004）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useStudyPlanStore, DEFAULT_PRIORITY_MAP } from './studyPlanStore'

const TODAY = '2026-08-30'

async function seedTasks(): Promise<void> {
  const now = '2026-08-30T00:00:00.000Z'
  await db.tasks.bulkAdd([
    { id: 't-p0', title: '数学卷', priority: 'P0', done: false, note: '', projectId: '', dueDate: TODAY, pinned: false, createdAt: now, updatedAt: now },
    { id: 't-p1', title: '英语单词', priority: 'P1', done: false, note: '', projectId: '', dueDate: TODAY, pinned: false, createdAt: now, updatedAt: now },
    { id: 't-p2', title: '阅读', priority: 'P2', done: false, note: '', projectId: '', dueDate: TODAY, pinned: false, createdAt: now, updatedAt: now },
    { id: 't-done', title: '已完成', priority: 'P0', done: true, note: '', projectId: '', dueDate: TODAY, pinned: false, createdAt: now, updatedAt: now },
  ] as never)
}

describe('StudyPlanStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useStudyPlanStore.setState({ items: [], loading: false })
    await db.settings.put({ key: 'planningMode', value: 'adaptive' })
  })

  it('默认映射：P0→must / P1→should / P2→could；已完成任务不生成', () => {
    expect(DEFAULT_PRIORITY_MAP).toEqual({ P0: 'must', P1: 'should', P2: 'could' })
  })

  it('generateFromTasks：生成计划项（幂等），taskId 直引 string', async () => {
    await seedTasks()
    const added = await useStudyPlanStore.getState().generateFromTasks(TODAY)
    expect(added).toBe(3) // t-done 已完成不生成
    const rows = await db.studyPlanItems.where('planDate').equals(TODAY).toArray()
    expect(rows).toHaveLength(3)
    const p0 = rows.find((r) => r.taskId === 't-p0')!
    expect(p0.priority).toBe('must')
    expect(typeof p0.taskId).toBe('string')

    // 幂等
    const again = await useStudyPlanStore.getState().generateFromTasks(TODAY)
    expect(again).toBe(0)
    expect(await db.studyPlanItems.where('planDate').equals(TODAY).count()).toBe(3)
  })

  it('loadPlan：联表任务快照（title/deadline/pinned/taskPriority）', async () => {
    await seedTasks()
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    await useStudyPlanStore.getState().loadPlan(TODAY)
    const items = useStudyPlanStore.getState().items
    expect(items).toHaveLength(3)
    const p0 = items.find((i) => i.taskId === 't-p0')!
    expect(p0.title).toBe('数学卷')
    expect(p0.deadline).toBe(TODAY)
    expect(p0.taskPriority).toBe('P0')
  })

  it('updateItem / deleteItem', async () => {
    await seedTasks()
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    const row = useStudyPlanStore.getState().items[0]
    await useStudyPlanStore.getState().updateItem(row.id, { estimatedMinutes: 45, priority: 'should' })
    expect(useStudyPlanStore.getState().items.find((i) => i.id === row.id)?.estimatedMinutes).toBe(45)
    await useStudyPlanStore.getState().deleteItem(row.id)
    expect(useStudyPlanStore.getState().items.find((i) => i.id === row.id)).toBeUndefined()
  })

  it('plan()：adaptive 输出 MUST 优先队列；切 manual 后走 V8 排序', async () => {
    await seedTasks()
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    const out = await useStudyPlanStore.getState().plan(TODAY, 120, 3)
    expect(out.planningMode).toBe('adaptive')
    expect(out.orderedQueue[0].priority).toBe('must')
    expect(out.orderedQueue[0].title).toBe('数学卷')

    await useStudyPlanStore.getState().setMode('manual')
    const manual = await useStudyPlanStore.getState().plan(TODAY, 120, 3)
    expect(manual.planningMode).toBe('manual')
  })
})
