// ============================================================
// Personal Workbench V8 — IndexedDB Database Layer (Dexie.js)
// ============================================================

import Dexie, { type Table } from 'dexie'
import { faultInjection } from '@/utils/faultInjection'
import type {
  Task,
  RecurringTask,
  Project,
  Memo,
  Note,
  Flashcard,
  FlashcardReview,
  FlashcardSchedule,
  Subject,
  Mistake,
  Exam,
  ReviewEntry,
  ReviewTemplate,
  Reading,
  Finance,
  Countdown,
  PomodoroLog,
  VaultEntry,
  Setting,
  KnowledgeRelation,
  StudySession,
  AppEventLog,
  // ---- V9 新增实体（V9-C-001）----
  Diary,
  LifeMoment,
  CalendarEvent,
  Friend,
  Material,
  Score,
  Article,
  Anime,
  Game,
  GameRecord,
  MusicMemory,
  TimelineEvent,
  DailyMemory,
  CollectionEntry,
  NightShutdown,
  StudyPlanItem,
  PrivateFileMeta,
  AppLockState,
  BackupSnapshot,
  OperationJournalEntry,
  MigrationRun,
  MigrationLedger,
  SystemCommandId,
  InboxItem,
} from '../types'
import { reviewToEntry, flashcardToSchedule } from './migrationV2'

/**
 * 普通备份排除表（与 snapshot.ts 的 SNAPSHOT_EXCLUDES 对齐 + 遗留空表）：
 *  - vault / privateFileMeta / appLock：安全边界（密码本独立导出；加密文件元数据与认证态不随普通备份）
 *  - backupSnapshots：备份注册表自身，避免「备份套备份」
 *  - operationJournal：审计日志，随回滚会丢失「刚发生过什么」的证据
 *  - reviews：v1 遗留空表（数据已在 v2 迁到 reviewEntries）
 */
const BACKUP_EXCLUDED_TABLES = new Set([
  'vault',
  'privateFileMeta',
  'appLock',
  'backupSnapshots',
  'operationJournal',
  'reviews',
  // commandId 幂等表是瞬态缓存（append-only、可安全清空），备份/快照无业务价值，
  // 且历史 bug 曾致其膨胀到 GB 级，纳入备份会导致启动卡死
  'systemCommandIds',
])

/** 普通备份表集 = 全部表 − 排除表（新增表自动纳入，避免遗漏 V9 数据如 scores） */
function backupTableNames(db: { tables: Array<{ name: string }> }): string[] {
  return db.tables.map((t) => t.name).filter((n) => !BACKUP_EXCLUDED_TABLES.has(n))
}

export class WorkbenchDB extends Dexie {
  tasks!: Table<Task, string>
  recurringTasks!: Table<RecurringTask, string>
  projects!: Table<Project, string>
  memos!: Table<Memo, string>
  notes!: Table<Note, string>
  flashcards!: Table<Flashcard, string>
  flashcardReviews!: Table<FlashcardReview, string>
  flashcardSchedule!: Table<FlashcardSchedule, string>
  subjects!: Table<Subject, string>
  mistakes!: Table<Mistake, string>
  exams!: Table<Exam, string>
  reviewEntries!: Table<ReviewEntry, string>
  reviewTemplates!: Table<ReviewTemplate, string>
  knowledgeRelations!: Table<KnowledgeRelation, string>
  studySessions!: Table<StudySession, string>
  appEvents!: Table<AppEventLog, string>
  reading!: Table<Reading, string>
  finance!: Table<Finance, string>
  countdowns!: Table<Countdown, string>
  pomodoroLogs!: Table<PomodoroLog, string>
  vault!: Table<VaultEntry, string>
  settings!: Table<Setting, string>
  // ---- V9 新增表（V9-C-001 §4，全部经 version(3) 挂载）----
  diaries!: Table<Diary, number, Omit<Diary, 'id'>>
  lifeMoments!: Table<LifeMoment, number, Omit<LifeMoment, 'id'>>
  events!: Table<CalendarEvent, number, Omit<CalendarEvent, 'id'>>
  friends!: Table<Friend, number, Omit<Friend, 'id'>>
  materials!: Table<Material, number, Omit<Material, 'id'>>
  scores!: Table<Score, number, Omit<Score, 'id'>>
  articles!: Table<Article, number>
  anime!: Table<Anime, number, Omit<Anime, 'id'>>
  games!: Table<Game, number, Omit<Game, 'id'>>
  gameRecords!: Table<GameRecord, number, Omit<GameRecord, 'id'>>
  music!: Table<MusicMemory, number, Omit<MusicMemory, 'id'>>
  timelineEvents!: Table<TimelineEvent, number, Omit<TimelineEvent, 'id'>>
  dailyMemory!: Table<DailyMemory, number, Omit<DailyMemory, 'id'>>
  collectionEntries!: Table<CollectionEntry, number, Omit<CollectionEntry, 'id'>>
  nightShutdown!: Table<NightShutdown, number, Omit<NightShutdown, 'id'>>
  studyPlanItems!: Table<StudyPlanItem, number, Omit<StudyPlanItem, 'id'>>
  privateFileMeta!: Table<PrivateFileMeta, number, Omit<PrivateFileMeta, 'id'>>
  appLock!: Table<AppLockState, string>
  backupSnapshots!: Table<BackupSnapshot, number, Omit<BackupSnapshot, 'id'>>
  operationJournal!: Table<OperationJournalEntry, number, Omit<OperationJournalEntry, 'seq'>>
  migrationRuns!: Table<MigrationRun, number, Omit<MigrationRun, 'id'>>
  migrationLedger!: Table<MigrationLedger, number, Omit<MigrationLedger, 'id'>>
  systemCommandIds!: Table<SystemCommandId, string>
  inboxItems!: Table<InboxItem, number, Omit<InboxItem, 'id'>>

