import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useSystemStore } from '@/stores/systemStore'
import { useToast } from '@/components/ui/Toast'
import { globalChartPalette } from '@/utils/chartTheme'
import styles from './ExamsPage.module.css'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface FormData {
  name: string
  date: string
  scores: Record<string, number>
  assignedScores: Record<string, number>
  rank: number
  note: string
}

const EMPTY_FORM: FormData = {
  name: '',
  date: new Date().toISOString().slice(0, 10),
  scores: {},
  assignedScores: {},
  rank: 0,
  note: '',
}

export default function ExamsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const theme = useSystemStore((s) => s.theme)
  const { subjects, exams, loading, loadSubjects, loadExams, addExam, updateExam, deleteExam } =
    useStudyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadSubjects()
    loadExams()
  }, [loadSubjects, loadExams])

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => b.date.localeCompare(a.date)),
    [exams],
  )

  const totalScore = useMemo(
    () => Object.values(form.scores).reduce((s, v) => s + v, 0),
    [form.scores],
  )

  const assignedTotal = useMemo(
    () => Object.values(form.assignedScores).reduce((s, v) => s + v, 0),
    [form.assignedScores],
  )

  const getScoreChange = useCallback(
    (idx: number) => {
      if (idx >= sortedExams.length - 1) return null
      const prev = sortedExams[idx + 1]
      return sortedExams[idx].total - prev.total
    },
    [sortedExams],
  )

  const openCreate = useCallback(() => {
    setEditingId(null)
    const initialScores: Record<string, number> = {}
    const initialAssigned: Record<string, number> = {}
    for (const sub of subjects) {
      initialScores[sub.name] = 0
      initialAssigned[sub.name] = 0
    }
    setForm({ ...EMPTY_FORM, scores: initialScores, assignedScores: initialAssigned })
    setModalOpen(true)
  }, [subjects])

  const openEdit = useCallback(
    (exam: typeof sortedExams[0]) => {
      setEditingId(exam.id)
      const scores: Record<string, number> = {}
      const assignedScores: Record<string, number> = {}
      for (const sub of subjects) {
        scores[sub.name] = exam.scores[sub.name] ?? 0
        assignedScores[sub.name] = exam.assignedScores?.[sub.name] ?? 0
      }
      for (const key of Object.keys(exam.scores)) {
        if (!(key in scores)) scores[key] = exam.scores[key]
      }
      for (const key of Object.keys(exam.assignedScores || {})) {
        if (!(key in assignedScores)) assignedScores[key] = exam.assignedScores[key]
      }
      setForm({
        name: exam.name,
        date: exam.date,
        scores,
        assignedScores,
        rank: exam.rank,
        note: exam.note,
      })
      setModalOpen(true)
    },
    [subjects],
  )

  const handleSave = useCallback(async () => {
    const name = form.name.trim()
    if (!name) {
      toast('请输入考试名称', 'warning')
      return
    }
    if (!form.date) {
      toast('请选择日期', 'warning')
      return
    }

    const payload = {
      name,
      date: form.date,
      scores: form.scores,
      assignedScores: form.assignedScores,
      total: totalScore,
      assignedTotal,
      rank: form.rank,
      note: form.note,
    }

    if (editingId) {
      await updateExam(editingId, payload)
      toast('已更新', 'success')
    } else {
      await addExam(payload)
      toast('已录入', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, totalScore, assignedTotal, addExam, updateExam, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteExam(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteExam, toast],
  )

  const handleScoreChange = useCallback(
    (subject: string, value: string) => {
      const num = parseInt(value, 10) || 0
      setForm((f) => ({
        ...f,
        scores: { ...f.scores, [subject]: num },
      }))
    },
    [],
  )

  const handleAssignedScoreChange = useCallback(
    (subject: string, value: string) => {
      const num = parseInt(value, 10) || 0
      setForm((f) => ({
        ...f,
        assignedScores: { ...f.assignedScores, [subject]: num },
      }))
    },
    [],
  )

  // Chart: total score trend
  const trendData = useMemo(
    () =>
      [...exams]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          name: e.name,
          date: e.date,
          score: e.total,
        })),
    [exams],
  )

  const totalChartOption = useMemo(
    () => {
      const palette = globalChartPalette()
      return {
        grid: { left: 44, right: 16, top: 16, bottom: 32 },
        tooltip: { trigger: 'axis' as const },
        xAxis: {
          type: 'category' as const,
          data: trendData.map((e) => e.name),
          axisLabel: { fontSize: 11, color: palette.textSecondary, rotate: trendData.length > 5 ? 30 : 0 },
          axisLine: { lineStyle: { color: palette.border } },
        },
        yAxis: {
          type: 'value' as const,
          axisLabel: { fontSize: 11, color: palette.textSecondary },
          splitLine: { lineStyle: { color: palette.grid } },
        },
        series: [
          {
            name: '总分',
            type: 'line' as const,
            data: trendData.map((e) => e.score),
            smooth: true,
            lineStyle: { color: palette.accent, width: 2 },
            itemStyle: { color: palette.accent },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: palette.accentSoft },
                { offset: 1, color: 'rgba(0,0,0,0)' },
              ]),
            },
          },
        ],
      }
    },
    [trendData, theme],
  )

  // Chart: per-subject score trend
  const subjectChartOption = useMemo(() => {
    const subjectSet = new Set<string>()
    for (const e of exams) {
      for (const key of Object.keys(e.scores)) {
        subjectSet.add(key)
      }
    }
    const subjectList = [...subjectSet]
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']
    const palette = globalChartPalette()

    return {
      grid: { left: 44, right: 16, top: 16, bottom: 32 },
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: subjectList,
        bottom: 0,
        textStyle: { fontSize: 11, color: palette.textSecondary },
      },
      xAxis: {
        type: 'category' as const,
        data: sorted.map((e) => e.name),
        axisLabel: { fontSize: 11, color: palette.textSecondary, rotate: sorted.length > 5 ? 30 : 0 },
        axisLine: { lineStyle: { color: palette.border } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 11, color: palette.textSecondary },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: subjectList.map((sub, i) => ({
        name: sub,
        type: 'line' as const,
        data: sorted.map((e) => e.scores[sub] ?? null),
        smooth: true,
        lineStyle: { color: colors[i % colors.length], width: 2 },
        itemStyle: { color: colors[i % colors.length] },
      })),
    }
  }, [exams, theme])

  return (
    <div className={styles.page}>
      <PageHeader
        title="成绩追踪"
        description="记录与分析考试成绩"
        actions={<Button onClick={openCreate}>录入成绩</Button>}
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon="📝"
          title="还没有考试成绩"
          description="点击上方按钮录入第一次考试"
          action={<Button onClick={openCreate}>录入成绩</Button>}
        />
      ) : (
        <>
          {/* Charts */}
          <div className={styles.chartsRow}>
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>总分趋势</h3>
              <ReactEChartsCore
                echarts={echarts}
                option={totalChartOption}
                style={{ height: 240 }}
                notMerge
              />
            </Card>
            {Object.keys(exams[0]?.scores || {}).length > 0 && (
              <Card className={styles.chartCard}>
                <h3 className={styles.chartTitle}>各科分数趋势</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={subjectChartOption}
                  style={{ height: 280 }}
                  notMerge
                />
              </Card>
            )}
          </div>

          {/* Exam list */}
          <div className={styles.list}>
            {sortedExams.map((exam, idx) => {
              const change = getScoreChange(idx)
              const scoreEntries = Object.entries(exam.scores).filter(
                ([, v]) => v > 0,
              )

              return (
                <Card key={exam.id} className={styles.examCard}>
                  <div className={styles.examHeader}>
                    <div className={styles.examTitleRow}>
                      <h3 className={styles.examName}>{exam.name}</h3>
                      <span className={styles.examDate}>
                        {new Date(exam.date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className={styles.examActions}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(exam)}>
                        编辑
                      </Button>
                      {confirmId === exam.id ? (
                        <>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(exam.id)}>
                            确认删除
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(exam.id)}>
                          删除
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={styles.examStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>总分</span>
                      <span className={styles.statValue}>{exam.total}</span>
                    </div>
                    {exam.assignedTotal > 0 && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>赋分总分</span>
                        <span className={styles.statValue}>{exam.assignedTotal}</span>
                      </div>
                    )}
                    {exam.rank > 0 && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>排名</span>
                        <span className={styles.statValue}>{exam.rank}</span>
                      </div>
                    )}
                    {change !== null && change !== 0 && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>变化</span>
                        <span
                          key={change}
                          data-feedback="datachange"
                          className={`${styles.statValue} ${change > 0 ? styles.changeUp : styles.changeDown}`}
                        >
                          {change > 0 ? '↑' : '↓'} {Math.abs(change)}
                        </span>
                      </div>
                    )}
                  </div>

                  {scoreEntries.length > 0 && (
                    <div className={styles.scoreBreakdown}>
                      {scoreEntries.map(([subject, score]) => {
                        const assigned = exam.assignedScores?.[subject] ?? 0
                        return (
                          <div key={subject} className={styles.scoreItem}>
                            <Badge variant="info">{subject}</Badge>
                            <span className={styles.scoreValue}>{score}</span>
                            {assigned > 0 && (
                              <span className={styles.assignedValue}>赋 {assigned}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {exam.note && <p className={styles.examNote}>{exam.note}</p>}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑成绩' : '录入成绩'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>考试名称</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：期中考试"
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>日期</label>
              <input
                className={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>各科成绩（原始分 / 赋分）</label>
            {subjects.length === 0 ? (
              <div className={styles.noSubjectsHint}>
                <p>
                  还没有添加学科，暂时无法录入各科成绩。请先到「知识体系」添加学科
                  （例如：语文、数学、英语）。
                </p>
                <Button variant="secondary" size="sm" onClick={() => { setModalOpen(false); navigate('/study/knowledge') }}>
                  去添加学科
                </Button>
              </div>
            ) : (
              <>
                <div className={styles.scoresGrid}>
                  {Object.entries(form.scores).map(([subject, score]) => (
                    <div key={subject} className={styles.scoreInput}>
                      <span className={styles.scoreSubject}>{subject}</span>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={score || ''}
                        onChange={(e) => handleScoreChange(subject, e.target.value)}
                        placeholder="原始分"
                      />
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={form.assignedScores[subject] || ''}
                        onChange={(e) => handleAssignedScoreChange(subject, e.target.value)}
                        placeholder="赋分"
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>原始总分</span>
                  <span className={styles.totalValue}>{totalScore}</span>
                  <span className={styles.totalLabel}>赋分总分</span>
                  <span className={styles.totalValue}>{assignedTotal}</span>
                </div>
              </>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>排名</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                value={form.rank || ''}
                onChange={(e) => setForm((f) => ({ ...f, rank: parseInt(e.target.value, 10) || 0 }))}
                placeholder="可选"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="备注信息..."
              rows={3}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '录入'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}