import { timestampDay, formatDate } from '@/utils/helpers'
// ============================================================
// V9 CROSS DOMAIN — Daily Memory Aggregator（V9-C-002 §6）
// Facts 机器派生可重建；Reflection 人类书写，聚合器永不写入
// Patch C-002-08：与 Night Shutdown 解耦（各自独立数据）
// ============================================================

import { db } from '@/db/database'
import { eventBus, isCriticalOwned, type AppEvent } from '@/domain/events/eventBus'
import type { DailyMemory, DailyMemoryFacts } from '@/types'

const EMPTY_FACTS: DailyMemoryFacts = {
  work: {
    tasksCompleted: 0, studyMinutes: 0, mistakesResolved: 0,
    flashcardsReviewed: 0, pomodoros: 0, nightShutdownDone: false,
  },
  life: { diaries: 0, lifeMoments: 0, events: 0, birthdays: [] },
  play: { episodesWatched: 0, animeCompleted: 0, gameRecords: 0, musicLogged: 0 },
}

function isSameDay(iso: string, date: string): boolean {
  return timestampDay(iso) === date
}

/** Facts 派生查询（V9-C-002 §6.2，全部可重建） */
export async function aggregateDailyMemoryFacts(date: string): Promise<DailyMemoryFacts> {
  const [tasks, studySessions, pomodoroLogs, mistakes, flashcardReviews, diaries, lifeMoments, events, anime, gameRecords, music, shutdownRow] =
    await Promise.all([
      db.tasks.toArray(),
      db.studySessions.toArray(),
      db.pomodoroLogs.toArray(),
      db.mistakes.toArray(),
      db.flashcardReviews.toArray(),
      db.diaries.where('date').equals(date).toArray(),
      db.lifeMoments.where('date').equals(date).toArray(),
      db.events.where('date').equals(date).toArray(),
      db.anime.toArray(),
      db.gameRecords.toArray(),
      db.music.toArray(),
      db.nightShutdown.where('date').equals(date).first(),
    ])

  const tasksCompleted = tasks.filter((t) => t.done && t.completedAt && isSameDay(t.completedAt, date)).length

  let studyMinutes = studySessions.filter((s) => isSameDay(s.endedAt, date)).reduce((s, x) => s + x.duration, 0)
  if (studyMinutes === 0) {
    studyMinutes = pomodoroLogs.filter((l) => l.date === date && l.completed).reduce((s, x) => s + x.duration, 0)
  }

  const mistakesResolved = mistakes.filter((m) => m.mastered && (m as any).masteredAt && isSameDay((m as any).masteredAt, date)).length
  const flashcardsReviewed = flashcardReviews.filter((r) => isSameDay(r.reviewedAt, date)).length
  const pomodoros = pomodoroLogs.filter((l) => l.date === date).length
  const nightShutdownDone = !!shutdownRow

  const birthdayNames = events
    .filter((e) => e.type === 'birthday')
    .map((e) => e.title.replace(' 生日', '').replace('🎂 ', ''))

  const episodesWatched = anime.reduce((s, a) => s + (a.episodeLog?.filter((e) => e.date === date).length ?? 0), 0)
  const animeCompleted = anime.filter((a) => a.completedAt && isSameDay(a.completedAt, date)).length
  const gameRecordsCount = gameRecords.filter((r) => isSameDay(r.occurredAt, date)).length
  const musicLogged = music.filter((m) => isSameDay(m.occurredAt, date)).length

  return {
    work: { tasksCompleted, studyMinutes, mistakesResolved, flashcardsReviewed, pomodoros, nightShutdownDone },
    life: { diaries: diaries.length, lifeMoments: lifeMoments.length, events: events.filter((e) => e.type === 'custom').length, birthdays: birthdayNames },
    play: { episodesWatched, animeCompleted, gameRecords: gameRecordsCount, musicLogged },
  }
}

/**
 * 合并写入 dailyMemory（仅 touch dailyMemory 表，不跨表读 facts）。
 * facts/reflection/lastAutoUpdate 由调用方预计算，供 Lane 事务内与 Background 复用。
 */
export async function upsertDailyMemoryRow(
  date: string,
  facts: DailyMemoryFacts,
  reflection: string,
  lastAutoUpdate: string | null,
): Promise<DailyMemory> {
  const now = new Date().toISOString()
  const existing = await db.dailyMemory.where('date').equals(date).first()
  if (existing) {
    const updated: DailyMemory = { ...existing, facts, reflection, lastAutoUpdate, updatedAt: now }
    await db.dailyMemory.put(updated)
    return updated
  }
  const row: Omit<DailyMemory, 'id'> = {
    date, facts, reflection, lastAutoUpdate, createdAt: now, updatedAt: now,
  }
  const id = await db.dailyMemory.add(row)
  return { ...row, id }
}

