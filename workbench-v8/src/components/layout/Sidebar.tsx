import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import Tooltip from '@/components/ui/Tooltip'
import styles from './Sidebar.module.css'

interface NavGroup {
  id: string
  icon: string
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'today',
    icon: '🏠',
    label: '今日',
    path: '/today',
  },
  {
    id: 'navigator',
    icon: '🧭',
    label: '导航',
    path: '/navigator',
  },
  {
    id: 'study',
    icon: '🎓',
    label: '学习',
    children: [
      { label: '学习驾驶舱', path: '/study' },
      { label: '知识体系', path: '/study/knowledge' },
      { label: '错题本', path: '/study/mistakes' },
      { label: '闪卡', path: '/study/flashcards' },
      { label: '成绩追踪', path: '/study/exams' },
      { label: '阅读', path: '/study/reading' },
    ],
  },
  {
    id: 'plan',
    icon: '📋',
    label: '计划',
    children: [
      { label: '收件箱', path: '/plan/inbox' },
      { label: '今日计划', path: '/plan/today' },
      { label: '未来', path: '/plan/future' },
      { label: '周期计划', path: '/plan/recurring' },
      { label: '项目', path: '/plan/projects' },
    ],
  },
  {
    id: 'life',
    icon: '🌿',
    label: '生活',
    children: [
      { label: '日记', path: '/life/diary' },
      { label: '日记日历', path: '/life/diary-calendar' },
      { label: '日历·事件', path: '/life/events' },
      { label: '好友', path: '/life/friends' },
      { label: '素材', path: '/life/materials' },
    ],
  },
  {
    id: 'review',
    icon: '🌙',
    label: '复盘',
    children: [
      { label: '今日复盘', path: '/review/daily' },
      { label: '学科复盘', path: '/review/subject' },
      { label: '周复盘', path: '/review/weekly' },
      { label: '月复盘', path: '/review/monthly' },
      { label: '考试复盘', path: '/review/exam' },
      { label: '模板', path: '/review/templates' },
    ],
  },
  {
    id: 'play',
    icon: '🎮',
    label: '娱乐',
    children: [
      { label: '动画', path: '/play/anime' },
      { label: '游戏', path: '/play/games' },
      { label: '音乐', path: '/play/music' },
    ],
  },
  {
    id: 'cross',
    icon: '🕰',
    label: '跨域',
    children: [
      { label: '时间线', path: '/timeline' },
      { label: '每日记忆', path: '/memory' },
      { label: '收藏', path: '/collection' },
    ],
  },
  {
    id: 'record',
    icon: '📝',
    label: '记录',
    children: [
      { label: '备忘录', path: '/record/memos' },
      { label: '笔记', path: '/record/notes' },
    ],
  },
  {
    id: 'tools',
    icon: '🛠',
    label: '工具',
    children: [
      { label: '番茄钟', path: '/tools/pomodoro' },
      { label: '随机工具', path: '/tools/random' },
      { label: '记账', path: '/tools/finance' },
      { label: '倒数日', path: '/tools/countdowns' },
      { label: '数据迁移', path: '/migration' },
    ],
  },
  {
    id: 'settings',
    icon: '⚙',
    label: '设置',
    children: [
      { label: '常规设置', path: '/settings' },
      { label: 'V9 系统设置', path: '/settings/v9' },
    ],
  },
]

const BOTTOM_ITEMS = [
  { icon: '🔒', label: '密码本', path: '/vault' },
]

const THEME_OPTIONS: { value: 'mist' | 'fluent' | 'night'; icon: string; label: string }[] = [
  { value: 'mist', icon: '☀️', label: '晨雾书房' },
  { value: 'fluent', icon: '🪟', label: 'Windows Fluent' },
  { value: 'night', icon: '🌙', label: '深色夜航' },
]

