// ============================================================
// V9 LIFE — 日记页：Quick/Long、心情、天气、标签、Life Moments
// 键盘可达：全部控件带标签；删除需确认
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDiaryStore } from '@/stores/diaryStore'
import { formatDate } from '@/utils/helpers'
import type { Diary, Mood, Weather } from '@/types'
import styles from './life.module.css'

const MOODS: { v: Mood; l: string }[] = [
  { v: 'great', l: '很好' },
  { v: 'good', l: '不错' },
  { v: 'neutral', l: '一般' },
  { v: 'low', l: '低落' },
  { v: 'bad', l: '难过' },
]
const WEATHERS: { v: Weather; l: string }[] = [
  { v: 'sunny', l: '晴' },
  { v: 'cloudy', l: '多云' },
  { v: 'overcast', l: '阴' },
  { v: 'rainy', l: '雨' },
  { v: 'stormy', l: '雷雨' },
  { v: 'snowy', l: '雪' },
  { v: 'windy', l: '风' },
  { v: 'foggy', l: '雾' },
]

const moodLabel = (m: Mood | null) => MOODS.find((x) => x.v === m)?.l ?? '—'
const weatherLabel = (w: Weather | null) => WEATHERS.find((x) => x.v === w)?.l ?? '—'

export default function DiaryPage() {
  const [params, setParams] = useSearchParams()
  const today = formatDate(new Date())
  const date = params.get('date') || today

  const diaries = useDiaryStore((s) => s.diaries)
  const lifeMoments = useDiaryStore((s) => s.lifeMoments)
  const loading = useDiaryStore((s) => s.loading)
  const loadRange = useDiaryStore((s) => s.loadRange)
  const addDiary = useDiaryStore((s) => s.addDiary)
  const updateDiary = useDiaryStore((s) => s.updateDiary)
  const deleteDiary = useDiaryStore((s) => s.deleteDiary)
  const addLifeMoment = useDiaryStore((s) => s.addLifeMoment)
  const deleteLifeMoment = useDiaryStore((s) => s.deleteLifeMoment)

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState<Mood | ''>('')
  const [weather, setWeather] = useState<Weather | ''>('')
  const [tags, setTags] = useState('')
  const [typeMode, setTypeMode] = useState<'auto' | 'quick' | 'long'>('auto')
  const [moment, setMoment] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadRange(date, date)
  }, [date, loadRange])

  const dayDiaries = diaries.filter((d) => d.date === date)
  const dayMoments = lifeMoments.filter((m) => m.date === date)

  const handleAdd = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!content.trim()) {
        setError('内容不能为空')
        return
      }
      setError('')
      const type = typeMode === 'auto' ? undefined : typeMode
      await addDiary({
        date,
        type,
        mood: mood || null,
        weather: weather || null,
        title: title.trim(),
        content: content.trim(),
        tags: tags
          .split(/[,，\s]+/)
          .map((t) => t.trim())
          .filter(Boolean),
      })
      setContent('')
      setTitle('')
      setTags('')
      setMood('')
      setWeather('')
    },
    [addDiary, content, date, mood, tags, title, typeMode, weather],
  )

  const handleAddMoment = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!moment.trim()) return
      await addLifeMoment(date, moment.trim())
      setMoment('')
    },
    [addLifeMoment, date, moment],
  )

  const startEdit = (d: Diary) => {
    setEditingId(d.id)
    setEditingText(d.content)
  }

  const saveEdit = async (d: Diary) => {
    await updateDiary(d.id, { content: editingText, title: d.title })
    setEditingId(null)
  }

  const handleDelete = async (d: Diary) => {
    if (window.confirm(`删除日记「${d.title || d.date}」？`)) {
      await deleteDiary(d.id)
    }
  }

  return (
    <div className={styles.root} style={{ padding: 0 }}>
      <header className={styles.header}>
        <label className={styles.subtitle}>
          日期：
          <input
            className={styles.input}
            style={{ minHeight: 44, width: 160 }}
            type="date"
            value={date}
            aria-label="选择日期"
            onChange={(e) => {
              const v = e.target.value || today
              setParams(v === today ? {} : { date: v })
            }}
          />
        </label>
        <span className={styles.subtitle}>
          {dayDiaries.length} 篇日记 · {dayMoments.length} 个瞬间
        </span>
      </header>

      <form className={styles.card} onSubmit={handleAdd}>
        <h2 className={styles.cardTitle}>写日记</h2>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 260 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选）"
            aria-label="日记标题"
          />
          <select
            className={styles.select}
            value={typeMode}
            aria-label="日记类型"
            onChange={(e) => setTypeMode(e.target.value as 'auto' | 'quick' | 'long')}
          >
            <option value="auto">自动（≤140 字 Quick）</option>
            <option value="quick">Quick</option>
            <option value="long">Long</option>
          </select>
          <select
            className={styles.select}
            value={mood}
            aria-label="心情"
            onChange={(e) => setMood((e.target.value || '') as Mood | '')}
          >
            <option value="">心情</option>
            {MOODS.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={weather}
            aria-label="天气"
            onChange={(e) => setWeather((e.target.value || '') as Weather | '')}
          >
            <option value="">天气</option>
            {WEATHERS.map((w) => (
              <option key={w.v} value={w.v}>
                {w.l}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天发生了什么？（一句话即可）"
          aria-label="日记正文"
        />
        <div className={styles.formRow}>
          <input
            className={styles.input}
            style={{ maxWidth: 320 }}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（逗号分隔）"
            aria-label="标签"
          />
          <button type="submit" className={styles.button}>
            保存
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Life Moments · 生活瞬间</h2>
        <form className={styles.formRow} onSubmit={handleAddMoment}>
          <input
            className={styles.input}
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            placeholder="记下一个瞬间，比如：晚自习的窗外有晚霞"
            aria-label="生活瞬间内容"
          />
          <button type="submit" className={styles.button}>
            记录
          </button>
        </form>
        <div className={styles.list}>
          {dayMoments.map((m) => (
            <div key={m.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <p className={styles.itemBody} style={{ margin: 0 }}>
                  {m.content}
                </p>
                <button
                  type="button"
                  className={styles.buttonGhost}
                  onClick={() => void deleteLifeMoment(m.id)}
                  aria-label={`删除瞬间 ${m.content.slice(0, 10)}`}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {dayMoments.length === 0 && <p className={styles.empty}>这一天还没有瞬间</p>}
        </div>
      </section>

      <section className={styles.list} aria-label="当日日记列表">
        <h2 className={styles.cardTitle}>当日日记</h2>
        {loading && <p className={styles.empty}>加载中…</p>}
        {!loading && dayDiaries.length === 0 && <p className={styles.empty}>这一天还没有日记</p>}
        {dayDiaries.map((d) => (
          <div key={d.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <p className={styles.itemTitle}>{d.title || `日记 · ${d.id}`}</p>
              <span className={styles.itemMeta}>
                <span className={styles.chip}>{d.type === 'quick' ? 'Quick' : 'Long'}</span>
                <span className={styles.chip} aria-label={`心情 ${moodLabel(d.mood)}`}>
                  {moodLabel(d.mood)}
                </span>
                <span className={styles.chip} aria-label={`天气 ${weatherLabel(d.weather)}`}>
                  {weatherLabel(d.weather)}
                </span>
                {d.tags.map((t) => (
                  <span key={t} className={styles.chip}>
                    #{t}
                  </span>
                ))}
              </span>
            </div>
            {editingId === d.id ? (
              <div className={styles.formRow}>
                <textarea
                  className={styles.textarea}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  aria-label="编辑日记正文"
                />
                <button type="button" className={styles.button} onClick={() => void saveEdit(d)}>
                  保存修改
                </button>
                <button type="button" className={styles.buttonGhost} onClick={() => setEditingId(null)}>
                  取消
                </button>
              </div>
            ) : (
              <p className={styles.itemBody}>{d.content || '（空）'}</p>
            )}
            <div className={styles.itemActions}>
              <button type="button" className={styles.buttonGhost} onClick={() => startEdit(d)}>
                编辑
              </button>
              <button type="button" className={styles.buttonDanger} onClick={() => void handleDelete(d)}>
                删除
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
