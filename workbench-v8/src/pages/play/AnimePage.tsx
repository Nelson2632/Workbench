// ============================================================
// V9 PLAY — 动画页：planned/watching/completed/paused/dropped
// 评分 / 收藏 / 感想 / 集数推进（自动完结）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAnimeStore } from '@/stores/animeStore'
import type { AnimeStatus } from '@/types'
import styles from '@/pages/life/life.module.css'

const STATUSES: { v: AnimeStatus; l: string }[] = [
  { v: 'planned', l: '想看' },
  { v: 'watching', l: '在看' },
  { v: 'completed', l: '看完' },
  { v: 'paused', l: '搁置' },
  { v: 'dropped', l: '弃了' },
]

export default function AnimePage() {
  const animeList = useAnimeStore((s) => s.animeList)
  const loading = useAnimeStore((s) => s.loading)
  const loadAnime = useAnimeStore((s) => s.loadAnime)
  const addAnime = useAnimeStore((s) => s.addAnime)
  const setStatus = useAnimeStore((s) => s.setStatus)
  const watchEpisode = useAnimeStore((s) => s.watchEpisode)
  const toggleFavorite = useAnimeStore((s) => s.toggleFavorite)
  const updateAnime = useAnimeStore((s) => s.updateAnime)
  const deleteAnime = useAnimeStore((s) => s.deleteAnime)

  const [name, setName] = useState('')
  const [totalEpisodes, setTotalEpisodes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadAnime()
  }, [loadAnime])

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        setError('动画名不能为空')
        return
      }
      setError('')
      await addAnime({
        name: name.trim(),
        totalEpisodes: totalEpisodes ? Number(totalEpisodes) : null,
      })
      setName('')
      setTotalEpisodes('')
    },
    [addAnime, name, totalEpisodes],
  )

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>添加动画</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 280 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="动画名 *"
            aria-label="动画名"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 140 }}
            value={totalEpisodes}
            onChange={(e) => setTotalEpisodes(e.target.value)}
            placeholder="总集数"
            type="number"
            min={1}
            aria-label="总集数"
          />
          <button type="submit" className={styles.button}>添加</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>

      <section className={styles.list} aria-label="动画列表">
        <h2 className={styles.cardTitle}>我的动画（{animeList.length}）</h2>
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && animeList.length === 0 && <p className={styles.empty}>还没有动画，先添加一部吧</p>}
        {animeList.map((a) => (
          <div key={a.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <p className={styles.itemTitle}>
                {a.favorite ? '⭐ ' : ''}
                {a.name}
              </p>
              <span className={styles.itemMeta}>
                <span className={styles.chip}>
                  {a.watchedEpisodes}
                  {a.totalEpisodes != null ? ` / ${a.totalEpisodes}` : ''} 集
                </span>
                {a.rating != null && <span className={styles.chip}>评分 {a.rating}</span>}
              </span>
            </div>
            {a.thoughts && <p className={styles.itemBody}>{a.thoughts}</p>}
            <div className={styles.formRow}>
              <select
                className={styles.select}
                value={a.status}
                aria-label={`${a.name} 状态`}
                onChange={(e) => void setStatus(a.id, e.target.value as AnimeStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s.v} value={s.v}>{s.l}</option>
                ))}
              </select>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => void watchEpisode(a.id, a.watchedEpisodes + 1)}
                disabled={a.totalEpisodes != null && a.watchedEpisodes >= a.totalEpisodes}
              >
                +1 集
              </button>
              <button type="button" className={styles.buttonGhost} onClick={() => void toggleFavorite(a.id)}>
                {a.favorite ? '取消收藏' : '收藏'}
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  const v = window.prompt('评分（0–10）', String(a.rating ?? ''))
                  if (v !== null && v.trim()) void updateAnime(a.id, { rating: Number(v) })
                }}
              >
                评分
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  const v = window.prompt('感想', a.thoughts)
                  if (v !== null) void updateAnime(a.id, { thoughts: v })
                }}
              >
                感想
              </button>
              <button
                type="button"
                className={styles.buttonDanger}
                onClick={() => {
                  if (window.confirm(`删除动画「${a.name}」？`)) void deleteAnime(a.id)
                }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
