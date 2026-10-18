import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import { getDaysDiff, formatDate } from '@/utils/helpers'
import type { Countdown, CountdownType } from '@/types'
import styles from './CountdownsPage.module.css'

const TYPE_CONFIG: { value: CountdownType; label: string; icon: string }[] = [
  { value: 'exam', label: '考试', icon: '📝' },
  { value: 'travel', label: '旅行', icon: '✈️' },
  { value: 'birthday', label: '生日', icon: '🎂' },
  { value: 'event', label: '事件', icon: '📅' },
  { value: 'custom', label: '自定义', icon: '🏷' },
]

const TYPE_LABEL: Record<CountdownType, string> = {
  exam: '考试',
  travel: '旅行',
  birthday: '生日',
  event: '事件',
  custom: '自定义',
}

const TYPE_ICON: Record<CountdownType, string> = {
  exam: '📝',
  travel: '✈️',
  birthday: '🎂',
  event: '📅',
  custom: '🏷',
}

const emptyForm = {
  title: '',
  targetDate: '',
  type: 'event' as CountdownType,
  showOnHome: true,
}

export default function CountdownsPage() {
  const { countdowns, loading, loadCountdowns, addCountdown, updateCountdown, deleteCountdown } = useToolStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCountdowns()
  }, [loadCountdowns])

  const openAdd = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((c: Countdown) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      targetDate: c.targetDate,
      type: c.type,
      showOnHome: c.showOnHome,
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.targetDate) {
      toast('请填写标题和日期', 'warning')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateCountdown(editingId, form)
        toast('倒数日已更新', 'success')
      } else {
        await addCountdown({
          title: form.title.trim(),
          targetDate: form.targetDate,
          type: form.type,
          showOnHome: form.showOnHome,
        })
        toast('倒数日已创建', 'success')
      }
      closeModal()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, addCountdown, updateCountdown, closeModal, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个倒数日吗？')) return
    try {
      await deleteCountdown(id)
      toast('倒数日已删除', 'success')
    } catch {
      toast('删除失败', 'error')
    }
  }, [deleteCountdown, toast])

  const today = formatDate(new Date())

  const sorted = [...countdowns].sort((a, b) => {
    const diffA = getDaysDiff(today, a.targetDate)
    const diffB = getDaysDiff(today, b.targetDate)
    return Math.abs(diffA) - Math.abs(diffB)
  })

  return (
    <div className={styles.page}>
      <PageHeader
        title="倒数日"
        description="重要日期倒计时提醒"
        actions={
          <Button onClick={openAdd}>新增倒数日</Button>
        }
      />

      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="📅"
          title="还没有倒数日"
          description="点击「新增倒数日」添加你的重要日期"
          action={<Button onClick={openAdd}>新增倒数日</Button>}
        />
      ) : (
        <div className={styles.list}>
          {sorted.map((c) => {
            const diff = getDaysDiff(today, c.targetDate)
            const isPast = diff < 0
            const absDiff = Math.abs(diff)

            return (
              <div key={c.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.title}>{c.title}</h3>
                    <p className={styles.targetDate}>{c.targetDate}</p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => openEdit(c)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDelete(c.id)}
                      title="删除"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div>
                  <p className={styles.daysRemaining}>
                    {isPast ? `已过 ${absDiff} 天` : `还剩 ${absDiff} 天`}
                  </p>
                  <p className={styles.daysLabel}>
                    {isPast ? '已经过去' : '距离目标日期'}
                    {diff === 0 ? ' 🎯 就是今天！' : ''}
                  </p>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.typeBadge}>
                    <span className={styles.typeIcon}>{TYPE_ICON[c.type]}</span>
                    {TYPE_LABEL[c.type]}
                  </span>
                  {c.showOnHome && (
                    <span className={styles.homeBadge}>🏠 首页显示</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑倒数日' : '新增倒数日'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>标题</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：高考、旅行、生日..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>目标日期</label>
            <Input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>类型</label>
            <div className={styles.typeSelect}>
              {TYPE_CONFIG.map((t) => (
                <button
                  key={t.value}
                  className={`${styles.typeOption} ${form.type === t.value ? styles.typeOptionActive : ''}`}
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.toggleRow}>
              <label className={styles.label}>在首页显示</label>
              <button
                className={`${styles.toggle} ${form.showOnHome ? styles.toggleOn : ''}`}
                onClick={() => setForm((f) => ({ ...f, showOnHome: !f.showOnHome }))}
                role="switch"
                aria-checked={form.showOnHome}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}