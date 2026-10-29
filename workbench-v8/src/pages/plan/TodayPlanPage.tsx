import { useSearchParams } from 'react-router-dom'
import TaskRecovery from '@/components/plan/TaskRecovery'
import { isActiveTask } from '@/domain/planning/taskLifecycle'
import { useEffect, useState, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { useTaskStore } from '@/stores/taskStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import TaskDetailModal from '@/components/plan/TaskDetailModal'
import { formatDate } from '@/utils/helpers'
import type { Task, TaskPriority } from '@/types'
import styles from './PlanPage.module.css'

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 }
const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'P0', label: 'P0' },
  { key: 'P1', label: 'P1' },
  { key: 'P2', label: 'P2' },
]

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const pa = PRIORITY_ORDER[a.priority] ?? 99
    const pb = PRIORITY_ORDER[b.priority] ?? 99
    if (pa !== pb) return pa - pb
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export default function TodayPlanPage() {
  const { tasks, loading, loadTasks, addTask, updateTask, deleteTask, toggleDone, togglePin } = useTaskStore()

  const [inputValue, setInputValue] = useState('')
  const [params] = useSearchParams()
  const taskId = params.get('task')
  const [sourceMissing, setSourceMissing] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  // 详情弹窗状态：detailTask 非空即打开；detailMode 决定查看/编辑
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view')

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (!taskId || loading) return
    const task = tasks.find(t => t.id === taskId)
    setDetailTask(task ?? null)
    setSourceMissing(!task)
  }, [taskId, tasks, loading])

  const today = formatDate(new Date())

  // Active tasks (not done, today)
  const activeTasks = useMemo(() => {
    const raw = tasks.filter((t) => t.dueDate === today && !t.done && isActiveTask(t))
    const filtered = filter === 'all' ? raw : raw.filter((t) => t.priority === filter)
    return sortTasks(filtered)
  }, [tasks, today, filter])

  // Completed tasks (done, today)
  const completedTasks = useMemo(() => {
    const raw = tasks.filter((t) => t.dueDate === today && t.done)
    const filtered = filter === 'all' ? raw : raw.filter((t) => t.priority === filter)
    return sortTasks(filtered)
  }, [tasks, today, filter])

  const hasAnyTasks = tasks.some((t) => t.dueDate === today)

  const handleQuickAdd = () => {
    const title = inputValue.trim()
    if (!title) return
    addTask({ title, dueDate: today })
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuickAdd()
    }
  }

  // ---- 详情弹窗 ----
  const openView = (task: Task) => {
    setDetailTask(task)
    setDetailMode('view')
  }

  const openEdit = (task: Task) => {
    setDetailTask(task)
    setDetailMode('edit')
  }

  const closeDetail = () => {
    setDetailTask(null)
    setDetailMode('view')
  }

  const handleSaveDetail = async (updates: Partial<Task>) => {
    if (!detailTask) return
    await updateTask(detailTask.id, updates)
    setDetailTask(null)
    setDetailMode('view')
  }

  // 任务优先级循环切换（V8 Task Priority，P0→P1→P2；RF-06）
  const cyclePriority = (task: Task) => {
    const next: TaskPriority = task.priority === 'P0' ? 'P1' : task.priority === 'P1' ? 'P2' : 'P0'
    updateTask(task.id, { priority: next })
  }

  return (
    <div>
      <PageHeader
        title="今日计划"
        description="管理今日的待办任务与优先级"
      />

      <div className={styles.quickAdd}>
        <Input
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加今日任务，按 Enter 添加..."
          aria-label="新增任务"
        />
        <Button variant="primary" size="sm" onClick={handleQuickAdd} disabled={!inputValue.trim()}>
          添加
        </Button>
      </div>

      <div className={styles.filters}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : !hasAnyTasks ? (
        <EmptyState
          icon="📋"
          title="今天没有计划任务"
          description="添加任务开始规划今天吧"
        />
      ) : (
        <>
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="当前筛选条件下没有任务"
              description="试试切换筛选条件"
            />
          ) : (
            <>
              {activeTasks.length > 0 && (
                <div className={styles.taskList}>
                  {activeTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleDone(task.id)}
                      onOpen={() => openView(task)}
                      onEdit={() => openEdit(task)}
                      onCyclePriority={() => cyclePriority(task)}
                      onPin={() => togglePin(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>
                    已完成 ({completedTasks.length})
                  </div>
                  <div className={styles.taskList}>
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={() => toggleDone(task.id)}
                        onOpen={() => openView(task)}
                        onEdit={() => openEdit(task)}
                        onCyclePriority={() => cyclePriority(task)}
                        onPin={() => togglePin(task.id)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {sourceMissing && <p role="status">源任务已移除或无法找到。</p>}
      <TaskRecovery />

      <TaskDetailModal
        task={detailTask}
        mode={detailMode}
        onClose={closeDetail}
        onSave={handleSaveDetail}
        onStartEdit={() => setDetailMode('edit')}
      />
    </div>
  )
}

// ---- Task Row ----

interface TaskRowProps {
  task: Task
  onToggle: () => void
  onOpen: () => void
  onEdit: () => void
  onCyclePriority: () => void
  onPin: () => void
  onDelete: () => void
}

function TaskRow({
  task,
  onToggle,
  onOpen,
  onEdit,
  onCyclePriority,
  onPin,
  onDelete,
}: TaskRowProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onEdit()
  }

  return (
    <div
      className={`${styles.taskItem} theme-interactive ${task.done ? styles.taskItemCompleted : ''}`}
      data-v9-done={task.done ? 'true' : 'false'}
      onContextMenu={handleContextMenu}
      title="单击查看详情，右键编辑"
    >
      <button
        className={`${styles.checkbox} ${task.done ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label={task.done ? '标记为未完成' : '标记为已完成'}
        data-v9-done-glow={task.done ? 'true' : 'false'}
        style={{ position: 'relative' }}
      >
        <span className={styles.checkmark} />
      </button>

      <span
        className={`${styles.taskTitle} ${task.done ? styles.taskTitleDone : ''}`}
        onClick={onOpen}
        data-v9-done-title="true"
      >
        {task.title}
      </span>

      <button
        type="button"
        className={styles.priorityCycle}
        onClick={onCyclePriority}
        title={`切换优先级（当前 ${task.priority}）`}
        aria-label={`任务优先级 ${task.priority}，点击切换`}
      >
        <Badge variant={PRIORITY_VARIANT[task.priority] || 'default'}>
          {task.priority}
        </Badge>
      </button>

      <div className={styles.taskActions}>
        <button
          className={`${styles.actionBtn} ${styles.pinBtn} ${task.pinned ? styles.pinBtnActive : ''}`}
          onClick={onPin}
          title={task.pinned ? '取消置顶' : '置顶'}
        >
          📌
        </button>
        <button
          className={styles.actionBtn}
          onClick={onEdit}
          title="编辑"
        >
          ✏️
        </button>
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={onDelete}
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
