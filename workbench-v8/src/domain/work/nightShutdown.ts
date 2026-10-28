import { isActiveTask } from '@/domain/planning/taskLifecycle'
import { timestampDay } from '@/utils/helpers'
// ============================================================
// V9 WORK — Night Shutdown 聚合（V9_MASTER_PLAN §9 / V9-C-002 §6.5）
// 操作收口：聚合今日任务/学习/错题/闪卡/日历/日记/PLAY
// 不写 Daily Memory reflection（职责边界，Patch C-002-08）
// ============================================================

import { db } from '@/db/database'

export interface ShutdownAggregate {
  completed: { id: string; title: string }[]
  unfinished: { id: string; title: string }[]
  studyMinutes: number
  mistakesResolved: { id: string; subject: string }[]
  flashcardsReviewed: number
  events: { id: number; title: string; type: string }[]
  diaries: number
  play: {
    episodesWatched: number
    gameRecords: number
    musicLogged: number
  }
}

function isSameDay(iso: string, date: string): boolean {
  return timestampDay(iso) === date
}

/** 聚合某日各域事实（只读事实表；确定性，可反复调用） */
export async function aggregateNightShutdown(date: string): Promise<ShutdownAggregate> {
  const [tasks, studySessions, pomodoroLogs, mistakes, flashcardReviews, events, diaries, anime, gameRecords, music] =
    await Promise.all([
      db.tasks.toArray(),
      db.studySessions.toArray(),
      db.pomodoroLogs.toArray(),
      db.mistakes.toArray(),
      db.flashcardReviews.toArray(),
      db.events.where('date').equals(date).toArray(),
      db.diaries.where('date').equals(date).toArray(),
      db.anime.toArray(),
      db.gameRecords.toArray(),
      db.music.toArray(),
    ])

  const completed = tasks
    .filter((t) => t.done && t.completedAt && isSameDay(t.completedAt, date))
    .map((t) => ({ id: t.id, title: t.title }))
  const unfinished = tasks
    .filter((t) => !t.done && isActiveTask(t) && t.dueDate === date)
    .map((t) => ({ id: t.id, title: t.title }))

  let studyMinutes = studySessions
    .filter((s) => isSameDay(s.endedAt, date))
    .reduce((sum, s) => sum + s.duration, 0)
  if (studyMinutes === 0) {
    studyMinutes = pomodoroLogs
      .filter((l) => l.date === date && l.completed)
      .reduce((sum, l) => sum + l.duration, 0)
  }

  const mistakesResolved = mistakes
    .filter((m) => m.mastered && (m as any).masteredAt && isSameDay((m as any).masteredAt, date))
    .map((m) => ({ id: m.id, subject: m.subject }))

  const flashcardsReviewed = flashcardReviews.filter((r) => isSameDay(r.reviewedAt, date)).length

  const episodesWatched = anime.reduce(
    (sum, a) => sum + (a.episodeLog?.filter((e) => e.date === date).length ?? 0),
    0,
  )
  const gameRecordsCount = gameRecords.filter((r) => isSameDay(r.occurredAt, date)).length
  const musicLogged = music.filter((m) => isSameDay(m.occurredAt, date)).length

  return {
    completed,
    unfinished,
    studyMinutes,
    mistakesResolved,
    flashcardsReviewed,
    events: events.map((e) => ({ id: e.id, title: e.title, type: e.type })),
    diaries: diaries.length,
    play: { episodesWatched, gameRecords: gameRecordsCount, musicLogged },
  }
}
