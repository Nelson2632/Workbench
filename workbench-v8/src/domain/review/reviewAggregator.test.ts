import { describe, it, expect } from 'vitest'
import {
  getDailyMetrics,
  getWeeklyMetrics,
  getMonthlyMetrics,
  getSubjectMetrics,
  getExamMetrics,
  getSubjectTimeMap,
  getTaskStats,
  getPomodoroStats,
  countMistakes,
  sumReadingPages,
  countReadingBooks,
  countReviews,
  getPrevExam,
  getMistakesOnDate,
} from './reviewAggregator'
import type {
  Task,
  PomodoroLog,
  Mistake,
  FlashcardReview,
  Reading,
  ReviewEntry,
  Exam,
  Subject,
} from '@/types'

const D = '2026-08-23'

function task(id: string, done: boolean, dueDate: string, subject?: string): Task {
  return { id, title: 'x', priority: 'P0', done, note: '', projectId: '', dueDate, pinned: false, createdAt: '', updatedAt: '', subject }
}

function pomo(id: string, date: string, duration: number, subject?: string): PomodoroLog {
  return { id, date, duration, subject, completed: true }
}

function mistake(id: string, subject: string, createdAt: string, errorType = '', linked: string[] = []): Mistake {
  return { id, subject, question: '', answer: '', errorType, tags: [], linkedKnowledge: linked, mastered: false, reviewCount: 0, source: '', createdAt }
}

function fr(id: string, reviewedAt: string, rating: FlashcardReview['rating']): FlashcardReview {
  return { id, flashcardId: 'f', rating, reviewedAt, nextReviewAt: '' }
}

describe('reviewAggregator', () => {
  it('computes daily metrics', () => {
    const tasks: Task[] = [task('a', true, D), task('b', false, D)]
    const pomodoros: PomodoroLog[] = [pomo('p', D, 25)]
    const mistakes: Mistake[] = [mistake('m', '数学', `${D}T10:00:00.000Z`)]
    const reviews: FlashcardReview[] = [
      fr('r1', `${D}T09:00:00.000Z`, 'got'),
      fr('r2', `${D}T10:00:00.000Z`, 'forgot'),
    ]

    const m = getDailyMetrics({ date: D, tasks, pomodoros, mistakes, flashcardReviews: reviews })

    expect(m.tasksTotal).toBe(2)
    expect(m.tasksCompleted).toBe(1)
    expect(m.studyDuration).toBe(25)
    expect(m.pomodoroCount).toBe(1)
    expect(m.mistakesCreated).toBe(1)
    expect(m.flashcardsReviewed).toBe(2)
    expect(m.flashcardsCorrect).toBe(1)
  })

  it('computes weekly totals from daily metrics', () => {
    const daily = [
      { date: '2026-08-17', tasksTotal: 1, tasksCompleted: 1, studyDuration: 30, pomodoroCount: 1, mistakesCreated: 0, flashcardsReviewed: 0, flashcardsCorrect: 0 },
      { date: '2026-08-18', tasksTotal: 1, tasksCompleted: 0, studyDuration: 20, pomodoroCount: 1, mistakesCreated: 1, flashcardsReviewed: 1, flashcardsCorrect: 1 },
    ]
    const w = getWeeklyMetrics('2026-08-17', '2026-08-23', daily)
    expect(w.totalStudyDuration).toBe(50)
    expect(w.totalTasksCompleted).toBe(1)
    expect(w.daily.length).toBe(2)
  })
})

