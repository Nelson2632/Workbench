import { useEffect, useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { useMaterialStore } from '@/stores/materialStore'
import { useToast } from '@/components/ui/Toast'
import styles from './MaterialsPage.module.css'

interface FormData {
  title: string
  category: string
  tags: string
  note: string
  fileRefs: string
}

const EMPTY_FORM: FormData = {
  title: '',
  category: '未分类',
  tags: '',
  note: '',
  fileRefs: '',
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function parseFileRefs(raw: string): string[] {
  return raw
    .split(/[\n,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function MaterialsPage() {
  const { toast } = useToast()
  const { materials, loading, loadMaterials, addMaterial, updateMaterial, deleteMaterial } =
    useMaterialStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('全部')

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  const sorted = useMemo(
    () => [...materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [materials],
  )

  const categories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category || '未分类'))).sort(),
    [materials],
  )

  const filtered = useMemo(
    () =>
      categoryFilter === '全部'
        ? sorted
        : sorted.filter((m) => (m.category || '未分类') === categoryFilter),
    [sorted, categoryFilter],
  )

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((m: typeof materials[0]) => {
    setEditingId(m.id)
    setForm({
      title: m.title,
      category: m.category,
      tags: m.tags.join(', '),
      note: m.note,
      fileRefs: m.fileRefs.join('\n'),
    })
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入素材标题', 'warning')
      return
    }
    const payload = {
      title,
      category: form.category.trim() || '未分类',
      tags: parseTags(form.tags),
      note: form.note,
      fileRefs: parseFileRefs(form.fileRefs),
    }
    if (editingId !== null) {
      await updateMaterial(editingId, payload)
      toast('已更新', 'success')
    } else {
      await addMaterial(payload)
      toast('已添加', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addMaterial, updateMaterial, toast])

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteMaterial(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteMaterial, toast],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="素材"
        description="收藏句子、诗词、知识点等素材"
        actions={<Button onClick={openCreate}>添加素材</Button>}
      />

      {!loading && materials.length > 0 && (
        <div className={styles.filterBar}>
          <label className={styles.filterLabel}>分类筛选</label>
          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="按分类筛选"
          >
            <option value="全部">全部（{materials.length}）</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : materials.length === 0 ? (
        <EmptyState
          icon="🧩"
          title="还没有素材"
          description="添加句子、诗词、知识点等，作为创作与写作的积累"
          action={<Button onClick={openCreate}>添加素材</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="该分类暂无素材" description={`「${categoryFilter}」下还没有素材`} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((m) => (
            <Card key={m.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.titleRow}>
                  <h3 className={styles.title}>{m.title}</h3>
                  <div className={styles.metaRow}>
                    <Badge variant="info">{m.category}</Badge>
                    {m.sourceDate && (
                      <span className={styles.sourceDate}>来源 {m.sourceDate}</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                    编辑
                  </Button>
                  {confirmId === m.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(m.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(m.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>

              {m.note && <p className={styles.note}>{m.note}</p>}

              {m.fileRefs.length > 0 && (
                <div className={styles.fileRefs}>
                  {m.fileRefs.map((ref) => (
                    <span key={ref} className={styles.fileRef}>
                      📎 {ref}
                    </span>
                  ))}
                </div>
              )}

              {m.tags.length > 0 && (
                <div className={styles.tags}>
                  {m.tags.map((t) => (
                    <span key={t} className={styles.tag}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId !== null ? '编辑素材' : '添加素材'}
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>标题 / 内容</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：一句值得记录的话"
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>分类</label>
            <input
              className={styles.input}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="句子 / 诗词 / 知识点..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>标签（逗号分隔）</label>
            <input
              className={styles.input}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="写作, 名言"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注 / 出处</label>
            <textarea
              className={styles.textarea}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="出处、心得、关联..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>附件 / 图片引用（可选，每行一个）</label>
            <textarea
              className={styles.textarea}
              value={form.fileRefs}
              onChange={(e) => setForm((f) => ({ ...f, fileRefs: e.target.value }))}
              placeholder="图片路径 / 文件路径 / URL，每行一个"
              rows={2}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId !== null ? '保存' : '添加'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}