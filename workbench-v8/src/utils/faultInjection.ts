// ============================================================
// Personal Workbench V9 — Fault Injection（R1.7 / Q1.5）
// 8 个故障注入 Hook，仅 test_mode 生效（production disabled）。
// 测试通过 inject() 注入故障（如 throw），验证恢复行为。
// ============================================================

export type FaultHook =
  | 'before_domain_commit'
  | 'after_journal_write'
  | 'after_domain_commit'
  | 'mid_projection'
  | 'mid_backup_write'
  | 'mid_migration_transform'
  | 'mid_import'
  | 'mid_export'

export const FAULT_HOOKS: readonly FaultHook[] = [
  'before_domain_commit',
  'after_journal_write',
  'after_domain_commit',
  'mid_projection',
  'mid_backup_write',
  'mid_migration_transform',
  'mid_import',
  'mid_export',
]

type FaultHandler = () => void | Promise<void>

const state: {
  enabled: boolean
  faults: Map<FaultHook, FaultHandler>
} = {
  enabled: false, // production: disabled
  faults: new Map(),
}

export const faultInjection = {
  isEnabled(): boolean {
    return state.enabled
  },
  /** test_mode：启用故障注入（生产环境绝不调用） */
  enable(): void {
    state.enabled = true
  },
  disable(): void {
    state.enabled = false
  },
  /** 注册某个 Hook 的故障处理（如 throw / 篡改） */
  inject(hook: FaultHook, fault: FaultHandler): void {
    state.faults.set(hook, fault)
  },
  clear(): void {
    state.faults.clear()
  },
  /** 触发 Hook（enabled=false 时为空操作，零运行时开销） */
  async fire(hook: FaultHook): Promise<void> {
    if (!state.enabled) return
    const fault = state.faults.get(hook)
    if (fault) await fault()
  },
}

/** 测试辅助：恢复 production disabled + 清空注入故障 */
export function _resetFaultInjectionForTests(): void {
  state.enabled = false
  state.faults.clear()
}
