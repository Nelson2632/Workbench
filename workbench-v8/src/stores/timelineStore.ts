// ============================================================
// V9 CROSS DOMAIN — Timeline Store（读取 + 重建入口）
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import { deriveAllRows, writeProjectionRows, PROJECTION_FACT_TABLES } from '../domain/projection/timelineProjection'
import type { TimelineEvent } from '../types'

interface TimelineState {
  items: TimelineEvent[]
  loading: boolean

  load: () => Promise<void>
  rebuild: () => Promise<number>
}

export const useTimelineStore = create<TimelineState>((set) => ({
  items: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const items = await db.timelineEvents.orderBy('occurredAt').reverse().toArray()
      set({ items, loading: false })
    } catch (err) {
      console.error('[TimelineStore] load failed:', err)
      set({ items: [], loading: false })
    }
  },

  rebuild: async () => {
    set({ loading: true })
    try {
      // 全量事实派生（跨表读）在事务外；事务内只写 timelineEvents
      const { result } = await runCommand<number>({
        commandType: 'timeline.rebuild',
        commandId: 'cmd_' + uid(),
        tables: ['timelineEvents', ...PROJECTION_FACT_TABLES],
        mutate: async () => writeProjectionRows(await deriveAllRows()),
        events: () => [{ type: 'timeline.rebuilt' }],
      })
      const items = await db.timelineEvents.orderBy('occurredAt').reverse().toArray()
      set({ items, loading: false })
      return result!
    } catch (err) {
      console.error('[TimelineStore] rebuild failed:', err)
      set({ loading: false })
      throw err
    }
  },
}))
