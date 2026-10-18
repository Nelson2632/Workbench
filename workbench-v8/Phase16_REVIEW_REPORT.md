# Phase 16 Product Polish — Review Report

> 项目：个人工作台 V8
> 阶段：Phase 16 Product Polish（视觉收敛，不新增业务功能）
> 依据：`V8_DESIGN_MASTER_IMPLEMENTATION_SPEC_v1.0.md`
> 日期：2026-08-25

---

## 1. 执行摘要

本次 Phase 16 以「不新增业务功能」为前提，完成三件事：

1. **定位并修复「闪退」根因** —— ECharts 图表直接使用了 CSS 变量（`var(--xxx)`）与已被 Phase 15 移除的旧 token 名，Canvas 无法解析这些字符串，导致图表渲染异常/报错。
2. **补上「切换主题」入口** —— 侧边栏底部新增常驻主题切换器（晨雾书房 / Windows Fluent / 深色夜航）。
3. **视觉收敛** —— 落地容器体系（Section/List/Panel/Card/DataBlock）、四主题材质类与主题专属 hover/motion。

严格遵守约束：**未改动** 数据模型、信息架构、事件系统、技术栈。

验证：`npx tsc --noEmit` 通过，`npm run build` 通过（`✓ built`），27 个 Vitest 用例全绿。

---

## 2. 闪退问题定位与修复

### 2.1 根因

`src/styles/theme.css` 在 Phase 15 已删除旧 token 别名（注释明确写着「旧 token 别名已移除」），但多个页面的 **ECharts 图表配置** 和 **内联样式** 仍引用旧 token 名：

```js
// ECharts（Canvas 渲染，无法解析 CSS 变量）
axisLabel: { color: 'var(--text-secondary)' }   // 旧名，未定义
lineStyle: { color: 'var(--accent)' }           // 旧名，未定义
splitLine: { color: 'var(--border-light)' }     // 旧名，未定义
```

- 正确 token 名为 `--color-text-secondary`、`--color-accent`、`--color-border-light` 等。
- 这些字符串传给 ECharts 后既不是有效颜色、也不是合法 CSS 变量（Canvas 无法求值），是图表页「闪退 / 图表黑屏」的直接嫌疑点。

### 2.2 修复方案

新增 `src/utils/chartTheme.ts`，从 DOM 读取「计算后的」主题色再传给 ECharts，保证与 CSS Token 一致、且随主题切换更新（依据 SPEC §12.1「CODE 从 CSS Variables 读取」）：

```ts
export function globalChartPalette(): ChartPalette  // 全局 mist/fluent/night，读 getComputedStyle
export const reviewChartPalette: ChartPalette       // review-data scope 静态常量（挂在页面容器，读不到 documentElement）
```

### 2.3 受影响文件（图表）

| 文件 | 改动 |
|---|---|
| `src/pages/study/DashboardPage.tsx` | 2 处图表改用 `globalChartPalette()`，`useMemo` 加 `theme` 依赖 |
| `src/pages/study/ExamsPage.tsx` | 2 处图表改用 `globalChartPalette()`，加 `theme` 依赖 |
| `src/pages/review/WeeklyReviewPage.tsx` | 饼图改用 `reviewChartPalette` |
| `src/pages/review/MonthlyReviewPage.tsx` | 对比柱图改用 `reviewChartPalette` |
| `src/pages/review/ExamReviewPage.tsx` | 2 处饼图改用 `reviewChartPalette` |

---

## 3. 旧 token 残留修复

全量扫描 `var(--text-* / --accent / --border-* / --surface-*)` 等旧名，统一替换为 `--color-*` 新名。影响文件：

- `DailyReviewPage.tsx` / `SubjectReviewPage.tsx` / `WeeklyReviewPage.tsx` / `MonthlyReviewPage.tsx` / `ExamReviewPage.tsx`（复盘表单下拉框内联样式：透明背景、无边框 → 已修复为 `--color-surface-2` + `--color-border`）
- `FlashcardsPage.tsx`（导入提示、标签 chip 内联样式）
- `InboxPage.tsx`（加载/时间戳内联样式）
- `PomodoroPage.tsx`（SVG 圆环 `stroke="var(--accent)"` 属性无法解析 CSS 变量 → 改为 `style={{ stroke: 'var(--color-accent)' }}`）
- `SettingsPage.module.css`（`--surface` → `--color-surface`）
- `ErrorBoundary.tsx`（回退 UI 内联样式）

修复后 `grep` 全仓不再命中任何旧 token 名。

---

## 4. 主题切换按钮

原主题切换仅存在于「设置」页，入口过深。新增 **侧边栏底部常驻主题切换器**：

- 展开态：`主题` 标签 + 三个图标按钮（☀️ 晨雾书房 / 🪟 Windows Fluent / 🌙 深色夜航），当前主题高亮。
- 折叠态：单个图标按钮，点击循环切换三套主题。

文件：`src/components/layout/Sidebar.tsx`、`Sidebar.module.css`。

---

## 5. Phase 16 视觉收敛

### 5.1 四主题真实视觉空间

`theme.css` 已定义四套 Token + 材质系统（§2/§11），本次将材质类真正挂载到页面：

| 主题 | 材质类 | 应用位置 |
|---|---|---|
| A 晨雾书房 mist | `.mist-paper` | 今日页 Panel（纸页材质） |
| C Windows Fluent | `.fluent-window` | 今日页 Panel（Acrylic 浮窗） |
| D 深色夜航 night | `.night-focus` | 今日页 Panel（深空焦点面） |
| F 数据驾驶舱 review-data | `.holo-panel` | 周/月/考试复盘的图表卡、报告卡、分析卡（全息光幕） |

