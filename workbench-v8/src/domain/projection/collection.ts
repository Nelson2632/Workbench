// ============================================================
// V9 CROSS DOMAIN — Collection Core（V9-C-002 §7）
// 指针表：只存 sourceDomain/sourceType/sourceId/title 快照/note/favoriteAt
// 唯一性 [sourceType+sourceId]；实体删除 → 级联删除指针
// ============================================================

import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import type { CollectionEntry, Domain } from '@/types'

export interface FavoriteInput {
  sourceDomain: Domain
  sourceType: string
  sourceId: string
  title: string
  note?: string
}

/** 收藏（幂等：同 [sourceType+sourceId] 唯一，重复收藏 = 更新快照） */
export async function favoriteEntry(input: FavoriteInput): Promise<CollectionEntry> {
  const existing = await db.collectionEntries
    .where('[sourceType+sourceId]')
    .equals([input.sourceType, input.sourceId])
    .first()
  const now = new Date().toISOString()
  if (existing) {
    const updated: CollectionEntry = { ...existing, title: input.title, note: input.note ?? existing.note, favoriteAt: now }
    await db.collectionEntries.put(updated)
    return updated
  }
  const row: Omit<CollectionEntry, 'id'> = {
    sourceDomain: input.sourceDomain,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    note: input.note ?? '',
    favoriteAt: now,
    createdAt: now,
  }
  const id = await db.collectionEntries.add(row)
  eventBus.publish({ type: 'collection.favorited', sourceType: input.sourceType, sourceId: input.sourceId })
  return { ...row, id }
}

/** 取消收藏 */
export async function unfavoriteEntry(sourceType: string, sourceId: string): Promise<void> {
  const row = await db.collectionEntries
    .where('[sourceType+sourceId]')
    .equals([sourceType, sourceId])
    .first()
  if (!row) return
  await db.collectionEntries.delete(row.id)
  eventBus.publish({ type: 'collection.unfavorited', sourceType, sourceId })
}

export async function listCollection(): Promise<CollectionEntry[]> {
  return db.collectionEntries.orderBy('favoriteAt').reverse().toArray()
}

// ---------- 级联删除（实体删除 → 指针删除，V9-C-002 §3 删除联动） ----------

const CASCADE_MAP: Record<string, string> = {
  'task.deleted': 'task',
  'diary.deleted': 'diary',
  'lifeMoment.deleted': 'lifeMoment',
  'event.deleted': 'event',
  'anime.deleted': 'anime',
  'gameRecord.deleted': 'gameRecord',
  'music.deleted': 'music',
  'review.deleted': 'review',
  'exam.deleted': 'exam',
  'mistake.deleted': 'mistake',
  'game.deleted': 'game',
}

let initialized = false

/** 测试辅助：允许重新装配订阅（EventBus.clear 后使用） */
export function _resetCollectionForTests(): void {
  initialized = false
}

export function setupCollection(): void {
  if (initialized) return
  initialized = true
  eventBus.subscribeAll((event) => {
    const sourceType = CASCADE_MAP[event.type]
    if (!sourceType) return
    const raw = event as Record<string, unknown>
    const sourceId = String(
      raw.taskId ?? raw.diaryId ?? raw.lifeMomentId ?? raw.eventId ?? raw.animeId ??
      raw.recordId ?? raw.musicId ?? raw.reviewId ?? raw.examId ?? raw.mistakeId ?? raw.gameId ?? '',
    )
    if (!sourceId) return
    void db.collectionEntries
      .where('[sourceType+sourceId]')
      .equals([sourceType, sourceId])
      .delete()
      .catch((err) => console.error('[Collection] cascade delete failed:', err))
  })
}
