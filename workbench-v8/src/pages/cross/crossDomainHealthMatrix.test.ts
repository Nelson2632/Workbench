// ============================================================
// V9 Module Health Matrix — CROSS DOMAIN 部分（M5 Gate）
// TIMELINE / DAILY MEMORY / COLLECTION
// 验证项：三域事实入 Timeline；Daily Memory 事实 + Reflection 保护；
// 手动 Rebuild（清空后重算）与之前一致
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useTaskStore } from '@/stores/taskStore'
import { useDiaryStore } from '@/stores/diaryStore'
import { useAnimeStore } from '@/stores/animeStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useDailyMemoryStore } from '@/stores/dailyMemoryStore'
import { useSystemStore } from '@/stores/systemStore'
import {
  setupProjection,
  rebuildProjection,
  timelineKeySet,
  _resetProjectionForTests,
} from '@/domain/projection/timelineProjection'
import {
  refreshDailyMemory,
  setDailyReflection,
  setupDailyMemory,
  _resetDailyMemoryForTests,
} from '@/domain/projection/dailyMemory'
import {
  favoriteEntry,
  setupCollection,
  _resetCollectionForTests,
} from '@/domain/projection/collection'

const D = '2026-08-30'
const THEMES = ['mist', 'fluent', 'night']
const flush = () => new Promise((r) => setTimeout(r, 30))

async function reset() {
  useTaskStore.setState({ tasks: [], loading: false })
  useDiaryStore.setState({ diaries: [], lifeMoments: [], loading: false })
  useAnimeStore.setState({ animeList: [], loading: false })
  useTimelineStore.setState({ items: [], loading: false })
  useDailyMemoryStore.setState({ row: null, loading: false })
}

