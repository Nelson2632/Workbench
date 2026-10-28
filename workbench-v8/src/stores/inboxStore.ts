// ============================================================
// Personal Workbench V9 — Inbox Store（DO1.2 v1.7）
// Inbox Item 独立 Operational Object：New → Triaged → Converted / Discarded
// Conversion 幂等：sourceTaskId 记录转换产物，重复转换 no-op（DP1.5）
// ============================================================

import { create } from 'zustand'
import { db } from '@/db/database'
import { runCommand } from '@/db/mutationLane'
import { uid } from '@/utils/helpers'
import type { InboxItem, InboxItemStatus } from '@/types'

interface InboxState {
  items: InboxItem[]
  loading: boolean

  loadInbox: () => Promise<void>
  addItem: (title: string, commandId?: string) => Promise<number | null>
  updateItem: (id: number, updates: Partial<InboxItem>) => Promise<void>
  discardItem: (id: number) => Promise<void>
  deleteItem: (id: number) => Promise<void>
}

export const useInboxStore = create<InboxState>((set) => ({
  items: [],
  loading: false,

  loadInbox: async () => {
    set({ loading: true })
    try {
      const items = await db.inboxItems.where('status').anyOf('new', 'triaged').toArray()
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      set({ items, loading: false })
    } catch (err) {
      console.error('[InboxStore] load failed:', err)
      set({ loading: false })
    }
  },

  addItem: async (title, commandId = 'cmd_' + uid()) => {
    const now = new Date().toISOString()
    const row: Omit<InboxItem, 'id'> = {
      title,
      sourceCommandId: commandId,
      note: '',
      status: 'new',
      sourceTaskId: null,
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'inbox.add',
      commandId,
      tables: ['inboxItems'],
      mutate: async () => {
        const existing = await db.inboxItems.filter((item) => item.sourceCommandId === commandId).first()
        return existing?.id ?? db.inboxItems.add(row)
      },
      afterCommit: (id) => {
        set((s) => ({ items: [{ ...row, id }, ...s.items.filter((item) => item.id !== id)] }))
      },
    })
    if (result != null) return result
    const recovered = await db.inboxItems.filter((item) => item.sourceCommandId === commandId).first()
    if (!recovered) throw new Error('保存结果无法确认，请检查收件箱')
    await useInboxStore.getState().loadInbox()
    return recovered.id
  },

  updateItem: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'inbox.update',
      commandId: 'cmd_' + uid(),
      tables: ['inboxItems'],
      mutate: async () => {
        await db.inboxItems.update(id, { ...updates, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: now } : i)),
        }))
      },
    })
  },

  discardItem: async (id) => {
    await useInboxStore.getState().updateItem(id, { status: 'discarded' })
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  deleteItem: async (id) => {
    await runCommand({
      commandType: 'inbox.delete',
      commandId: 'cmd_' + uid(),
      tables: ['inboxItems'],
      mutate: async () => {
        await db.inboxItems.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
      },
    })
  },
}))

/** 转换 Inbox Item → Task（幂等：已转换则返回既有 Task id，不产生第二份事实） */
export async function convertInboxItemToTask(
  inboxItemId: number,
  taskUpdates: { title: string; note?: string; dueDate: string; priority?: string },
): Promise<string | null> {
  const item = await db.inboxItems.get(inboxItemId)
  if (!item) return null
  if (item.status === 'converted' && item.sourceTaskId) {
    return item.sourceTaskId // 幂等：已转换，直接返回既有 Task id
  }

  const now = new Date().toISOString()
  const { result } = await runCommand<string>({
    commandType: 'inbox.convert',
    commandId: `inbox-${inboxItemId}`,
    tables: ['tasks', 'inboxItems'],
    mutate: async () => {
      const taskId = uid()
      await db.tasks.add({
        id: taskId,
        title: taskUpdates.title,
        priority: (taskUpdates.priority as any) || 'P2',
        done: false,
        note: taskUpdates.note || '',
        projectId: '',
        dueDate: taskUpdates.dueDate,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      } as never)
      await db.inboxItems.update(inboxItemId, {
        status: 'converted',
        sourceTaskId: taskId,
        updatedAt: now,
      })
      return taskId
    },
    events: (taskId) => [{ type: 'task.created', taskId }],
    afterCommit: () => {
      useInboxStore.setState((s) => ({ items: s.items.filter((i) => i.id !== inboxItemId) }))
    },
  })

  return result
}
