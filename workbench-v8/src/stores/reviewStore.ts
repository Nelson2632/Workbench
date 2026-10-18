// ============================================================
// Personal Workbench V8 — Review Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid, formatDate } from '../utils/helpers'
import type {
  ReviewEntry,
  ReviewTemplate,
  ReviewType,
  DailyMetrics,
  SubjectMetrics,
  WeeklyMetrics,
  MonthlyMetrics,
  ExamMetrics,
} from '../types'
import {
  getDailyMetrics,
  getWeeklyMetrics,
  getMonthlyMetrics,
  getSubjectMetrics,
  getExamMetrics,
} from '../domain/review/reviewAggregator'

type ReviewSummary = DailyMetrics | SubjectMetrics | WeeklyMetrics | MonthlyMetrics | ExamMetrics

interface ReviewState {
  reviews: ReviewEntry[]
  templates: ReviewTemplate[]
  loading: boolean

  loadAll: () => Promise<void>

  // Reviews
  addReview: (review: Partial<ReviewEntry> & { type: ReviewType; dateRange: { start: string; end: string } }) => Promise<void>
  updateReview: (id: string, updates: Partial<ReviewEntry>) => Promise<void>
  deleteReview: (id: string) => Promise<void>

  // Templates
  addTemplate: (template: Partial<ReviewTemplate> & { name: string; type: string; questions: string[] }) => Promise<void>
  updateTemplate: (id: string, updates: Partial<ReviewTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  // Auto summary
  getAutoSummary: (type: ReviewType, dateRange: { start: string; end: string }) => Promise<ReviewSummary>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  templates: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const [reviews, templates] = await Promise.all([
        db.reviewEntries.toArray(),
        db.reviewTemplates.toArray(),
      ])
      set({ reviews, templates, loading: false })
    } catch (err) {
      // V9 硬化：读取失败不崩溃、状态回空（与 V9 各 Store 容错口径一致）
      console.error('[ReviewStore] loadAll failed:', err)
      set({ reviews: [], templates: [], loading: false })
    }
  },

  // ---- Reviews ----

  addReview: async (review) => {
    const now = new Date().toISOString()
    const newReview: ReviewEntry = {
      id: uid(),
      templateId: review.templateId || '',
      type: review.type,
      dateRange: review.dateRange,
      subjectId: review.subjectId,
      examId: review.examId,
      autoSummary: review.autoSummary,
      answers: review.answers || {},
      reflections: review.reflections || [],
      nextActions: review.nextActions || [],
      // V9（Patch C-002-03）：真实完成时间；Timeline occurredAt 取此值
      completedAt: now,
      createdAt: now,
    }
    await runCommand({
      commandType: 'review.create',
      commandId: 'cmd_' + uid(),
      tables: ['reviewEntries'],
      mutate: async () => {
        await db.reviewEntries.add(newReview)
      },
      events: () => [{ type: 'review.completed', reviewId: newReview.id, reviewType: newReview.type }],
      afterCommit: () => {
        set((s) => ({ reviews: [...s.reviews, newReview] }))
      },
    })
  },

  updateReview: async (id, updates) => {
    await runCommand({
      commandType: 'review.update',
      commandId: 'cmd_' + uid(),
      tables: ['reviewEntries'],
      mutate: async () => {
        await db.reviewEntries.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          reviews: s.reviews.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }))
      },
    })
  },

  deleteReview: async (id) => {
    await runCommand({
      commandType: 'review.delete',
      commandId: 'cmd_' + uid(),
      tables: ['reviewEntries'],
      mutate: async () => {
        await db.reviewEntries.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }))
      },
    })
  },

  // ---- Templates ----

  addTemplate: async (template) => {
    const newTemplate: ReviewTemplate = {
      id: uid(),
      name: template.name,
      type: template.type,
      questions: template.questions,
    }
    await runCommand({
      commandType: 'reviewTemplate.create',
      commandId: 'cmd_' + uid(),
      tables: ['reviewTemplates'],
      mutate: async () => {
        await db.reviewTemplates.add(newTemplate)
      },
      afterCommit: () => {
        set((s) => ({ templates: [...s.templates, newTemplate] }))
      },
    })
  },

  updateTemplate: async (id, updates) => {
    await runCommand({
      commandType: 'reviewTemplate.update',
      commandId: 'cmd_' + uid(),
      tables: ['reviewTemplates'],
      mutate: async () => {
        await db.reviewTemplates.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }))
      },
    })
  },

  deleteTemplate: async (id) => {
    await runCommand({
      commandType: 'reviewTemplate.delete',
      commandId: 'cmd_' + uid(),
      tables: ['reviewTemplates'],
      mutate: async () => {
        await db.reviewTemplates.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
      },
    })
  },

  // ---- Auto Summary ----

  getAutoSummary: async (type, dateRange): Promise<ReviewSummary> => {
    const [tasks, pomodoros, mistakes, flashcardReviews, exams] = await Promise.all([
      db.tasks.toArray(),
      db.pomodoroLogs.toArray(),
      db.mistakes.toArray(),
      db.flashcardReviews.toArray(),
      db.exams.toArray(),
    ])

    // 枚举 dateRange 内每一天（上限 366 天防死循环）
    const dates: string[] = []
    {
      let cursor = new Date(dateRange.start + 'T00:00:00')
      const end = new Date(dateRange.end + 'T00:00:00')
      let guard = 0
      while (cursor <= end && guard < 366) {
        dates.push(formatDate(cursor))
        cursor = new Date(cursor.getTime() + 86_400_000)
        guard++
      }
    }
    if (dates.length === 0) dates.push(dateRange.start)

    const dailyAll = dates.map((date) =>
      getDailyMetrics({ date, tasks, pomodoros, mistakes, flashcardReviews }),
    )
    const daily = dailyAll[0]!

    switch (type) {
      case 'daily':
        return daily
      case 'weekly':
        return getWeeklyMetrics(dateRange.start, dateRange.end, dailyAll)
      case 'monthly':
        return getMonthlyMetrics(dateRange.start, dailyAll)
      case 'subject':
        // 无指定学科 → 退化为 range 内通用指标（学科页走 getSubjectMetrics 直接派生）
        return getSubjectMetrics({
          subject: undefined,
          range: dateRange,
          tasks,
          pomodoros,
          mistakes,
          flashcardReviews,
        })
      case 'exam': {
        // 按日期范围关联考试，赋分优先取总分；对比相邻两场
        const sorted = exams
          .filter((e) => e.date >= dateRange.start && e.date <= dateRange.end)
          .sort((a, b) => a.date.localeCompare(b.date))
        const latest = sorted[sorted.length - 1]
        const prev = sorted[sorted.length - 2]
        const mistakesInRange = mistakes.filter((m) => {
          const d = m.createdAt.slice(0, 10)
          return d >= dateRange.start && d <= dateRange.end
        })
        return getExamMetrics({ exam: latest, prevExam: prev, mistakes: mistakesInRange })
      }
    }
  },
}))
