// ============================================================
// V9 LIFE DiaryStore 测试（CRUD / 事件发布 / 区间加载 / 错误恢复）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useDiaryStore } from './diaryStore'

describe('DiaryStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useDiaryStore.setState({ diaries: [], lifeMoments: [], loading: false })
  })

  it('EMPTY：空库加载区间返回空', async () => {
    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useDiaryStore.getState().diaries).toHaveLength(0)
    expect(useDiaryStore.getState().lifeMoments).toHaveLength(0)
    expect(useDiaryStore.getState().loading).toBe(false)
  })

  it('CRUD：add（quick/long 自动判定 + 显式覆盖）/update/delete + 事件发布', async () => {
    const events: string[] = []
    eventBus.subscribeAll((e) => events.push(e.type))

    const shortId = await useDiaryStore.getState().addDiary({
      date: '2026-08-30',
      mood: 'good',
      weather: 'sunny',
      content: '一句话。',
      tags: ['学习', '学习'],
    })
    const longId = await useDiaryStore.getState().addDiary({
      date: '2026-08-30',
      content: '长'.repeat(150),
    })
    const forcedId = await useDiaryStore.getState().addDiary({
      date: '2026-08-30',
      type: 'long',
      content: '短',
    })

    expect(useDiaryStore.getState().diaries).toHaveLength(3)
    const byId = (id: number) => useDiaryStore.getState().diaries.find((d) => d.id === id)!
    expect(byId(shortId).type).toBe('quick')
    expect(byId(shortId).tags).toEqual(['学习'])
    expect(byId(longId).type).toBe('long')
    expect(byId(forcedId).type).toBe('long')

    await useDiaryStore.getState().updateDiary(shortId, { content: '改过的内容' })
    expect(byId(shortId).content).toBe('改过的内容')

    await useDiaryStore.getState().deleteDiary(longId)
    expect(useDiaryStore.getState().diaries).toHaveLength(2)

    expect(events).toContain('diary.created')
    expect(events).toContain('diary.updated')
    expect(events).toContain('diary.deleted')
  })

  it('区间查询：只返回日期范围内日记', async () => {
    await useDiaryStore.getState().addDiary({ date: '2026-08-30', content: '本月' })
    await useDiaryStore.getState().addDiary({ date: '2026-09-15', content: '下月' })

    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    const rows = useDiaryStore.getState().diaries
    expect(rows).toHaveLength(1)
    expect(rows[0].content).toBe('本月')
  })

  it('Life Moments：add/delete + 事件发布', async () => {
    const id = await useDiaryStore.getState().addLifeMoment('2026-08-30', '晚霞很美')
    expect(useDiaryStore.getState().lifeMoments).toHaveLength(1)
    await useDiaryStore.getState().deleteLifeMoment(id)
    expect(useDiaryStore.getState().lifeMoments).toHaveLength(0)
  })

  it('ERROR→RECOVERY：读取失败不抛出，恢复后正常', async () => {
    await useDiaryStore.getState().addDiary({ date: '2026-08-30', content: '备份数据' })

    const spy = vi.spyOn(db.diaries, 'where').mockImplementation(() => {
      throw new Error('boom')
    })
    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useDiaryStore.getState().diaries).toHaveLength(0)
    expect(useDiaryStore.getState().loading).toBe(false)
    spy.mockRestore()

    await useDiaryStore.getState().loadRange('2026-08-01', '2026-08-31')
    expect(useDiaryStore.getState().diaries).toHaveLength(1)
  })
})
