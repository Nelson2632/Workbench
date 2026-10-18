// ============================================================
// Personal Workbench V8 — Dexie v1 → v2 语义转换（纯函数，可单测）
// ============================================================

import type { Review, ReviewEntry, Flashcard, FlashcardSchedule } from '@/types'

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * reviews → reviewEntries（语义转换：补 templateId，保留回答/反思/下一步）。
 * templateId 默认空，具体模板关联在 Phase 8 完成。
 */
export function reviewToEntry(review: Review, templateId = ''): ReviewEntry {
  return {
    id: review.id,
    templateId,
    type: review.type,
    dateRange: review.dateRange,
    subjectId: review.subjectId,
    examId: review.examId,
    answers: review.answers || {},
    reflections: review.reflections || [],
    nextActions: review.nextActions || [],
    autoSummary: review.autoSummary || {},
    createdAt: review.createdAt,
  }
}

/**
 * flashcards.mastery(0–100) → FlashcardSchedule.easeFactor / consecutiveCorrect。
 * 二者语义不同，禁止字段直接搬家。
 */
export function flashcardToSchedule(card: Flashcard): FlashcardSchedule {
  const mastery = clamp(card.mastery ?? 0, 0, 100)
  return {
    flashcardId: card.id,
    nextReviewAt: card.nextReviewAt || card.createdAt,
    consecutiveCorrect: 0, // 无法从旧字段可靠推导，重置
    interval: 0, // 由调度器在下次复习时重新计算
    easeFactor: 1.3 + (mastery / 100) * 1.2, // mastery 0-100 → easeFactor 1.3-2.5
    reviewCount: card.reviewCount ?? 0,
    lastReviewedAt: card.createdAt, // 旧字段无 lastReviewedAt，回退 createdAt
  }
}
