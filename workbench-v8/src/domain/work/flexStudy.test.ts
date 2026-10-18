// ============================================================
// V9 Flex Study 核心测试（V9-C-004）
// 确定性排序 / 三层不可违反 / energy 规则 / 原子 Fallback
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  rankPlan,
  manualOrder,
  buildAdaptivePlan,
  planToday,
  getPlanningMode,
  setPlanningMode,
  PERF_MAX_ITEMS,
  type PlanItem,
} from './flexStudy'

let seq = 0
function item(over: Partial<PlanItem>): PlanItem {
  seq++
  return {
    id: seq,
    taskId: `t${seq}`,
    priority: 'should',
    flexibility: 'flexible',
    estimatedMinutes: 30,
    sortOrder: null,
    ...over,
  }
}

describe('Flex Study 排序（V9-C-004 §4.2，确定性）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    seq = 0
  })

  it('层级 must → should → could 恒序', () => {
    const queue = rankPlan([
      item({ taskId: 'c1', priority: 'could' }),
      item({ taskId: 's1', priority: 'should' }),
      item({ taskId: 'm1', priority: 'must' }),
    ])
    expect(queue.map((i) => i.priority)).toEqual(['must', 'should', 'could'])
  })

  it('层内：sortOrder（有排位者先）→ deadline 升序（空值最后）→ estimatedMinutes → taskId', () => {
    const queue = rankPlan([
      item({ taskId: 'b', priority: 'must', estimatedMinutes: 10, deadline: '2026-08-31' }),
      item({ taskId: 'a', priority: 'must', estimatedMinutes: 30, deadline: '2026-08-30' }),
      item({ taskId: 'c', priority: 'must', estimatedMinutes: 20, deadline: '2026-08-30' }),
      item({ taskId: 'd', priority: 'must', estimatedMinutes: 40, deadline: '' }),
      item({ taskId: 'e', priority: 'must', estimatedMinutes: 40, deadline: '', sortOrder: 1 }),
      item({ taskId: 'f', priority: 'must', estimatedMinutes: 40, deadline: '', sortOrder: 1 }),
    ])
    // 有 sortOrder 的先（e,f 按 taskId）→ deadline asc（同日 estimated asc）→ 空 deadline 最后
    expect(queue.map((i) => i.taskId)).toEqual(['e', 'f', 'c', 'a', 'b', 'd'])
  })

  it('同输入同输出（幂等）', () => {
    const items = [item({ priority: 'must' }), item({ priority: 'could' })]
    const a = rankPlan(items).map((i) => i.id)
    const b = rankPlan(items).map((i) => i.id)
    expect(a).toEqual(b)
  })
})

describe('Adaptive 建议（V9-C-004 §4.2/§4.4）', () => {
  it('低能量（≤2）：COULD 全部建议推迟', () => {
    const items = [
      item({ taskId: 'm', priority: 'must', estimatedMinutes: 30 }),
      item({ taskId: 'c1', priority: 'could', estimatedMinutes: 20 }),
      item({ taskId: 'c2', priority: 'could', estimatedMinutes: 10 }),
    ]
    const out = buildAdaptivePlan(300, 2, items)
    expect(out.suggestedDeferrals.sort()).toEqual([items[1].id, items[2].id].sort())
  })

  it('时间溢出：先推迟 COULD，再建议降级 flexible SHOULD；MUST 永不降级', () => {
    const items = [
      item({ taskId: 'm1', priority: 'must', estimatedMinutes: 60 }),
      item({ taskId: 's1', priority: 'should', estimatedMinutes: 60 }),
      item({ taskId: 's2', priority: 'should', flexibility: 'fixed', estimatedMinutes: 60 }),
      item({ taskId: 'c1', priority: 'could', estimatedMinutes: 60 }),
    ]
    const out = buildAdaptivePlan(60, 3, items)
    expect(out.suggestedDeferrals).toContain(items[3].id)
    expect(out.suggestedDowngrades).toContain(items[1].id) // flexible SHOULD
    expect(out.suggestedDowngrades).not.toContain(items[2].id) // fixed 不降级
    // MUST 永不降级
    const mustIds = items.filter((i) => i.priority === 'must').map((i) => i.id)
    expect(out.suggestedDowngrades.some((id) => mustIds.includes(id))).toBe(false)
  })

  it('高能量（≥4）：无建议', () => {
    const items = [item({ priority: 'could' })]
    const out = buildAdaptivePlan(120, 4, items)
    expect(out.suggestedDeferrals).toHaveLength(0)
    expect(out.suggestedDowngrades).toHaveLength(0)
  })

  it('非法输入抛错（触发 Fallback 的前提）', () => {
    expect(() => buildAdaptivePlan(60, 9, [item({})])).toThrow()
    expect(() => buildAdaptivePlan(60, 3, [item({ estimatedMinutes: NaN })])).toThrow()
    expect(() => buildAdaptivePlan(60, 3, [item({ priority: 'urgent' as never })])).toThrow()
  })
})

