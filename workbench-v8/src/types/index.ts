// ============================================================
// Personal Workbench V8 — Core Type Definitions
// ============================================================

// ---- Module / Theme Enums ----

export type ModuleType = 'today' | 'plan' | 'study' | 'record' | 'review' | 'tools' | 'settings'

export type Theme = 'mist' | 'fluent' | 'night'

export type FlashcardTheme = 'morningMist' | 'nightSky' | 'forest' | 'amber' | 'minimal'

// ---- Task ----

export type TaskPriority = 'P0' | 'P1' | 'P2'

export interface Task {
  id: string
  title: string
  priority: TaskPriority
  done: boolean
  note: string
  projectId: string
  dueDate: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  sourceRecurringId?: string
  // V9 Inbox → Plan 附加元数据（非索引、随主对象持久化，无 schema 版本升级）
  startTime?: string
  deadline?: string
  subject?: string
  estimatedMinutes?: number
}

// ---- Recurring Task ----

export type RecurringRuleType = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurringRule {
  type: RecurringRuleType
  daysOfWeek?: number[]
  daysOfMonth?: number[]
  intervalDays?: number
}

export interface RecurringTask {
  id: string
  title: string
  rule: RecurringRule
  time: string
  priority: TaskPriority
  category: string
  startDate: string
  endDate: string
  enabled: boolean
  lastGeneratedDate?: string
  // V9 详情字段（非索引、随主对象持久化，无 schema 升级）
  description?: string
  deadline?: string
  subject?: string
  estimatedMinutes?: number
}

// ---- Project ----

export type ProjectStage = 'plan' | 'active' | 'done' | 'paused'

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Project {
  id: string
  title: string
  stage: ProjectStage
  progress: number
  milestones: Milestone[]
  description: string
  notes: string
  tags: string[]
}

// ---- Memo ----

export interface MemoConversion {
  type: 'task' | 'mistake' | 'note'
  id: string
}

export interface Memo {
  id: string
  content: string
  createdAt: string
  convertedTo?: MemoConversion
}

// ---- Note ----

export interface Note {
  id: string
  title: string
  body: string
  notebook: string
  tags: string[]
  favorite: boolean
  url: string
  createdAt: string
  updatedAt: string
}

// ---- Flashcard / Study ----

export interface Flashcard {
  id: string
  question: string
  answer: string
  subject: string
  chapter: string
  knowledgeId?: string
  tags: string[]
  difficulty: number // 1–5
  mastery: number // 0–100
  reviewCount: number
  correctCount: number
  wrongCount: number
  nextReviewAt: string
  createdAt: string
}

export type ReviewRating = 'forgot' | 'fuzzy' | 'got' | 'mastered'

export interface FlashcardReview {
  id: string
  flashcardId: string
  rating: ReviewRating
  reviewedAt: string
  nextReviewAt: string
}

// ---- Subject / Chapter / Topic ----

export type MasteryLevel = 'notStarted' | 'learning' | 'mastered' | 'weak'

export interface Topic {
  id: string
  name: string
  chapterId: string
  mastery: MasteryLevel
  notes: string
  relatedMistakes: string[]
}

export interface Chapter {
  id: string
  name: string
  subjectId: string
  topics: Topic[]
}

export interface Subject {
  id: string
  name: string
  chapters: Chapter[]
}

// ---- Mistake ----

export interface Mistake {
  id: string
  subject: string
  question: string
  answer: string
  errorType: string
  tags: string[]
  linkedKnowledge: string[]
  mastered: boolean
  reviewCount: number
  source: string
  createdAt: string
}

// ---- Exam ----

export interface Exam {
  id: string
  name: string
  date: string
  scores: Record<string, number>
  assignedScores: Record<string, number>
  total: number
  assignedTotal: number
  rank: number
  note: string
}

// ---- Review ----

export type ReviewType = 'daily' | 'subject' | 'weekly' | 'monthly' | 'exam'

export interface Review {
  id: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  autoSummary: any
  answers: Record<string, string>
  reflections: string[]
  nextActions: string[]
  createdAt: string
}

