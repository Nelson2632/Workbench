import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
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
  countReviews,
  getSubjectTimeMap,
} from '@/domain/review/reviewAggregator'
import { formatDate } from '@/utils/helpers'
import { reviewChartPalette } from '@/utils/chartTheme'
import styles from './WeeklyReviewPage.module.css'

echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const WEEKLY_QUESTIONS = [
  { key: 'q1', label: '本周最重要的三件事' },
  { key: 'q2', label: '本周做得最好的事' },
  { key: 'q3', label: '本周最大的浪费' },
  { key: 'q4', label: '下周继续什么' },
  { key: 'q5', label: '下周停止什么' },
  { key: 'q6', label: '下周开始什么' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekRange(offset = 0): { start: string; end: string } {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  }
}

export default function WeeklyReviewPage() {
  const { reviews, templates, loadAll, addReview, updateReview, getAutoSummary } = useReviewStore()
  const { tasks, loadTasks } = useTaskStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { subjects, mistakes, reading, loadSubjects, loadMistakes, loadReading } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  const weekRange = useMemo(() => getWeekRange(), [])

  useEffect(() => {
    Promise.all([
      loadAll(),
      loadTasks(),
      loadPomodoroLogs(),
      loadSubjects(),
      loadMistakes(),
      loadReading(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadTasks, loadPomodoroLogs, loadSubjects, loadMistakes, loadReading])

  // Auto-summary
  useEffect(() => {
    getAutoSummary('weekly', weekRange).then(setSummary)
  }, [getAutoSummary, weekRange])

  // 派生指标（纯函数，替代内联 filter/reduce）
  const taskStats = useMemo(
    () => getTaskStats(tasks, weekRange),
    [tasks, weekRange],
  )
  const pomodoroStats = useMemo(
    () => getPomodoroStats(pomodoroLogs, weekRange),
    [pomodoroLogs, weekRange],
  )
  const mistakeCount = useMemo(
    () => countMistakes(mistakes, weekRange),
    [mistakes, weekRange],
  )
  const readingPages = useMemo(
    () => sumReadingPages(reading, weekRange),
    [reading, weekRange],
  )
  const reviewCount = useMemo(
    () => countReviews(reviews, weekRange),
    [reviews, weekRange],
  )
  const subjectTimeMap = useMemo(
    () => getSubjectTimeMap(pomodoroLogs, weekRange),
    [pomodoroLogs, weekRange],
  )

  const pieChartOption = useMemo(() => {
    const data = Object.entries(subjectTimeMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round((value / 60) * 10) / 10,
      }))
    if (data.length === 0) return null
    const palette = reviewChartPalette
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c}h ({d}%)',
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 12, color: palette.textSecondary },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 11,
            color: palette.textSecondary,
            formatter: '{b}\n{d}%',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
        },
      ],
    }
  }, [subjectTimeMap])

  // Check if already reviewed this week
  const thisWeekReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'weekly' && r.dateRange.start === weekRange.start,
      ),
    [reviews, weekRange],
  )

  // Past reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter(
          (r) => r.type === 'weekly' && r.dateRange.start !== weekRange.start,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, weekRange],
  )

  // Templates
  const weeklyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'weekly'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const nextActionsList = nextActions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (thisWeekReview) {
        // §4.2 冻结：updateReview 不重算/不覆盖 autoSummary
        await updateReview(thisWeekReview.id, {
          answers,
          nextActions: nextActionsList,
        })
      } else {
        await addReview({
          type: 'weekly',
          dateRange: weekRange,
          autoSummary: summary,
          answers,
          nextActions: nextActionsList,
        })
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, updateReview, thisWeekReview, weekRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (WEEKLY_QUESTIONS[i]) {
          mapped[WEEKLY_QUESTIONS[i].key] = answers[WEEKLY_QUESTIONS[i].key] || ''
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
        <PageHeader title="周复盘" description="本周总结与下周计划" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="周复盘" description="本周总结与下周计划" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(pomodoroStats.minutes)}</div>
          <div className={styles.statLabel}>总学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{pomodoroStats.count}</div>
          <div className={styles.statLabel}>专注次数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingPages}</div>
          <div className={styles.statLabel}>阅读页数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {taskStats.completed}/{taskStats.total} ({taskStats.completionRate}%)
          </div>
          <div className={styles.statLabel}>任务完成率</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{mistakeCount}</div>
          <div className={styles.statLabel}>错题数量</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{reviewCount}</div>
          <div className={styles.statLabel}>复盘次数</div>
        </div>
      </div>

      {/* ECharts: Study time distribution */}
      {pieChartOption && (
        <div className={`${styles.chartCard} holo-panel`}>
          <h3 className={styles.chartTitle}>本周学习时间分布（按学科）</h3>
          <ReactEChartsCore
            echarts={echarts}
            option={pieChartOption}
            style={{ height: 280 }}
            notMerge
          />
        </div>
      )}

      {/* Already completed */}
      {thisWeekReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 本周已完成复盘</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnswers(thisWeekReview.answers || {})
                setNextActions((thisWeekReview.nextActions || []).join('\n'))
                setEditing(true)
              }}
            >
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {WEEKLY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {thisWeekReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {thisWeekReview.nextActions && thisWeekReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {thisWeekReview.nextActions.map((a, i) => (
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
            {thisWeekReview ? '编辑本周复盘' : '本周复盘'}
          </h3>

          {weeklyTemplates.length > 0 && (
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
                {weeklyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {WEEKLY_QUESTIONS.map((q) => (
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
              {saving ? '保存中...' : thisWeekReview ? '更新' : '保存'}
            </Button>
            {thisWeekReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史周复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史周复盘记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => (
              <div
                key={review.id}
                className={`${styles.historyItem} theme-interactive`}
                onClick={() => {
                  setAnswers(review.answers || {})
                  setEditing(true)
                }}
              >
                <span className={styles.historyDate}>
                  {review.dateRange.start} ~ {review.dateRange.end}
                </span>
                <span className={styles.historyMeta}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}