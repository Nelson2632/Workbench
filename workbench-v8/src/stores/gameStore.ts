// ============================================================
// V9 PLAY — Generic Game Store（V9-C-001 §4.8/§4.9）
// 游戏档案 + 记录（profile/progress/playtime/result/note/combat）
// lastKnownData = 各 type 最新快照；删除游戏级联删除记录
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import type { Game, GameRecord, GameRecordType, GameStatus } from '../types'

export interface GameInput {
  name: string
  iconRef?: string | null
  genre?: string
  platform?: string
  status?: GameStatus
  favorite?: boolean
  rating?: number | null
  note?: string
}

export interface RecordInput {
  gameId: number
  type: GameRecordType
  data: Record<string, unknown>
  note?: string
  occurredAt?: string
}

interface GameState {
  games: Game[]
  records: GameRecord[]
  loading: boolean

  loadGames: () => Promise<void>
  loadRecords: (gameId: number) => Promise<void>
  addGame: (input: GameInput) => Promise<number>
  updateGame: (id: number, updates: Partial<Game>) => Promise<void>
  deleteGame: (id: number) => Promise<void>
  addRecord: (input: RecordInput) => Promise<number>
  deleteRecord: (id: number) => Promise<void>
  toggleFavorite: (id: number) => Promise<void>
  lastKnownByType: (gameId: number, type: GameRecordType) => GameRecord | undefined
}

export const useGameStore = create<GameState>((set, get) => ({
  games: [],
  records: [],
  loading: false,

  loadGames: async () => {
    set({ loading: true })
    try {
      const games = await db.games.toArray()
      set({ games, loading: false })
    } catch (err) {
      console.error('[GameStore] loadGames failed:', err)
      set({ games: [], loading: false })
    }
  },

  loadRecords: async (gameId) => {
    const records = await db.gameRecords.where('gameId').equals(gameId).toArray()
    set({ records })
  },

  addGame: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<Game, 'id'> = {
      name: input.name,
      iconRef: input.iconRef ?? null,
      genre: input.genre ?? '',
      platform: input.platform ?? '',
      status: input.status ?? 'playing',
      favorite: input.favorite ?? false,
      rating: input.rating ?? null,
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'game.create',
      commandId: 'cmd_' + uid(),
      tables: ['games'],
      mutate: async () => db.games.add(row),
      events: (id) => [{ type: 'game.created', gameId: id }],
      afterCommit: (id) => {
        set((s) => ({ games: [...s.games, { ...row, id }] }))
      },
    })
    return result!
  },

  updateGame: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'game.update',
      commandId: 'cmd_' + uid(),
      tables: ['games'],
      mutate: async () => {
        await db.games.update(id, { ...updates, updatedAt: now })
      },
      events: () => [{ type: 'game.updated', gameId: id }],
      afterCommit: () => {
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: now } : g)),
        }))
      },
    })
  },

  deleteGame: async (id) => {
    await runCommand<{ recordIds: number[] }>({
      commandType: 'game.delete',
      commandId: 'cmd_' + uid(),
      tables: ['games', 'gameRecords'],
      mutate: async () => {
        // 级联删除记录（发布 gameRecord.deleted）
        const rows = await db.gameRecords.where('gameId').equals(id).toArray()
        const recordIds = rows.map((r) => r.id)
        if (recordIds.length > 0) {
          await db.gameRecords.bulkDelete(recordIds)
        }
        await db.games.delete(id)
        return { recordIds }
      },
      events: ({ recordIds }) => {
        const evts: AppEvent[] = []
        for (const rid of recordIds) {
          evts.push({ type: 'gameRecord.deleted', recordId: rid })
        }
        evts.push({ type: 'game.deleted', gameId: id })
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          games: s.games.filter((g) => g.id !== id),
          records: s.records.filter((r) => r.gameId !== id),
        }))
      },
    })
  },

  addRecord: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<GameRecord, 'id'> = {
      gameId: input.gameId,
      type: input.type,
      data: input.data,
      note: input.note ?? '',
      occurredAt: input.occurredAt ?? now,
      createdAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'game.record',
      commandId: 'cmd_' + uid(),
      tables: ['gameRecords'],
      mutate: async () => db.gameRecords.add(row),
      events: (id) => [{ type: 'game.recorded', recordId: id, gameId: input.gameId }],
      afterCommit: (id) => {
        set((s) => ({ records: [...s.records, { ...row, id }] }))
      },
    })
    return result!
  },

  deleteRecord: async (id) => {
    await runCommand({
      commandType: 'gameRecord.delete',
      commandId: 'cmd_' + uid(),
      tables: ['gameRecords'],
      mutate: async () => {
        await db.gameRecords.delete(id)
      },
      events: () => [{ type: 'gameRecord.deleted', recordId: id }],
      afterCommit: () => {
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
      },
    })
  },

  toggleFavorite: async (id) => {
    const target = get().games.find((g) => g.id === id)
    if (!target) return
    const favorite = !target.favorite
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'game.toggleFavorite',
      commandId: 'cmd_' + uid(),
      tables: ['games'],
      mutate: async () => {
        await db.games.update(id, { favorite, updatedAt: now })
      },
      events: () => [{ type: 'game.updated', gameId: id }],
      afterCommit: () => {
        set((s) => ({
          games: s.games.map((g) => (g.id === id ? { ...g, favorite, updatedAt: now } : g)),
        }))
      },
    })
  },

  lastKnownByType: (gameId, type) => {
    return get()
      .records.filter((r) => r.gameId === gameId && r.type === type)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
  },
}))
