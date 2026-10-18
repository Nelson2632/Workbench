// ============================================================
// V9 WORK — Flex Study 核心（V9-C-004 冻结）
// MUST/SHOULD/COULD 三层、确定性排序、manual fallback 硬安全阀
// 无 LLM、无网络；异常原子降级：planningMode=manual + flexStudy.fallback
// ============================================================

import { db } from '@/db/database'
import { runCommand } from '@/db/mutationLane'
import { uid } from '@/utils/helpers'
import type { AppEvent } from '@/domain/events/eventBus'
import type { FlexState, Flexibility, PlanningMode, Priority } from '@/types'

export const PERF_MAX_ITEMS = 200
export const PERF_MAX_MS = 50
export const PLANNING_MODE_KEY = 'planningMode'

/** 参与排程的计划项（studyPlanItems + 任务侧快照辅助字段，辅助字段不持久化） */
export interface PlanItem {
  id: number
  taskId: string
  priority: Priority
  flexibility: Flexibility
  estimatedMinutes: number
  sortOrder: number | null
  planDate?: string
  state?: FlexState
  actualMinutes?: number | null
  note?: string
  title?: string
  deadline?: string // task.dueDate
  pinned?: boolean
  taskPriority?: 'P0' | 'P1' | 'P2'
  taskCreatedAt?: string
}

export interface FlexOutput {
  orderedQueue: PlanItem[]
  suggestedDowngrades: number[] // 建议 SHOULD→COULD（需确认）
  suggestedDeferrals: number[] // 建议推迟的 COULD（需确认）
  timeSummary: { estimated: number; available: number; overflow: number }
}

const TIER: Record<Priority, number> = { must: 0, should: 1, could: 2 }

function assertValid(items: PlanItem[]): void {
  for (const it of items) {
    if (!['must', 'should', 'could'].includes(it.priority)) {
      throw new Error(`invalid priority: ${it.priority}`)
    }
    if (!Number.isFinite(it.estimatedMinutes) || it.estimatedMinutes < 0) {
      throw new Error(`invalid estimatedMinutes: ${it.estimatedMinutes}`)
    }
  }
}

/** 确定性排序（V9-C-004 §4.2）：
 *  层级 must→should→could → sortOrder → deadline 升序（空值最后）
 *  → estimatedMinutes 升序 → taskId 升序（稳定终结键） */
export function rankPlan(items: PlanItem[]): PlanItem[] {
  assertValid(items)
  return [...items].sort((a, b) => {
    const ta = TIER[a.priority]
    const tb = TIER[b.priority]
    if (ta !== tb) return ta - tb
    // 用户手动排过的项（sortOrder 非空）整体先于未排过的项
    const soa = a.sortOrder != null ? 0 : 1
    const sob = b.sortOrder != null ? 0 : 1
    if (soa !== sob) return soa - sob
    if (a.sortOrder != null && b.sortOrder != null && a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder
    }
    const da = a.deadline || ''
    const db = b.deadline || ''
    if ((da === '') !== (db === '')) return da === '' ? 1 : -1
    if (da !== db) return da < db ? -1 : 1
    if (a.estimatedMinutes !== b.estimatedMinutes) return a.estimatedMinutes - b.estimatedMinutes
    return a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0
  })
}

/** Manual 回退：V8 原任务排序（V9-C-004 §5 冻结顺序） */
export function manualOrder(items: PlanItem[]): PlanItem[] {
  const P_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 }
  return [...items].sort((a, b) => {
    const pa = a.pinned ? 1 : 0
    const pb = b.pinned ? 1 : 0
    if (pa !== pb) return pb - pa // pinned 优先
    const da = a.deadline || ''
    const db = b.deadline || ''
    if ((da === '') !== (db === '')) return da === '' ? 1 : -1
    if (da !== db) return da < db ? -1 : 1
    const pra = P_ORDER[a.taskPriority ?? 'P2']
    const prb = P_ORDER[b.taskPriority ?? 'P2']
    if (pra !== prb) return pra - prb
    const ca = a.taskCreatedAt || ''
    const cb = b.taskCreatedAt || ''
    if (ca !== cb) return ca < cb ? -1 : 1
    return a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0
  })
}