export default function Sidebar() {
  const sidebarCollapsed = useSystemStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useSystemStore((s) => s.toggleSidebar)
  const theme = useSystemStore((s) => s.theme)
  const setTheme = useSystemStore((s) => s.setTheme)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    NAV_GROUPS.forEach((g) => {
      if (g.children) init[g.id] = true
    })
    return init
  })

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)

  // 激活项自动滚动：切到深层路由时，确保当前激活导航项进入可视区
  const location = useLocation()
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [location.pathname])

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const cycleTheme = () => {
    const idx = THEME_OPTIONS.findIndex((t) => t.value === theme)
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]
    setTheme(next.value)
  }

  const currentTheme = THEME_OPTIONS.find((t) => t.value === theme)

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev)
  }

  const closeMobile = () => {
    setMobileOpen(false)
  }

  // Close drawer on outside click
  useEffect(() => {
    if (!mobileOpen) return
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeMobile()
      }
    }
    // Delay adding listener to avoid immediate close on toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [mobileOpen])

  // Close drawer on route change (via NavLink click)
  const handleNavClick = () => {
    closeMobile()
  }

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const navContent = (
    <>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>📋</span>
        {!sidebarCollapsed && <span className={styles.brandTitle}>个人工作台</span>}
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => {
          if (group.path) {
            const link = (
              <NavLink
                key={group.id}
                to={group.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `${styles.groupHeader} nav-indicator ${isActive ? styles.childLinkActive : ''}`
                }
              >
                <span className={styles.groupIcon}>{group.icon}</span>
                {!sidebarCollapsed && <span className={styles.groupLabel}>{group.label}</span>}
              </NavLink>
            )
            if (sidebarCollapsed) {
              return (
                <Tooltip key={group.id} content={group.label} placement="right" block>
                  {link}
                </Tooltip>
              )
            }
            return link
          }

          return (
            <div key={group.id} className={styles.group}>
              {sidebarCollapsed ? (
                <Tooltip content={group.label} placement="right" block>
                  <button
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={expanded[group.id]}
                    aria-controls={`nav-group-${group.id}`}
                  >
                    <span className={styles.groupIcon}>{group.icon}</span>
                  </button>
                </Tooltip>
              ) : (
                <button
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded[group.id]}
                  aria-controls={`nav-group-${group.id}`}
                >
                  <span className={styles.groupIcon}>{group.icon}</span>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <span className={`${styles.arrow} ${expanded[group.id] ? styles.arrowOpen : ''}`}>
                    ›
                  </span>
                </button>
              )}
              {!sidebarCollapsed && (
                <div
                  id={`nav-group-${group.id}`}
                  className={`${styles.children} ${expanded[group.id] ? styles.childrenOpen : ''}`}
                >
                  <div className={styles.childrenInner}>
                    {group.children!.map((child) => {
                      const childActive = location.pathname === child.path
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end={child.path === `/${group.id}`}
                          onClick={handleNavClick}
                          ref={childActive ? activeRef : undefined}
                          className={({ isActive }) =>
                            `${styles.childLink} nav-indicator ${isActive ? styles.childLinkActive : ''}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!sidebarCollapsed && (
        <div className={styles.bottomNav}>
          {BOTTOM_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `${styles.bottomLink} nav-indicator ${isActive ? styles.bottomLinkActive : ''}`
              }
            >
              <span className={styles.bottomIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* Theme switcher */}
      <div className={styles.themeSwitcher}>
        {sidebarCollapsed ? (
          <button
            className={styles.themeCycle}
            onClick={cycleTheme}
            aria-label={`切换主题，当前${currentTheme?.label}`}
            title={currentTheme?.label}
          >
            {currentTheme?.icon}
          </button>
        ) : (
          <div className={styles.themeSwitcherRow}>
            <span className={styles.themeSwitcherLabel}>主题</span>
            <div className={styles.themeSwitcherOptions}>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.themeSwitcherBtn} ${
                    theme === opt.value ? styles.themeSwitcherBtnActive : ''
                  }`}
                  onClick={() => setTheme(opt.value)}
                  aria-label={opt.label}
                  title={opt.label}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar collapse / expand toggle（右侧边缘垂直居中，RF-11） */}
      <button
        type="button"
        className={`${styles.collapseToggle} hide-mobile`}
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        aria-expanded={!sidebarCollapsed}
        title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {sidebarCollapsed ? '▶' : '◀'}
      </button>
    </>
  )

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        className={styles.hamburger}
        onClick={toggleMobile}
        aria-label="打开菜单"
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      {/* Desktop sidebar */}
      <aside
        aria-label="主导航"
        className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''} hide-mobile`}
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        id="mobile-navigation"
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
        aria-label="主导航（移动端）"
        className={`${styles.sidebar} ${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ''}`}
      >
        <button className={styles.mobileCloseBtn} onClick={closeMobile} aria-label="关闭菜单">
          ×
        </button>
        {navContent}
      </aside>
    </>
  )
}