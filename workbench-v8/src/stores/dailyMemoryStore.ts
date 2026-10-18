// ============================================================
// V9 CROSS DOMAIN — Daily Memory Store（读取/刷新/反思）
// ============================================================

import { create } from 'zustand'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import {
  getDailyMemory,
  aggregateDailyMemoryFacts,
  upsertDailyMemoryRow,
} from '../domain/projection/dailyMemory'
import type { DailyMemory } from '../types'

interface DailyMemoryState {
  row: DailyMemory | null
  loading: boolean

  load: (date: string) => Promise<void>
  refresh: (date: string) => Promise<void>
  saveReflection: (date: string, text: string) => Promise<void>
}

export const useDailyMemoryStore = create<DailyMemoryState>((set) => ({
  row: null,
  loading: false,

  load: async (date) => {
    set({ loading: true })
    try {
      const row = await getDailyMemory(date)
      set({ row, loading: false })
    } catch (err) {
      console.error('[DailyMemoryStore] load failed:', err)
      set({ row: null, loading: false })
    }
  },

  refresh: async (date) => {
    set({ loading: true })
    try {
      // 事实派生（跨表读）在事务外；事务内只写 dailyMemory
      const facts = await aggregateDailyMemoryFacts(date)
      const existing = await getDailyMemory(date)
      await runCommand<DailyMemory>({
        commandType: 'dailyMemory.refresh',
        commandId: 'cmd_' + uid(),
        tables: ['dailyMemory'],
        mutate: () =>
          upsertDailyMemoryRow(date, facts, existing?.reflection ?? '', new Date().toISOString()),
        afterCommit: (row) => {
          set({ row, loading: false })
        },
      })
    } catch (err) {
      console.error('[DailyMemoryStore] refresh failed:', err)
      set({ loading: false })
    }
  },

  saveReflection: async (date, text) => {
    const existing = await getDailyMemory(date)
    const facts = existing?.facts ?? (await aggregateDailyMemoryFacts(date))
    await runCommand<DailyMemory>({
      commandType: 'dailyMemory.saveReflection',
      commandId: 'cmd_' + uid(),
      tables: ['dailyMemory'],
      mutate: () =>
        upsertDailyMemoryRow(
          date,
          facts,
          text,
          existing ? existing.lastAutoUpdate : new Date().toISOString(),
        ),
      afterCommit: (row) => {
        set({ row })
      },
    })
  },
}))
