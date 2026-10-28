import { isActiveTask } from '@/domain/planning/taskLifecycle'
import { useEffect, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useTaskStore } from '@/stores/taskStore'
import { sortTasks } from '@/domain/planning/taskScheduler'
import { formatDate } from '@/utils/helpers'
import styles from './FuturePage.module.css'

export default function FuturePage() {
  const { tasks, loadTasks, toggleDone } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const futureTasks = useMemo(() => {
    const today = formatDate(new Date())
    return sortTasks(tasks.filter((t) => !t.done && isActiveTask(t) && t.dueDate && t.dueDate > today))
  }, [tasks])

  return (
    <div className={styles.page}>
      <PageHeader title="未来" description="已安排但尚未到期的任务" />

      {futureTasks.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="暂无未来任务"
          description="在收件箱或今日计划中为任务指定未来日期"
        />
      ) : (
        <div className={styles.list}>
          {futureTasks.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskItem} theme-interactive`}
              data-v9-done={task.done ? 'true' : 'false'}
            >
              <button
                className={styles.checkbox}
                onClick={() => toggleDone(task.id)}
                aria-label="标记完成"
                title="标记完成"
                data-v9-done-glow={task.done ? 'true' : 'false'}
                style={{ position: 'relative' }}
              />
              <div className={styles.taskBody}>
                <span className={styles.taskTitle} data-v9-done-title="true">{task.title}</span>
                <span className={styles.taskDate}>{task.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
