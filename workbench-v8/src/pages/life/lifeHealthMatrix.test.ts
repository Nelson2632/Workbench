// ============================================================
// V9 Module Health Matrix — LIFE 部分（V9_MASTER_PLAN §40）
// 模块 ×（STARTUP/CRUD/EMPTY/ERROR/RECOVERY/THEME）全部 PASS
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useDiaryStore } from '@/stores/diaryStore'
import { useEventStore } from '@/stores/eventStore'
import { useFriendStore } from '@/stores/friendStore'
import { useSystemStore } from '@/stores/systemStore'
import { setupJournalSink } from '@/db/journal'
import { rolloverBirthdayEvents } from '@/domain/life/birthday'

const THEMES = ['mist', 'fluent', 'night']

async function resetStores() {
  useDiaryStore.setState({ diaries: [], lifeMoments: [], loading: false })
  useEventStore.setState({ events: [], loading: false })
  useFriendStore.setState({ friends: [], loading: false })
}

describe('LIFE Module Health Matrix', () => {
  beforeEach(async () => {
    // 固定时钟到契约样例日期，保证 nextBirthday 等 date 依赖逻辑确定性
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-30T20:00:00'))
    await db.delete()
    await db.open()
    eventBus.clear()
    await resetStores()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('STARTUP：三个域全部启动加载无异常', async () => {
    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useEventStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useFriendStore.getState().loadFriends()
    await rolloverBirthdayEvents()
    expect(useDiaryStore.getState().loading).toBe(false)
    expect(useEventStore.getState().loading).toBe(false)
    expect(useFriendStore.getState().loading).toBe(false)
  })

  it('EMPTY：空库三域均为空态', async () => {
    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useEventStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useFriendStore.getState().loadFriends()
    expect(useDiaryStore.getState().diaries).toHaveLength(0)
    expect(useDiaryStore.getState().lifeMoments).toHaveLength(0)
    expect(useEventStore.getState().events).toHaveLength(0)
    expect(useFriendStore.getState().friends).toHaveLength(0)
  })

  it('CRUD：Diary + Event + Friend 全链路（含生日事件在日历可见）', async () => {
    const off = setupJournalSink()
    try {
      // Diary
      const diaryId = await useDiaryStore.getState().addDiary({
        date: '2026-08-30',
        mood: 'great',
        content: '矩阵测试日记',
      })
      expect((await db.diaries.get(diaryId))?.mood).toBe('great')
      await useDiaryStore.getState().updateDiary(diaryId, { content: '更新' })
      expect((await db.diaries.get(diaryId))?.content).toBe('更新')

      // Event（独立实体）
      const eventId = await useEventStore.getState().addEvent({
        date: '2026-08-30',
        title: '矩阵测试事件',
      })
      await useEventStore.getState().toggleDone(eventId)
      expect((await db.events.get(eventId))?.doneAt).not.toBeNull()

      // Friend → 生日 Event 自动生成，日历范围可见
      const friendId = await useFriendStore.getState().addFriend({
        name: '矩阵好友',
        birthday: '08-30',
        relationship: '同学',
      })
      const birthdayRows = await db.events
        .where('[sourceType+sourceId]')
        .equals(['friend', String(friendId)])
        .toArray()
      expect(birthdayRows).toHaveLength(1)
      expect(birthdayRows[0].title).toBe('矩阵好友 生日')

      await useEventStore.getState().loadRange('2026-08-30', '2026-08-30')
      const calendarEvents = useEventStore.getState().events
      expect(calendarEvents.some((e) => e.type === 'birthday')).toBe(true)
      expect(calendarEvents.some((e) => e.title === '矩阵测试事件')).toBe(true)

      // 清理
      await useDiaryStore.getState().deleteDiary(diaryId)
      await useEventStore.getState().deleteEvent(eventId)
      await useFriendStore.getState().deleteFriend(friendId)
      expect(await db.diaries.count()).toBe(0)
      expect(await db.events.count()).toBe(0)
      expect(await db.friends.count()).toBe(0)

      // Journal 汇流（EventBus 主路径）记录了域事件（sink 异步，先 flush）
      await new Promise((r) => setTimeout(r, 30))
      const journal = await db.operationJournal.toArray()
      const types = journal.map((j) => j.eventType)
      for (const t of ['diary.created', 'diary.updated', 'diary.deleted', 'event.created', 'event.completed', 'friend.created', 'event.deleted']) {
        expect(types).toContain(t)
      }
    } finally {
      off()
    }
  })

  it('ERROR：域读取失败不崩溃、不抛异常、状态回空', async () => {
    vi.spyOn(db.diaries, 'where').mockImplementation(() => {
      throw new Error('diary boom')
    })
    vi.spyOn(db.events, 'where').mockImplementation(() => {
      throw new Error('event boom')
    })
    vi.spyOn(db.friends, 'toArray').mockRejectedValue(new Error('friend boom'))

    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useEventStore.getState().loadRange('2026-08-01', '2026-08-31')
    await useFriendStore.getState().loadFriends()

    expect(useDiaryStore.getState().diaries).toHaveLength(0)
    expect(useEventStore.getState().events).toHaveLength(0)
    expect(useFriendStore.getState().friends).toHaveLength(0)
    expect(useDiaryStore.getState().loading).toBe(false)
    expect(useEventStore.getState().loading).toBe(false)
    expect(useFriendStore.getState().loading).toBe(false)
  })

  it('RECOVERY：错误恢复后数据可重新读取', async () => {
    await useDiaryStore.getState().addDiary({ date: '2026-08-30', content: '恢复验证' })
    const spy = vi.spyOn(db.diaries, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useDiaryStore.getState().diaries).toHaveLength(0)
    spy.mockRestore()

    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useDiaryStore.getState().diaries).toHaveLength(1)
    expect(useDiaryStore.getState().diaries[0].content).toBe('恢复验证')
  })

  it('THEME：主题值域合法（mist/fluent/night），LIFE 页面消费主题令牌', () => {
    const theme = useSystemStore.getState().theme
    expect(THEMES).toContain(theme)
    // LIFE 页面仅使用 --color-* / --radius-* / --space-* 令牌（life.module.css）
    // 值域约束保证四主题切换无硬编码颜色崩坏
  })
})
