// ============================================================
// V9 CROSS DOMAIN — Timeline Projection（V9-C-002 冻结）
// EventBus → timelineEvents（只存 sourceType/sourceId/事件元数据，不复制事实载荷）
// 删除联动 / 快照语义（事件时点）/ rebuildProjection() 确定性重建
// Patch C-002-06：投影消费方允许直读事实表（用于派生标题摘要）
// ============================================================

import { db } from '@/db/database'
import { eventBus, isCriticalOwned, type DomainEvent } from '@/domain/events/eventBus'
import { faultInjection } from '@/utils/faultInjection'
import type { SourceType, Task, StudySession, Mistake, ReviewEntry, Exam, NightShutdown, Diary, LifeMoment, CalendarEvent, Anime, GameRecord, Game, MusicMemory } from '@/types'

// ---------- 映射表（V9-C-002 §3） ----------

const INCLUDE_SOURCE: Record<string, SourceType> = {
  'task.completed': 'task',
  'studySession.completed': 'studySession',
  'mistake.resolved': 'mistake',
  'review.completed': 'review',
  'exam.created': 'exam',
  'nightShutdown.completed': 'nightShutdown',
  'diary.created': 'diary',
  'lifeMoment.created': 'lifeMoment',
  'event.created': 'event',
  'anime.episodeWatched': 'anime',
  'anime.completed': 'anime',
  'game.recorded': 'gameRecord',
  'music.logged': 'music',
}

const MUTATE_EVENTS = new Set(['task.updated', 'diary.updated', 'event.updated', 'event.completed'])

const DELETE_LINKAGE: Record<string, SourceType> = {
  'task.deleted': 'task',
  'diary.deleted': 'diary',
  'lifeMoment.deleted': 'lifeMoment',
  'event.deleted': 'event',
  'anime.deleted': 'anime',
  'gameRecord.deleted': 'gameRecord',
  'music.deleted': 'music',
  'review.deleted': 'review',
  'exam.deleted': 'exam',
  'mistake.deleted': 'mistake',
}

/** 仅日期事实 → 本地时区当日 12:00（V9-C-002 §5.3） */
export function dateAtLocalNoon(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString()
}

export function makeEventKey(_sourceType: string, sourceId: string, eventType: string, instance = '1'): string {
  // DP1.6 canonical repeated form: <eventType>:<aggregateId>:<semanticVersion>:<stableEventIdentity>
  // semanticVersion 固定 "v1"；sourceType 不再入 key（eventType 已含来源域，且 key 需跨版本稳定）
  return `${eventType}:${sourceId}:v1:${instance}`
}

// ---------- 行派生（title/summary/occurredAt 模板，V9-C-002 §3） ----------

interface DerivedRow {
  eventKey: string
  sourceDomain: 'work' | 'life' | 'play'
  sourceType: SourceType
  sourceId: string
  eventType: string
  occurredAt: string
  title: string
  summary: string
  metadata: Record<string, unknown> | null
}

function fallbackTime(primary: string | null | undefined, secondary: string | null | undefined, dateStr?: string): string {
  if (primary) return primary
  if (secondary) return secondary
  if (dateStr) return dateAtLocalNoon(dateStr)
  return new Date().toISOString()
}

async function deriveTaskCompleted(taskId: string, cached?: Task): Promise<DerivedRow | null> {
  const t = cached ?? await db.tasks.get(taskId)
  if (!t || !t.done) return null
  return {
    eventKey: makeEventKey('task', taskId, 'task.completed'),
    sourceDomain: 'work', sourceType: 'task', sourceId: taskId, eventType: 'task.completed',
    occurredAt: fallbackTime(t.completedAt, t.updatedAt),
    title: t.title,
    summary: `完成任务（${t.priority}）`,
    metadata: null,
  }
}

async function deriveStudySession(sessionId: string, cached?: StudySession): Promise<DerivedRow | null> {
  const s = cached ?? await db.studySessions.get(sessionId)
  if (!s) return null
  return {
    eventKey: makeEventKey('studySession', sessionId, 'studySession.completed'),
    sourceDomain: 'work', sourceType: 'studySession', sourceId: sessionId, eventType: 'studySession.completed',
    occurredAt: fallbackTime(s.endedAt, s.startedAt),
    title: `学习 ${s.duration} 分钟`,
    summary: [s.subjectId, s.note].filter(Boolean).join(' '),
    metadata: null,
  }
}

