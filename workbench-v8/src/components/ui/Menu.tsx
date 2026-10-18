import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Menu.module.css'

/**
 * C6 · Overlay System — Menu = Command
 * 键盘: ↑/↓ 导航，Enter 执行，Esc 关闭，Home/End
 */
export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

interface MenuProps {
  trigger: ReactNode
  items: MenuItem[]
}

export default function Menu({ trigger, items }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, close])

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(items.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < items.length) {
          const item = items[activeIndex]
          if (!item.disabled) item.onClick()
          close()
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  function runItem(index: number) {
    const item = items[index]
    if (!item.disabled) item.onClick()
    close()
  }

  return (
    <div className={styles.wrapper} ref={rootRef}>
      <span
        className={styles.triggerWrap}
        onClick={() => {
          setOpen((o) => !o)
          if (!open) setActiveIndex(-1)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>
      {open && (
        <div className={styles.menu} role="menu" onKeyDown={onKeyDown}>
          {items.map((item, i) => (
            <div key={i}>
              {item.separatorBefore && <div className={styles.separator} />}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`${styles.item} ${item.danger ? styles.danger : ''} ${i === activeIndex ? styles.active : ''}`}
                onClick={() => runItem(i)}
                onMouseEnter={() => setActiveIndex(i)}
                disabled={item.disabled}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
