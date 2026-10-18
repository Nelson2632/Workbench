// ============================================================
// V9 PLAY MusicStore 测试（V9-C-001 §4.10）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useMusicStore } from './musicStore'

describe('MusicStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useMusicStore.setState({ musicList: [], loading: false })
  })

  it('EMPTY：空库加载为空', async () => {
    await useMusicStore.getState().loadMusic()
    expect(useMusicStore.getState().musicList).toHaveLength(0)
  })

  it('logMusic → music.logged；感想/收藏可更新；删除发布 music.deleted', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    const id = await useMusicStore.getState().logMusic({
      title: '测试曲', artist: '测试歌手', album: '测试专辑',
    })
    expect(useMusicStore.getState().musicList).toHaveLength(1)

    await useMusicStore.getState().updateMusic(id, { thoughts: '好听' })
    await useMusicStore.getState().toggleFavorite(id)
    expect(useMusicStore.getState().musicList[0].favorite).toBe(true)

    await useMusicStore.getState().deleteMusic(id)
    expect(useMusicStore.getState().musicList).toHaveLength(0)

    expect(seen).toContain('music.logged')
    expect(seen).toContain('music.deleted')
  })

  it('列表按 occurredAt 倒序', async () => {
    await useMusicStore.getState().logMusic({ title: 'A', artist: 'a' })
    await useMusicStore.getState().logMusic({ title: 'B', artist: 'b' })
    await useMusicStore.getState().loadMusic()
    expect(useMusicStore.getState().musicList.map((m) => m.title)).toEqual(['B', 'A'])
  })
})
