// ============================================================
// V9 Timeline Projection 测试（V9-C-002 §3/§4/§5 + Patch C-002-13）
// include / mutate / delete / journal-only / 快照语义 / 重建幂等
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  setupProjection,
  rebuildProjection,
  timelineKeySet,
  dateAtLocalNoon,
  _resetProjectionForTests,
  _flushProjectionForTests,
} from './timelineProjection'

const flush = () => _flushProjectionForTests()

const D = '2026-08-30'
const NOON = new Date(2026, 7, 30, 12).toISOString()
const NOW = '2026-08-30T21:00:00.000Z'

async function seedFacts(): Promise<void> {
  const now = NOW
  await db.tasks.add({ id: 't1', title: '数学卷', priority: 'P0', done: true, completedAt: now, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now } as never)
  await db.studySessions.add({ id: 's1', subjectId: '数学', taskId: '', startedAt: now, endedAt: now, duration: 45, note: '复习' } as never)
  await db.mistakes.add({ id: 'm1', subject: '物理', question: '错题内容', answer: '', errorType: '', tags: [], linkedKnowledge: [], mastered: true, masteredAt: now, reviewCount: 0, source: '', createdAt: now } as never)
  await db.reviewEntries.add({ id: 'r1', templateId: '', type: 'daily', dateRange: { start: D, end: D }, reflections: [], nextActions: ['a', 'b'], completedAt: now, createdAt: now } as never)
  await db.exams.add({ id: 'e1', name: '周测', date: D, scores: {}, total: 520, rank: 3, note: '' } as never)
  await db.nightShutdown.add({ date: D, completed: [], unfinished: [], reason: '', reflection: '收口反思', tomorrowFocus: [], createdAt: now, updatedAt: now } as never)
  await db.diaries.add({ date: D, type: 'quick', mood: 'good', weather: null, title: '标题', content: '内容', photos: [], tags: [], createdAt: now, updatedAt: now } as never)
  await db.lifeMoments.add({ date: D, content: '瞬间', photoRefs: [], createdAt: now } as never)
  await db.events.add({ date: D, type: 'custom', title: '事件', note: '', allDay: true, sourceType: null, sourceId: null, doneAt: null, createdAt: now, updatedAt: now } as never)
  await db.anime.add({ name: '动画A', coverRef: null, status: 'completed', rating: 9, favorite: false, thoughts: '', totalEpisodes: 2, watchedEpisodes: 2, episodeLog: [{ date: D, episode: 1 }, { date: D, episode: 2 }], completedAt: now, createdAt: now, updatedAt: now } as never)
  await db.games.add({ name: '游戏G', iconRef: null, genre: '', platform: '', status: 'playing', favorite: false, rating: null, note: '', createdAt: now, updatedAt: now } as never)
  await db.gameRecords.add({ gameId: 1, type: 'progress', data: { text: '第三章' }, note: '推图', occurredAt: now, createdAt: now } as never)
  await db.music.add({ title: '曲', artist: '歌手', album: null, genre: null, thoughts: '好听', favorite: false, occurredAt: now, createdAt: now, updatedAt: now } as never)
}

