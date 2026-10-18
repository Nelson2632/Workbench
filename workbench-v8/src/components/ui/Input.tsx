import { useId } from 'react'
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ChangeEvent,
  ReactNode,
} from 'react'
import styles from './Input.module.css'

/**
 * C2 · Input System v1.0
 * Input 是 Control，不是 Surface。
 * 家族: Input(Text/TextArea/Number/Date/Search) / Checkbox / Select / Button
 * 几何: Compact 32 / Standard 36 / Major 40；TextArea min-height 80，顶部对齐
 * 状态: Active ≠ Focus-visible（:focus = 编辑态，:focus-visible = 键盘焦点）
 */

export interface FieldProps {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  children: ReactNode
  id?: string
}

export function Field({ label, error, hint, children, id }: FieldProps) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
      {label && (
        <label className={styles.label} htmlFor={fieldId}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  size?: 'compact' | 'standard' | 'major'
}

export default function Input({
  className = '',
  label,
  error,
  hint,
  size = 'standard',
  id,
  value,
  onChange,
  ...props
}: InputProps) {
  const input = (
    <input
      id={id}
      value={value}
      onChange={onChange}
      className={`${styles.input} ${styles[size]} ${error ? styles.inputError : ''} theme-interactive--subtle ${className}`}
      {...props}
    />
  )
  if (label || error || hint) {
    return (
      <Field label={label} error={error} hint={hint} id={id}>
        {input}
      </Field>
    )
  }
  return input
}

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
}

export function TextArea({
  className = '',
  label,
  error,
  hint,
  id,
  value,
  onChange,
  ...props
}: TextAreaProps) {
  const area = (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      className={`${styles.textarea} ${error ? styles.inputError : ''} theme-interactive--subtle ${className}`}
      {...props}
    />
  )
  if (label || error || hint) {
    return (
      <Field label={label} error={error} hint={hint} id={id}>
        {area}
      </Field>
    )
  }
  return area
}

/** Number 变体：显式 type="number"（键盘/校验语义走原生 number input） */
export function NumberInput(props: Omit<InputProps, 'type'>) {
  return <Input type="number" {...props} />
}

/** Date 变体：显式 type="date"（原生日期选择器） */
export function DateInput(props: Omit<InputProps, 'type'>) {
  return <Input type="date" {...props} />
}

/** Search 变体：显式 type="search"（原生清除交互） */
export function SearchInput(props: Omit<InputProps, 'type'>) {
  return <Input type="search" {...props} />
}
