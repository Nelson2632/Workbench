import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Popover.module.css'

/**
 * C6 · Overlay System — Popover = Interact
 * 锚定触发器的交互面板（Select 内部未复用，这里是独立构建块）
 * 接近视口边缘时自动翻转（bottom ↔ top）
 */
interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  placement?: 'bottom-start' | 'bottom-end'
  className?: string
}

type ResolvedPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

const VIEWPORT_MARGIN = 8

export default function Popover({
  trigger,
  children,
  placement = 'bottom-start',
  className = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const [resolvedPlacement, setResolvedPlacement] = useState<ResolvedPlacement>(placement)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onDocClick)
    }
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // 视口边界翻转：面板展开后在下边缘溢出则翻转到上方
  useLayoutEffect(() => {
    if (!open) {
      setResolvedPlacement(placement)
      return
    }
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const overflowBottom = rect.bottom > window.innerHeight - VIEWPORT_MARGIN
    if (placement === 'bottom-start' && overflowBottom) {
      setResolvedPlacement('top-start')
    } else if (placement === 'bottom-end' && overflowBottom) {
      setResolvedPlacement('top-end')
    } else {
      setResolvedPlacement(placement)
    }
  }, [open, placement])

  return (
    <div className={styles.wrap} ref={rootRef}>
      <span
        className={styles.triggerWrap}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {trigger}
      </span>
      {open && (
        <div
          ref={panelRef}
          className={`${styles.panel} ${styles[resolvedPlacement]} ${className}`}
          role="dialog"
        >
          {children}
        </div>
      )}
    </div>
  )
}
