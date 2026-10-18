// ============================================================
// V9 PLAY — Music Memory Store（V9-C-001 §4.10）
// 音乐档案：曲名/歌手/感想/收藏；无播放器
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { MusicMemory } from '../types'

export interface MusicInput {
  title: string
  artist: string
  album?: string | null
  genre?: string | null
  thoughts?: string
  favorite?: boolean
}

interface MusicState {
  musicList: MusicMemory[]
  loading: boolean

  loadMusic: () => Promise<void>
  logMusic: (input: MusicInput) => Promise<number>
  updateMusic: (id: number, updates: Partial<MusicMemory>) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
  deleteMusic: (id: number) => Promise<void>
}

export const useMusicStore = create<MusicState>((set, get) => ({
  musicList: [],
  loading: false,

  loadMusic: async () => {
    set({ loading: true })
    try {
      const musicList = await db.music.orderBy('occurredAt').reverse().toArray()
      set({ musicList, loading: false })
    } catch (err) {
      console.error('[MusicStore] loadMusic failed:', err)
      set({ musicList: [], loading: false })
    }
  },

  logMusic: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<MusicMemory, 'id'> = {
      title: input.title,
      artist: input.artist,
      album: input.album ?? null,
      genre: input.genre ?? null,
      thoughts: input.thoughts ?? '',
      favorite: input.favorite ?? false,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'music.log',
      commandId: 'cmd_' + uid(),
      tables: ['music'],
      mutate: async () => db.music.add(row),
      events: (id) => [{ type: 'music.logged', musicId: id }],
      afterCommit: (id) => {
        set((s) => ({ musicList: [{ ...row, id }, ...s.musicList] }))
      },
    })
    return result!
  },

  updateMusic: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'music.update',
      commandId: 'cmd_' + uid(),
      tables: ['music'],
      mutate: async () => {
        await db.music.update(id, { ...updates, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          musicList: s.musicList.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: now } : m)),
        }))
      },
    })
  },

  toggleFavorite: async (id) => {
    const target = get().musicList.find((m) => m.id === id)
    if (!target) return
    const favorite = !target.favorite
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'music.toggleFavorite',
      commandId: 'cmd_' + uid(),
      tables: ['music'],
      mutate: async () => {
        await db.music.update(id, { favorite, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          musicList: s.musicList.map((m) => (m.id === id ? { ...m, favorite, updatedAt: now } : m)),
        }))
      },
    })
  },

  deleteMusic: async (id) => {
    await runCommand({
      commandType: 'music.delete',
      commandId: 'cmd_' + uid(),
      tables: ['music'],
      mutate: async () => {
        await db.music.delete(id)
      },
      events: () => [{ type: 'music.deleted', musicId: id }],
      afterCommit: () => {
        set((s) => ({ musicList: s.musicList.filter((m) => m.id !== id) }))
      },
    })
  },
}))
