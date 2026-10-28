// ============================================================
// Personal Workbench V9 — V9 新增域类型定义（V9-C-001 冻结）
// 表结构/枚举与 docs/contracts/V9_SCHEMA_CONTRACT.md 一一对应
// ============================================================

// ---- 枚举（V9-C-001 §5）----

export type Domain = 'life' | 'work' | 'play' | 'system'

export type DiaryType = 'quick' | 'long'

export type Mood = 'great' | 'good' | 'neutral' | 'low' | 'bad'

export type Weather =
  | 'sunny' | 'cloudy' | 'overcast' | 'rainy'
  | 'stormy' | 'snowy' | 'windy' | 'foggy'

export type CalendarEventType = 'custom' | 'birthday'

export type AnimeStatus = 'planned' | 'watching' | 'completed' | 'paused' | 'dropped'

export type GameStatus = 'playing' | 'completed' | 'paused' | 'dropped' | 'planned'

export type GameRecordType = 'profile' | 'progress' | 'playtime' | 'result' | 'note' | 'combat'

export type Priority = 'must' | 'should' | 'could'

export type Flexibility = 'fixed' | 'flexible'

export type FlexState = 'pending' | 'active' | 'done' | 'deferred'

export type PlanningMode = 'adaptive' | 'manual'

export type BackupScope = 'noVault'

export type SnapshotStatus = 'creating' | 'ready' | 'failed' | 'expired'

export type MigrationMode = 'dry' | 'real'

export type MigrationStatus = 'running' | 'done' | 'failed' | 'skipped'

export type LedgerStatus = 'ok' | 'failed' | 'skipped'

export type SourceType =
  | 'task' | 'studySession' | 'mistake' | 'review' | 'exam'
  | 'diary' | 'lifeMoment' | 'event'
  | 'anime' | 'gameRecord' | 'music'
  | 'nightShutdown'

// ---- 实体（V9-C-001 §4）----

