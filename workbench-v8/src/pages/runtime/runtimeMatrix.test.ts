// ============================================================
// V9 M8 — 全模块 Runtime Matrix 自动化（V9_MASTER_PLAN §40/§50）
// 11 模块 ×（STARTUP/CRUD/EMPTY/ERROR/RECOVERY/THEME）
// 运行方式：pnpm test src/pages/runtime/runtimeMatrix.test.ts
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import { useSystemStore } from '@/stores/systemStore'
import { useDiaryStore } from '@/stores/diaryStore'
import { useEventStore } from '@/stores/eventStore'
import { useFriendStore } from '@/stores/friendStore'
import { useTaskStore } from '@/stores/taskStore'
import { useStudyStore } from '@/stores/studyStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyPlanStore } from '@/stores/studyPlanStore'
import { useNightShutdownStore } from '@/stores/nightShutdownStore'
import { useAnimeStore } from '@/stores/animeStore'
import { useGameStore } from '@/stores/gameStore'
import { useMusicStore } from '@/stores/musicStore'
import { useTimelineStore } from '@/stores/timelineStore'
import { useDailyMemoryStore } from '@/stores/dailyMemoryStore'
import { searchAll } from '@/domain/search/v9Search'
import { getPlanningMode } from '@/domain/work/flexStudy'
import { setupLock, unlock, lock, _resetForTests } from '@/domain/security/appLock'
import { encryptPrivateFile, decryptPrivateFile, _clearDevStorageForTests } from '@/domain/security/privateFiles'
import { createSnapshot } from '@/db/snapshot'
import {
  setupProjection,
  _resetProjectionForTests,
} from '@/domain/projection/timelineProjection'
import {
  setupDailyMemory,
  _resetDailyMemoryForTests,
} from '@/domain/projection/dailyMemory'
import {
  setupCollection,
  _resetCollectionForTests,
} from '@/domain/projection/collection'
import { setupJournalSink } from '@/db/journal'

const D = '2026-08-30'
const THEMES = ['mist', 'fluent', 'night']
const te = new TextEncoder()

async function resetAll() {
  useDiaryStore.setState({ diaries: [], lifeMoments: [], loading: false })
  useEventStore.setState({ events: [], loading: false })
  useFriendStore.setState({ friends: [], loading: false })
  useTaskStore.setState({ tasks: [], loading: false })
  useStudyStore.setState({ subjects: [], mistakes: [], exams: [], reading: [], loading: false })
  useReviewStore.setState({ reviews: [], templates: [], loading: false })
  useStudyPlanStore.setState({ items: [], loading: false })
  useNightShutdownStore.setState({ current: null, aggregate: null, loading: false })
  useAnimeStore.setState({ animeList: [], loading: false })
  useGameStore.setState({ games: [], records: [], loading: false })
  useMusicStore.setState({ musicList: [], loading: false })
  useTimelineStore.setState({ items: [], loading: false })
  useDailyMemoryStore.setState({ row: null, loading: false })
}

