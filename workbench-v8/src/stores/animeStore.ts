// ============================================================
// V9 PLAY — Anime Store（V9-C-001 §4.7）
// 状态机 planned/watching/completed/paused/dropped；集数推进自动完结
// 事件：anime.created/updated/episodeWatched/completed/deleted
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import type { Anime, AnimeStatus } from '../types'

export interface AnimeInput {
  name: string
  coverRef?: string | null
  totalEpisodes?: number | null
  status?: AnimeStatus
  rating?: number | null
  thoughts?: string
  favorite?: boolean
}

interface AnimeState {
  animeList: Anime[]
  loading: boolean

  loadAnime: () => Promise<void>
  addAnime: (input: AnimeInput) => Promise<number>
  updateAnime: (id: number, updates: Partial<Anime>) => Promise<void>
  setStatus: (id: number, status: AnimeStatus) => Promise<void>
  watchEpisode: (id: number, episode: number, note?: string) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
  deleteAnime: (id: number) => Promise<void>
}

export const useAnimeStore = create<AnimeState>((set, get) => ({
  animeList: [],
  loading: false,

  loadAnime: async () => {
    set({ loading: true })
    try {
      const animeList = await db.anime.toArray()
      set({ animeList, loading: false })
    } catch (err) {
      console.error('[AnimeStore] loadAnime failed:', err)
      set({ animeList: [], loading: false })
    }
  },

  addAnime: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<Anime, 'id'> = {
      name: input.name,
      coverRef: input.coverRef ?? null,
      status: input.status ?? 'planned',
      rating: input.rating ?? null,
      favorite: input.favorite ?? false,
      thoughts: input.thoughts ?? '',
      totalEpisodes: input.totalEpisodes ?? null,
      watchedEpisodes: 0,
      episodeLog: [],
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'anime.create',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => db.anime.add(row),
      events: (id) => [{ type: 'anime.created', animeId: id }],
      afterCommit: (id) => {
        set((s) => ({ animeList: [...s.animeList, { ...row, id }] }))
      },
    })
    return result!
  },

  updateAnime: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'anime.update',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => {
        await db.anime.update(id, { ...updates, updatedAt: now })
      },
      events: () => [{ type: 'anime.updated', animeId: id }],
      afterCommit: () => {
        set((s) => ({
          animeList: s.animeList.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: now } : a)),
        }))
      },
    })
  },

  setStatus: async (id, status) => {
    const target = get().animeList.find((a) => a.id === id)
    if (!target) return
    const now = new Date().toISOString()
    const completedAt = status === 'completed' ? now : null
    const emitCompleted = status === 'completed' && target.status !== 'completed'
    await runCommand({
      commandType: 'anime.setStatus',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => {
        await db.anime.update(id, { status, completedAt, updatedAt: now })
      },
      events: () => {
        const evts: AppEvent[] = []
        if (emitCompleted) {
          evts.push({ type: 'anime.completed', animeId: id })
        } else {
          evts.push({ type: 'anime.updated', animeId: id })
        }
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          animeList: s.animeList.map((a) =>
            a.id === id ? { ...a, status, completedAt, updatedAt: now } : a,
          ),
        }))
      },
    })
  },

  /** 看一集：episodeLog 追加（同集幂等），达到总集数自动完结 */
  watchEpisode: async (id, episode, note) => {
    const target = get().animeList.find((a) => a.id === id)
    if (!target) return
    if (target.episodeLog.some((e) => e.episode === episode)) return
    const now = new Date().toISOString()
    const entry = { date: formatDate(new Date()), episode, note }
    const watchedEpisodes = Math.max(target.watchedEpisodes, episode)
    const total = target.totalEpisodes
    const autoComplete = total != null && watchedEpisodes >= total && target.status !== 'completed'
    const status: AnimeStatus = autoComplete ? 'completed' : target.status
    const completedAt = autoComplete ? now : target.completedAt
    const updates = {
      episodeLog: [...target.episodeLog, entry],
      watchedEpisodes,
      status,
      completedAt,
      updatedAt: now,
    }
    await runCommand({
      commandType: 'anime.watchEpisode',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => {
        await db.anime.update(id, updates)
      },
      events: () => {
        const evts: AppEvent[] = [{ type: 'anime.episodeWatched', animeId: id, episode }]
        if (autoComplete) {
          evts.push({ type: 'anime.completed', animeId: id })
        }
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          animeList: s.animeList.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }))
      },
    })
  },

  toggleFavorite: async (id) => {
    const target = get().animeList.find((a) => a.id === id)
    if (!target) return
    const favorite = !target.favorite
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'anime.toggleFavorite',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => {
        await db.anime.update(id, { favorite, updatedAt: now })
      },
      events: () => [{ type: 'anime.updated', animeId: id }],
      afterCommit: () => {
        set((s) => ({
          animeList: s.animeList.map((a) => (a.id === id ? { ...a, favorite, updatedAt: now } : a)),
        }))
      },
    })
  },

  deleteAnime: async (id) => {
    await runCommand({
      commandType: 'anime.delete',
      commandId: 'cmd_' + uid(),
      tables: ['anime'],
      mutate: async () => {
        await db.anime.delete(id)
      },
      events: () => [{ type: 'anime.deleted', animeId: id }],
      afterCommit: () => {
        set((s) => ({ animeList: s.animeList.filter((a) => a.id !== id) }))
      },
    })
  },
}))
