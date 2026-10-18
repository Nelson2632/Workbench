import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * D7 · Undo / Recovery v1.1
 * Undo Window: 5~10s（默认 7s）
 * 幂等: 连续点击只能恢复一次
 * 不可 Undo: Permanent Delete / Vault Security / 不可逆 Migration（由调用侧决定是否触发）
 */
export interface UndoState {
  action: () => void
  message: string
}

export function useUndo(duration = 7000) {
  const [pending, setPending] = useState<UndoState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setPending(null)
  }, [])

  const trigger = useCallback(
    (action: () => void, message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPending({ action, message })
      timerRef.current = setTimeout(() => setPending(null), duration)
    },
    [duration],
  )

  const undo = useCallback(() => {
    if (!pending) return
    pending.action()
    clear() // 幂等：恢复后立即清空，连续点击只恢复一次
  }, [pending, clear])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { trigger, undo, cancel: clear, pending, hasUndo: pending !== null }
}
