// ============================================================
// V9 SYSTEM — Toast 桥组件（挂 ToastProvider 内）
// 把 React toast 函数注入模块级通知桥（EventBus → Toast）
// ============================================================

import { useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { setToastBridge } from '@/domain/system/notifications'

export default function ToastBridge() {
  const { toast } = useToast()

  useEffect(() => {
    setToastBridge(toast)
    return () => setToastBridge(null)
  }, [toast])

  return null
}
