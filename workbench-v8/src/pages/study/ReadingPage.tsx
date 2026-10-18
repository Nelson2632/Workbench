import { useEffect, useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useToast } from '@/components/ui/Toast'
import type { ReadingStatus } from '@/types'
import styles from './ReadingPage.module.css'

const UNITS = ['页', '章', '本', 'min']

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'wantToRead', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'read', label: '读完' },
  { value: 'dropped', label: '弃读' },
]

const STATUS_META: Record<ReadingStatus, { label: string; className: string }> = {
  wantToRead: { label: '想读', className: 'statusWant' },
  reading: { label: '在读', className: 'statusReading' },
  read: { label: '读完', className: 'statusRead' },
  dropped: { label: '弃读', className: 'statusDropped' },
}

interface FormData {
  title: string
  status: ReadingStatus
  current: number
  target: number
  unit: string
  note: string
  pinned: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  status: 'wantToRead',
  current: 0,
  target: 0,
  unit: '页',
  note: '',
  pinned: false,
}

export default function ReadingPage() {
  const { toast } = useToast()
  const { reading, loading, loadReading, addReading, updateReading, deleteReading } =
    useStudyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadReading()
  }, [loadReading])

  const sorted = useMemo(() => {
    return [...reading].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [reading])

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((r: typeof reading[0]) => {
    setEditingId(r.id)
    setForm({
      title: r.title,
      status: r.status,
      current: r.current,
      target: r.target,
      unit: r.unit,
      note: r.note,
      pinned: r.pinned,
    })
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入书名', 'warning')
      return
    }
    const isReading = form.status === 'reading'
    if (isReading && form.target <= 0) {
      toast('在读状态请设置目标数量', 'warning')
      return
    }
    // 非在读状态不保留进度
    const current = isReading ? form.current : 0
    const target = isReading ? form.target : 0

    if (editingId) {
      await updateReading(editingId, {
        title,
        status: form.status,
        current,
        target,
        unit: form.unit,
        note: form.note,
        pinned: form.pinned,
      })
      toast('已更新', 'success')
    } else {
      await addReading({
        title,
        status: form.status,
        current,
        target,
        unit: form.unit,
        note: form.note,
        pinned: form.pinned,
      })
      toast('已添加', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addReading, updateReading, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteReading(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteReading, toast],
  )

  const handleStep = useCallback(
    async (id: string, current: number, target: number, delta: number) => {
      const next = current + delta
      if (next < 0) return
      if (target > 0 && next > target) return
      await updateReading(id, { current: next })
    },
    [updateReading],
  )

  const handleTogglePin = useCallback(
    async (id: string, pinned: boolean) => {
      await updateReading(id, { pinned: !pinned })
    },
    [updateReading],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="阅读"
        description="按状态管理阅读目标与进度"
        actions={<Button onClick={openCreate}>添加阅读目标</Button>}
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : reading.length === 0 ? (
        <EmptyState
          icon="📖"
          title="还没有阅读目标"
          description="点击上方按钮添加你的第一个阅读目标"
          action={<Button onClick={openCreate}>添加阅读目标</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {sorted.map((r) => {
            const isReading = r.status === 'reading'
            const progress = isReading && r.target > 0 ? Math.min((r.current / r.target) * 100, 100) : 0
            const isComplete = r.status === 'read'
            const meta = STATUS_META[r.status]

            return (
              <Card key={r.id} className={`${styles.card} ${r.pinned ? styles.pinned : ''}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.title}>
                      {r.pinned && <span className={styles.pinIcon}>📌</span>}
                      {r.title}
                    </h3>
                    <span className={`${styles.statusBadge} ${styles[meta.className]}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(r.id, r.pinned)}
                      title={r.pinned ? '取消置顶' : '置顶'}
                    >
                      {r.pinned ? '📌' : '📌'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      编辑
                    </Button>
                    {confirmId === r.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>
                          确认删除
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(r.id)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>

                {isReading && (
                  <>
                    <div className={styles.progressSection}>
                      <div className={styles.progressBar}>
                        <div
                          className={`${styles.progressFill} ${isComplete ? styles.progressComplete : ''}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className={styles.progressInfo}>
                        <span className={styles.progressText}>
                          {r.current} / {r.target} {r.unit}
                        </span>
                        <span className={styles.progressPercent}>
                          {isComplete ? '100%' : `${Math.round(progress)}%`}
                        </span>
                      </div>
                    </div>

                    <div className={styles.stepControls}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStep(r.id, r.current, r.target, -1)}
                        disabled={r.current <= 0}
                      >
                        -1 {r.unit === 'min' ? 'min' : r.unit}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStep(r.id, r.current, r.target, 1)}
                        disabled={r.target > 0 && r.current >= r.target}
                      >
                        +1 {r.unit === 'min' ? 'min' : r.unit}
                      </Button>
                    </div>
                  </>
                )}

                {r.note && (
                  <p className={styles.note}>{r.note}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑阅读目标' : '添加阅读目标'}
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>书名/标题</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：《三体》"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>阅读状态</label>
            <select
              className={styles.input}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ReadingStatus }))}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {form.status === 'reading' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>当前进度</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={form.current}
                  onChange={(e) => setForm((f) => ({ ...f, current: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>目标</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: parseInt(e.target.value, 10) || 0 }))}
                  placeholder="例如：300"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>单位</label>
                <select
                  className={styles.input}
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="阅读笔记..."
              rows={3}
            />
          </div>

          <label className={styles.pinLabel}>
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            <span>置顶</span>
          </label>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '添加'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}