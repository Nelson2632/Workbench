import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

/**
 * C6 · Overlay System — Tooltip = Explain
 * 延迟 400ms；只解释，不交互
 */
interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** 触发元素需占满整行（如侧边栏折叠态导航项）时置 true */
  block?: boolean
}

export default function Tooltip({ content, children, placement = 'top', block = false }: TooltipProps) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showDelayed = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(true), 400)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setShow(false)
  }, [])

  return (
    <span
      className={`${styles.wrap} ${block ? styles.wrapBlock : ''}`}
      onMouseEnter={showDelayed}
      onMouseLeave={hide}
      onFocus={showDelayed}
      onBlur={hide}
    >
      {children}
      {show && (
        <span className={`${styles.tip} ${styles[placement]}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