/**
 * 刷新 Facts（聚合器只写 facts + lastAutoUpdate，绝不写 reflection，V9-C-002 §6.3 硬规则）。
 * Background 直写路径（事件驱动重建），亦供 Store 手动刷新复用。
 */
let refreshTail: Promise<unknown> = Promise.resolve()
export function refreshDailyMemory(date: string): Promise<DailyMemory> {
  const job = refreshTail.then(async () => {
    const facts = await aggregateDailyMemoryFacts(date)
    // Read reflection at write time, atomically, so auto-refresh never overwrites
    // human input saved while aggregation was running.
    return db.transaction('rw', db.dailyMemory, async () => {
      const existing = await getDailyMemory(date)
      return upsertDailyMemoryRow(date, facts, existing?.reflection ?? '', new Date().toISOString())
    })
  })
  refreshTail = job.catch(() => undefined)
  return job
}

/** 人类反思：唯一写入 reflection 的入口（人书写，机器永不覆盖）。Background 直写路径。 */
export async function setDailyReflection(date: string, text: string): Promise<DailyMemory> {
  const initialFacts = await aggregateDailyMemoryFacts(date)
  return db.transaction('rw', db.dailyMemory, async () => {
    const existing = await getDailyMemory(date)
    return upsertDailyMemoryRow(date, existing?.facts ?? initialFacts, text, existing?.lastAutoUpdate ?? new Date().toISOString())
  })
}

export async function getDailyMemory(date: string): Promise<DailyMemory | null> {
  const row = await db.dailyMemory.where('date').equals(date).first()
  return row ?? null
}

// ---------- 聚合触发（V9-C-002 §6.4） ----------

let initialized = false

/** 测试辅助：允许重新装配订阅（EventBus.clear 后使用） */
export function _resetDailyMemoryForTests(): void {
  initialized = false
}

const pendingRefreshes = new Set<Promise<unknown>>()
export async function flushDailyMemoryEvents(): Promise<void> {
  while (pendingRefreshes.size) await Promise.allSettled([...pendingRefreshes])
}

async function refreshForEvent(event: AppEvent) {
  const dates = new Set([formatDate(new Date())])
  const mappings: Record<string, [string, string]> = {
    task: ['tasks', 'taskId'], studySession: ['studySessions', 'sessionId'],
    diary: ['diaries', 'diaryId'], lifeMoment: ['lifeMoments', 'lifeMomentId'],
    event: ['events', 'eventId'], anime: ['anime', 'animeId'],
    game: ['gameRecords', 'recordId'], music: ['music', 'musicId'], mistake: ['mistakes', 'mistakeId'],
  }
  const mapping = mappings[event.type.split('.')[0]]
  const payload = event as unknown as Record<string, unknown>
  if (mapping && payload[mapping[1]] !== undefined) {
    const row = await db.table(mapping[0]).get(payload[mapping[1]] as string | number)
    if (row) {
      if (row.date) dates.add(row.date)
      for (const key of ['completedAt', 'occurredAt', 'endedAt', 'masteredAt']) if (row[key]) dates.add(timestampDay(row[key]))
      for (const entry of row.episodeLog ?? []) dates.add(entry.date)
    }
  }
  if ('date' in event) dates.add(event.date)
  // Changed dates and removed sources no longer carry their previous date. Refresh
  // materialized memories so old days cannot keep stale counts.
  if (/\.(updated|deleted)$/.test(event.type) || event.type === 'timeline.rebuilt' || event.type === 'restore.completed') {
    for (const row of await db.dailyMemory.toArray()) dates.add(row.date)
  }
  for (const date of dates) if (date) await refreshDailyMemory(date)
}
export function setupDailyMemory(): void {
  if (initialized) return
  initialized = true
  eventBus.subscribeAll(event => {
    if (isCriticalOwned(event)) return
    if (!/^(task|studySession|pomodoro|flashcard|mistake|diary|lifeMoment|event|anime|game|gameRecord|music|nightShutdown)\./.test(event.type) && event.type !== 'timeline.rebuilt' && event.type !== 'restore.completed') return
    const job = refreshForEvent(event).catch(err => console.error('[DailyMemory] refresh failed:', err))
    pendingRefreshes.add(job)
    void job.finally(() => pendingRefreshes.delete(job))
  })
}

export { EMPTY_FACTS }
