import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useProjectStore } from '@/stores/projectStore'
import { useToast } from '@/components/ui/Toast'
import { uid } from '@/utils/helpers'
import type { Project, ProjectStage, Milestone } from '@/types'
import styles from './ProjectsPage.module.css'

const STAGES: { key: ProjectStage | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'plan', label: '计划中' },
  { key: 'active', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'paused', label: '已暂停' },
]

const STAGE_BADGES: Record<ProjectStage, { label: string; variant: 'info' | 'success' | 'default' | 'warning' }> = {
  plan: { label: '计划中', variant: 'info' },
  active: { label: '进行中', variant: 'success' },
  done: { label: '已完成', variant: 'default' },
  paused: { label: '已暂停', variant: 'warning' },
}

interface FormData {
  title: string
  description: string
  stage: ProjectStage
  notes: string
  tagsText: string
  milestones: Milestone[]
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  stage: 'plan',
  notes: '',
  tagsText: '',
  milestones: [],
}

export default function ProjectsPage() {
  const { projects, loading, loadProjects, addProject, updateProject, deleteProject, toggleMilestone, addMilestone, deleteMilestone } =
    useProjectStore()
  const { toast } = useToast()

  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filtered = stageFilter === 'all'
    ? projects
    : projects.filter((p) => p.stage === stageFilter)

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setNewMilestoneTitle('')
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((p: Project) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      description: p.description,
      stage: p.stage,
      notes: p.notes,
      tagsText: p.tags.join('、'),
      milestones: p.milestones,
    })
    setNewMilestoneTitle('')
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入项目名称', 'warning')
      return
    }
    const tags = form.tagsText
      .split(/[、,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (editingId) {
      await updateProject(editingId, {
        title,
        description: form.description,
        stage: form.stage,
        notes: form.notes,
        tags,
        milestones: form.milestones,
      })
      toast('已更新', 'success')
    } else {
      await addProject(title)
      const created = useProjectStore.getState().projects.at(-1)
      if (created) {
        await updateProject(created.id, {
          description: form.description,
          notes: form.notes,
          tags,
          milestones: form.milestones,
        })
      }
      toast('已创建', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addProject, updateProject, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProject(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteProject, toast],
  )

  const handleToggleMilestone = useCallback(
    async (projectId: string, milestoneId: string) => {
      await toggleMilestone(projectId, milestoneId)
    },
    [toggleMilestone],
  )

  const handleAddMilestone = useCallback(
    async (projectId: string) => {
      const title = newMilestoneTitle.trim()
      if (!title) return
      await addMilestone(projectId, title)
      setNewMilestoneTitle('')
    },
    [newMilestoneTitle, addMilestone],
  )

  const handleDeleteMilestone = useCallback(
    async (projectId: string, milestoneId: string) => {
      await deleteMilestone(projectId, milestoneId)
    },
    [deleteMilestone],
  )

  const handleFormAddMilestone = useCallback(() => {
    const title = newMilestoneTitle.trim()
    if (!title) return
    setForm((f) => ({
      ...f,
      milestones: [...f.milestones, { id: uid(), title, done: false }],
    }))
    setNewMilestoneTitle('')
  }, [newMilestoneTitle])

  const handleFormRemoveMilestone = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.filter((m) => m.id !== id),
    }))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="项目追踪"
        description="管理长期项目与里程碑"
        actions={<Button onClick={openCreate}>新建项目</Button>}
      />

      <div className={styles.filterTabs}>
        {STAGES.map((s) => (
          <button
            key={s.key}
            className={`${styles.filterTab} ${stageFilter === s.key ? styles.filterTabActive : ''}`}
            onClick={() => setStageFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📁"
          title={stageFilter === 'all' ? '还没有项目' : '没有匹配的项目'}
          description="点击上方按钮创建你的第一个项目"
          action={<Button onClick={openCreate}>新建项目</Button>}
        />
      ) : (
        <div className={styles.list}>
          {filtered.map((p) => {
            const badge = STAGE_BADGES[p.stage]
            const isExpanded = expandedId === p.id

            return (
              <Card key={p.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{p.title}</h3>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className={styles.cardActions}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      编辑
                    </Button>
                    {confirmId === p.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                          确认删除
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(p.id)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>{p.progress}%</span>
                </div>

                {p.tags.length > 0 && (
                  <div className={styles.tags}>
                    {p.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                {p.description && (
                  <p className={styles.description}>
                    {isExpanded ? p.description : p.description.length > 80 ? p.description.slice(0, 80) + '...' : p.description}
                  </p>
                )}

                {p.milestones.length > 0 && (
                  <div className={styles.milestones}>
                    <div className={styles.milestonesHeader}>
                      <span className={styles.milestonesTitle}>
                        里程碑 ({p.milestones.filter((m) => m.done).length}/{p.milestones.length})
                      </span>
                    </div>
                    {p.milestones.map((m) => (
                      <label key={m.id} className={styles.milestoneItem}>
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={() => handleToggleMilestone(p.id, m.id)}
                        />
                        <span className={m.done ? styles.milestoneDone : ''}>{m.title}</span>
                        <button
                          className={styles.milestoneDelete}
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteMilestone(p.id, m.id)
                          }}
                          title="删除"
                        >
                          ×
                        </button>
                      </label>
                    ))}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <div className={styles.addMilestoneInline}>
                    <input
                      className={styles.inlineInput}
                      placeholder="添加里程碑..."
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMilestone(p.id)
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleAddMilestone(p.id)}>
                      +
                    </Button>
                  </div>
                  <button
                    className={styles.expandBtn}
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? '收起' : '展开详情'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑项目' : '新建项目'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>项目名称</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：完成 React 课程"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>阶段</label>
            <select
              className={styles.input}
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as ProjectStage }))}
            >
              <option value="plan">计划中</option>
              <option value="active">进行中</option>
              <option value="done">已完成</option>
              <option value="paused">已暂停</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>描述</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="项目描述..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>标签（用顿号或逗号分隔）</label>
            <input
              className={styles.input}
              value={form.tagsText}
              onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
              placeholder="例如：学习、前端、React"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>里程碑</label>
            <div className={styles.milestoneFormList}>
              {form.milestones.map((m) => (
                <div key={m.id} className={styles.milestoneFormItem}>
                  <span className={styles.milestoneFormTitle}>{m.title}</span>
                  <button
                    className={styles.milestoneDelete}
                    onClick={() => handleFormRemoveMilestone(m.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.addMilestoneForm}>
              <input
                className={styles.input}
                placeholder="新里程碑..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleFormAddMilestone()
                  }
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleFormAddMilestone}>
                添加
              </Button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="备注信息..."
              rows={3}
            />
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