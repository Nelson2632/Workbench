// ============================================================
// Dexie v1 → v2 迁移运行时测试（fake-indexeddb）
// 验证 upgrade 回调：reviews → reviewEntries、flashcards → flashcardSchedule
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { WorkbenchDB } from './database'

// 与 database.ts version(1) 一致的 schema
const V1_STORES = {
  tasks: '++id, dueDate, priority, done, pinned, projectId',
  recurringTasks: '++id, enabled',
  projects: '++id, stage',
  memos: '++id, createdAt',
  notes: '++id, notebook, favorite, updatedAt',
  flashcards: '++id, subject, chapter, knowledgeId, nextReviewAt',
  flashcardReviews: '++id, flashcardId, reviewedAt',
  subjects: '++id',
  mistakes: '++id, subject, mastered',
  exams: '++id, date',
  reviews: '++id, type',
  reviewTemplates: '++id, type',
  reading: '++id, pinned',
  finance: '++id, type, date',
  countdowns: '++id, showOnHome',
  pomodoroLogs: '++id, date',
  vault: '++id',
  settings: '&key',
}

async function seedV1(): Promise<void> {
  const v1 = new Dexie('WorkbenchV8')
  v1.version(1).stores(V1_STORES)
  await v1.open()

  await v1.table('reviews').bulkAdd([
    {
      id: 'r1',
      type: 'weekly',
      dateRange: { start: '2026-08-17', end: '2026-08-23' },
      reflections: ['本周反思'],
      nextActions: ['下周调整计划'],
      answers: { summary: '答' },
      autoSummary: { totalTasks: 3 },
      createdAt: '2026-08-23T00:00:00.000Z',
    },
  ])

  await v1.table('flashcards').bulkAdd([
    {
      id: 'f1',
      question: '问题1',
      answer: '答案1',
      subject: '数学',
      chapter: '',
      knowledgeId: undefined,
      tags: [],
      difficulty: 3,
      mastery: 80,
      reviewCount: 5,
      correctCount: 4,
      wrongCount: 1,
      nextReviewAt: '2026-08-24T00:00:00.000Z',
      createdAt: '2026-08-20T00:00:00.000Z',
    },
  ])

  v1.close()
}

describe('Dexie v1 → v2 migration（runtime）', () => {
  beforeEach(async () => {
    await new Dexie('WorkbenchV8').delete().catch(() => {})
    await seedV1()
  })

  it('reviews → reviewEntries（补 templateId，保留内容）', async () => {
    const db = new WorkbenchDB()
    await db.open()

    const entries = await db.reviewEntries.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('r1')
    expect(entries[0].type).toBe('weekly')
    expect(entries[0].templateId).toBe('')
    expect(entries[0].reflections).toEqual(['本周反思'])
    expect(entries[0].nextActions).toEqual(['下周调整计划'])

    await db.close()
  })

  it('flashcards → flashcardSchedule（mastery → easeFactor 语义转换）', async () => {
    const db = new WorkbenchDB()
    await db.open()

    const schedules = await db.flashcardSchedule.toArray()
    expect(schedules).toHaveLength(1)
    expect(schedules[0].flashcardId).toBe('f1')
    // mastery 80 → easeFactor = 1.3 + 0.8 * 1.2 = 2.26
    expect(schedules[0].easeFactor).toBeCloseTo(2.26, 2)
    expect(schedules[0].reviewCount).toBe(5)
    expect(schedules[0].nextReviewAt).toBe('2026-08-24T00:00:00.000Z')

    await db.close()
  })
})
