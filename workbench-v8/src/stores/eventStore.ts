// ============================================================
// Personal Workbench V9 — LIFE Calendar/Event Store（V9-C-001 §4.3）
// 独立实体；日历视图同时投影 tasks/exams（只读，不复制）
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import type { CalendarEvent } from '../types'

export interface EventInput {
  date: string
  title: string
  note?: string
  allDay?: boolean
  location?: string
  startTime?: string | null
  endTime?: string | null
  reminder?: string | null
  repeat?: string | null
}

interface EventState {
  events: CalendarEvent[]
  repeating: CalendarEvent[]
  loading: boolean

  loadRange: (from: string, to: string) => Promise<void>
  loadRepeating: () => Promise<void>
  addEvent: (input: EventInput) => Promise<number>
  updateEvent: (id: number, updates: Partial<CalendarEvent>) => Promise<void>
  toggleDone: (id: number) => Promise<void>
  deleteEvent: (id: number) => Promise<void>
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  repeating: [],
  loading: false,

  loadRange: async (from, to) => {
    set({ loading: true })
    try {
      const events = await db.events.where('date').between(from, to, true, true).toArray()
      set({ events, loading: false })
    } catch (err) {
      console.error('[EventStore] loadRange failed:', err)
      set({ events: [], loading: false })
    }
  },

  // 载入所有重复事件（用于日历按规则展开未来实例；repeat 非索引，走内存过滤）
  loadRepeating: async () => {
    try {
      const all = await db.events.toArray()
      set({ repeating: all.filter((e) => e.repeat) })
    } catch (err) {
      console.error('[EventStore] loadRepeating failed:', err)
      set({ repeating: [] })
    }
  },

  addEvent: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<CalendarEvent, 'id'> = {
      date: input.date,
      type: 'custom',
      title: input.title,
      note: input.note ?? '',
      allDay: input.allDay ?? true,
      location: input.location ?? '',
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      reminder: input.reminder ?? null,
      repeat: input.repeat ?? null,
      sourceType: null,
      sourceId: null,
      doneAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'event.create',
      commandId: 'cmd_' + uid(),
      tables: ['events'],
      mutate: async () => db.events.add(row),
      events: (id) => [{ type: 'event.created', eventId: id }],
      afterCommit: (id) => {
        set((s) => ({ events: [...s.events, { ...row, id }] }))
      },
    })
    return result!
  },

  updateEvent: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'event.update',
      commandId: 'cmd_' + uid(),
      tables: ['events'],
      mutate: async () => {
        await db.events.update(id, { ...updates, updatedAt: now })
      },
      events: () => [{ type: 'event.updated', eventId: id }],
      afterCommit: () => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e)),
        }))
      },
    })
  },

  toggleDone: async (id) => {
    const target = useEventStore.getState().events.find((e) => e.id === id)
    if (!target) return
    const now = new Date().toISOString()
    const doneAt = target.doneAt ? null : now
    const completed = doneAt != null
    await runCommand({
      commandType: 'event.toggleDone',
      commandId: 'cmd_' + uid(),
      tables: ['events'],
      mutate: async () => {
        await db.events.update(id, { doneAt, updatedAt: now })
      },
      events: () => {
        const evts: AppEvent[] = []
        if (completed) {
          evts.push({ type: 'event.completed', eventId: id })
        } else {
          evts.push({ type: 'event.updated', eventId: id })
        }
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, doneAt, updatedAt: now } : e)),
        }))
      },
    })
  },

  deleteEvent: async (id) => {
    await runCommand({
      commandType: 'event.delete',
      commandId: 'cmd_' + uid(),
      tables: ['events'],
      mutate: async () => {
        await db.events.delete(id)
      },
      events: () => [{ type: 'event.deleted', eventId: id }],
      afterCommit: () => {
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
      },
    })
  },
}))
