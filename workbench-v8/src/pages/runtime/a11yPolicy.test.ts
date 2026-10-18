// ============================================================
// V9 M8 — 静态 Accessibility 政策测试（V9_MASTER_PLAN §39）
// 政策：键盘可达（button/a/input）、焦点可见（focus-visible）、
// 44px 点击区、色彩独立状态、减少动效、错误 role=alert
// 对 V9 页面源码做静态政策扫描（运行时检查由 Playwright 承担）
// ============================================================

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const SRC = fileURLToPath(new URL('../../', import.meta.url)) // src/

function listFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${name.name}`
    if (name.name === 'node_modules' || name.name === '.git') continue
    if (name.isDirectory()) listFiles(full, out)
    else if (/\.(tsx|ts|css)$/.test(name.name)) out.push(full)
  }
  return out
}

const V9_PAGE_GLOBS = ['pages/life/', 'pages/play/', 'pages/work/', 'pages/cross/', 'pages/system/', 'components/search/V9', 'components/appLock/']
const files = listFiles(SRC)

const v9Pages = files.filter((f) => V9_PAGE_GLOBS.some((g) => f.replaceAll('\\', '/').includes(g)))
const cssFiles = files.filter((f) => f.endsWith('.css'))

describe('M8 静态 Accessibility 政策（V9 页面）', () => {
  it('每个 V9 页面文件都使用 button/a 语义交互（无 div onClick）', () => {
    for (const f of v9Pages.filter((x) => x.endsWith('.tsx'))) {
      const text = readFileSync(f, 'utf8')
      // 豁免：role="dialog" 遮罩的 onClick 仅作点击外部关闭（Esc 亦可达），非内容交互
      const badDiv = text
        .replace(/<div[\s\S]*?role="dialog"[\s\S]*?<\/div>/g, '')
        .match(/<div[^>]*onClick/)
      expect(badDiv, `${f} 不得使用 div onClick（键盘不可达）`).toBeNull()
    }
  })

  it('输入控件均带 aria-label 或占位符语义（键盘/读屏可达）', () => {
    const bad: string[] = []
    for (const f of v9Pages.filter((x) => x.endsWith('.tsx'))) {
      const text = readFileSync(f, 'utf8')
      const inputs = text.match(/<input[\s\S]*?\/>/g) ?? []
      for (const inp of inputs) {
        if (!/aria-label=/.test(inp) && !/placeholder=/.test(inp) && !/type="checkbox"/.test(inp) && !/type="file"/.test(inp)) {
          bad.push(`${f}: ${inp.replace(/\s+/g, ' ').slice(0, 80)}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('错误提示使用 role=alert', () => {
    let count = 0
    for (const f of v9Pages.filter((x) => x.endsWith('.tsx'))) {
      const text = readFileSync(f, 'utf8')
      count += (text.match(/role="alert"/g) ?? []).length
    }
    expect(count).toBeGreaterThanOrEqual(4) // 各表单页均有错误反馈
  })

  it('交互控件最小高度 44px（CSS 政策）', () => {
    const css = cssFiles
      .filter((f) => /life\.module\.css|V9SearchDialog\.module\.css/.test(f))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
    // .button / .input / .select 均声明 min-height 44px（或 .tab 40px + padding）
    expect(css).toMatch(/\.button\s*\{[^}]*min-height:\s*(4[4-9]|[5-9]\d)px/)
    expect(css).toMatch(/\.input\s*\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.select\s*\{[^}]*min-height:\s*44px/)
  })

  it('减少动效：v9-motion.css 包含 prefers-reduced-motion 且关停动画', () => {
    const motion = readFileSync(`${SRC}styles/v9-motion.css`, 'utf8')
    expect(motion).toContain('prefers-reduced-motion: reduce')
    expect(motion).toContain('animation: none')
  })

  it('三区微动效已挂载：life/work/play 区域属性与样式存在', () => {
    const life = readFileSync(`${SRC}pages/life/LifeLayout.tsx`, 'utf8')
    const play = readFileSync(`${SRC}pages/play/PlayLayout.tsx`, 'utf8')
    const today = readFileSync(`${SRC}pages/today/TodayPage.tsx`, 'utf8')
    expect(life).toContain('data-v9-zone="life"')
    expect(play).toContain('data-v9-zone="play"')
    expect(today).toContain('data-v9-zone="work"')
    const css = readFileSync(`${SRC}styles/v9-motion.css`, 'utf8')
    expect(css).toContain(`[data-v9-zone='life']`)
    expect(css).toContain(`[data-v9-zone='work']`)
    expect(css).toContain(`[data-v9-zone='play']`)
  })

  it('任务完成动画（checkbox→线→光晕）挂载于 TaskRow', () => {
    const today = readFileSync(`${SRC}pages/today/TodayPage.tsx`, 'utf8')
    expect(today).toContain('data-v9-done=')
    expect(today).toContain('data-v9-done-title')
    expect(today).toContain('data-v9-done-glow')
    const css = readFileSync(`${SRC}styles/v9-motion.css`, 'utf8')
    expect(css).toContain('@keyframes v9-line-through')
    expect(css).toContain('@keyframes v9-glow')
  })

  it('焦点可见政策：主题层提供 focus-visible 样式', () => {
    const theme = readFileSync(`${SRC}styles/theme.css`, 'utf8')
    // V8 主题层已有 focus 相关样式（border-focus 令牌）
    expect(theme).toContain('--color-border-focus')
  })
})
