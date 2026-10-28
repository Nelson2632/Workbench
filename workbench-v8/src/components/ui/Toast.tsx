import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './Toast.module.css'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
}

let nextId = 0
const TOAST_DURATION = 6000
const EXIT_ANIMATION_DURATION = 300

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => () => { timersRef.current.forEach(clearTimeout); timersRef.current.clear() }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])

    // Errors and warnings stay readable until explicitly dismissed.
    if (type === 'warning' || type === 'error') return
    // Set auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      // Start exit animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      )
      // Remove after exit animation
      const removeTimer = setTimeout(() => {
        removeToast(id)
      }, EXIT_ANIMATION_DURATION)
      timersRef.current.set(id, removeTimer)
    }, TOAST_DURATION)

    timersRef.current.set(id, dismissTimer)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t, index) => (
          <div
            key={t.id}
            role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
            aria-live={t.type === 'error' || t.type === 'warning' ? 'assertive' : 'polite'}
            aria-atomic="true"
            onFocusCapture={() => { const timer = timersRef.current.get(t.id); if (timer) clearTimeout(timer) }}
            onMouseEnter={() => { const timer = timersRef.current.get(t.id); if (timer) clearTimeout(timer) }}
            className={`${styles.toast} ${styles[t.type]} ${t.leaving ? styles.toastExit : styles.toastEnter}`}
            style={{ '--toast-index': index } as React.CSSProperties}
          >
            <span className={styles.icon}>{ICONS[t.type]}</span>
            <span className={styles.message}>{t.message}</span>
            <button type="button" onClick={() => removeToast(t.id)} aria-label="关闭通知">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}