describe('CROSS DOMAIN Health Matrix（M5 Gate）', () => {
  beforeEach(async () => {
    // 固定时钟到契约样例日期，保证 date 依赖的投影/聚合确定性（与 appLock.test.ts 同约定）
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-30T20:00:00'))
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetProjectionForTests()
    _resetDailyMemoryForTests()
    _resetCollectionForTests()
    setupProjection()
    setupDailyMemory()
    setupCollection()
    await reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('STARTUP/EMPTY：Timeline 与 Daily Memory 空态加载', async () => {
    await useTimelineStore.getState().load()
    expect(useTimelineStore.getState().items).toHaveLength(0)
    await useDailyMemoryStore.getState().load(D)
    expect(useDailyMemoryStore.getState().row).toBeNull()
    expect(useDailyMemoryStore.getState().loading).toBe(false)
  })

  it('M5 验证 1：LIFE 日记 + WORK 完成任务 + PLAY 看一集 → Timeline 均出现', async () => {
    // LIFE：写一篇 Diary（Store 路径 → diary.created 事件）
    await useDiaryStore.getState().addDiary({ date: D, mood: 'great', content: '矩阵日记' })
    // WORK：完成一个 Task（toggleDone → task.completed + completedAt）
    await useTaskStore.getState().addTask({ title: '矩阵任务', priority: 'P0', dueDate: D })
    const task = useTaskStore.getState().tasks[0]
    await useTaskStore.getState().toggleDone(task.id)
    // PLAY：看完一集动画（watchEpisode → anime.episodeWatched）
    const animeId = await useAnimeStore.getState().addAnime({ name: '矩阵动画', totalEpisodes: 12 })
    await useAnimeStore.getState().watchEpisode(animeId, 1)

    await flush()
    await useTimelineStore.getState().load()
    const keys = useTimelineStore.getState().items.map((i) => i.eventKey)
    expect(keys).toContain(`diary.created:1:v1:1`)
    expect(keys).toContain(`task.completed:${task.id}:v1:1`)
    expect(keys).toContain(`anime.episodeWatched:${animeId}:v1:e1`)

    // 只保留定位字段与元数据，不复制事实载荷
    const diaryRow = useTimelineStore.getState().items.find((i) => i.eventType === 'diary.created')!
    expect(diaryRow.summary).toBe('矩阵日记')
    expect((diaryRow as any).content).toBeUndefined()
  })

  it('M5 验证 2：Daily Memory 当日事实 + 人工 Reflection 不被覆盖', async () => {
    await useTaskStore.getState().addTask({ title: 't', priority: 'P0', dueDate: D })
    await useTaskStore.getState().toggleDone(useTaskStore.getState().tasks[0].id)
    await useDiaryStore.getState().addDiary({ date: D, content: 'd' })

    await flush()
    await useDailyMemoryStore.getState().refresh(D)
    const row = useDailyMemoryStore.getState().row!
    expect(row.facts.work.tasksCompleted).toBe(1)
    expect(row.facts.life.diaries).toBe(1)

    // 人工反思 → 再次刷新 → 不被覆盖
    await useDailyMemoryStore.getState().saveReflection(D, '值得记住的一天')
    await useDailyMemoryStore.getState().refresh(D)
    expect(useDailyMemoryStore.getState().row?.reflection).toBe('值得记住的一天')

    // 聚合器路径同样保护（领域函数直测）
    const before = await refreshDailyMemory(D)
    await setDailyReflection(D, '第二版反思')
    await refreshDailyMemory(D)
    const after = (await db.dailyMemory.where('date').equals(D).first())!
    expect(after.reflection).toBe('第二版反思')
    expect(after.facts.work.tasksCompleted).toBe(before.facts.work.tasksCompleted)
  })

  it('M5 验证 3：手动 Rebuild（清空 timeline_events 后重算）与之前一致', async () => {
    // 事件驱动路径产生的行
    await useDiaryStore.getState().addDiary({ date: D, content: '重建验证' })
    await useTaskStore.getState().addTask({ title: '重建任务', priority: 'P0', dueDate: D })
    await useTaskStore.getState().toggleDone(useTaskStore.getState().tasks[0].id)
    await flush()
    const eventDrivenKeys = await timelineKeySet()
    expect(eventDrivenKeys.length).toBeGreaterThanOrEqual(2)

    // 模拟投影损坏：清空 → rebuild → 与之前完全一致
    await db.timelineEvents.clear()
    expect(await timelineKeySet()).toHaveLength(0)
    const count = await rebuildProjection()
    expect(count).toBe(eventDrivenKeys.length)
    expect(await timelineKeySet()).toEqual(eventDrivenKeys)

    // 幂等：再重建一次仍一致
    await rebuildProjection()
    expect(await timelineKeySet()).toEqual(eventDrivenKeys)
  })

  it('CRUD：Collection 跨域收藏 + 级联', async () => {
    await useDiaryStore.getState().addDiary({ date: D, content: 'c' })
    await favoriteEntry({ sourceDomain: 'life', sourceType: 'diary', sourceId: '1', title: '收藏日记' })
    expect(await db.collectionEntries.count()).toBe(1)

    eventBus.publish({ type: 'diary.deleted', diaryId: 1 })
    await flush()
    expect(await db.collectionEntries.count()).toBe(0)
  })

  it('ERROR/RECOVERY：Timeline 读取失败回空，恢复后正常', async () => {
    await useDiaryStore.getState().addDiary({ date: D, content: 'e' })
    await flush()

    const spy = vi.spyOn(db.timelineEvents, 'orderBy').mockImplementation(() => {
      throw new Error('boom')
    })
    await useTimelineStore.getState().load()
    expect(useTimelineStore.getState().items).toHaveLength(0)
    spy.mockRestore()

    await useTimelineStore.getState().load()
    expect(useTimelineStore.getState().items.length).toBeGreaterThan(0)
  })

  it('THEME：主题值域合法', () => {
    expect(THEMES).toContain(useSystemStore.getState().theme)
  })
})
