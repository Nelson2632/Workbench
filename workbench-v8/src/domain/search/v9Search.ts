// ============================================================
// V9 SYSTEM — 全局搜索扩展（V9_MASTER_PLAN §35）
// 覆盖：Diary / LifeMoment / Event / Friend / Material / Article /
//       Anime / Game / Music / Timeline
// 结果统一：sourceDomain/sourceType/sourceId/title/snippet + 跳转 path
// 容错：单表读取失败不拖垮全局（跳过该表继续）
// ============================================================

import { db } from '@/db/database'
import type { Domain } from '@/types'

export interface V9SearchItem {
  id: string
  sourceDomain: Domain | 'system'
  sourceType: string
  sourceId: string
  title: string
  snippet: string
  path: string
  icon: string
  label: string
}

function match(hay: string, q: string): boolean {
  return hay.toLowerCase().includes(q.toLowerCase())
}

function snippetOf(text: string, q: string, max = 60): string {
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return text.slice(0, max)
  const start = Math.max(0, idx - 20)
  return (start > 0 ? '…' : '') + text.slice(start, start + max) + (start + max < text.length ? '…' : '')
}

/** 全量跨域搜索（本地数据量小，全表扫描 + 过滤；单表失败自动跳过） */
export async function searchAll(query: string, limitPerType = 10): Promise<V9SearchItem[]> {
  const q = query.trim()
  if (!q) return []

  const safe = async <T,>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p
    } catch {
      return []
    }
  }

  const [diaries, lifeMoments, events, friends, materials, articles, animeList, games, musicList, timeline] =
    await Promise.all([
      safe(db.diaries.toArray()),
      safe(db.lifeMoments.toArray()),
      safe(db.events.toArray()),
      safe(db.friends.toArray()),
      safe(db.materials.toArray()),
      safe(db.articles.toArray()),
      safe(db.anime.toArray()),
      safe(db.games.toArray()),
      safe(db.music.toArray()),
      safe(db.timelineEvents.toArray()),
    ])

  const out: V9SearchItem[] = []
  const push = (item: V9SearchItem) => {
    const perType = out.filter((o) => o.sourceType === item.sourceType).length
    if (perType < limitPerType) out.push(item)
  }

  for (const d of diaries) {
    if (match(d.title + d.content, q)) {
      push({
        id: `diary-${d.id}`,
        sourceDomain: 'life', sourceType: 'diary', sourceId: String(d.id),
        title: d.title || `日记 ${d.date}`,
        snippet: snippetOf(d.content || d.title, q),
        path: `/life/diary?date=${d.date}`,
        icon: '📖', label: '日记',
      })
    }
  }

  for (const m of lifeMoments) {
    if (match(m.content, q)) {
      push({
        id: `lifeMoment-${m.id}`,
        sourceDomain: 'life', sourceType: 'lifeMoment', sourceId: String(m.id),
        title: `生活瞬间 ${m.date}`,
        snippet: snippetOf(m.content, q),
        path: `/life/diary?date=${m.date}`,
        icon: '✨', label: '生活瞬间',
      })
    }
  }

  for (const e of events) {
    if (match(e.title + e.note, q)) {
      push({
        id: `event-${e.id}`,
        sourceDomain: 'life', sourceType: 'event', sourceId: String(e.id),
        title: e.title,
        snippet: snippetOf(e.note || e.title, q),
        path: '/life/events',
        icon: '📅', label: '事件',
      })
    }
  }

  for (const f of friends) {
    if (match(f.name + (f.alias ?? '') + f.note, q)) {
      push({
        id: `friend-${f.id}`,
        sourceDomain: 'life', sourceType: 'friend', sourceId: String(f.id),
        title: f.name,
        snippet: [f.alias, f.relationship].filter(Boolean).join(' · '),
        path: '/life/friends',
        icon: '👥', label: '好友',
      })
    }
  }

  for (const m of materials) {
    if (match(m.title + m.note, q)) {
      push({
        id: `material-${m.id}`,
        sourceDomain: 'life', sourceType: 'material', sourceId: String(m.id),
        title: m.title,
        snippet: m.category,
        path: '/life',
        icon: '🧱', label: '素材',
      })
    }
  }

  for (const a of articles) {
    if (match(a.title + a.content, q)) {
      push({
        id: `article-${a.id}`,
        sourceDomain: 'life', sourceType: 'article', sourceId: String(a.id),
        title: a.title,
        snippet: snippetOf(a.content || a.title, q),
        path: '/life',
        icon: '📄', label: '文章',
      })
    }
  }

  for (const a of animeList) {
    if (match(a.name + a.thoughts, q)) {
      push({
        id: `anime-${a.id}`,
        sourceDomain: 'play', sourceType: 'anime', sourceId: String(a.id),
        title: a.name,
        snippet: a.status,
        path: '/play/anime',
        icon: '🎬', label: '动画',
      })
    }
  }

  for (const g of games) {
    if (match(g.name + g.genre + g.note, q)) {
      push({
        id: `game-${g.id}`,
        sourceDomain: 'play', sourceType: 'game', sourceId: String(g.id),
        title: g.name,
        snippet: [g.genre, g.platform].filter(Boolean).join(' · '),
        path: '/play/games',
        icon: '🎮', label: '游戏',
      })
    }
  }

  for (const m of musicList) {
    if (match(m.title + m.artist + m.thoughts, q)) {
      push({
        id: `music-${m.id}`,
        sourceDomain: 'play', sourceType: 'music', sourceId: String(m.id),
        title: `${m.title} — ${m.artist}`,
        snippet: m.album ?? '',
        path: '/play/music',
        icon: '🎵', label: '音乐',
      })
    }
  }

  for (const t of timeline) {
    if (match(t.title + t.summary, q)) {
      push({
        id: `timeline-${t.id}`,
        sourceDomain: t.sourceDomain, sourceType: 'timeline', sourceId: t.eventKey,
        title: t.title,
        snippet: snippetOf(t.summary || t.title, q),
        path: '/timeline',
        icon: '🕰', label: '时间线',
      })
    }
  }

  return out
}