async function deriveMistakeResolved(mistakeId: string, cached?: Mistake): Promise<DerivedRow | null> {
  const m = cached ?? await db.mistakes.get(mistakeId)
  if (!m) return null
  return {
    eventKey: makeEventKey('mistake', mistakeId, 'mistake.resolved'),
    sourceDomain: 'work', sourceType: 'mistake', sourceId: mistakeId, eventType: 'mistake.resolved',
    occurredAt: fallbackTime((m as any).masteredAt, m.createdAt),
    title: `错题攻克：${m.question.slice(0, 30)}`,
    summary: m.subject,
    metadata: null,
  }
}

async function deriveReviewCompleted(reviewId: string, cached?: ReviewEntry): Promise<DerivedRow | null> {
  const r = cached ?? await db.reviewEntries.get(reviewId)
  if (!r) return null
  return {
    eventKey: makeEventKey('review', reviewId, 'review.completed'),
    sourceDomain: 'work', sourceType: 'review', sourceId: reviewId, eventType: 'review.completed',
    // Patch C-002-03：occurredAt 取 completedAt，绝不取 createdAt
    occurredAt: fallbackTime((r as any).completedAt, r.createdAt),
    title: `${r.type} 复盘完成`,
    summary: (r.nextActions ?? []).slice(0, 3).join('；'),
    metadata: null,
  }
}

async function deriveExamCreated(examId: string, cached?: Exam): Promise<DerivedRow | null> {
  const e = cached ?? await db.exams.get(examId)
  if (!e) return null
  return {
    eventKey: makeEventKey('exam', examId, 'exam.created'),
    sourceDomain: 'work', sourceType: 'exam', sourceId: examId, eventType: 'exam.created',
    // Patch C-002-04：历史事实时间语义，occurredAt 一律取 exam.date
    occurredAt: dateAtLocalNoon(e.date),
    title: `考试记录：${e.name}`,
    summary: `总分 ${e.total}，排名 ${e.rank}`,
    metadata: null,
  }
}

async function deriveNightShutdown(date: string, cached?: NightShutdown): Promise<DerivedRow | null> {
  const row = cached ?? await db.nightShutdown.where('date').equals(date).first()
  if (!row) return null
  return {
    eventKey: makeEventKey('nightShutdown', String(row.id), 'nightShutdown.completed'),
    sourceDomain: 'work', sourceType: 'nightShutdown', sourceId: String(row.id), eventType: 'nightShutdown.completed',
    occurredAt: fallbackTime(row.createdAt, undefined),
    title: '今日收口完成',
    summary: (row.reflection || '').slice(0, 60),
    metadata: null,
  }
}

async function deriveDiaryCreated(diaryId: number, cached?: Diary): Promise<DerivedRow | null> {
  const d = cached ?? await db.diaries.get(diaryId)
  if (!d) return null
  return {
    eventKey: makeEventKey('diary', String(diaryId), 'diary.created'),
    sourceDomain: 'life', sourceType: 'diary', sourceId: String(diaryId), eventType: 'diary.created',
    occurredAt: dateAtLocalNoon(d.date),
    title: d.title || '日记',
    summary: d.content.slice(0, 60),
    metadata: null,
  }
}

async function deriveLifeMoment(id: number, cached?: LifeMoment): Promise<DerivedRow | null> {
  const m = cached ?? await db.lifeMoments.get(id)
  if (!m) return null
  return {
    eventKey: makeEventKey('lifeMoment', String(id), 'lifeMoment.created'),
    sourceDomain: 'life', sourceType: 'lifeMoment', sourceId: String(id), eventType: 'lifeMoment.created',
    occurredAt: dateAtLocalNoon(m.date),
    title: '生活瞬间',
    summary: m.content.slice(0, 60),
    metadata: null,
  }
}

async function deriveEventCreated(eventId: number, cached?: CalendarEvent): Promise<DerivedRow | null> {
  const e = cached ?? await db.events.get(eventId)
  if (!e) return null
  return {
    eventKey: makeEventKey('event', String(eventId), 'event.created'),
    sourceDomain: 'life', sourceType: 'event', sourceId: String(eventId), eventType: 'event.created',
    occurredAt: dateAtLocalNoon(e.date),
    title: e.type === 'birthday' ? `🎂 ${e.title}` : e.title,
    summary: (e.note || '').slice(0, 60),
    metadata: e.doneAt ? { doneAt: e.doneAt } : null,
  }
}

