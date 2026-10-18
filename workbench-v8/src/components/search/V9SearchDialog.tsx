// ============================================================
// V9 SYSTEM — 全局搜索对话框（Ctrl+Shift+F / macOS: Cmd+Shift+F）
// 跨域结果：LIFE/WORK(时间线)/PLAY/Timeline，点击跳转对应页面
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAll, type V9SearchItem } from '@/domain/search/v9Search'
import { isMacOS } from '@/desktop'
import styles from './V9SearchDialog.module.css'

export default function V9SearchDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<V9SearchItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+Shift+F 打开（macOS 上主修饰键为 Cmd）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const primaryMod = isMacOS() ? e.metaKey : e.ctrlKey
      if (primaryMod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setResults([])
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    let disposed = false
    const t = setTimeout(() => {
      void searchAll(query).then((r) => {
        if (!disposed) setResults(r)
      })
    }, 120)
    return () => {
      disposed = true
      clearTimeout(t)
    }
  }, [query])

  const go = useCallback(
    (item: V9SearchItem) => {
      setOpen(false)
      navigate(item.path)
    },
    [navigate],
  )

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-label="全局搜索" onClick={() => setOpen(false)}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索日记 / 事件 / 好友 / 动画 / 游戏 / 音乐 / 时间线…（Esc 关闭）"
          aria-label="全局搜索关键词"
        />
        <ul className={styles.list} role="listbox">
          {results.length === 0 && query.trim() && <li className={styles.empty}>没有跨域结果</li>}
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected="false">
              <button type="button" className={styles.item} onClick={() => go(r)}>
                <span className={styles.icon}>{r.icon}</span>
                <span className={styles.body}>
                  <span className={styles.title}>{r.title}</span>
                  {r.snippet && <span className={styles.snippet}>{r.snippet}</span>}
                </span>
                <span className={styles.badge}>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
