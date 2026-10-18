// ============================================================
// Personal Workbench V8 — Review Projection（复盘指标投影）
// DP1.4 v1.7：Review 是 Projection，Source = Domain facts，无 Journal 依赖。
// 指标由 Domain Facts（Task/Pomodoro/Mistake/FlashcardReview）纯函数派生，
// 每次调用即从事实重算 → 天然「Fresh」，无 stale 状态。
// （reviewEntries/reviewTemplates 为用户撰写的复盘正文与模板，非派生指标，
//   其 Domain vs system_preferences 归类待 Architecture Owner 裁决，见 Debt-DO-03。）
// ============================================================

import type {
  Task,
  PomodoroLog,
  Mistake,
  FlashcardReview,
  Reading,
  ReviewEntry,
  Exam,
  Subject,
  DailyMetrics,
  WeeklyMetrics,
  MonthlyMetrics,
  SubjectMetrics,
  ExamMetrics,
} from '@/types'

/** 日期区间（YYYY-MM-DD，含端点，字符串比较即正确） */
export interface DateRange {
  start: string
  end: string
}

interface DailyInput {
  date: string
  tasks: Task[]
  pomodoros: PomodoroLog[]
  mistakes: Mistake[]
  flashcardReviews: FlashcardReview[]
}

/** 计算单日指标（纯函数） */
export function getDailyMetrics(input: DailyInput): DailyMetrics {
  const dayTasks = input.tasks.filter((t) => t.dueDate === input.date)
  const dayPomodoros = input.pomodoros.filter((p) => p.date === input.date)
  const dayMistakes = input.mistakes.filter((m) => m.createdAt.startsWith(input.date))
  const dayReviews = input.flashcardReviews.filter((r) => r.reviewedAt.startsWith(input.date))

  return {
    date: input.date,
    tasksTotal: dayTasks.length,
    tasksCompleted: dayTasks.filter((t) => t.done).length,
    studyDuration: dayPomodoros.reduce((sum, p) => sum + p.duration, 0),
    pomodoroCount: dayPomodoros.length,
    mistakesCreated: dayMistakes.length,
    flashcardsReviewed: dayReviews.length,
    flashcardsCorrect: dayReviews.filter(
      (r) => r.rating === 'got' || r.rating === 'mastered',
    ).length,
  }
}

/** 计算周指标（汇总各日） */
export function getWeeklyMetrics(
  weekStart: string,
  weekEnd: string,
  daily: DailyMetrics[],
): WeeklyMetrics {
  return {
    weekStart,
    weekEnd,
    daily,
    bySubject: [],
    totalStudyDuration: daily.reduce((sum, d) => sum + d.studyDuration, 0),
    totalTasksCompleted: daily.reduce((sum, d) => sum + d.tasksCompleted, 0),
  }
}

/**
 * Review Projection Rebuild（DP1.4：Domain rebuild 降级路径）。
 * 指标按需从 Domain Facts 纯函数派生，无独立投影存储，故无需重建——
 * 每次查询即「最新」；此处保留为显式契约入口，返回空说明（无 stale 态）。
 */
export function rebuildReviewProjection(): { rebuilt: false; reason: 'on-demand-derived' } {
  return { rebuilt: false, reason: 'on-demand-derived' }
}

// ============================================================
// 冻结契约构建器（getAutoSummary 全部分支委托到此处）
// ============================================================

/** 月复盘指标（冻结 MonthlyMetrics） */
export function getMonthlyMetrics(monthStart: string, daily: DailyMetrics[]): MonthlyMetrics {
  const heatmapData: Record<string, number> = {}
  for (const d of daily) heatmapData[d.date] = d.studyDuration
  return {
    month: monthStart.slice(0, 7),
    daily,
    bySubject: [],
    heatmapData,
    totalStudyDuration: daily.reduce((sum, d) => sum + d.studyDuration, 0),
  }
}

export interface SubjectMetricsInput {
  /** 目标学科；未指定时退化为 range 内通用指标（保持 getAutoSummary('subject') 旧语义） */
  subject: Subject | undefined
  range: DateRange
  tasks: Task[]
  pomodoros: PomodoroLog[]
  mistakes: Mistake[]
  flashcardReviews: FlashcardReview[]
}

/** 学科复盘指标（冻结 SubjectMetrics，学科维度派生） */
export function getSubjectMetrics(input: SubjectMetricsInput): SubjectMetrics {
  const subject = input.subject
  const name = subject?.name ?? ''

  if (!subject) {
    // 无指定学科 → 退化为 range 内通用指标（历史 getAutoSummary('subject') 语义）
    return {
      subjectId: '',
      subjectName: '',
      studyDuration: getPomodoroStats(input.pomodoros, input.range).minutes,
      taskCompletionRate: getTaskStats(input.tasks, input.range).completionRate,
      newMistakes: countMistakes(input.mistakes, input.range),
      flashcardReviews: input.flashcardReviews.filter(
        (r) => r.reviewedAt.slice(0, 10) >= input.range.start &&
          r.reviewedAt.slice(0, 10) <= input.range.end,
      ).length,
      weakKnowledgePoints: [],
    }
  }

  const subjectPomodoros = input.pomodoros.filter(
    (p) =>
      p.date >= input.range.start &&
      p.date <= input.range.end &&
      p.subject === name,
  )
  const subjectMistakes = input.mistakes.filter(
    (m) =>
      m.subject === name &&
      m.createdAt.slice(0, 10) >= input.range.start &&
      m.createdAt.slice(0, 10) <= input.range.end,
  )

  const weakKnowledgePoints: string[] = []
  for (const ch of subject.chapters) {
    for (const t of ch.topics) {
      if (t.mastery === 'weak') weakKnowledgePoints.push(t.name)
    }
  }

  return {
    subjectId: subject.id,
    subjectName: name,
    studyDuration: subjectPomodoros.reduce((s, p) => s + p.duration, 0),
    taskCompletionRate: getTaskStats(input.tasks, input.range).completionRate,
    newMistakes: subjectMistakes.length,
    flashcardReviews: input.flashcardReviews.filter(
      (r) => r.reviewedAt.slice(0, 10) >= input.range.start &&
        r.reviewedAt.slice(0, 10) <= input.range.end,
    ).length,
    weakKnowledgePoints,
  }
}

