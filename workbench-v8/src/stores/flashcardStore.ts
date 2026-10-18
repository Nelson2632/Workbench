// ============================================================
// Personal Workbench V8 — Flashcard Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Flashcard, FlashcardReview, ReviewRating } from '../types'
import {
  isCorrectRating,
  computeNextReviewAt,
  computeMasteryDelta,
  clampMastery,
  scheduleFlashcard,
  createInitialSchedule,
} from '../domain/flashcard/flashcardScheduler'
import type { Subject, Chapter, Topic, FlashcardSchedule } from '../types'

/**
 * 查找或创建「学科 → 章节 → 知识点」层级，返回知识点 id。
 * 用于闪卡导入时自动匹配/创建（W-15）。
 */
async function ensureKnowledgePath(
  subjectName: string,
  chapterName: string,
  knowledgeName: string,
): Promise<string | undefined> {
  if (!subjectName) return undefined
  const subjects = await db.subjects.toArray()
  let subject = subjects.find((s) => s.name === subjectName)
  if (!subject) {
    const next: Subject = { id: uid(), name: subjectName, chapters: [] }
    await db.subjects.add(next)
    subject = next
  }
  if (!chapterName) return undefined
  let chapter = subject.chapters.find((c) => c.name === chapterName)
  if (!chapter) {
    const next: Chapter = { id: uid(), name: chapterName, subjectId: subject.id, topics: [] }
    subject.chapters.push(next)
    await db.subjects.update(subject.id, { chapters: subject.chapters })
    chapter = next
  }
  if (!knowledgeName) return undefined
  let topic = chapter.topics.find((t) => t.name === knowledgeName)
  if (!topic) {
    const next: Topic = {
      id: uid(),
      name: knowledgeName,
      chapterId: chapter.id,
      mastery: 'notStarted',
      notes: '',
      relatedMistakes: [],
    }
    chapter.topics.push(next)
    await db.subjects.update(subject.id, { chapters: subject.chapters })
    topic = next
  }
  return topic.id
}

interface FlashcardState {
  flashcards: Flashcard[]
  reviews: FlashcardReview[]
  schedules: FlashcardSchedule[]
  loading: boolean

