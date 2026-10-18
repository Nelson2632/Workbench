import { describe, it, expect } from 'vitest'
import { reviewToEntry, flashcardToSchedule } from './migrationV2'
import type { Review, Flashcard } from '@/types'

const review: Review = {
  id: 'r1',
  type: 'weekly',
  dateRange: { start: '2026-08-17', end: '2026-08-23' },
  subjectId: 's1',
  examId: undefined,
  autoSummary: { totalTasks: 5 },
  answers: { q1: '答' },
  reflections: ['反思'],
  nextActions: ['下一步'],
  createdAt: '2026-08-23T10:00:00.000Z',
}

const card: Flashcard = {
  id: 'c1',
  question: 'q',
  answer: 'a',
  subject: '数学',
  chapter: '函数',
  tags: [],
  difficulty: 3,
  mastery: 50,
  reviewCount: 4,
  correctCount: 3,
  wrongCount: 1,
  nextReviewAt: '2026-08-25T10:00:00.000Z',
  createdAt: '2026-08-20T10:00:00.000Z',
}

describe('migrationV2', () => {
  it('reviewToEntry 补 templateId 并保留回答/反思/下一步', () => {
    const entry = reviewToEntry(review, 'tpl-1')
    expect(entry.templateId).toBe('tpl-1')
    expect(entry.type).toBe('weekly')
    expect(entry.answers).toEqual({ q1: '答' })
    expect(entry.reflections).toEqual(['反思'])
    expect(entry.nextActions).toEqual(['下一步'])
    expect(entry.autoSummary).toEqual({ totalTasks: 5 })
  })

  it('reviewToEntry 默认 templateId 为空', () => {
    expect(reviewToEntry(review).templateId).toBe('')
  })

  it('flashcardToSchedule 将 mastery 语义转换为 easeFactor，而非直接搬家', () => {
    const s = flashcardToSchedule(card)
    expect(s.flashcardId).toBe('c1')
    expect(s.easeFactor).toBeCloseTo(1.3 + (50 / 100) * 1.2) // 1.9
    expect(s.reviewCount).toBe(4)
    expect(s.nextReviewAt).toBe('2026-08-25T10:00:00.000Z')
    expect(s.lastReviewedAt).toBe('2026-08-20T10:00:00.000Z')
  })

  it('flashcardToSchedule 钳制 mastery 并重置不可推导字段', () => {
    const over = flashcardToSchedule({ ...card, mastery: 150 })
    expect(over.easeFactor).toBeCloseTo(2.5)
    expect(over.consecutiveCorrect).toBe(0)
    expect(over.interval).toBe(0)
  })

  it('flashcardToSchedule 处理空字段回退', () => {
    const minimal = flashcardToSchedule({ ...card, nextReviewAt: '', mastery: 0 })
    expect(minimal.nextReviewAt).toBe('2026-08-20T10:00:00.000Z')
    expect(minimal.easeFactor).toBeCloseTo(1.3)
  })
})
