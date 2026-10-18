// ============================================================
// V9 Module Health Matrix — WORK 部分（M3 Gate）
// TODAY数据层 / FLEX / NIGHTSHUTDOWN ×（STARTUP/CRUD/EMPTY/ERROR/RECOVERY/THEME）
// 含晚间学习闭环链路测试（V9_MASTER_PLAN 闭环 A）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useTaskStore } from '@/stores/taskStore'
import { useStudyStore } from '@/stores/studyStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyPlanStore } from '@/stores/studyPlanStore'
import { useNightShutdownStore } from '@/stores/nightShutdownStore'
import { useSystemStore } from '@/stores/systemStore'

const TODAY = '2026-08-30'
const NOON = new Date(2026, 7, 30, 12).toISOString()
const THEMES = ['mist', 'fluent', 'night']

async function reset() {
  useTaskStore.setState({ tasks: [], loading: false })
  useStudyStore.setState({ subjects: [], mistakes: [], exams: [], reading: [], loading: false })
  useReviewStore.setState({ reviews: [], templates: [], loading: false })
  useStudyPlanStore.setState({ items: [], loading: false })
  useNightShutdownStore.setState({ current: null, aggregate: null, loading: false })
}

describe('WORK Module Health Matrix（M3 Gate）', () => {
  beforeEach(async () => {
    // 固定时钟到契约样例日期，保证 completedAt 聚合与 Night Shutdown 当日口径确定性
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-30T20:00:00'))
    await db.delete()
    await db.open()
    eventBus.clear()
    await reset()
    await db.settings.put({ key: 'planningMode', value: 'adaptive' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('STARTUP：各域启动加载无异常', async () => {
    await useStudyPlanStore.getState().loadPlan(TODAY)
    await useNightShutdownStore.getState().loadByDate(TODAY)
    expect(useStudyPlanStore.getState().loading).toBe(false)
    expect(useNightShutdownStore.getState().loading).toBe(false)
  })

  it('EMPTY：空库零状态', async () => {
    await useStudyPlanStore.getState().loadPlan(TODAY)
    await useNightShutdownStore.getState().loadByDate(TODAY)
    expect(useStudyPlanStore.getState().items).toHaveLength(0)
    expect(useNightShutdownStore.getState().aggregate?.completed).toHaveLength(0)
    expect(useNightShutdownStore.getState().aggregate?.studyMinutes).toBe(0)
    expect(useNightShutdownStore.getState().current).toBeNull()
  })

  it('CRUD：计划项生成/更新/删除 + 收口 upsert', async () => {
    await db.tasks.add({
      id: 't1', title: '数学卷', priority: 'P0', done: false, note: '',
      projectId: '', dueDate: TODAY, pinned: false,
      createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    expect(useStudyPlanStore.getState().items).toHaveLength(1)
    const item = useStudyPlanStore.getState().items[0]
    await useStudyPlanStore.getState().updateItem(item.id, { estimatedMinutes: 40 })
    expect(useStudyPlanStore.getState().items[0].estimatedMinutes).toBe(40)
    await useStudyPlanStore.getState().deleteItem(item.id)
    expect(useStudyPlanStore.getState().items).toHaveLength(0)

    const id = await useNightShutdownStore.getState().complete({
      date: TODAY, reason: '', reflection: '矩阵', tomorrowFocus: ['x'],
    })
    expect(await db.nightShutdown.get(id)).toBeTruthy()
  })

  it('ERROR：读取失败不崩溃、状态回空', async () => {
    vi.spyOn(db.studyPlanItems, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useStudyPlanStore.getState().loadPlan(TODAY)
    expect(useStudyPlanStore.getState().items).toHaveLength(0)

    vi.spyOn(db.nightShutdown, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useNightShutdownStore.getState().loadByDate(TODAY)
    expect(useNightShutdownStore.getState().aggregate).toBeNull()
  })

  it('RECOVERY：错误恢复后可正常读取', async () => {
    await db.tasks.add({
      id: 't1', title: '数学卷', priority: 'P0', done: false, note: '',
      projectId: '', dueDate: TODAY, pinned: false,
      createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)
    await useStudyPlanStore.getState().generateFromTasks(TODAY)

    const spy = vi.spyOn(db.studyPlanItems, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useStudyPlanStore.getState().loadPlan(TODAY)
    expect(useStudyPlanStore.getState().items).toHaveLength(0)
    spy.mockRestore()

    await useStudyPlanStore.getState().loadPlan(TODAY)
    expect(useStudyPlanStore.getState().items).toHaveLength(1)
  })

  it('THEME：主题值域合法', () => {
    expect(THEMES).toContain(useSystemStore.getState().theme)
  })

  it('晚间学习闭环（闭环 A）：放学→Today→Flex→任务/错题/闪卡→收口→复盘→明日计划 数据管道全通', async () => {
    // 放学：今日任务入库
    await useTaskStore.getState().addTask({ title: '数学卷', priority: 'P0', dueDate: TODAY })
    await useTaskStore.getState().addTask({ title: '英语单词', priority: 'P1', dueDate: TODAY })

    // Today：生成计划 → MUST 在前
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    const plan = await useStudyPlanStore.getState().plan(TODAY, 90, 3)
    expect(plan.planningMode).toBe('adaptive')
    expect(plan.orderedQueue[0].priority).toBe('must')

    // 完成任务 → completedAt 写入（V9 附加字段）
    const taskId = plan.orderedQueue[0].taskId
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))
    await useTaskStore.getState().toggleDone(taskId)
    const doneTask = await db.tasks.get(taskId)
    expect(doneTask?.done).toBe(true)
    expect((doneTask as any).completedAt).toBeTruthy()

    // 错题攻克 → masteredAt + mistake.resolved
    await useStudyStore.getState().addMistake({ subject: '数学', question: '错题' })
    const mistakeId = useStudyStore.getState().mistakes[0].id
    await useStudyStore.getState().toggleMastered(mistakeId)
    const mistake = await db.mistakes.get(mistakeId)
    expect(mistake?.mastered).toBe(true)
    expect((mistake as any).masteredAt).toBeTruthy()

    // 闪卡复习
    await db.flashcardReviews.add({
      id: 'f1', flashcardId: 'c1', rating: 'got',
      reviewedAt: new Date().toISOString(), nextReviewAt: new Date().toISOString(),
    } as never)

    // Night Shutdown：聚合全部 → tomorrowFocus
    const shutdownId = await useNightShutdownStore.getState().complete({
      date: TODAY, reason: '时间不够', reflection: '今天数学有进步',
      tomorrowFocus: ['英语单词'],
    })
    const shutdown = await db.nightShutdown.get(shutdownId)
    expect(shutdown?.completed.map((c: any) => c.title)).toContain('数学卷')
    expect(shutdown?.unfinished.map((c: any) => c.title)).toContain('英语单词')
    expect(shutdown?.tomorrowFocus).toEqual(['英语单词'])
    const agg = await useNightShutdownStore.getState().aggregate
    void agg

    // Review：completedAt 写入（Patch C-002-03）+ review.completed 事件
    await useReviewStore.getState().addReview({
      type: 'daily',
      dateRange: { start: TODAY, end: TODAY },
      reflections: ['今天数学有进步'],
      nextActions: ['英语单词'],
    })
    const review = useReviewStore.getState().reviews.find((r) => r.dateRange.start === TODAY)
    expect(review?.completedAt).toBeTruthy()
    expect(seen).toContain('review.completed')
    expect(seen).toContain('nightShutdown.completed')
    expect(seen).toContain('mistake.resolved')

    // 明日计划数据管道：Review nextActions + Shutdown tomorrowFocus 均在事实表
    expect(review?.nextActions).toEqual(['英语单词'])
  })

  it('Flex 降级：异常 → manual 立即生效（硬安全阀）', async () => {
    await useTaskStore.getState().addTask({ title: '数学卷', priority: 'P0', dueDate: TODAY })
    await useStudyPlanStore.getState().generateFromTasks(TODAY)
    const seen: string[] = []
    eventBus.subscribeAll((e) => {
      if (e.type === 'flexStudy.fallback') seen.push(e.type)
    })
    // energy 非法 → 触发 fallback
    const out = await useStudyPlanStore.getState().plan(TODAY, 90, 99)
    expect(out.planningMode).toBe('manual')
    expect(seen).toContain('flexStudy.fallback')
    // manual 立即生效：后续排程直接走 V8 排序
    const again = await useStudyPlanStore.getState().plan(TODAY, 90, 3)
    expect(again.planningMode).toBe('manual')
  })
})
