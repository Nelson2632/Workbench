// ============================================================
// V9 LIFE — 日记日历：按月查看；每天显示日记/事件/生日标记
// 点击某天跳转日记页（投影展示，不复制数据）
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDiaryStore } from '@/stores/diaryStore'
import { useEventStore } from '@/stores/eventStore'
import { formatDate } from '@/utils/helpers'
import styles from './life.module.css'

const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export default function DiaryCalendarPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const diaries = useDiaryStore((s) => s.diaries)
  const events = useEventStore((s) => s.events)
  const loadRange = useDiaryStore((s) => s.loadRange)
  const loadEvents = useEventStore((s) => s.loadRange)

  const { from, to } = monthRange(year, month)

  useEffect(() => {
    void loadRange(from, to)
    void loadEvents(from, to)
  }, [from, to, loadRange, loadEvents])

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const startOffset = (first.getDay() + 6) % 7 // 周一为 0
    const totalDays = new Date(year, month, 0).getDate()
    const out: { date: string; inMonth: boolean }[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(year, month - 1, 1 - startOffset + i)
      out.push({
        date: formatDate(d),
        inMonth: d.getMonth() === month - 1,
      })
    }
    return out
  }, [year, month])

  const counts = useMemo(() => {
    const map: Record<string, { diary: number; event: number; birthday: number }> = {}
    for (const d of diaries) {
      const c = (map[d.date] ??= { diary: 0, event: 0, birthday: 0 })
      c.diary++
    }
    for (const e of events) {
      const c = (map[e.date] ??= { diary: 0, event: 0, birthday: 0 })
      c.event++
      if (e.type === 'birthday') c.birthday++
    }
    return map
  }, [diaries, events])

  const shiftMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  const todayStr = formatDate(today)

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          {year} 年 {month} 月
        </h2>
        <div className={styles.formRow}>
          <button type="button" className={styles.buttonGhost} onClick={() => shiftMonth(-1)} aria-label="上个月">
            ← 上月
          </button>
          <button
            type="button"
            className={styles.buttonGhost}
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth() + 1)
            }}
          >
            回到本月
          </button>
          <button type="button" className={styles.buttonGhost} onClick={() => shiftMonth(1)} aria-label="下个月">
            下月 →
          </button>
        </div>
      </header>

      <div className={styles.calGrid} role="grid" aria-label={`${year} 年 ${month} 月日历`}>
        {WEEK_HEAD.map((w) => (
          <div key={w} className={styles.calHead} role="columnheader">
            {w}
          </div>
        ))}
        {cells.map((c) => {
          const info = counts[c.date]
          const cls = [
            styles.calCell,
            !c.inMonth ? styles.calCellMuted : '',
            c.date === todayStr ? styles.calCellToday : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={c.date}
              type="button"
              role="gridcell"
              className={cls}
              onClick={() => navigate(`/life/diary?date=${c.date}`)}
              aria-label={`${c.date}，日记 ${info?.diary ?? 0} 篇，事件 ${info?.event ?? 0} 个`}
            >
              <span className={styles.calDay}>{Number(c.date.slice(8))}</span>
              {(info?.diary || info?.event) && (
                <span className={styles.calDots}>
                  {info.birthday > 0 && <span aria-label="生日">🎂</span>}
                  {info.diary > 0 && <span>📖 {info.diary}</span>}
                  {info.event > 0 && <span>📅 {info.event}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className={styles.subtitle}>点击日期跳转到当天日记；日历同时投影任务与考试（M3 起）。</p>
    </div>
  )
}
