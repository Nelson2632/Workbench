// ============================================================
// V9 Night Shutdown 聚合与 Store 测试（V9_MASTER_PLAN §9）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { aggregateNightShutdown } from '@/domain/work/nightShutdown'
import { useNightShutdownStore } from './nightShutdownStore'

const D = '2026-08-30'
const NOON = new Date(2026, 7, 30, 12).toISOString() // 本地正午 → ISO，slice(0,10) == D

async function seedAll(): Promise<void> {
  const now = '2026-08-30T00:00:00.000Z'
  // 任务：1 完成（今日）+ 1 未完成（今日到期）+ 1 无关
  await db.tasks.bulkAdd([
    { id: 't1', title: '数学卷', priority: 'P0', done: true, completedAt: NOON, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now },
    { id: 't2', title: '英语', priority: 'P1', done: false, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now },
    { id: 't3', title: '无关任务', priority: 'P2', done: true, completedAt: '2026-08-29T12:00:00.000Z', note: '', projectId: '', dueDate: '2026-08-29', pinned: false, createdAt: now, updatedAt: now },
  ] as never)
  // 番茄钟（无 studySessions → fallback 路径）
  await db.pomodoroLogs.bulkAdd([
    { id: 'p1', date: D, duration: 25, subject: '数学', completed: true },
    { id: 'p2', date: D, duration: 30, subject: '数学', completed: true },
    { id: 'p3', date: D, duration: 15, completed: false },
    { id: 'p4', date: '2026-08-29', duration: 99, completed: true },
  ] as never)
  // 错题：1 今日攻克 + 1 未攻克
  await db.mistakes.bulkAdd([
    { id: 'm1', subject: '数学', question: 'q1', answer: '', errorType: '', tags: [], linkedKnowledge: [], mastered: true, masteredAt: NOON, reviewCount: 0, source: '', createdAt: now },
    { id: 'm2', subject: '物理', question: 'q2', answer: '', errorType: '', tags: [], linkedKnowledge: [], mastered: false, reviewCount: 0, source: '', createdAt: now },
  ] as never)
  // 闪卡复习：今日 2 次 + 昨日 1 次
  await db.flashcardReviews.bulkAdd([
    { id: 'f1', flashcardId: 'c1', rating: 'got', reviewedAt: NOON, nextReviewAt: NOON },
    { id: 'f2', flashcardId: 'c2', rating: 'fuzzy', reviewedAt: NOON, nextReviewAt: NOON },
    { id: 'f3', flashcardId: 'c3', rating: 'got', reviewedAt: '2026-08-29T12:00:00.000Z', nextReviewAt: NOON },
  ] as never)
  // 日历事件
  await db.events.bulkAdd([
    { date: D, type: 'custom', title: '数学周测', note: '', allDay: true, sourceType: null, sourceId: null, doneAt: null, createdAt: now, updatedAt: now },
    { date: '2026-09-01', type: 'custom', title: '开学', note: '', allDay: true, sourceType: null, sourceId: null, doneAt: null, createdAt: now, updatedAt: now },
  ] as never)
  // 日记
  await db.diaries.add({ date: D, type: 'quick', mood: 'good', weather: null, title: '今天', content: 'x', photos: [], tags: [], createdAt: now, updatedAt: now } as never)
  // PLAY：动画 2 集（今日 1）+ 游戏 1 + 音乐 1
  await db.anime.add({
    name: 'A', coverRef: null, status: 'watching', rating: null, favorite: false, thoughts: '',
    totalEpisodes: 12, watchedEpisodes: 5,
    episodeLog: [{ date: D, episode: 5 }, { date: '2026-08-28', episode: 4 }],
    completedAt: null, createdAt: now, updatedAt: now,
  } as never)
  await db.gameRecords.add({ gameId: 1, type: 'playtime', data: { minutes: 40 }, note: '', occurredAt: NOON, createdAt: now } as never)
  await db.music.add({ title: '曲', artist: '人', album: null, genre: null, thoughts: '', favorite: false, occurredAt: NOON, createdAt: now, updatedAt: now } as never)
}

describe('Night Shutdown', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useNightShutdownStore.setState({ current: null, aggregate: null, loading: false })
    await seedAll()
  })

  it('聚合正确：任务/学习(fallback)/错题/闪卡/事件/日记/PLAY', async () => {
    const agg = await aggregateNightShutdown(D)
    expect(agg.completed.map((t) => t.title)).toEqual(['数学卷'])
    expect(agg.unfinished.map((t) => t.title)).toEqual(['英语'])
    expect(agg.studyMinutes).toBe(55) // pomodoro fallback：25+30，未完成与昨日不计
    expect(agg.mistakesResolved.map((m) => m.id)).toEqual(['m1'])
    expect(agg.flashcardsReviewed).toBe(2)
    expect(agg.events).toHaveLength(1)
    expect(agg.diaries).toBe(1)
    expect(agg.play).toEqual({ episodesWatched: 1, gameRecords: 1, musicLogged: 1 })
  })

  it('studySessions 优先于 pomodoro（不叠加）', async () => {
    await db.studySessions.add({
      id: 's1', subjectId: '', taskId: '', startedAt: NOON, endedAt: NOON, duration: 90, note: '',
    } as never)
    const agg = await aggregateNightShutdown(D)
    expect(agg.studyMinutes).toBe(90)
  })

  it('complete：落库 + 发布事件 + 同日 upsert', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => {
      if (e.type === 'nightShutdown.completed') seen.push(e.type)
    })

    const id = await useNightShutdownStore.getState().complete({
      date: D, reason: '太累', reflection: '今天不错', tomorrowFocus: ['物理', '英语'],
    })
    expect(await db.nightShutdown.where('date').equals(D).count()).toBe(1)
    expect(seen).toContain('nightShutdown.completed')
    const row = await db.nightShutdown.get(id)
    expect(row?.completed.map((c: any) => c.title)).toEqual(['数学卷'])
    expect(row?.tomorrowFocus).toEqual(['物理', '英语'])

    // 同日再次收口 → 更新同一行（唯一索引不冲突）
    const id2 = await useNightShutdownStore.getState().complete({
      date: D, reason: '', reflection: '补充反思', tomorrowFocus: [],
    })
    expect(id2).toBe(id)
    expect(await db.nightShutdown.where('date').equals(D).count()).toBe(1)
    expect((await db.nightShutdown.get(id))?.reflection).toBe('补充反思')
  })

  it('loadByDate：空库聚合为全零且不抛', async () => {
    await db.delete()
    await db.open()
    await useNightShutdownStore.getState().loadByDate(D)
    const agg = useNightShutdownStore.getState().aggregate!
    expect(agg.completed).toHaveLength(0)
    expect(agg.studyMinutes).toBe(0)
    expect(useNightShutdownStore.getState().current).toBeNull()
  })
})