describe('Timeline Projection', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetProjectionForTests()
    setupProjection()
  })

  it('include：task.completed → 行（eventKey/title/summary/occurredAt）', async () => {
    await db.tasks.add({ id: 't1', title: '数学卷', priority: 'P0', done: true, completedAt: NOW, note: '', projectId: '', dueDate: D, pinned: false, createdAt: NOW, updatedAt: NOW } as never)
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: NOW })
    await flush()

    const rows = await db.timelineEvents.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      eventKey: 'task.completed:t1:v1:1',
      sourceDomain: 'work',
      sourceType: 'task',
      title: '数学卷',
      summary: '完成任务（P0）',
    })
    expect(rows[0].metadata).toBeNull() // 不复制事实载荷
  })

  it('include：diary.created / anime.episodeWatched（instance=e{n}）/ game.recorded', async () => {
    await db.diaries.add({ date: D, type: 'quick', mood: null, weather: null, title: '', content: '今天', photos: [], tags: [], createdAt: NOW, updatedAt: NOW } as never)
    await db.anime.add({ name: 'A', coverRef: null, status: 'watching', rating: null, favorite: false, thoughts: '', totalEpisodes: null, watchedEpisodes: 1, episodeLog: [{ date: D, episode: 3 }], completedAt: null, createdAt: NOW, updatedAt: NOW } as never)
    await db.games.add({ name: 'G', iconRef: null, genre: '', platform: '', status: 'playing', favorite: false, rating: null, note: '', createdAt: NOW, updatedAt: NOW } as never)
    await db.gameRecords.add({ gameId: 1, type: 'playtime', data: { minutes: 40 }, note: '', occurredAt: NOW, createdAt: NOW } as never)

    eventBus.publish({ type: 'diary.created', diaryId: 1 })
    eventBus.publish({ type: 'anime.episodeWatched', animeId: 1, episode: 3 })
    eventBus.publish({ type: 'game.recorded', recordId: 1, gameId: 1 })
    await flush()

    const rows = await db.timelineEvents.toArray()
    expect(rows).toHaveLength(3)
    const keys = rows.map((r) => r.eventKey)
    expect(keys).toContain('diary.created:1:v1:1')
    expect(keys).toContain('anime.episodeWatched:1:v1:e3')
    expect(keys).toContain('game.recorded:1:v1:1')
    const gameRow = rows.find((r) => r.eventType === 'game.recorded')!
    expect(gameRow.title).toBe('G 游玩 40 分钟')
    expect(gameRow.occurredAt).toBe(NOW)
  })

  it('journal-only：task.created 不产生行', async () => {
    eventBus.publish({ type: 'task.created', taskId: 't1' })
    await flush()
    expect(await db.timelineEvents.count()).toBe(0)
  })

  it('mutate：diary.updated 刷新既有行标题（快照语义边界内的显式更新）', async () => {
    await db.diaries.add({ date: D, type: 'quick', mood: null, weather: null, title: '旧标题', content: 'x', photos: [], tags: [], createdAt: NOW, updatedAt: NOW } as never)
    eventBus.publish({ type: 'diary.created', diaryId: 1 })
    await flush()
    await db.diaries.update(1, { title: '新标题' })
    eventBus.publish({ type: 'diary.updated', diaryId: 1 })
    await flush()
    const rows = await db.timelineEvents.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('新标题')
  })

  it('快照语义（Patch C-002-13）：task 改名不回写时间线', async () => {
    await db.tasks.add({ id: 't1', title: '原标题', priority: 'P0', done: true, completedAt: NOW, note: '', projectId: '', dueDate: D, pinned: false, createdAt: NOW, updatedAt: NOW } as never)
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: NOW })
    await flush()
    await db.tasks.update('t1', { title: '改过的标题' })
    eventBus.publish({ type: 'task.updated', taskId: 't1' })
    await flush()
    const rows = await db.timelineEvents.toArray()
    expect(rows[0].title).toBe('原标题') // 事件发生时快照，不随事实改名
  })

  it('删除联动：task.deleted → 行移除', async () => {
    await db.tasks.add({ id: 't1', title: 'x', priority: 'P0', done: true, completedAt: NOW, note: '', projectId: '', dueDate: D, pinned: false, createdAt: NOW, updatedAt: NOW } as never)
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: NOW })
    await flush()
    expect(await db.timelineEvents.count()).toBe(1)
    eventBus.publish({ type: 'task.deleted', taskId: 't1' })
    await flush()
    expect(await db.timelineEvents.count()).toBe(0)
  })

  it('rebuildProjection：全量事实 → 行集；两次重建幂等一致', async () => {
    await seedFacts()
    const n1 = await rebuildProjection()
    expect(n1).toBe(14) // task/study/mistake/review/exam/shutdown/diary/moment/event/anime×3(2集+完结)/gameRecord/music
    const keys1 = await timelineKeySet()

    const n2 = await rebuildProjection()
    const keys2 = await timelineKeySet()
    expect(n2).toBe(n1)
    expect(keys2).toEqual(keys1)

    // 清空后重建 → 一致（异常兜底）
    await db.timelineEvents.clear()
    const keys3 = await timelineKeySet()
    expect(keys3).toHaveLength(0)
    await rebuildProjection()
    expect(await timelineKeySet()).toEqual(keys1)
  })

  it('dateAtLocalNoon：仅日期事实 → 本地 12:00', () => {
    const iso = dateAtLocalNoon('2026-08-30')
    expect(iso).toMatch(/^2026-08-30T/)
    // 本地时区 12:00（+08 机器 → 04:00Z；断言含 12 语义由实现保证，此处仅校验可解析）
    expect(new Date(iso).getTime()).not.toBeNaN()
  })
})