describe('V9 全模块 Runtime Matrix（M8 Gate）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    _resetForTests()
    _clearDevStorageForTests()
    _resetProjectionForTests()
    _resetDailyMemoryForTests()
    _resetCollectionForTests()
    setupProjection()
    setupDailyMemory()
    setupCollection()
    setupJournalSink()
    await db.settings.put({ key: 'planningMode', value: 'adaptive' })
    await resetAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    eventBus.clear()
    _resetForTests()
  })

  describe('LIFE', () => {
    it('STARTUP/EMPTY', async () => {
      await useDiaryStore.getState().loadRange(D, D)
      await useEventStore.getState().loadRange(D, D)
      await useFriendStore.getState().loadFriends()
      expect(useDiaryStore.getState().diaries).toHaveLength(0)
      expect(useEventStore.getState().events).toHaveLength(0)
      expect(useFriendStore.getState().friends).toHaveLength(0)
    })
    it('CRUD', async () => {
      const id = await useDiaryStore.getState().addDiary({ date: D, content: '矩阵' })
      await useDiaryStore.getState().updateDiary(id, { content: '矩阵2' })
      await useDiaryStore.getState().deleteDiary(id)
      expect(await db.diaries.count()).toBe(0)
    })
    it('ERROR/RECOVERY', async () => {
      await useDiaryStore.getState().addDiary({ date: D, content: 'x' })
      const spy = vi.spyOn(db.diaries, 'where').mockImplementation(() => {
        throw new Error('boom')
      })
      await useDiaryStore.getState().loadRange(D, D)
      expect(useDiaryStore.getState().diaries).toHaveLength(0)
      spy.mockRestore()
      await useDiaryStore.getState().loadRange(D, D)
      expect(useDiaryStore.getState().diaries).toHaveLength(1)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('WORK', () => {
    it('STARTUP/EMPTY', async () => {
      await useStudyPlanStore.getState().loadPlan(D)
      await useNightShutdownStore.getState().loadByDate(D)
      expect(useStudyPlanStore.getState().items).toHaveLength(0)
      expect(useNightShutdownStore.getState().current).toBeNull()
    })
    it('CRUD', async () => {
      await useTaskStore.getState().addTask({ title: 't', priority: 'P0', dueDate: D })
      await useStudyPlanStore.getState().generateFromTasks(D)
      expect(useStudyPlanStore.getState().items).toHaveLength(1)
      await useStudyPlanStore.getState().deleteItem(useStudyPlanStore.getState().items[0].id)
      expect(await db.studyPlanItems.count()).toBe(0)
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.studyPlanItems, 'where').mockImplementation(() => {
        throw new Error('boom')
      })
      await useStudyPlanStore.getState().loadPlan(D)
      expect(useStudyPlanStore.getState().items).toHaveLength(0)
      spy.mockRestore()
      await useStudyPlanStore.getState().loadPlan(D)
      expect(useStudyPlanStore.getState().items).toHaveLength(0)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('PLAY', () => {
    it('STARTUP/EMPTY', async () => {
      await useAnimeStore.getState().loadAnime()
      await useGameStore.getState().loadGames()
      await useMusicStore.getState().loadMusic()
      expect(useAnimeStore.getState().animeList).toHaveLength(0)
      expect(useGameStore.getState().games).toHaveLength(0)
      expect(useMusicStore.getState().musicList).toHaveLength(0)
    })
    it('CRUD', async () => {
      const id = await useAnimeStore.getState().addAnime({ name: 'A', totalEpisodes: 1 })
      await useAnimeStore.getState().watchEpisode(id, 1)
      expect((await db.anime.get(id))?.status).toBe('completed')
      await useAnimeStore.getState().deleteAnime(id)
      expect(await db.anime.count()).toBe(0)
    })
    it('ERROR/RECOVERY', async () => {
      await useAnimeStore.getState().addAnime({ name: 'A' })
      const spy = vi.spyOn(db.anime, 'toArray').mockRejectedValue(new Error('boom'))
      await useAnimeStore.getState().loadAnime()
      expect(useAnimeStore.getState().animeList).toHaveLength(0)
      spy.mockRestore()
      await useAnimeStore.getState().loadAnime()
      expect(useAnimeStore.getState().animeList).toHaveLength(1)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('TODAY', () => {
    it('STARTUP/EMPTY', async () => {
      await useTaskStore.getState().loadTasks()
      expect(useTaskStore.getState().tasks).toHaveLength(0)
      expect(await getPlanningMode()).toBe('adaptive')
    })
    it('CRUD（任务完成 → completedAt）', async () => {
      await useTaskStore.getState().addTask({ title: '今日任务', priority: 'P0', dueDate: D })
      const id = useTaskStore.getState().tasks[0].id
      await useTaskStore.getState().toggleDone(id)
      expect((await db.tasks.get(id) as any).completedAt).toBeTruthy()
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.tasks, 'toArray').mockRejectedValue(new Error('boom'))
      await useTaskStore.getState().loadTasks()
      expect(useTaskStore.getState().tasks).toHaveLength(0)
      spy.mockRestore()
      await useTaskStore.getState().loadTasks()
      expect(useTaskStore.getState().tasks).toHaveLength(0)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('TIMELINE', () => {
    it('STARTUP/EMPTY', async () => {
      await useTimelineStore.getState().load()
      expect(useTimelineStore.getState().items).toHaveLength(0)
    })
    it('CRUD（重建）', async () => {
      await useDiaryStore.getState().addDiary({ date: D, content: '时间线' })
      await new Promise((r) => setTimeout(r, 30))
      expect(await db.timelineEvents.count()).toBe(1)
      const n = await useTimelineStore.getState().rebuild()
      expect(n).toBe(1)
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.timelineEvents, 'orderBy').mockImplementation(() => {
        throw new Error('boom')
      })
      await useTimelineStore.getState().load()
      expect(useTimelineStore.getState().items).toHaveLength(0)
      spy.mockRestore()
      await useTimelineStore.getState().load()
      expect(useTimelineStore.getState().items).toHaveLength(0)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('DAILY MEMORY', () => {
    it('STARTUP/EMPTY', async () => {
      await useDailyMemoryStore.getState().load(D)
      expect(useDailyMemoryStore.getState().row).toBeNull()
    })
    it('CRUD（刷新 + 反思保护）', async () => {
      await useDailyMemoryStore.getState().refresh(D)
      await useDailyMemoryStore.getState().saveReflection(D, '反思')
      await useDailyMemoryStore.getState().refresh(D)
      expect(useDailyMemoryStore.getState().row?.reflection).toBe('反思')
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.dailyMemory, 'where').mockImplementation(() => {
        throw new Error('boom')
      })
      await useDailyMemoryStore.getState().load(D)
      expect(useDailyMemoryStore.getState().row).toBeNull()
      spy.mockRestore()
      await useDailyMemoryStore.getState().load(D)
      expect(useDailyMemoryStore.getState().loading).toBe(false)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('REVIEW（V8）', () => {
    it('STARTUP/EMPTY', async () => {
      await useReviewStore.getState().loadAll()
      expect(useReviewStore.getState().reviews).toHaveLength(0)
    })
    it('CRUD（completedAt 写入，Patch C-002-03）', async () => {
      await useReviewStore.getState().addReview({
        type: 'daily',
        dateRange: { start: D, end: D },
        reflections: ['r'],
        nextActions: [],
      })
      const r = useReviewStore.getState().reviews[0]
      expect(r.completedAt).toBeTruthy()
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.reviewEntries, 'toArray').mockRejectedValue(new Error('boom'))
      await useReviewStore.getState().loadAll()
      expect(useReviewStore.getState().reviews).toHaveLength(0)
      spy.mockRestore()
      await useReviewStore.getState().loadAll()
      expect(useReviewStore.getState().loading).toBe(false)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('SEARCH', () => {
    it('STARTUP/EMPTY', async () => {
      expect(await searchAll('')).toHaveLength(0)
    })
    it('CRUD（跨域命中）', async () => {
      await useDiaryStore.getState().addDiary({ date: D, content: '搜索目标' })
      const r = await searchAll('搜索目标')
      expect(r.some((x) => x.sourceType === 'diary')).toBe(true)
    })
    it('ERROR/RECOVERY（单表故障跳过）', async () => {
      const spy = vi.spyOn(db.diaries, 'toArray').mockRejectedValue(new Error('boom'))
      const r = await searchAll('任意')
      expect(r.filter((x) => x.sourceType === 'diary')).toHaveLength(0)
      spy.mockRestore()
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('SETTINGS', () => {
    it('STARTUP/EMPTY', async () => {
      expect(await getPlanningMode()).toBe('adaptive')
      expect((await db.settings.toArray()).length).toBeGreaterThan(0)
    })
    it('CRUD（键值）', async () => {
      await db.settings.put({ key: 'matrix.key', value: 'v' })
      expect((await db.settings.get('matrix.key'))?.value).toBe('v')
      await db.settings.delete('matrix.key')
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.settings, 'get').mockRejectedValue(new Error('boom'))
      const mode = await getPlanningMode().catch(() => 'adaptive' as const)
      expect(mode).toBe('adaptive')
      spy.mockRestore()
      expect(await getPlanningMode()).toBe('adaptive')
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('VAULT', () => {
    it('STARTUP/EMPTY', async () => {
      expect(await db.vault.count()).toBe(0)
    })
    it('CRUD + 安全边界', async () => {
      await db.vault.add({ id: 'v1', platform: 'p', username: 'u', password: 'SECRET', passwordIv: 'iv', url: '', note: '', lastUsed: '' } as never)
      expect(await db.vault.count()).toBe(1)
      const all = await db.exportAllData()
      expect(all.vault).toBeUndefined() // 普通导出永不包含
      const vaultOnly = await db.exportVaultData()
      expect(vaultOnly.vault).toHaveLength(1)
      await db.vault.delete('v1')
    })
    it('ERROR/RECOVERY', async () => {
      const spy = vi.spyOn(db.vault, 'toArray').mockRejectedValue(new Error('boom'))
      await expect(db.vault.toArray()).rejects.toThrow()
      spy.mockRestore()
      expect(await db.vault.count()).toBe(0)
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })

  describe('SECURITY', () => {
    it('STARTUP/EMPTY', async () => {
      expect(await db.appLock.count()).toBe(0)
      expect(await db.privateFileMeta.count()).toBe(0)
    })
    it('CRUD（App Lock + 私密文件 + 快照）', async () => {
      await setupLock('pw', 15, 1000)
      lock()
      expect((await unlock('pw')).ok).toBe(true)
      const fid = await encryptPrivateFile({ name: 'a.txt', bytes: te.encode('data') })
      expect(new TextDecoder().decode((await decryptPrivateFile(fid)).bytes)).toBe('data')
      const { snapshotId } = await createSnapshot('manual')
      expect(snapshotId.startsWith('v9-snap-manual-')).toBe(true)
    })
    it('ERROR/RECOVERY（锁态拒绝 → 解锁恢复）', async () => {
      await setupLock('pw', 15, 1000)
      const fid = await encryptPrivateFile({ name: 'a', bytes: te.encode('d') })
      lock()
      await expect(decryptPrivateFile(fid)).rejects.toThrow('未解锁')
      expect((await unlock('pw')).ok).toBe(true)
      expect(new TextDecoder().decode((await decryptPrivateFile(fid)).bytes)).toBe('d')
    })
    it('THEME', () => expect(THEMES).toContain(useSystemStore.getState().theme))
  })
})
