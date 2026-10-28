import { isActiveTask } from '@/domain/planning/taskLifecycle'
// ============================================================
// V9 WORK — Flex Study 计划项 Store（V9-C-001 §4.15 / V9-C-004）
// 引用 tasks.id（string，直引不转换）；默认建议映射 P0→must 等
// 绝不修改任务原始内容——计划项只是引用 + 排程元数据
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Flexibility, PlanningMode, Priority, StudyPlanItem } from '../types'
import { planToday, getPlanningMode, setPlanningMode, type PlanItem, type FlexOutput } from '../domain/work/flexStudy'

export const DEFAULT_PRIORITY_MAP: Record<string, Priority> = { P0: 'must', P1: 'should', P2: 'could' }

interface StudyPlanState {
  items: PlanItem[]
  loading: boolean

  loadPlan: (date: string) => Promise<void>
  generateFromTasks: (date: string) => Promise<number>
  updateItem: (id: number, updates: Partial<StudyPlanItem>) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  plan: (date: string, availableMinutes: number, energy: number) => Promise<FlexOutput & { planningMode: PlanningMode }>
  getMode: () => Promise<PlanningMode>
  setMode: (mode: PlanningMode) => Promise<void>
}

export const useStudyPlanStore = create<StudyPlanState>((set, get) => ({
  items: [],
  loading: false,

  loadPlan: async (date) => {
    set({ loading: true })
    try {
      const rows = await db.studyPlanItems.where('planDate').equals(date).toArray()
      const taskIds = [...new Set(rows.map((r) => r.taskId))]
      const tasks = await db.tasks.bulkGet(taskIds)
      const taskMap = new Map(tasks.filter(Boolean).map((t) => [t!.id, t!]))
      const items: PlanItem[] = rows
        .map((r) => {
          const task = taskMap.get(r.taskId)
          return {
            ...r,
            title: task?.title,
            deadline: task?.dueDate,
            pinned: task?.pinned,
            taskPriority: task?.priority,
            taskCreatedAt: task?.createdAt,
          }
        })
        .sort((a, b) => a.id - b.id)
      set({ items, loading: false })
    } catch (err) {
      console.error('[StudyPlanStore] loadPlan failed:', err)
      set({ items: [], loading: false })
    }
  },

  /** 从今日任务生成计划项（幂等：同 taskId+planDate 已存在则跳过）；返回新增数 */
  generateFromTasks: async (date) => {
    const tasks = await db.tasks.where('dueDate').equals(date).toArray()
    const openTasks = tasks.filter((t) => !t.done && isActiveTask(t))
    const existing = await db.studyPlanItems.where('planDate').equals(date).toArray()
    const existingKeys = new Set(existing.map((e) => `${e.taskId}`))

    const toAdd: Omit<StudyPlanItem, 'id'>[] = []
    for (const task of openTasks) {
      if (existingKeys.has(task.id)) continue
      const now = new Date().toISOString()
      toAdd.push({
        taskId: task.id, // 直引 string，不做隐式转换（Patch C-001-01）
        planDate: date,
        priority: DEFAULT_PRIORITY_MAP[task.priority] ?? 'should',
        flexibility: 'flexible',
        // 优先使用任务上设置的预估时间（计划详情里的「预估时间」），否则默认 30
        estimatedMinutes: task.estimatedMinutes ?? 30,
        actualMinutes: null,
        state: 'pending',
        sortOrder: null,
        note: '',
        createdAt: now,
        updatedAt: now,
      })
    }
    if (toAdd.length === 0) return 0

    const { result } = await runCommand<number>({
      commandType: 'studyPlan.generateFromTasks',
      commandId: 'cmd_' + uid(),
      tables: ['studyPlanItems'],
      mutate: async () => {
        for (const row of toAdd) {
          await db.studyPlanItems.add(row)
        }
        return toAdd.length
      },
      afterCommit: async () => {
        await get().loadPlan(date)
      },
    })
    return result!
  },

  updateItem: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'studyPlan.updateItem',
      commandId: 'cmd_' + uid(),
      tables: ['studyPlanItems'],
      mutate: async () => {
        await db.studyPlanItems.update(id, { ...updates, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: now } : it)),
        }))
      },
    })
  },

  deleteItem: async (id) => {
    await runCommand({
      commandType: 'studyPlan.deleteItem',
      commandId: 'cmd_' + uid(),
      tables: ['studyPlanItems'],
      mutate: async () => {
        await db.studyPlanItems.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
      },
    })
  },

  plan: async (date, availableMinutes, energy) => {
    if (get().items.length === 0 || get().items[0]?.planDate !== date) {
      await get().loadPlan(date)
    }
    return planToday(availableMinutes, energy, get().items)
  },

  getMode: async () => getPlanningMode(),

  setMode: async (mode) => {
    await setPlanningMode(mode)
  },
}))
