// ============================================================
// Personal Workbench V8 — FlashcardsPage (Task 16 + 17)
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent, KeyboardEvent, CSSProperties } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate } from '@/utils/helpers'
import type { Flashcard, FlashcardTheme, ReviewRating } from '@/types'
import { themes, getThemeForSubject } from './FlashcardTheme'
import type { ThemeDefinition } from './FlashcardTheme'
import FlashcardFace from './FlashcardFace'
import styles from './FlashcardsPage.module.css'

type TabType = 'browse' | 'review' | 'import'
type ImportTabType = 'csv' | 'paste' | 'json'

const DIFFICULTY_LABELS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']

const RATING_OPTIONS: { rating: ReviewRating; emoji: string; label: string }[] = [
  { rating: 'forgot', emoji: '😣', label: '不会' },
  { rating: 'fuzzy', emoji: '🤔', label: '模糊' },
  { rating: 'got', emoji: '🙂', label: '会了' },
  { rating: 'mastered', emoji: '😎', label: '熟练' },
]

export default function FlashcardsPage() {
  const {
    flashcards,
    loading,
    loadAll,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getDueCards,
    addReview,
    importCSV,
    importJSON,
  } = useFlashcardStore()
  const { subjects, loadSubjects } = useStudyStore()

  const [activeTab, setActiveTab] = useState<TabType>('browse')

  // Browse filters
  const [subjectFilter, setSubjectFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Theme
  const [themeName, setThemeName] = useState<FlashcardTheme>('nightSky')

  // Review state
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewFlipped, setReviewFlipped] = useState(false)
  const [cardEntering, setCardEntering] = useState(false)
  const [cardSlidingOut, setCardSlidingOut] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startTime: 0 })
  const sessionStartRef = useRef(0)

  // Import state
  const [importTab, setImportTab] = useState<ImportTabType>('csv')
  const [pasteText, setPasteText] = useState('')
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([])
  const [importFile, setImportFile] = useState<File | null>(null)

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Flashcard | null>(null)
  const [form, setForm] = useState({
    question: '',
    answer: '',
    subject: '',
    chapter: '',
    tags: '',
    difficulty: 3,
    knowledgeId: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [formTags, setFormTags] = useState<string[]>([])

  useEffect(() => {
    loadAll()
    loadSubjects()
  }, [loadAll, loadSubjects])

  // ---- Computed ----

  const dueCards = useMemo(() => getDueCards(), [flashcards])

  const filteredCards = useMemo(() => {
    return flashcards.filter((c) => {
      if (subjectFilter && c.subject !== subjectFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!c.question.toLowerCase().includes(q) && !c.answer.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [flashcards, subjectFilter, searchQuery])

  const currentCard = dueCards[reviewIndex] || null

  // ---- Handlers ----

  const openAdd = () => {
    setEditing(null)
    setForm({ question: '', answer: '', subject: '', chapter: '', tags: '', difficulty: 3, knowledgeId: '' })
    setFormTags([])
    setModalOpen(true)
  }

  const openEdit = (card: Flashcard) => {
    setEditing(card)
    setForm({
      question: card.question,
      answer: card.answer,
      subject: card.subject,
      chapter: card.chapter,
      tags: '',
      difficulty: card.difficulty,
      knowledgeId: card.knowledgeId || '',
    })
    setFormTags(card.tags || [])
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.answer) return
    const data = {
      question: form.question,
      answer: form.answer,
      subject: form.subject,
      chapter: form.chapter,
      tags: formTags,
      difficulty: form.difficulty,
      knowledgeId: form.knowledgeId || undefined,
    }
    if (editing) {
      await updateFlashcard(editing.id, data)
    } else {
      await addFlashcard(data)
    }
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定删除这张闪卡？')) {
      await deleteFlashcard(id)
    }
  }

  // ---- Review ----

  const handleReviewFlip = () => {
    setReviewFlipped(!reviewFlipped)
  }

  const handleRate = useCallback(async (rating: ReviewRating) => {
    if (!currentCard) return
    setCardSlidingOut(true)
    const correct = rating === 'got' || rating === 'mastered'
    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }))
    await addReview(currentCard.id, rating)
    // Wait for slide-out animation, then advance
    setTimeout(() => {
      setReviewFlipped(false)
      setCardSlidingOut(false)
      if (reviewIndex < dueCards.length - 1) {
        setReviewIndex(reviewIndex + 1)
        setCardEntering(true)
        setTimeout(() => setCardEntering(false), 500)
      } else {
        setSessionComplete(true)
      }
    }, 350)
  }, [currentCard, reviewIndex, dueCards.length, addReview])

  // Trigger card entrance on first render
  useEffect(() => {
    if (activeTab === 'review' && dueCards.length > 0 && !sessionComplete) {
      setCardEntering(true)
      const timer = setTimeout(() => setCardEntering(false), 500)
      return () => clearTimeout(timer)
    }
  }, [activeTab, dueCards.length, sessionComplete])

  const startReview = () => {
    setReviewIndex(0)
    setReviewFlipped(false)
    setCardEntering(false)
    setCardSlidingOut(false)
    setSessionComplete(false)
    setSessionStats({ reviewed: 0, correct: 0, startTime: Date.now() })
    sessionStartRef.current = Date.now()
    setActiveTab('review')
  }

  // ---- Import ----

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (importTab === 'csv') {
        parseCSV(text)
      } else if (importTab === 'json') {
        parseJSON(text)
      }
    }
    reader.readAsText(file)
  }

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return
    const headers = lines[0].split(',').map((h) => h.trim())
    const rows: Array<Record<string, string>> = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, j) => { row[h] = cols[j] || '' })
      rows.push(row)
    }
    setImportPreview(rows)
  }

  const parseJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      setImportPreview(arr.filter(Boolean))
    } catch {
      setImportPreview([])
    }
  }

  const handlePasteParse = () => {
    const lines = pasteText.trim().split('\n')
    const rows: Array<Record<string, string>> = []
    for (const line of lines) {
      const cols = line.split('\t')
      if (cols.length >= 2) {
        rows.push({
          question: cols[0].trim(),
          answer: cols[1].trim(),
          tags: cols[2]?.trim() || '',
        })
      }
    }
    setImportPreview(rows)
  }

  const handleConfirmImport = async () => {
    if (importTab === 'csv' && importFile) {
      const text = await importFile.text()
      await importCSV(text)
    } else if (importTab === 'json' && importFile) {
      const text = await importFile.text()
      await importJSON(text)
    } else if (importTab === 'paste') {
      for (const row of importPreview) {
        if (row.question && row.answer) {
          await addFlashcard({
            question: row.question,
            answer: row.answer,
            tags: row.tags ? row.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) : [],
          })
        }
      }
    }
    setImportPreview([])
    setImportFile(null)
    setPasteText('')
  }

  // ---- Theme ----

  const theme = themes[themeName]

  // Auto-set theme when subject changes in review
  useEffect(() => {
    if (currentCard && currentCard.subject) {
      setThemeName(getThemeForSubject(currentCard.subject))
    }
  }, [currentCard?.subject])

  // ---- Form helpers ----

  const addFormTag = () => {
    const t = tagInput.trim()
    if (t && !formTags.includes(t)) {
      setFormTags([...formTags, t])
      setTagInput('')
    }
  }

  const removeFormTag = (t: string) => {
    setFormTags(formTags.filter((x) => x !== t))
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFormTag()
    }
  }

  // ---- Render ----

  return (
    <div>
      <PageHeader
        title="闪卡"
        description="间隔重复记忆卡片"
        actions={<Button onClick={openAdd}>+ 新增闪卡</Button>}
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'browse' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          浏览
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'review' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('review')}
        >
          复习
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'import' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('import')}
        >
          导入
        </button>
      </div>

      {/* ---- Browse Tab ---- */}
      {activeTab === 'browse' && (
        <div>
          <div className={styles.browseFilters}>
            <select value={subjectFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubjectFilter(e.target.value)}>
              <option value="">全部学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="搜索问题或答案..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading && <EmptyState icon="⏳" title="加载中..." />}
          {!loading && filteredCards.length === 0 && (
            <EmptyState
              icon="🃏"
              title="暂无闪卡"
              description={flashcards.length === 0 ? '点击「新增闪卡」或「导入」创建你的第一张闪卡' : '没有匹配的闪卡'}
              action={flashcards.length === 0 ? <Button onClick={openAdd}>新增闪卡</Button> : undefined}
            />
          )}

          {!loading && filteredCards.length > 0 && (
            <div className={`${styles.cardList} anim-list-stagger`}>
              {filteredCards.map((card, index) => (
                <div
                  key={card.id}
                  className={`${styles.browseCard} theme-interactive`}
                  onClick={() => openEdit(card)}
                  style={{ '--i': index } as CSSProperties}
                >
                  <div className={styles.browseCardInfo}>
                    <div className={styles.browseCardQuestion}>{card.question}</div>
                    <div className={styles.browseCardMeta}>
                      <span className={styles.subjectBadge}>{card.subject || '未分类'}</span>
                      {card.chapter && <span>{card.chapter}</span>}
                      <span>{DIFFICULTY_LABELS[card.difficulty]}</span>
                      <span>掌握 {card.mastery}%</span>
                      <span>下次复习: {formatDate(new Date(card.nextReviewAt))}</span>
                    </div>
                  </div>
                  <div className={styles.browseCardActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(card.id) }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Review Tab ---- */}
      {activeTab === 'review' && (
        <div>
          {/* Theme Selector */}
          <div className={styles.themeSelector}>
            <span className={styles.themeSelectorLabel}>主题:</span>
            <div className={styles.themeOptions}>
              {(Object.entries(themes) as [FlashcardTheme, ThemeDefinition][]).map(([key, t]) => (
                <button
                  key={key}
                  className={`${styles.themeOption} ${themeName === key ? styles.themeOptionActive : ''}`}
                  onClick={() => setThemeName(key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {dueCards.length === 0 ? (
            <div className={styles.reviewEmpty}>
              <div className={styles.reviewEmptyIcon}>🎉</div>
              <div className={styles.reviewEmptyTitle}>暂无待复习闪卡</div>
              <div className={styles.reviewEmptyDesc}>
                所有闪卡都已复习完毕，稍后再来
              </div>
            </div>
          ) : sessionComplete ? (
            <div className={styles.sessionComplete}>
              <div className={styles.sessionCompleteIcon}>🎉</div>
              <div className={styles.sessionCompleteTitle}>复习完成！</div>
              <div className={styles.sessionCompleteDesc}>
                你已完成本轮所有复习，继续保持！
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{sessionStats.reviewed}</span>
                  <span className={styles.statLabel}>已复习</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {sessionStats.reviewed > 0
                      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                      : 0}%
                  </span>
                  <span className={styles.statLabel}>正确率</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {sessionStats.startTime > 0
                      ? Math.round((Date.now() - sessionStats.startTime) / 60000)
                      : 0}分
                  </span>
                  <span className={styles.statLabel}>用时</span>
                </div>
              </div>
              <Button onClick={startReview}>再来一轮</Button>
            </div>
          ) : (
            <div className={styles.reviewContainer}>
              {/* Progress */}
              <div className={styles.reviewHeader}>
                <div className={styles.reviewProgress}>
                  <span>{reviewIndex + 1} / {dueCards.length} 待复习</span>
                  <span>{Math.round(((reviewIndex + 1) / dueCards.length) * 100)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${styles.progressFillAnimated}`}
                    style={{ width: `${((reviewIndex + 1) / dueCards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Card */}
              {currentCard && (
                <>
                  <div className={`${styles.flipContainer} ${cardEntering ? styles.cardEnter : ''} ${cardSlidingOut ? styles.cardSlideOut : ''}`}>
                    <div
                      className={`${styles.flipCard} ${reviewFlipped ? styles.flipped : ''}`}
                      onClick={handleReviewFlip}
                    >
                      <div className={styles.face}>
                        <FlashcardFace flashcard={currentCard} theme={theme} side="front" />
                      </div>
                      <div className={`${styles.face} ${styles.faceBack}`}>
                        <FlashcardFace flashcard={currentCard} theme={theme} side="back" />
                      </div>
                    </div>
                  </div>

                  {/* Rating Buttons */}
                  {reviewFlipped && !cardSlidingOut && (
                    <div className={styles.ratingButtons}>
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={opt.rating}
                          className={styles.ratingBtn}
                          onClick={() => handleRate(opt.rating)}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Import Tab ---- */}
      {activeTab === 'import' && (
        <div>
          <div className={styles.importTabs}>
            <button
              className={`${styles.importTab} ${importTab === 'csv' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('csv'); setImportPreview([]); setImportFile(null) }}
            >
              CSV 上传
            </button>
            <button
              className={`${styles.importTab} ${importTab === 'paste' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('paste'); setImportPreview([]); setPasteText('') }}
            >
              粘贴导入
            </button>
            <button
              className={`${styles.importTab} ${importTab === 'json' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('json'); setImportPreview([]); setImportFile(null) }}
            >
              JSON 上传
            </button>
          </div>

          {/* CSV */}
          {importTab === 'csv' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                CSV 格式要求：第一行为表头，包含 Question,Answer,Subject,Chapter 等列
              </p>
              <input
                type="file"
                accept=".csv"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
              {importPreview.length > 0 && (
                <>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          {Object.keys(importPreview[0]).slice(0, 5).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 20).map((row, i) => (
                          <tr key={i}>
                            {Object.keys(row).slice(0, 5).map((k) => (
                              <td key={k}>{row[k]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Paste */}
          {importTab === 'paste' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                每行一条，Tab 分隔：问题 → 答案 → 标签
              </p>
              <textarea
                value={pasteText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPasteText(e.target.value)}
                placeholder={`光合作用的场所是？\t叶绿体\t生物,细胞
牛顿第一定律内容？\t一切物体在没有受到外力作用的时候，总保持静止状态或匀速直线运动状态\t物理,力学`}
              />
              <Button variant="secondary" onClick={handlePasteParse}>解析预览</Button>
              {importPreview.length > 0 && (
                <>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>问题</th>
                          <th>答案</th>
                          <th>标签</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i}>
                            <td>{row.question}</td>
                            <td>{row.answer}</td>
                            <td>{row.tags}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* JSON */}
          {importTab === 'json' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                JSON 格式：数组，每个对象包含 question, answer 等字段
              </p>
              <input
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
              {importPreview.length > 0 && (
                <>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑闪卡' : '新增闪卡'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>问题</label>
            <textarea
              value={form.question}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, question: e.target.value })}
              placeholder="输入问题..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>答案</label>
            <textarea
              value={form.answer}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, answer: e.target.value })}
              placeholder="输入答案..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={form.subject}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subject: e.target.value })}
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
              value={form.chapter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, chapter: e.target.value })}
              placeholder="可选"
            />
          </div>
          <div className={styles.formGroup}>
            <label>知识点</label>
            <div className={styles.knowledgeSelect}>
              <label className={styles.knowledgeItem}>
                <input
                  type="radio"
                  name="knowledgeId"
                  value=""
                  checked={form.knowledgeId === ''}
                  onChange={() => setForm({ ...form, knowledgeId: '' })}
                />
                不关联
              </label>
              {subjects.map((sub) =>
                sub.chapters.map((ch) =>
                  ch.topics.map((topic) => (
                    <label key={topic.id} className={styles.knowledgeItem}>
                      <input
                        type="radio"
                        name="knowledgeId"
                        value={topic.id}
                        checked={form.knowledgeId === topic.id}
                        onChange={() => setForm({ ...form, knowledgeId: topic.id })}
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
          <div className={styles.formGroup}>
            <label>标签</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车..."
                style={{ flex: 1 }}
              />
              <Button size="sm" variant="secondary" onClick={addFormTag}>添加</Button>
            </div>
            {formTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {formTags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                      borderRadius: '9999px', background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                      fontSize: 12,
                    }}
                  >
                    {t}
                    <button
                      onClick={() => removeFormTag(t)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.formGroup}>
            <label>难度: {DIFFICULTY_LABELS[form.difficulty]}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={form.difficulty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, difficulty: Number(e.target.value) })}
            />
          </div>
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}