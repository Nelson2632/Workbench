// ============================================================
// V9 PLAY AnimeStore 测试（V9-C-001 §4.7）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useAnimeStore } from './animeStore'

describe('AnimeStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useAnimeStore.setState({ animeList: [], loading: false })
  })

  it('EMPTY：空库加载为空', async () => {
    await useAnimeStore.getState().loadAnime()
    expect(useAnimeStore.getState().animeList).toHaveLength(0)
  })

  it('CRUD + 事件：created/updated/deleted', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    const id = await useAnimeStore.getState().addAnime({ name: '测试动画', totalEpisodes: 12 })
    expect(useAnimeStore.getState().animeList).toHaveLength(1)
    expect(useAnimeStore.getState().animeList[0].status).toBe('planned')

    await useAnimeStore.getState().updateAnime(id, { rating: 8.5 })
    expect(useAnimeStore.getState().animeList[0].rating).toBe(8.5)

    await useAnimeStore.getState().toggleFavorite(id)
    expect(useAnimeStore.getState().animeList[0].favorite).toBe(true)

    await useAnimeStore.getState().deleteAnime(id)
    expect(useAnimeStore.getState().animeList).toHaveLength(0)

    expect(seen).toContain('anime.created')
    expect(seen).toContain('anime.updated')
    expect(seen).toContain('anime.deleted')
  })

  it('集数推进：episodeWatched + 进度 + 自动完结（completedAt + anime.completed）', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))

    const id = await useAnimeStore.getState().addAnime({ name: '短篇', totalEpisodes: 2 })
    await useAnimeStore.getState().setStatus(id, 'watching')
    await useAnimeStore.getState().watchEpisode(id, 1)
    await useAnimeStore.getState().watchEpisode(id, 2)

    const row = (await db.anime.toArray())[0]
    expect(row.watchedEpisodes).toBe(2)
    expect(row.episodeLog).toHaveLength(2)
    expect(row.status).toBe('completed')
    expect(row.completedAt).not.toBeNull()
    expect(seen.filter((t) => t === 'anime.episodeWatched')).toHaveLength(2)
    expect(seen).toContain('anime.completed')
  })

  it('同集幂等：重复看同一集不重复记录', async () => {
    const id = await useAnimeStore.getState().addAnime({ name: 'A', totalEpisodes: 10 })
    await useAnimeStore.getState().watchEpisode(id, 3)
    await useAnimeStore.getState().watchEpisode(id, 3)
    const row = (await db.anime.toArray())[0]
    expect(row.episodeLog).toHaveLength(1)
  })

  it('状态机：手动标记完成发布 anime.completed；取消完成清空 completedAt', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))
    const id = await useAnimeStore.getState().addAnime({ name: 'B' })

    await useAnimeStore.getState().setStatus(id, 'completed')
    let row = (await db.anime.toArray())[0]
    expect(row.completedAt).not.toBeNull()
    expect(seen).toContain('anime.completed')

    await useAnimeStore.getState().setStatus(id, 'dropped')
    row = (await db.anime.toArray())[0]
    expect(row.status).toBe('dropped')
    expect(row.completedAt).toBeNull()
  })
})
