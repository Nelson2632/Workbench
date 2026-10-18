// ============================================================
// V9 LIFE FriendStore 测试（CRUD + 生日自动 Event + 删除级联）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useFriendStore } from './friendStore'

describe('FriendStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useFriendStore.setState({ friends: [], loading: false })
  })

  it('EMPTY：空库加载返回空', async () => {
    await useFriendStore.getState().loadFriends()
    expect(useFriendStore.getState().friends).toHaveLength(0)
  })

  it('CRUD：add/update/delete + 事件发布', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    const id = await useFriendStore.getState().addFriend({
      name: '王小红',
      relationship: '同学',
    })
    expect(useFriendStore.getState().friends).toHaveLength(1)
    expect(await db.events.count()).toBe(0) // 无生日 → 不生成事件

    await useFriendStore.getState().updateFriend(id, { alias: '小红' })
    expect(useFriendStore.getState().friends[0].alias).toBe('小红')

    await useFriendStore.getState().deleteFriend(id)
    expect(useFriendStore.getState().friends).toHaveLength(0)

    expect(seen).toContain('friend.created')
    expect(seen).toContain('friend.updated')
    expect(seen).toContain('friend.deleted')
  })

  it('生日自动生成 Event：创建即生成，改生日替换，删除级联', async () => {
    const id = await useFriendStore.getState().addFriend({
      name: '妈妈',
      relationship: '家人',
      birthday: '11-02',
    })

    let rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(id)])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'birthday', title: '妈妈 生日' })
    expect(rows[0].date).toMatch(/^\d{4}-11-02$/)

    // 改生日 → 事件被替换（仍是 1 条，日期更新）
    await useFriendStore.getState().updateFriend(id, { birthday: '05-20' })
    rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(id)])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].date).toMatch(/^\d{4}-05-20$/)

    // 删除好友 → 事件级联删除
    await useFriendStore.getState().deleteFriend(id)
    rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(id)])
      .toArray()
    expect(rows).toHaveLength(0)
  })

  it('生日格式校验由 UI 层负责；Store 接受 MM-DD 或 null', async () => {
    const a = await useFriendStore.getState().addFriend({ name: 'A', birthday: null })
    const b = await useFriendStore.getState().addFriend({ name: 'B', birthday: '01-01' })
    expect(useFriendStore.getState().friends.find((f) => f.id === a)?.birthday).toBeNull()
    expect(useFriendStore.getState().friends.find((f) => f.id === b)?.birthday).toBe('01-01')
    expect(await db.events.count()).toBe(1)
  })
})
