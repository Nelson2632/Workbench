// ============================================================
// Personal Workbench V8 — Motion Utilities（Phase 16.5）
// 提供轻量的数字滚动/过渡插值工具，供数据模块「仪表盘式」数字变化使用。
// 纯工具 + rAF，不引入动画库；prefers-reduced-motion 下直接落到终值。
// ============================================================

import { useEffect, useRef, useState } from 'react'

export type EasingFn = (t: number) => number

/** 缓出三次曲线（仪表盘数字更接近「减速落定」） */
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3)

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches === true
  )
}

export interface AnimateNumberOptions {
  /** 动画时长（毫秒） */
  duration?: number
  /** 保留小数位 */
  decimals?: number
  /** 缓动函数 */
  easing?: EasingFn
}

/**
 * 在 from → to 之间以 requestAnimationFrame 插值，每帧回调 onUpdate。
 * 返回取消函数（卸载时调用以停止动画）。
 */
export function animateNumber(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  options: AnimateNumberOptions = {},
): () => void {
  const { duration = 600, decimals = 1, easing = easeOutCubic } = options

  if (prefersReducedMotion() || duration <= 0) {
    onUpdate(to)
    return () => {}
  }

  let raf = 0
  const start = performance.now()
  const factor = Math.pow(10, decimals)

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const current = from + (to - from) * easing(t)
    onUpdate(Math.round(current * factor) / factor)
    if (t < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      onUpdate(to)
    }
  }

  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/**
 * React hook：当 value 变化时，从旧值滚动到新值（仪表盘式）。
 * 返回当前显示的数值。
 */
export function useCountUp(value: number, options: AnimateNumberOptions = {}): number {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    return animateNumber(from, value, setDisplay, options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}
