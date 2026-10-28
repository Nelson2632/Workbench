// ============================================================
// V9 Mutation Lane 测试（R1.1 / DP1.5 v1.7）
// FIFO 串行 / commandId 幂等去重 / 原子提交
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from './database'
import { runCommand, commandAlreadyProcessed, _resetMutationLaneForTests } from './mutationLane'
import { eventBus } from '@/domain/events/eventBus'
import type { AppEvent } from '@/domain/events/eventBus'
import { faultInjection, _resetFaultInjectionForTests } from '@/utils/faultInjection'

describe('Mutation Lane', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    _resetMutationLaneForTests()
    _resetFaultInjectionForTests()
    eventBus.clear()
  })

  afterEach(() => {
    _resetFaultInjectionForTests()
    eventBus.clear()
  })

  it('首次执行：Domain 写入 + commandId 记录原子落库', async () => {
    const { result, deduped } = await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add({ id: 't1', title: 'x' } as never)
      },
    })
    expect(deduped).toBe(false)
    expect(result).toBeUndefined()
    expect(await db.tasks.count()).toBe(1)
    expect(await commandAlreadyProcessed('task.create', 't1')).toBe(true)
  })

  it('重复 commandId → no-op（不重复写入、不重复回调）', async () => {
    let afterCount = 0
    const first = await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add({ id: 't1', title: 'x' } as never)
      },
      afterCommit: () => {
        afterCount++
      },
    })
    const second = await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add({ id: 't1-dup', title: 'dup' } as never)
      },
      afterCommit: () => {
        afterCount++
      },
    })
    expect(first.deduped).toBe(false)
    expect(second.deduped).toBe(true)
    expect(second.result).toBeNull()
    expect(await db.tasks.count()).toBe(1) // 第二次未写入
    expect(afterCount).toBe(1) // 第二次未回调
  })

  it('不同 commandId 各自独立（同 commandType 不同 commandId 不冲突）', async () => {
    await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add({ id: 't1' } as never)
      },
    })
    await runCommand({
      commandType: 'task.create',
      commandId: 't2',
      tables: ['tasks'],
      mutate: async () => {
        await db.tasks.add({ id: 't2' } as never)
      },
    })
    expect(await db.tasks.count()).toBe(2)
  })

  it('FIFO：并发提交按入队顺序串行执行', async () => {
    const order: number[] = []
    const jobs = [1, 2, 3].map((n) =>
      runCommand({
        commandType: 'task.create',
        commandId: `seq-${n}`,
        tables: ['tasks'],
        mutate: async () => {
          order.push(n)
          await db.tasks.add({ id: `seq-${n}` } as never)
        },
      }),
    )
    await Promise.all(jobs)
    expect(order).toEqual([1, 2, 3]) // 并发提交仍按入队顺序串行执行
    expect(await db.tasks.count()).toBe(3)
  })

  // ---- R6-06 原子 Journal ----

  it('events 声明时：domain + commandId + journal 同事务原子落库', async () => {
    await runCommand({
      commandType: 'diary.create',
      commandId: 'd1',
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
      },
      events: () => [{ type: 'diary.created', diaryId: 1 }],
    })
    expect(await db.diaries.count()).toBe(1)
    expect(await commandAlreadyProcessed('diary.create', 'd1')).toBe(true)
    const journal = await db.operationJournal.toArray()
    expect(journal).toHaveLength(1)
    expect(journal[0].eventType).toBe('diary.created')
    expect(journal[0].payload).toEqual({ diaryId: 1 })
    expect(journal[0].payload).not.toHaveProperty('type')
  })

  it('after_journal_write 注入 throw → domain + commandId + journal 全回滚', async () => {
    faultInjection.enable()
    faultInjection.inject('after_journal_write', () => {
      throw new Error('journal boom')
    })
    await expect(
      runCommand({
        commandType: 'diary.create',
        commandId: 'd1',
        tables: ['diaries'],
        mutate: async () => {
          await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
        },
        events: () => [{ type: 'diary.created', diaryId: 1 }],
      }),
    ).rejects.toThrow('journal boom')
    expect(await db.diaries.count()).toBe(0)
    expect(await db.operationJournal.count()).toBe(0)
    expect(await commandAlreadyProcessed('diary.create', 'd1')).toBe(false)
  })

  it('去重 commandId → events 不重复写 journal、不重复发布', async () => {
    const published: string[] = []
    eventBus.subscribeAll((e) => published.push(e.type))
    const opts = () => ({
      commandType: 'diary.create',
      commandId: 'd1',
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
      },
      events: (): AppEvent[] => [{ type: 'diary.created', diaryId: 1 }],
    })
    await runCommand(opts())
    await runCommand(opts())
    expect(await db.operationJournal.count()).toBe(1)
    expect(published).toEqual(['diary.created'])
  })

  it('MUST-02：post-commit 订阅者抛错 → 命令仍 resolve success（不 reject）', async () => {
    eventBus.subscribe('diary.created', () => {
      throw new Error('subscriber boom')
    })
    const res = await runCommand({
      commandType: 'diary.create',
      commandId: 'd1',
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
      },
      events: () => [{ type: 'diary.created', diaryId: 1 }],
    })
    expect(res.deduped).toBe(false)
    expect(await db.diaries.count()).toBe(1) // DB 已提交
    expect(await commandAlreadyProcessed('diary.create', 'd1')).toBe(true)
  })

  it('MUST-02：afterCommit 抛错 → 命令仍 resolve success', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((event) => seen.push(event.type))
    const res = await runCommand({
      commandType: 'diary.create',
      commandId: 'd1',
      tables: ['diaries'],
      mutate: async () => {
        await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
      },
      events: () => [{ type: 'diary.created', diaryId: 1 }],
      afterCommit: () => {
        throw new Error('ui boom')
      },
    })
    expect(res.deduped).toBe(false)
    expect(await db.diaries.count()).toBe(1)
    expect(seen).toEqual(['diary.created'])
  })
})
