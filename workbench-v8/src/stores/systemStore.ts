import { create } from 'zustand'
import type { Theme } from '@/types'

export interface ShortcutBinding {
  id: string
  label: string
  keys: string // e.g. "Ctrl+K"
  defaultKeys: string
}

interface SystemState {
  theme: Theme
  sidebarCollapsed: boolean
  searchOpen: boolean
  searchQuery: string
  shortcuts: ShortcutBinding[]

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  openSearch: () => void
  closeSearch: () => void
  setSearchQuery: (query: string) => void
  setShortcuts: (shortcuts: ShortcutBinding[]) => void
  resetShortcuts: () => void
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: 'search', label: '全局搜索', keys: 'Ctrl+K', defaultKeys: 'Ctrl+K' },
  { id: 'newTask', label: '新增任务', keys: 'Ctrl+Shift+T', defaultKeys: 'Ctrl+Shift+T' },
  { id: 'dailyReview', label: '每日复盘', keys: 'Ctrl+Shift+R', defaultKeys: 'Ctrl+Shift+R' },
  { id: 'flashcards', label: '闪卡复习', keys: 'Ctrl+Shift+F', defaultKeys: 'Ctrl+Shift+F' },
  { id: 'pomodoro', label: '番茄钟', keys: 'Space', defaultKeys: 'Space' },
]

function loadShortcuts(): ShortcutBinding[] {
  try {
    const raw = localStorage.getItem('wb-shortcuts')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [...DEFAULT_SHORTCUTS]
}

function saveShortcuts(shortcuts: ShortcutBinding[]) {
  localStorage.setItem('wb-shortcuts', JSON.stringify(shortcuts))
}

/** 旧值兼容：dark → night，light → mist */
function normalizeTheme(value: string | null): Theme {
  if (value === 'dark') return 'night'
  if (value === 'light') return 'mist'
  if (value === 'mist' || value === 'fluent' || value === 'night') return value
  return 'mist'
}

function applyThemeToDom(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

const initialTheme = normalizeTheme(
  typeof localStorage !== 'undefined' ? localStorage.getItem('wb-theme') : null,
)

// 在 React 挂载前应用主题到 document 根节点
applyThemeToDom(initialTheme)

export const useSystemStore = create<SystemState>((set) => ({
  theme: initialTheme,
  sidebarCollapsed: false,
  searchOpen: false,
  searchQuery: '',
  shortcuts: loadShortcuts(),

  setTheme: (theme) => {
    localStorage.setItem('wb-theme', theme)
    applyThemeToDom(theme)
    set({ theme })
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openSearch: () => set({ searchOpen: true, searchQuery: '' }),

  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShortcuts: (shortcuts) => {
    saveShortcuts(shortcuts)
    set({ shortcuts })
  },

  resetShortcuts: () => {
    saveShortcuts([...DEFAULT_SHORTCUTS])
    set({ shortcuts: [...DEFAULT_SHORTCUTS] })
  },
}))
