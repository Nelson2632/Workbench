// ============================================================
// Personal Workbench V9 — LIFE Diary Store（V9-C-001 §4.1/4.2）
// Diary：Quick/Long、心情、天气、标签、照片引用；Life Moments
// 域内直接操作自身数据服务；跨域联动只发事件（V9-C-002 §1.3）
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Diary, DiaryType, LifeMoment, Mood, Weather } from '../types'

export interface DiaryInput {
  date: string
  type?: DiaryType
  mood?: Mood | null
  weather?: Weather | null
  title?: string
  content: string
  tags?: string[]
  photos?: string[]
}

interface DiaryState {
  diaries: Diary[]
  lifeMoments: LifeMoment[]
  loading: boolean

  loadRange: (from: string, to: string) => Promise<void>
  addDiary: (input: DiaryInput) => Promise<number>
  updateDiary: (id: number, updates: Partial<Diary>) => Promise<void>
  deleteDiary: (id: number) => Promise<void>
  addLifeMoment: (date: string, content: string) => Promise<number>
  deleteLifeMoment: (id: number) => Promise<void>
}

export const useDiaryStore = create<DiaryState>((set) => ({
  diaries: [],
  lifeMoments: [],
  loading: false,

  loadRange: async (from, to) => {
    set({ loading: true })
    try {
      const [diaries, lifeMoments] = await Promise.all([
        db.diaries.where('date').between(from, to, true, true).toArray(),
        db.lifeMoments.where('date').between(from, to, true, true).toArray(),
      ])
      set({ diaries, lifeMoments, loading: false })
    } catch (err) {
      console.error('[DiaryStore] loadRange failed:', err)
      set({ diaries: [], lifeMoments: [], loading: false })
    }
  },

  addDiary: async (input) => {
    const now = new Date().toISOString()
    const type = input.type ?? (input.content.length <= 140 ? 'quick' : 'long')
    const row: Omit<Diary, 'id'> = {
      date: input.date,
      type,
      mood: input.mood ?? null,
      weather: input.weather ?? null,
      title: input.title ?? '',
      content: input.content,
      photos: input.photos ?? [],
      tags: [...new Set(input.tags ?? [])],
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'diary.create',
      commandId: 'cmd_' + uid(),
      tables: ['diaries'],
      mutate: async () => db.diaries.add(row),
      events: (id) => [{ type: 'diary.created', diaryId: id }],
      afterCommit: (id) => {
        set((s) => ({ diaries: [...s.diaries, { ...row, id }] }))
      },
    })
    return result!
  },

  updateDiary: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'diary.update',
      commandId: 'cmd_' + uid(),
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.update(id, { ...updates, updatedAt: now })
      },
      events: () => [{ type: 'diary.updated', diaryId: id }],
      afterCommit: () => {
        set((s) => ({
          diaries: s.diaries.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: now } : d)),
        }))
      },
    })
  },

  deleteDiary: async (id) => {
    await runCommand({
      commandType: 'diary.delete',
      commandId: 'cmd_' + uid(),
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.delete(id)
      },
      events: () => [{ type: 'diary.deleted', diaryId: id }],
      afterCommit: () => {
        set((s) => ({ diaries: s.diaries.filter((d) => d.id !== id) }))
      },
    })
  },

  addLifeMoment: async (date, content) => {
    const now = new Date().toISOString()
    const row: Omit<LifeMoment, 'id'> = {
      date,
      content,
      photoRefs: [],
      createdAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'lifeMoment.create',
      commandId: 'cmd_' + uid(),
      tables: ['lifeMoments'],
      mutate: async () => db.lifeMoments.add(row),
      events: (id) => [{ type: 'lifeMoment.created', lifeMomentId: id }],
      afterCommit: (id) => {
        set((s) => ({ lifeMoments: [...s.lifeMoments, { ...row, id }] }))
      },
    })
    return result!
  },

  deleteLifeMoment: async (id) => {
    await runCommand({
      commandType: 'lifeMoment.delete',
      commandId: 'cmd_' + uid(),
      tables: ['lifeMoments'],
      mutate: async () => {
        await db.lifeMoments.delete(id)
      },
      events: () => [{ type: 'lifeMoment.deleted', lifeMomentId: id }],
      afterCommit: () => {
        set((s) => ({ lifeMoments: s.lifeMoments.filter((m) => m.id !== id) }))
      },
    })
  },
}))
