// ============================================================
// V9 PLAY GameStore 测试（V9-C-001 §4.8/§4.9 + V9-C-005 lastKnownData）
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useGameStore } from './gameStore'

describe('GameStore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useGameStore.setState({ games: [], records: [], loading: false })
  })

  it('EMPTY：空库加载为空', async () => {
    await useGameStore.getState().loadGames()
    expect(useGameStore.getState().games).toHaveLength(0)
  })

  it('CRUD + 事件', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => seen.push(e.type))
    const id = await useGameStore.getState().addGame({ name: '测试游戏', genre: 'RPG', platform: 'PC' })
    expect(useGameStore.getState().games).toHaveLength(1)
    await useGameStore.getState().updateGame(id, { status: 'completed' })
    expect(useGameStore.getState().games[0].status).toBe('completed')
    await useGameStore.getState().deleteGame(id)
    expect(useGameStore.getState().games).toHaveLength(0)
    expect(seen).toContain('game.created')
    expect(seen).toContain('game.updated')
    expect(seen).toContain('game.deleted')
  })

  it('记录：addRecord 发布 game.recorded；lastKnownByType 返回最新快照', async () => {
    const id = await useGameStore.getState().addGame({ name: 'G' })
    await useGameStore.getState().addRecord({
      gameId: id, type: 'profile', data: { level: 10 }, occurredAt: '2026-08-30T10:00:00.000Z',
    })
    await useGameStore.getState().addRecord({
      gameId: id, type: 'profile', data: { level: 12 }, occurredAt: '2026-08-30T12:00:00.000Z',
    })
    await useGameStore.getState().addRecord({
      gameId: id, type: 'playtime', data: { minutes: 40 },
    })
    await useGameStore.getState().loadRecords(id)
    expect(useGameStore.getState().records).toHaveLength(3)

    const latest = useGameStore.getState().lastKnownByType(id, 'profile')
    expect(latest?.data).toEqual({ level: 12 })
  })

  it('删除游戏级联删除记录并发布 gameRecord.deleted', async () => {
    const id = await useGameStore.getState().addGame({ name: 'G' })
    await useGameStore.getState().addRecord({ gameId: id, type: 'note', data: { text: 'x' } })
    const deleted: number[] = []
    eventBus.subscribe('gameRecord.deleted', (e) => deleted.push(e.recordId))

    await useGameStore.getState().deleteGame(id)
    expect(await db.gameRecords.count()).toBe(0)
    expect(deleted).toHaveLength(1)
  })
})
