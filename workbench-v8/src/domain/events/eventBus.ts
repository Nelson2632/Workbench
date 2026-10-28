// ============================================================
// Personal Workbench V9 — Event Bus（发布/订阅）
// V8 既有 8 类事件原样保留；V9 新增事件按 PROJECTION_CONTRACT §2
// 冻结表扩展。跨域联动唯一主路径（V9-C-002 §1.3）。
// ============================================================

import type { ReviewRating, ReviewType } from '@/types'

// ---- V8 既有事件（原样保留，不得破坏 V8 调用方）----

export type V8AppEvent =
  | { type: 'task.completed'; taskId: string; completedAt: string }
  | { type: 'task.created'; taskId: string }
  | { type: 'pomodoro.completed'; duration: number; taskId?: string }
  | { type: 'flashcard.reviewed'; flashcardId: string; rating: ReviewRating }
  | { type: 'mistake.created'; mistakeId: string; subject: string }
  | { type: 'exam.created'; examId: string }
  | { type: 'review.completed'; reviewId: string; reviewType: ReviewType }
  | { type: 'recurring.generated'; ruleId: string; taskIds: string[] }

// ---- V9 WORK 新增（V9-C-002 §2）----

export type V9WorkEvent =
  | { type: 'task.updated'; taskId: string }
  | { type: 'task.deleted'; taskId: string }
  | { type: 'studySession.completed'; sessionId: string; duration: number }
  | { type: 'mistake.resolved'; mistakeId: string }
  | { type: 'mistake.deleted'; mistakeId: string }
  | { type: 'exam.deleted'; examId: string }
  | { type: 'review.deleted'; reviewId: string }
  | { type: 'nightShutdown.completed'; date: string }
  | { type: 'flexStudy.fallback'; reason: string }

// ---- V9 LIFE 新增（V9-C-002 §2）----

export type V9LifeEvent =
  | { type: 'diary.created'; diaryId: number }
  | { type: 'diary.updated'; diaryId: number }
  | { type: 'diary.deleted'; diaryId: number }
  | { type: 'lifeMoment.created'; lifeMomentId: number }
  | { type: 'lifeMoment.deleted'; lifeMomentId: number }
  | { type: 'event.created'; eventId: number }
  | { type: 'event.updated'; eventId: number }
  | { type: 'event.completed'; eventId: number }
  | { type: 'event.deleted'; eventId: number }
  | { type: 'friend.created'; friendId: number }
  | { type: 'friend.updated'; friendId: number }
  | { type: 'friend.deleted'; friendId: number }
  | { type: 'friend.birthday'; friendId: number; date: string }

// ---- V9 PLAY 新增（V9-C-002 §2）----

export type V9PlayEvent =
  | { type: 'anime.created'; animeId: number }
  | { type: 'anime.updated'; animeId: number }
  | { type: 'anime.episodeWatched'; animeId: number; episode: number }
  | { type: 'anime.completed'; animeId: number }
  | { type: 'anime.deleted'; animeId: number }
  | { type: 'game.created'; gameId: number }
  | { type: 'game.updated'; gameId: number }
  | { type: 'game.deleted'; gameId: number }
  | { type: 'game.recorded'; recordId: number; gameId: number }
  | { type: 'gameRecord.deleted'; recordId: number }
  | { type: 'music.logged'; musicId: number }
  | { type: 'music.deleted'; musicId: number }

// ---- V9 SYSTEM 事件（仅入 Journal，不进 Timeline）----

export type V9SystemEvent =
  | { type: 'backup.created'; snapshotId: string }
  | { type: 'restore.completed'; snapshotId: string }
  | { type: 'timeline.rebuilt' }
  | { type: 'migration.completed'; runId: string }
  | { type: 'appLock.locked' }
  | { type: 'appLock.unlocked' }
  | { type: 'collection.favorited'; sourceType: string; sourceId: string }
  | { type: 'collection.unfavorited'; sourceType: string; sourceId: string }

export type AppEvent = V8AppEvent | V9WorkEvent | V9LifeEvent | V9PlayEvent | V9SystemEvent

/** V9-C-001 §3.2 类型拆名（Patch C-001-07）：
 *  DomainEvent = 领域事件（EventBus 载荷）；CalendarEvent = events 表实体。
 *  两者不得混用同一标识符，禁止出现 event.event 语义污染。 */
export type DomainEvent = AppEvent

type EventHandler = (event: AppEvent) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()
  private allHandlers = new Set<EventHandler>()

  /** 订阅事件（泛型收口，handler 收到窄化的具体事件类型），返回取消订阅函数 */
  subscribe<T extends AppEvent['type']>(
    type: T,
    handler: (event: Extract<AppEvent, { type: T }>) => void,
  ): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    const wrapped = handler as EventHandler
    set.add(wrapped)
    return () => {
      set.delete(wrapped)
    }
  }

  /** 订阅全部事件（Journal 汇流等系统消费端使用）；返回取消订阅函数 */
  subscribeAll(handler: (event: AppEvent) => void): () => void {
    this.allHandlers.add(handler)
    return () => {
      this.allHandlers.delete(handler)
    }
  }

  /** 发布事件；单个 handler 异常不阻断其余 handler（V8 既有语义保持） */
  publish(event: AppEvent): void {
    const targets: EventHandler[] = [...this.allHandlers]
    const set = this.handlers.get(event.type)
    if (set) targets.push(...set)
    for (const handler of targets) {
      try {
        handler(event)
      } catch (err) {
        console.error(`[EventBus] handler error for "${event.type}":`, err)
      }
    }
  }

  clear(): void {
    this.handlers.clear()
    this.allHandlers.clear()
  }
}

export const eventBus = new EventBus()

// Only the opt-in command coordinator owns these projections. Other subscribers
// (notifications, collection, etc.) still receive the ordinary domain event.
const CRITICAL_OWNED = Symbol('critical-projection-owned')
export function markCriticalOwned(event: AppEvent): AppEvent {
  Object.defineProperty(event, CRITICAL_OWNED, { value: true })
  return event
}
export function isCriticalOwned(event: AppEvent): boolean {
  return (event as unknown as Record<symbol, unknown>)[CRITICAL_OWNED] === true
}

// ---------- Journal 已落库标记（R6-06 v1.7） ----------
// Mutation Lane 在事务内已把领域事件写入 operationJournal，提交后再发布。
// 用非枚举 Symbol 标记，避免 Journal sink 二次汇流写入；不影响 { ...event } 展开与 payload 派生。

const JOURNALED = Symbol('journaled')

/** 给事件打上「已由 Mutation Lane 落 journal」标记（原地，返回同一对象） */
export function markJournaled<T extends AppEvent>(event: T): T {
  Object.defineProperty(event, JOURNALED, { value: true, enumerable: false, configurable: false })
  return event
}

/** 事件是否已由 Mutation Lane 落 journal（Journal sink 据此跳过，避免重复写） */
export function isJournaled(event: AppEvent): boolean {
  return (event as Record<symbol, unknown>)[JOURNALED] === true
}
