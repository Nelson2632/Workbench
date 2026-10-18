// ============================================================
// Personal Workbench V8 — 主题专属交互层（Theme Interaction Layer）
// ============================================================
// theme.css §12 与 motion.css 定义了四主题各自独立的反馈语言，通过
// `.theme-interactive` + `.is-hovered / .is-active / .is-focus` 触发。
// 这里用事件委托统一维护三个交互态，避免在每个组件里手写鼠标/焦点监听；
// 兼容精确指针（鼠标/触控板），触屏设备 mouseover 本就不会触发。
// 依据：V8_DESIGN_MASTER_IMPLEMENTATION_SPEC §10 / §16 / Phase 16.5。

import { useEffect } from 'react'

function closestInteractive(target: EventTarget | null): HTMLElement | null {
  const el = target as HTMLElement | null
  return el?.closest?.('.theme-interactive') ?? null
}

export function useThemeInteraction(): void {
  useEffect(() => {
    // hover：鼠标/触控板滑入滑出
    const onOver = (e: MouseEvent) => closestInteractive(e.target)?.classList.add('is-hovered')
    const onOut = (e: MouseEvent) => closestInteractive(e.target)?.classList.remove('is-hovered')

    // active：按压 / 释放
    const onDown = (e: PointerEvent) => closestInteractive(e.target)?.classList.add('is-active')
    const onUp = (e: PointerEvent) => closestInteractive(e.target)?.classList.remove('is-active')
    const onCancel = (e: PointerEvent) => closestInteractive(e.target)?.classList.remove('is-active')

    // focus：键盘/程序焦点（标记态，具体 ring 由 :focus-visible 负责）
    const onFocus = (e: FocusEvent) => closestInteractive(e.target)?.classList.add('is-focus')
    const onBlur = (e: FocusEvent) => closestInteractive(e.target)?.classList.remove('is-focus')

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)

    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [])
}
