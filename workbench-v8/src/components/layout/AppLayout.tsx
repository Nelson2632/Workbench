import CompletionFeedback from '@/components/plan/CompletionFeedback'
import { useMemo } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import Sidebar from './Sidebar'
import styles from './AppLayout.module.css'

/**
 * Canvas 宽度体系（P1.2 Page Registry）
 * Wide 1080: Today / Inbox / Timeline / Plan / Tasks / Projects
 * Narrow 720: Diary / Memory / Games / Collection / Settings
 * Wide 1200: Review
 */
function canvasWidthClass(pathname: string): string {
  if (pathname.startsWith('/review')) return styles.wide1200
  if (
    pathname.startsWith('/today') ||
    pathname.startsWith('/plan') ||
    pathname.startsWith('/timeline')
  ) {
    return styles.wide1080
  }
  if (
    pathname.startsWith('/life') ||
    pathname.startsWith('/memory') ||
    pathname.startsWith('/play') ||
    pathname.startsWith('/settings')
  ) {
    return styles.narrow720
  }
  return ''
}

export default function AppLayout() {
  const theme = useSystemStore((s) => s.theme)
  const sidebarCollapsed = useSystemStore((s) => s.sidebarCollapsed)
  const location = useLocation()

  // 复盘驾驶舱：仅周/月/考试复盘挂「数据观测舱」作用域到整个 main 内容区，
  // 使深色主题全出血铺满（含 .main 的 32px 内边距）。
  // 今日/学科/模板复盘保持跟随全局主题（其 Header 亦随全局主题）。
  const isReviewCockpit =
    location.pathname.startsWith('/review/weekly') ||
    location.pathname.startsWith('/review/monthly') ||
    location.pathname.startsWith('/review/exam')
  const canvasClass = useMemo(() => canvasWidthClass(location.pathname), [location.pathname])

  return (
    <div data-theme={theme} className={sidebarCollapsed ? styles.sidebarCollapsed : ''}>
      <div className={styles.layout}>
        <Sidebar />
        <main
          className={styles.main}
          data-visual-scope={isReviewCockpit ? 'review-data' : undefined}
        >
          <div className={`${styles.canvas} ${canvasClass}`}>
            <CompletionFeedback />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
