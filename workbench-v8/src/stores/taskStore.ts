import { isActiveTask } from '@/domain/planning/taskLifecycle'
// ============================================================
// Personal Workbench V8 — Task Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate, timestampDay } from '../utils/helpers'
import { commandAlreadyProcessed, commandKey } from '../db/mutationLane'
import { projectTaskCompletion } from '../domain/projection/criticalProjection'
import type { AppEvent } from '../domain/events/eventBus'
import type { Task, TaskPriority } from '../types'

export interface CompletionIntent { taskId: string; desiredDone: boolean; commandId: string }
export interface CompletionState extends CompletionIntent {
  phase: 'persisting' | 'committed' | 'sync-pending' | 'failed-persist' | 'projected'
  title: string
  silent?: boolean
  dates: string[]
}
interface TaskState {
  completions: Record<string, CompletionState>
  feedback: { taskId: string; commandId: string; title: string }[]
  setDone: (intent: CompletionIntent) => Promise<void>
  dismissFeedback: (commandId: string) => void
  tasks: Task[]
  loading: boolean

  restoreCompletionRetries: () => Promise<void>
  loadTasks: () => Promise<void>
  addTask: (task: Partial<Task> & { title: string }) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  getTodayTasks: () => Task[]
  getInboxTasks: () => Task[]
  getFutureTasks: () => Task[]
}

