import type { ReactNode } from 'react'
import styles from './List.module.css'

/**
 * C5 · List / Row v1.1
 * Row = 对象的化身；List = 对象的队列
 * Density: Compact 36~44 / Standard 48~64 / Comfortable 64~96 / Data 36~48
 * Leading ≤2 / Trailing ≤2
 * Selected = user state；Highlighted = system state（1500~2000ms 一次性）
 * Grouping: List → Group → Row（Group ≠ Section）
 */
export type ListDensity = 'compact' | 'standard' | 'comfortable' | 'data'

interface ListProps {
  children: ReactNode
  density?: ListDensity
  className?: string
}

interface GroupProps {
  children: ReactNode
  label?: ReactNode
  className?: string
}

interface RowProps {
  children: ReactNode
  selected?: boolean
  highlighted?: boolean
  onClick?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  className?: string
}

export function List({ children, density = 'standard', className = '' }: ListProps) {
  return (
    <div className={`${styles.list} ${styles[density]} ${className}`} role="list">
      {children}
    </div>
  )
}

export function Group({ children, label, className = '' }: GroupProps) {
  return (
    <div className={`${styles.group} ${className}`} role="group">
      {label && <div className={styles.groupLabel}>{label}</div>}
      {children}
    </div>
  )
}

export function Row({
  children,
  selected = false,
  highlighted = false,
  onClick,
  leading,
  trailing,
  className = '',
}: RowProps) {
  return (
    <div
      role="listitem"
      aria-selected={selected}
      className={`${styles.row} ${selected ? styles.selected : ''} ${highlighted ? styles.highlighted : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.body}>{children}</span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  )
}
