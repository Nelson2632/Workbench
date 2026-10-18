import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyStore } from '@/stores/studyStore'
import { getExamMetrics, getPrevExam, getMistakesOnDate } from '@/domain/review/reviewAggregator'
import { reviewChartPalette } from '@/utils/chartTheme'
import styles from './ExamReviewPage.module.css'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const EXAM_QUESTIONS = [
  { key: 'q1', label: '这次考试反映出的最大问题？' },
  { key: 'q2', label: '哪些知识点需要重点复习？' },
  { key: 'q3', label: '考试策略需要调整吗？' },
  { key: 'q4', label: '下一阶段调整建议' },
]

export default function ExamReviewPage() {
  const { reviews, templates, loadAll, addReview } = useReviewStore()
  const { exams, mistakes, loadExams, loadMistakes } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  useEffect(() => {
    Promise.all([loadAll(), loadExams(), loadMistakes()]).then(() =>
      setLoading(false),
    )
  }, [loadAll, loadExams, loadMistakes])

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId),
    [exams, selectedExamId],
  )

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => a.date.localeCompare(b.date)),
    [exams],
  )

  // 前一场考试（环比，纯函数）
  const prevExam = useMemo(
    () => getPrevExam(exams, selectedExamId),
    [exams, selectedExamId],
  )

  // 该考试当天错题（纯函数）
  const examMistakes = useMemo(
    () => (selectedExam ? getMistakesOnDate(mistakes, selectedExam.date) : []),
    [selectedExam, mistakes],
  )

  // 考试指标（纯函数，替代内联 scoreChange/subjectScoreChanges/mistakeTypeDist/knowledgeDist）
  const examMetrics = useMemo(
    () => getExamMetrics({ exam: selectedExam, prevExam, mistakes: examMistakes }),
    [selectedExam, prevExam, examMistakes],
  )

  const mistakeTypeChartOption = useMemo(() => {
    const data = Object.entries(examMetrics.mistakeTypeDist).map(([name, value]) => ({
      name,
      value,
    }))
    if (data.length === 0) return null
    const palette = reviewChartPalette
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: palette.textSecondary },
      },
      series: [
        {
          type: 'pie' as const,
          radius: '65%',
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 10,
            color: palette.textSecondary,
            formatter: '{b}\n{d}%',
          },
        },
      ],
    }
  }, [examMetrics.mistakeTypeDist])

  const knowledgeChartOption = useMemo(() => {
    const data = Object.entries(examMetrics.knowledgeDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
    if (data.length === 0) return null
    const palette = reviewChartPalette
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: palette.textSecondary },
      },
      series: [
        {
          type: 'pie' as const,
          radius: '65%',
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 10,
            color: palette.textSecondary,
            formatter: '{b}\n{d}%',
          },
        },
      ],
    }
  }, [examMetrics.knowledgeDist])

  // Auto-fill suggestions
  useEffect(() => {
    if (!selectedExam) return
    const weakPoints = examMistakes
      .filter((m) => !m.mastered)
      .map((m) => m.linkedKnowledge)
      .flat()
    const uniqueWeak = [...new Set(weakPoints)]
    const suggestion = uniqueWeak.length > 0
      ? `建议重点复习以下知识点：${uniqueWeak.slice(0, 5).join('、')}。错题类型主要集中在${Object.entries(examMetrics.mistakeTypeDist).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join('、')}方面。`
      : '请根据考试情况填写调整建议。'
    setAnswers((prev) => ({ ...prev, q4: prev.q4 || suggestion }))
  }, [selectedExamId])

  // Check if already reviewed for this exam
  const existingReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'exam' && r.examId === selectedExamId,
      ),
    [reviews, selectedExamId],
  )

  // Past exam reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'exam')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  // Templates
  const examTemplates = useMemo(
    () => templates.filter((t) => t.type === 'exam'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedExamId || !selectedExam) return
    setSaving(true)
    try {
      await addReview({
        type: 'exam',
        dateRange: { start: selectedExam.date, end: selectedExam.date },
        examId: selectedExamId,
        autoSummary: examMetrics,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }, [selectedExamId, selectedExam, examMetrics, answers, nextActions, addReview])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (EXAM_QUESTIONS[i]) {
          mapped[EXAM_QUESTIONS[i].key] = answers[EXAM_QUESTIONS[i].key] || ''
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
        <PageHeader title="考试复盘" description="考试分析与改进计划" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="考试复盘" description="考试分析与改进计划" />

      {/* Exam Selector */}
      <div className={styles.selector}>
        <span className={styles.selectorLabel}>选择考试</span>
        <select
          className={styles.selectorSelect}
          value={selectedExamId}
          onChange={(e) => {
            setSelectedExamId(e.target.value)
            setAnswers({})
          }}
        >
          <option value="">请选择考试</option>
          {sortedExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.date})
            </option>
          ))}
        </select>
      </div>

      {!selectedExamId ? (
        <div className={styles.emptySubject}>请选择一次考试开始复盘</div>
      ) : (
        <>
          {/* Analysis */}
          <div className={`${styles.analysisCard} holo-panel`}>
            <h3 className={styles.analysisTitle}>考试分析：{selectedExam?.name}</h3>

            <div className={styles.analysisGrid}>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{selectedExam?.total || 0}</div>
                <div className={styles.analysisItemLabel}>总分</div>
                {examMetrics.scoreChange !== 0 && (
                  <div
                    className={`${styles.analysisItemChange} ${examMetrics.scoreChange > 0 ? styles.analysisUp : styles.analysisDown}`}
                  >
                    {examMetrics.scoreChange > 0 ? '↑' : '↓'} {Math.abs(examMetrics.scoreChange)} 分
                  </div>
                )}
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{Object.keys(selectedExam?.scores || {}).length}</div>
                <div className={styles.analysisItemLabel}>考试科目</div>
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{examMistakes.length}</div>
                <div className={styles.analysisItemLabel}>关联错题</div>
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>
                  {selectedExam?.rank || '—'}
                </div>
                <div className={styles.analysisItemLabel}>排名</div>
              </div>
            </div>

            {/* Per-subject scores */}
            {examMetrics.subjectScores.length > 0 && (
              <div className={styles.subjectScores}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                  各科成绩变化
                </div>
                {examMetrics.subjectScores.map((s) => (
                  <div key={s.name} className={styles.subjectScoreRow}>
                    <span className={styles.subjectScoreName}>{s.name}</span>
                    <span>
                      <span className={styles.subjectScoreValue}>{s.current}</span>
                      {s.change !== 0 && (
                        <span
                          className={`${styles.subjectScoreChange} ${s.change > 0 ? styles.analysisUp : styles.analysisDown}`}
                        >
                          {s.change > 0 ? '+' : ''}{s.change}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className={styles.chartsRow}>
            {mistakeTypeChartOption && (
              <div className={`${styles.chartCard} holo-panel`}>
                <h3 className={styles.chartTitle}>错题类型分布</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={mistakeTypeChartOption}
                  style={{ height: 220 }}
                  notMerge
                />
              </div>
            )}
            {knowledgeChartOption && (
              <div className={`${styles.chartCard} holo-panel`}>
                <h3 className={styles.chartTitle}>知识点分布</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={knowledgeChartOption}
                  style={{ height: 220 }}
                  notMerge
                />
              </div>
            )}
          </div>

          {/* Review Form */}
          {existingReview ? (
            <div className={styles.completedView}>
              <div className={styles.completedHeader}>
                <span className={styles.completedBadge}>✓ 已完成复盘</span>
              </div>
              <div className={styles.completedAnswers}>
                {EXAM_QUESTIONS.map((q) => (
                  <div key={q.key} className={styles.answerItem}>
                    <p className={styles.answerQuestion}>{q.label}</p>
                    <p className={styles.answerText}>
                      {existingReview.answers?.[q.key] || '—'}
                    </p>
                  </div>
                ))}
              </div>
              {existingReview.nextActions && existingReview.nextActions.length > 0 && (
                <div className={styles.completedNext}>
                  <h4 className={styles.nextTitle}>下一步</h4>
                  <ul className={styles.nextList}>
                    {existingReview.nextActions.map((a, i) => (
                      <li key={i} className={styles.nextItem}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.form}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                考试复盘
              </h3>

              {examTemplates.length > 0 && (
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
                    {examTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {EXAM_QUESTIONS.map((q) => (
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
          )}
        </>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史考试复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史考试复盘记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => {
              const exam = exams.find((e) => e.id === review.examId)
              return (
                <div
                  key={review.id}
                  className={`${styles.historyItem} theme-interactive`}
                  onClick={() => {
                    setSelectedExamId(review.examId || '')
                    setAnswers(review.answers || {})
                  }}
                >
                  <span className={styles.historyDate}>
                    {exam?.name || '考试'}
                  </span>
                  <span className={styles.historyMeta}>
                    {review.dateRange.start}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}