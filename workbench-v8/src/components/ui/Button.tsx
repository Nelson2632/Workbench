import type { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

/**
 * C1 · Button System v1.0
 * 语义: Primary / Secondary / Quiet / Destructive（role 定义语义，颜色不定义语义）
 * 几何: Compact 32 / Standard 36 / Major 40；Icon-Text Gap 8；Text Padding 16
 * 状态: Default / Hover / Press / Focus-visible / Disabled / Loading / Success
 * 兼容旧名: danger→destructive, ghost→quiet；sm→compact, md→standard, lg→major
 */
type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive'
type Size = 'compact' | 'standard' | 'major'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | 'danger' | 'ghost'
  size?: Size | 'sm' | 'md' | 'lg'
  loading?: boolean
  success?: boolean
  children: ReactNode
}

const VARIANT_MAP: Record<string, Variant> = {
  primary: 'primary',
  secondary: 'secondary',
  quiet: 'quiet',
  destructive: 'destructive',
  danger: 'destructive',
  ghost: 'quiet',
}

const SIZE_MAP: Record<string, Size> = {
  compact: 'compact',
  standard: 'standard',
  major: 'major',
  sm: 'compact',
  md: 'standard',
  lg: 'major',
}

export default function Button({
  variant = 'primary',
  size = 'standard',
  loading = false,
  success = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const v = VARIANT_MAP[variant] ?? 'primary'
  const s = SIZE_MAP[size] ?? 'standard'
  return (
    <button
      className={`${styles.btn} ${styles[v]} ${styles[s]} ${loading ? styles.loading : ''} ${success ? styles.success : ''} theme-interactive theme-interactive--subtle ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.content}>{children}</span>
    </button>
  )
}
