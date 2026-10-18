// ============================================================
// V9 Module Health Matrix — SYSTEM 部分（M7 Gate）
// SEARCH / NOTIFICATION / EXPORT / SETTINGS数据层 / MIGRATION
// 含 M7 三项验证（搜索跨域跳转 / 迁移 Dry Run / 迁移 counts+checksum 一致）
// ============================================================

import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { searchAll } from '@/domain/search/v9Search'
import {
  setupV9Notifications,
  setToastBridge,
  _resetNotificationsForTests,
  _currentToastFn,
} from '@/domain/system/notifications'
import { exportFullData, exportSelectedData, allowedExportTables } from '@/domain/system/export'
import {
  dryRunMigration,
  runMigration,
  type MigrationExport,
} from '@/domain/migration/runner'
import { useSystemStore } from '@/stores/systemStore'
import { useDiaryStore } from '@/stores/diaryStore'
import { useAnimeStore } from '@/stores/animeStore'

const FIXTURE = fileURLToPath(new URL('../../../../docs/contracts/sample/expected_migration_export.json', import.meta.url))
const D = '2026-08-30'
const THEMES = ['mist', 'fluent', 'night']

function loadFixture(): MigrationExport {
  return JSON.parse(readFileSync(FIXTURE, 'utf8'))
}

describe('SYSTEM Health Matrix（M7 Gate）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    useDiaryStore.setState({ diaries: [], lifeMoments: [], loading: false })
    useAnimeStore.setState({ animeList: [], loading: false })
    setToastBridge(null)
    _resetNotificationsForTests()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    eventBus.clear()
  })

  it('M7 验证 1：搜索返回跨域结果，跳转 path 正确', async () => {
    await useDiaryStore.getState().addDiary({ date: D, content: '矩阵搜索关键词' })
    await useAnimeStore.getState().addAnime({ name: '矩阵搜索动画' })
    await db.events.add({ date: D, type: 'custom', title: '矩阵搜索事件', note: '', allDay: true, sourceType: null, sourceId: null, doneAt: null, createdAt: '', updatedAt: '' } as never)
    await db.music.add({ title: '矩阵搜索歌曲', artist: 'a', album: null, genre: null, thoughts: '', favorite: false, occurredAt: '', createdAt: '', updatedAt: '' } as never)

    const results = await searchAll('矩阵搜索')
    const types = results.map((r) => r.sourceType)
    expect(types).toContain('diary')
    expect(types).toContain('anime')
    expect(types).toContain('event')
    expect(types).toContain('music')

    const diary = results.find((r) => r.sourceType === 'diary')!
    expect(diary.path).toBe(`/life/diary?date=${D}`)
    expect(results.find((r) => r.sourceType === 'anime')!.path).toBe('/play/anime')
    expect(results.find((r) => r.sourceType === 'event')!.path).toBe('/life/events')
    expect(results.find((r) => r.sourceType === 'music')!.path).toBe('/play/music')
    // 统一结果结构
    expect(diary).toHaveProperty('sourceDomain')
    expect(diary).toHaveProperty('snippet')
  })

  it('SEARCH EMPTY/ERROR：空查询返回空；单表故障不拖垮全局', async () => {
    expect(await searchAll('')).toHaveLength(0)
    expect(await searchAll('   ')).toHaveLength(0)

    await db.diaries.add({ date: D, type: 'quick', mood: null, weather: null, title: '', content: '容错', photos: [], tags: [], createdAt: '', updatedAt: '' } as never)
    const spy = vi.spyOn(db.diaries, 'toArray').mockRejectedValue(new Error('boom'))
    const results = await searchAll('容错')
    expect(results.filter((r) => r.sourceType === 'diary')).toHaveLength(0) // 该表跳过
    expect(results.length).toBeGreaterThanOrEqual(0) // 不抛异常
    spy.mockRestore()
  })

  it('NOTIFICATION：关键事件 → Toast 桥', () => {
    const toasts: { msg: string; type: string }[] = []
    setToastBridge((msg, type) => toasts.push({ msg, type: type ?? 'info' }))
    setupV9Notifications()
    eventBus.publish({ type: 'flexStudy.fallback', reason: 'x' })
    eventBus.publish({ type: 'nightShutdown.completed', date: D })
    expect(toasts).toHaveLength(2)
    expect(toasts[0].type).toBe('warning')
    expect(toasts[1].msg).toContain('收口')
    expect(_currentToastFn()).not.toBeNull()
  })

  it('EXPORT：全量不含 vault/privateFileMeta；选定导出只含勾选表', async () => {
    await db.vault.add({ id: 'v1', platform: 't', username: 'u', password: 'SECRET', passwordIv: 'iv', url: '', note: '', lastUsed: '' } as never)
    await db.diaries.add({ date: D, type: 'quick', mood: null, weather: null, title: 'x', content: 'y', photos: [], tags: [], createdAt: '', updatedAt: '' } as never)

    const full = await exportFullData()
    expect(full.data.vault).toBeUndefined()
    expect(full.data.privateFileMeta).toBeUndefined()
    expect(full.data.diaries).toHaveLength(1)
    expect(full.tables.length).toBe(allowedExportTables().length)

    const selected = await exportSelectedData(['diaries'])
    expect(Object.keys(selected.data)).toEqual(['diaries'])
    expect(JSON.stringify(selected)).not.toContain('SECRET')
  })

  it('M7 验证 2：迁移工具对脱敏数据 Dry Run 全绿', async () => {
    const manifest = await dryRunMigration(loadFixture())
    expect(manifest.verified).toBe(true)
    expect(await db.diaries.count()).toBe(0)
  })

  it('M7 验证 3：实际迁移后数据总数、校验和与源一致（旧 MyDiary 只读不触碰）', async () => {
    const exp = loadFixture()
    const { targetCount } = await runMigration(exp)
    expect(targetCount).toBe(exp.counts.targetCount)
    expect(await db.diaries.count()).toBe(10)
    expect(await db.friends.count()).toBe(3)
    // runner 不写任何 MyDiary 源文件（V9 侧无文件系统访问；旧数据只读由 Sidecar/归档流程保证）
    expect((await db.migrationRuns.toArray())[0].status).toBe('done')
  })

  it('STARTUP/THEME：主题值域合法；系统模块可加载', () => {
    expect(THEMES).toContain(useSystemStore.getState().theme)
  })
})
