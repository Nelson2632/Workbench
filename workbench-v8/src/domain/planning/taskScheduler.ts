// ============================================================
// Personal Workbench V8 — Task Scheduler（任务分桶与排序）
// ============================================================

import type { Task } from '@/types'
import { formatDate } from '@/utils/helpers'

/** 任务时间桶（对齐 W-07：收件箱 / 今日 / 未来） */
export type TaskBucket = 'overdue' | 'today' | 'future' | 'inbox' | 'done'

/** 将任务归入时间桶 */
export function bucketTask(task: Task, now: Date = new Date()): TaskBucket {
  if (task.done) return 'done'
  if (!task.dueDate) return 'inbox'
  const today = formatDate(now)
  if (task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  return 'future'
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { P0: 0, P1: 1, P2: 2 }

/** 任务排序：置顶 > 日期 > 优先级 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })
}
