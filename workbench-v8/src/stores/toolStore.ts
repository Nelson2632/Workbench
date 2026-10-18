// ============================================================
// Personal Workbench V8 — Tool Store (Pomodoro, Finance, Countdowns)
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate } from '../utils/helpers'
import type { PomodoroLog, Finance, Countdown, FinanceType, CountdownType } from '../types'

interface PomodoroTimerState {
  running: boolean
  remain: number // seconds
  total: number // seconds
}

interface ToolState {
  pomodoroLogs: PomodoroLog[]
  finance: Finance[]
  countdowns: Countdown[]
  loading: boolean

  // Pomodoro timer state
  timer: PomodoroTimerState
  startTimer: (duration?: number) => void
  pauseTimer: () => void
  resetTimer: () => void

  // Pomodoro logs
  loadPomodoroLogs: () => Promise<void>
  commitPomodoroLog: (log: PomodoroLog) => Promise<void>
  addPomodoroLog: (log: Partial<PomodoroLog> & { duration: number; date: string }) => Promise<void>
  updatePomodoroLog: (id: string, updates: Partial<PomodoroLog>) => Promise<void>
  deletePomodoroLog: (id: string) => Promise<void>

  // Finance
  loadFinance: () => Promise<void>
  addFinance: (item: Partial<Finance> & { type: FinanceType; title: string; amount: number; date: string }) => Promise<void>
  updateFinance: (id: string, updates: Partial<Finance>) => Promise<void>
  deleteFinance: (id: string) => Promise<void>

  // Countdowns
  loadCountdowns: () => Promise<void>
  addCountdown: (item: Partial<Countdown> & { title: string; targetDate: string; type: CountdownType }) => Promise<void>
  updateCountdown: (id: string, updates: Partial<Countdown>) => Promise<void>
  deleteCountdown: (id: string) => Promise<void>
}

let timerInterval: ReturnType<typeof setInterval> | null = null