export interface Diary {
  id: number
  date: string // YYYY-MM-DD
  type: DiaryType
  mood: Mood | null
  weather: Weather | null
  title: string
  content: string
  photos: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface LifeMoment {
  id: number
  date: string
  content: string
  photoRefs: string[]
  createdAt: string
}

export interface CalendarEvent {
  id: number
  date: string
  type: CalendarEventType
  title: string
  note: string
  allDay: boolean
  /** 地点（V9 事件字段扩展） */
  location: string
  /** 起止时间（HH:MM，非全天事件时使用） */
  startTime: string | null
  endTime: string | null
  /** 提醒（提前分钟数） */
  reminder: string | null
  /** 重复规则（none/daily/weekly/monthly/yearly） */
  repeat: string | null
  sourceType: 'friend' | null
  sourceId: string | null
  /** 完成时刻（V9-C-001 0.1.1 修订，event.completed 事实源） */
  doneAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Friend {
  id: number
  name: string
  alias: string | null
  birthday: string | null // MM-DD
  relationship: string
  contact: string
  note: string
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: number
  title: string
  category: string
  tags: string[]
  fileRefs: string[]
  note: string
  sourceDate: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 独立成绩表（方案书 §16 首批表）：一行 = 某次考试的某个学科成绩。
 * 与 exams 表拆分，替代早期在 Exam 上的 scores/assignedScores 内联字段。
 */
export interface Score {
  id: number
  examId: string
  subject: string
  /** 原始分 */
  raw: number
  /** 赋分 */
  assigned: number
  createdAt: string
  updatedAt: string
}

export interface Article {
  id: number
  title: string
  url: string
  content: string
  tags: string[]
  favorite: boolean
  source: string | null
  createdAt: string
  updatedAt: string
}

export interface EpisodeLogEntry {
  date: string
  episode: number
  note?: string
}

export interface Anime {
  id: number
  name: string
  coverRef: string | null
  status: AnimeStatus
  rating: number | null
  favorite: boolean
  thoughts: string
  totalEpisodes: number | null
  watchedEpisodes: number
  episodeLog: EpisodeLogEntry[]
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Game {
  id: number
  name: string
  iconRef: string | null
  genre: string
  platform: string
  status: GameStatus
  favorite: boolean
  rating: number | null
  note: string
  createdAt: string
  updatedAt: string
}

export interface GameRecord {
  id: number
  gameId: number
  type: GameRecordType
  data: Record<string, unknown>
  note: string
  occurredAt: string
  createdAt: string
}

export interface MusicMemory {
  id: number
  title: string
  artist: string
  album: string | null
  genre: string | null
  thoughts: string
  favorite: boolean
  occurredAt: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: number
  eventKey: string // {eventType}:{aggregateId}:{semanticVersion}:{stableEventIdentity}
  sourceDomain: Domain
  sourceType: SourceType
  sourceId: string
  eventType: string
  occurredAt: string
  title: string
  summary: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface DailyMemoryFacts {
  work: {
    tasksCompleted: number
    studyMinutes: number
    mistakesResolved: number
    flashcardsReviewed: number
    pomodoros: number
    nightShutdownDone: boolean
  }
  life: {
    diaries: number
    lifeMoments: number
    events: number
    birthdays: string[]
  }
  play: {
    episodesWatched: number
    animeCompleted: number
    gameRecords: number
    musicLogged: number
  }
}

export interface DailyMemory {
  id: number
  date: string
  facts: DailyMemoryFacts
  reflection: string
  lastAutoUpdate: string | null
  createdAt: string
  updatedAt: string
}

export interface CollectionEntry {
  id: number
  sourceDomain: Domain
  sourceType: string
  sourceId: string
  title: string
  note: string
  favoriteAt: string
  createdAt: string
}

export interface NightShutdown {
  id: number
  date: string
  completed: { id: string; title: string }[]
  unfinished: { id: string; title: string }[]
  reason: string
  reflection: string
  tomorrowFocus: string[]
  createdAt: string
  updatedAt: string
}

export interface StudyPlanItem {
  id: number
  taskId: string
  planDate: string
  priority: Priority
  flexibility: Flexibility
  estimatedMinutes: number
  actualMinutes: number | null
  state: FlexState
  sortOrder: number | null
  note: string
  createdAt: string
  updatedAt: string
}

export interface PrivateFileMeta {
  id: number
  name: string
  size: number
  mimeType: string | null
  sha256Plain: string
  encPath: string
  dekIv: string
  /** AES-GCM 密文+标签拼接（base64），见 V9-C-001 §4.16 */
  dekCt: string
  fileIv: string
  fileTag: string
  createdAt: string
  updatedAt: string
}

export interface AppLockState {
  id: string // 固定 'main'
  kdfParamsVersion: number
  salt: string
  iterations: number
  verifier: string
  enabled: boolean
  autoLockMinutes: number
  /** 首次启用时间（审计用，Patch C-003-09；重设密码不改变） */
  createdAt: string
  updatedAt: string
}

export interface BackupSnapshot {
  id: number
  snapshotId: string
  scope: BackupScope
  fileName: string
  checksum: string
  itemCounts: Record<string, number>
  status: SnapshotStatus
  createdAt: string
}

export interface OperationJournalEntry {
  seq: number
  eventType: string
  payload: Record<string, unknown> | null
  occurredAt: string
}

export interface SystemCommandId {
  projectionRecovery?: { taskId: string; desiredDone: boolean; dates: string[] }
  id: string // `${commandType}:${commandId}`
  commandType: string
  commandId: string
  processedAt: string
}

export type InboxItemStatus = 'new' | 'triaged' | 'converted' | 'discarded'

export interface InboxItem {
  sourceCommandId?: string
  id: number
  title: string
  note: string
  status: InboxItemStatus
  /** 转换后产生的 Task id（Conversion 幂等，DO1.2 / DP1.5） */
  sourceTaskId: string | null
  createdAt: string
  updatedAt: string
}

export interface MigrationRun {
  id: number
  runId: string
  mode: MigrationMode
  status: MigrationStatus
  startedAt: string
  finishedAt: string | null
  sourceCount: number
  targetCount: number
  failedCount: number
  skippedCount: number
  checksum: string | null
  manifestPath: string | null
  error: string | null
}

export interface MigrationLedger {
  id: number
  runId: string
  legacyId: string
  targetTable: string
  targetId: string
  checksum: string
  status: LedgerStatus
  note: string | null
  createdAt: string
}
