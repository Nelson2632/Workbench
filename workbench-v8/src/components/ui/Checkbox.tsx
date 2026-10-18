import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Checkbox.module.css'

/**
 * C3 · Checkbox / Selection v1.0
 * 三语义: Completion / Selection / Boolean Setting
 * 核心: Checked ≠ Selected
 * 几何: Visual 16×16 / Hit Area ≥32×32
 * 键盘: Space → Toggle（原生行为），Enter → 不 Toggle（原生行为）
 */
interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  indeterminate?: boolean
  label?: ReactNode
  disabled?: boolean
  /** 只读：展示状态但不可切换（视觉正常、不可交互、可聚焦供读屏） */
  readOnly?: boolean
  id?: string
  className?: string
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  readOnly = false,
  id,
  className = '',
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label
      className={`${styles.wrap} ${disabled ? styles.disabled : ''} ${
        readOnly ? styles.readOnly : ''
      } ${className}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        aria-readonly={readOnly || undefined}
        onClick={(e) => {
          if (readOnly) e.preventDefault()
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        {indeterminate ? (
          <span className={styles.indet} />
        ) : checked ? (
          <span className={styles.check} />
        ) : null}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
}
