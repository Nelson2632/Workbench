// ============================================================
// V9 WORK — Night Shutdown 今日收口页（V9_MASTER_PLAN §9）
// 操作收口：展示今日聚合 → 填写原因/反思/明日重点 → 完成
// 反思不写入 Daily Memory（Patch C-002-08 职责边界）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNightShutdownStore } from '@/stores/nightShutdownStore'
import { formatDate } from '@/utils/helpers'
import styles from '@/pages/life/life.module.css'

export default function NightShutdownPage() {
  const navigate = useNavigate()
  const today = formatDate(new Date())
  const current = useNightShutdownStore((s) => s.current)
  const aggregate = useNightShutdownStore((s) => s.aggregate)
  const loading = useNightShutdownStore((s) => s.loading)
  const loadByDate = useNightShutdownStore((s) => s.loadByDate)
  const complete = useNightShutdownStore((s) => s.complete)

  const [reason, setReason] = useState('')
  const [reflection, setReflection] = useState('')
  const [tomorrowFocus, setTomorrowFocus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadByDate(today)
  }, [today, loadByDate])

  const handleComplete = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!reflection.trim()) {
        setError('写一句今天的反思吧（一句话即可）')
        return
      }
      setError('')
      await complete({
        date: today,
        reason: reason.trim(),
        reflection: reflection.trim(),
        tomorrowFocus: tomorrowFocus
          .split(/[,，\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      })
    },
    [complete, reason, reflection, today, tomorrowFocus],
  )

  if (loading) return <div className={styles.root}><p className={styles.empty}>加载中…</p></div>

  // ---- 已完成状态 ----
  if (current) {
    return (
      <div className={styles.root}>
        <header className={styles.header}>
          <h2 className={styles.title}>🌙 今日收口 · 已完成</h2>
        </header>
        <section className={styles.card}>
          <p className={styles.subtitle}>已完成 {current.completed.length} 项 · 未完成 {current.unfinished.length} 项</p>
          {current.unfinished.length > 0 && (
            <>
              <h3 className={styles.cardTitle}>未完成</h3>
              <div className={styles.list}>
                {current.unfinished.map((u) => (
                  <div key={u.id} className={styles.item}><p className={styles.itemBody}>{u.title}</p></div>
                ))}
              </div>
              {current.reason && <p className={styles.subtitle}>原因：{current.reason}</p>}
            </>
          )}
          <h3 className={styles.cardTitle}>反思</h3>
          <p className={styles.itemBody}>{current.reflection}</p>
          {current.tomorrowFocus.length > 0 && (
            <>
              <h3 className={styles.cardTitle}>明日重点</h3>
              <ul>
                {current.tomorrowFocus.map((f) => (
                  <li key={f} className={styles.itemBody}>{f}</li>
                ))}
              </ul>
            </>
          )}
          <div className={styles.formRow}>
            <button type="button" className={styles.button} onClick={() => navigate('/review/daily')}>
              去做今日复盘 →
            </button>
            <button type="button" className={styles.buttonGhost} onClick={() => navigate('/plan/today')}>
              安排明日计划
            </button>
          </div>
        </section>
      </div>
    )
  }

  // ---- 未完成：聚合 + 表单 ----
  const agg = aggregate
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>🌙 今日收口</h2>
        <p className={styles.subtitle}>{today} · 为今天画上句号</p>
      </header>

      {agg && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>今日全景</h3>
          <div className={styles.itemMeta}>
            <span className={styles.chip}>✅ 完成任务 {agg.completed.length}</span>
            <span className={styles.chip}>⏳ 未完成 {agg.unfinished.length}</span>
            <span className={styles.chip}>📚 学习 {agg.studyMinutes} 分钟</span>
            <span className={styles.chip}>✏️ 攻克错题 {agg.mistakesResolved.length}</span>
            <span className={styles.chip}>🃏 复习闪卡 {agg.flashcardsReviewed}</span>
            <span className={styles.chip}>📅 事件 {agg.events.length}</span>
            <span className={styles.chip}>📖 日记 {agg.diaries}</span>
            <span className={styles.chip}>🎬 动画 {agg.play.episodesWatched} 集</span>
            <span className={styles.chip}>🎮 游戏 {agg.play.gameRecords}</span>
            <span className={styles.chip}>🎵 音乐 {agg.play.musicLogged}</span>
          </div>

          {agg.completed.length > 0 && (
            <>
              <h3 className={styles.cardTitle}>完成的事</h3>
              <div className={styles.list}>
                {agg.completed.map((t) => (
                  <div key={t.id} className={styles.item}><p className={styles.itemBody}>✅ {t.title}</p></div>
                ))}
              </div>
            </>
          )}
          {agg.unfinished.length > 0 && (
            <>
              <h3 className={styles.cardTitle}>没完成的事</h3>
              <div className={styles.list}>
                {agg.unfinished.map((t) => (
                  <div key={t.id} className={styles.item}><p className={styles.itemBody}>⏳ {t.title}</p></div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <form className={styles.card} onSubmit={handleComplete}>
        <h3 className={styles.cardTitle}>收口</h3>
        {agg && agg.unfinished.length > 0 && (
          <input
            className={styles.input}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="为什么没完成？（可选）"
            aria-label="未完成原因"
          />
        )}
        <textarea
          className={styles.textarea}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="今天怎么样？一句话反思（必填）"
          aria-label="今日反思"
        />
        <input
          className={styles.input}
          value={tomorrowFocus}
          onChange={(e) => setTomorrowFocus(e.target.value)}
          placeholder="明日重点（逗号分隔，可选）"
          aria-label="明日重点"
        />
        <div className={styles.formRow}>
          <button type="submit" className={styles.button}>完成收口</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </div>
  )
}