async function deriveAnimeEpisode(animeId: number, episode: number, cached?: Anime): Promise<DerivedRow | null> {
  const a = cached ?? await db.anime.get(animeId)
  if (!a) return null
  const entry = a.episodeLog?.find((e) => e.episode === episode)
  return {
    eventKey: makeEventKey('anime', String(animeId), 'anime.episodeWatched', `e${episode}`),
    sourceDomain: 'play', sourceType: 'anime', sourceId: String(animeId), eventType: 'anime.episodeWatched',
    occurredAt: entry ? dateAtLocalNoon(entry.date) : fallbackTime(a.updatedAt, undefined),
    title: `看完 ${a.name} 第 ${episode} 集`,
    summary: entry?.note ?? '',
    metadata: null,
  }
}

async function deriveAnimeCompleted(animeId: number, cached?: Anime): Promise<DerivedRow | null> {
  const a = cached ?? await db.anime.get(animeId)
  if (!a) return null
  return {
    eventKey: makeEventKey('anime', String(animeId), 'anime.completed'),
    sourceDomain: 'play', sourceType: 'anime', sourceId: String(animeId), eventType: 'anime.completed',
    occurredAt: fallbackTime(a.completedAt, a.updatedAt),
    title: `看完 ${a.name}`,
    summary: a.rating != null ? `评分 ${a.rating}` : '',
    metadata: null,
  }
}

async function deriveGameRecord(recordId: number, gameId: number, cached?: GameRecord, cachedGame?: Game | null): Promise<DerivedRow | null> {
  const rec = cached ?? await db.gameRecords.get(recordId)
  const game = cachedGame === undefined ? await db.games.get(gameId) : cachedGame
  if (!rec) return null
  const gname = game?.name ?? `游戏#${gameId}`
  const titleMap: Record<string, string> = {
    profile: `游戏档案更新：${gname}`,
    progress: `${gname} 进度更新`,
    playtime: `${gname} 游玩 ${(rec.data as any)?.minutes ?? ''} 分钟`.replace(' 分钟', ' 分钟'),
    result: `${gname} 战绩记录`,
    note: `${gname} 笔记`,
    combat: `${gname} 战斗模拟`,
  }
  return {
    eventKey: makeEventKey('gameRecord', String(recordId), 'game.recorded'),
    sourceDomain: 'play', sourceType: 'gameRecord', sourceId: String(recordId), eventType: 'game.recorded',
    occurredAt: fallbackTime(rec.occurredAt, rec.createdAt),
    title: titleMap[rec.type] ?? `${gname} 记录`,
    summary: (rec.note || '').slice(0, 60),
    metadata: null,
  }
}

async function deriveMusicLogged(musicId: number, cached?: MusicMemory): Promise<DerivedRow | null> {
  const m = cached ?? await db.music.get(musicId)
  if (!m) return null
  return {
    eventKey: makeEventKey('music', String(musicId), 'music.logged'),
    sourceDomain: 'play', sourceType: 'music', sourceId: String(musicId), eventType: 'music.logged',
    occurredAt: fallbackTime(m.occurredAt, m.createdAt),
    title: `听了 ${m.title} — ${m.artist}`,
    summary: (m.thoughts || '').slice(0, 60),
    metadata: null,
  }
}

// ---------- 事件处理（include / mutate / delete） ----------

function asRow(derived: DerivedRow): Omit<import('@/types').TimelineEvent, 'id'> {
  return { ...derived, createdAt: new Date().toISOString() }
}

