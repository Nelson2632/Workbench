// ============================================================
// V9 CROSS DOMAIN — Timeline 时间线页（事件投影展示）
// 行 = sourceType/sourceId/eventType + 元数据（不复制事实载荷）
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTimelineStore } from '@/stores/timelineStore'
import type { Domain, TimelineEvent } from '@/types'
import styles from '@/pages/life/life.module.css'

const DOMAIN_LABEL: Record<Domain, string> = { work: 'WORK', life: 'LIFE', play: 'PLAY', system: 'SYSTEM' }

function groupByDay(items: TimelineEvent[]): [string, TimelineEvent[]][] {
  const map = new Map<string, TimelineEvent[]>()
  for (const it of items) {
    const day = it.occurredAt.slice(0, 10)
    const list = map.get(day) ?? []
    list.push(it)
    map.set(day, list)
  }
  return [...map.entries()]
}

export default function TimelinePage() {
  const items = useTimelineStore((s) => s.items)
  const loading = useTimelineStore((s) => s.loading)
  const load = useTimelineStore((s) => s.load)
  const rebuild = useTimelineStore((s) => s.rebuild)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => groupByDay(items), [items])

  const handleRebuild = useCallback(async () => {
    if (!window.confirm('从各域事实表重建时间线投影？（清空后重算，幂等）')) return
    setNotice('')
    const count = await rebuild()
    setNotice(`重建完成：${count} 条事件（timeline.rebuilt 已发布）`)
  }, [rebuild])

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>🕰 Timeline · 时间线</h1>
        <button type="button" className={styles.buttonGhost} onClick={() => void handleRebuild()}>
          重建投影
        </button>
      </header>
      {notice && <p className={styles.subtitle} role="status">{notice}</p>}
      {loading && <p className={styles.empty}>加载中…</p>}
      {!loading && items.length === 0 && (
        <p className={styles.empty}>时间线为空——去 LIFE / WORK / PLAY 留下一点记录吧</p>
      )}
      {groups.map(([day, list]) => (
        <section key={day} className={styles.card}>
          <h2 className={styles.cardTitle}>{day}</h2>
          <div className={styles.list}>
            {list.map((it) => (
              <div key={it.id} className={styles.item}>
                <div className={styles.itemHeader}>
                  <p className={styles.itemTitle}>{it.title}</p>
                  <span className={styles.itemMeta}>
                    <span className={styles.chip}>{DOMAIN_LABEL[it.sourceDomain as Domain] ?? it.sourceDomain}</span>
                    <span className={styles.chip}>{it.sourceType}</span>
                  </span>
                </div>
                {it.summary && <p className={styles.itemBody}>{it.summary}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
