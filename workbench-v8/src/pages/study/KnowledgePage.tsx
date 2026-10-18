import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useToast } from '@/components/ui/Toast'
import type { MasteryLevel } from '@/types'
import styles from './KnowledgePage.module.css'

const MASTERY_CYCLE: MasteryLevel[] = ['notStarted', 'learning', 'mastered', 'weak']
const MASTERY_LABELS: Record<MasteryLevel, string> = {
  notStarted: '未开始',
  learning: '学习中',
  mastered: '已掌握',
  weak: '薄弱',
}
const MASTERY_VARIANTS: Record<MasteryLevel, 'default' | 'info' | 'success' | 'danger'> = {
  notStarted: 'default',
  learning: 'info',
  mastered: 'success',
  weak: 'danger',
}

export default function KnowledgePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    subjects, loading, loadSubjects,
    addSubject, deleteSubject, addChapter, deleteChapter,
    addTopic, updateTopic, deleteTopic,
  } = useStudyStore()
  const { flashcards, loadAll: loadFlashcards } = useFlashcardStore()

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newChapterName, setNewChapterName] = useState('')
  const [addingChapterFor, setAddingChapterFor] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopicFor, setAddingTopicFor] = useState<{ subjectId: string; chapterId: string } | null>(null)
  const [weakOnly, setWeakOnly] = useState(false)
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<string | null>(null)
  const [flashcardModal, setFlashcardModal] = useState<{
    open: boolean
    subject: string
    chapter: string
    knowledgeId: string
  }>({ open: false, subject: '', chapter: '', knowledgeId: '' })

  useEffect(() => {
    loadSubjects()
    loadFlashcards()
  }, [loadSubjects, loadFlashcards])

  const getFlashcardCount = useCallback(
    (knowledgeId: string) => flashcards.filter((f) => f.knowledgeId === knowledgeId).length,
    [flashcards],
  )

  const getLastReviewDate = useCallback(
    (knowledgeId: string) => {
      const related = flashcards.filter((f) => f.knowledgeId === knowledgeId)
      if (related.length === 0) return null
      const latest = related.reduce((max, f) =>
        f.nextReviewAt > max ? f.nextReviewAt : max, related[0].nextReviewAt)
      return new Date(latest).toLocaleDateString('zh-CN')
    },
    [flashcards],
  )

  const handleAddSubject = useCallback(async () => {
    const name = newSubjectName.trim()
    if (!name) {
      toast('请输入学科名称', 'warning')
      return
    }
    await addSubject(name)
    setNewSubjectName('')
    setShowSubjectModal(false)
    toast('学科已添加', 'success')
  }, [newSubjectName, addSubject, toast])

  const handleDeleteSubject = useCallback(async (id: string) => {
    await deleteSubject(id)
    setConfirmDeleteSubject(null)
    toast('学科已删除', 'info')
  }, [deleteSubject, toast])

  const handleAddChapter = useCallback(async (subjectId: string) => {
    const name = newChapterName.trim()
    if (!name) return
    await addChapter(subjectId, name)
    setNewChapterName('')
    setAddingChapterFor(null)
    toast('章节已添加', 'success')
  }, [newChapterName, addChapter, toast])

  const handleDeleteChapter = useCallback(async (subjectId: string, chapterId: string) => {
    await deleteChapter(subjectId, chapterId)
    toast('章节已删除', 'info')
  }, [deleteChapter, toast])

  const handleAddTopic = useCallback(async () => {
    if (!addingTopicFor) return
    const name = newTopicName.trim()
    if (!name) return
    await addTopic(addingTopicFor.subjectId, addingTopicFor.chapterId, name)
    setNewTopicName('')
    setAddingTopicFor(null)
    toast('知识点已添加', 'success')
  }, [addingTopicFor, newTopicName, addTopic, toast])

  const handleDeleteTopic = useCallback(async (subjectId: string, chapterId: string, topicId: string) => {
    await deleteTopic(subjectId, chapterId, topicId)
    toast('知识点已删除', 'info')
  }, [deleteTopic, toast])

  const handleMasteryToggle = useCallback(
    async (subjectId: string, chapterId: string, topicId: string, current: MasteryLevel) => {
      const idx = MASTERY_CYCLE.indexOf(current)
      const next = MASTERY_CYCLE[(idx + 1) % MASTERY_CYCLE.length]
      await updateTopic(subjectId, chapterId, topicId, { mastery: next })
    },
    [updateTopic],
  )

  const handleOpenFlashcardModal = useCallback(
    (subject: string, chapter: string, knowledgeId: string) => {
      setFlashcardModal({ open: true, subject, chapter, knowledgeId })
    },
    [],
  )

  const handleCreateFlashcard = useCallback(async () => {
    const { addFlashcard } = useFlashcardStore.getState()
    await addFlashcard({
      question: '',
      answer: '',
      subject: flashcardModal.subject,
      chapter: flashcardModal.chapter,
      knowledgeId: flashcardModal.knowledgeId,
    })
    setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })
    toast('闪卡已创建', 'success')
    navigate('/study/flashcards')
  }, [flashcardModal, toast, navigate])

  const toggleSubject = useCallback((id: string) => {
    setExpandedSubject((prev) => (prev === id ? null : id))
    setExpandedChapter(null)
  }, [])

  const toggleChapter = useCallback((id: string) => {
    setExpandedChapter((prev) => (prev === id ? null : id))
  }, [])

  const subjectsWithWeakFilter = useMemo(() => {
    if (!weakOnly) return subjects
    return subjects
      .map((sub) => ({
        ...sub,
        chapters: sub.chapters
          .map((ch) => ({
            ...ch,
            topics: ch.topics.filter((t) => t.mastery === 'weak'),
          }))
          .filter((ch) => ch.topics.length > 0),
      }))
      .filter((sub) => sub.chapters.length > 0)
  }, [subjects, weakOnly])

  return (
    <div className={styles.page}>
      <PageHeader
        title="知识体系"
        description="学科、章节与知识点管理"
        actions={
          <div className={styles.headerActions}>
            <label className={styles.weakToggle}>
              <input
                type="checkbox"
                checked={weakOnly}
                onChange={(e) => setWeakOnly(e.target.checked)}
              />
              <span>仅看薄弱</span>
            </label>
            <Button onClick={() => setShowSubjectModal(true)}>添加学科</Button>
          </div>
        }
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : subjectsWithWeakFilter.length === 0 ? (
        <EmptyState
          icon="📚"
          title={weakOnly ? '没有薄弱知识点' : '还没有学科'}
          description={weakOnly ? '所有知识点都掌握得很好！' : '点击上方按钮添加第一个学科'}
          action={!weakOnly ? <Button onClick={() => setShowSubjectModal(true)}>添加学科</Button> : undefined}
        />
      ) : (
        <div className={styles.tree}>
          {subjectsWithWeakFilter.map((subject) => (
            <Card key={subject.id} className={styles.subjectCard}>
              <div className={styles.subjectHeader}>
                <button
                  className={styles.subjectToggle}
                  onClick={() => toggleSubject(subject.id)}
                >
                  <span className={`${styles.chevron} ${expandedSubject === subject.id ? styles.chevronOpen : ''}`}>
                    ▶
                  </span>
                  <h3 className={styles.subjectName}>{subject.name}</h3>
                  <span className={styles.countBadge}>
                    {subject.chapters.length} 章 · {subject.chapters.reduce((s, ch) => s + ch.topics.length, 0)} 知识点
                  </span>
                </button>
                <div className={styles.subjectActions}>
                  {confirmDeleteSubject === subject.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteSubject(subject.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteSubject(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteSubject(subject.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>

              {expandedSubject === subject.id && (
                <div className={styles.chapterList}>
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.id} className={styles.chapterItem}>
                      <div className={styles.chapterHeader}>
                        <button
                          className={styles.chapterToggle}
                          onClick={() => toggleChapter(chapter.id)}
                        >
                          <span className={`${styles.chevron} ${expandedChapter === chapter.id ? styles.chevronOpen : ''}`}>
                            ▶
                          </span>
                          <span className={styles.chapterName}>{chapter.name}</span>
                          <span className={styles.chapterCount}>{chapter.topics.length} 知识点</span>
                        </button>
                        <div className={styles.chapterActions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAddingTopicFor({ subjectId: subject.id, chapterId: chapter.id })
                              setNewTopicName('')
                            }}
                          >
                            +知识点
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChapter(subject.id, chapter.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>

                      {expandedChapter === chapter.id && (
                        <div className={styles.topicList}>
                          {addingTopicFor?.chapterId === chapter.id && (
                            <div className={styles.inlineAdd}>
                              <input
                                className={styles.inlineInput}
                                placeholder="新知识点名称..."
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTopic()
                                  if (e.key === 'Escape') setAddingTopicFor(null)
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={handleAddTopic}>添加</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAddingTopicFor(null)}>
                                取消
                              </Button>
                            </div>
                          )}

                          {chapter.topics.length === 0 && !addingTopicFor && (
                            <div className={styles.emptyTopic}>暂无知识点</div>
                          )}

                          {chapter.topics.map((topic) => {
                            const mastery = topic.mastery
                            const flashcardCount = getFlashcardCount(topic.id)
                            const lastReview = getLastReviewDate(topic.id)

                            return (
                              <div key={topic.id} className={styles.topicItem}>
                                <div className={styles.topicInfo}>
                                  <span className={styles.topicName}>{topic.name}</span>
                                  <div className={styles.topicBadges}>
                                    <button
                                      className={styles.masteryBadge}
                                      onClick={() =>
                                        handleMasteryToggle(subject.id, chapter.id, topic.id, mastery)
                                      }
                                      title="点击切换掌握程度"
                                    >
                                      <Badge variant={MASTERY_VARIANTS[mastery]}>
                                        {MASTERY_LABELS[mastery]}
                                      </Badge>
                                    </button>
                                    {topic.relatedMistakes.length > 0 && (
                                      <Badge variant="danger">
                                        错题 {topic.relatedMistakes.length}
                                      </Badge>
                                    )}
                                    {flashcardCount > 0 && (
                                      <Badge variant="info">
                                        闪卡 {flashcardCount}
                                      </Badge>
                                    )}
                                    {lastReview && (
                                      <span className={styles.lastReview}>
                                        最近复习: {lastReview}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.topicActions}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenFlashcardModal(subject.name, chapter.name, topic.id)
                                    }
                                  >
                                    新建闪卡
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteTopic(subject.id, chapter.id, topic.id)
                                    }
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add chapter inline */}
                  {addingChapterFor === subject.id ? (
                    <div className={styles.inlineAdd}>
                      <input
                        className={styles.inlineInput}
                        placeholder="新章节名称..."
                        value={newChapterName}
                        onChange={(e) => setNewChapterName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddChapter(subject.id)
                          if (e.key === 'Escape') {
                            setAddingChapterFor(null)
                            setNewChapterName('')
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleAddChapter(subject.id)}>添加</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setAddingChapterFor(null)
                        setNewChapterName('')
                      }}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <button
                      className={styles.addChapterBtn}
                      onClick={() => {
                        setAddingChapterFor(subject.id)
                        setNewChapterName('')
                      }}
                    >
                      + 添加章节
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add subject modal */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="添加学科"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>学科名称</label>
            <input
              className={styles.input}
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="例如：数学、英语、物理"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubject()
              }}
              autoFocus
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowSubjectModal(false)}>
              取消
            </Button>
            <Button onClick={handleAddSubject}>添加</Button>
          </div>
        </div>
      </Modal>

      {/* Flashcard create modal */}
      <Modal
        isOpen={flashcardModal.open}
        onClose={() => setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })}
        title="新建闪卡"
      >
        <div className={styles.form}>
          <p className={styles.flashcardInfo}>
            将在 <strong>{flashcardModal.subject}</strong> - <strong>{flashcardModal.chapter}</strong> 下创建闪卡
          </p>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })}
            >
              取消
            </Button>
            <Button onClick={handleCreateFlashcard}>创建并前往编辑</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}