async function handleInclude(event: DomainEvent): Promise<void> {
  const sourceType = INCLUDE_SOURCE[event.type]
  if (!sourceType) return
  let derived: DerivedRow | null = null
  switch (event.type) {
    case 'task.completed': derived = await deriveTaskCompleted(event.taskId); break
    case 'studySession.completed': derived = await deriveStudySession(event.sessionId); break
    case 'mistake.resolved': derived = await deriveMistakeResolved(event.mistakeId); break
    case 'review.completed': derived = await deriveReviewCompleted(event.reviewId); break
    case 'exam.created': derived = await deriveExamCreated(event.examId); break
    case 'nightShutdown.completed': derived = await deriveNightShutdown(event.date); break
    case 'diary.created': derived = await deriveDiaryCreated(event.diaryId); break
    case 'lifeMoment.created': derived = await deriveLifeMoment(event.lifeMomentId); break
    case 'event.created': derived = await deriveEventCreated(event.eventId); break
    case 'anime.episodeWatched': derived = await deriveAnimeEpisode(event.animeId, event.episode); break
    case 'anime.completed': derived = await deriveAnimeCompleted(event.animeId); break
    case 'game.recorded': derived = await deriveGameRecord(event.recordId, event.gameId); break
    case 'music.logged': derived = await deriveMusicLogged(event.musicId); break
  }
  if (!derived) return // 事实行不存在 → 仅 Journal
  // 按 eventKey upsert（唯一索引）
  const existing = await db.timelineEvents.where('eventKey').equals(derived.eventKey).first()
  if (existing) {
    await db.timelineEvents.update(existing.id, {
      occurredAt: derived.occurredAt, title: derived.title, summary: derived.summary, metadata: derived.metadata,
    })
  } else {
    await db.timelineEvents.add(asRow(derived))
  }
}

async function handleMutate(event: DomainEvent): Promise<void> {
  if (event.type === 'task.updated') {
    const task = await db.tasks.get(event.taskId)
    if (!task?.done) {
      await handleDeleteLinkage({ type: 'task.deleted', taskId: event.taskId })
    } else if (!(await db.timelineEvents.where('eventKey').equals(makeEventKey('task', task.id, 'task.completed')).first())) {
      await handleInclude({ type: 'task.completed', taskId: task.id, completedAt: task.completedAt || task.updatedAt })
    }
  } else if (event.type === 'diary.updated') {
    const derived = await deriveDiaryCreated(event.diaryId)
    if (!derived) return
    const row = await db.timelineEvents.where('eventKey').equals(derived.eventKey).first()
    if (row) {
      await db.timelineEvents.update(row.id, { title: derived.title, summary: derived.summary })
    }
  } else if (event.type === 'event.updated' || event.type === 'event.completed') {
    const derived = await deriveEventCreated(event.eventId)
    if (!derived) return
    const row = await db.timelineEvents.where('eventKey').equals(derived.eventKey).first()
    if (row) {
      await db.timelineEvents.update(row.id, { metadata: derived.metadata })
    }
  }
}

async function handleDeleteLinkage(event: DomainEvent): Promise<void> {
  const sourceType = DELETE_LINKAGE[event.type]
  if (!sourceType) return
  const sourceId =
    event.type === 'task.deleted' || event.type === 'mistake.deleted' ||
    event.type === 'review.deleted' || event.type === 'exam.deleted'
      ? (event as any).taskId ?? (event as any).mistakeId ?? (event as any).reviewId ?? (event as any).examId
      : String(
          (event as any).diaryId ?? (event as any).lifeMomentId ?? (event as any).eventId ??
          (event as any).animeId ?? (event as any).recordId ?? (event as any).musicId,
        )
  const rows = await db.timelineEvents
    .where('[sourceType+sourceId]')
    .equals([sourceType, sourceId])
    .toArray()
  if (rows.length > 0) {
    await db.timelineEvents.bulkDelete(rows.map((r) => r.id))
  }
}

// ---------- 重建（V9-C-002 §5） ----------