  private _available: boolean | null = null

  constructor() {
    super('WorkbenchV8')

    this.version(1).stores({
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
    })

    this.version(2)
      .stores({
        tasks: '++id, dueDate, priority, done, pinned, projectId, createdAt',
        recurringTasks: '++id, enabled',
        projects: '++id, stage',
        memos: '++id, createdAt',
        notes: '++id, notebook, favorite, updatedAt',
        flashcards: '++id, subject, chapter, knowledgeId, nextReviewAt',
        flashcardReviews: '++id, flashcardId, reviewedAt',
        flashcardSchedule: '++id, flashcardId',
        subjects: '++id',
        mistakes: '++id, subject, mastered, createdAt',
        exams: '++id, date',
        reviewTemplates: '++id, type',
        reviewEntries: '++id, type, templateId',
        reading: '++id, pinned',
        finance: '++id, type, date',
        countdowns: '++id, showOnHome',
        pomodoroLogs: '++id, date',
        vault: '++id',
        settings: '&key',
        knowledgeRelations: '++id, knowledgeId, type, targetId',
        studySessions: '++id, subjectId, startedAt',
        appEvents: '++id, type, timestamp',
      })
      .upgrade(async (tx) => {
        // reviews → reviewEntries（语义转换：补 templateId）
        const oldReviews = await tx.table('reviews').toArray()
        if (oldReviews.length > 0) {
          await tx
            .table('reviewEntries')
            .bulkAdd(oldReviews.map((r) => reviewToEntry(r as any)))
        }

        // flashcards → flashcardSchedule（语义转换：mastery → easeFactor）
        const oldCards = await tx.table('flashcards').toArray()
        if (oldCards.length > 0) {
          await tx
            .table('flashcardSchedule')
            .bulkAdd(oldCards.map((c) => flashcardToSchedule(c as any)))
        }
      })

    // ---- V9（V9-C-001 §4）：version(3) 挂载 21 张新增表，只做加法 ----
    this.version(3).stores({
      diaries: '++id, date, type, updatedAt, *tags',
      lifeMoments: '++id, date, createdAt',
      events: '++id, date, type, [date+type], [sourceType+sourceId]',
      friends: '++id, name, birthday',
      materials: '++id, title, category, updatedAt, *tags',
      articles: '++id, title, favorite, updatedAt, *tags',
      anime: '++id, name, status, favorite, updatedAt',
      games: '++id, name, status, favorite, updatedAt',
      gameRecords: '++id, gameId, type, occurredAt, [gameId+occurredAt]',
      music: '++id, title, artist, favorite, occurredAt',
      timelineEvents: '++id, occurredAt, [sourceType+sourceId], &eventKey',
      dailyMemory: '++id, &date',
      collectionEntries: '++id, sourceDomain, favoriteAt, &[sourceType+sourceId]',
      nightShutdown: '++id, &date',
      studyPlanItems: '++id, taskId, planDate, state, [planDate+priority]',
      privateFileMeta: '++id, name, createdAt',
      appLock: 'id',
      backupSnapshots: '++id, &snapshotId, scope, status, createdAt',
      operationJournal: '++seq, eventType, occurredAt',
      migrationRuns: '++id, &runId, status, startedAt',
      migrationLedger: '++id, [runId+legacyId], targetTable, status',
    })

    // ---- V9 形态改造：version(4) 只做数据迁移（新字段均非索引，走内存过滤）----
    this.version(4).upgrade(async (tx) => {
      // 1) reading 补 status（老数据按进度推断）
      const readings = await tx.table('reading').toArray()
      for (const r of readings) {
        let status = 'wantToRead'
        if (r.target > 0 && r.current > 0 && r.current >= r.target) status = 'read'
        else if (r.current > 0) status = 'reading'
        await tx.table('reading').update(r.id, { status })
      }

      // 2) exams 补原始分/赋分双轨
      const exams = await tx.table('exams').toArray()
      for (const e of exams) {
        await tx.table('exams').update(e.id, { assignedScores: {}, assignedTotal: 0 })
      }

      // 3) events 补地点/起止/提醒/重复
      const events = await tx.table('events').toArray()
      for (const ev of events) {
        await tx.table('events').update(ev.id, {
          location: '',
          startTime: null,
          endTime: null,
          reminder: null,
          repeat: null,
        })
      }

      // 4) 灵感速记(LifeMoment) → 素材页(Material)
      const moments = await tx.table('lifeMoments').toArray()
      for (const m of moments) {
        const content = m.content || ''
        await tx.table('materials').add({
          title: content.slice(0, 30) || '未命名灵感',
          category: '灵感速记',
          tags: [],
          fileRefs: m.photoRefs || [],
          note: content,
          sourceDate: m.date,
          createdAt: m.createdAt,
          updatedAt: m.createdAt,
        })
      }
    })

    // ---- 独立成绩表：version(5) 新增 scores，迁移 exams 内联 scores/assignedScores ----
    this.version(5)
      .stores({
        scores: '++id, examId, subject, [examId+subject]',
      })
      .upgrade(async (tx) => {
        const exams = await tx.table('exams').toArray()
        const now = new Date().toISOString()
        const rows: {
          examId: string
          subject: string
          raw: number
          assigned: number
          createdAt: string
          updatedAt: string
        }[] = []
        for (const e of exams as any[]) {
          const subjects = new Set<string>([
            ...Object.keys(e.scores || {}),
            ...Object.keys(e.assignedScores || {}),
          ])
          for (const subject of subjects) {
            rows.push({
              examId: e.id,
              subject,
              raw: e.scores?.[subject] ?? 0,
              assigned: e.assignedScores?.[subject] ?? 0,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
        if (rows.length > 0) {
          await tx.table('scores').bulkAdd(rows as any[])
        }
      })

    // ---- commandId 幂等表（DP1.5 v1.7）：Mutation Lane 入口去重，同事务持久化 ----
    this.version(6).stores({
      systemCommandIds: '&id, commandType, commandId',
    })

    // ---- Inbox Item 独立实体（DO1.2 v1.7）：Capture → Triaged → Converted/Discarded ----
    this.version(7)
      .stores({
        inboxItems: '++id, status, createdAt',
      })
      .upgrade(async (tx) => {
        // 迁移遗留「收件箱任务」（无 dueDate/projectId/done 的 Task）为独立 Inbox Item
        const legacyInboxTasks = (await tx.table('tasks').toArray()).filter(
          (t: any) => !t.dueDate && !t.projectId && !t.done,
        )
        if (legacyInboxTasks.length > 0) {
          const now = new Date().toISOString()
          await tx
            .table('inboxItems')
            .bulkAdd(
              legacyInboxTasks.map((t: any) => ({
                title: t.title,
                note: t.note ?? '',
                status: 'new',
                sourceTaskId: t.id,
                createdAt: t.createdAt ?? now,
                updatedAt: t.updatedAt ?? now,
              })),
            )
          await tx
            .table('tasks')
            .bulkDelete(legacyInboxTasks.map((t: any) => t.id))
        }
      })

    // ---- version(8)：仅占位，不做任何 schema 变更 ----
    // 历史教训：曾在此为 systemCommandIds 补 processedAt 索引，会在 GB 级膨胀表上
    // 触发全量索引重建 → 启动卡死。现改为 no-op（保留版本号以兼容可能已升到 8 的库）。
    this.version(8).stores({})

    // The isAvailable() method handles error detection at runtime
  }

  /**
   * Check if IndexedDB is accessible and the database opened successfully.
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available

    try {
      // Check if IndexedDB is available at all
      if (typeof indexedDB === 'undefined') {
        this._available = false
        return false
      }

      // Try to open the database
      await this.open()
      this._available = true
      return true
    } catch (err) {
      console.error('[WorkbenchDB] IndexedDB is not available:', err)
      this._available = false
      return false
    }
  }

  async exportAllData(): Promise<Record<string, any[]>> {
    // 普通导出：全部表 − 排除表（覆盖 V9 用户数据，含 scores；vault 走 exportVaultData）
    await faultInjection.fire('mid_export')
    const tables = backupTableNames(this)

    const result: Record<string, any[]> = {}
    for (const table of tables) {
      try {
        result[table] = await this.table(table).toArray()
      } catch (err) {
        console.error(`[WorkbenchDB] Failed to export table "${table}":`, err)
        result[table] = []
      }
    }
    return result
  }

  async importAllData(data: Record<string, any[]>): Promise<void> {
    // 普通导入：全部表 − 排除表（不触碰 vault/privateFileMeta/appLock 等安全边界）
    await faultInjection.fire('mid_import')
    const tables = backupTableNames(this)

    try {
      await this.transaction('rw', this.tables, async () => {
        for (const table of tables) {
          await this.table(table).clear()
          if (Array.isArray(data[table]) && data[table].length > 0) {
            await this.table(table).bulkAdd(data[table])
          }
        }
      })
    } catch (err) {
      console.error('[WorkbenchDB] Failed to import data:', err)
      throw err
    }
  }

  /**
   * 单独导出 vault（密码本加密数据 + 主密码 hash/salt 设置行，独立于普通导出）。
   * 条目密文由「主密码 + 主盐」派生密钥加密（VaultPage deriveKey），
   * 跨平台迁移必须连同 vaultMasterHash / vaultMasterSalt 一起携带，
   * 否则新机器上设置新主密码后将无法解密旧条目。
   */
  async exportVaultData(): Promise<Record<string, any[]>> {
    const [vault, settings] = await Promise.all([
      this.vault.toArray(),
      this.settings.where('key').anyOf('vaultMasterHash', 'vaultMasterSalt').toArray(),
    ])
    return { vault, settings }
  }

  /** 单独导入 vault（密码本加密数据 + 主密码设置行；导入后需用原主密码解锁） */
  async importVaultData(data: Record<string, unknown[]>): Promise<void> {
    if (!Array.isArray(data.vault)) throw new Error('导入文件缺少 vault 表')
    const settings = Array.isArray(data.settings)
      ? (data.settings as Setting[]).filter(
          (s) => s.key === 'vaultMasterHash' || s.key === 'vaultMasterSalt',
        )
      : []
    await this.transaction('rw', [this.vault, this.settings], async () => {
      await this.vault.clear()
      if (data.vault.length > 0) await this.vault.bulkAdd(data.vault as VaultEntry[])
      for (const s of settings) await this.settings.put(s)
    })
  }

  /**
   * 裁剪 commandId 幂等表（防御性清理，防 append-only 无限膨胀）。
   * 幂等去重只需要「最近一段时间」内的窗口，超过 retentionDays 的旧记录可安全删除。
   * 调用时机：应用启动时（不阻塞主流程，静默失败）。
   *
   * 实现要点（历史教训）：
   * - 不用 `processedAt` 索引（曾为它新增 version(8)，会在 GB 级膨胀表上触发全量索引重建 → 启动卡死）。
   * - 不用 `where(...).toArray()`（会把海量记录一次性载入内存 → OOM/卡死）。
   * - 异常膨胀时（历史 bug 残留）直接 `clear()` 全清：纯幂等缓存，清空安全；count() 是 O(1) 级。
   */
  async pruneSystemCommandIds(retentionDays = 7): Promise<number> {
    try {
      const count = await this.systemCommandIds.count()
      if (count === 0) return 0

      // 异常膨胀：全清比逐条裁剪更快更稳（clear 不载入 JS 内存）
      if (count > 50000) {
        return this.systemCommandIds.filter((r) => !r.projectionRecovery).delete()
      }

      // 正常规模：内存过滤出过期主键后删除（表小，安全）
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
      const staleKeys = await this.systemCommandIds
        .filter((r) => !r.projectionRecovery && (r.processedAt ?? '') < cutoff)
        .primaryKeys()
      if (staleKeys.length > 0) {
        await this.systemCommandIds.bulkDelete(staleKeys)
      }
      return staleKeys.length
    } catch (err) {
      console.warn('[WorkbenchDB] pruneSystemCommandIds failed (ignored):', err)
      return 0
    }
  }
}

export const db = new WorkbenchDB()
