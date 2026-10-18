// ============================================================
// Personal Workbench V8 — Recurring Generator（周期规则引擎）
// ============================================================

import type { RecurringTask } from '@/types'
import { formatDate } from '@/utils/helpers'

const DAY_MS = 86_400_000

/** weekly：给定星期几是否命中 */
export function matchesWeekly(rule: RecurringTask['rule'], dayOfWeek: number): boolean {
  return rule.daysOfWeek?.includes(dayOfWeek) ?? false
}

/** monthly：给定日期是否命中（支持 -1 = 月末） */
export function matchesMonthly(rule: RecurringTask['rule'], date: Date): boolean {
  const day = date.getDate()
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const days = rule.daysOfMonth ?? []
  return days.includes(day) || (days.includes(-1) && day === lastDay)
}

/**
 * 判断某周期规则今天是否应生成任务实例。
 * 纯函数，不含 DB / 副作用。
 */
export function shouldGenerateForDate(rt: RecurringTask, now: Date): boolean {
  if (!rt.enabled) return false

  const today = formatDate(now)
  if (rt.lastGeneratedDate === today) return false
  if (rt.startDate && today < rt.startDate) return false
  if (rt.endDate && today > rt.endDate) return false

  switch (rt.rule.type) {
    case 'daily':
      return true
    case 'weekly':
      return matchesWeekly(rt.rule, now.getDay())
    case 'monthly':
      return matchesMonthly(rt.rule, now)
    case 'custom': {
      const interval = rt.rule.intervalDays
      if (!interval) return false
      const base = rt.lastGeneratedDate
        ? new Date(rt.lastGeneratedDate)
        : new Date(rt.startDate)
      const diffDays = Math.floor((now.getTime() - base.getTime()) / DAY_MS)
      return diffDays >= interval
    }
    default:
      return false
  }
}
