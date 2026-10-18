import { useEffect, useId, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useStudyStore } from '@/stores/studyStore'
import type { Task, TaskPriority } from '@/types'
import styles from './TaskDetailModal.module.css'

/**
 * 计划详情弹窗（查看 / 编辑）
 * - 单击计划 → 查看详情（只读）
 * - 右键 / 编辑按钮 → 进入编辑
 * 字段：标题、优先级、描述、计划日期、截止日期、学科、预估时间
 */
interface TaskDetailModalProps {
  task: Task | null
  mode: 'view' | 'edit'
  onClose: () => void
  onSave: (updates: Partial<Task>) => void
  onStartEdit: () => void
}

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  P0: 'P0 · 最高',
  P1: 'P1 · 重要',
  P2: 'P2 · 普通',
}

/** deadline 可能是 datetime-local 串，查看时只取日期部分 */
function displayDate(v?: string): string {
  if (!v) return '—'
  return v.includes('T') ? v.slice(0, 10) : v
}

export default function TaskDetailModal({
  task,
  mode,
  onClose,
  onSave,
  onStartEdit,
}: TaskDetailModalProps) {
  const subjects = useStudyStore((s) => s.subjects)
  const loadSubjects = useStudyStore((s) => s.loadSubjects)
  const datalistId = useId()

  // 学科建议下拉需要 subjects；确保已加载（首次打开时惰性加载）
  useEffect(() => {
    if (subjects.length === 0) void loadSubjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [subject, setSubject] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('P2')

  // 打开新任务或切换查看/编辑时，同步表单
  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setNote(task.note || '')
    setDueDate(task.dueDate || '')
    setDeadline(displayDate(task.deadline) === '—' ? '' : displayDate(task.deadline))
    setSubject(task.subject || '')
    setEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '')
    setPriority(task.priority)
  }, [task])

  if (!task) {
    return <Modal isOpen={false} onClose={onClose} title="计划详情">{null}</Modal>
  }

  const handleSave = () => {
    const updates: Partial<Task> = {
      title: title.trim() || task.title,
      note: note.trim(),
      dueDate,
      priority,
    }
    if (deadline) updates.deadline = deadline
    else updates.deadline = undefined
    if (subject.trim()) updates.subject = subject.trim()
    else updates.subject = undefined
    const minutes = Number(estimatedMinutes)
    updates.estimatedMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : undefined
    onSave(updates)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={mode === 'edit' ? '编辑计划' : '计划详情'}
      size="md"
      ariaLabel="计划详情"
    >
      {mode === 'view' ? (
        <div className={styles.body}>
          <div className={styles.titleRow}>
            <span className={styles.title}>{task.title}</span>
            <Badge variant={PRIORITY_VARIANT[task.priority] || 'default'}>
              {task.priority}
            </Badge>
          </div>

          <dl className={styles.detailList}>
            <div className={styles.detailItem}>
              <dt>描述</dt>
              <dd className={styles.detailText}>{task.note || '—'}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>计划日期</dt>
              <dd>{task.dueDate || '—'}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>截止日期</dt>
              <dd>{displayDate(task.deadline)}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>学科</dt>
              <dd>{task.subject || '—'}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>预估时间</dt>
              <dd>{task.estimatedMinutes ? `${task.estimatedMinutes} 分钟` : '—'}</dd>
            </div>
          </dl>

          <div className={styles.footer}>
            <Button variant="quiet" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onStartEdit}>编辑</Button>
          </div>
        </div>
      ) : (
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>标题</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>描述</label>
            <textarea
              className={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="补充说明（可选）"
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>计划日期</label>
              <input
                className={styles.input}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>截止日期（可选）</label>
              <input
                className={styles.input}
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>学科</label>
              <input
                className={styles.input}
                list={datalistId}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="如：数学"
              />
              <datalist id={datalistId}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>预估时间（分钟）</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="预估投入"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>优先级</label>
            <select
              className={styles.input}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="P0">{PRIORITY_LABEL.P0}</option>
              <option value="P1">{PRIORITY_LABEL.P1}</option>
              <option value="P2">{PRIORITY_LABEL.P2}</option>
            </select>
          </div>

          <div className={styles.footer}>
            <Button variant="quiet" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              保存
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
