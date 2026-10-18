// ============================================================
// Personal Workbench V8 — ECharts 主题色解析
// ============================================================
// ECharts 使用 Canvas 渲染，无法解析 CSS 变量（如 var(--color-accent)）。
// 直接把 var(--xxx) 传给 ECharts 会导致颜色解析失败、图表渲染异常甚至报错。
// 这里从 DOM 读取「计算后的」主题色，供图表选项使用，保证与 CSS Token 一致，
// 并在主题切换时随 data-theme 同步更新。
// 依据：V8_DESIGN_MASTER_IMPLEMENTATION_SPEC §12.1「CODE 从 CSS Variables 读取」。

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw || fallback
}

export interface ChartPalette {
  textPrimary: string
  textSecondary: string
  accent: string
  accentSoft: string
  border: string
  grid: string
}

/** 全局主题图表色（mist / fluent / night），随 data-theme 变化 */
export function globalChartPalette(): ChartPalette {
  return {
    textPrimary: cssVar('--color-text-primary', '#2d2a26'),
    textSecondary: cssVar('--color-text-secondary', '#6b6863'),
    accent: cssVar('--color-accent', '#4c6fe8'),
    accentSoft: cssVar('--color-accent-light', '#e9edfb'),
    border: cssVar('--color-border', 'rgba(70,60,50,0.08)'),
    grid: cssVar('--color-border-light', 'rgba(70,60,50,0.045)'),
  }
}

/**
 * 复盘数据驾驶舱（review-data scope）图表色。
 * 该 scope 挂在页面容器（非 documentElement）上，读取不到 documentElement，
 * 因此用静态常量与 theme.css 的 review-data 区块保持一致。
 */
export const reviewChartPalette: ChartPalette = {
  textPrimary: '#e6f4ff',
  textSecondary: '#7eb8ff',
  accent: '#00d4ff',
  accentSoft: '#7b61ff',
  border: 'rgba(0,212,255,0.24)',
  grid: 'rgba(0,212,255,0.1)',
}
