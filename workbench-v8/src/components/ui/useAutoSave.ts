import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * D8 · Auto-save v1.2
 * 状态机: Clean / Editing / Dirty / Saving / Saved / Save Failed
 * Editing: 用户刚修改，防抖计时进行中（待自动保存）
 * Dirty: 有未保存更改但未排入自动保存（保留给手动保存/暂停场景）
 * Save Failed: 必须 Retry + 保留本地草稿
 * 支持 localStorage 草稿（draftKey 提供时），供 Offline Pending / Recovered
 */
export type AutoSaveStatus = 'clean' | 'editing' | 'dirty' | 'saving' | 'saved' | 'save-failed'

interface AutoSaveOptions {
  debounceMs?: number
  draftKey?: string
}

export function useAutoSave<T>(
  save: (value: T) => Promise<void>,
  { debounceMs = 800, draftKey }: AutoSaveOptions = {},
) {
  const [status, setStatus] = useState<AutoSaveStatus>('clean')
  const valueRef = useRef<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save

  const persistDraft = useCallback(
    (value: T) => {
      if (!draftKey) return
      try {
        localStorage.setItem(draftKey, JSON.stringify(value))
      } catch {
        /* ignore quota / privacy errors */
      }
    },
    [draftKey],
  )

  const clearDraft = useCallback(() => {
    if (!draftKey) return
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* ignore */
    }
  }, [draftKey])

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const value = valueRef.current
    if (value === null) return
    setStatus('saving')
    persistDraft(value)
    try {
      await saveRef.current(value)
      setStatus('saved')
      clearDraft()
    } catch {
      setStatus('save-failed') // 草稿已保留，供 Retry / Recovered
    }
  }, [persistDraft, clearDraft])

  const markDirty = useCallback(
    (value: T) => {
      valueRef.current = value
      setStatus('editing')
      persistDraft(value)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, debounceMs)
    },
    [debounceMs, persistDraft, flush],
  )

  const retry = useCallback(() => {
    void flush()
  }, [flush])

  const recover = useCallback((): T | null => {
    if (!draftKey) return null
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }, [draftKey])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return { status, markDirty, flush, retry, recover }
}
