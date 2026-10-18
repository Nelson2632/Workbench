// ============================================================
// V9 EventBus 测试（V9-C-002 §2）：V9 事件发布/订阅、隔离、subscribeAll
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { eventBus } from './eventBus'

describe('V9 EventBus', () => {
  beforeEach(() => eventBus.clear())

  it('V9 新事件可订阅并收到窄化载荷', () => {
    let got: { diaryId: number } | null = null
    eventBus.subscribe('diary.created', (e) => {
      got = { diaryId: e.diaryId }
    })
    eventBus.publish({ type: 'diary.created', diaryId: 42 })
    expect(got).toEqual({ diaryId: 42 })
  })

  it('PLAY / SYSTEM 事件可用', () => {
    let ep = 0
    let snap = ''
    eventBus.subscribe('anime.episodeWatched', (e) => {
      ep = e.episode
    })
    eventBus.subscribe('backup.created', (e) => {
      snap = e.snapshotId
    })
    eventBus.publish({ type: 'anime.episodeWatched', animeId: 1, episode: 7 })
    eventBus.publish({ type: 'backup.created', snapshotId: 'snap-1' })
    expect(ep).toBe(7)
    expect(snap).toBe('snap-1')
  })

  it('subscribeAll 收到全部事件，unsubscribe 后不再收到', () => {
    const seen: string[] = []
    const off = eventBus.subscribeAll((e) => seen.push(e.type))
    eventBus.publish({ type: 'task.created', taskId: 't1' })
    eventBus.publish({ type: 'music.logged', musicId: 9 })
    expect(seen).toEqual(['task.created', 'music.logged'])
    off()
    eventBus.publish({ type: 'game.recorded', recordId: 5, gameId: 1 })
    expect(seen).toHaveLength(2)
  })

  it('单个 handler 异常不阻断其余 handler 与 subscribeAll', () => {
    const seen: string[] = []
    eventBus.subscribe('diary.created', () => {
      throw new Error('boom')
    })
    eventBus.subscribe('diary.created', (e) => seen.push(`sub:${e.diaryId}`))
    eventBus.subscribeAll((e) => seen.push(`all:${e.type}`))
    eventBus.publish({ type: 'diary.created', diaryId: 7 })
    expect(seen).toContain('sub:7')
    expect(seen).toContain('all:diary.created')
  })

  it('V8 既有事件兼容（task.completed 载荷不变）', () => {
    let completedAt = ''
    eventBus.subscribe('task.completed', (e) => {
      completedAt = e.completedAt
    })
    eventBus.publish({ type: 'task.completed', taskId: 't9', completedAt: '2026-08-30T21:30:00.000Z' })
    expect(completedAt).toBe('2026-08-30T21:30:00.000Z')
  })
})