/** 全量事实派生（只读，跨表读取事实源）；供 rebuild 与 Store 手动重建复用 */
export async function deriveAllRows(): Promise<DerivedRow[]> {
  const derived: DerivedRow[] = []
  const games = new Map((await db.games.toArray()).map(game => [game.id, game]))

  const tasks = await db.tasks.toArray()
  for (const t of tasks) {
    if (!t.done) continue
    const d = await deriveTaskCompleted(t.id, t)
    if (d) derived.push(d)
  }
  for (const s of await db.studySessions.toArray()) {
    const d = await deriveStudySession(s.id, s)
    if (d) derived.push(d)
  }
  const mistakes = await db.mistakes.toArray()
  for (const m of mistakes) {
    if (!m.mastered) continue
    const d = await deriveMistakeResolved(m.id, m)
    if (d) derived.push(d)
  }
  for (const r of await db.reviewEntries.toArray()) {
    const d = await deriveReviewCompleted(r.id, r)
    if (d) derived.push(d)
  }
  for (const e of await db.exams.toArray()) {
    const d = await deriveExamCreated(e.id, e)
    if (d) derived.push(d)
  }
  for (const n of await db.nightShutdown.toArray()) {
    const d = await deriveNightShutdown(n.date, n)
    if (d) derived.push(d)
  }
  for (const d0 of await db.diaries.toArray()) {
    const d = await deriveDiaryCreated(d0.id, d0)
    if (d) derived.push(d)
  }
  for (const lm of await db.lifeMoments.toArray()) {
    const d = await deriveLifeMoment(lm.id, lm)
    if (d) derived.push(d)
  }
  for (const e of await db.events.toArray()) {
    const d = await deriveEventCreated(e.id, e)
    if (d) derived.push(d)
  }
  for (const a of await db.anime.toArray()) {
    for (const entry of a.episodeLog ?? []) {
      const d = await deriveAnimeEpisode(a.id, entry.episode, a)
      if (d) derived.push(d)
    }
    if (a.completedAt) {
      const d = await deriveAnimeCompleted(a.id, a)
      if (d) derived.push(d)
    }
  }
  for (const rec of await db.gameRecords.toArray()) {
    const d = await deriveGameRecord(rec.id, rec.gameId, rec, games.get(rec.gameId) ?? null)
    if (d) derived.push(d)
  }
  for (const m of await db.music.toArray()) {
    const d = await deriveMusicLogged(m.id, m)
    if (d) derived.push(d)
  }

  return derived
}

/** 只写 timelineEvents（clear + bulkAdd）；供 Lane 事务内与 Background 重建复用 */
export async function writeProjectionRows(derived: DerivedRow[]): Promise<number> {
  await db.timelineEvents.clear()
  const now = new Date().toISOString()
  await db.timelineEvents.bulkAdd(derived.map((d) => ({ ...d, createdAt: now })))
  return derived.length
}

export const PROJECTION_FACT_TABLES = ['tasks', 'studySessions', 'mistakes', 'reviewEntries', 'exams', 'nightShutdown', 'diaries', 'lifeMoments', 'events', 'anime', 'games', 'gameRecords', 'music']
export async function rebuildProjection(): Promise<number> {
  const pending = projectionTail.then(() => db.transaction('rw', [...PROJECTION_FACT_TABLES.map(name => db.table(name)), db.timelineEvents], async () => writeProjectionRows(await deriveAllRows())))
  projectionTail = pending.catch(() => undefined)
  const count = await pending
  eventBus.publish({ type: 'timeline.rebuilt' })
  return count
}

/** 测试辅助：当前时间线 key 集合（重建幂等断言用） */
export async function timelineKeySet(): Promise<string[]> {
  const rows = await db.timelineEvents.toArray()
  return rows.map((r) => r.eventKey).sort()
}

// ---------- 装配（幂等，仅启动一次） ----------

let initialized = false
const pendingHandlers = new Set<Promise<unknown>>()

/** 测试辅助：允许重新装配订阅（EventBus.clear 后使用） */
export function _resetProjectionForTests(): void {
  initialized = false
}

/** 测试辅助：等待所有已派发的投影 handler 完成（消除 fire-and-forget 竞态） */
export async function _flushProjectionForTests(): Promise<void> {
  while (pendingHandlers.size > 0) {
    await Promise.allSettled([...pendingHandlers])
  }
}

// Shared serialized writer avoids duplicate eventKey races between commands and
// background subscriptions. Failures propagate to critical callers.
let projectionTail: Promise<unknown> = Promise.resolve()
export function projectTimelineEvent(event: DomainEvent): Promise<void> {
  const p = projectionTail.then(async () => {
    await faultInjection.fire('mid_projection')
    if (INCLUDE_SOURCE[event.type]) await handleInclude(event)
    else if (MUTATE_EVENTS.has(event.type)) await handleMutate(event)
    else if (DELETE_LINKAGE[event.type]) await handleDeleteLinkage(event)
  })
  projectionTail = p.catch(() => undefined)
  return p
}

export function setupProjection(): void {
  if (initialized) return
  initialized = true
  eventBus.subscribeAll((event) => {
    if (isCriticalOwned(event)) return
    const p = projectTimelineEvent(event).catch((err) => {
      console.error(`[TimelineProjection] handler error for "${event.type}":`, err)
    })
    pendingHandlers.add(p)
    void p.finally(() => pendingHandlers.delete(p))
  })
}
