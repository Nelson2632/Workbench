// ============================================================
// V9 PLAY — 布局（动画 / 游戏 / 音乐）
// ============================================================

import { NavLink, Outlet } from 'react-router-dom'
import styles from '@/pages/life/life.module.css'

const TABS = [
  { label: '动画', path: '/play/anime' },
  { label: '游戏', path: '/play/games' },
  { label: '音乐', path: '/play/music' },
]

export default function PlayLayout() {
  return (
    <div className={styles.root} data-v9-zone="play">
      <header className={styles.header}>
        <h1 className={styles.title}>PLAY · 娱乐空间</h1>
        <p className={styles.subtitle}>记录兴趣，全部离线，不依赖外部 API</p>
      </header>
      <nav className={styles.tabs} aria-label="娱乐空间子模块">
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
