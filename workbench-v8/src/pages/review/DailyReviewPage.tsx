import { useEffect, useState, useMemo, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import {
  getTaskStats,
  getPomodoroStats,
  countMistakes,
  sumReadingPages,
} from '@/domain/review/reviewAggregator'
import { formatDate } from '@/utils/helpers'
import styles from './DailyReviewPage.module.css'

const DAILY_QUESTIONS = [
  { key: 'q1', label: '今天最重要的三件事是什么？' },
  { key: 'q2', label: '今天完成得最好的是？' },
  { key: 'q3', label: '今天最大的阻碍是什么？' },
  { key: 'q4', label: '哪件事估计错了时间？' },
  { key: 'q5', label: '哪件事明天必须调整？' },
  { key: 'q6', label: '明天最重要的三件事？' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function DailyReviewPage() {
  const { reviews, templates, loadAll, addReview, updateReview, getAutoSummary } = useReviewStore()
  const { tasks, loadTasks } = useTaskStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { mistakes, reading, loadMistakes, loadReading } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [nextActions, setNextActions] = useState('')

  const todayStr = formatDate(new Date())
  const todayRange = { start: todayStr, end: todayStr }

  // Load all data
  useEffect(() => {
    Promise.all([
      loadAll(),
      loadTasks(),
      loadPomodoroLogs(),
      loadMistakes(),
      loadReading(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadTasks, loadPomodoroLogs, loadMistakes, loadReading])

  // Auto-summary
  useEffect(() => {
    getAutoSummary('daily', todayRange).then(setSummary)
  }, [getAutoSummary])

  // 派生指标（纯函数，实时从 facts 重算，替代内联 filter/reduce）
  const todayTaskStats = useMemo(
    () => getTaskStats(tasks, todayRange),
    [tasks, todayStr],
  )
  const todayPomodoroStats = useMemo(
    () => getPomodoroStats(pomodoroLogs, todayRange),
    [pomodoroLogs, todayStr],
  )
  const todayMistakeCount = useMemo(
    () => countMistakes(mistakes, todayRange),
    [mistakes, todayStr],
  )
  const readingPages = useMemo(
    () => sumReadingPages(reading, todayRange),
    [reading, todayStr],
  )

  // Check if already reviewed today
  const todayReview = useMemo(
    () => reviews.find((r) => r.type === 'daily' && r.dateRange.start === todayStr),
    [reviews, todayStr],
  )

  // Past daily reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'daily' && r.dateRange.start !== todayStr)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, todayStr],
  )

  // Templates for daily
  const dailyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'daily'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const nextActionsList = nextActions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (todayReview) {
        // §4.2 冻结：updateReview 不重算/不覆盖 autoSummary（快照仅在 addReview 时写一次）
        await updateReview(todayReview.id, {
          answers,
          nextActions: nextActionsList,
        })
      } else {
        await addReview({
          type: 'daily',
          dateRange: todayRange,
          autoSummary: summary,
          answers,
          nextActions: nextActionsList,
        })
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, updateReview, todayReview, todayRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (DAILY_QUESTIONS[i]) {
          mapped[DAILY_QUESTIONS[i].key] = answers[DAILY_QUESTIONS[i].key] || ''
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
        <PageHeader title="今日复盘" description="回顾今日完成情况与反思" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="今日复盘" description="回顾今日完成情况与反思" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {todayTaskStats.completed}/{todayTaskStats.total}
          </div>
          <div className={styles.statLabel}>今日完成任务 {todayTaskStats.completionRate}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(todayPomodoroStats.minutes)}</div>
          <div className={styles.statLabel}>学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{todayPomodoroStats.count}</div>
          <div className={styles.statLabel}>番茄 {todayPomodoroStats.count > 0 ? '次' : ''}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{todayMistakeCount}</div>
          <div className={styles.statLabel}>错题</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingPages}</div>
          <div className={styles.statLabel}>阅读 页</div>
        </div>
      </div>

      {/* Already completed today */}
      {todayReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 今日已完成复盘</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnswers(todayReview.answers || {})
                setNextActions((todayReview.nextActions || []).join('\n'))
                setEditing(true)
              }}
            >
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {DAILY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {todayReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {todayReview.nextActions && todayReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {todayReview.nextActions.map((a, i) => (
                  <li key={i} className={styles.nextItem}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Review Form */
        <div className={styles.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
            {todayReview ? '编辑今日复盘' : '今日复盘'}
          </h3>

          {/* Template selector */}
          {dailyTemplates.length > 0 && (
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
                {dailyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {DAILY_QUESTIONS.map((q) => (
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
              {saving ? '保存中...' : todayReview ? '更新' : '保存'}
            </Button>
            {todayReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史复盘记录" description="完成今日复盘后，这里会显示历史记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => (
              <div
                key={review.id}
                className={styles.historyItem}
                onClick={() => {
                  setAnswers(review.answers || {})
                  setEditing(true)
                }}
              >
                <span className={styles.historyDate}>
                  {new Date(review.dateRange.start).toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className={styles.historyMeta}>
                  {new Date(review.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}