import { useEffect, useState, useMemo, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyStore } from '@/stores/studyStore'
import { useToolStore } from '@/stores/toolStore'
import { useTaskStore } from '@/stores/taskStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { getSubjectMetrics } from '@/domain/review/reviewAggregator'
import { formatDate } from '@/utils/helpers'
import styles from './SubjectReviewPage.module.css'

const SUBJECT_QUESTIONS = [
  { key: 'q1', label: '本周最大的知识漏洞？' },
  { key: 'q2', label: '最大的错误类型？' },
  { key: 'q3', label: '下周最应该解决的三个问题？' },
  { key: 'q4', label: '学习策略需要调整吗？' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  }
}

export default function SubjectReviewPage() {
  const { reviews, templates, loadAll, addReview } = useReviewStore()
  const { subjects, mistakes, loadSubjects, loadMistakes } = useStudyStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { tasks, loadTasks } = useTaskStore()
  const { reviews: flashcardReviews, loadAll: loadFlashcards } = useFlashcardStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [historyFilter, setHistoryFilter] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  const weekRange = useMemo(() => getWeekRange(), [])

  useEffect(() => {
    Promise.all([
      loadAll(),
      loadSubjects(),
      loadMistakes(),
      loadPomodoroLogs(),
      loadTasks(),
      loadFlashcards(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadSubjects, loadMistakes, loadPomodoroLogs, loadTasks, loadFlashcards])

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId],
  )

  // 派生指标（纯函数 getSubjectMetrics，替代 getAutoSummary('subject') + 内联 override）
  const summary = useMemo(() => {
    if (!selectedSubjectId || !selectedSubject) return null
    return getSubjectMetrics({
      subject: selectedSubject,
      range: weekRange,
      tasks,
      pomodoros: pomodoroLogs,
      mistakes,
      flashcardReviews,
    })
  }, [selectedSubjectId, selectedSubject, weekRange, tasks, pomodoroLogs, mistakes, flashcardReviews])

  // Subject-specific templates
  const subjectTemplates = useMemo(
    () => templates.filter((t) => t.type === 'subject'),
    [templates],
  )

  // Past reviews for this subject
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'subject')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  const filteredHistory = useMemo(
    () =>
      historyFilter
        ? pastReviews.filter((r) => r.subjectId === historyFilter)
        : pastReviews,
    [pastReviews, historyFilter],
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedSubjectId) return
    setSaving(true)
    try {
      await addReview({
        type: 'subject',
        dateRange: weekRange,
        subjectId: selectedSubjectId,
        autoSummary: summary ?? undefined,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setAnswers({})
    } finally {
      setSaving(false)
    }
  }, [selectedSubjectId, weekRange, summary, answers, nextActions, addReview])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (SUBJECT_QUESTIONS[i]) {
          mapped[SUBJECT_QUESTIONS[i].key] = answers[SUBJECT_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="学科复盘" description="按学科回顾学习进度与薄弱点" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="学科复盘" description="按学科回顾学习进度与薄弱点" />

      {/* Subject Selector */}
      <div className={styles.selector}>
        <span className={styles.selectorLabel}>选择学科</span>
        <select
          className={styles.selectorSelect}
          value={selectedSubjectId}
          onChange={(e) => {
            setSelectedSubjectId(e.target.value)
            setAnswers({})
          }}
        >
          <option value="">请选择学科</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedSubjectId ? (
        <div className={styles.emptySubject}>
          请选择一个学科开始复盘
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {formatDuration(summary?.studyDuration ?? 0)}
              </div>
              <div className={styles.statLabel}>本周学习时长</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{summary?.newMistakes ?? 0}</div>
              <div className={styles.statLabel}>新增错题</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{summary?.weakKnowledgePoints.length ?? 0}</div>
              <div className={styles.statLabel}>薄弱知识点</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {summary?.taskCompletionRate ?? 0}%
              </div>
              <div className={styles.statLabel}>任务完成率</div>
            </div>
          </div>

          {/* Form */}
          <div className={styles.form}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
              {selectedSubject?.name} 本周复盘
            </h3>

            {subjectTemplates.length > 0 && (
              <div className={styles.formSection}>
                <label className={styles.formLabel}>使用模板</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    color: 'var(--color-text-primary)',
                    fontSize: 14,
                  }}
                >
                  <option value="">不使用模板</option>
                  {subjectTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {SUBJECT_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.formSection}>
                <label className={styles.formLabel}>{q.label}</label>
                <textarea
                  className={styles.formTextarea}
                  value={answers[q.key] || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                  }
                  placeholder="请输入..."
                />
              </div>
            ))}

            <div className={styles.formSection}>
              <label className={styles.formLabel}>下一步行动（每行一条）</label>
              <textarea
                className={styles.formTextarea}
                value={nextActions}
                onChange={(e) => setNextActions(e.target.value)}
                placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
              />
            </div>

            <div className={styles.formActions}>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史学科复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史复盘记录" />
        ) : (
          <>
            <div className={styles.historyFilters}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                筛选学科：
              </span>
              <select
                className={styles.filterSelect}
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="">全部</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.historyList}>
              {filteredHistory.slice(0, 20).map((review) => {
                const subj = subjects.find((s) => s.id === review.subjectId)
                return (
                  <div
                    key={review.id}
                    className={styles.historyItem}
                    onClick={() => {
                      setSelectedSubjectId(review.subjectId || '')
                      setAnswers(review.answers || {})
                    }}
                  >
                    <span className={styles.historyDate}>
                      {review.dateRange.start} ~ {review.dateRange.end}
                    </span>
                    <span className={styles.historySubject}>
                      {subj?.name || '未知学科'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}