describe('reviewAggregator — 页面派生指标纯函数', () => {
  const range = { start: '2026-08-17', end: '2026-08-23' }

  it('getMonthlyMetrics builds heatmap + totals', () => {
    const daily = [
      { date: '2026-08-17', tasksTotal: 0, tasksCompleted: 0, studyDuration: 30, pomodoroCount: 1, mistakesCreated: 0, flashcardsReviewed: 0, flashcardsCorrect: 0 },
      { date: '2026-08-18', tasksTotal: 0, tasksCompleted: 0, studyDuration: 20, pomodoroCount: 1, mistakesCreated: 0, flashcardsReviewed: 0, flashcardsCorrect: 0 },
    ]
    const m = getMonthlyMetrics('2026-08-01', daily)
    expect(m.month).toBe('2026-08')
    expect(m.totalStudyDuration).toBe(50)
    expect(m.heatmapData['2026-08-17']).toBe(30)
    expect(m.heatmapData['2026-08-18']).toBe(20)
  })

  it('getSubjectTimeMap aggregates by subject', () => {
    const map = getSubjectTimeMap(
      [pomo('1', '2026-08-17', 25, '数学'), pomo('2', '2026-08-18', 30, '数学'), pomo('3', '2026-08-19', 15, '英语'), pomo('4', '2026-08-20', 10)],
      range,
    )
    expect(map['数学']).toBe(55)
    expect(map['英语']).toBe(15)
    expect(map['其他']).toBe(10)
  })

  it('getTaskStats computes completionRate', () => {
    const stats = getTaskStats([task('a', true, '2026-08-17'), task('b', false, '2026-08-18'), task('c', false, '2026-08-30')], range)
    expect(stats.total).toBe(2)
    expect(stats.completed).toBe(1)
    expect(stats.completionRate).toBe(50)
  })

  it('getPomodoroStats sums minutes and count', () => {
    const stats = getPomodoroStats([pomo('1', '2026-08-17', 25), pomo('2', '2026-08-18', 30), pomo('3', '2026-08-30', 50)], range)
    expect(stats.minutes).toBe(55)
    expect(stats.count).toBe(2)
  })

  it('countMistakes filters by createdAt date', () => {
    const n = countMistakes(
      [mistake('m1', '数学', '2026-08-17T10:00:00.000Z'), mistake('m2', '数学', '2026-08-23T23:59:00.000Z'), mistake('m3', '数学', '2026-08-24T00:00:00.000Z')],
      range,
    )
    expect(n).toBe(2)
  })

  it('sumReadingPages sums current within range', () => {
    const reading: Reading[] = [
      { id: 'r1', title: 'A', status: 'reading', current: 30, target: 100, unit: '页', note: '', pinned: false, createdAt: '2026-08-17T10:00:00.000Z' },
      { id: 'r2', title: 'B', status: 'reading', current: 20, target: 100, unit: '页', note: '', pinned: false, createdAt: '2026-08-20T10:00:00.000Z' },
      { id: 'r3', title: 'C', status: 'reading', current: 40, target: 100, unit: '页', note: '', pinned: false, createdAt: '2026-08-30T10:00:00.000Z' },
    ]
    expect(sumReadingPages(reading, range)).toBe(50)
    expect(countReadingBooks(reading, range)).toBe(2)
  })

  it('countReviews counts entries whose dateRange falls within range', () => {
    const reviews: ReviewEntry[] = [
      { id: '1', templateId: '', type: 'weekly', dateRange: { start: '2026-08-17', end: '2026-08-23' }, answers: {}, reflections: [], nextActions: [], createdAt: '' },
      { id: '2', templateId: '', type: 'weekly', dateRange: { start: '2026-08-24', end: '2026-08-30' }, answers: {}, reflections: [], nextActions: [], createdAt: '' },
    ]
    expect(countReviews(reviews, range)).toBe(1)
  })

  it('getPrevExam returns predecessor by date', () => {
    const exams: Exam[] = [
      { id: 'e1', name: '一', date: '2026-06-01', scores: {}, assignedScores: {}, total: 400, assignedTotal: 0, rank: 1, note: '' },
      { id: 'e2', name: '二', date: '2026-07-01', scores: {}, assignedScores: {}, total: 450, assignedTotal: 0, rank: 1, note: '' },
      { id: 'e3', name: '三', date: '2026-08-01', scores: {}, assignedScores: {}, total: 500, assignedTotal: 0, rank: 1, note: '' },
    ]
    expect(getPrevExam(exams, 'e3')?.id).toBe('e2')
    expect(getPrevExam(exams, 'e1')).toBeUndefined()
  })

  it('getMistakesOnDate filters by exact date', () => {
    const ms = [
      mistake('m1', '数学', '2026-08-01T10:00:00.000Z'),
      mistake('m2', '数学', '2026-08-01T11:00:00.000Z'),
      mistake('m3', '数学', '2026-08-02T10:00:00.000Z'),
    ]
    expect(getMistakesOnDate(ms, '2026-08-01').length).toBe(2)
  })
})

