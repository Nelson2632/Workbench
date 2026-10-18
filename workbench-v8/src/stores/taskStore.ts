// ============================================================
// Personal Workbench V8 — Task Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import type { Task, TaskPriority } from '../types'

interface TaskState {
  tasks: Task[]
  loading: boolean

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

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  loadTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await db.tasks.toArray()
      set({ tasks, loading: false })
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
      afterCommit: () => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },
    })
  },

  toggleDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const done = !task.done
    const now = new Date().toISOString()
    // V9（V9-C-001 §2 允许增量）：completedAt 落库（投影与 Daily Memory 事实源）
    const completedAt = done ? now : null
    await runCommand({
      commandType: 'task.toggleDone',
      commandId: 'cmd_' + uid(),
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.update(id, { done, completedAt, updatedAt: now } as Partial<Task>)
      },
      events: () => {
        const evts: AppEvent[] = []
        if (done) {
          evts.push({ type: 'task.completed', taskId: id, completedAt: now })
        }
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done, completedAt, updatedAt: now } : t,
          ),
        }))
      },
    })
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
    return get().tasks.filter((t) => t.dueDate === today && !t.done)
  },

  getInboxTasks: () => {
    return get().tasks.filter((t) => !t.dueDate && !t.projectId && !t.done)
  },

  getFutureTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => !t.done && t.dueDate && t.dueDate > today)
  },
}))