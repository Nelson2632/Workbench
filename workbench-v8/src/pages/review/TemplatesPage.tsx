import { useEffect, useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import type { ReviewTemplate } from '@/types'
import styles from './TemplatesPage.module.css'

const TYPE_LABELS: Record<string, string> = {
  daily: '每日',
  subject: '学科',
  weekly: '每周',
  monthly: '每月',
  exam: '考试',
}

const TYPE_CLASSES: Record<string, string> = {
  daily: styles.typeDaily,
  subject: styles.typeSubject,
  weekly: styles.typeWeekly,
  monthly: styles.typeMonthly,
  exam: styles.typeExam,
}

const DEFAULT_TEMPLATES = [
  {
    name: '每日复盘（默认）',
    type: 'daily',
    questions: [
      '今天最重要的三件事是什么？',
      '今天完成得最好的是？',
      '今天最大的阻碍是什么？',
      '哪件事估计错了时间？',
      '哪件事明天必须调整？',
      '明天最重要的三件事？',
    ],
  },
  {
    name: '学科复盘（默认）',
    type: 'subject',
    questions: [
      '本周最大的知识漏洞？',
      '最大的错误类型？',
      '下周最应该解决的三个问题？',
      '学习策略需要调整吗？',
    ],
  },
  {
    name: '周复盘（默认）',
    type: 'weekly',
    questions: [
      '本周最重要的三件事',
      '本周做得最好的事',
      '本周最大的浪费',
      '下周继续什么',
      '下周停止什么',
      '下周开始什么',
    ],
  },
  {
    name: '月复盘（默认）',
    type: 'monthly',
    questions: [
      '本月最重要的三件事',
      '本月做得最好的事',
      '本月最大的浪费',
      '下个月继续什么',
      '下个月停止什么',
      '下个月开始什么',
    ],
  },
  {
    name: '考试复盘（默认）',
    type: 'exam',
    questions: [
      '这次考试反映出的最大问题？',
      '哪些知识点需要重点复习？',
      '考试策略需要调整吗？',
      '下一阶段调整建议',
    ],
  },
]

export default function TemplatesPage() {
  const { templates, loadAll, addTemplate, updateTemplate, deleteTemplate } =
    useReviewStore()

  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('daily')
  const [formQuestions, setFormQuestions] = useState<string[]>([''])

  useEffect(() => {
    loadAll().then(() => setLoading(false))
  }, [loadAll])

  const openAddModal = useCallback(() => {
    setEditingTemplate(null)
    setFormName('')
    setFormType('daily')
    setFormQuestions([''])
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((template: ReviewTemplate) => {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormType(template.type)
    setFormQuestions(template.questions.length > 0 ? [...template.questions] : [''])
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingTemplate(null)
    setFormName('')
    setFormType('daily')
    setFormQuestions([''])
  }, [])

  const handleAddQuestion = useCallback(() => {
    setFormQuestions((prev) => [...prev, ''])
  }, [])

  const handleRemoveQuestion = useCallback((index: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleQuestionChange = useCallback(
    (index: number, value: string) => {
      setFormQuestions((prev) => prev.map((q, i) => (i === index ? value : q)))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    const validQuestions = formQuestions.filter((q) => q.trim())
    if (!formName.trim() || validQuestions.length === 0) return

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name: formName.trim(),
        type: formType,
        questions: validQuestions,
      })
    } else {
      await addTemplate({
        name: formName.trim(),
        type: formType,
        questions: validQuestions,
      })
    }
    closeModal()
  }, [formName, formType, formQuestions, editingTemplate, addTemplate, updateTemplate, closeModal])

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm('确定要删除这个模板吗？')) {
        await deleteTemplate(id)
      }
    },
    [deleteTemplate],
  )

  const handleInitDefaults = useCallback(async () => {
    for (const tmpl of DEFAULT_TEMPLATES) {
      await addTemplate(tmpl)
    }
  }, [addTemplate])

  const hasDefaultTemplates = useMemo(
    () =>
      DEFAULT_TEMPLATES.some(
        (dt) => templates.some((t) => t.type === dt.type),
      ),
    [templates],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="模板" description="复盘模板管理与自定义" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="模板" description="复盘模板管理与自定义" />

      <div className={styles.addBar}>
        <Button onClick={openAddModal}>添加模板</Button>
      </div>

      {/* Default templates section */}
      {!hasDefaultTemplates && (
        <div className={styles.defaultSection}>
          <h3 className={styles.defaultTitle}>默认模板</h3>
          <p className={styles.defaultInfo}>
            系统提供了一套默认的复盘模板，包含每日、学科、每周、每月、考试复盘的标准问题。点击下方按钮一键初始化。
          </p>
          <Button variant="secondary" size="sm" onClick={handleInitDefaults}>
            初始化默认模板
          </Button>
        </div>
      )}

      {/* Template Grid */}
      {templates.length === 0 && hasDefaultTemplates ? (
        <div className={styles.emptySection}>
          <EmptyState icon="📋" title="暂无自定义模板" description="点击「添加模板」创建自定义模板" />
        </div>
      ) : templates.length === 0 ? (
        <div className={styles.emptySection}>
          <EmptyState
            icon="📋"
            title="暂无模板"
            description="初始化默认模板或创建自定义模板"
          />
        </div>
      ) : (
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <div
              key={template.id}
              className={styles.templateCard}
              onClick={() => openEditModal(template)}
            >
              <div className={styles.templateName}>{template.name}</div>
              <div className={styles.templateMeta}>
                <span
                  className={`${styles.templateType} ${TYPE_CLASSES[template.type] || ''}`}
                >
                  {TYPE_LABELS[template.type] || template.type}
                </span>
                <span className={styles.templateQuestionCount}>
                  {template.questions.length} 个问题
                </span>
              </div>
              <div className={styles.templateQuestionPreview}>
                {template.questions.slice(0, 3).map((q, i) => (
                  <div key={i}>
                    {i + 1}. {q}
                  </div>
                ))}
                {template.questions.length > 3 && (
                  <div>...还有 {template.questions.length - 3} 个问题</div>
                )}
              </div>
              <div className={styles.templateActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditModal(template)
                  }}
                >
                  编辑
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(template.id)
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTemplate ? '编辑模板' : '添加模板'}
        size="lg"
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>模板名称</label>
            <input
              className={styles.formInput}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入模板名称"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>模板类型</label>
            <select
              className={styles.formSelect}
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="daily">每日复盘</option>
              <option value="subject">学科复盘</option>
              <option value="weekly">每周复盘</option>
              <option value="monthly">每月复盘</option>
              <option value="exam">考试复盘</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>问题列表</label>
            <div className={styles.questionsList}>
              {formQuestions.map((q, i) => (
                <div key={i} className={styles.questionRow}>
                  <input
                    className={styles.questionInput}
                    value={q}
                    onChange={(e) => handleQuestionChange(i, e.target.value)}
                    placeholder={`问题 ${i + 1}`}
                  />
                  {formQuestions.length > 1 && (
                    <button
                      className={styles.questionRemoveBtn}
                      onClick={() => handleRemoveQuestion(i)}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className={styles.addQuestionBtn}
              onClick={handleAddQuestion}
              type="button"
            >
              + 添加问题
            </button>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? '更新' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}