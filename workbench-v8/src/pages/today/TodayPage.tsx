import { isComposingKey } from '@/utils/composition'
import { noteLocalMetric } from '@/domain/system/localMetrics'
import { isActiveTask } from '@/domain/planning/taskLifecycle'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useReliableCapture } from '@/hooks/useReliableCapture'
import { selectTodayNarrative } from '@/domain/planning/todayNarrative'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import { useRecurringStore } from '@/stores/recurringStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyPlanStore } from '@/stores/studyPlanStore'
import { useNightShutdownStore } from '@/stores/nightShutdownStore'
import { useInboxStore } from '@/stores/inboxStore'
import { useSystemStore } from '@/stores/systemStore'
import { eventBus } from '@/domain/events/eventBus'
import { getGreeting, formatDate, isToday, getDaysDiff, uid } from '@/utils/helpers'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Menu from '@/components/ui/Menu'
import { useToast } from '@/components/ui/Toast'
import TaskDetailModal from '@/components/plan/TaskDetailModal'
import type { Task, Priority, Flexibility } from '@/types'
import type { PlanItem } from '@/domain/work/flexStudy'
import styles from './TodayPage.module.css'

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 }

function formatChineseDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = WEEKDAY_NAMES[date.getDay()]
  return `${y}年${m}月${d}日 · ${w}`
}

