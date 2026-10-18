// ============================================================
// V9 LIFE — 生日事件纯函数（PROJECTION_CONTRACT §8.2 冻结）
// nextBirthday(MM-DD, today) 确定性；同步/级联/每日 rollover
// ============================================================

import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { formatDate } from '@/utils/helpers'
import type { CalendarEvent, Friend } from '@/types'

/** 下一次生日日期（纯函数）：候选 = today 年 MM-DD；已过 → 明年 */
export function nextBirthday(mmdd: string, today: Date): string {
  const candidate = `${today.getFullYear()}-${mmdd}`
  if (candidate < formatDate(today)) {
    return `${today.getFullYear() + 1}-${mmdd}`
  }
  return candidate
}

/** 今天是否该好友生日 */
export function isBirthdayToday(mmdd: string | null, today: Date): boolean {
  if (!mmdd) return false
  return formatDate(today).slice(5) === mmdd
}

function buildBirthdayEvent(friend: Friend, today: Date): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    date: nextBirthday(friend.birthday!, today),
    type: 'birthday',
    title: `${friend.name} 生日`,
    note: '',
    allDay: true,
    location: '',
    startTime: null,
    endTime: null,
    reminder: null,
    repeat: null,
    sourceType: 'friend',
    sourceId: String(friend.id),
    doneAt: null,
  }
}

async function deleteFutureBirthdayEvents(friendId: number, today: Date): Promise<number[]> {
  const todayStr = formatDate(today)
  const rows = await db.events
    .where('[sourceType+sourceId]')
    .equals(['friend', String(friendId)])
    .toArray()
  const future = rows.filter((e) => e.type === 'birthday' && e.date >= todayStr)
  const ids = future.map((e) => e.id)
  if (ids.length > 0) {
    await db.events.bulkDelete(ids)
  }
  return ids
}

export interface BirthdaySyncResult {
  createdEventId: number | null
  deletedEventIds: number[]
}

/** friend.created / friend.updated：删除该好友全部未过生日事件 → 重建 nextBirthday 一行（幂等）。
 *  只写 db、不发布事件；事件由调用方（friendStore）经 Mutation Lane 的 events 声明发布。 */
export async function syncBirthdayEvents(friend: Friend, today = new Date()): Promise<BirthdaySyncResult> {
  const deletedEventIds = await deleteFutureBirthdayEvents(friend.id, today)
  if (!friend.birthday) return { createdEventId: null, deletedEventIds } // 无生日 → 仅清理
  const row = buildBirthdayEvent(friend, today)
  const now = new Date().toISOString()
  const id = await db.events.add({ ...row, createdAt: now, updatedAt: now } as CalendarEvent)
  return { createdEventId: id, deletedEventIds }
}

/** 删除好友时级联删除其生日事件（PROJECTION_CONTRACT §3 删除联动）。
 *  只写 db、返回删除 id 列表；事件由调用方（friendStore）经 Mutation Lane 的 events 声明发布。 */
export async function cascadeDeleteFriendEvents(friendId: number): Promise<number[]> {
  const rows = await db.events
    .where('[sourceType+sourceId]')
    .equals(['friend', String(friendId)])
    .toArray()
  const ids = rows.map((e) => e.id)
  if (ids.length > 0) {
    await db.events.bulkDelete(ids)
  }
  return ids
}

/** 每日 rollover：补建缺失的生日事件 + 今日生日发布 friend.birthday（幂等） */
export async function rolloverBirthdayEvents(today = new Date()): Promise<void> {
  const friends = await db.friends.toArray()
  const todayStr = formatDate(today)
  for (const f of friends) {
    if (!f.birthday) continue
    const target = nextBirthday(f.birthday, today)
    const existing = await db.events
      .where('[sourceType+sourceId]')
      .equals(['friend', String(f.id)])
      .toArray()
    const has = existing.some((e) => e.type === 'birthday' && e.date === target)
    if (!has) {
      const row = buildBirthdayEvent(f, today)
      const now = new Date().toISOString()
      const id = await db.events.add({ ...row, createdAt: now, updatedAt: now } as CalendarEvent)
      eventBus.publish({ type: 'event.created', eventId: id })
    }
    if (isBirthdayToday(f.birthday, today)) {
      eventBus.publish({ type: 'friend.birthday', friendId: f.id, date: todayStr })
    }
  }
}
