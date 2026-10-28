import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { SOURCE_TARGETS } from '@/domain/navigation/timelineTarget'
import type { SourceType } from '@/types'
import styles from '@/pages/life/life.module.css'
const fields: Record<string, string> = { title: '标题', name: '名称', thoughts: '感想', watchedEpisodes: '已看集数', content: '内容', note: '备注', reflection: '反思', reason: '原因', artist: '艺术家', date: '日期', occurredAt: '记录时间', startedAt: '开始', endedAt: '结束', duration: '分钟', subject: '学科', question: '题目', answer: '答案', status: '状态', currentEpisode: '当前集数', totalEpisodes: '总集数', type: '类型', summary: '摘要', result: '结果' }
export default function SourceRecordPage() {
  const { type = '', id = '' } = useParams()
  const target = Object.hasOwn(SOURCE_TARGETS, type) ? SOURCE_TARGETS[type as SourceType] : undefined
  const [record, setRecord] = useState<Record<string, unknown> | null>()
  const [error, setError] = useState('')
  useEffect(() => {
    setRecord(undefined); setError('')
    if (!target) { setRecord(null); return }
    const sub = liveQuery(() => db.table(target.table).get(target.numeric ? Number(id) : id)).subscribe({
      next: row => setRecord(row ?? null), error: () => setError('记录读取失败，请稍后重试'),
    })
    return () => sub.unsubscribe()
  }, [target, id])
  return <div className={styles.root}>
    <h1 className={styles.title}>{target?.label ?? '来源'} · 原始记录</h1>
    {error ? <p role="alert">{error}</p> : record === undefined ? <p role="status">加载中…</p> : record === null ? <p role="status">源记录已移除或无法找到。</p> : <section className={styles.card}>
      {Object.entries(fields).map(([key, label]) => (typeof record[key] === 'string' || typeof record[key] === 'number') && record[key] !== '' ? <div key={key}><h2 className={styles.cardTitle}>{label}</h2><p className={styles.itemBody} style={{ whiteSpace: 'pre-wrap' }}>{String(record[key])}</p></div> : null)}
      {type === 'nightShutdown' && Array.isArray(record.tomorrowFocus) && <p>明日重点：{record.tomorrowFocus.join('、')}</p>}
    </section>}
    {target && <Link to={target.route}>打开{target.label}页面</Link>}{' · '}<Link to="/timeline">返回时间线</Link>
  </div>
}
