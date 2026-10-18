// ============================================================
// Personal Workbench V9 — Operation Journal（V9-C-001 §4.19 / DP1.1 v1.7）
// 所有领域事件汇流入库（operationJournal，++seq 单调），无限期保留（不裁剪）
// ============================================================

import { db } from '@/db/database'
import { eventBus, isJournaled } from '@/domain/events/eventBus'

/** 写入一条 Journal 记录，返回自增 seq */
export async function journalEvent(
  eventType: string,
  payload: Record<string, unknown> | null,
): Promise<number> {
  // after_journal_write 已归 Mutation Lane（事务内、journal add 后、commit 前）。
  // 此处为系统事件（snapshot/backup/适配器）独立落库，无事务边界可断言，不触发该 Hook。
  return db.operationJournal.add({
    eventType,
    payload,
    occurredAt: new Date().toISOString(),
  })
}

/**
 * Journal 汇流：订阅全部 EventBus 事件并落库（V9-C-002 §2 发布纪律）。
 * 已由 Mutation Lane 原子落 journal 的事件（markJournaled）跳过，避免重复写。
 * 返回取消订阅函数。
 */
export function setupJournalSink(): () => void {
  return eventBus.subscribeAll((event) => {
    if (isJournaled(event)) return
    const rest: Record<string, unknown> = { ...(event as object) }
    delete rest.type
    void journalEvent(event.type, Object.keys(rest).length > 0 ? rest : null).catch((err) => {
      console.error('[Journal] write failed:', err)
    })
  })
}
