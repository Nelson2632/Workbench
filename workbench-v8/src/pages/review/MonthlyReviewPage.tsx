import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
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
  getPomodoroStats,
  getTaskStats,
  countMistakes,
  countReadingBooks,
  countReviews,
} from '@/domain/review/reviewAggregator'
import { formatDate } from '@/utils/helpers'
import { reviewChartPalette } from '@/utils/chartTheme'
import styles from './MonthlyReviewPage.module.css'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const MONTHLY_QUESTIONS = [
  { key: 'q1', label: '本月最重要的三件事' },
  { key: 'q2', label: '本月做得最好的事' },
  { key: 'q3', label: '本月最大的浪费' },
  { key: 'q4', label: '下个月继续什么' },
  { key: 'q5', label: '下个月停止什么' },
  { key: 'q6', label: '下个月开始什么' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  return {
    start: formatDate(first),
    end: formatDate(last),
  }
}

function getPrevMonthRange(): { start: string; end: string } {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return getMonthRange(d)
}

export default function MonthlyReviewPage() {
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

  const monthRange = useMemo(() => getMonthRange(), [])
  const prevMonthRange = useMemo(() => getPrevMonthRange(), [])

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

  // Auto-summary（月度快照，addReview 时写入；含热力图，需 db 枚举日期）
  useEffect(() => {
    getAutoSummary('monthly', monthRange).then(setSummary)
  }, [getAutoSummary, monthRange])

  // 派生指标（纯函数，替代内联 filter/reduce）
  const pomodoroStats = useMemo(
    () => getPomodoroStats(pomodoroLogs, monthRange),
    [pomodoroLogs, monthRange],
  )
  const taskStats = useMemo(
    () => getTaskStats(tasks, monthRange),
    [tasks, monthRange],
  )
  const mistakeCount = useMemo(
    () => countMistakes(mistakes, monthRange),
    [mistakes, monthRange],
  )
  const readingBooks = useMemo(
    () => countReadingBooks(reading, monthRange),
    [reading, monthRange],
  )
  const reviewCount = useMemo(
    () => countReviews(reviews, monthRange),
    [reviews, monthRange],
  )
  const prevPomodoroStats = useMemo(
    () => getPomodoroStats(pomodoroLogs, prevMonthRange),
    [pomodoroLogs, prevMonthRange],
  )

  // ECharts: monthly study trend comparison
  const comparisonChartOption = useMemo(() => {
    const palette = reviewChartPalette
    const thisMonth = Math.round(pomodoroStats.minutes / 60)
    const lastMonth = Math.round(prevPomodoroStats.minutes / 60)
    const thisMonthLabel = `${monthRange.start.slice(5, 7)}月`
    const lastMonthLabel = `${prevMonthRange.start.slice(5, 7)}月`
    return {
      grid: { left: 44, right: 16, top: 16, bottom: 28 },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (p: any) => `${p[0].name}: ${p[0].value}h`,
      },
      xAxis: {
        type: 'category' as const,
        data: [lastMonthLabel, thisMonthLabel],
        axisLabel: { fontSize: 12, color: palette.textSecondary },
        axisLine: { lineStyle: { color: palette.border } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'h',
        axisLabel: { fontSize: 11, color: palette.textSecondary },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: [
        {
          type: 'bar' as const,
          data: [lastMonth, thisMonth],
          barWidth: 40,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: palette.accent },
              { offset: 1, color: palette.accentSoft },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }
  }, [pomodoroStats, prevPomodoroStats, monthRange, prevMonthRange])

  // Check if already reviewed this month
  const thisMonthReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'monthly' && r.dateRange.start === monthRange.start,
      ),
    [reviews, monthRange],
  )

  // Past reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter(
          (r) => r.type === 'monthly' && r.dateRange.start !== monthRange.start,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, monthRange],
  )

  // Templates
  const monthlyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'monthly'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const nextActionsList = nextActions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (thisMonthReview) {
        // §4.2 冻结：updateReview 不重算/不覆盖 autoSummary
        await updateReview(thisMonthReview.id, {
          answers,
          nextActions: nextActionsList,
        })
      } else {
        await addReview({
          type: 'monthly',
          dateRange: monthRange,
          autoSummary: summary,
          answers,
          nextActions: nextActionsList,
        })
      }
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, updateReview, thisMonthReview, monthRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (MONTHLY_QUESTIONS[i]) {
          mapped[MONTHLY_QUESTIONS[i].key] = answers[MONTHLY_QUESTIONS[i].key] || ''
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
        <PageHeader title="月复盘" description="月度回顾与长期目标追踪" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="月复盘" description="月度回顾与长期目标追踪" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(pomodoroStats.minutes)}</div>
          <div className={styles.statLabel}>学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{pomodoroStats.count}</div>
          <div className={styles.statLabel}>专注次数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingBooks}</div>
          <div className={styles.statLabel}>阅读本数</div>
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

      {/* Monthly Report Visual */}
      <div className={`${styles.reportCard} holo-panel`}>
        <h3 className={styles.reportTitle}>
          {monthRange.start.slice(0, 7)} 月度报告
        </h3>
        <div className={styles.reportGrid}>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>⏱️</div>
            <div className={styles.reportItemValue}>{formatDuration(pomodoroStats.minutes)}</div>
            <div className={styles.reportItemLabel}>学习时长</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>🎯</div>
            <div className={styles.reportItemValue}>{pomodoroStats.count}次</div>
            <div className={styles.reportItemLabel}>专注次数</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>📚</div>
            <div className={styles.reportItemValue}>{readingBooks}本</div>
            <div className={styles.reportItemLabel}>阅读量</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>✅</div>
            <div className={styles.reportItemValue}>{taskStats.completionRate}%</div>
            <div className={styles.reportItemLabel}>完成率</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>❌</div>
            <div className={styles.reportItemValue}>{mistakeCount}</div>
            <div className={styles.reportItemLabel}>错题</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>📝</div>
            <div className={styles.reportItemValue}>{reviewCount}次</div>
            <div className={styles.reportItemLabel}>复盘</div>
          </div>
        </div>
      </div>

      {/* ECharts: Monthly Comparison */}
      <div className={`${styles.chartCard} holo-panel`}>
        <h3 className={styles.chartTitle}>月度学习趋势（本月 vs 上月）</h3>
        <ReactEChartsCore
          echarts={echarts}
          option={comparisonChartOption}
          style={{ height: 240 }}
          notMerge
        />
      </div>

      {/* Already completed */}
      {thisMonthReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 本月已完成复盘</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAnswers(thisMonthReview.answers || {})
                setNextActions((thisMonthReview.nextActions || []).join('\n'))
                setEditing(true)
              }}
            >
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {MONTHLY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {thisMonthReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {thisMonthReview.nextActions && thisMonthReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {thisMonthReview.nextActions.map((a, i) => (
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
            {thisMonthReview ? '编辑本月复盘' : '本月复盘'}
          </h3>

          {monthlyTemplates.length > 0 && (
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
                {monthlyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {MONTHLY_QUESTIONS.map((q) => (
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
              {saving ? '保存中...' : thisMonthReview ? '更新' : '保存'}
            </Button>
            {thisMonthReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史月复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史月复盘记录" />
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