export interface ExamMetricsInput {
  /** 目标考试（页面=选中考试；getAutoSummary=区间内最近一场） */
  exam: Exam | undefined
  /** 用于环比的前一场考试 */
  prevExam: Exam | undefined
  /** 已归属到该考试日期范围的错题 */
  mistakes: Mistake[]
}

/** 考试复盘指标（冻结 ExamMetrics，赋分优先取总分：assignedTotal || total） */
export function getExamMetrics(input: ExamMetricsInput): ExamMetrics {
  const latest = input.exam
  const prev = input.prevExam
  const score = latest ? latest.assignedTotal || latest.total || 0 : 0
  const prevScore = prev ? prev.assignedTotal || prev.total || 0 : 0

  const subjectSet = new Set<string>()
  if (latest) Object.keys(latest.scores).forEach((k) => subjectSet.add(k))
  if (prev) Object.keys(prev.scores).forEach((k) => subjectSet.add(k))
  const subjectScores = [...subjectSet].map((name) => {
    const current = latest ? latest.scores[name] ?? 0 : 0
    const previous = prev ? prev.scores[name] ?? 0 : 0
    return { name, current, previous, change: current - previous }
  })

  const mistakeTypeDist: Record<string, number> = {}
  for (const m of input.mistakes) {
    const key = m.errorType || '未分类'
    mistakeTypeDist[key] = (mistakeTypeDist[key] || 0) + 1
  }

  const knowledgeDist: Record<string, number> = {}
  for (const m of input.mistakes) {
    for (const kp of m.linkedKnowledge) {
      knowledgeDist[kp] = (knowledgeDist[kp] || 0) + 1
    }
  }

  return {
    score,
    scoreChange: prev ? score - prevScore : 0,
    subjectScores,
    mistakeTypeDist,
    knowledgeDist,
  }
}

// ============================================================
// 页面派生指标纯函数（吸收 review 页面内联 filter/reduce/sort）
// ============================================================

/** 按学科汇总学习时长（分钟），用于周复盘饼图 */
export function getSubjectTimeMap(
  pomodoros: PomodoroLog[],
  range: DateRange,
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const p of pomodoros) {
    if (p.date < range.start || p.date > range.end) continue
    const key = p.subject || '其他'
    map[key] = (map[key] || 0) + p.duration
  }
  return map
}

/** range 内任务统计 */
export function getTaskStats(
  tasks: Task[],
  range: DateRange,
): { total: number; completed: number; completionRate: number } {
  const inRange = tasks.filter(
    (t) => t.dueDate >= range.start && t.dueDate <= range.end,
  )
  const completed = inRange.filter((t) => t.done).length
  const total = inRange.length
  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/** range 内番茄统计 */
export function getPomodoroStats(
  pomodoros: PomodoroLog[],
  range: DateRange,
): { minutes: number; count: number } {
  const inRange = pomodoros.filter(
    (p) => p.date >= range.start && p.date <= range.end,
  )
  return {
    minutes: inRange.reduce((s, p) => s + p.duration, 0),
    count: inRange.length,
  }
}

/** range 内错题数（按 createdAt 归属） */
export function countMistakes(mistakes: Mistake[], range: DateRange): number {
  return mistakes.filter((m) => {
    const d = m.createdAt.slice(0, 10)
    return d >= range.start && d <= range.end
  }).length
}

/** range 内阅读页数（sum current，日/周复盘用） */
export function sumReadingPages(reading: Reading[], range: DateRange): number {
  return reading
    .filter((r) => {
      const d = r.createdAt.slice(0, 10)
      return d >= range.start && d <= range.end
    })
    .reduce((sum, r) => sum + r.current, 0)
}

/** range 内阅读本数（count 记录，月复盘用） */
export function countReadingBooks(reading: Reading[], range: DateRange): number {
  return reading.filter((r) => {
    const d = r.createdAt.slice(0, 10)
    return d >= range.start && d <= range.end
  }).length
}

/** range 内复盘次数（按 dateRange 归属） */
export function countReviews(reviews: ReviewEntry[], range: DateRange): number {
  return reviews.filter(
    (r) => r.dateRange.start >= range.start && r.dateRange.end <= range.end,
  ).length
}

/** 考试页：定位某场考试的前一场（按日期排序），用于环比 */
export function getPrevExam(exams: Exam[], examId: string): Exam | undefined {
  const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
  const idx = sorted.findIndex((e) => e.id === examId)
  if (idx <= 0) return undefined
  return sorted[idx - 1]
}

/** 考试页：取某考试日期当天产生的错题 */
export function getMistakesOnDate(mistakes: Mistake[], date: string): Mistake[] {
  return mistakes.filter((m) => m.createdAt.slice(0, 10) === date)
}
