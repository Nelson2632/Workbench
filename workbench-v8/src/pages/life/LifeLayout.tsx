// ============================================================
// V9 LIFE — 布局（日记 / 日记日历 / 日历·事件 / 好友）
// ============================================================

import { NavLink, Outlet } from 'react-router-dom'
import styles from './life.module.css'

const TABS = [
  { label: '日记', path: '/life/diary' },
  { label: '日记日历', path: '/life/diary-calendar' },
  { label: '日历·事件', path: '/life/events' },
  { label: '好友', path: '/life/friends' },
]

export default function LifeLayout() {
  return (
    <div className={styles.root} data-v9-zone="life">
      <header className={styles.header}>
        <h1 className={styles.title}>LIFE · 生活空间</h1>
        <p className={styles.subtitle}>记录今天，然后记得它</p>
      </header>
      <nav className={styles.tabs} aria-label="生活空间子模块">
        {TABS.map((t) => (
          <NavLink
            key={t.path}
            to={t.path}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
