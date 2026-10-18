// ============================================================
// V9 LIFE — 日历·事件页：独立 Event 实体 CRUD + 完成切换
// 生日事件（type=birthday）由好友域管理，此处只读展示
// V9 形态扩展：地点 / 起止时间 / 提醒 / 重复（EventInput 与 version(4)）
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { formatDate } from '@/utils/helpers'
import styles from './life.module.css'

const REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
]

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '不提醒' },
  { value: '5', label: '5 分钟前' },
  { value: '15', label: '15 分钟前' },
  { value: '30', label: '30 分钟前' },
  { value: '60', label: '1 小时前' },
  { value: '1440', label: '1 天前' },
]

const REPEAT_LABELS: Record<string, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
}

function reminderLabel(minutes: string | null): string {
  if (!minutes) return ''
  const opt = REMINDER_OPTIONS.find((o) => o.value === minutes)
  return opt ? opt.label : `${minutes} 分钟前`
}

/** 判断重复事件在 target 日期是否产生一次发生（含边界：target >= baseDate） */
function occursOn(baseDate: string, rule: string, target: string): boolean {
  if (target < baseDate) return false
  const b = new Date(`${baseDate}T00:00:00`)
  const t = new Date(`${target}T00:00:00`)
  if (rule === 'daily') return true
  if (rule === 'weekly') {
    const diffDays = Math.round((t.getTime() - b.getTime()) / 86400000)
    return diffDays % 7 === 0
  }
  if (rule === 'monthly') return b.getDate() === t.getDate()
  if (rule === 'yearly') return b.getMonth() === t.getMonth() && b.getDate() === t.getDate()
  return false
}

