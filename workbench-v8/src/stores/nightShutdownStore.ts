// ============================================================
// V9 WORK — Night Shutdown Store（V9-C-001 §4.14 / §9 蓝图）
// 每日一次收口：completed/unfinished/reason/reflection/tomorrowFocus
// 完成后发布 nightShutdown.completed（进入 Review 数据管道）
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import { aggregateNightShutdown, type ShutdownAggregate } from '../domain/work/nightShutdown'
import type { NightShutdown } from '../types'

export interface ShutdownInput {
  date: string
  reason: string
  reflection: string
  tomorrowFocus: string[]
}

interface NightShutdownState {
  current: NightShutdown | null
  aggregate: ShutdownAggregate | null
  loading: boolean

  loadByDate: (date: string) => Promise<void>
  complete: (input: ShutdownInput, commandId?: string) => Promise<number>
  remove: (id: number) => Promise<void>
}

export const useNightShutdownStore = create<NightShutdownState>((set) => ({
  current: null,
  aggregate: null,
  loading: false,

  loadByDate: async (date) => {
    set({ loading: true })
    try {
      const [row, agg] = await Promise.all([
        db.nightShutdown.where('date').equals(date).first(),
        aggregateNightShutdown(date),
      ])
      set({ current: row ?? null, aggregate: agg, loading: false })
    } catch (err) {
      console.error('[NightShutdownStore] loadByDate failed:', err)
      set({ current: null, aggregate: null, loading: false })
    }
  },

  complete: async (input, commandId = 'cmd_' + uid()) => {
    const agg = await aggregateNightShutdown(input.date)
    const now = new Date().toISOString()
    const completed = agg.completed
    const unfinished = agg.unfinished

    const { result } = await runCommand<NightShutdown>({
      commandType: 'nightShutdown.complete',
      commandId,
      tables: ['nightShutdown'],
      mutate: async () => {
        // 一天一次收口：同日已存在 → 更新（upsert，避免唯一索引冲突）
        const existing = await db.nightShutdown.where('date').equals(input.date).first()
        if (existing) {
          const updated: NightShutdown = {
            ...existing,
            completed,
            unfinished,
            reason: input.reason,
            reflection: input.reflection,
            tomorrowFocus: input.tomorrowFocus,
            updatedAt: now,
          }
          await db.nightShutdown.put(updated)
          return updated
        }
        const row: Omit<NightShutdown, 'id'> = {
          date: input.date,
          completed,
          unfinished,
          reason: input.reason,
          reflection: input.reflection,
          tomorrowFocus: input.tomorrowFocus,
          createdAt: now,
          updatedAt: now,
        }
        const id = await db.nightShutdown.add(row)
        return { ...row, id }
      },
      events: () => [{ type: 'nightShutdown.completed', date: input.date }],
      afterCommit: (row) => {
        set({ current: row })
      },
    })
    const canonical = result ?? await db.nightShutdown.where('date').equals(input.date).first()
    if (!canonical) throw new Error('收口保存结果不可用')
    set({ current: canonical })
    return canonical.id
  },

  remove: async (id) => {
    await runCommand({
      commandType: 'nightShutdown.remove',
      commandId: 'cmd_' + uid(),
      tables: ['nightShutdown'],
      mutate: async () => {
        await db.nightShutdown.delete(id)
      },
      afterCommit: () => {
        set((s) => (s.current?.id === id ? { current: null } : {}))
      },
    })
  },
}))