function formatClock(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${min}`
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const openSearch = useSystemStore((s) => s.openSearch)

  const { tasks, loading: tasksLoading, loadTasks, setDone, updateTask } = useTaskStore()
  const completeTask = (task: Task) => {
    const previous = useTaskStore.getState().completions[task.id]
    const intent = previous && previous.phase !== 'projected' ? previous : {
      taskId: task.id, desiredDone: !task.done, commandId: 'cmd_' + uid(),
    }
    return setDone(intent)
  }
  const { recurringTasks, loadRecurring, generateTodayTasks } = useRecurringStore()
  const { pomodoroLogs, countdowns, loadPomodoroLogs, loadCountdowns } = useToolStore()
  const { subjects, loadSubjects } = useStudyStore()
  const { reviews, loadAll: loadReviews } = useReviewStore()
  const { addItem } = useInboxStore()

  useEffect(() => {
    loadTasks()
    loadRecurring()
    loadPomodoroLogs()
    loadCountdowns()
    loadSubjects()
    loadReviews()
  }, [loadTasks, loadRecurring, loadPomodoroLogs, loadCountdowns, loadSubjects, loadReviews])

  useEffect(() => {
    generateTodayTasks()
  }, [recurringTasks, generateTodayTasks])

  const today = formatDate(new Date())

  // 时钟（每分钟刷新）
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // ---- Today's tasks (not done) ----
  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate === today && !t.done && isActiveTask(t))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99
        const pb = PRIORITY_ORDER[b.priority] ?? 99
        if (pa !== pb) return pa - pb
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return 0
      })
  }, [tasks, today])

  // 逾期未完成（dueDate < today）——「今天要处理」置顶区数据源
  // 昨天没做完的自动滚到今天（置顶提醒 + 一键顺延），不会凭空消失
  const overdueTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.done && isActiveTask(t) && t.dueDate && t.dueDate < today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [tasks, today])

  const [selectedNowId, setSelectedNowId] = useState<string>()
  const narrative = useMemo(() => selectTodayNarrative(tasks, today, selectedNowId, formatClock(clock)), [tasks, today, selectedNowId, clock])
  const nowTasks = narrative.now ? [narrative.now] : []
  const nextTasks = narrative.next

  // ---- Pomodoro stats for today ----
  const pomodoroStats = useMemo(() => {
    const todayLogs = pomodoroLogs.filter((l) => l.date === today && l.completed)
    const totalMinutes = todayLogs.reduce((sum, l) => sum + l.duration, 0)
    const completedCount = todayLogs.length
    return { totalMinutes, completedCount }
  }, [pomodoroLogs, today])

  // ---- Study time by subject ----
  const studyTimeBySubject = useMemo(() => {
    const todayLogs = pomodoroLogs.filter((l) => l.date === today && l.completed && l.subject)
    const map: Record<string, number> = {}
    for (const log of todayLogs) {
      const subj = log.subject!
      map[subj] = (map[subj] || 0) + log.duration
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [pomodoroLogs, today])

  // ---- Today's daily review（Memory / 反思）----
  const todayReview = useMemo(() => {
    return reviews.find((r) => r.type === 'daily' && isToday(r.dateRange.start))
  }, [reviews])

  // ---- Countdowns（PLAY / 期待）----
  const homeCountdowns = useMemo(() => {
    return countdowns
      .filter((c) => c.showOnHome)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  }, [countdowns])

  const isLoading = tasksLoading

  // ---- 计划详情弹窗（单击计划卡片查看详情，可进入编辑） ----
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view')
  const openDetail = (task: Task) => {
    setDetailTask(task)
    setDetailMode('view')
  }
  const closeDetail = () => setDetailTask(null)
  const saveDetail = async (updates: Partial<Task>) => {
    if (!detailTask) return
    await updateTask(detailTask.id, updates)
    setDetailTask(null)
  }
  const taskById = useMemo(() => {
    const map = new Map<string, Task>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  // ---- Capture：Enter → Inbox ----
  const capture = useReliableCapture(addItem)
  const { value: captureValue, setValue: setCaptureValue } = capture
  const captureRef = useRef<HTMLInputElement>(null)

  // 键盘进入：初始焦点落在 Capture；鼠标进入：不自动 autofocus
  useEffect(() => {
    function onFirstKey(e: KeyboardEvent) {
      const el = document.activeElement
      if (el === document.body || el === null) {
        captureRef.current?.focus()
      }
      window.removeEventListener('keydown', onFirstKey)
    }
    window.addEventListener('keydown', onFirstKey)
    return () => window.removeEventListener('keydown', onFirstKey)
  }, [])

  async function handleCapture() {
    const title = captureValue.trim()
    if (await capture.submit()) toast(`已加入收件箱：${title}`, 'success')
  }

  // 逾期任务一键顺延到今天（dueDate 改为今天，重新进入今日列表）
  async function postponeToToday(id: string) {
    await updateTask(id, { dueDate: today })
    toast('已顺延到今天', 'success')
  }

  // ---- V9：弹性学习 + 今日收口 ----
  const planAction = useStudyPlanStore((s) => s.plan)
  const setPlanModeAction = useStudyPlanStore((s) => s.setMode)
  const planItems = useStudyPlanStore((s) => s.items)
  const updatePlanItem = useStudyPlanStore((s) => s.updateItem)
  const deletePlanItem = useStudyPlanStore((s) => s.deleteItem)
  const shutdownCurrent = useNightShutdownStore((s) => s.current)
  const [available, setAvailable] = useState(90)
  const [energy, setEnergy] = useState(3)
  const [planMode, setPlanMode] = useState<'adaptive' | 'manual'>('adaptive')
  const [planResult, setPlanResult] = useState<Awaited<ReturnType<typeof planAction>> | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState('')

  useEffect(() => {
    void (async () => {
      const planStore = useStudyPlanStore.getState()
      await planStore.generateFromTasks(today)
      await planStore.loadPlan(today)
      await useNightShutdownStore.getState().loadByDate(today)
    })()
  }, [today])

  useEffect(() => {
    void (async () => {
      setPlanMode(await useStudyPlanStore.getState().getMode())
    })()
  }, [])

  // Flex Study 降级信号
  useEffect(() => {
    return eventBus.subscribe('flexStudy.fallback', () => {
      setFallbackNotice('排程算法异常，已自动切换到手动模式（V8 原排序）')
      setPlanMode('manual')
    })
  }, [])

  const runPlan = async () => {
    setFallbackNotice('')
    const result = await planAction(today, available, energy)
    setPlanResult(result)
    setPlanMode(result.planningMode)
  }

  const togglePlanMode = async () => {
    const next = planMode === 'adaptive' ? 'manual' : 'adaptive'
    await setPlanModeAction(next)
    setPlanMode(next)
    if (next === 'adaptive') {
      setFallbackNotice('')
      await runPlan()
    } else {
      setFallbackNotice('已切换手动模式（V8 原排序）')
      if (planResult) {
        const manual = await planAction(today, available, energy)
        setPlanResult(manual)
      }
    }
  }

  // 计划项按层级排序展示（must → should → could → 原始顺序）
  const sortedPlanItems = useMemo(() => {
    const tier: Record<string, number> = { must: 0, should: 1, could: 2 }
    return [...planItems].sort((a, b) => {
      const ta = tier[a.priority] ?? 9
      const tb = tier[b.priority] ?? 9
      if (ta !== tb) return ta - tb
      return a.id - b.id
    })
  }, [planItems])

  async function handlePlanItemUpdate(
    id: number,
    updates: { priority?: Priority; flexibility?: Flexibility; estimatedMinutes?: number },
  ) {
    await updatePlanItem(id, updates)
    if (planResult) await runPlan()
  }

  async function handlePlanItemDelete(id: number) {
    await deletePlanItem(id)
    if (planResult) await runPlan()
  }

  const moreItems = [
    { label: '今日计划', onClick: () => navigate('/plan/today') },
    { label: '去学习', onClick: () => navigate('/study') },
    { label: '开始复盘', onClick: () => navigate('/review/daily') },
    { label: '今日收口', onClick: () => navigate('/today/night-shutdown') },
  ]

  return (
    <div className={styles.canvas} data-v9-zone="work">
      {/* ===== Context（Header: Search / More） ===== */}
      <header className={styles.context}>
        <div className={styles.contextInfo}>
          <span className={styles.contextDate}>{formatChineseDate(clock)}</span>
          <span className={styles.contextGreeting}>{getGreeting()}</span>
          {homeCountdowns.length > 0 && (
            <span className={styles.contextCountdowns}>
              {homeCountdowns.map((c) => {
                const daysLeft = getDaysDiff(today, c.targetDate)
                const dayLabel =
                  daysLeft === 0 ? '今天' : daysLeft > 0 ? `还有 ${daysLeft} 天` : `已过 ${Math.abs(daysLeft)} 天`
                return (
                  <span key={c.id} className={styles.countdown}>
                    {c.title} · {dayLabel}
                  </span>
                )
              })}
            </span>
          )}
        </div>
        <div className={styles.contextMeta}>
          <span className={styles.contextClock} aria-hidden="true">
            {formatClock(clock)}
          </span>
          <Button variant="quiet" size="compact" onClick={openSearch} aria-label="搜索">
            🔍 搜索
          </Button>
          <Menu
            trigger={
              <Button variant="quiet" size="compact" aria-label="更多">
                ⋯ 更多
              </Button>
            }
            items={moreItems}
          />
        </div>
      </header>

      {/* ===== Orientation（Plane/Flow） ===== */}
      <section className={styles.orientation}>
        <h1 className={styles.greeting}>{getGreeting()}，Marty</h1>
        <p className={styles.date}>{formatChineseDate(clock)}</p>
      </section>

      {/* ===== 今天要处理（逾期置顶，标红 + 一键顺延/完成） ===== */}
      {overdueTasks.length > 0 && (
        <section className={styles.overdueSection} aria-label="今天要处理">
          <div className={styles.overdueLabel}>可以重新安排 · {overdueTasks.length} 项</div>
          <button type="button" onClick={() => navigate('/plan/today#recover')}>延期、拆分或暂存</button>
          <ul className={styles.taskList}>
            {overdueTasks.map((task) => {
              const days = getDaysDiff(task.dueDate, today)
              return (
                <li key={task.id} className={styles.overdueItem}>
                  <span className={styles.overdueBadge}>原计划在 {days} 天前</span>
                  <span className={styles.taskTitle}>{task.title}</span>
                  <button
                    type="button"
                    className={styles.overdueAction}
                    onClick={() => void postponeToToday(task.id)}
                    aria-label={`将「${task.title}」顺延到今天`}
                  >
                    顺延到今天
                  </button>
                  <button
                    type="button"
                    className={styles.overdueActionPrimary}
                    onClick={() => void completeTask(task)}
                    aria-label={`完成「${task.title}」`}
                  >
                    完成
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ===== Capture（Plane/Flow + Input，轻量，不强制元数据） ===== */}
      <section className={styles.capture}>
        <input
          aria-busy={capture.pending}
          ref={captureRef}
          className={styles.captureInput}
          value={captureValue}
          onChange={(e) => setCaptureValue(e.target.value)}
          onKeyDown={(e) => {
            if (!isComposingKey(e) && e.key === 'Enter') void handleCapture()
          }}
          placeholder="记点什么，Enter 进入收件箱…"
          aria-label="快速捕获"
        />
        {capture.error && <p role="alert">{capture.error} <button onClick={() => void handleCapture()}>重试保存</button></p>}
      </section>

      {/* ===== Action Space（Section）：Now / Next / Today Plan ===== */}
      <section className={`${styles.actionSpace} surface-section`} aria-label="行动空间">
        {/* Now（Plane/Flow，禁止 Panel） */}
        <div className={styles.now} data-testid="today-now">
          <div className={styles.flowLabel}>现在 · Now</div>
          {isLoading ? (
            <div className={styles.loading}>加载中...</div>
          ) : nowTasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="今天还没有安排任务"
              description="开始规划今天要做的事情吧"
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/plan/today')}>
                  去计划
                </Button>
              }
            />
          ) : (
            <ul className={styles.taskList}>
              {nowTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => void completeTask(task)}
                  onOpen={() => { setSelectedNowId(task.id); openDetail(task) }}
                />
              ))}
            </ul>
          )}
        </div>

        {narrative.now && <div><Button variant="quiet" onClick={() => { noteLocalMetric('startSelected'); openDetail(narrative.now!) }}>开始 · {narrative.now.title}</Button><Button variant="quiet" onClick={() => { noteLocalMetric('startSelected'); openDetail(narrative.now!) }}>先做 5 分钟</Button></div>}
        {/* Next（Flow，最多 2~4 条） */}
        <div className={styles.next} data-testid="today-next">
          <div className={styles.flowLabel}>接下来 · Next</div>
          {isLoading ? (
            <div className={styles.loading}>加载中...</div>
          ) : nextTasks.length === 0 ? (
            <p className={styles.emptyText}>接下来没有其他安排</p>
          ) : (
            <ul className={styles.taskList}>
              {nextTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => void completeTask(task)}
                  onOpen={() => { setSelectedNowId(task.id); openDetail(task) }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Today Plan（唯一默认 Panel） */}
        <div className={`${styles.todayPlan} surface-panel`}>
          <h2 className={styles.panelTitle}>今日计划 · Today Plan</h2><Button variant="quiet" onClick={() => navigate("/plan/today")}>查看完整计划（{narrative.plan.length} 项）</Button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              可用分钟
              <input
                type="number"
                min={0}
                max={600}
                value={available}
                onChange={(e) => setAvailable(Number(e.target.value) || 0)}
                style={{ width: 72, height: 32, padding: '0 6px' }}
                aria-label="可用分钟"
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              精力
              <select
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                style={{ height: 32 }}
                aria-label="精力"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <Button size="sm" onClick={() => void runPlan()}>生成计划</Button>
            <Button size="sm" variant="secondary" onClick={() => void togglePlanMode()}>
              {planMode === 'adaptive' ? '切手动' : '切自适应'}
            </Button>
          </div>
          {fallbackNotice && (
            <p className={styles.emptyText} style={{ color: 'var(--color-warning)' }} role="status">
              ⚠ {fallbackNotice}
            </p>
          )}
          {!planResult && sortedPlanItems.length === 0 ? (
            <p className={styles.emptyText}>输入可用时间后生成今晚计划（MUST → SHOULD → COULD）</p>
          ) : sortedPlanItems.length === 0 ? (
            <p className={styles.emptyText}>今日暂无计划项，去「今日计划」添加任务后会自动生成</p>
          ) : (
            <>
              <ul className={styles.taskList}>
                {sortedPlanItems.map((it) => (
                  <PlanItemRow
                    key={it.id}
                    item={it}
                    onOpen={() => {
                      const t = taskById.get(it.taskId)
                      if (t) openDetail(t)
                    }}
                    onUpdate={(updates) => void handlePlanItemUpdate(it.id, updates)}
                    onDelete={() => void handlePlanItemDelete(it.id)}
                  />
                ))}
              </ul>
              {planResult ? (
                <>
                  <p className={styles.emptyText}>
                    预估 {planResult.timeSummary.estimated} 分钟 / 可用 {planResult.timeSummary.available} 分钟
                    {planResult.timeSummary.overflow > 0 && ` · 超时 ${planResult.timeSummary.overflow} 分钟`}
                    {planResult.planningMode === 'manual' && ' · 手动模式'}
                  </p>
                  {planResult.suggestedDeferrals.length > 0 && (
                    <p className={styles.emptyText} style={{ color: 'var(--color-warning)' }}>
                      建议推迟 {planResult.suggestedDeferrals.length} 项 COULD（需你确认）
                    </p>
                  )}
                  {planResult.suggestedDowngrades.length > 0 && (
                    <p className={styles.emptyText} style={{ color: 'var(--color-warning)' }}>
                      建议将 {planResult.suggestedDowngrades.length} 项 SHOULD 降级（需你确认，MUST 永不降级）
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.emptyText}>设置时长 / 优先级 / 弹性后，点击「生成计划」查看排程</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== Life Surface（Section）：LIFE / PLAY ===== */}
      <section className={`${styles.lifeSurface} surface-section`} aria-label="生活面">
        {/* LIFE（Flow） */}
        <div className={styles.life}>
          <div className={styles.flowLabel}>LIFE · 生活</div>
          <div className={styles.flowGroup}>
            {/* 专注 */}
            <div className={styles.subBlock}>
              <div className={styles.subLabel}>🍅 今日专注</div>
              {pomodoroStats.completedCount === 0 ? (
                <p className={styles.emptyText}>今天还没有完成番茄钟</p>
              ) : (
                <div className={styles.pomodoroStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{formatMinutes(pomodoroStats.totalMinutes)}</span>
                    <span className={styles.statLabel}>总专注时长</span>
                  </div>
                  <div className={styles.statDivider} />
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{pomodoroStats.completedCount}</span>
                    <span className={styles.statLabel}>完成番茄数</span>
                  </div>
                </div>
              )}
            </div>
            {/* 学习 */}
            <div className={styles.subBlock}>
              <div className={styles.subLabel}>🧠 今日学习</div>
              {subjects.length === 0 && studyTimeBySubject.length === 0 ? (
                <EmptyState
                  icon="📚"
                  title="还没有学习科目"
                  description="添加科目后，在学习专注时可关联科目"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => navigate('/study')}>
                      去学习
                    </Button>
                  }
                />
              ) : studyTimeBySubject.length === 0 ? (
                <p className={styles.emptyText}>今天还没有学习记录</p>
              ) : (
                <ul className={styles.studyList}>
                  {studyTimeBySubject.map(([subject, minutes]) => (
                    <li key={subject} className={styles.studyItem}>
                      <span className={styles.studySubject}>{subject}</span>
                      <span className={styles.studyTime}>{formatMinutes(minutes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* PLAY（Flow） */}
        <div className={styles.play}>
          <div className={styles.flowLabel}>PLAY · 期待与收口</div>
          <div className={styles.subBlock}>
            <div className={styles.subLabel}>🌙 今日收口</div>
            {shutdownCurrent ? (
              <div className={styles.reviewDone}>
                <span className={styles.reviewCheck}>✅</span>
                <div>
                  <p className={styles.reviewSummary}>今日收口已完成</p>
                  <p className={styles.reviewExcerpt}>{shutdownCurrent.reflection}</p>
                </div>
              </div>
            ) : (
              <div className={styles.reviewPending}>
                <p className={styles.reviewPendingText}>
                  一键汇总今日任务、学习、错题、闪卡、事件、日记与 PLAY 活动
                </p>
                <Button onClick={() => navigate('/today/night-shutdown')}>去收口</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Memory（Plane/Flow，不是 Section） ===== */}
      <section className={styles.memory} aria-label="记忆">
        <div className={styles.flowLabel}>记忆 · Memory</div>
        {todayReview ? (
          <div className={styles.reviewDone}>
            <span className={styles.reviewCheck}>✅</span>
            <div>
              <p className={styles.reviewSummary}>今日复盘已完成</p>
              {todayReview.reflections.length > 0 && (
                <p className={styles.reviewExcerpt}>{todayReview.reflections[0]}</p>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.reviewPending}>
            <p className={styles.reviewPendingText}>今晚还有一份复盘等待完成</p>
            <Button onClick={() => navigate('/review/daily')}>开始今日复盘</Button>
          </div>
        )}
      </section>

      <TaskDetailModal
        task={detailTask}
        mode={detailMode}
        onClose={closeDetail}
        onSave={saveDetail}
        onStartEdit={() => setDetailMode('edit')}
      />
    </div>
  )
}

// ---- Task Row ----

function TaskRow({ task, onToggle, onOpen }: { task: Task; onToggle: () => void; onOpen: () => void }) {
  const state = useTaskStore((s) => s.completions[task.id])
  const pending = state?.phase === 'persisting' || state?.phase === 'committed'
  return (
    <li className={`${styles.taskItem} theme-interactive`} data-v9-done={task.done ? 'true' : 'false'}>
      <button
        className={`${styles.checkbox} ${task.done ? styles.checked : ''}`}
        onClick={onToggle}
        disabled={pending}
        aria-label={task.done ? '标记为未完成' : '标记为已完成'}
        data-v9-done-glow={task.done ? 'true' : 'false'}
        style={{ position: 'relative' }}
      >
        <span className={styles.checkmark} />
      </button>
      <span
        className={`${styles.taskTitle} ${task.done ? styles.taskDone : ''}`}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        title="查看详情"
        style={{ cursor: 'pointer' }}
        data-v9-done-title="true"
      >
        {task.title}
      </span>
      <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
        {task.priority}
      </span>
    </li>
  )
}

// ---- Plan Item Row（今日计划项：时长 / 优先级 / 弹性 可编辑） ----

function PlanItemRow({
  item,
  onUpdate,
  onDelete,
  onOpen,
}: {
  item: PlanItem
  onUpdate: (updates: { priority?: Priority; flexibility?: Flexibility; estimatedMinutes?: number }) => void
  onDelete: () => void
  onOpen: () => void
}) {
  const [minutes, setMinutes] = useState(String(item.estimatedMinutes))

  useEffect(() => {
    setMinutes(String(item.estimatedMinutes))
  }, [item.estimatedMinutes])

  const commitMinutes = () => {
    const n = Number(minutes)
    if (Number.isFinite(n) && n >= 0 && n !== item.estimatedMinutes) {
      onUpdate({ estimatedMinutes: n })
    } else {
      setMinutes(String(item.estimatedMinutes))
    }
  }

  const title = item.title || item.taskId

  return (
    <li className={styles.planItem}>
      <div className={styles.planItemTop}>
        <select
          className={styles.planSelect}
          value={item.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
          aria-label={`${title} 优先级`}
          title="优先级"
        >
          <option value="must">MUST</option>
          <option value="should">SHOULD</option>
          <option value="could">COULD</option>
        </select>
        <span
          className={styles.taskTitle}
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen()
            }
          }}
          title="查看详情"
          style={{ cursor: 'pointer' }}
        >
          {title}
        </span>
        <button
          type="button"
          className={styles.planDelete}
          onClick={onDelete}
          title="从计划中移除"
          aria-label={`移除「${title}」`}
        >
          ✕
        </button>
      </div>
      <div className={styles.planItemControls}>
        <label className={styles.planField}>
          <span className={styles.planFieldLabel}>弹性</span>
          <select
            value={item.flexibility}
            onChange={(e) => onUpdate({ flexibility: e.target.value as Flexibility })}
            aria-label={`${title} 弹性`}
          >
            <option value="fixed">固定</option>
            <option value="flexible">弹性</option>
          </select>
        </label>
        <label className={styles.planField}>
          <span className={styles.planFieldLabel}>时长</span>
          <input
            className={styles.planMinutes}
            type="number"
            min={0}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            onBlur={commitMinutes}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={`${title} 时长（分钟）`}
          />
          <span className={styles.planUnit}>分</span>
        </label>
      </div>
    </li>
  )
}
