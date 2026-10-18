// ============================================================
// V9 PLAY — 游戏页：Generic Game 档案 + 记录（进度/时长/战绩/笔记）
// Adapter 离线策略展示（lastKnownData + offlineMode 提示）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { isOffline, clearOffline } from '@/domain/play/gameAdapter'
import type { GameRecordType, GameStatus } from '@/types'
import styles from '@/pages/life/life.module.css'

const GAME_STATUSES: { v: GameStatus; l: string }[] = [
  { v: 'playing', l: '在玩' },
  { v: 'completed', l: '通关' },
  { v: 'paused', l: '搁置' },
  { v: 'dropped', l: '弃坑' },
  { v: 'planned', l: '想玩' },
]

const RECORD_TYPES: { v: GameRecordType; l: string }[] = [
  { v: 'progress', l: '进度' },
  { v: 'playtime', l: '时长' },
  { v: 'result', l: '战绩' },
  { v: 'note', l: '笔记' },
]

export default function GamesPage() {
  const games = useGameStore((s) => s.games)
  const records = useGameStore((s) => s.records)
  const loading = useGameStore((s) => s.loading)
  const loadGames = useGameStore((s) => s.loadGames)
  const loadRecords = useGameStore((s) => s.loadRecords)
  const addGame = useGameStore((s) => s.addGame)
  const updateGame = useGameStore((s) => s.updateGame)
  const deleteGame = useGameStore((s) => s.deleteGame)
  const addRecord = useGameStore((s) => s.addRecord)
  const deleteRecord = useGameStore((s) => s.deleteRecord)
  const toggleFavorite = useGameStore((s) => s.toggleFavorite)

  const [name, setName] = useState('')
  const [genre, setGenre] = useState('')
  const [platform, setPlatform] = useState('')
  const [recordText, setRecordText] = useState('')
  const [recordType, setRecordType] = useState<GameRecordType>('progress')
  const [minutes, setMinutes] = useState('')
  const [error, setError] = useState('')
  const [offlineMap, setOfflineMap] = useState<Record<number, boolean>>({})

  useEffect(() => {
    void loadGames()
  }, [loadGames])

  useEffect(() => {
    void (async () => {
      const map: Record<number, boolean> = {}
      for (const g of games) map[g.id] = await isOffline(`game-${g.id}`)
      setOfflineMap(map)
    })()
  }, [games])

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!name.trim()) {
        setError('游戏名不能为空')
        return
      }
      setError('')
      await addGame({ name: name.trim(), genre: genre.trim(), platform: platform.trim() })
      setName('')
      setGenre('')
      setPlatform('')
    },
    [addGame, genre, name, platform],
  )

  const handleAddRecord = async (gameId: number) => {
    if (!recordText.trim() && recordType !== 'playtime') {
      setError('记录内容不能为空')
      return
    }
    setError('')
    const data =
      recordType === 'playtime'
        ? { minutes: Number(minutes) || 0 }
        : { text: recordText.trim() }
    await addRecord({ gameId, type: recordType, data, note: recordText.trim() })
    await loadRecords(gameId)
    setRecordText('')
    setMinutes('')
  }

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>添加游戏</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="游戏名 *"
            aria-label="游戏名"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 160 }}
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="类型"
            aria-label="游戏类型"
          />
          <input
            className={styles.input}
            style={{ maxWidth: 160 }}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="平台"
            aria-label="游戏平台"
          />
          <button type="submit" className={styles.button}>添加</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>

      <section className={styles.list} aria-label="游戏列表">
        <h2 className={styles.cardTitle}>我的游戏（{games.length}）</h2>
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && games.length === 0 && <p className={styles.empty}>还没有游戏</p>}
        {games.map((g) => {
          const gameRecords = records.filter((r) => r.gameId === g.id)
          const offline = offlineMap[g.id] ?? false
          return (
            <div key={g.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemTitle}>
                  {g.favorite ? '⭐ ' : ''}
                  {g.name}
                </p>
                <span className={styles.itemMeta}>
                  {g.genre && <span className={styles.chip}>{g.genre}</span>}
                  {g.platform && <span className={styles.chip}>{g.platform}</span>}
                  {offline && <span className={styles.chip}>离线模式（显示最近数据）</span>}
                </span>
              </div>
              <div className={styles.formRow}>
                <select
                  className={styles.select}
                  value={g.status}
                  aria-label={`${g.name} 状态`}
                  onChange={(e) => void updateGame(g.id, { status: e.target.value as GameStatus })}
                >
                  {GAME_STATUSES.map((s) => (
                    <option key={s.v} value={s.v}>{s.l}</option>
                  ))}
                </select>
                <button type="button" className={styles.buttonGhost} onClick={() => void toggleFavorite(g.id)}>
                  {g.favorite ? '取消收藏' : '收藏'}
                </button>
                {offline && (
                  <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => {
                      void clearOffline(`game-${g.id}`)
                      setOfflineMap((m) => ({ ...m, [g.id]: false }))
                    }}
                  >
                    清除离线标记
                  </button>
                )}
                <button
                  type="button"
                  className={styles.buttonDanger}
                  onClick={() => {
                    if (window.confirm(`删除游戏「${g.name}」及其全部记录？`)) void deleteGame(g.id)
                  }}
                >
                  删除
                </button>
              </div>

              <div className={styles.formRow}>
                <select
                  className={styles.select}
                  value={recordType}
                  aria-label="记录类型"
                  onChange={(e) => setRecordType(e.target.value as GameRecordType)}
                >
                  {RECORD_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>{t.l}</option>
                  ))}
                </select>
                {recordType === 'playtime' ? (
                  <input
                    className={styles.input}
                    style={{ maxWidth: 120 }}
                    type="number"
                    min={1}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="分钟"
                    aria-label="游玩分钟"
                  />
                ) : (
                  <input
                    className={styles.input}
                    style={{ maxWidth: 300 }}
                    value={recordText}
                    onChange={(e) => setRecordText(e.target.value)}
                    placeholder={recordType === 'progress' ? '进度描述，如：第三章' : '记录内容'}
                    aria-label="记录内容"
                  />
                )}
                <button type="button" className={styles.button} onClick={() => void handleAddRecord(g.id)}>
                  记录
                </button>
              </div>

              {gameRecords.length > 0 && (
                <div className={styles.list}>
                  {gameRecords
                    .slice()
                    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                    .map((r) => (
                      <div key={r.id} className={styles.item}>
                        <div className={styles.itemHeader}>
                          <p className={styles.itemBody} style={{ margin: 0 }}>
                            [{r.type}] {r.note || JSON.stringify(r.data)}
                          </p>
                          <button
                            type="button"
                            className={styles.buttonGhost}
                            onClick={() => void deleteRecord(r.id)}
                            aria-label="删除记录"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
