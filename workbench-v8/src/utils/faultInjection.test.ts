// ============================================================
// V9 Fault Injection 测试（R1.7 / Q1.5）
// production disabled / test_mode enabled / 注入故障在 Hook 点生效
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../db/database'
import { faultInjection, _resetFaultInjectionForTests, FAULT_HOOKS } from './faultInjection'
import { runCommand, _resetMutationLaneForTests } from '../db/mutationLane'

describe('Fault Injection', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    _resetFaultInjectionForTests()
    _resetMutationLaneForTests()
  })

  afterEach(() => {
    _resetFaultInjectionForTests()
  })

  it('8 个 Hook 全部注册在案（R1.7 完整集合）', () => {
    expect(FAULT_HOOKS).toEqual([
      'before_domain_commit',
      'after_journal_write',
      'after_domain_commit',
      'mid_projection',
      'mid_backup_write',
      'mid_migration_transform',
      'mid_import',
      'mid_export',
    ])
  })

  it('production disabled：fire 为空操作，注入故障不触发', async () => {
    let fired = false
    faultInjection.inject('before_domain_commit', () => {
      fired = true
    })
    await faultInjection.fire('before_domain_commit')
    expect(fired).toBe(false)
  })

  it('test_mode enabled：注入故障在 before_domain_commit 先于 domain 写入触发', async () => {
    faultInjection.enable()
    const order: string[] = []
    faultInjection.inject('before_domain_commit', () => {
      order.push('fault')
    })
    await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        order.push('mutate')
        await db.tasks.add({ id: 't1' } as never)
      },
    })
    expect(order).toEqual(['fault', 'mutate'])
  })

  it('注入 throw → mutation 失败且 domain 未写入（崩溃一致性前置）', async () => {
    faultInjection.enable()
    faultInjection.inject('before_domain_commit', () => {
      throw new Error('boom')
    })
    await expect(
      runCommand({
        commandType: 'task.create',
        commandId: 't1',
        tables: ['tasks'],
        mutate: async () => {
          await db.tasks.add({ id: 't1' } as never)
        },
      }),
    ).rejects.toThrow('boom')
    expect(await db.tasks.count()).toBe(0)
  })

  it('after_domain_commit 在事务提交后触发', async () => {
    faultInjection.enable()
    const order: string[] = []
    faultInjection.inject('after_domain_commit', () => {
      order.push('after-commit')
    })
    await runCommand({
      commandType: 'task.create',
      commandId: 't1',
      tables: ['tasks'],
      mutate: async () => {
        order.push('mutate')
        await db.tasks.add({ id: 't1' } as never)
      },
    })
    expect(order).toEqual(['mutate', 'after-commit'])
  })

  it('after_journal_write 在事务内（mutate 之后、after_domain_commit 之前）触发', async () => {
    faultInjection.enable()
    const order: string[] = []
    faultInjection.inject('after_journal_write', () => {
      order.push('after-journal')
    })
    faultInjection.inject('after_domain_commit', () => {
      order.push('after-commit')
    })
    await runCommand({
      commandType: 'diary.create',
      commandId: 'd1',
      tables: ['diaries'],
      mutate: async () => {
        order.push('mutate')
        await db.diaries.add({ date: '2026-09-01', content: 'x' } as never)
      },
      events: () => [{ type: 'diary.created', diaryId: 1 }],
    })
    expect(order).toEqual(['mutate', 'after-journal', 'after-commit'])
  })
})
