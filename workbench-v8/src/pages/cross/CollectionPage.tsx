// ============================================================
// V9 CROSS DOMAIN — Collection 收藏页
// 跨域收藏指针：按 sourceDomain 分组展示，支持取消收藏
// （域逻辑见 domain/projection/collection.ts，级联删除由 setupCollection 装配）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import { listCollection, unfavoriteEntry } from '@/domain/projection/collection'
import type { CollectionEntry, Domain } from '@/types'
import styles from '@/pages/life/life.module.css'

const DOMAIN_ORDER: Domain[] = ['work', 'life', 'play', 'system']

const DOMAIN_LABEL: Record<Domain, string> = {
  work: '学习 · Work',
  life: '生活 · Life',
  play: '娱乐 · Play',
  system: '系统 · System',
}

const TYPE_LABEL: Record<string, string> = {
  task: '任务',
  studySession: '学习',
  mistake: '错题',
  review: '复盘',
  exam: '考试',
  diary: '日记',
  lifeMoment: '生活瞬间',
  event: '事件',
  anime: '动画',
  gameRecord: '游戏记录',
  music: '音乐',
  nightShutdown: '收口',
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

export default function CollectionPage() {
  const [entries, setEntries] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setEntries(await listCollection())
    } catch (err) {
      console.error('[Collection] load failed:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleUnfavorite = async (entry: CollectionEntry) => {
    try {
      await unfavoriteEntry(entry.sourceType, entry.sourceId)
      setEntries((prev) => prev.filter((x) => x.id !== entry.id))
    } catch (err) {
      console.error('[Collection] unfavorite failed:', err)
    }
  }

  const groups = DOMAIN_ORDER.map((domain) => ({
    domain,
    items: entries.filter((e) => e.sourceDomain === domain),
  })).filter((g) => g.items.length > 0)

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>⭐ 收藏 · Collection</h1>
        <p className={styles.subtitle}>跨域收藏的指针列表（来自日记 / 动画 / 任务 / 错题等）</p>
      </header>

      {loading && <p className={styles.empty}>加载中…</p>}

      {!loading && entries.length === 0 && (
        <p className={styles.empty}>还没有收藏任何内容。在日记、动画、任务等页面收藏后会出现在这里。</p>
      )}

      {!loading && groups.length > 0 && (
        <>
          {groups.map(({ domain, items }) => (
            <section key={domain} className={styles.card}>
              <h2 className={styles.cardTitle}>{DOMAIN_LABEL[domain]} · {items.length} 项</h2>
              <ul className={styles.list}>
                {items.map((entry) => (
                  <li key={entry.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemHeader}>
                        <span className={styles.itemTitle}>{entry.title || '(无标题)'}</span>
                        <span className={styles.chip}>{TYPE_LABEL[entry.sourceType] ?? entry.sourceType}</span>
                      </div>
                      {entry.note && <p className={styles.subtitle}>{entry.note}</p>}
                      <div className={styles.itemMeta}>
                        <span>收藏于 {formatDate(entry.favoriteAt)}</span>
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.buttonGhost}
                        onClick={() => void handleUnfavorite(entry)}
                        aria-label={`取消收藏：${entry.title}`}
                      >
                        取消收藏
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
