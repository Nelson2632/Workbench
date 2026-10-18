// ============================================================
// Personal Workbench V9 — LIFE Friends Store（V9-C-001 §4.4）
// 好友 CRUD；生日自动生成 Event（PROJECTION_CONTRACT §8.2）
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import {
  syncBirthdayEvents,
  cascadeDeleteFriendEvents,
  type BirthdaySyncResult,
} from '../domain/life/birthday'
import type { Friend } from '../types'

export interface FriendInput {
  name: string
  alias?: string | null
  birthday?: string | null // MM-DD
  relationship?: string
  contact?: string
  note?: string
}

/** 把生日同步结果转成 event.created / event.deleted 事件列表（friendStore 统一发布） */
function birthdayEvents(sync: BirthdaySyncResult): AppEvent[] {
  const evts: AppEvent[] = []
  if (sync.createdEventId != null) evts.push({ type: 'event.created', eventId: sync.createdEventId })
  for (const did of sync.deletedEventIds) evts.push({ type: 'event.deleted', eventId: did })
  return evts
}

interface FriendState {
  friends: Friend[]
  loading: boolean

  loadFriends: () => Promise<void>
  addFriend: (input: FriendInput) => Promise<number>
  updateFriend: (id: number, updates: Partial<Friend>) => Promise<void>
  deleteFriend: (id: number) => Promise<void>
}

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  loading: false,

  loadFriends: async () => {
    set({ loading: true })
    try {
      const friends = await db.friends.toArray()
      set({ friends, loading: false })
    } catch (err) {
      console.error('[FriendStore] loadFriends failed:', err)
      set({ friends: [], loading: false })
    }
  },

  addFriend: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<Friend, 'id'> = {
      name: input.name,
      alias: input.alias ?? null,
      birthday: input.birthday ?? null,
      relationship: input.relationship ?? '朋友',
      contact: input.contact ?? '',
      note: input.note ?? '',
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<{ friendId: number; sync: BirthdaySyncResult }>({
      commandType: 'friend.create',
      commandId: 'cmd_' + uid(),
      tables: ['friends', 'events'],
      mutate: async () => {
        const id = await db.friends.add(row)
        // 生日自动生成事件（幂等）；事件由 events 统一发布
        const sync = await syncBirthdayEvents({ ...row, id })
        return { friendId: id, sync }
      },
      events: ({ friendId, sync }) => {
        const evts: AppEvent[] = [{ type: 'friend.created', friendId }]
        evts.push(...birthdayEvents(sync))
        return evts
      },
      afterCommit: ({ friendId }) => {
        set((s) => ({ friends: [...s.friends, { ...row, id: friendId }] }))
      },
    })
    return result!.friendId
  },

  updateFriend: async (id, updates) => {
    const now = new Date().toISOString()
    const merged = useFriendStore
      .getState()
      .friends.map((f) => (f.id === id ? { ...f, ...updates, updatedAt: now } : f))
    const friend = merged.find((f) => f.id === id)
    await runCommand<{ sync: BirthdaySyncResult }>({
      commandType: 'friend.update',
      commandId: 'cmd_' + uid(),
      tables: ['friends', 'events'],
      mutate: async () => {
        await db.friends.update(id, { ...updates, updatedAt: now })
        // 生日字段变更 → 重建生日事件（幂等）
        let sync: BirthdaySyncResult = { createdEventId: null, deletedEventIds: [] }
        if (friend) sync = await syncBirthdayEvents(friend)
        return { sync }
      },
      events: ({ sync }) => {
        const evts: AppEvent[] = [{ type: 'friend.updated', friendId: id }]
        evts.push(...birthdayEvents(sync))
        return evts
      },
      afterCommit: () => {
        set({ friends: merged })
      },
    })
  },

  deleteFriend: async (id) => {
    await runCommand<{ deletedEventIds: number[] }>({
      commandType: 'friend.delete',
      commandId: 'cmd_' + uid(),
      tables: ['friends', 'events'],
      mutate: async () => {
        const deletedEventIds = await cascadeDeleteFriendEvents(id)
        await db.friends.delete(id)
        return { deletedEventIds }
      },
      events: ({ deletedEventIds }) => {
        const evts: AppEvent[] = [{ type: 'friend.deleted', friendId: id }]
        for (const did of deletedEventIds) evts.push({ type: 'event.deleted', eventId: did })
        return evts
      },
      afterCommit: () => {
        set((s) => ({ friends: s.friends.filter((f) => f.id !== id) }))
      },
    })
  },
}))