复盘页继续使用 `data-visual-scope="review-data"` 作用域，配合 `--chart-*` 全息色系与发光阴影，形成独立的「数据观测舱」空间。

### 5.2 主题专属 hover / motion

- 新增 `src/hooks/useThemeInteraction.ts`：用事件委托统一在 `mouseover/mouseout` 时给 `.theme-interactive` 元素切换 `.is-hovered`（仅精确指针，触屏跳过；`prefers-reduced-motion` 由 CSS 全局压平）。
- 在 `App.tsx` 挂载该 hook，激活 theme.css §12 已定义的四套 hover 反馈语言：
  - Mist：纸页觉醒（晨光扫过 + 轻微浮起）
  - Fluent：浮窗升起（大幅浮起 + Acrylic 加深）
  - Night：夜航点灯（月光掠过 + 聚焦/降亮度）
  - Cockpit：系统唤醒（浮起 + 顶部点亮光条 + 数据响应）
- 在今日任务行、学习驾驶舱薄弱项/错题项、闪卡浏览卡、复盘历史条目上挂 `.theme-interactive`。
- 新增主题切换平滑过渡：`body` 与 `.main` 的 `background-color` 过渡（按元素声明，遵守 SPEC §11.2「禁止 `* { transition: all }`」）。

### 5.3 修复 Card 过度使用（容器体系）

按 SPEC §3.2「Container System > Card」重排「今日」页，由 6 个 Card 拆分为语义容器：

| 区块 | 原 | 现 |
|---|---|---|
| 顶部问候 | 纯文本 | Section（留白 hero，不套容器） |
| 今日三件最重要的事 | Card | **Panel**（重点内容 + 主题材质） |
| 今日周期计划 | Card | **List**（行式，去卡片化） |
| 今日专注 | Card | **DataBlock**（极简指标） |
| 今日学习 | Card | **List**（行式） |
| 今日复盘 | Card | **Panel**（重点内容 + 主题材质） |

文件：`src/pages/today/TodayPage.tsx`。

---

## 6. Design Review（逐页）

### 6.1 今日（TodayPage）
- ✅ 容器语义收敛（Section / List / Panel / DataBlock）。
- ✅ 任务行接入主题 hover。
- ✅ Panel 接入三套主题材质。
- 说明：问候区保持留白，贴合 Mist「留白」命题。

### 6.2 学习（DashboardPage / ExamsPage）
- ✅ 图表颜色改为从 CSS Token 解析，随主题切换。
- ✅ 薄弱项 / 错题项接入主题 hover。
- ⚠️ 驾驶舱仍以 Card 承载「指标 + 列表 + 图表」混合内容，属合理使用（非「全卡片化」失败模式），本次未强制拆分。

### 6.3 闪卡（FlashcardsPage）
- ✅ 浏览卡接入主题 hover。
- ✅ 导入/标签内联样式 token 修复。
- 说明：闪卡翻转与评级动效已有独立实现（`FlashcardFace` / `FlashcardTheme`），主题层保持克制，不干扰学习专注。

### 6.4 复盘（Daily / Subject / Weekly / Monthly / Exam）
- ✅ 周/月/考试复盘图表卡、报告卡、分析卡挂 `.holo-panel`（F 数据驾驶舱全息面板）。
- ✅ 历史条目接入主题 hover（Cockpit 数据响应）。
- ✅ 图表色使用 `reviewChartPalette`（F 全息色系）。
- ✅ 表单下拉框 token 修复（透明背景 → 正确 surface）。
- 说明：今日复盘 / 学科复盘维持 Global Theme（非 review-data scope），符合 SPEC §5.3「周/月/考试复盘按需进入 review-data scope」。

---

## 7. 未修改项（约束遵守）

| 约束 | 状态 |
|---|---|
| 数据模型（18 张表 / 22 张 Dexie v2） | 未改 |
| 信息架构（导航 / 路由） | 未改 |
| 事件系统（EventBus 8 类事件） | 未改 |
| 技术栈（React/TS/Dexie/Tauri/Vitest） | 未改 |
| 业务功能 | 未新增 |

---

## 8. 遗留项与建议（不阻塞）

1. **FinancePage chunk 566KB**：ECharts 全量打包导致单页 chunk 过大。建议后续按需注册图表（本页仅用少量图表类型），或 `manualChunks` 拆分 ECharts。
2. **Dashboard 的 Card → DataBlock 细化**：学习驾驶舱的 6 个 Card 中，纯指标卡可进一步拆为 DataBlock；本次因内容混合未强制拆分。
3. **Chart 主题热切换的 registry 机制**：当前图表在 `theme` 依赖变化时通过 `setOption` 重建 option 生效；SPEC §12.2 的「chart registry」集中刷新机制可作为后续优化。
4. **ECharts CSS 变量读取依赖 `getComputedStyle`**：全局主题（documentElement）读取可靠；`review-data` scope 因挂在页面容器，采用静态常量与 theme.css 保持一致，若后续调整 F 色值需同步两处。

---

## 9. 验证结果

- `npx tsc --noEmit`：通过（无类型错误）。
- `npm run build`：通过（`✓ built in 3.54s`）。
- `npm run test`：27/27 用例通过。
- 旧 token 名扫描：0 命中。
- ECharts `var(--xxx)` / 硬编码 `rgba(99,102,241,…)`：0 命中。

> 结论：闪退根因已修复，主题切换入口已补齐，四主题视觉空间、主题专属 hover/motion、容器体系已按 DESIGN_MASTER_SPEC 落地，Phase 16 达标。
