// ============================================================
// V9 LIFE 生日纯函数测试（PROJECTION_CONTRACT §8.2）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  nextBirthday,
  isBirthdayToday,
  syncBirthdayEvents,
  cascadeDeleteFriendEvents,
  rolloverBirthdayEvents,
} from './birthday'
import type { Friend } from '@/types'

const T = new Date('2026-08-30T12:00:00')

async function seedFriend(overrides: Partial<Friend> = {}): Promise<Friend> {
  const now = '2026-08-30T00:00:00.000Z'
  const id = await db.friends.add({
    name: '李小明',
    alias: null,
    birthday: '03-15',
    relationship: '同学',
    contact: '',
    note: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
  return { id, name: '李小明', alias: null, birthday: '03-15', relationship: '同学', contact: '', note: '', createdAt: now, updatedAt: now, ...overrides }
}

describe('nextBirthday 纯函数', () => {
  it('生日已过 → 明年；未过 → 今年；今天 → 今天', () => {
    expect(nextBirthday('03-15', new Date('2026-08-30T12:00:00'))).toBe('2027-03-15')
    expect(nextBirthday('03-15', new Date('2026-02-01T12:00:00'))).toBe('2026-03-15')
    expect(nextBirthday('03-15', new Date('2026-03-15T12:00:00'))).toBe('2026-03-15')
    expect(nextBirthday('12-31', new Date('2026-12-31T23:00:00'))).toBe('2026-12-31')
  })

  it('isBirthdayToday', () => {
    expect(isBirthdayToday('08-30', T)).toBe(true)
    expect(isBirthdayToday('03-15', T)).toBe(false)
    expect(isBirthdayToday(null, T)).toBe(false)
  })
})

describe('生日事件同步（sync / rollover / 级联）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
  })

  it('sync：生成 birthday 事件行，重复执行幂等', async () => {
    const f = await seedFriend()
    await syncBirthdayEvents(f, T)
    await syncBirthdayEvents(f, T)

    const rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      date: '2027-03-15',
      type: 'birthday',
      title: '李小明 生日',
      sourceType: 'friend',
      sourceId: String(f.id),
    })
  })

  it('sync：生日字段更新 → 旧事件被替换为新日期', async () => {
    const f = await seedFriend()
    await syncBirthdayEvents(f, T)
    await syncBirthdayEvents({ ...f, birthday: '10-01' }, T)

    const rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].date).toBe('2026-10-01')
  })

  it('sync：清空生日 → 事件被删除', async () => {
    const f = await seedFriend()
    await syncBirthdayEvents(f, T)
    await syncBirthdayEvents({ ...f, birthday: null }, T)
    const rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    expect(rows).toHaveLength(0)
  })

  it('rollover：补建缺失事件 + 今日生日发布 friend.birthday', async () => {
    const f = await seedFriend({ birthday: '08-30' })
    const seen: string[] = []
    eventBus.subscribeAll((e) => {
      if (e.type === 'friend.birthday') seen.push(e.type)
    })

    await rolloverBirthdayEvents(T)
    const rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].date).toBe('2026-08-30')
    expect(seen).toContain('friend.birthday')

    // 幂等：再跑一次不重复建
    await rolloverBirthdayEvents(T)
    expect(await db.events.count()).toBe(1)
  })

  it('级联：删除好友 → 其生日事件全部删除并返回删除 id 列表', async () => {
    const f = await seedFriend()
    const { createdEventId } = await syncBirthdayEvents(f, T)

    const deletedIds = await cascadeDeleteFriendEvents(f.id)
    const rows = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    expect(rows).toHaveLength(0)
    expect(deletedIds).toHaveLength(1)
    expect(deletedIds).toContain(createdEventId)
  })
})
