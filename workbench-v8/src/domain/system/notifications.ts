// ============================================================
// V9 SYSTEM — 通知桥（V9_MASTER_PLAN Phase 7：基础 Toast）
// EventBus 关键事件 → Toast；React 外可用的模块级桥
// ============================================================

import { eventBus } from '@/domain/events/eventBus'

type ToastFn = (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void

let toastFn: ToastFn | null = null

/** Toast 桥：由 ToastBridge 组件（Provider 内）注入 */
export function setToastBridge(fn: ToastFn | null): void {
  toastFn = fn
}

let initialized = false

/** V9 关键事件 → 基础 Toast（幂等装配） */
export function setupV9Notifications(): void {
  if (initialized) return
  initialized = true

  eventBus.subscribe('flexStudy.fallback', () => {
    toastFn?.('弹性学习已自动切换为手动模式（V8 原排序）', 'warning')
  })
  eventBus.subscribe('backup.created', () => {
    toastFn?.('备份快照已创建', 'info')
  })
  eventBus.subscribe('restore.completed', () => {
    toastFn?.('数据恢复完成，时间线已重建', 'success')
  })
  eventBus.subscribe('friend.birthday', (e) => {
    toastFn?.(`🎂 今天是好友的生日（${e.date}）`, 'success')
  })
  eventBus.subscribe('nightShutdown.completed', () => {
    toastFn?.('今日收口完成，去复盘吧', 'success')
  })
  eventBus.subscribe('timeline.rebuilt', () => {
    toastFn?.('时间线投影已重建', 'info')
  })
  eventBus.subscribe('migration.completed', () => {
    toastFn?.('MyDiary 数据迁移完成', 'success')
  })
}

/** 测试辅助：允许重新装配 */
export function _resetNotificationsForTests(): void {
  initialized = false
}

export function _currentToastFn(): ToastFn | null {
  return toastFn
}
