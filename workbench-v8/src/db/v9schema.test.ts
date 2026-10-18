// ============================================================
// V9 Schema 测试（V9-C-001）：version(3) 挂载 21 张新表
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'

const NEW_TABLES = [
  'diaries', 'lifeMoments', 'events', 'friends', 'materials', 'articles',
  'anime', 'games', 'gameRecords', 'music', 'timelineEvents', 'dailyMemory',
  'collectionEntries', 'nightShutdown', 'studyPlanItems', 'privateFileMeta',
  'appLock', 'backupSnapshots', 'operationJournal', 'migrationRuns', 'migrationLedger',
  'scores', 'systemCommandIds', 'inboxItems',
]

const V8_TABLES = [
  'tasks', 'recurringTasks', 'projects', 'memos', 'notes', 'flashcards',
  'flashcardReviews', 'flashcardSchedule', 'subjects', 'mistakes', 'exams',
  'reviewTemplates', 'reviewEntries', 'reading', 'finance', 'countdowns',
  'pomodoroLogs', 'vault', 'settings', 'knowledgeRelations', 'studySessions', 'appEvents',
]

describe('V9 schema（version 3）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('V8 22 张底座表 + V9 21 张新增表全部存在', async () => {
    const names = db.tables.map((t) => t.name)
    for (const t of V8_TABLES) expect(names).toContain(t)
    for (const t of NEW_TABLES) expect(names).toContain(t)
    // Dexie 会保留 v1 遗留的 reviews 表对象（数据已在 v2 upgrade 迁走），
    // 过滤后应为 22 + 24 = 46 张（version(5) scores / version(6) systemCommandIds / version(7) inboxItems）
    const current = names.filter((n) => n !== 'reviews')
    expect(current).toHaveLength(46)
    expect(new Set(current).size).toBe(46)
  })

  it('diaries 自增主键 + tags 多值索引可用', async () => {
    const id = await db.diaries.add({
      date: '2026-08-30',
      type: 'quick',
      mood: 'good',
      weather: 'sunny',
      title: '测试',
      content: '内容',
      photos: [],
      tags: ['学习', '生活'],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)
    expect(typeof id).toBe('number')

    const byTag = await db.diaries.where('tags').equals('学习').toArray()
    expect(byTag).toHaveLength(1)
    expect(byTag[0].title).toBe('测试')

    // date 索引（非唯一：同一天可多篇）
    await db.diaries.add({
      date: '2026-08-30',
      type: 'quick',
      mood: null,
      weather: null,
      title: '第二篇',
      content: '',
      photos: [],
      tags: [],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)
    const byDate = await db.diaries.where('date').equals('2026-08-30').toArray()
    expect(byDate).toHaveLength(2)
  })

  it('timelineEvents eventKey 唯一索引拒绝重复', async () => {
    const row = {
      eventKey: 'diary:1:diary.created:1',
      sourceDomain: 'life',
      sourceType: 'diary',
      sourceId: '1',
      eventType: 'diary.created',
      occurredAt: '2026-08-30T12:00:00.000Z',
      title: '日记',
      summary: '',
      metadata: null,
      createdAt: '2026-08-30T12:00:00.000Z',
    }
    await db.timelineEvents.add(row as never)
    await expect(db.timelineEvents.add(row as never)).rejects.toThrow()
  })

  it('operationJournal 自增 seq 单调递增', async () => {
    const a = await db.operationJournal.add({
      eventType: 'task.created',
      payload: null,
      occurredAt: '2026-08-30T00:00:00.000Z',
    } as never)
    const b = await db.operationJournal.add({
      eventType: 'task.completed',
      payload: null,
      occurredAt: '2026-08-30T00:00:01.000Z',
    } as never)
    expect(typeof a).toBe('number')
    expect(b).toBeGreaterThan(a)
  })

  it('appLock 单行主键 id', async () => {
    await db.appLock.put({
      id: 'main',
      kdfParamsVersion: 1,
      salt: 'AA==',
      iterations: 1000,
      verifier: 'BB==',
      enabled: true,
      autoLockMinutes: 15,
      updatedAt: '2026-08-30T00:00:00.000Z',
    } as never)
    const row = await db.appLock.get('main')
    expect(row?.enabled).toBe(true)
    expect(await db.appLock.count()).toBe(1)
  })
})
