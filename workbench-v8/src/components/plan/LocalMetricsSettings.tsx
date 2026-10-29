import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { METRICS_OPT_IN, readLocalMetrics, clearLocalMetrics, type MetricDay } from '@/domain/system/localMetrics'
import styles from '@/pages/life/life.module.css'
export default function LocalMetricsSettings() {
  const [enabled, setEnabled] = useState(false)
  const [days, setDays] = useState<MetricDay[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(async () => ({ enabled: (await db.settings.get(METRICS_OPT_IN))?.value === 'true', days: await readLocalMetrics() })).subscribe({ next: value => { setEnabled(value.enabled); setDays(value.days) }, error: () => setError('本地统计暂时无法读取') })
    return () => subscription.unsubscribe()
  }, [])
  const change = async () => {
    try { await db.settings.put({ key: METRICS_OPT_IN, value: String(!enabled) }); setError('') }
    catch { setError('设置未能保存，请重试') }
  }
  return <section className={styles.card} aria-label="可选本地统计">
    <h2 className={styles.cardTitle}>可选本地统计</h2>
    <p>默认关闭。开启后只在本机保留最近 30 天的四类操作次数，不记录文字、任务标识或输入过程，不联网。不用于连续签到或评分。</p>
    <button type="button" className={styles.buttonGhost} aria-pressed={enabled} onClick={() => void change()}>{enabled ? '关闭本地统计' : '开启本地统计'}</button>
    <button type="button" className={styles.buttonGhost} onClick={() => void clearLocalMetrics().catch(() => setError('清除失败，请重试'))}>清除统计</button>
    {!!days.length && <table><thead><tr><th>日期</th><th>选择开始</th><th>保存捕获</th><th>完成反馈</th><th>调整计划</th></tr></thead><tbody>{days.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.counts.startSelected ?? 0}</td><td>{d.counts.captureSaved ?? 0}</td><td>{d.counts.completionFeedback ?? 0}</td><td>{d.counts.recoveryApplied ?? 0}</td></tr>)}</tbody></table>}
    <p className={styles.subtitle}>这些是操作次数，不等同于实际投入时间或任务成功率。关闭后停止记录；已有统计可手动清除。</p>
    {error && <p role="alert">{error}</p>}
  </section>
}
