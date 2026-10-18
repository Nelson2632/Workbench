import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import { NAV_GROUPS, EXTRA_ENTRIES } from '@/components/layout/navGroups'
import styles from './NavigatorPage.module.css'

/**
 * 导航总览：一页展示所有模块与子模块，点击卡片跳转。
 * 数据源复用侧边栏的单一事实来源（navGroups.ts）。
 */
export default function NavigatorPage() {
  const navigate = useNavigate()

  const groups = [...NAV_GROUPS, ...EXTRA_ENTRIES]

  return (
    <div className={styles.page}>
      <PageHeader title="导航" description="所有模块与子模块一览，点击跳转" />

      <div className={styles.grid}>
        {groups.map((g) => {
          // 独立入口（有 path，无 children）：整卡点击跳转
          if (g.path && !g.children) {
            return (
              <button
                key={g.id}
                className={`${styles.card} ${styles.cardLink} theme-interactive`}
                onClick={() => navigate(g.path!)}
              >
                <span className={styles.icon}>{g.icon}</span>
                <span className={styles.label}>{g.label}</span>
              </button>
            )
          }

          // 分组（有 children）：卡片 + 子模块列表
          return (
            <div key={g.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.icon}>{g.icon}</span>
                <span className={styles.label}>{g.label}</span>
              </div>
              <div className={styles.children}>
                {g.children!.map((c) => (
                  <button
                    key={c.path}
                    className={`${styles.child} theme-interactive`}
                    onClick={() => navigate(c.path)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
