import { useEffect, useCallback, useState, useRef, useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Modal.module.css'

/**
 * C6 · Overlay System — Dialog = Decide
 * 硬门禁: Focus Trap 必须 / Escape Close / role + aria-modal / 初始焦点入内 / 关闭后焦点还原
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  ariaLabel,
}: ModalProps) {
  const [closing, setClosing] = useState(false)
  const [visible, setVisible] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // 用 ref 持有最新 onClose，避免父组件内联 onClose 每次渲染都变化 →
  // handleClose/handleKeyDown 身份不稳定 → 焦点 useEffect 每次渲染重跑，把焦点强制拉回第一个输入框
  // （Bug：正在输入时焦点被抢走、锁死在第一个框）。
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleClose = useCallback(() => {
    setClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setClosing(false)
      setVisible(false)
      onCloseRef.current()
    }, 250)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (focusables.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [handleClose],
  )

  // 打开动画
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setClosing(false)
    } else {
      setVisible(false)
      setClosing(false)
    }
  }, [isOpen])

  // 焦点陷阱 + 滚动锁定
  useEffect(() => {
    if (!visible) return
    previouslyFocusedRef.current = document.activeElement as HTMLElement
    const dialog = dialogRef.current
    if (dialog) {
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      // 初始焦点优先给第一个输入框，而非第一个 button（通常是「关闭 ×」按钮），
      // 避免「焦点落在关闭按钮上 → 按空格/回车误触发关闭」的焦点 bug
      const firstInput = dialog.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      )
      const target = firstInput ?? focusables[0]
      if (target) target.focus()
      else dialog.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
      const prev = previouslyFocusedRef.current
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [visible, handleKeyDown])

  if (!visible) return null

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`${styles.modal} ${styles[size]} ${closing ? styles.modalClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
