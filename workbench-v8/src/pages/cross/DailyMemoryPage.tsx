import { useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { refreshDailyMemory, aggregateDailyMemoryFacts, getDailyMemory } from '@/domain/projection/dailyMemory'
import { useDailyMemoryStore } from '@/stores/dailyMemoryStore'
import { formatDate } from '@/utils/helpers'
import type { DailyMemory, DailyMemoryFacts } from '@/types'
import styles from '@/pages/life/life.module.css'

function hasFacts(f: DailyMemoryFacts) {
  return Object.values(f).some(domain => Object.values(domain).some(value => Array.isArray(value) ? value.length > 0 : !!value))
}
export default function DailyMemoryPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [row, setRow] = useState<DailyMemory | null>(null)
  const [facts, setFacts] = useState<DailyMemoryFacts>()
  const [history, setHistory] = useState<DailyMemory[]>([])
  const [reflection, setReflection] = useState('')
  const dirty = useRef(false)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    dirty.current = false; setReflection(''); setRow(null); setFacts(undefined); setNotice('')
    const sub = liveQuery(async () => ({ row: await getDailyMemory(date), facts: await aggregateDailyMemoryFacts(date) })).subscribe({
      next: result => { setRow(result.row); setFacts(result.facts); if (!dirty.current) setReflection(result.row?.reflection ?? '') },
      error: () => setNotice('记忆读取失败，请重试'),
    })
    const prior = liveQuery(() => db.dailyMemory.where('date').below(date).filter(m => m.date.slice(5) === date.slice(5) && (!!m.reflection || hasFacts(m.facts))).toArray()).subscribe(setHistory)
    return () => { sub.unsubscribe(); prior.unsubscribe() }
  }, [date])
  const save = async () => {
    if (pending.current) return
    pending.current = true; setSaving(true)
    const text = reflection
    try { await useDailyMemoryStore.getState().saveReflection(date, text); dirty.current = false; setNotice('反思已保存') }
    catch { setNotice('保存失败，文字已保留，请重试') }
    finally { pending.current = false; setSaving(false) }
  }
  const refresh = async () => {
    try { await refreshDailyMemory(date); setNotice('事实已更新，未保存的文字已保留') }
    catch { setNotice('刷新失败，请重试') }
  }
  return <div className={styles.root}>
    <header className={styles.header}>
      <h1 className={styles.title}>🧠 Daily Memory · 每日记忆</h1>
      <label>日期 <input className={styles.input} type="date" value={date} aria-label="选择日期" disabled={saving} onChange={e => {
        if (dirty.current && !window.confirm('离开会丢弃未保存的反思，继续？')) return
        setDate(e.target.value || today)
      }} /></label>
      <button className={styles.buttonGhost} type="button" onClick={() => void refresh()}>刷新事实</button>
    </header>
    {notice && <p role="status">{notice}</p>}
    {!facts && <p role="status">加载中…</p>}
    {facts && <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Facts · 机器整理的事实</h2>
        <p>WORK：完成 {facts.work.tasksCompleted} 任务 · 学习 {facts.work.studyMinutes} 分钟 · 攻克 {facts.work.mistakesResolved} 错题 · 闪卡 {facts.work.flashcardsReviewed}</p>
        <p>LIFE：日记 {facts.life.diaries} · 瞬间 {facts.life.lifeMoments} · 事件 {facts.life.events}</p>
        <p>PLAY：动画 {facts.play.episodesWatched} 集 · 游戏 {facts.play.gameRecords} · 音乐 {facts.play.musicLogged}</p>
        {facts.work.nightShutdownDone && <p>已收口</p>}
        {!!facts.life.birthdays.length && <p>🎂 今天生日：{facts.life.birthdays.join('、')}</p>}
      </section>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Reflection · 今天最值得记住的一件事（可选）</h2>
        <textarea className={styles.textarea} aria-label="人类反思" value={reflection} disabled={saving} onChange={e => { dirty.current = true; setReflection(e.target.value) }} placeholder="机器整理事实，人留下意义。" />
        <button className={styles.button} type="button" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存反思'}</button>
        {row?.lastAutoUpdate && <p className={styles.subtitle}>事实更新于 {new Date(row.lastAutoUpdate).toLocaleString()}</p>}
      </section>
    </>}
    {!!history.length && <section className={styles.card} aria-label="往年今天"><h2 className={styles.cardTitle}>往年今天</h2>{history.map(m => <p key={m.id}><button type="button" className={styles.buttonGhost} onClick={() => { if (!dirty.current || window.confirm('离开会丢弃未保存的反思，继续？')) setDate(m.date) }}>{m.date}</button> · 完成 {m.facts.work.tasksCompleted} 任务 · {m.reflection}</p>)}</section>}
  </div>
}
