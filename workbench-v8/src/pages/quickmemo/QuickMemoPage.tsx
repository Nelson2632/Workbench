import { isComposingKey } from '@/utils/composition'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRecordStore } from '@/stores/recordStore'
import { hideCurrentWindow, emitToMainWindow, formatShortcutDisplay } from '@/desktop'
import styles from './QuickMemoPage.module.css'

/**
 * Quick memo floating window (desktop only).
 * Triggered by the global shortcut (Ctrl+Shift+Space, Cmd+Shift+Space on macOS)
 * or the tray menu. Saves straight into the memo stream (IndexedDB) and
 * notifies the main window so its store stays in sync.
 */
export default function QuickMemoPage() {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const addMemo = useRecordStore((s) => s.addMemo)

  // Focus the input whenever the window is (re)opened
  useEffect(() => {
    const focusInput = () => {
      textareaRef.current?.focus()
    }
    focusInput()
    // Rust side dispatches this event via eval() when the window is shown
    window.addEventListener('wb-quick-memo-open', focusInput)
    return () => window.removeEventListener('wb-quick-memo-open', focusInput)
  }, [])

  const handleSave = useCallback(async () => {
    const text = content.trim()
    if (!text) {
      await hideCurrentWindow()
      return
    }
    try {
      await addMemo(text)
      await emitToMainWindow('wb-quick-memo-saved', { content: text })
    } catch (err) {
      // Keep the content so nothing is lost; surface the failure to the user
      console.error('[QuickMemo] Save failed:', err)
      setSaveError(true)
      setTimeout(() => setSaveError(false), 2500)
      return
    }
    setContent('')
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      hideCurrentWindow()
    }, 500)
  }, [content, addMemo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isComposingKey(e) && e.key === 'Escape') {
        e.preventDefault()
        setContent('')
        hideCurrentWindow()
      } else if (!isComposingKey(e) && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  return (
    <div className={styles.window}>
      <div className={styles.titleBar} data-tauri-drag-region>
        <span className={styles.title}>⚡ 快捷备忘</span>
        <button
          className={styles.closeBtn}
          onClick={() => hideCurrentWindow()}
          title="收起 (Esc)"
        >
          ✕
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`想到什么，先记下来…\n(${formatShortcutDisplay('Ctrl+Enter')} 保存 · Esc 收起)`}
        autoFocus
        spellCheck={false}
      />

      <div className={styles.footer}>
        <span className={styles.hint}>
          {saveError ? '✗ 保存失败，内容已保留' : saved ? '✓ 已保存' : `${formatShortcutDisplay('Ctrl+Enter')} 保存`}
        </span>
        <button className={styles.saveBtn} onClick={handleSave} disabled={!content.trim()}>
          存入备忘录
        </button>
      </div>
    </div>
  )
}