  loadAll: () => Promise<void>
  addFlashcard: (card: Partial<Flashcard> & { question: string; answer: string }) => Promise<void>
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => Promise<void>
  deleteFlashcard: (id: string) => Promise<void>
  getDueCards: () => Flashcard[]
  addReview: (flashcardId: string, rating: ReviewRating) => Promise<void>
  importCSV: (csvText: string) => Promise<number>
  importJSON: (jsonText: string) => Promise<number>
  importPaste: (text: string) => Promise<number>
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  flashcards: [],
  reviews: [],
  schedules: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [flashcards, reviews, schedules] = await Promise.all([
      db.flashcards.toArray(),
      db.flashcardReviews.toArray(),
      db.flashcardSchedule.toArray(),
    ])
    set({ flashcards, reviews, schedules, loading: false })
  },

  addFlashcard: async (card) => {
    const now = new Date().toISOString()
    const newCard: Flashcard = {
      id: uid(),
      question: card.question,
      answer: card.answer,
      subject: card.subject || '',
      chapter: card.chapter || '',
      knowledgeId: card.knowledgeId,
      tags: card.tags || [],
      difficulty: card.difficulty ?? 3,
      mastery: card.mastery ?? 0,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      nextReviewAt: now,
      createdAt: now,
    }
    const schedule = createInitialSchedule(newCard.id)
    await runCommand({
      commandType: 'flashcard.create',
      commandId: 'cmd_' + uid(),
      tables: ['flashcards', 'flashcardSchedule'],
      mutate: async () => {
        await db.flashcards.add(newCard)
        await db.flashcardSchedule.add(schedule)
      },
      afterCommit: () => {
        set((s) => ({
          flashcards: [...s.flashcards, newCard],
          schedules: [...s.schedules, schedule],
        }))
      },
    })
  },

  updateFlashcard: async (id, updates) => {
    await runCommand({
      commandType: 'flashcard.update',
      commandId: 'cmd_' + uid(),
      tables: ['flashcards'],
      mutate: async () => {
        await db.flashcards.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          flashcards: s.flashcards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        }))
      },
    })
  },

  deleteFlashcard: async (id) => {
    await runCommand({
      commandType: 'flashcard.delete',
      commandId: 'cmd_' + uid(),
      tables: ['flashcards', 'flashcardReviews', 'flashcardSchedule'],
      mutate: async () => {
        await db.flashcards.delete(id)
        // Also delete associated reviews and schedule
        await db.flashcardReviews.where('flashcardId').equals(id).delete()
        await db.flashcardSchedule.where('flashcardId').equals(id).delete()
      },
      afterCommit: () => {
        set((s) => ({
          flashcards: s.flashcards.filter((c) => c.id !== id),
          reviews: s.reviews.filter((r) => r.flashcardId !== id),
          schedules: s.schedules.filter((sc) => sc.flashcardId !== id),
        }))
      },
    })
  },

  getDueCards: () => {
    const now = new Date().toISOString()
    return get().flashcards.filter((c) => c.nextReviewAt <= now)
  },

  addReview: async (flashcardId, rating) => {
    const card = get().flashcards.find((c) => c.id === flashcardId)
    if (!card) return

    const now = new Date()
    const nextReviewAt = computeNextReviewAt(now, rating)
    const correct = isCorrectRating(rating)

    const review: FlashcardReview = {
      id: uid(),
      flashcardId,
      rating,
      reviewedAt: now.toISOString(),
      nextReviewAt,
    }

    const updates: Partial<Flashcard> = {
      nextReviewAt,
      reviewCount: card.reviewCount + 1,
      correctCount: card.correctCount + (correct ? 1 : 0),
      wrongCount: card.wrongCount + (correct ? 0 : 1),
      mastery: clampMastery(card.mastery + computeMasteryDelta(rating)),
    }

    const { result } = await runCommand<{ nextSchedule: FlashcardSchedule; existing: FlashcardSchedule | undefined }>({
      commandType: 'flashcard.review',
      commandId: 'cmd_' + uid(),
      tables: ['flashcardReviews', 'flashcards', 'flashcardSchedule'],
      mutate: async () => {
        await db.flashcardReviews.add(review)
        await db.flashcards.update(flashcardId, updates)

        // 更新 flashcardSchedule（简化 SM-2）
        const existing = await db.flashcardSchedule
          .where('flashcardId')
          .equals(flashcardId)
          .first()
        const nextSchedule = scheduleFlashcard(
          existing ?? createInitialSchedule(flashcardId),
          rating,
        )
        if (existing) {
          await db.flashcardSchedule
            .where('flashcardId')
            .equals(flashcardId)
            .modify(nextSchedule)
        } else {
          await db.flashcardSchedule.add(nextSchedule)
        }
        return { nextSchedule, existing }
      },
      events: () => [{ type: 'flashcard.reviewed', flashcardId, rating }],
      afterCommit: ({ nextSchedule, existing }) => {
        set((s) => ({
          reviews: [...s.reviews, review],
          flashcards: s.flashcards.map((c) =>
            c.id === flashcardId ? { ...c, ...updates } : c,
          ),
          schedules: existing
            ? s.schedules.map((sc) =>
                sc.flashcardId === flashcardId ? { ...sc, ...nextSchedule } : sc,
              )
            : [...s.schedules, nextSchedule],
        }))
      },
    })
    void result
  },

  importCSV: async (csvText) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return 0

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const qIdx = headers.indexOf('question')
    const aIdx = headers.indexOf('answer')
    const sIdx = headers.indexOf('subject')
    const cIdx = headers.indexOf('chapter')
    const kIdx = headers.indexOf('knowledge')

    const now = new Date().toISOString()
    const { result } = await runCommand<Flashcard[]>({
      commandType: 'flashcard.importCSV',
      commandId: 'cmd_' + uid(),
      tables: ['flashcards', 'subjects'],
      mutate: async () => {
        const cards: Flashcard[] = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim())
          if (qIdx === -1 || aIdx === -1 || !cols[qIdx] || !cols[aIdx]) continue

          const subjectName = sIdx >= 0 ? cols[sIdx] || '' : ''
          const chapterName = cIdx >= 0 ? cols[cIdx] || '' : ''
          const knowledgeName = kIdx >= 0 ? cols[kIdx] || '' : ''
          // 自动匹配/创建知识点层级，返回知识点 id（W-15）
          const knowledgeId = await ensureKnowledgePath(subjectName, chapterName, knowledgeName)

          cards.push({
            id: uid(),
            question: cols[qIdx],
            answer: cols[aIdx],
            subject: subjectName,
            chapter: chapterName,
            knowledgeId,
            tags: [],
            difficulty: 3,
            mastery: 0,
            reviewCount: 0,
            correctCount: 0,
            wrongCount: 0,
            nextReviewAt: now,
            createdAt: now,
          })
        }
        if (cards.length > 0) {
          await db.flashcards.bulkAdd(cards)
        }
        return cards
      },
      afterCommit: (cards) => {
        if (cards.length > 0) {
          set((s) => ({ flashcards: [...s.flashcards, ...cards] }))
        }
      },
    })
    return result ? result.length : 0
  },

  importJSON: async (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      const now = new Date().toISOString()

      const cards: Flashcard[] = arr.filter(Boolean).map((item: any) => ({
        id: uid(),
        question: item.question || item.Question || '',
        answer: item.answer || item.Answer || '',
        subject: item.subject || item.Subject || '',
        chapter: item.chapter || item.Chapter || '',
        knowledgeId: item.knowledgeId,
        tags: item.tags || [],
        difficulty: item.difficulty ?? 3,
        mastery: item.mastery ?? 0,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        nextReviewAt: now,
        createdAt: now,
      }))

      const { result } = await runCommand<Flashcard[]>({
        commandType: 'flashcard.importJSON',
        commandId: 'cmd_' + uid(),
        tables: ['flashcards'],
        mutate: async () => {
          if (cards.length > 0) await db.flashcards.bulkAdd(cards)
          return cards
        },
        afterCommit: (c) => {
          if (c.length > 0) {
            set((s) => ({ flashcards: [...s.flashcards, ...c] }))
          }
        },
      })
      return result ? result.length : 0
    } catch {
      return 0
    }
  },

  importPaste: async (text) => {
    // Try to detect format: Q: ... A: ... per line, or JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return get().importJSON(text)
    }

    // Try Q/A format
    const lines = text.trim().split('\n')
    const cards: Flashcard[] = []
    const now = new Date().toISOString()
    let currentQ = ''
    let currentA = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^[Qq][:：]/.test(trimmed) || /^问[:：]/.test(trimmed)) {
        if (currentQ && currentA) {
          cards.push({
            id: uid(),
            question: currentQ,
            answer: currentA,
            subject: '',
            chapter: '',
            knowledgeId: undefined,
            tags: [],
            difficulty: 3,
            mastery: 0,
            reviewCount: 0,
            correctCount: 0,
            wrongCount: 0,
            nextReviewAt: now,
            createdAt: now,
          })
        }
        currentQ = trimmed.replace(/^[Qq问][:：]\s*/, '')
        currentA = ''
      } else if (/^[Aa][:：]/.test(trimmed) || /^答[:：]/.test(trimmed)) {
        currentA = trimmed.replace(/^[Aa答][:：]\s*/, '')
      } else if (trimmed) {
        currentA += (currentA ? '\n' : '') + trimmed
      }
    }

    if (currentQ && currentA) {
      cards.push({
        id: uid(),
        question: currentQ,
        answer: currentA,
        subject: '',
        chapter: '',
        knowledgeId: undefined,
        tags: [],
        difficulty: 3,
        mastery: 0,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        nextReviewAt: now,
        createdAt: now,
      })
    }

    if (cards.length === 0) return 0

    const { result } = await runCommand<Flashcard[]>({
      commandType: 'flashcard.importPaste',
      commandId: 'cmd_' + uid(),
      tables: ['flashcards'],
      mutate: async () => {
        await db.flashcards.bulkAdd(cards)
        return cards
      },
      afterCommit: (c) => {
        set((s) => ({ flashcards: [...s.flashcards, ...c] }))
      },
    })
    return result ? result.length : 0
  },
}))
