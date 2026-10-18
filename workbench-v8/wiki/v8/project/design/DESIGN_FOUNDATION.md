# DESIGN FOUNDATION（Phase 1 交付物）

> 版本：1.0 · 阶段：Phase 1 完成
> 依据：`V8_GLOBAL` / `DESIGN_SPEC` / `DESIGN.md`（D-01~D-17）/ `V8_MASTER_PLAN_v1.21` §5
> 配套实现：`design-foundation.css`（Token + 主题 + 容器 + 状态 + 无障碍 + 动效的单一 CSS 底座）
> 状态：READY（已通过 Self Review，见 §8）

本文是 Phase 1「Design Foundation」的冻结规范，CODE Agent 据此实现主题与组件底座。色值已由 DESIGN 冻结，属 L1/L2 自主决策，不改变任何产品语义。

---

## 1. Design Tokens

### 1.1 命名体系（冻结，唯一）

```text
--color-*        颜色（背景/表面/文字/边框/强调/语义）
--radius-*       圆角
--shadow-*       阴影
--space-*        间距
--font-*         字体（族/字号/字重/行高）
--transition-*   动效时长
--border-width   边框宽度（唯一补充，边框色归 --color-border*）
```

**硬规则**：页面与组件只消费上述 token，禁止在页面/组件内重新定义核心主题变量；禁止再创造第二套命名体系。

### 1.2 颜色令牌

| 分组 | Token | 语义 |
|------|-------|------|
| 品牌 | `--color-brand` / `-hover` / `-light` / `-text` | 品牌身份时刻（Logo/图标/品牌 CTA），固定蓝系，不随主题变 |
| 背景 | `--color-bg` / `--color-surface` / `--color-surface-2` | 页面底 / 卡片面板 / 嵌套悬浮 |
| 文字 | `--color-text-primary` / `-secondary` / `-tertiary` / `-inverse` | 标题正文 / 辅助 / 占位禁用 / 反白 |
| 边框 | `--color-border` / `-light` / `-focus` | 默认 / 浅 / 聚焦 |
| 强调 | `--color-accent` / `-hover` / `-light` / `-text` | **主题 Accent**，随主题变（见 §2） |
| 语义 | `--color-success` / `-warning` / `-danger` / `-info`（+ 各自 `-light`） | 反馈状态 |

### 1.3 其余令牌

| 类别 | 令牌 | 值 |
|------|------|-----|
| 圆角 | `--radius-sm/md/lg/full` | 6 / 10 / 16 / 9999 px（Fluent 覆盖为 4/8/12） |
| 间距 | `--space-1..8` | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 px |
| 字体 | `--font-sans` / `--font-mono` | 系统 UI 栈 / 等宽（数据数字用） |
| 字号 | `--font-size-xs..3xl` | 12 / 13 / 15 / 17 / 20 / 26 / 32 px |
| 字重 | `--font-weight-normal..bold` | 400 / 500 / 600 / 700 |
| 动效 | `--transition-fast/normal/slow` | 140 / 240 / 400 ms |

> 完整值见 `design-foundation.css`。迁移对照见 `DESIGN_HANDOFF.md` §Token 迁移。

---

## 2. Theme System（四场景视觉）

### 2.1 结构（冻结，消除 data 主题歧义）

```text
Global Theme（用户可选，仅 3 个）
├── mist     晨雾书房 · 白天默认
├── fluent   Windows Fluent · 手动
└── night    深色夜航 · 夜间默认

Page Visual Scope（页面级，非主题）
└── review-data   数据驾驶舱 · 仅周/月/考试复盘
```

- `data-theme` 值域仅 `mist | fluent | night`，兼容旧 `dark → night`。
- `review-data` 通过 `data-scope="review-data"` 叠加，**不进入**主题选择器，不是第四个全局主题。

### 2.2 Accent 双层体系

```text
Brand Accent（固定蓝系 #4c6fe8）→ 品牌身份
Theme Accent（随主题变）        → 日常交互主强调
  Mist   → 雾蓝       #5e7d9c
  Fluent → Windows 蓝 #0078d4
  Night  → 冷青蓝     #5fb6d2
  Data   → 数据蓝     #3e7bfa
```

### 2.3 A · 晨雾书房（mist）

- 气质：安静 / 温润 / 低饱和 / 长时间耐看。
- 底色 `#f6f4ef`（米白微暖），卡片纯白，灰蓝主色、淡紫灰/沙色作辅助。
- 语义色整体降饱和（成功 `#4e9a6a`、警告 `#be8a3a`、危险 `#c45c53`）。
- 大留白、柔和阴影、中度圆角。

### 2.4 C · Windows Fluent（fluent）

- 只换视觉表现，**不改 IA、不改功能**。
- 中性灰底 `#f3f3f3`，Windows 蓝 `#0078d4`，圆角收小（4/8/12）、阴影更弱，靠边框与材质分层。
- Mica 半透明：优先由 Tauri 窗口 backdrop 提供；CSS 层建议 surface 保持近不透明，避免文字对比度下降（见 §5 风险）。

### 2.5 D · 深色夜航（night）

