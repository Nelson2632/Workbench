// ============================================================
// V9 Game Adapter 契约基础设施测试（V9-C-005 + Patch C-005-12）
// 版本闸门 / 超时重试 / offlineMode / lastKnownData / 异常隔离
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import {
  checkAdapterCompatibility,
  registerAdapter,
  getAdapter,
  listAdapters,
  clearRegistry,
  callAdapter,
  fetchWithOfflinePolicy,
  isOffline,
  clearOffline,
  CORE_VERSION,
  EXPECTED_GAME_SCHEMA,
  type GameAdapter,
} from './gameAdapter'

function makeAdapter(over: Partial<GameAdapter> = {}): GameAdapter {
  return {
    gameId: 'genshin',
    adapterVersion: '1.0.0',
    targetSchemaVersion: 1,
    minCoreVersion: '9.0.0',
    maxSupportedSchemaVersion: 2,
    getCapabilities: () => ['profile', 'records'],
    fetchProfile: async () => ({ source: 'genshin', updatedAt: '', data: {} }),
    fetchRecords: async () => [],
    ...over,
  }
}

describe('版本闸门（Patch C-005-12）', () => {
  beforeEach(() => {
    clearRegistry()
  })

  it('四象限判定：ok / 过新 / 过旧 / schema 超前', () => {
    expect(checkAdapterCompatibility({ minCoreVersion: '9.0.0', maxSupportedSchemaVersion: 2, targetSchemaVersion: 1 })).toEqual({ ok: true })
    expect(checkAdapterCompatibility({ minCoreVersion: '10.0.0', maxSupportedSchemaVersion: 2, targetSchemaVersion: 1 }))
      .toEqual({ ok: false, reason: 'adapter-too-new' })
    expect(checkAdapterCompatibility({ minCoreVersion: '9.0.0', maxSupportedSchemaVersion: 0, targetSchemaVersion: 1 }))
      .toEqual({ ok: false, reason: 'adapter-too-old' })
    expect(checkAdapterCompatibility({ minCoreVersion: '9.0.0', maxSupportedSchemaVersion: 2, targetSchemaVersion: 5 }))
      .toEqual({ ok: false, reason: 'schema-ahead' })
  })

  it('注册表：不合规 adapter 拒绝注册；合规可发现', () => {
    expect(registerAdapter(makeAdapter({ minCoreVersion: '99.0.0' }))).toEqual({ ok: false, reason: 'adapter-too-new' })
    expect(listAdapters()).toHaveLength(0)

    expect(registerAdapter(makeAdapter())).toEqual({ ok: true })
    expect(getAdapter('genshin')?.adapterVersion).toBe('1.0.0')
    expect(listAdapters()).toHaveLength(1)
  })

  it('Core 版本与 schema 常量', () => {
    expect(CORE_VERSION).toBe('9.0.0')
    expect(EXPECTED_GAME_SCHEMA).toBe(1)
  })
})

describe('调用策略：超时 / 重试 / 离线（V9-C-005 §3）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('成功：返回 ok，清除离线标记', async () => {
    const res = await callAdapter('g1', async () => 'data', { timeoutMs: 500 })
    expect(res.status).toBe('ok')
    expect(res.data).toBe('data')
    expect(await isOffline('g1')).toBe(false)
  })

  it('失败重试 → offlineMode + Journal；异常不向上抛', async () => {
    let calls = 0
    const res = await callAdapter('g1', async () => {
      calls++
      throw new Error('boom')
    }, { timeoutMs: 50, retries: 2, backoffMs: [5, 5] })

    expect(res.status).toBe('offline')
    expect(res.attempts).toBe(3)
    expect(calls).toBe(3)
    expect(await isOffline('g1')).toBe(true)
    const journal = await db.operationJournal.where('eventType').equals('game.adapter.offline').toArray()
    expect(journal).toHaveLength(1)
    expect(journal[0].payload).toMatchObject({ gameId: 'g1', error: 'boom' })
  })

  it('超时触发重试（fake adapter 永久挂起）', async () => {
    const res = await callAdapter('g2', () => new Promise<string>(() => {}), {
      timeoutMs: 30, retries: 1, backoffMs: [5],
    })
    expect(res.status).toBe('offline')
    expect(res.attempts).toBe(2)
    expect(res.error).toBe('adapter timeout')
  })

  it('离线可清除', async () => {
    await callAdapter('g3', async () => { throw new Error('x') }, { timeoutMs: 30, retries: 0, backoffMs: [] })
    expect(await isOffline('g3')).toBe(true)
    await clearOffline('g3')
    expect(await isOffline('g3')).toBe(false)
  })

  it('fetchWithOfflinePolicy：成功时快照回调执行（lastKnownData 落库路径）', async () => {
    const snapshots: string[] = []
    const adapter = makeAdapter()
    const res = await fetchWithOfflinePolicy(
      adapter,
      (a) => a.fetchProfile(),
      async (data) => {
        snapshots.push(data.source)
      },
      { timeoutMs: 500, retries: 0, backoffMs: [] },
    )
    expect(res.status).toBe('ok')
    expect(snapshots).toEqual(['genshin'])
  })

  it('战斗模拟结果必须 theoretical:true（类型与语义约束）', async () => {
    const adapter = makeAdapter({
      simulateCombat: async () => ({ theoretical: true, assumptions: ['固定面板'], data: {} }),
    })
    const result = await adapter.simulateCombat!({})
    expect(result.theoretical).toBe(true)
    expect(result.assumptions.length).toBeGreaterThan(0)
  })
})
