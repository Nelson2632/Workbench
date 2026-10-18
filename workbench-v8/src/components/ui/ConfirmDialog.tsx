import type { ReactNode } from 'react'
import Modal from './Modal'
import Button from './Button'
import styles from './ConfirmDialog.module.css'

/**
 * D6 · Confirm / Delete v1.1
 * Low: 单击 + Toast + Undo（调用侧处理）
 * Medium: 单击 + 提示 + 可恢复（调用侧处理）
 * High: Dialog Confirm
 * Critical: 强上下文 + 额外验证
 * 本组件 = High/Critical 的 Dialog Confirm 复合模式。
 */
export type ConfirmRisk = 'low' | 'medium' | 'high' | 'critical'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  risk?: ConfirmRisk
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '删除',
  cancelLabel = '取消',
  risk = 'high',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" ariaLabel={title}>
      <div className={styles.body}>
        {description && <div className={styles.description}>{description}</div>}
        {risk === 'critical' && (
          <div className={styles.criticalNote} role="alert">
            此操作不可恢复，请再次确认。
          </div>
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