export const useToolStore = create<ToolState>((set, get) => ({
  pomodoroLogs: [],
  finance: [],
  countdowns: [],
  loading: false,

  timer: {
    running: false,
    remain: 25 * 60,
    total: 25 * 60,
  },

  // ---- Pomodoro Timer ----

  startTimer: (duration = 25) => {
    // Clear existing timer
    if (timerInterval) clearInterval(timerInterval)

    const totalSeconds = duration * 60
    set({
      timer: { running: true, remain: totalSeconds, total: totalSeconds },
    })

    timerInterval = setInterval(() => {
      const { timer } = get()
      if (timer.remain <= 1) {
        // Timer complete
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = null
        set({ timer: { running: false, remain: 0, total: timer.total } })

        // Auto-save pomodoro log（经 Mutation Lane，fire-and-forget）
        const log: PomodoroLog = {
          id: uid(),
          date: formatDate(new Date()),
          duration: timer.total / 60,
          completed: true,
        }
        void get().commitPomodoroLog(log)
      } else {
        set({ timer: { ...timer, remain: timer.remain - 1 } })
      }
    }, 1000)
  },

  pauseTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    set((s) => ({ timer: { ...s.timer, running: false } }))
  },

  resetTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    const total = 25 * 60
    set({ timer: { running: false, remain: total, total } })
  },

  // ---- Pomodoro Logs ----

  loadPomodoroLogs: async () => {
    set({ loading: true })
    const pomodoroLogs = await db.pomodoroLogs.toArray()
    set({ pomodoroLogs, loading: false })
  },

  commitPomodoroLog: async (log) => {
    await runCommand({
      commandType: 'pomodoro.complete',
      commandId: 'cmd_' + uid(),
      tables: ['pomodoroLogs'],
      mutate: async () => {
        await db.pomodoroLogs.add(log)
      },
      events: () => [{ type: 'pomodoro.completed', duration: log.duration }],
      afterCommit: () => {
        set((s) => ({ pomodoroLogs: [...s.pomodoroLogs, log] }))
      },
    })
  },

  addPomodoroLog: async (log) => {
    const newLog: PomodoroLog = {
      id: uid(),
      date: log.date,
      duration: log.duration,
      subject: log.subject,
      completed: log.completed ?? true,
    }
    await runCommand({
      commandType: 'pomodoro.add',
      commandId: 'cmd_' + uid(),
      tables: ['pomodoroLogs'],
      mutate: async () => {
        await db.pomodoroLogs.add(newLog)
      },
      afterCommit: () => {
        set((s) => ({ pomodoroLogs: [...s.pomodoroLogs, newLog] }))
      },
    })
  },

  updatePomodoroLog: async (id, updates) => {
    await runCommand({
      commandType: 'pomodoro.update',
      commandId: 'cmd_' + uid(),
      tables: ['pomodoroLogs'],
      mutate: async () => {
        await db.pomodoroLogs.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          pomodoroLogs: s.pomodoroLogs.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }))
      },
    })
  },

  deletePomodoroLog: async (id) => {
    await runCommand({
      commandType: 'pomodoro.delete',
      commandId: 'cmd_' + uid(),
      tables: ['pomodoroLogs'],
      mutate: async () => {
        await db.pomodoroLogs.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ pomodoroLogs: s.pomodoroLogs.filter((p) => p.id !== id) }))
      },
    })
  },

  // ---- Finance ----

  loadFinance: async () => {
    set({ loading: true })
    const finance = await db.finance.toArray()
    set({ finance, loading: false })
  },

  addFinance: async (item) => {
    const newFinance: Finance = {
      id: uid(),
      type: item.type,
      title: item.title,
      amount: item.amount,
      category: item.category || '',
      tags: item.tags || [],
      date: item.date,
      note: item.note || '',
    }
    await runCommand({
      commandType: 'finance.add',
      commandId: 'cmd_' + uid(),
      tables: ['finance'],
      mutate: async () => {
        await db.finance.add(newFinance)
      },
      afterCommit: () => {
        set((s) => ({ finance: [...s.finance, newFinance] }))
      },
    })
  },

  updateFinance: async (id, updates) => {
    await runCommand({
      commandType: 'finance.update',
      commandId: 'cmd_' + uid(),
      tables: ['finance'],
      mutate: async () => {
        await db.finance.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          finance: s.finance.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        }))
      },
    })
  },

  deleteFinance: async (id) => {
    await runCommand({
      commandType: 'finance.delete',
      commandId: 'cmd_' + uid(),
      tables: ['finance'],
      mutate: async () => {
        await db.finance.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ finance: s.finance.filter((f) => f.id !== id) }))
      },
    })
  },

  // ---- Countdowns ----

  loadCountdowns: async () => {
    set({ loading: true })
    const countdowns = await db.countdowns.toArray()
    set({ countdowns, loading: false })
  },

  addCountdown: async (item) => {
    const newCountdown: Countdown = {
      id: uid(),
      title: item.title,
      targetDate: item.targetDate,
      type: item.type,
      showOnHome: item.showOnHome ?? true,
    }
    await runCommand({
      commandType: 'countdown.add',
      commandId: 'cmd_' + uid(),
      tables: ['countdowns'],
      mutate: async () => {
        await db.countdowns.add(newCountdown)
      },
      afterCommit: () => {
        set((s) => ({ countdowns: [...s.countdowns, newCountdown] }))
      },
    })
  },

  updateCountdown: async (id, updates) => {
    await runCommand({
      commandType: 'countdown.update',
      commandId: 'cmd_' + uid(),
      tables: ['countdowns'],
      mutate: async () => {
        await db.countdowns.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          countdowns: s.countdowns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }))
      },
    })
  },

  deleteCountdown: async (id) => {
    await runCommand({
      commandType: 'countdown.delete',
      commandId: 'cmd_' + uid(),
      tables: ['countdowns'],
      mutate: async () => {
        await db.countdowns.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== id) }))
      },
    })
  },
}))
