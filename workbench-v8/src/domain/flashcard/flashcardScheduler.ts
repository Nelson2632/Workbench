// ============================================================
// Personal Workbench V8 — Flashcard Scheduler（间隔重复，简化）
// ============================================================

import type { ReviewRating, FlashcardSchedule } from '@/types'

/** 四档评价 → 初始间隔（天） */
export const RATING_INTERVAL_DAYS: Record<ReviewRating, number> = {
  forgot: 1,
  fuzzy: 3,
  got: 7,
  mastered: 14,
}

const DAY_MS = 86_400_000

/** 该评价是否计入「答对」 */
export function isCorrectRating(rating: ReviewRating): boolean {
  return rating === 'got' || rating === 'mastered'
}

/** 根据评价计算下次复习时间 */
export function computeNextReviewAt(now: Date, rating: ReviewRating): string {
  return new Date(now.getTime() + RATING_INTERVAL_DAYS[rating] * DAY_MS).toISOString()
}

/** 根据评价计算掌握度增减（答对 +10，答错 -5） */
export function computeMasteryDelta(rating: ReviewRating): number {
  return isCorrectRating(rating) ? 10 : -5
}

/** 掌握度钳制到 [0, 100] */
export function clampMastery(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** 初始调度状态（新建闪卡时） */
export function createInitialSchedule(flashcardId: string): FlashcardSchedule {
  return {
    flashcardId,
    nextReviewAt: new Date().toISOString(),
    consecutiveCorrect: 0,
    interval: 1,
    easeFactor: 2.5,
    reviewCount: 0,
    lastReviewedAt: '',
  }
}

/** 简化 SM-2：根据当前调度 + 四档评价，计算下一次调度状态 */
export function scheduleFlashcard(
  current: FlashcardSchedule,
  rating: ReviewRating,
): FlashcardSchedule {
  const correct = isCorrectRating(rating)
  const consecutiveCorrect = correct ? current.consecutiveCorrect + 1 : 0
  const easeFactor = correct
    ? Math.max(1.3, current.easeFactor + 0.1)
    : Math.max(1.3, current.easeFactor - 0.2)
  const now = new Date()
  return {
    flashcardId: current.flashcardId,
    nextReviewAt: computeNextReviewAt(now, rating),
    consecutiveCorrect,
    interval: RATING_INTERVAL_DAYS[rating],
    easeFactor,
    reviewCount: current.reviewCount + 1,
    lastReviewedAt: now.toISOString(),
  }
}