describe('reviewAggregator — 冻结契约构建器', () => {
  it('getSubjectMetrics derives subject-specific metrics', () => {
    const subject: Subject = {
      id: 's1',
      name: '数学',
      chapters: [
        { id: 'c1', name: '函数', subjectId: 's1', topics: [
          { id: 't1', name: '导数', chapterId: 'c1', mastery: 'weak', notes: '', relatedMistakes: [] },
          { id: 't2', name: '积分', chapterId: 'c1', mastery: 'mastered', notes: '', relatedMistakes: [] },
        ] },
      ],
    }
    const m = getSubjectMetrics({
      subject,
      range: { start: '2026-08-17', end: '2026-08-23' },
      tasks: [task('a', true, '2026-08-18'), task('b', false, '2026-08-19')],
      pomodoros: [
        pomo('1', '2026-08-18', 25, '数学'),
        pomo('2', '2026-08-18', 30, '数学'),
        pomo('3', '2026-08-18', 15, '英语'),
      ],
      mistakes: [
        mistake('m1', '数学', '2026-08-18T10:00:00.000Z'),
        mistake('m2', '英语', '2026-08-18T10:00:00.000Z'),
      ],
      flashcardReviews: [],
    })
    expect(m.subjectId).toBe('s1')
    expect(m.subjectName).toBe('数学')
    expect(m.studyDuration).toBe(55)
    expect(m.newMistakes).toBe(1)
    expect(m.taskCompletionRate).toBe(50)
    expect(m.weakKnowledgePoints).toEqual(['导数'])
  })

  it('getSubjectMetrics without subject degrades to range-wide', () => {
    const m = getSubjectMetrics({
      subject: undefined,
      range: { start: '2026-08-17', end: '2026-08-23' },
      tasks: [task('a', true, '2026-08-18'), task('b', false, '2026-08-19')],
      pomodoros: [pomo('1', '2026-08-18', 25)],
      mistakes: [mistake('m1', '数学', '2026-08-18T10:00:00.000Z')],
      flashcardReviews: [],
    })
    expect(m.subjectId).toBe('')
    expect(m.studyDuration).toBe(25)
    expect(m.newMistakes).toBe(1)
    expect(m.weakKnowledgePoints).toEqual([])
  })

  it('getExamMetrics uses assignedTotal before total and derives distributions', () => {
    const exam: Exam = { id: 'e2', name: '二', date: '2026-08-01', scores: { 数学: 90, 英语: 80 }, assignedScores: {}, total: 500, assignedTotal: 480, rank: 2, note: '' }
    const prev: Exam = { id: 'e1', name: '一', date: '2026-07-01', scores: { 数学: 85, 英语: 75 }, assignedScores: {}, total: 450, assignedTotal: 0, rank: 3, note: '' }
    const ms = [
      mistake('m1', '数学', '2026-08-01T10:00:00.000Z', '粗心', ['导数']),
      mistake('m2', '数学', '2026-08-01T11:00:00.000Z', '粗心', ['导数', '积分']),
    ]
    const m = getExamMetrics({ exam, prevExam: prev, mistakes: ms })
    expect(m.score).toBe(480)
    expect(m.scoreChange).toBe(480 - 450)
    expect(m.subjectScores.find((s) => s.name === '数学')?.change).toBe(5)
    expect(m.mistakeTypeDist['粗心']).toBe(2)
    expect(m.knowledgeDist['导数']).toBe(2)
    expect(m.knowledgeDist['积分']).toBe(1)
  })

  it('getExamMetrics without prev exam yields zero scoreChange', () => {
    const exam: Exam = { id: 'e1', name: '一', date: '2026-07-01', scores: {}, assignedScores: {}, total: 450, assignedTotal: 0, rank: 1, note: '' }
    const m = getExamMetrics({ exam, prevExam: undefined, mistakes: [] })
    expect(m.score).toBe(450)
    expect(m.scoreChange).toBe(0)
  })
})
