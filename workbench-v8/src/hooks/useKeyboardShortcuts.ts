import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystemStore, DEFAULT_SHORTCUTS } from '@/stores/systemStore'
import { isQuickMemoWindow } from '@/desktop'

function parseShortcut(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = keys.split('+').map((p) => p.trim())
  const result = { ctrl: false, shift: false, alt: false, meta: false, key: '' }
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl') result.ctrl = true
    else if (lower === 'shift') result.shift = true
    else if (lower === 'alt') result.alt = true
    else if (lower === 'meta' || lower === 'cmd') result.meta = true
    else result.key = part.toLowerCase()
  }
  return result
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  if (!parsed.key) return false

  const ctrlOrMeta = parsed.ctrl || parsed.meta
  const eCtrlOrMeta = e.ctrlKey || e.metaKey

  // For Space shortcut, only match when no modifier keys are pressed
  if (parsed.key === ' ' || parsed.key === 'space') {
    return e.key === ' ' && !eCtrlOrMeta && !e.shiftKey && !e.altKey
  }

  return (
    e.key.toLowerCase() === parsed.key &&
    eCtrlOrMeta === ctrlOrMeta &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt
  )
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const shortcuts = useSystemStore((s) => s.shortcuts)
  const openSearch = useSystemStore((s) => s.openSearch)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      if (isInputFocused()) return

      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut.keys)) {
          e.preventDefault()

          switch (shortcut.id) {
            case 'search':
              openSearch()
              break
            case 'newTask':
              navigate('/plan/inbox')
              break
            case 'dailyReview':
              navigate('/review/daily')
              break
            case 'flashcards':
              navigate('/study/flashcards')
              break
            case 'pomodoro':
              navigate('/tools/pomodoro')
              break
          }
          return
        }
      }
    },
    [shortcuts, navigate, openSearch],
  )

  useEffect(() => {
    // App shortcuts must not run inside the quick memo floating window
    // (e.g. Space → pomodoro would navigate this small window away)
    if (isQuickMemoWindow()) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}