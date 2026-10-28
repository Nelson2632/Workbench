import type { Task } from '@/types'

export function selectTodayNarrative(tasks: Task[], date: string, selectedNowId?: string, clock = '') {
  const eligible = tasks.filter((t) => !t.done && t.dueDate === date)
  const rank = { P0: 0, P1: 1, P2: 2 }
  const ready = (t: Task) => !!t.startTime && t.startTime <= clock && t.priority !== 'P2'
  const plan = [...eligible].sort((a, b) =>
    Number(ready(b)) - Number(ready(a)) || Number(b.pinned) - Number(a.pinned) ||
    rank[a.priority] - rank[b.priority] || (a.deadline || 'z').localeCompare(b.deadline || 'z') ||
    a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  const now = plan.find((t) => t.id === selectedNowId) || plan[0] || null
  const next = plan.filter((t) => t.id !== now?.id).slice(0, 4)
  return { now, next, plan }
}
