// ============================================================
// Personal Workbench V9 — Mutation Lane（R1.1 / DP1.5 v1.7）
// 串行域事务（concurrency=1 / FIFO）+ commandId 幂等去重。
// commandId 记录与 Domain 写入在同一 Dexie transaction 原子提交。
// ============================================================

import { db } from '@/db/database'
import { faultInjection } from '@/utils/faultInjection'
import { eventBus, markJournaled, markCriticalOwned, type AppEvent } from '@/domain/events/eventBus'
import type { Table } from 'dexie'
import type { SystemCommandId } from '@/types'

// ---------- FIFO 串行队列（R6-03：concurrency=1，order=FIFO） ----------

let queueTail: Promise<unknown> = Promise.resolve()

/** 将 fn 排入 Mutation Lane 串行队列；返回 fn 的结果（异常原样抛给调用方） */
export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(fn, fn)
  // 队列尾部吞掉错误，保证后续 mutation 仍能执行
  queueTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

// ---------- commandId 幂等（R6-04/05，DP1.5） ----------

export function commandKey(commandType: string, commandId: string): string {
  return `${commandType}:${commandId}`
}

/** 是否已处理过该 commandId（去重判定发生在 Mutation Lane 入口） */
export async function commandAlreadyProcessed(commandType: string, commandId: string): Promise<boolean> {
  return !!(await db.systemCommandIds.get(commandKey(commandType, commandId)))
}

// ---------- 执行器 ----------

export interface RunCommandOptions<T> {
  commandType: string
  commandId: string
  /** mutate 会写入的域表名（与 systemCommandIds / operationJournal 同事务原子提交） */
  tables: string[]
  mutate: () => Promise<T> | T
  /** 由本次写意图派生、需随事务原子落 journal 的领域事件（R6-06）；无则 [] */
  events?: (result: T) => AppEvent[]
  /** 提交后回调（更新 UI state 等；发布事件由 events 统一走 lane） */
  afterCommit?: (result: T) => void | Promise<void>
  /** Opt-in derived writes only: MUST NOT enqueue another Mutation Lane command. */
  projectionRecovery?: SystemCommandId['projectionRecovery']
  projectCritical?: (events: AppEvent[], result: T) => Promise<void>
}

export interface RunCommandResult<T> {
  result: T | null
  deduped: boolean
  projection?: 'projected' | 'pending'
}

/**
 * 从事件载荷派生 journal payload：展开 event 去 type；空对象 → null（与 journalEvent 口径一致）。
 */
function journalPayload(event: AppEvent): Record<string, unknown> | null {
  const rest: Record<string, unknown> = { ...(event as object) }
  delete rest.type
  return Object.keys(rest).length > 0 ? rest : null
}

/**
 * Mutation Lane 执行：串行 + commandId 去重 + 原子提交。
 * - 已处理 commandId → no-op（不重复执行、不重复发事件，R6-05）。
 * - 首次 → Domain 写入 + commandId 记录 + journal 写入在同一 Dexie transaction 内原子提交（R6-06）。
 * - 提交后：afterCommit（UI set）+ events 发布；任何 post-commit 异常不使已提交命令失败（MUST-02）。
 */
export async function runCommand<T>(opts: RunCommandOptions<T>): Promise<RunCommandResult<T>> {
  return enqueue(async () => {
    const already = await commandAlreadyProcessed(opts.commandType, opts.commandId)
    if (already) {
      return { result: null, deduped: true }
    }

    let result!: T
    let events: AppEvent[] = []
    const hasEvents = typeof opts.events === 'function'
    const tables = [
      ...opts.tables.map((name) => db.table(name)),
      db.systemCommandIds,
      ...(hasEvents ? [db.operationJournal] : []),
    ] as unknown as Table[]

    await faultInjection.fire('before_domain_commit')
    await db.transaction('rw', tables, async () => {
      result = await opts.mutate()
      await db.systemCommandIds.add({
        id: commandKey(opts.commandType, opts.commandId),
        commandType: opts.commandType,
        commandId: opts.commandId,
        processedAt: new Date().toISOString(),
        projectionRecovery: opts.projectionRecovery,
      })
      if (hasEvents) {
        events = opts.events!(result)
        for (const event of events) {
          await db.operationJournal.add({
            eventType: event.type,
            payload: journalPayload(event),
            occurredAt: new Date().toISOString(),
          })
        }
      }
      // after_journal_write：journal 已写、外层事务未提交（R6-06 原子性断言点）
      await faultInjection.fire('after_journal_write')
    })
    await faultInjection.fire('after_domain_commit')

    // UI failure must not suppress event dispatch or turn a committed write into a failure.
    try {
      await opts.afterCommit?.(result)
    } catch (err) {
      console.error('[MutationLane] post-commit error (ignored):', err)
    }

    let projection: 'projected' | 'pending' | undefined
    if (opts.projectCritical) {
      try {
        await opts.projectCritical(events, result)
        await db.systemCommandIds.update(commandKey(opts.commandType, opts.commandId), { projectionRecovery: undefined })
        projection = 'projected'
      } catch (err) {
        projection = 'pending'
        console.error('[MutationLane] committed; critical projection pending:', err)
      }
    }
    for (const event of events) {
      if (opts.projectCritical) markCriticalOwned(event)
      eventBus.publish(markJournaled(event))
    }

    return { result, deduped: false, projection }
  })
}

/** 测试辅助：重置队列（test 间隔离用） */
export function _resetMutationLaneForTests(): void {
  queueTail = Promise.resolve()
}
