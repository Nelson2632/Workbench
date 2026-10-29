import type { TimelineEvent, SourceType } from '@/types'
// Explicit allowlist: a Timeline payload cannot address security/internal tables.
export const SOURCE_TARGETS: Record<SourceType, { table: string; route: string; label: string; numeric: boolean }> = {
  task: { table: 'tasks', route: '/plan/today', label: '任务', numeric: false },
  studySession: { table: 'studySessions', route: '/study', label: '学习记录', numeric: false },
  mistake: { table: 'mistakes', route: '/study/mistakes', label: '错题', numeric: false },
  review: { table: 'reviewEntries', route: '/review/daily', label: '复盘', numeric: false },
  exam: { table: 'exams', route: '/study/exams', label: '考试', numeric: false },
  diary: { table: 'diaries', route: '/life/diary', label: '日记', numeric: true },
  lifeMoment: { table: 'lifeMoments', route: '/life/diary', label: '生活瞬间', numeric: true },
  event: { table: 'events', route: '/life/events', label: '日程', numeric: true },
  anime: { table: 'anime', route: '/play/anime', label: '动画', numeric: true },
  gameRecord: { table: 'gameRecords', route: '/play/games', label: '游戏记录', numeric: true },
  music: { table: 'music', route: '/play/music', label: '音乐', numeric: true },
  nightShutdown: { table: 'nightShutdown', route: '/today/night-shutdown', label: '今日收口', numeric: true },
}
export function resolveTimelineTarget(event: Pick<TimelineEvent, 'sourceType' | 'sourceId'>): string | null {
  if (!Object.hasOwn(SOURCE_TARGETS, event.sourceType)) return null
  return event.sourceType === 'task' ? `/plan/today?task=${encodeURIComponent(event.sourceId)}`
    : `/source/${event.sourceType}/${encodeURIComponent(event.sourceId)}`
}
