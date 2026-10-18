import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useRecurringStore } from '@/stores/recurringStore'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/helpers'
import type { RecurringTask, RecurringRuleType, TaskPriority } from '@/types'
import styles from './RecurringPage.module.css'

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

const WEEK_DAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
]

const PRIORITY_LABELS: Record<TaskPriority, string> = { P0: 'P0', P1: 'P1', P2: 'P2' }
const PRIORITY_VARIANTS: Record<TaskPriority, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

function describeRule(rt: RecurringTask): string {
  const { rule } = rt
  switch (rule.type) {
    case 'daily':
      return '每天'
    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return '每周' + rule.daysOfWeek.sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join('、')
      }
      return '每周'
    case 'monthly':
      if (rule.daysOfMonth && rule.daysOfMonth.length > 0) {
        const sorted = [...rule.daysOfMonth].sort((a, b) => a - b)
        if (sorted.length === 1 && sorted[0] === 32) return '每月最后一天'
        return '每月' + sorted.join('、') + '日'
      }
      return '每月'
    case 'custom':
      if (rule.intervalDays) return `每隔${rule.intervalDays}天`
      return '自定义'
    default:
      return '未知'
  }
}

function canGenerateToday(rt: RecurringTask): boolean {
  if (!rt.enabled) return false
  const today = formatDate(new Date())
  if (rt.startDate && today < rt.startDate) return false
  if (rt.endDate && today > rt.endDate) return false
  if (rt.lastGeneratedDate === today) return false

  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayOfMonth = now.getDate()

  switch (rt.rule.type) {
    case 'daily':
      return true
    case 'weekly':
      return !!(rt.rule.daysOfWeek && rt.rule.daysOfWeek.includes(dayOfWeek))
    case 'monthly':
      if (rt.rule.daysOfMonth && rt.rule.daysOfMonth.length > 0) {
        return rt.rule.daysOfMonth.includes(dayOfMonth) ||
          (rt.rule.daysOfMonth.includes(32) && isLastDayOfMonth(now))
      }
      return false
    case 'custom':
      if (rt.rule.intervalDays) {
        const last = rt.lastGeneratedDate
          ? new Date(rt.lastGeneratedDate)
          : new Date(rt.startDate)
        const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= rt.rule.intervalDays
      }
      return false
    default:
      return false
  }
}

function isLastDayOfMonth(date: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return date.getDate() === d.getDate()
}

interface FormData {
  title: string
  ruleType: RecurringRuleType
  daysOfWeek: number[]
  dayOfMonth: string
  isLastDay: boolean
  intervalDays: string
  time: string
  priority: TaskPriority
  category: string
  startDate: string
  endDate: string
  enabled: boolean
  description: string
  deadline: string
  subject: string
  estimatedMinutes: string
}

const EMPTY_FORM: FormData = {
  title: '',
  ruleType: 'daily',
  daysOfWeek: [],
  dayOfMonth: '',
  isLastDay: false,
  intervalDays: '3',
  time: '',
  priority: 'P2',
  category: '',
  startDate: formatDate(new Date()),
  endDate: '',
  enabled: true,
  description: '',
  deadline: '',
  subject: '',
  estimatedMinutes: '',
}

