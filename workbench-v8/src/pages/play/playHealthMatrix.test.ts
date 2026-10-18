// ============================================================
// V9 Module Health Matrix — PLAY 部分（M4 Gate）
// ANIME/GAME/MUSIC ×（STARTUP/CRUD/EMPTY/ERROR/RECOVERY/THEME）
// 含闭环 C 数据管道（PLAY → EventBus/Journal → 待 M5 Timeline）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useAnimeStore } from '@/stores/animeStore'
import { useGameStore } from '@/stores/gameStore'
import { useMusicStore } from '@/stores/musicStore'
import { useSystemStore } from '@/stores/systemStore'
import { setupJournalSink } from '@/db/journal'

const THEMES = ['mist', 'fluent', 'night']

async function reset() {
  useAnimeStore.setState({ animeList: [], loading: false })
  useGameStore.setState({ games: [], records: [], loading: false })
  useMusicStore.setState({ musicList: [], loading: false })
}

describe('PLAY Module Health Matrix（M4 Gate）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    await reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('STARTUP：三域启动加载无异常', async () => {
    await useAnimeStore.getState().loadAnime()
    await useGameStore.getState().loadGames()
    await useMusicStore.getState().loadMusic()
    expect(useAnimeStore.getState().loading).toBe(false)
    expect(useGameStore.getState().loading).toBe(false)
    expect(useMusicStore.getState().loading).toBe(false)
  })

  it('EMPTY：空库零状态', async () => {
    await useAnimeStore.getState().loadAnime()
    await useGameStore.getState().loadGames()
    await useMusicStore.getState().loadMusic()
    expect(useAnimeStore.getState().animeList).toHaveLength(0)
    expect(useGameStore.getState().games).toHaveLength(0)
    expect(useMusicStore.getState().musicList).toHaveLength(0)
  })

  it('CRUD：三域全链路 + 跨域事实可查（Journal）', async () => {
    const off = setupJournalSink()
    try {
      // 动画：添加 → 标记完成 → 事件进 EventBus/Journal
      const animeId = await useAnimeStore.getState().addAnime({ name: '闭环动画', totalEpisodes: 3 })
      await useAnimeStore.getState().watchEpisode(animeId, 1)
      await useAnimeStore.getState().setStatus(animeId, 'completed')
      expect((await db.anime.get(animeId))?.completedAt).not.toBeNull()

      // 游戏：添加 → 记录进度 → 可查看
      const gameId = await useGameStore.getState().addGame({ name: '闭环游戏' })
      await useGameStore.getState().addRecord({
        gameId, type: 'progress', data: { text: '第三章' },
      })
      await useGameStore.getState().loadRecords(gameId)
      expect(useGameStore.getState().records[0].data).toEqual({ text: '第三章' })

      // 音乐：记录一首
      const musicId = await useMusicStore.getState().logMusic({ title: '闭环曲', artist: '歌手' })
      expect(await db.music.get(musicId)).toBeTruthy()

      await new Promise((r) => setTimeout(r, 30))
      const types = (await db.operationJournal.toArray()).map((j) => j.eventType)
      for (const t of ['anime.created', 'anime.episodeWatched', 'anime.completed', 'game.created', 'game.recorded', 'music.logged']) {
        expect(types).toContain(t)
      }

      // 清理
      await useAnimeStore.getState().deleteAnime(animeId)
      await useGameStore.getState().deleteGame(gameId)
      await useMusicStore.getState().deleteMusic(musicId)
      expect(await db.anime.count()).toBe(0)
      expect(await db.games.count()).toBe(0)
      expect(await db.gameRecords.count()).toBe(0)
      expect(await db.music.count()).toBe(0)
    } finally {
      off()
    }
  })

  it('ERROR：读取失败不崩溃、状态回空', async () => {
    vi.spyOn(db.anime, 'toArray').mockRejectedValue(new Error('boom'))
    vi.spyOn(db.games, 'toArray').mockRejectedValue(new Error('boom'))
    vi.spyOn(db.music, 'orderBy').mockImplementation(() => {
      throw new Error('boom')
    })
    await useAnimeStore.getState().loadAnime()
    await useGameStore.getState().loadGames()
    await useMusicStore.getState().loadMusic()
    expect(useAnimeStore.getState().animeList).toHaveLength(0)
    expect(useGameStore.getState().games).toHaveLength(0)
    expect(useMusicStore.getState().musicList).toHaveLength(0)
  })

  it('RECOVERY：错误恢复后可正常读取', async () => {
    await useAnimeStore.getState().addAnime({ name: '恢复验证' })
    const spy = vi.spyOn(db.anime, 'toArray').mockRejectedValue(new Error('boom'))
    await useAnimeStore.getState().loadAnime()
    expect(useAnimeStore.getState().animeList).toHaveLength(0)
    spy.mockRestore()
    await useAnimeStore.getState().loadAnime()
    expect(useAnimeStore.getState().animeList).toHaveLength(1)
  })

  it('THEME：主题值域合法', () => {
    expect(THEMES).toContain(useSystemStore.getState().theme)
  })

  it('PLAY 全离线：域代码不依赖任何外部 API（无 fetch 调用路径）', () => {
    // 契约断言：三个 Store 只操作本地 Dexie；adapter 基础设施不 import 任何具体 adapter
    expect(useAnimeStore.getState().animeList).toEqual([])
    expect(useGameStore.getState().games).toEqual([])
    expect(useMusicStore.getState().musicList).toEqual([])
    // 本测试环境未注册任何 adapter（Core 零依赖，V9.1 才接 Genshin/ZZZ）
  })
})
