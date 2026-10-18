// ============================================================
// V9 CROSS DOMAIN — Daily Memory 每日记忆页
// Facts（机器派生，可重建）+ Reflection（人类书写，永不覆盖）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { useDailyMemoryStore } from '@/stores/dailyMemoryStore'
import { formatDate } from '@/utils/helpers'
import styles from '@/pages/life/life.module.css'

export default function DailyMemoryPage() {
  const today = formatDate(new Date())
  const [date, setDate] = useState(today)
  const [reflection, setReflection] = useState('')

  const row = useDailyMemoryStore((s) => s.row)
  const loading = useDailyMemoryStore((s) => s.loading)
  const load = useDailyMemoryStore((s) => s.load)
  const refresh = useDailyMemoryStore((s) => s.refresh)
  const saveReflection = useDailyMemoryStore((s) => s.saveReflection)

  useEffect(() => {
    void load(date)
  }, [date, load])

  useEffect(() => {
    setReflection(row?.reflection ?? '')
  }, [row])

  const handleRefresh = useCallback(async () => {
    const before = row?.reflection ?? ''
    await refresh(date)
    // 刷新后 Reflection 必须原样保留（§6.3 硬规则）
    if (useDailyMemoryStore.getState().row?.reflection !== before) {
      console.warn('[DailyMemory] reflection was overwritten — contract violation')
    }
  }, [date, refresh, row])

  const handleSaveReflection = useCallback(async () => {
    await saveReflection(date, reflection)
  }, [date, reflection, saveReflection])

  const facts = row?.facts

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>🧠 Daily Memory · 每日记忆</h1>
        <label className={styles.subtitle}>
          日期：
          <input
            className={styles.input}
            style={{ minHeight: 40, width: 160 }}
            type="date"
            value={date}
            aria-label="选择日期"
            onChange={(e) => setDate(e.target.value || today)}
          />
        </label>
        <button type="button" className={styles.buttonGhost} onClick={() => void handleRefresh()}>
          刷新事实
        </button>
      </header>

      {loading && <p className={styles.empty}>加载中…</p>}
      {!loading && !facts && <p className={styles.empty}>这一天还没有记忆</p>}

      {facts && (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Facts · 机器整理的事实</h2>
            <div className={styles.itemMeta}>
              <span className={styles.chip}>WORK：完成 {facts.work.tasksCompleted} 任务 · 学习 {facts.work.studyMinutes} 分钟 · 攻克 {facts.work.mistakesResolved} 错题 · 闪卡 {facts.work.flashcardsReviewed}</span>
              <span className={styles.chip}>LIFE：日记 {facts.life.diaries} · 瞬间 {facts.life.lifeMoments} · 事件 {facts.life.events}</span>
              <span className={styles.chip}>PLAY：动画 {facts.play.episodesWatched} 集 · 游戏 {facts.play.gameRecords} · 音乐 {facts.play.musicLogged}</span>
              {facts.work.nightShutdownDone && <span className={styles.chip}>已收口</span>}
            </div>
            {facts.life.birthdays.length > 0 && (
              <p className={styles.subtitle}>🎂 今天生日：{facts.life.birthdays.join('、')}</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Reflection · 今天最值得记住的一件事（人书写）</h2>
            <textarea
              className={styles.textarea}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="机器整理事实，人留下意义。"
              aria-label="人类反思"
            />
            <div className={styles.formRow}>
              <button type="button" className={styles.button} onClick={() => void handleSaveReflection()}>
                保存反思
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