/** Adaptive 排程输出（含建议，全部需用户确认；绝不修改任务内容） */
export function buildAdaptivePlan(
  availableMinutes: number,
  energy: number,
  items: PlanItem[],
): FlexOutput {
  if (!Number.isFinite(availableMinutes) || availableMinutes < 0) {
    throw new Error('invalid availableMinutes')
  }
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
    throw new Error('invalid energy')
  }
  if (items.length > PERF_MAX_ITEMS) {
    throw new Error('perf guard: too many items')
  }

  const queue = rankPlan(items)
  const estimated = queue.reduce((s, it) => s + it.estimatedMinutes, 0)
  const overflow = Math.max(0, estimated - availableMinutes)

  const downgrades: number[] = []
  const deferrals: number[] = []

  if (energy <= 2) {
    // 低能量：COULD 全部建议推迟；每 90 分钟建议休息由 UI 呈现
    for (const it of queue) {
      if (it.priority === 'could') deferrals.push(it.id)
    }
  }

  let remainingOverflow = overflow
  if (remainingOverflow > 0) {
    // 时间不够：先建议推迟 COULD
    for (const it of queue) {
      if (it.priority !== 'could') continue
      if (!deferrals.includes(it.id)) deferrals.push(it.id)
      remainingOverflow = Math.max(0, remainingOverflow - it.estimatedMinutes)
    }
    // 仍不够：建议降级 flexible 的 SHOULD（MUST 永不降级）
    if (remainingOverflow > 0) {
      for (const it of queue) {
        if (remainingOverflow <= 0) break
        if (it.priority !== 'should' || it.flexibility !== 'flexible') continue
        downgrades.push(it.id)
        remainingOverflow = Math.max(0, remainingOverflow - it.estimatedMinutes)
      }
    }
  }

  return {
    orderedQueue: queue,
    suggestedDowngrades: downgrades,
    suggestedDeferrals: deferrals,
    timeSummary: { estimated, available: availableMinutes, overflow },
  }
}

// ---------- planningMode 与 Fallback（硬安全阀） ----------

export async function getPlanningMode(): Promise<PlanningMode> {
  const row = await db.settings.get(PLANNING_MODE_KEY)
  const v = row?.value
  return v === 'manual' ? 'manual' : 'adaptive'
}

export async function setPlanningMode(mode: PlanningMode, reason?: string): Promise<void> {
  // Lane 化：settings 写 + flexStudy.fallback 事件（若 manual）三写原子（R6-06）
  await runCommand({
    commandType: 'studyPlan.setMode',
    commandId: 'cmd_' + uid(),
    tables: ['settings'],
    mutate: async () => {
      await db.settings.put({ key: PLANNING_MODE_KEY, value: mode })
    },
    events: () => {
      const evts: AppEvent[] = []
      if (mode === 'manual') {
        evts.push({ type: 'flexStudy.fallback', reason: reason ?? 'user-toggle' })
      }
      return evts
    },
  })
}

/**
 * 排程入口：adaptive 正常路径；manual 直接回退；任何异常 → 原子降级。
 * 返回的 output.planningMode 表明本次实际使用的模式。
 */
export async function planToday(
  availableMinutes: number,
  energy: number,
  items: PlanItem[],
): Promise<FlexOutput & { planningMode: PlanningMode }> {
  const mode = await getPlanningMode()
  if (mode === 'manual') {
    const queue = manualOrder(items)
    const estimated = queue.reduce((s, it) => s + it.estimatedMinutes, 0)
    return {
      orderedQueue: queue,
      suggestedDowngrades: [],
      suggestedDeferrals: [],
      timeSummary: { estimated, available: availableMinutes, overflow: Math.max(0, estimated - availableMinutes) },
      planningMode: 'manual',
    }
  }

  const started = performance.now()
  try {
    const out = buildAdaptivePlan(availableMinutes, energy, items)
    if (performance.now() - started > PERF_MAX_MS) {
      throw new Error('perf guard exceeded')
    }
    return { ...out, planningMode: 'adaptive' }
  } catch (err) {
    // 原子 Fallback（V9-C-004 §6.2）：持久 manual + 事件 + 立即切换排序，不白屏不空屏
    console.error('[FlexStudy] adaptive failed, falling back to manual:', err)
    await setPlanningMode('manual', err instanceof Error ? err.message : 'unknown')
    const queue = manualOrder(items)
    const estimated = queue.reduce((s, it) => s + it.estimatedMinutes, 0)
    return {
      orderedQueue: queue,
      suggestedDowngrades: [],
      suggestedDeferrals: [],
      timeSummary: { estimated, available: availableMinutes, overflow: Math.max(0, estimated - availableMinutes) },
      planningMode: 'manual',
    }
  }
}

