// ============================================================
// V9 Collection Core 测试（V9-C-002 §7）
// 收藏幂等 / 取消 / 级联删除
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  favoriteEntry,
  unfavoriteEntry,
  listCollection,
  setupCollection,
  _resetCollectionForTests,
} from './collection'

const flush = () => new Promise((r) => setTimeout(r, 25))

describe('Collection Core', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetCollectionForTests()
  })

  it('收藏：写入指针 + 事件；重复收藏幂等（唯一 [sourceType+sourceId]）', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    await favoriteEntry({ sourceDomain: 'life', sourceType: 'diary', sourceId: '1', title: '日记' })
    await favoriteEntry({ sourceDomain: 'life', sourceType: 'diary', sourceId: '1', title: '日记（新标题）' })

    const rows = await db.collectionEntries.toArray()
    expect(rows).toHaveLength(1) // 唯一索引去重
    expect(rows[0].title).toBe('日记（新标题）')
    expect(seen.filter((t) => t === 'collection.favorited')).toHaveLength(1)
  })

  it('取消收藏：指针删除 + 事件', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))
    await favoriteEntry({ sourceDomain: 'play', sourceType: 'anime', sourceId: '1', title: '动画' })
    await unfavoriteEntry('anime', '1')
    expect(await db.collectionEntries.count()).toBe(0)
    expect(seen).toContain('collection.unfavorited')
  })

  it('级联：实体删除 → 对应指针删除，其他域指针保留', async () => {
    await db.diaries.add({ date: '2026-08-30', type: 'quick', mood: null, weather: null, title: 'd', content: '', photos: [], tags: [], createdAt: '', updatedAt: '' } as never)
    await db.anime.add({ name: 'A', coverRef: null, status: 'watching', rating: null, favorite: false, thoughts: '', totalEpisodes: null, watchedEpisodes: 0, episodeLog: [], completedAt: null, createdAt: '', updatedAt: '' } as never)
    await favoriteEntry({ sourceDomain: 'life', sourceType: 'diary', sourceId: '1', title: 'd' })
    await favoriteEntry({ sourceDomain: 'play', sourceType: 'anime', sourceId: '1', title: 'A' })

    setupCollection()
    eventBus.publish({ type: 'diary.deleted', diaryId: 1 })
    await flush()

    const rows = await listCollection()
    expect(rows).toHaveLength(1)
    expect(rows[0].sourceType).toBe('anime')
  })
})