// ---- Review Template ----

export interface ReviewTemplate {
  id: string
  name: string
  type: string
  questions: string[]
}

// ---- Review Metrics（5 类契约，冻结：ERRATA-04 / I-014）----

export interface DailyMetrics {
  date: string
  tasksTotal: number
  tasksCompleted: number
  studyDuration: number // 分钟
  pomodoroCount: number
  mistakesCreated: number
  flashcardsReviewed: number
  flashcardsCorrect: number
}

export interface SubjectMetrics {
  subjectId: string
  subjectName: string
  studyDuration: number
  taskCompletionRate: number
  newMistakes: number
  flashcardReviews: number
  weakKnowledgePoints: string[]
}

export interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  totalStudyDuration: number
  totalTasksCompleted: number
}

export interface MonthlyMetrics {
  month: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  heatmapData: Record<string, number> // date → study minutes
  totalStudyDuration: number
}

export interface ExamMetrics {
  score: number
  scoreChange: number
  subjectScores: { name: string; current: number; previous: number; change: number }[]
  mistakeTypeDist: Record<string, number>
  knowledgeDist: Record<string, number>
}

// ---- Review Entry（C-12：Entry 与 Template 分离）----

export interface ReviewEntry {
  id: string
  templateId: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  answers: Record<string, string>
  reflections: string[]
  nextActions: string[]
  autoSummary?: DailyMetrics | SubjectMetrics | WeeklyMetrics | MonthlyMetrics | ExamMetrics
  /** V9 附加字段（Patch C-002-03）：Review 真正完成时间；Timeline occurredAt 取此值 */
  completedAt?: string | null
  createdAt: string
}

// ---- Knowledge Relation（C-11）----

export type KnowledgeRelationType = 'mistake' | 'flashcard' | 'note' | 'reading'

export interface KnowledgeRelation {
  id: string
  knowledgeId: string
  type: KnowledgeRelationType
  targetId: string
  createdAt: string
}

// ---- Study Session（C-11）----

export interface StudySession {
  id: string
  subjectId?: string
  taskId?: string
  startedAt: string
  endedAt: string
  duration: number // 分钟
  note: string
}

// ---- App Event Log（C-11）----

export interface AppEventLog {
  id: string
  type: string
  payload: any
  timestamp: string
}

// ---- Flashcard Schedule（C-13：调度状态与内容分离）----

export interface FlashcardSchedule {
  flashcardId: string
  nextReviewAt: string
  consecutiveCorrect: number
  interval: number // 天
  easeFactor: number
  reviewCount: number
  lastReviewedAt: string
}

// ---- Reading ----

export type ReadingStatus = 'wantToRead' | 'reading' | 'read' | 'dropped'

export interface Reading {
  id: string
  title: string
  status: ReadingStatus
  current: number
  target: number
  unit: string
  note: string
  pinned: boolean
  createdAt: string
}

// ---- Finance ----

export type FinanceType = 'income' | 'expense'

export interface Finance {
  id: string
  type: FinanceType
  title: string
  amount: number
  category: string
  tags: string[]
  date: string
  note: string
}

// ---- Countdown ----

export type CountdownType = 'event' | 'exam' | 'travel' | 'birthday' | 'custom'

export interface Countdown {
  id: string
  title: string
  targetDate: string
  type: CountdownType
  showOnHome: boolean
}

// ---- Pomodoro ----

export interface PomodoroLog {
  id: string
  date: string
  duration: number
  subject?: string
  completed: boolean
}

// ---- Setting ----

export interface Setting {
  key: string
  value: any
}

// ---- Vault ----

export interface VaultEntry {
  id: string
  platform: string
  username: string
  password: string
  passwordIv: string
  url: string
  note: string
  lastUsed: string
}

// ---- Navigation ----

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  children?: NavItem[]
}

// ---- Search ----

export interface SearchResult {
  id: string
  type: ModuleType
  title: string
  subtitle: string
  moduleLabel: string
  path: string
}

// ---- V9 新增域类型（V9-C-001，见 ./v9.ts）----

export * from './v9'