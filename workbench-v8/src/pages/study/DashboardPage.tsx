import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useToolStore } from '@/stores/toolStore'
import { useTaskStore } from '@/stores/taskStore'
import { useStudyStore } from '@/stores/studyStore'
import { useSystemStore } from '@/stores/systemStore'
import { formatDate, isToday } from '@/utils/helpers'
import { globalChartPalette } from '@/utils/chartTheme'
import styles from './DashboardPage.module.css'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer])

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const theme = useSystemStore((s) => s.theme)
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { tasks, loadTasks } = useTaskStore()
  const { subjects, mistakes, exams, loading, loadSubjects, loadMistakes, loadExams, getWeakTopics, getRecentMistakes, getExamTrend } =
    useStudyStore()

  useEffect(() => {
    loadPomodoroLogs()
    loadTasks()
    loadSubjects()
    loadMistakes()
    loadExams()
  }, [loadPomodoroLogs, loadTasks, loadSubjects, loadMistakes, loadExams])

  const todayStr = formatDate(new Date())

  // --- Today's study time by subject ---
  const todayPomodoros = useMemo(
    () => pomodoroLogs.filter((p) => isToday(p.date)),
    [pomodoroLogs],
  )

  const subjectStudyTime = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of todayPomodoros) {
      const key = p.subject || '其他'
      map[key] = (map[key] || 0) + p.duration
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [todayPomodoros])

  const totalMinutes = useMemo(
    () => todayPomodoros.reduce((s, p) => s + p.duration, 0),
    [todayPomodoros],
  )

  // --- Today's study tasks ---
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayStr && !t.done),
    [tasks, todayStr],
  )

  const subjectNames = useMemo(
    () => new Set(subjects.map((s) => s.name)),
    [subjects],
  )

  const studyTasks = useMemo(
    () =>
      todayTasks.filter(
        (t) => t.sourceRecurringId || subjectNames.has(t.title),
      ),
    [todayTasks, subjectNames],
  )

  // --- Weak knowledge points ---
  const weakMistakes = useMemo(() => getWeakTopics(), [mistakes])

  const weakBySubject = useMemo(() => {
    const map: Record<string, { count: number; questions: string[] }> = {}
    for (const m of weakMistakes) {
      if (!map[m.subject]) map[m.subject] = { count: 0, questions: [] }
      map[m.subject].count++
      map[m.subject].questions.push(m.question.slice(0, 50))
    }
    return Object.entries(map)
  }, [weakMistakes])

  // --- Recent mistakes ---
  const recentMistakes = useMemo(() => getRecentMistakes(5), [mistakes])

  // --- Exam trend ---
  const examTrend = useMemo(() => getExamTrend(), [exams])
  const latestExam = examTrend[examTrend.length - 1]
  const prevExam = examTrend[examTrend.length - 2]
  const scoreChange = latestExam && prevExam ? latestExam.score - prevExam.score : 0

  const examChartOption = useMemo(() => {
    const palette = globalChartPalette()
    const last5 = examTrend.slice(-5)
    return {
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: last5.map((e) => e.name),
        axisLabel: { fontSize: 11, color: palette.textSecondary },
        axisLine: { lineStyle: { color: palette.border } },
      },
      yAxis: {
        type: 'value' as const,
        min: (v: { min: number }) => Math.floor(v.min / 10) * 10,
        axisLabel: { fontSize: 11, color: palette.textSecondary },
        splitLine: { lineStyle: { color: palette.grid } },
      },
      series: [
        {
          type: 'line' as const,
          data: last5.map((e) => e.score),
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
  }, [examTrend, theme])

  // --- Study trend chart (last 7 days) ---
  const studyTrend = useMemo(() => {
    const map: Record<string, number> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      map[formatDate(d)] = 0
    }
    for (const p of pomodoroLogs) {
      if (map[p.date] !== undefined) {
        map[p.date] += p.duration
      }
    }
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return Object.entries(map).map(([date, mins]) => ({
      label: days[new Date(date).getDay()],
      hours: +(mins / 60).toFixed(1),
    }))
  }, [pomodoroLogs])

  const studyChartOption = useMemo(
    () => {
      const palette = globalChartPalette()
      return {
        grid: { left: 36, right: 16, top: 16, bottom: 28 },
        tooltip: {
          trigger: 'axis' as const,
          formatter: (p: any) => `${p[0].axisValue} ${p[0].value}h`,
        },
        xAxis: {
          type: 'category' as const,
          data: studyTrend.map((d) => d.label),
          axisLabel: { fontSize: 11, color: palette.textSecondary },
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
            data: studyTrend.map((d) => d.hours),
            barWidth: 20,
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
    },
    [studyTrend, theme],
  )

  return (
    <div className={styles.page}>
      <PageHeader title="学习驾驶舱" description="学习概览与数据统计" />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <div className={styles.grid}>
          {/* Today's study time */}
          <Card
            className={styles.card}
            onClick={subjectStudyTime.length === 0 ? () => navigate('/tools/pomodoro') : undefined}
          >
            <h3 className={styles.cardTitle}>今日学习时长</h3>
            {subjectStudyTime.length === 0 ? (
              <EmptyState
                icon="⏱️"
                title="今天还没有学习记录"
                description="开始一个番茄钟来记录学习时间"
                action={
                  <Button variant="secondary" size="sm" onClick={() => navigate('/tools/pomodoro')}>
                    去番茄钟
                  </Button>
                }
              />
            ) : (
              <>
                <div className={styles.totalTime}>今天学习 {formatDuration(totalMinutes)}</div>
                <div className={styles.subjectBars}>
                  {subjectStudyTime.map(([subject, duration]) => (
                    <div key={subject} className={styles.subjectBar}>
                      <span className={styles.subjectName}>{subject}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.max((duration / totalMinutes) * 100, 4)}%` }}
                        />
                      </div>
                      <span className={styles.subjectDuration}>{formatDuration(duration)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Today's study tasks */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>今日学习任务</h3>
            {studyTasks.length === 0 ? (
              <EmptyState icon="📋" title="今天没有学习任务" description="在计划页面添加学习任务" />
            ) : (
              <div className={styles.taskList}>
                {studyTasks.map((t) => (
                  <div key={t.id} className={styles.taskItem}>
                    <span className={t.done ? styles.taskDone : ''}>{t.title}</span>
                    <Badge variant={t.priority === 'P0' ? 'danger' : t.priority === 'P1' ? 'warning' : 'default'}>
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Weak knowledge points */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>薄弱知识点</h3>
            {weakBySubject.length === 0 ? (
              <EmptyState icon="💡" title="没有薄弱知识点" description="继续加油！" />
            ) : (
              <div className={styles.weakList}>
                {weakBySubject.map(([subject, info]) => (
                  <div
                    key={subject}
                    className={`${styles.weakItem} theme-interactive`}
                    onClick={() => navigate('/study/knowledge')}
                  >
                    <Badge variant="danger">{subject}</Badge>
                    <span className={styles.weakCount}>{info.count} 个错题</span>
                    <span className={styles.weakPreview}>
                      {info.questions[0]}
                      {info.questions.length > 1 ? ` 等${info.questions.length}题` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent mistakes */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>最近错题</h3>
            {recentMistakes.length === 0 ? (
              <EmptyState icon="✅" title="没有未掌握的错题" />
            ) : (
              <div className={styles.mistakeList}>
                {recentMistakes.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.mistakeItem} theme-interactive`}
                    onClick={() => navigate('/study/mistakes')}
                  >
                    <div className={styles.mistakeHeader}>
                      <Badge variant="info">{m.subject}</Badge>
                      <span className={styles.mistakeDate}>
                        {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className={styles.mistakeQuestion}>{m.question.slice(0, 50)}{m.question.length > 50 ? '...' : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Exam score trend */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>成绩趋势</h3>
            {examTrend.length === 0 ? (
              <EmptyState icon="📊" title="还没有考试成绩" description="在成绩追踪页面录入考试" />
            ) : (
              <>
                {latestExam && (
                  <div className={styles.examSummary}>
                    <div className={styles.examScore}>
                      <span className={styles.examScoreLabel}>最近考试</span>
                      <span className={styles.examScoreValue}>{latestExam.score}</span>
                      <span className={styles.examScoreName}>{latestExam.name}</span>
                    </div>
                    {scoreChange !== 0 && (
                      <div className={`${styles.examChange} ${scoreChange > 0 ? styles.examUp : styles.examDown}`}>
                        {scoreChange > 0 ? '↑' : '↓'} {Math.abs(scoreChange)} 分
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.chartWrapper}>
                  <ReactEChartsCore
                    echarts={echarts}
                    option={examChartOption}
                    style={{ height: 200 }}
                    notMerge
                  />
                </div>
              </>
            )}
          </Card>

          {/* Study trend chart */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>学习时长趋势（近7天）</h3>
            <div className={styles.chartWrapper}>
              <ReactEChartsCore
                echarts={echarts}
                option={studyChartOption}
                style={{ height: 200 }}
                notMerge
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}