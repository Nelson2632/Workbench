// ============================================================
// Personal Workbench V8 — MistakesPage (Task 15)
// ============================================================

import { useState, useEffect } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { formatDate } from '@/utils/helpers'
import type { Mistake } from '@/types'
import styles from './MistakesPage.module.css'

const ERROR_TYPES = ['概念错误', '计算错误', '审题错误', '其他']

const emptyMistake = (): Partial<Mistake> => ({
  subject: '',
  question: '',
  answer: '',
  errorType: '',
  tags: [],
  linkedKnowledge: [],
  mastered: false,
})

export default function MistakesPage() {
  const {
    mistakes,
    subjects,
    loading,
    loadMistakes,
    loadSubjects,
    addMistake,
    updateMistake,
    deleteMistake,
  } = useStudyStore()
  const { addFlashcard } = useFlashcardStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Mistake | null>(null)
  const [form, setForm] = useState<Partial<Mistake>>(emptyMistake())

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('')
  const [onlyUnmastered, setOnlyUnmastered] = useState(false)
  const [tagFilter, setTagFilter] = useState('')

  // Tag input
  const [tagInput, setTagInput] = useState('')

  // Flashcard modal
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false)
  const [fCardForm, setFCardForm] = useState({ question: '', answer: '', subject: '', chapter: '', tags: '', difficulty: 3 })

  useEffect(() => {
    loadMistakes()
    loadSubjects()
  }, [loadMistakes, loadSubjects])

  // ---- Helpers ----

  const allTags = Array.from(new Set(mistakes.flatMap((m) => m.tags))).sort()

  const filtered = mistakes.filter((m) => {
    if (subjectFilter && m.subject !== subjectFilter) return false
    if (onlyUnmastered && m.mastered) return false
    if (tagFilter && !m.tags.includes(tagFilter)) return false
    return true
  })

  const openAdd = () => {
    setEditing(null)
    setForm(emptyMistake())
    setModalOpen(true)
  }

  const openEdit = (m: Mistake) => {
    setEditing(m)
    setForm({ ...m })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.subject) return
    if (editing) {
      await updateMistake(editing.id, form)
    } else {
      await addMistake(form as Parameters<typeof addMistake>[0])
    }
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (editing && window.confirm('确定删除这条错题？')) {
      await deleteMistake(editing.id)
      setModalOpen(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !(form.tags || []).includes(t)) {
      setForm({ ...form, tags: [...(form.tags || []), t] })
      setTagInput('')
    }
  }

  const removeTag = (t: string) => {
    setForm({ ...form, tags: (form.tags || []).filter((x) => x !== t) })
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const toggleKnowledge = (kid: string) => {
    const current = form.linkedKnowledge || []
    if (current.includes(kid)) {
      setForm({ ...form, linkedKnowledge: current.filter((k) => k !== kid) })
    } else {
      setForm({ ...form, linkedKnowledge: [...current, kid] })
    }
  }

  // ---- Flashcard generation ----

  const openFlashcardFromMistake = (m: Mistake) => {
    setFCardForm({
      question: m.question,
      answer: m.answer,
      subject: m.subject,
      chapter: '',
      tags: m.tags.join(', '),
      difficulty: 3,
    })
    setFlashcardModalOpen(true)
  }

  const handleCreateFlashcard = async () => {
    if (!fCardForm.question || !fCardForm.answer) return
    await addFlashcard({
      question: fCardForm.question,
      answer: fCardForm.answer,
      subject: fCardForm.subject,
      chapter: fCardForm.chapter,
      tags: fCardForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      difficulty: fCardForm.difficulty,
    })
    setFlashcardModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="错题本"
        description="记录与复习错题"
        actions={<Button onClick={openAdd}>+ 新增错题</Button>}
      />

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <select value={subjectFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubjectFilter(e.target.value)}>
          <option value="">全部学科</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
        <button
          className={`${styles.toggleBtn} ${onlyUnmastered ? styles.toggleBtnActive : ''}`}
          onClick={() => setOnlyUnmastered(!onlyUnmastered)}
        >
          {onlyUnmastered ? '仅未掌握' : '全部'}
        </button>
        <select value={tagFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTagFilter(e.target.value)}>
          <option value="">全部标签</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Loading / Empty */}
      {loading && <EmptyState icon="⏳" title="加载中..." />}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📝"
          title="暂无错题"
          description="点击「新增错题」开始记录你的错题"
          action={<Button onClick={openAdd}>新增错题</Button>}
        />
      )}

      {/* Cards Grid */}
      {!loading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((m) => (
            <MistakeCard
              key={m.id}
              mistake={m}
              onEdit={() => openEdit(m)}
              onToggleMastered={() => updateMistake(m.id, { mastered: !m.mastered })}
              onGenerateFlashcard={() => openFlashcardFromMistake(m)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑错题' : '新增错题'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={form.subject || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subject: e.target.value })}
            >
              <option value="">选择学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>题目</label>
            <textarea
              value={form.question || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, question: e.target.value })}
              placeholder="输入错题题目..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>正确答案</label>
            <textarea
              value={form.answer || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, answer: e.target.value })}
              placeholder="输入正确答案..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>错误类型</label>
            <div className={styles.errorTypeGroup}>
              {ERROR_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  className={`${styles.errorTypeOption} ${form.errorType === et ? styles.errorTypeOptionActive : ''}`}
                  onClick={() => setForm({ ...form, errorType: form.errorType === et ? '' : et })}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>标签</label>
            <div className={styles.tagInput}>
              <input
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车..."
              />
              <Button size="sm" variant="secondary" onClick={addTag}>添加</Button>
            </div>
            {(form.tags || []).length > 0 && (
              <div className={styles.tagsList}>
                {(form.tags || []).map((t) => (
                  <span key={t} className={styles.tagChip}>
                    {t}
                    <button onClick={() => removeTag(t)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>关联知识点</label>
            <div className={styles.knowledgeSelect}>
              {subjects.map((sub) =>
                sub.chapters.map((ch) =>
                  ch.topics.map((topic) => (
                    <label key={topic.id} className={styles.knowledgeItem}>
                      <input
                        type="checkbox"
                        checked={(form.linkedKnowledge || []).includes(topic.id)}
                        onChange={() => toggleKnowledge(topic.id)}
                      />
                      {sub.name} › {ch.name} › {topic.name}
                    </label>
                  ))
                )
              )}
              {subjects.every((s) => s.chapters.length === 0) && (
                <span className={styles.hint}>暂无知识点，请先在知识体系中创建</span>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            {editing && (
              <Button variant="danger" onClick={handleDelete}>删除</Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      {/* Generate Flashcard Modal */}
      <Modal
        isOpen={flashcardModalOpen}
        onClose={() => setFlashcardModalOpen(false)}
        title="生成闪卡"
        size="md"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>问题</label>
            <textarea
              value={fCardForm.question}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFCardForm({ ...fCardForm, question: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>答案</label>
            <textarea
              value={fCardForm.answer}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFCardForm({ ...fCardForm, answer: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={fCardForm.subject}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFCardForm({ ...fCardForm, subject: e.target.value })}
            >
              <option value="">选择学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>章节</label>
            <input
              value={fCardForm.chapter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, chapter: e.target.value })}
              placeholder="可选"
            />
          </div>
          <div className={styles.formGroup}>
            <label>标签（逗号分隔）</label>
            <input
              value={fCardForm.tags}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, tags: e.target.value })}
              placeholder="标签1, 标签2"
            />
          </div>
          <div className={styles.formGroup}>
            <label>难度: {fCardForm.difficulty}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={fCardForm.difficulty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, difficulty: Number(e.target.value) })}
            />
          </div>
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setFlashcardModalOpen(false)}>取消</Button>
            <Button onClick={handleCreateFlashcard}>创建闪卡</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---- MistakeCard Component (with flip) ----

function MistakeCard({
  mistake,
  onEdit,
  onToggleMastered,
  onGenerateFlashcard,
}: {
  mistake: Mistake
  onEdit: () => void
  onToggleMastered: () => void
  onGenerateFlashcard: () => void
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className={styles.flipCardInner}>
        {/* Front */}
        <div className={styles.flipCardFront}>
          <div className={styles.cardHeader}>
            <span className={styles.subjectBadge}>{mistake.subject}</span>
            {mistake.errorType && (
              <span className={styles.errorTypeTag}>{mistake.errorType}</span>
            )}
          </div>
          <div className={styles.questionText}>{mistake.question}</div>
          <div className={styles.cardFooter}>
            <span className={styles.date}>{formatDate(new Date(mistake.createdAt))}</span>
            <div className={styles.tags}>
              {mistake.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={styles.flipCardBack}>
          <div className={styles.cardHeader}>
            <span className={styles.subjectBadge}>{mistake.subject}</span>
            <span className={styles.date}>{formatDate(new Date(mistake.createdAt))}</span>
          </div>
          <div className={styles.answerText}>{mistake.answer || '（暂无答案）'}</div>
          <div className={styles.backActions}>
            <button
              className={mistake.mastered ? styles.masteredBtn : styles.notMasteredBtn}
              onClick={(e) => { e.stopPropagation(); onToggleMastered() }}
            >
              {mistake.mastered ? '✓ 已掌握' : '待掌握'}
            </button>
            <button
              className={styles.flashcardBtn}
              onClick={(e) => { e.stopPropagation(); onGenerateFlashcard() }}
            >
              生成闪卡
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}