describe('Manual 回退与原子 Fallback（V9-C-004 §5/§6）', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    eventBus.clear()
    seq = 0
    await db.settings.put({ key: 'planningMode', value: 'adaptive' })
  })

  it('manual 排序 = V8 原排序（pinned → dueDate → P0→P2 → createdAt）', () => {
    const items = [
      item({ taskId: 't1', pinned: false, deadline: '2026-09-01', taskPriority: 'P2', taskCreatedAt: '2026-08-01T00:00:00.000Z' }),
      item({ taskId: 't2', pinned: true, deadline: '', taskPriority: 'P2', taskCreatedAt: '2026-08-01T00:00:00.000Z' }),
      item({ taskId: 't3', pinned: false, deadline: '2026-08-31', taskPriority: 'P0', taskCreatedAt: '2026-08-01T00:00:00.000Z' }),
      item({ taskId: 't4', pinned: false, deadline: '2026-08-31', taskPriority: 'P1', taskCreatedAt: '2026-08-01T00:00:00.000Z' }),
    ]
    const queue = manualOrder(items)
    expect(queue.map((i) => i.taskId)).toEqual(['t2', 't3', 't4', 't1'])
  })

  it('algorithm 异常 → planningMode 持久 manual + 事件 + 立即手动排序（不抛）', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => {
      if (e.type === 'flexStudy.fallback') seen.push(e.type)
    })
    const items = [item({ taskId: 'm', priority: 'must' }), item({ taskId: 'c', priority: 'could' })]
    const out = await planToday(60, 99, items) // energy 非法 → 异常 → fallback
    expect(out.planningMode).toBe('manual')
    expect(await getPlanningMode()).toBe('manual')
    expect(seen).toContain('flexStudy.fallback')
    expect(out.orderedQueue.map((i) => i.taskId)).toEqual(manualOrder(items).map((i) => i.taskId))
  })

  it('性能护栏：超项数触发 fallback', async () => {
    const many: PlanItem[] = []
    for (let i = 0; i < PERF_MAX_ITEMS + 1; i++) {
      seq++
      many.push({ id: seq, taskId: `x${seq}`, priority: 'could', flexibility: 'flexible', estimatedMinutes: 10, sortOrder: null })
    }
    const out = await planToday(1000, 3, many)
    expect(out.planningMode).toBe('manual')
    expect(await getPlanningMode()).toBe('manual')
  })

  it('用户切换 manual 后 planToday 直接走 V8 排序', async () => {
    await setPlanningMode('manual')
    const items = [item({ taskId: 'c', priority: 'could', pinned: false }), item({ taskId: 'm', priority: 'must', pinned: true })]
    const out = await planToday(100, 3, items)
    expect(out.planningMode).toBe('manual')
    expect(out.orderedQueue.map((i) => i.taskId)).toEqual(['m', 'c']) // pinned 优先（V8 顺序）
  })
})