export default function RecurringPage() {
  const { recurringTasks, loading, loadRecurring, addRecurring, updateRecurring, deleteRecurring, toggleEnabled } =
    useRecurringStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadRecurring()
  }, [loadRecurring])

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((rt: RecurringTask) => {
    setEditingId(rt.id)
    setForm({
      title: rt.title,
      ruleType: rt.rule.type,
      daysOfWeek: rt.rule.daysOfWeek || [],
      dayOfMonth: rt.rule.daysOfMonth
        ? rt.rule.daysOfMonth.filter((d) => d !== 32).join('、')
        : '',
      isLastDay: !!(rt.rule.daysOfMonth && rt.rule.daysOfMonth.includes(32)),
      intervalDays: String(rt.rule.intervalDays || 3),
      time: rt.time,
      priority: rt.priority,
      category: rt.category,
      startDate: rt.startDate,
      endDate: rt.endDate,
      enabled: rt.enabled,
      description: rt.description || '',
      deadline: rt.deadline || '',
      subject: rt.subject || '',
      estimatedMinutes: rt.estimatedMinutes ? String(rt.estimatedMinutes) : '',
    })
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入标题', 'warning')
      return
    }

    const rule: RecurringTask['rule'] = { type: form.ruleType }
    switch (form.ruleType) {
      case 'weekly':
        rule.daysOfWeek = form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined
        break
      case 'monthly': {
        const days: number[] = []
        if (form.dayOfMonth) {
          form.dayOfMonth.split(/[、,，\s]+/).forEach((s) => {
            const n = parseInt(s, 10)
            if (n >= 1 && n <= 31) days.push(n)
          })
        }
        if (form.isLastDay) days.push(32)
        rule.daysOfMonth = days.length > 0 ? days : undefined
        break
      }
      case 'custom':
        rule.intervalDays = parseInt(form.intervalDays, 10) || 3
        break
    }

    const payload: Partial<RecurringTask> & { title: string; rule: RecurringTask['rule'] } = {
      title,
      rule,
      time: form.time,
      priority: form.priority,
      category: form.category.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      enabled: form.enabled,
      description: form.description.trim(),
      deadline: form.deadline,
      subject: form.subject.trim(),
    }
    const minutes = Number(form.estimatedMinutes)
    if (Number.isFinite(minutes) && minutes > 0) payload.estimatedMinutes = minutes
    else payload.estimatedMinutes = undefined

    if (editingId) {
      await updateRecurring(editingId, payload)
      toast('已更新', 'success')
    } else {
      await addRecurring(payload)
      toast('已创建', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addRecurring, updateRecurring, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRecurring(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteRecurring, toast],
  )

  const handleToggle = useCallback(
    async (id: string) => {
      await toggleEnabled(id)
    },
    [toggleEnabled],
  )

  const toggleWeekDay = useCallback((day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day],
    }))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="周期计划"
        description="管理周期性重复任务与习惯"
        actions={
          <Button onClick={openCreate}>新建周期计划</Button>
        }
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : recurringTasks.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="还没有周期计划"
          description="点击上方按钮创建你的第一个周期计划"
          action={<Button onClick={openCreate}>新建周期计划</Button>}
        />
      ) : (
        <div className={styles.list}>
          {recurringTasks.map((rt) => (
            <Card key={rt.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{rt.title}</h3>
                  <div className={styles.cardMeta}>
                    <Badge variant={PRIORITY_VARIANTS[rt.priority]}>
                      {PRIORITY_LABELS[rt.priority]}
                    </Badge>
                    <span className={styles.ruleDesc}>{describeRule(rt)}</span>
                    {rt.category && <Badge variant="info">{rt.category}</Badge>}
                    {rt.subject && <Badge variant="success">{rt.subject}</Badge>}
                    {rt.time && <span className={styles.timeInfo}>{rt.time}</span>}
                    {rt.estimatedMinutes ? (
                      <span className={styles.timeInfo}>约 {rt.estimatedMinutes} 分钟</span>
                    ) : null}
                  </div>
                  {rt.startDate && (
                    <div className={styles.dateRange}>
                      {rt.startDate} {rt.endDate ? `~ ${rt.endDate}` : '起'}
                      {rt.deadline ? ` · 截止 ${rt.deadline}` : ''}
                    </div>
                  )}
                  {rt.description && <div className={styles.cardDesc}>{rt.description}</div>}
                </div>
                <div className={styles.cardActions}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={rt.enabled}
                      onChange={() => handleToggle(rt.id)}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rt)}>
                    编辑
                  </Button>
                  {confirmId === rt.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(rt.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(rt.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>
              <div className={styles.generatePreview}>
                {canGenerateToday(rt) ? (
                  <span className={styles.willGenerate}>✅ 今天会生成此任务</span>
                ) : (
                  <span className={styles.wontGenerate}>⏸ 今天不会生成此任务</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑周期计划' : '新建周期计划'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>标题</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：每日晨跑"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>描述（可选）</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="补充说明"
              rows={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>规则类型</label>
            <div className={styles.radioGroup}>
              {(['daily', 'weekly', 'monthly', 'custom'] as RecurringRuleType[]).map((type) => (
                <label key={type} className={styles.radio}>
                  <input
                    type="radio"
                    name="ruleType"
                    checked={form.ruleType === type}
                    onChange={() => setForm((f) => ({ ...f, ruleType: type }))}
                  />
                  <span>
                    {type === 'daily' ? '每天' : type === 'weekly' ? '每周' : type === 'monthly' ? '每月' : '自定义'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {form.ruleType === 'weekly' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>选择星期</label>
              <div className={styles.checkboxGroup}>
                {WEEK_DAYS.map((day) => (
                  <label
                    key={day.value}
                    className={`${styles.checkboxChip} ${form.daysOfWeek.includes(day.value) ? styles.checkboxChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.daysOfWeek.includes(day.value)}
                      onChange={() => toggleWeekDay(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.ruleType === 'monthly' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>日期设置</label>
              <input
                className={styles.input}
                value={form.dayOfMonth}
                onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                placeholder="例如：1、15（用逗号或顿号分隔）"
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isLastDay}
                  onChange={(e) => setForm((f) => ({ ...f, isLastDay: e.target.checked }))}
                />
                <span>最后一天</span>
              </label>
            </div>
          )}

          {form.ruleType === 'custom' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>间隔天数</label>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={form.intervalDays}
                onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
              />
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>时间（可选）</label>
              <input
                className={styles.input}
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>优先级</label>
              <select
                className={styles.input}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                <option value="P0">P0 - 最高</option>
                <option value="P1">P1 - 中等</option>
                <option value="P2">P2 - 低</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>分类</label>
            <input
              className={styles.input}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="例如：运动、学习、生活"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>学科（可选）</label>
              <input
                className={styles.input}
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="如：数学"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>预估时间（分钟，可选）</label>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.estimatedMinutes}
                onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
                placeholder="预估投入"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>开始日期</label>
              <input
                className={styles.input}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>结束日期（可选）</label>
              <input
                className={styles.input}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>截止日期（可选）</label>
            <input
              className={styles.input}
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              <span>启用</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}