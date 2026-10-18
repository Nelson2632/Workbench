import type { ReactNode, MouseEvent, CSSProperties } from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  className?: string
  hoverable?: boolean
  style?: CSSProperties
}

export default function Card({ children, onClick, className = '', hoverable, style }: CardProps) {
  return (
    <div
      className={`${styles.card} theme-interactive ${onClick ? styles.clickable : ''} ${hoverable ? styles.hoverable : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}