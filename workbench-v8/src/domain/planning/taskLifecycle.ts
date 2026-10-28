import type { Task } from '@/types'

export const isActiveTask = (task: Task) => !task.disposition || task.disposition === 'active'
