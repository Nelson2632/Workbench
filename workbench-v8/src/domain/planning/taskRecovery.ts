import { db } from '@/db/database'
import { runCommand } from '@/db/mutationLane'
import { uid } from '@/utils/helpers'
import type { Task } from '@/types'

export { isActiveTask } from './taskLifecycle'
export type RecoveryAction = 'reschedule' | 'stash' | 'abandon' | 'restore' | 'split'
export interface RecoveryPreview {
  commandId: string
  action: RecoveryAction
  before: Task[]
  after: Task[]
  children: Task[]
}
export interface RecoveryReceipt extends RecoveryPreview { undone?: boolean }
const key = (id: string) => `task-recovery:${id}`
export const RECOVERY_LATEST = 'task-recovery-latest'

export function previewRecovery(tasks: Task[], action: RecoveryAction, options: { date?: string; titles?: string[] } = {}): RecoveryPreview {
  if (!tasks.length || new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('请选择不同的任务')
  if (tasks.some(t => t.done)) throw new Error('已完成任务无需恢复')
  if (action === 'reschedule' && (!options.date || !/^\d{4}-\d{2}-\d{2}$/.test(options.date) || new Date(options.date + 'T12:00:00Z').toISOString().slice(0, 10) !== options.date)) throw new Error('请选择有效日期')
  const titles = (options.titles ?? []).map(t => t.trim()).filter(Boolean)
  if (action === 'split' && (tasks.length !== 1 || titles.length < 2 || titles.length > 20)) throw new Error('拆分一个任务为 2–20 个小步骤')
  const now = new Date().toISOString()
  const before = structuredClone(tasks)
  const after = before.map(task => ({ ...task, updatedAt: now,
    ...(action === 'reschedule' ? { dueDate: options.date! } : {}),
    ...(action === 'stash' || action === 'split' ? { disposition: 'stashed' as const, stashedAt: now } : {}),
    ...(action === 'abandon' ? { disposition: 'abandoned' as const, abandonedAt: now } : {}),
    ...(action === 'restore' ? { disposition: 'active' as const, stashedAt: null, abandonedAt: null } : {}),
  }))
  const children: Task[] = action === 'split' ? titles.map(title => ({ ...before[0], id: uid(), title,
    parentTaskId: before[0].id, disposition: 'active', stashedAt: null, abandonedAt: null,
    completedAt: null, sourceRecurringId: undefined, createdAt: now, updatedAt: now,
  })) : []
  return { commandId: 'cmd_' + uid(), action, before, after, children }
}

async function assertUnchanged(expected: Task[]) {
  for (const snapshot of expected) {
    const current = await db.tasks.get(snapshot.id)
    if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new Error('任务已被修改，请重新预览；不会覆盖后续编辑')
  }
}
export async function getRecoveryReceipt(id: string): Promise<RecoveryReceipt | undefined> {
  const row = await db.settings.get(key(id))
  return row ? JSON.parse(row.value) : undefined
}
export async function applyRecovery(preview: RecoveryPreview): Promise<RecoveryReceipt> {
  await runCommand({ commandType: 'task.recover', commandId: preview.commandId, tables: ['tasks', 'settings'],
    mutate: async () => {
      if (await db.settings.get(key(preview.commandId))) return false
      await assertUnchanged(preview.before)
      await db.tasks.bulkPut(preview.after)
      await db.tasks.bulkAdd(preview.children)
      await db.settings.put({ key: key(preview.commandId), value: JSON.stringify(preview) })
      await db.settings.put({ key: RECOVERY_LATEST, value: preview.commandId })
      return true
    },
    events: changed => changed ? [...preview.after, ...preview.children].map(t => ({ type: 'task.updated' as const, taskId: t.id })) : [],
  })
  const receipt = await getRecoveryReceipt(preview.commandId)
  if (!receipt) throw new Error('调整记录不可用，请刷新后重新预览')
  return receipt
}
export async function undoRecovery(id: string): Promise<void> {
  await runCommand({ commandType: 'task.recover.undo', commandId: id, tables: ['tasks', 'settings'],
    mutate: async () => {
      const receipt = await getRecoveryReceipt(id)
      if (!receipt) throw new Error('找不到调整记录')
      if (receipt.undone) return []
      await assertUnchanged([...receipt.after, ...receipt.children])
      await db.tasks.bulkPut(receipt.before)
      // Undo preserves child history too: split children become abandoned, never deleted.
      await db.tasks.bulkPut(receipt.children.map(t => ({ ...t, disposition: 'abandoned' as const, abandonedAt: new Date().toISOString() })))
      await db.settings.put({ key: key(id), value: JSON.stringify({ ...receipt, undone: true }) })
      return [...receipt.before, ...receipt.children]
    },
    events: tasks => tasks.map(t => ({ type: 'task.updated' as const, taskId: t.id })),
  })
}
