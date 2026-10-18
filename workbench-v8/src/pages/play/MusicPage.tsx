// ============================================================
// V9 PLAY — 音乐记忆页：档案/歌手/感想/收藏（无播放器）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMusicStore } from '@/stores/musicStore'
import styles from '@/pages/life/life.module.css'

export default function MusicPage() {
  const musicList = useMusicStore((s) => s.musicList)
  const loading = useMusicStore((s) => s.loading)
  const loadMusic = useMusicStore((s) => s.loadMusic)
  const logMusic = useMusicStore((s) => s.logMusic)
  const updateMusic = useMusicStore((s) => s.updateMusic)
  const toggleFavorite = useMusicStore((s) => s.toggleFavorite)
  const deleteMusic = useMusicStore((s) => s.deleteMusic)

  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadMusic()
  }, [loadMusic])

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!title.trim() || !artist.trim()) {
        setError('曲名与歌手必填')
        return
      }
      setError('')
      await logMusic({
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim() || null,
      })
      setTitle('')
      setArtist('')
      setAlbum('')
    },
    [album, artist, logMusic, title],
  )

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>记录一首歌</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="曲名 *"
            aria-label="曲名"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 200 }}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="歌手 *"
            aria-label="歌手"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 200 }}
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="专辑（可选）"
            aria-label="专辑"
          />
          <button type="submit" className={styles.button}>记录</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.subtitle}>只做音乐档案，不做播放器（V9 边界）</p>
      </form>

      <section className={styles.list} aria-label="音乐列表">
        <h2 className={styles.cardTitle}>听过的歌（{musicList.length}）</h2>
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && musicList.length === 0 && <p className={styles.empty}>还没有音乐记录</p>}
        {musicList.map((m) => (
          <div key={m.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <p className={styles.itemTitle}>
                {m.favorite ? '⭐ ' : ''}
                {m.title} — {m.artist}
              </p>
              <span className={styles.itemMeta}>
                {m.album && <span className={styles.chip}>{m.album}</span>}
              </span>
            </div>
            {m.thoughts && <p className={styles.itemBody}>{m.thoughts}</p>}
            <div className={styles.itemActions}>
              <button type="button" className={styles.buttonGhost} onClick={() => void toggleFavorite(m.id)}>
                {m.favorite ? '取消收藏' : '收藏'}
              </button>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => {
                  const v = window.prompt('感想', m.thoughts)
                  if (v !== null) void updateMusic(m.id, { thoughts: v })
                }}
              >
                感想
              </button>
              <button
                type="button"
                className={styles.buttonDanger}
                onClick={() => {
                  if (window.confirm(`删除「${m.title}」？`)) void deleteMusic(m.id)
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
