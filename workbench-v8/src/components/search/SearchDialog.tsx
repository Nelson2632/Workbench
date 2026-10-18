import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useRecurringStore } from '@/stores/recurringStore'
import { useRecordStore } from '@/stores/recordStore'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useReviewStore } from '@/stores/reviewStore'
import type { SearchResult } from '@/types'
import styles from './SearchDialog.module.css'

const MODULE_ICONS: Record<string, string> = {
  task: '✅',
  recurring: '🔄',
  project: '📁',
  note: '📝',
  memo: '💬',
  knowledge: '📚',
  flashcard: '🃏',
  mistake: '❌',
  exam: '📊',
  review: '🌙',
  reading: '📖',
}

const MODULE_LABELS: Record<string, string> = {
  task: '任务',
  recurring: '周期任务',
  note: '笔记',
  memo: '备忘录',
  knowledge: '知识',
  flashcard: '闪卡',
  mistake: '错题',
  exam: '考试',
  review: '复盘',
  reading: '阅读',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightMatch(text: string, query: string): string {
  // 先转义用户数据与查询词，再注入 <mark>，避免 XSS
  const safeText = escapeHtml(text)
  if (!query) return safeText
  const safeQuery = escapeHtml(query)
  const escaped = safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return safeText.replace(regex, '<mark>$1</mark>')
}

const MODULE_ICON_KEY: Record<string, string> = {
  任务: 'task',
  周期任务: 'recurring',
  项目: 'project',
  笔记: 'note',
  备忘录: 'memo',
  知识: 'knowledge',
  闪卡: 'flashcard',
  错题: 'mistake',
  考试: 'exam',
  复盘: 'review',
  阅读: 'reading',
}

export default function SearchDialog() {
  const navigate = useNavigate()
  const searchOpen = useSystemStore((s) => s.searchOpen)
  const closeSearch = useSystemStore((s) => s.closeSearch)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get data from all stores
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)
  const recurringTasks = useRecurringStore((s) => s.recurringTasks)
  const notes = useRecordStore((s) => s.notes)
  const memos = useRecordStore((s) => s.memos)
  const subjects = useStudyStore((s) => s.subjects)
  const flashcards = useFlashcardStore((s) => s.flashcards)
  const mistakes = useStudyStore((s) => s.mistakes)
  const exams = useStudyStore((s) => s.exams)
  const reviews = useReviewStore((s) => s.reviews)
  const reading = useStudyStore((s) => s.reading)

  // Auto-focus on open
  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  // Debounced search
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const matched: SearchResult[] = []

    // Tasks
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)) {
        matched.push({
          id: t.id,
          type: 'plan',
          title: t.title,
          subtitle: t.note || t.dueDate || '',
          moduleLabel: '任务',
          path: '/plan/inbox',
        })
      }
    }

    // Recurring tasks
    for (const rt of recurringTasks) {
      if (rt.title.toLowerCase().includes(q) || (rt.category && rt.category.toLowerCase().includes(q))) {
        matched.push({
          id: rt.id,
          type: 'plan',
          title: rt.title,
          subtitle: rt.category || '',
          moduleLabel: '周期任务',
          path: '/plan/recurring',
        })
      }
    }

    // Projects
    for (const p of projects) {
      if (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
      ) {
        matched.push({
          id: p.id,
          type: 'plan',
          title: p.title,
          subtitle: p.description.slice(0, 80) || '',
          moduleLabel: '项目',
          path: '/plan/projects',
        })
      }
    }

    // Notes
    for (const n of notes) {
      if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
        matched.push({
          id: n.id,
          type: 'record',
          title: n.title,
          subtitle: n.body.slice(0, 80) || '',
          moduleLabel: '笔记',
          path: '/record/notes',
        })
      }
    }

    // Memos
    for (const m of memos) {
      if (m.content.toLowerCase().includes(q)) {
        matched.push({
          id: m.id,
          type: 'record',
          title: m.content.slice(0, 60),
          subtitle: '',
          moduleLabel: '备忘录',
          path: '/record/memos',
        })
      }
    }

    // Knowledge (subjects)
    for (const sub of subjects) {
      if (sub.name.toLowerCase().includes(q)) {
        matched.push({
          id: sub.id,
          type: 'study',
          title: sub.name,
          subtitle: `${sub.chapters.length} 个章节`,
          moduleLabel: '知识',
          path: '/study/knowledge',
        })
      }
      for (const ch of sub.chapters) {
        if (ch.name.toLowerCase().includes(q)) {
          matched.push({
            id: ch.id,
            type: 'study',
            title: ch.name,
            subtitle: sub.name,
            moduleLabel: '知识',
            path: '/study/knowledge',
          })
        }
      }
    }

    // Flashcards
    for (const f of flashcards) {
      if (f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) {
        matched.push({
          id: f.id,
          type: 'study',
          title: f.question,
          subtitle: f.answer.slice(0, 80),
          moduleLabel: '闪卡',
          path: '/study/flashcards',
        })
      }
    }

    // Mistakes
    for (const m of mistakes) {
      if (m.question.toLowerCase().includes(q) || m.answer.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q)) {
        matched.push({
          id: m.id,
          type: 'study',
          title: m.question,
          subtitle: `${m.subject} · ${m.answer.slice(0, 60)}`,
          moduleLabel: '错题',
          path: '/study/mistakes',
        })
      }
    }

    // Exams
    for (const e of exams) {
      if (e.name.toLowerCase().includes(q) || e.note.toLowerCase().includes(q)) {
        matched.push({
          id: e.id,
          type: 'study',
          title: e.name,
          subtitle: `${e.date} · 总分 ${e.total}`,
          moduleLabel: '考试',
          path: '/study/exams',
        })
      }
    }

    // Reviews
    for (const r of reviews) {
      const typeLabel = { daily: '日复盘', subject: '学科复盘', weekly: '周复盘', monthly: '月复盘', exam: '考试复盘' }[r.type] || r.type
      const text = r.reflections.join(' ') + ' ' + r.nextActions.join(' ')
      if (text.toLowerCase().includes(q) || typeLabel.toLowerCase().includes(q)) {
        matched.push({
          id: r.id,
          type: 'review',
          title: typeLabel,
          subtitle: `${r.dateRange.start} ~ ${r.dateRange.end}`,
          moduleLabel: '复盘',
          path: `/review/${r.type === 'subject' || r.type === 'exam' ? r.type : 'daily'}`,
        })
      }
    }

    // Reading
    for (const r of reading) {
      if (r.title.toLowerCase().includes(q) || r.note.toLowerCase().includes(q)) {
        matched.push({
          id: r.id,
          type: 'study',
          title: r.title,
          subtitle: `${r.current}/${r.target} ${r.unit}`,
          moduleLabel: '阅读',
          path: '/study/reading',
        })
      }
    }

    return matched
  }, [query, tasks, projects, recurringTasks, notes, memos, subjects, flashcards, mistakes, exams, reviews, reading])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  const handleClose = useCallback(() => {
    closeSearch()
    setQuery('')
  }, [closeSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(1, results.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % Math.max(1, results.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results.length > 0) {
          const result = results[activeIndex]
          navigate(result.path)
          handleClose()
        }
      }
    },
    [results, activeIndex, navigate, handleClose],
  )

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      navigate(result.path)
      handleClose()
    },
    [navigate, handleClose],
  )

  // Group results by moduleLabel
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    for (const r of results) {
      const list = map.get(r.moduleLabel) || []
      list.push(r)
      map.set(r.moduleLabel, list)
    }
    return Array.from(map.entries())
  }, [results])

  if (!searchOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="搜索任务、笔记、闪卡..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div className={styles.results}>
          {results.length === 0 && query.trim() ? (
            <div className={styles.empty}>未找到相关结果</div>
          ) : !query.trim() ? (
            <div className={styles.empty}>输入关键词开始搜索</div>
          ) : (
            grouped.map(([label, items]) => (
              <div key={label} className={styles.group}>
                <div className={styles.groupLabel}>{label}</div>
                {items.map((item) => {
                  const isActive = results[activeIndex]?.id === item.id
                  return (
                    <div
                      key={item.id}
                      className={`${styles.resultItem} ${isActive ? styles.resultItemActive : ''}`}
                      onClick={() => handleResultClick(item)}
                      onMouseEnter={() => {
                        const idx = results.findIndex((r) => r.id === item.id)
                        if (idx >= 0) setActiveIndex(idx)
                      }}
                    >
                      <span className={styles.resultIcon}>
                        {MODULE_ICONS[MODULE_ICON_KEY[item.moduleLabel] || 'task']}
                      </span>
                      <div className={styles.resultContent}>
                        <div
                          className={styles.resultTitle}
                          dangerouslySetInnerHTML={{ __html: highlightMatch(item.title, query.trim()) }}
                        />
                        {item.subtitle && (
                          <div
                            className={styles.resultSubtitle}
                            dangerouslySetInnerHTML={{ __html: highlightMatch(item.subtitle, query.trim()) }}
                          />
                        )}
                      </div>
                      <span className={styles.moduleBadge}>{item.moduleLabel}</span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerItem}>
            <span>↑↓</span> 导航
          </span>
          <span className={styles.footerItem}>
            <span>↵</span> 打开
          </span>
          <span className={styles.footerItem}>
            <span>ESC</span> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}