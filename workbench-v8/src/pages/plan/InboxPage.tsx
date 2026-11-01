import { isComposingKey } from '@/utils/composition'
import { useEffect, useState, useMemo, type KeyboardEvent, type ChangeEvent } from 'react'
import { useReliableCapture } from '@/hooks/useReliableCapture'
import PageHeader from '@/components/layout/PageHeader'
import { useInboxStore, convertInboxItemToTask } from '@/stores/inboxStore'
import { useProjectStore } from '@/stores/projectStore'
import { useRecurringStore } from '@/stores/recurringStore'
import { useMaterialStore } from '@/stores/materialStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/helpers'
import type { InboxItem, TaskPriority } from '@/types'
import styles from './InboxPage.module.css'

export default function InboxPage() {
  const { items, loading, loadInbox, addItem, discardItem, deleteItem } = useInboxStore()
  const addProject = useProjectStore((s) => s.addProject)
  const addRecurring = useRecurringStore((s) => s.addRecurring)
  const addMaterial = useMaterialStore((s) => s.addMaterial)

  const capture = useReliableCapture(addItem)
  const { value: inputValue, setValue: setInputValue } = capture

  // 转为计划编辑器：Inbox Item → Task（转换幂等，sourceTaskId 记录产物）
  const [planEditorItemId, setPlanEditorItemId] = useState<number | null>(null)
  const [planTitle, setPlanTitle] = useState('')
  const [planNote, setPlanNote] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [planPriority, setPlanPriority] = useState<TaskPriority>('P2')
  const [planStartTime, setPlanStartTime] = useState('')
  const [planDeadline, setPlanDeadline] = useState('')
  const [planSubject, setPlanSubject] = useState('')
  const [planEstimatedMinutes, setPlanEstimatedMinutes] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => {
    loadInbox()
  }, [loadInbox])

  const inboxItems = useMemo(() => items, [items])

  const handleAdd = () => { void capture.submit() }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isComposingKey(e) && e.key === 'Enter') {
      handleAdd()
    }
  }

  const openPlanEditor = (itemId: number) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setPlanEditorItemId(itemId)
    setPlanTitle(item.title)
    setPlanNote(item.note)
    setPlanDate(formatDate(new Date()))
    setPlanPriority('P2')
    setPlanStartTime('')
    setPlanDeadline('')
    setPlanSubject('')
    setPlanEstimatedMinutes('')
  }

  const closePlanEditor = () => {
    setPlanEditorItemId(null)
    setPlanTitle('')
    setPlanNote('')
    setPlanDate('')
    setPlanPriority('P2')
    setPlanStartTime('')
    setPlanDeadline('')
    setPlanSubject('')
    setPlanEstimatedMinutes('')
  }

  /** 转为计划：Inbox Item → Task（幂等），设置 dueDate + 优先级 + 附加字段 */
  const handleConvertToPlan = async () => {
    if (planEditorItemId != null && planTitle.trim() && planDate) {
      const updates: {
        title: string
        note?: string
        dueDate: string
        priority: string
        startTime?: string
        deadline?: string
        subject?: string
        estimatedMinutes?: number
      } = {
        title: planTitle.trim(),
        note: planNote.trim(),
        dueDate: planDate,
        priority: planPriority,
      }
      if (planStartTime) updates.startTime = planStartTime
      if (planDeadline) updates.deadline = planDeadline
      if (planSubject.trim()) updates.subject = planSubject.trim()
      if (planEstimatedMinutes.trim()) updates.estimatedMinutes = Number(planEstimatedMinutes)
      await convertInboxItemToTask(planEditorItemId, updates)
    }
    closePlanEditor()
  }

  /** 分流：转项目（用标题新建项目，丢弃源 Inbox Item） */
  const handleToProject = async (item: InboxItem) => {
    await addProject(item.title)
    await discardItem(item.id)
  }

  /** 分流：转周期计划（默认每日，丢弃源 Inbox Item） */
  const handleToRecurring = async (item: InboxItem) => {
    await addRecurring({ title: item.title, rule: { type: 'daily' } })
    await discardItem(item.id)
  }

  /** 分流：存为素材（标题+备注入库，丢弃源 Inbox Item） */
  const handleToMaterial = async (item: InboxItem) => {
    await addMaterial({ title: item.title, note: item.note })
    await discardItem(item.id)
  }

  const formatCreatedAt = (iso: string): string => {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${m}月${day}日`
  }

  return (
    <div>
      <PageHeader title="收件箱" description="快速记录想法和待办事项" />

      <div className={styles.inboxInput}>
        <Input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="快速记录想法，按 Enter 添加..."
          aria-label="新增任务"
        />
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={capture.pending || !inputValue.trim()}>
          添加
        </Button>
      </div>

      {capture.error && <p role="alert">{capture.error} <button onClick={handleAdd}>重试保存</button></p>}
      {capture.pending && <p role="status">正在保存…</p>}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>加载中...</div>
      ) : inboxItems.length === 0 ? (
        <EmptyState icon="📥" title="收件箱是空的" description="在这里快速捕获想法，稍后整理" />
      ) : (
        <div className={styles.list}>
          {inboxItems.map((item) => (
            <div key={item.id} className={`${styles.item} theme-interactive`}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                {formatCreatedAt(item.createdAt)}
              </span>
              <div className={styles.itemActions}>
                <button
                  className={styles.convertBtn}
                  onClick={() => openPlanEditor(item.id)}
                  title="转为计划"
                  aria-label={`将「${item.title}」转为计划`}
                >
                  转为计划
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => void handleToProject(item)}
                  title="转项目"
                  aria-label={`将「${item.title}」转为项目`}
                >
                  📁
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => void handleToRecurring(item)}
                  title="转周期"
                  aria-label={`将「${item.title}」转为周期计划`}
                >
                  🔄
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => void handleToMaterial(item)}
                  title="存素材"
                  aria-label={`将「${item.title}」存为素材`}
                >
                  📌
                </button>
                {confirmId === item.id ? (
                  <>
                    <button className={styles.actionBtn} onClick={() => deleteItem(item.id)} title="确认删除">
                      ✓
                    </button>
                    <button className={styles.actionBtn} onClick={() => setConfirmId(null)} title="取消">
                      ✕
                    </button>
                  </>
                ) : (
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => setConfirmId(item.id)}
                    title="删除"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={planEditorItemId !== null}
        onClose={closePlanEditor}
        title="转为计划"
        size="sm"
      >
        <div className={styles.planEditorOverlay}>
          <label htmlFor="plan-title">标题</label>
          <input
            id="plan-title"
            type="text"
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder="任务标题"
            autoFocus
          />
          <label htmlFor="plan-note">描述 / 备注（可选）</label>
          <textarea
            id="plan-note"
            value={planNote}
            onChange={(e) => setPlanNote(e.target.value)}
            placeholder="补充说明"
            rows={3}
          />
          <label htmlFor="plan-date">计划日期</label>
          <input
            id="plan-date"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
          />
          <label htmlFor="plan-priority">优先级</label>
          <select
            id="plan-priority"
            value={planPriority}
            onChange={(e) => setPlanPriority(e.target.value as TaskPriority)}
          >
            <option value="P0">P0 · 最高</option>
            <option value="P1">P1 · 重要</option>
            <option value="P2">P2 · 普通</option>
          </select>
          <label htmlFor="plan-start-time">开始时间（可选）</label>
          <input
            id="plan-start-time"
            type="time"
            value={planStartTime}
            onChange={(e) => setPlanStartTime(e.target.value)}
          />
          <label htmlFor="plan-deadline">Deadline（可选）</label>
          <input
            id="plan-deadline"
            type="datetime-local"
            value={planDeadline}
            onChange={(e) => setPlanDeadline(e.target.value)}
          />
          <label htmlFor="plan-subject">学科（可选）</label>
          <input
            id="plan-subject"
            type="text"
            value={planSubject}
            onChange={(e) => setPlanSubject(e.target.value)}
            placeholder="如：数学"
          />
          <label htmlFor="plan-estimated-minutes">预计分钟（可选）</label>
          <input
            id="plan-estimated-minutes"
            type="number"
            min={1}
            value={planEstimatedMinutes}
            onChange={(e) => setPlanEstimatedMinutes(e.target.value)}
            placeholder="预估投入（分钟）"
          />
          <div className={styles.dateActions}>
            <Button variant="ghost" size="sm" onClick={closePlanEditor}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvertToPlan}
              disabled={!planTitle.trim() || !planDate}
            >
              转为计划
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
