import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/helpers'
import { openPomodoroFloat } from '@/desktop'
import styles from './PomodoroPage.module.css'

const PRESET_DURATIONS = [
  { label: '25分钟', value: 25 },
  { label: '15分钟', value: 15 },
  { label: '45分钟', value: 45 },
  { label: '5分钟', value: 5 },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PomodoroPage() {
  const {
    timer, pomodoroLogs, loading,
    startTimer, pauseTimer, resetTimer,
    loadPomodoroLogs, addPomodoroLog, deletePomodoroLog,
  } = useToolStore()
  const { toast } = useToast()

  const [subject, setSubject] = useState('')
  const [customDuration, setCustomDuration] = useState(25)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    loadPomodoroLogs()
  }, [loadPomodoroLogs])

  // Watch for timer completion
  useEffect(() => {
    if (timer.remain === 0 && timer.total > 0) {
      setShowNotification(true)
      toast('番茄钟完成！🎉', 'success')
      const handle = setTimeout(() => setShowNotification(false), 5000)
      return () => clearTimeout(handle)
    }
  }, [timer.remain, timer.total, toast])

  const today = formatDate(new Date())
  const todayLogs = useMemo(
    () => pomodoroLogs.filter((l) => l.date === today && l.completed),
    [pomodoroLogs, today],
  )
  const todayCount = todayLogs.length

  const progress = timer.total > 0
    ? ((timer.total - timer.remain) / timer.total) * 100
    : 0

  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const handleStart = useCallback(() => {
    startTimer(customDuration)
  }, [startTimer, customDuration])

  const handlePause = useCallback(() => {
    pauseTimer()
  }, [pauseTimer])

  const handleReset = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  const handleComplete = useCallback(async () => {
    if (timer.remain <= 0 && timer.total > 0) {
      await addPomodoroLog({
        date: today,
        duration: timer.total / 60,
        subject: subject.trim() || undefined,
        completed: true,
      })
      setSubject('')
      toast('已记录番茄钟', 'success')
    }
  }, [timer.remain, timer.total, today, subject, addPomodoroLog, toast])

  const handleDeleteLog = useCallback(async (id: string) => {
    if (!confirm('确定删除此记录？')) return
    await deletePomodoroLog(id)
    toast('记录已删除', 'success')
  }, [deletePomodoroLog, toast])

  return (
    <div className={styles.page}>
      <PageHeader
        title="番茄钟"
        description="专注计时与番茄工作法"
        actions={
          <Button variant="secondary" onClick={() => void openPomodoroFloat()}>
            🪟 浮窗
          </Button>
        }
      />

      <div className={styles.layout}>
        {/* Timer Section */}
        <Card className={styles.timerCard}>
          <div className={styles.timerSection}>
            <div className={styles.circularTimer}>
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  strokeWidth="8"
                  style={{ stroke: 'var(--color-border)' }}
                />
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 110 110)"
                  className={styles.progressCircle}
                  style={{ stroke: 'var(--color-accent)' }}
                />
              </svg>
              <div className={styles.timerCenter}>
                <span className={styles.timerDisplay}>
                  {formatTime(timer.remain)}
                </span>
                <span className={styles.timerState}>
                  {timer.running ? '进行中' : '已暂停'}
                </span>
              </div>
            </div>

            {showNotification && (
              <div className={styles.notification}>
                🎉 番茄钟完成！干得漂亮！
              </div>
            )}

            <div className={styles.controls}>
              {timer.running ? (
                <Button variant="secondary" onClick={handlePause}>
                  暂停
                </Button>
              ) : (
                <Button onClick={handleStart}>
                  开始
                </Button>
              )}
              <Button variant="ghost" onClick={handleReset}>
                重置
              </Button>
            </div>

            <div className={styles.durationPresets}>
              <span className={styles.presetLabel}>时长：</span>
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.value}
                  className={`${styles.presetBtn} ${customDuration === p.value && !timer.running ? styles.presetBtnActive : ''}`}
                  onClick={() => !timer.running && setCustomDuration(p.value)}
                  disabled={timer.running}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className={styles.subjectRow}>
              <label className={styles.subjectLabel}>主题（可选）：</label>
              <input
                className={styles.subjectInput}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例如：复习数学、写代码..."
                disabled={timer.running}
              />
            </div>

            <div className={styles.sessionCount}>
              今日：<strong>{todayCount}</strong> 次专注
            </div>
          </div>
        </Card>

        {/* Log Section */}
        <Card className={styles.logCard}>
          <h3 className={styles.logTitle}>今日记录</h3>
          {loading ? (
            <EmptyState icon="⏳" title="加载中..." />
          ) : todayLogs.length === 0 ? (
            <EmptyState
              icon="🍅"
              title="暂无今日记录"
              description="开始你的第一个番茄钟吧"
            />
          ) : (
            <div className={styles.logList}>
              {todayLogs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logInfo}>
                    <span className={styles.logTime}>
                      {log.duration} 分钟
                    </span>
                    {log.subject && (
                      <span className={styles.logSubject}>{log.subject}</span>
                    )}
                  </div>
                  <button
                    className={styles.logDelete}
                    onClick={() => handleDeleteLog(log.id)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}