- 非纯黑、非赛博朋克、低刺激。
- 分层深色：底 `#0d1117` → 面 `#151b23` → 嵌套 `#1b2430`。
- 冷青蓝强调 `#5fb6d2`，配合 `--color-accent-text:#062730` 保证可读。

### 2.6 F · 数据驾驶舱（review-data）

- 仅周/月/考试复盘。数字 + 图表 + 趋势 + 对比，不做高密度大卡片堆叠。
- 数据蓝 `#3e7bfa` + 8 色分类图表 `--chart-1..8`；数据大数字用等宽字体 `--font-mono`。
- **图表不得只靠颜色**：必须叠加数值标签 / 图例 / 纹理 / 直接标注。

### 2.7 自动主题

```text
06:00 → mist
18:00 → night
```

支持手动覆盖（自动 / 晨雾 / Fluent / 夜航）。

---

## 3. Container System（容器系统）

| 容器 | 视觉特征 | 适用场景 |
|------|----------|----------|
| Section | 无背景或极淡背景，间距分隔 | 页面大分区 |
| List | 行式、分隔线、无卡片背景 | 任务 / 备忘 / 闪卡队列 |
| Panel | 有边框、浅背景、无重阴影 | 设置 / 筛选 / 侧栏 / 图表容器 |
| Card | 背景 + 阴影 + 圆角 | 重点内容、数据卡（受控使用） |
| Data Block | 大数字 + 小标签、极简 | 统计指标 |

**统一卡片规范**：`radius: var(--radius-md)`、`padding: var(--space-4)`、`border: 1px solid var(--color-border-light)`、`shadow: var(--shadow-sm)`，禁止页面各自定义。

**反模式**：全页面 Card 化、盒子套盒子、为层次堆阴影、无意义渐变。

---

## 4. State System（状态系统）

| 状态 | 表现 |
|------|------|
| default | 语义基线，无额外修饰 |
| hover | `--color-surface-2` / `--color-accent-hover`，150ms 内反馈 |
| active | 按下态，shadow 收回 + 轻微位移归零 |
| focus | `:focus-visible` 全局 2px `--color-border-focus` 外框，键盘可达 |
| disabled | `opacity .5 + cursor:not-allowed + pointer-events:none` |
| loading | `.skeleton` 骨架 shimmer；查询中不虚构成功 |
| success / error | `.state-success` / `.state-error` + 语义色 |
| empty | `.empty-state`（标题 + 说明 + 下一步动作入口） |
| saving / saved | `.is-saving`（降透明禁点）+ `.saved-flash`（短暂成功反馈） |

---

## 5. Accessibility Foundation（无障碍底座）

最低清单（实现为 `design-foundation.css` §6 + §8）：

- 普通文字对比度 ≥ 4.5:1、大文字 ≥ 3:1。
- 全键盘可操作 + 可见 focus 态（全局 `:focus-visible`）。
- 语义化结构（`nav/main/section/article/button/ul`）。
- 不依赖颜色传递唯一信息（数据/闪卡评价/状态均有文字标签）。
- 图表另配数值/图例/纹理。
- `prefers-reduced-motion: reduce` 下动画时长压至 0.01ms。
- 触控目标 ≥ 44px、输入字号 ≥ 16px（移动端）。

**特检风险（Phase 14 复核）**：Fluent 半透明背景下的文字对比度需实测；F 图表与闪卡四档评价的“非颜色传义”需逐页校验。

---

## 6. Motion（动效）

四类有目的动效（其余一律静态）：

| 场景 | 动效 | 工具类 |
|------|------|--------|
| 页面进入 | 淡入 + 轻微上移 | `.motion-page-enter` |
| 闪卡翻转 | 3D flip（唯一强动效） | `.flashcard-face` |
| 任务完成 | 勾选 + 轻微缩放 | `.motion-task-done` |
| 数据更新 | 渐入 | `.motion-data-change` |

禁止：全部元素同时飞入、无意义弹跳、装饰性动画。`celebratePop` 等仅在明确反馈点（任务完成）使用。

---

## 7. 与现状的差异（迁移要点）

- 现状 `theme.css`：`--page-bg/--surface-card/--text-primary/--accent(#6366f1)`，仅 `:root + [data-theme='dark']` 两套。
- 目标：迁移到 `--color-*` + 三全局主题 + `review-data` scope + 双层 Accent。
- 详细迁移映射与实施顺序见 `DESIGN_HANDOFF.md` §Token 迁移。

---

## 8. Self Review（Phase 1 Gate）

- [x] Token 命名统一为 `--color-* / --radius-* / --shadow-* / --space-* / --font-* / --transition-*`。
- [x] 四套主题共用同一 token 结构，色值已冻结（A/C 由 DESIGN 冻结）。
- [x] Brand + Theme Accent 双层体系成立。
- [x] `data-theme` 仅 `mist/fluent/night`；`review-data` 为页面 scope，不进主题选择器。
- [x] 容器五级语义明确，普通卡片统一 radius/padding/border/shadow。
- [x] 状态覆盖 default/hover/active/focus/disabled/loading/success/error/empty/saving/saved。
- [x] 无障碍含对比度/键盘/focus/语义/非颜色传义/reduced-motion。
- [x] 动效四类收敛 + reduced-motion。

**Phase 1 Gate：PASS → 进入 Phase 2。**