const feedbackShown = new Set<string>()

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  completions: {},
  feedback: [],
  dismissFeedback: (commandId) => set((s) => ({ feedback: s.feedback.filter((f) => f.commandId !== commandId) })),
  loading: false,

  restoreCompletionRetries: async () => {
    const pending = await db.systemCommandIds.filter((row) => !!row.projectionRecovery).toArray()
    set((s) => {
      const completions = { ...s.completions }
      for (const row of pending) {
        const recovery = row.projectionRecovery!
        if (completions[recovery.taskId]) continue
        completions[recovery.taskId] = { ...recovery, commandId: row.commandId, phase: 'sync-pending',
          title: s.tasks.find((t) => t.id === recovery.taskId)?.title || '任务', silent: true }
      }
      return { completions }
    })
  },

  loadTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await db.tasks.toArray()
      set({ tasks, loading: false })
      await get().restoreCompletionRetries()
    } catch (err) {
      console.error('[TaskStore] Failed to load tasks:', err)
      set({ loading: false })
    }
  },

  addTask: async (task) => {
    const now = new Date().toISOString()
    const newTask: Task = {
      id: uid(),
      title: task.title,
      priority: task.priority || 'P2',
      done: false,
      note: task.note || '',
      projectId: task.projectId || '',
      dueDate: task.dueDate || '',
      pinned: task.pinned ?? false,
      createdAt: now,
      updatedAt: now,
      sourceRecurringId: task.sourceRecurringId,
    }
    await runCommand({
      commandType: 'task.create',
      commandId: 'cmd_' + uid(),
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add(newTask)
      },
      events: () => [{ type: 'task.created', taskId: newTask.id }],
      afterCommit: () => {
        set((s) => ({ tasks: [...s.tasks, newTask] }))
      },
    })
  },

  updateTask: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'task.update',
      commandId: 'cmd_' + uid(),
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.update(id, { ...updates, updatedAt: now })
      },
      events: () => [{ type: 'task.updated', taskId: id }],
      afterCommit: () => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now } : t,
          ),
        }))
      },
    })
  },

  deleteTask: async (id) => {
    await runCommand({
      commandType: 'task.delete',
      commandId: 'cmd_' + uid(),
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.delete(id)
      },
      events: () => [{ type: 'task.deleted', taskId: id }],
      afterCommit: () => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },
    })
  },

  // Compatibility entry point for existing pages. A pending/failed intent is
  // retained; explicit setDone is the command boundary used by new callers.
  toggleDone: async (id) => {
    const previous = get().completions[id]
    if (previous && previous.phase !== 'projected') {
      await get().setDone(previous)
      return
    }
    const task = get().tasks.find((t) => t.id === id)
    if (task) await get().setDone({ taskId: id, desiredDone: !task.done, commandId: 'cmd_' + uid() })
  },

  setDone: async (intent) => {
    const { taskId, desiredDone, commandId } = intent
    const previous = get().completions[taskId]
    if (previous?.phase === 'persisting' || previous?.phase === 'committed') return
    if (previous?.commandId === commandId && previous.phase === 'projected') return
    const current = get().tasks.find((t) => t.id === taskId)
    const dates = previous?.commandId === commandId ? previous.dates : [
      ...(current?.completedAt ? [timestampDay(current.completedAt)] : []), formatDate(new Date()),
    ]
    const state: CompletionState = { ...intent, phase: 'persisting', title: current?.title || '任务', dates, silent: previous?.silent }
    const change = (phase: CompletionState['phase']) => set((s) => ({
      completions: { ...s.completions, [taskId]: { ...state, phase } },
    }))
    change('persisting')
    let events: AppEvent[] = []
    const sync = async () => {
      const fact = await db.tasks.get(taskId)
      set((s) => ({ tasks: fact ? s.tasks.map((t) => t.id === taskId ? fact : t) : s.tasks.filter(t => t.id !== taskId) }))
      if (fact?.completedAt) dates.push(timestampDay(fact.completedAt))
      // Replays repair projections from canonical current state, never rewrite it.
      events = [{ type: 'task.updated', taskId }]
      await projectTaskCompletion(events, dates)
    }
    try {
      const receipt = await runCommand({
        commandType: 'task.setDone', commandId, tables: ['tasks'],
        projectionRecovery: { taskId, desiredDone, dates },
        mutate: async () => {
          const task = await db.tasks.get(taskId)
          if (!task) throw new Error('任务已不存在')
          if (task.completedAt) dates.push(timestampDay(task.completedAt))
          if (task.done === desiredDone) return { task, changed: false }
          const now = new Date().toISOString()
          const updated = { ...task, done: desiredDone, completedAt: desiredDone ? now : null, updatedAt: now }
          await db.tasks.put(updated)
          return { task: updated, changed: true }
        },
        events: ({ task, changed }) => !changed ? [] : task.done
          ? [{ type: 'task.completed', taskId, completedAt: task.completedAt! }]
          : [{ type: 'task.updated', taskId }],
        afterCommit: ({ task }) => {
          set((s) => ({ tasks: s.tasks.map((t) => t.id === taskId ? task : t) }))
          change('committed')
        },
        projectCritical: async (evts) => {
          await projectTaskCompletion(evts, dates)
        },
      })
      if (receipt.deduped) {
        await sync()
        await db.systemCommandIds.update(commandKey('task.setDone', commandId), { projectionRecovery: undefined })
      }
      if (receipt.projection === 'pending') { change('sync-pending'); return }
      change('projected')
      const canonical = await db.tasks.get(taskId)
      // Deduplicate per intent for this session, including after feedback expires.
      if (!state.silent && desiredDone && canonical?.done && (receipt.result?.changed || previous?.commandId === commandId) && !feedbackShown.has(commandId)) {
        feedbackShown.add(commandId)
        set((s) => ({ feedback: [...s.feedback, { taskId, commandId, title: canonical.title }] }))
      }
    } catch (err) {
      // A crash hook or transport error may happen after the transaction committed.
      const persisted = await commandAlreadyProcessed('task.setDone', commandId).catch(() => false)
      if (persisted) await get().loadTasks()
      change(persisted ? 'sync-pending' : 'failed-persist')
      console.error('[TaskCompletion]', err)
    }
  },

  togglePin: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const pinned = !task.pinned
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'task.togglePin',
      commandId: 'cmd_' + uid(),
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.update(id, { pinned, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, pinned, updatedAt: now } : t,
          ),
        }))
      },
    })
  },

  getTodayTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => t.dueDate === today && !t.done && isActiveTask(t))
  },

  getInboxTasks: () => {
    return get().tasks.filter((t) => !t.dueDate && !t.projectId && !t.done && isActiveTask(t))
  },

  getFutureTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => !t.done && isActiveTask(t) && t.dueDate && t.dueDate > today)
  },
}))