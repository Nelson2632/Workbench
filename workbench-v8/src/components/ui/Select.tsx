import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import styles from './Select.module.css'

/**
 * C4 · Select / Picker v1.1
 * 身份: 与 Input 并列的独立 Control
 * Active Option = 键盘导航位置，与 List/Row Highlighted 不同
 * 键盘: Space/Enter 打开，↑/↓ 导航，Enter 确认，Esc 关闭
 * Popover: Select → Popover → Options
 */
export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  size?: 'compact' | 'standard' | 'major'
  className?: string
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  label,
  size = 'standard',
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  // 外点关闭
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, close])

  // active option 滚动可见
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function openMenu() {
    if (disabled) return
    setOpen(true)
    const idx = selected ? options.findIndex((o) => o.value === selected.value) : -1
    setActiveIndex(idx >= 0 ? idx : 0)
  }

  function confirmOption(index: number) {
    if (index >= 0 && index < options.length) {
      onChange(options[index].value)
    }
    close()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) {
          openMenu()
        } else if (activeIndex >= 0) {
          confirmOption(activeIndex)
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!open) {
          openMenu()
        } else {
          setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        if (open) setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        if (open) setActiveIndex(options.length - 1)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }

  return (
    <div className={`${styles.root} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.anchor} ref={rootRef}>
        <button
          type="button"
          className={`${styles.trigger} ${styles[size]} ${open ? styles.open : ''} ${disabled ? styles.disabled : ''}`}
          onClick={() => (open ? close() : openMenu())}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`${styles.value} ${selected ? '' : styles.placeholder}`}>
            {selected ? selected.label : placeholder}
          </span>
          <span className={styles.caret} aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <ul
            ref={listRef}
            className={styles.menu}
            role="listbox"
            tabIndex={-1}
          >
            {options.length === 0 && <li className={styles.empty}>无选项</li>}
            {options.map((opt, i) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`${styles.option} ${i === activeIndex ? styles.active : ''} ${opt.value === value ? styles.selected : ''}`}
                onClick={() => confirmOption(i)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
