import { useState, useEffect, useCallback } from 'react'
import { useToolStore } from '@/stores/toolStore'
import { hideCurrentWindow, emitToMainWindow } from '@/desktop'
import styles from './PomodoroFloatPage.module.css'

const PRESETS = [25, 15, 45, 5]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Pomodoro floating window (desktop only).
 * Runs its own timer via the shared tool store; completed pomodoros
 * persist to IndexedDB and notify the main window so its log stays in sync.
 */
export default function PomodoroFloatPage() {
  const { timer, startTimer, pauseTimer, resetTimer } = useToolStore()
  const [duration, setDuration] = useState(25)

  const handleStart = useCallback(() => {
    startTimer(duration)
  }, [startTimer, duration])

  // When a pomodoro completes, notify the main window so its log refreshes
  useEffect(() => {
    if (timer.remain === 0 && timer.total > 0) {
      void emitToMainWindow('wb-pomodoro-completed', {})
    }
  }, [timer.remain, timer.total])

  return (
    <div className={styles.window}>
      <div className={styles.titleBar} data-tauri-drag-region>
        <span className={styles.title}>🍅 番茄钟</span>
        <button className={styles.closeBtn} onClick={() => hideCurrentWindow()} title="收起">
          ✕
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.time}>{formatTime(timer.remain)}</div>
        <div className={styles.state}>{timer.running ? '专注中…' : '已暂停'}</div>

        <div className={styles.controls}>
          {timer.running ? (
            <button className={styles.primaryBtn} onClick={pauseTimer}>
              暂停
            </button>
          ) : (
            <button className={styles.primaryBtn} onClick={handleStart}>
              开始
            </button>
          )}
          <button className={styles.secondaryBtn} onClick={resetTimer}>
            重置
          </button>
        </div>

        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`${styles.preset} ${duration === p && !timer.running ? styles.presetActive : ''}`}
              onClick={() => !timer.running && setDuration(p)}
              disabled={timer.running}
            >
              {p}m
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
