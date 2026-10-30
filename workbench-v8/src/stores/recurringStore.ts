// ============================================================
// Personal Workbench V8 — Recurring Task Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate } from '../utils/helpers'
import { shouldGenerateForDate } from '../domain/planning/recurringGenerator'
import type { AppEvent } from '../domain/events/eventBus'
import type { RecurringTask, Task } from '../types'

interface RecurringState {
  recurringTasks: RecurringTask[]
  loading: boolean

  loadRecurring: () => Promise<void>
  addRecurring: (task: Partial<RecurringTask> & { title: string; rule: RecurringTask['rule'] }) => Promise<void>
  updateRecurring: (id: string, updates: Partial<RecurringTask>) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>
  toggleEnabled: (id: string) => Promise<void>
  generateTodayTasks: () => Promise<Task[]>
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  recurringTasks: [],
  loading: false,

  loadRecurring: async () => {
    set({ loading: true })
    const recurringTasks = await db.recurringTasks.toArray()
    set({ recurringTasks, loading: false })
  },

  addRecurring: async (task) => {
    const newRecurring: RecurringTask = {
      id: uid(),
      title: task.title,
      rule: task.rule,
      time: task.time || '',
      priority: task.priority || 'P2',
      category: task.category || '',
      startDate: task.startDate || formatDate(new Date()),
      endDate: task.endDate || '',
      enabled: task.enabled ?? true,
      lastGeneratedDate: task.lastGeneratedDate,
      description: task.description || '',
      deadline: task.deadline || '',
      subject: task.subject || '',
      estimatedMinutes: task.estimatedMinutes,
    }
    await runCommand({
      commandType: 'recurring.create',
      commandId: 'cmd_' + uid(),
      tables: ['recurringTasks'],
      mutate: async () => {
        await db.recurringTasks.add(newRecurring)
      },
      afterCommit: () => {
        set((s) => ({ recurringTasks: [...s.recurringTasks, newRecurring] }))
      },
    })
  },

  updateRecurring: async (id, updates) => {
    await runCommand({
      commandType: 'recurring.update',
      commandId: 'cmd_' + uid(),
      tables: ['recurringTasks'],
      mutate: async () => {
        await db.recurringTasks.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          recurringTasks: s.recurringTasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }))
      },
    })
  },

  deleteRecurring: async (id) => {
    await runCommand({
      commandType: 'recurring.delete',
      commandId: 'cmd_' + uid(),
      tables: ['recurringTasks'],
      mutate: async () => {
        await db.recurringTasks.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ recurringTasks: s.recurringTasks.filter((t) => t.id !== id) }))
      },
    })
  },

  toggleEnabled: async (id) => {
    const task = get().recurringTasks.find((t) => t.id === id)
    if (!task) return
    const enabled = !task.enabled
    await runCommand({
      commandType: 'recurring.toggleEnabled',
      commandId: 'cmd_' + uid(),
      tables: ['recurringTasks'],
      mutate: async () => {
        await db.recurringTasks.update(id, { enabled })
      },
      afterCommit: () => {
        set((s) => ({
          recurringTasks: s.recurringTasks.map((t) =>
            t.id === id ? { ...t, enabled } : t,
          ),
        }))
      },
    })
  },

  generateTodayTasks: async () => {
    const today = formatDate(new Date())
    const now = new Date()
    const { result } = await runCommand<{ generatedTasks: Task[]; byRule: Record<string, string[]> }>({
      commandType: 'recurring.generateToday',
      // 语义化 commandId：同一天重复触发会被幂等去重，避免重复生成 + 幂等表膨胀
      commandId: 'recurring.generateToday:' + today,
      tables: ['tasks', 'recurringTasks'],
      mutate: async () => {
        const generatedTasks: Task[] = []
        const byRule: Record<string, string[]> = {}
        // Read canonical rules inside the transaction: the page can mount before store hydration.
        for (const rt of await db.recurringTasks.toArray()) {
          if (!shouldGenerateForDate(rt, now)) continue
          const task: Task = {
            id: uid(),
            title: rt.title,
            priority: rt.priority,
            done: false,
            note: rt.description || '',
            projectId: '',
            dueDate: today,
            pinned: false,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            sourceRecurringId: rt.id,
            deadline: rt.deadline,
            subject: rt.subject,
            estimatedMinutes: rt.estimatedMinutes,
          }
          await db.tasks.add(task)
          generatedTasks.push(task)
          byRule[rt.id] = byRule[rt.id] || []
          byRule[rt.id].push(task.id)
          await db.recurringTasks.update(rt.id, { lastGeneratedDate: today })
        }
        return { generatedTasks, byRule }
      },
      events: ({ byRule }) => {
        const evts: AppEvent[] = []
        for (const [ruleId, taskIds] of Object.entries(byRule)) {
          evts.push({ type: 'recurring.generated', ruleId, taskIds })
        }
        return evts
      },
      afterCommit: ({ byRule }) => {
        // 空生成时不更新 state：避免 recurringTasks 引用变化 → useEffect 死循环
        if (Object.keys(byRule).length === 0) return
        set((s) => ({
          recurringTasks: s.recurringTasks.map((rt) =>
            byRule[rt.id] != null ? { ...rt, lastGeneratedDate: today } : rt,
          ),
        }))
      },
    })
    // A replay creates no new tasks; Mutation Lane deliberately returns null.
    return result?.generatedTasks ?? []
  },
}))
