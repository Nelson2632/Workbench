// ============================================================
// V9 Daily Memory Aggregator 测试（V9-C-002 §6）
// Facts 派生 / Reflection 永不覆盖 / 触发时机
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  aggregateDailyMemoryFacts,
  refreshDailyMemory,
  setDailyReflection,
  getDailyMemory,
  setupDailyMemory,
  _resetDailyMemoryForTests,
  flushDailyMemoryEvents,
} from './dailyMemory'

const D = '2026-08-30'
const NOON = new Date(2026, 7, 30, 12).toISOString()
const flush = flushDailyMemoryEvents

async function seedFacts(): Promise<void> {
  const now = NOON
  await db.tasks.add({ id: 't1', title: 'x', priority: 'P0', done: true, completedAt: now, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now } as never)
  await db.tasks.add({ id: 't2', title: 'y', priority: 'P1', done: false, note: '', projectId: '', dueDate: D, pinned: false, createdAt: now, updatedAt: now } as never)
  await db.studySessions.add({ id: 's1', subjectId: '', taskId: '', startedAt: now, endedAt: now, duration: 60, note: '' } as never)
  await db.mistakes.add({ id: 'm1', subject: '数', question: 'q', answer: '', errorType: '', tags: [], linkedKnowledge: [], mastered: true, masteredAt: now, reviewCount: 0, source: '', createdAt: now } as never)
  await db.flashcardReviews.add({ id: 'f1', flashcardId: 'c1', rating: 'got', reviewedAt: now, nextReviewAt: now } as never)
  await db.pomodoroLogs.add({ id: 'p1', date: D, duration: 25, completed: true } as never)
  await db.diaries.add({ date: D, type: 'quick', mood: null, weather: null, title: '', content: '', photos: [], tags: [], createdAt: now, updatedAt: now } as never)
  await db.lifeMoments.add({ date: D, content: 'x', photoRefs: [], createdAt: now } as never)
  await db.events.add({ date: D, type: 'custom', title: 'e', note: '', allDay: true, sourceType: null, sourceId: null, doneAt: null, createdAt: now, updatedAt: now } as never)
  await db.events.add({ date: D, type: 'birthday', title: '🎂 妈妈 生日', note: '', allDay: true, sourceType: 'friend', sourceId: '1', doneAt: null, createdAt: now, updatedAt: now } as never)
  await db.anime.add({ name: 'A', coverRef: null, status: 'completed', rating: null, favorite: false, thoughts: '', totalEpisodes: 2, watchedEpisodes: 2, episodeLog: [{ date: D, episode: 2 }], completedAt: now, createdAt: now, updatedAt: now } as never)
  await db.gameRecords.add({ gameId: 1, type: 'result', data: {}, note: '', occurredAt: now, createdAt: now } as never)
  await db.music.add({ title: 'm', artist: 'a', album: null, genre: null, thoughts: '', favorite: false, occurredAt: now, createdAt: now, updatedAt: now } as never)
  await db.nightShutdown.add({ date: D, completed: [], unfinished: [], reason: '', reflection: '', tomorrowFocus: [], createdAt: now, updatedAt: now } as never)
}

describe('Daily Memory', () => {
  beforeEach(async () => {
    await flushDailyMemoryEvents()
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetDailyMemoryForTests()
  })

  it('Facts 派生：三域计数精确（work/life/play）', async () => {
    await seedFacts()
    const facts = await aggregateDailyMemoryFacts(D)
    expect(facts.work).toMatchObject({ tasksCompleted: 1, studyMinutes: 60, mistakesResolved: 1, flashcardsReviewed: 1, pomodoros: 1, nightShutdownDone: true })
    expect(facts.life).toMatchObject({ diaries: 1, lifeMoments: 1, events: 1 }) // custom 1 + birthday 1 → events 只计 custom
    expect(facts.life.birthdays).toEqual(['妈妈'])
    expect(facts.play).toMatchObject({ episodesWatched: 1, animeCompleted: 1, gameRecords: 1, musicLogged: 1 })
  })

  it('studyMinutes 优先 studySessions；为 0 才回退 pomodoro（不叠加）', async () => {
    await db.pomodoroLogs.add({ id: 'p1', date: D, duration: 100, completed: true } as never)
    let facts = await aggregateDailyMemoryFacts(D)
    expect(facts.work.studyMinutes).toBe(100)

    await db.studySessions.add({ id: 's1', subjectId: '', taskId: '', startedAt: NOON, endedAt: NOON, duration: 30, note: '' } as never)
    facts = await aggregateDailyMemoryFacts(D)
    expect(facts.work.studyMinutes).toBe(30)
  })

  it('Reflection 硬规则：刷新 Facts 绝不覆盖人类反思', async () => {
    await seedFacts()
    await refreshDailyMemory(D)
    await setDailyReflection(D, '今天把错题弄明白了')
    const before = await getDailyMemory(D)
    expect(before?.reflection).toBe('今天把错题弄明白了')

    await refreshDailyMemory(D)
    const after = await getDailyMemory(D)
    expect(after?.reflection).toBe('今天把错题弄明白了') // 不被覆盖
    expect(after?.lastAutoUpdate).not.toBe(before?.lastAutoUpdate) // facts 确实刷新了
  })

  it('refresh 幂等：重复刷新同一天一行', async () => {
    await refreshDailyMemory(D)
    await refreshDailyMemory(D)
    expect(await db.dailyMemory.where('date').equals(D).count()).toBe(1)
  })

  it('触发：nightShutdown.completed → 自动刷新当日 Facts', async () => {
    setupDailyMemory()
    await db.tasks.add({ id: 't1', title: 'x', priority: 'P0', done: true, completedAt: NOON, note: '', projectId: '', dueDate: D, pinned: false, createdAt: NOON, updatedAt: NOON } as never)
    eventBus.publish({ type: 'nightShutdown.completed', date: D })
    await flush()
    const row = await getDailyMemory(D)
    expect(row).not.toBeNull()
    expect(row?.facts.work.tasksCompleted).toBe(1)
  })
})