export default function EventsPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reminder, setReminder] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')

  const events = useEventStore((s) => s.events)
  const repeating = useEventStore((s) => s.repeating)
  const loading = useEventStore((s) => s.loading)
  const loadRange = useEventStore((s) => s.loadRange)
  const loadRepeating = useEventStore((s) => s.loadRepeating)
  const addEvent = useEventStore((s) => s.addEvent)
  const updateEvent = useEventStore((s) => s.updateEvent)
  const toggleDone = useEventStore((s) => s.toggleDone)
  const deleteEvent = useEventStore((s) => s.deleteEvent)

  useEffect(() => {
    void loadRange(date, date)
    void loadRepeating()
  }, [date, loadRange, loadRepeating])

  const dayEvents = events.filter((e) => e.date === date).sort((a, b) => a.title.localeCompare(b.title))

  // 重复事件的虚拟实例：按规则落在选中日期、且非其基准日（基准日为真实事件）
  const virtualEvents = useMemo(
    () =>
      repeating
        .filter((e) => e.repeat && e.date !== date && occursOn(e.date, e.repeat, date))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [repeating, date],
  )

  const resetForm = useCallback(() => {
    setTitle('')
    setNote('')
    setAllDay(true)
    setLocation('')
    setStartTime('')
    setEndTime('')
    setReminder('')
    setRepeat('')
  }, [])

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!title.trim()) {
        setError('事件标题不能为空')
        return
      }
      setError('')
      await addEvent({
        date,
        title: title.trim(),
        note: note.trim(),
        allDay,
        location: location.trim(),
        startTime: allDay ? null : startTime || null,
        endTime: allDay ? null : endTime || null,
        reminder: reminder || null,
        repeat: repeat || null,
      })
      resetForm()
    },
    [addEvent, allDay, date, endTime, location, note, reminder, repeat, resetForm, startTime, title],
  )

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <header className={styles.header}>
        <label className={styles.subtitle}>
          日期：
          <input
            className={styles.input}
            style={{ minHeight: 44, width: 160 }}
            type="date"
            value={date}
            aria-label="选择日期"
            onChange={(e) => setDate(e.target.value || today)}
          />
        </label>
        <span className={styles.subtitle}>{dayEvents.length + virtualEvents.length} 个事件</span>
      </header>

      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>新建事件</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 260 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="事件标题，如：数学周测"
            aria-label="事件标题"
          />
          <input
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="地点（可选）"
            aria-label="事件地点"
          />
          <input
            className={styles.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注（可选）"
            aria-label="事件备注"
          />
        </div>

        <div className={styles.formRow}>
          <label className={styles.subtitle} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              aria-label="全天事件"
            />
            全天
          </label>

          {!allDay && (
            <>
              <input
                className={styles.input}
                style={{ maxWidth: 130 }}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                aria-label="开始时间"
              />
              <span className={styles.subtitle}>至</span>
              <input
                className={styles.input}
                style={{ maxWidth: 130 }}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="结束时间"
              />
            </>
          )}

          <select
            className={styles.select}
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            aria-label="提醒"
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-label="重复"
          >
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button type="submit" className={styles.button}>
            添加
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert" data-feedback="error">
            {error}
          </p>
        )}
      </form>

      <section className={styles.list} aria-label="当日事件列表">
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && dayEvents.length === 0 && virtualEvents.length === 0 && (
          <p className={styles.empty}>这一天没有事件</p>
        )}
        {dayEvents.map((e) => {
          const isBirthday = e.type === 'birthday'
          const timeLabel = e.startTime
            ? e.endTime
              ? `${e.startTime} - ${e.endTime}`
              : e.startTime
            : ''
          const repLabel = e.repeat ? REPEAT_LABELS[e.repeat] : ''
          const remLabel = reminderLabel(e.reminder)
          return (
            <div key={e.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={e.doneAt ? styles.itemTitleDone : styles.itemTitle}>
                  {isBirthday ? '🎂 ' : ''}
                  {e.title}
                </p>
                <span className={styles.itemMeta}>
                  {isBirthday && <span className={styles.chip}>好友生日（由好友自动生成）</span>}
                  {e.doneAt && <span className={styles.chip}>已完成</span>}
                </span>
              </div>

              {(e.location || timeLabel || remLabel || repLabel) && (
                <span className={styles.itemMeta}>
                  {e.location && <span className={styles.chip}>📍 {e.location}</span>}
                  {timeLabel && <span className={styles.chip}>🕒 {timeLabel}</span>}
                  {remLabel && <span className={styles.chip}>⏰ {remLabel}</span>}
                  {repLabel && <span className={styles.chip}>🔁 {repLabel}</span>}
                </span>
              )}

              {e.note && <p className={styles.itemBody}>{e.note}</p>}
              {!isBirthday && (
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => void toggleDone(e.id)}
                    aria-label={e.doneAt ? '撤销完成' : '标记完成'}
                  >
                    {e.doneAt ? '撤销完成' : '完成'}
                  </button>
                  <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => {
                      const t = window.prompt('修改事件标题', e.title)
                      if (t !== null && t.trim()) void updateEvent(e.id, { title: t.trim() })
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className={styles.buttonDanger}
                    onClick={() => {
                      if (window.confirm(`删除事件「${e.title}」？`)) void deleteEvent(e.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {virtualEvents.map((e) => {
          const repLabel = e.repeat ? REPEAT_LABELS[e.repeat] : ''
          const timeLabel = e.startTime
            ? e.endTime
              ? `${e.startTime} - ${e.endTime}`
              : e.startTime
            : ''
          return (
            <div key={`virtual-${e.id}`} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemTitle}>{e.title}</p>
                <span className={styles.itemMeta}>
                  <span className={styles.chip}>🔁 {repLabel}（重复）</span>
                </span>
              </div>
              {(e.location || timeLabel) && (
                <span className={styles.itemMeta}>
                  {e.location && <span className={styles.chip}>📍 {e.location}</span>}
                  {timeLabel && <span className={styles.chip}>🕒 {timeLabel}</span>}
                </span>
              )}
              {e.note && <p className={styles.itemBody}>{e.note}</p>}
            </div>
          )
        })}
      </section>
    </div>
  )
}