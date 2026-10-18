// ============================================================
// Desktop 平台助手单测 — isDesktop / isMacOS / modKeyLabel / formatShortcutDisplay
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest'
import { isDesktop, isMacOS, modKeyLabel, formatShortcutDisplay } from './index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('desktop platform helpers', () => {
  it('isDesktop：无 Tauri 注入时为 false，有 __TAURI_INTERNALS__ 时为 true', () => {
    expect(isDesktop()).toBe(false)

    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} })
    expect(isDesktop()).toBe(true)

    vi.unstubAllGlobals()
    expect(isDesktop()).toBe(false)
  })

  it('isMacOS：默认（node 环境无 Mac UA）为 false', () => {
    expect(isMacOS()).toBe(false)
  })

  it('macOS UA：modKeyLabel 返回 ⌘，formatShortcutDisplay 把 Ctrl 换成 ⌘', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    })
    expect(isMacOS()).toBe(true)
    expect(modKeyLabel()).toBe('⌘')
    expect(formatShortcutDisplay('Ctrl+K')).toBe('⌘+K')
    expect(formatShortcutDisplay('Ctrl+Enter')).toBe('⌘+Enter')
  })

  it('非 macOS UA：标签保持 Ctrl 不变', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    expect(isMacOS()).toBe(false)
    expect(modKeyLabel()).toBe('Ctrl')
    expect(formatShortcutDisplay('Ctrl+K')).toBe('Ctrl+K')
  })
})
