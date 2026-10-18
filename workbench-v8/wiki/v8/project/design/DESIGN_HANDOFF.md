# DESIGN HANDOFF（Phase 2 交付物 · v2.0）

> 版本：2.0 · 阶段：Phase 2 完成
> 依据：`V8_DESIGN_MASTER_IMPLEMENTATION_SPEC_v1.0` / `V8_VISUAL_LAB_4THEMES_INTERACTIONS_v1.2` / `DESIGN_SPEC` / `DESIGN_FOUNDATION.md` / `V8_MASTER_PLAN_v1.21` §9
> 交付对象：CODE Agent（实现关键页面 + 主题基础设施）
> 配套产物：`design-foundation.css`（v2.0 Token / 主题 / 材质 / 容器 / 状态 / 交互底座）、`DESIGN_FOUNDATION.md`、`high-fidelity/themes-showcase.html`（四空间交互原型）、`high-fidelity/index.html`（6 页高保真）
> 状态：`DESIGN_HANDOFF_READY`

---

## 0. 核心原则（CODE 必读）

> **V8 的四套主题不是「同一 UI 换四套颜色」，而是同一套 Personal OS 在四种不同视觉空间中的表达。**

四主题差异 = Color + Material + Surface + Depth + Shape + Light + Motion，**不是**只换 `--color-*` 变量。工程实现必须保留这种空间差异，而不是把差异压缩成几组颜色变量。

**全局主题（`data-theme`）仅 3 个**：`mist | fluent | night`。
**`review-data` 是页面级视觉作用域**（`data-visual-scope="review-data"` 或 `data-scope="review-data"`），仅周/月/考试复盘使用，**不进入**全局主题选择器，不是第 4 个用户可选主题。

| 空间 | 命题 | 触发 |
|------|------|------|
| A 晨雾书房 `mist` | 晨光落在书桌上的第一小时 | 白天默认 |
| C Windows Fluent `fluent` | 属于桌面的浮空窗口系统 | 手动切换 |
| D 深色夜航 `night` | 夜晚仍愿意连续使用几小时的空间 | 夜间默认 |
| F 数据驾驶舱 `review-data` | 只在复盘时打开的数据观测舱 | 周/月/考试复盘页面 |

**硬约束**：CODE 不得在 High Fidelity 之前自行实现与本包冲突的页面版本；不得把 `review-data` 加进全局主题选择器；不得批量修改每个元素的颜色（主题切换只由 Theme Controller 驱动 token）。

---

## 1. 四主题 Token 全量（v2.0 冻结）

> 完整实现见 `design-foundation.css`。以下为 CODE 迁移与校验用摘要。

### 1.1 Accent 变化（相对 v1.0 关键调整）

v2.0 依据 DESIGN_MASTER_SPEC 重冻结主题 accent，**与 v1.0 不同**，CODE 迁移时须以本表为准：

| 主题 | v1.0（已废弃） | v2.0（冻结） |
|------|---------------|--------------|
| Mist | 雾蓝 `#5e7d9c` | 暖木 / 纸页金棕 `#c9b89a` |
| Fluent | Windows 蓝 `#0078d4` | Windows 蓝 `#5b8def` |
| Night | 冷青蓝 `#5fb6d2` | 冷紫蓝 `#7c6eff` |
| Review Data | 数据蓝 `#3e7bfa`（浅色） | 全息青 `#00d4ff`（深色舱） |

### 1.2 主题 Token 摘要

**A · 晨雾书房 mist**
```css
--color-bg:#f7f3ee; --color-surface:rgba(255,255,255,.78); --color-surface-2:rgba(250,247,242,.92);
--color-text-primary:#2d2a26; -secondary:#6b6863; -tertiary:#9a9791;
--color-accent:#c9b89a; -hover:#b8a687; -light:#e6d7c0; -text:#3b2e1c;
--color-border:rgba(70,60,50,.08); -light:rgba(70,60,50,.045); -focus:#9c815c;
--color-success:#4f8f68; --color-warning:#b98b3e; --color-danger:#bc5a50;
--radius-sm:6px; --radius-md:8px; --radius-lg:12px; --radius-xl:16px;
```

**C · Windows Fluent fluent**
```css
--color-bg:#eef4ff; --color-surface:rgba(255,255,255,.58); --color-surface-2:rgba(255,255,255,.72);
--color-text-primary:#1a2035; -secondary:#5b6580; -tertiary:#8b95b0;
--color-accent:#5b8def; -hover:#3a6fd6; -light:#8ab4ff; -text:#fff;
--color-border:rgba(255,255,255,.46); -light:rgba(255,255,255,.26); -focus:#3a6fd6;
--color-success:#2f9e67; --color-warning:#c07d18; --color-danger:#d4483c;
--radius-sm:6px; --radius-md:12px; --radius-lg:18px; --radius-xl:24px;
```

**D · 深色夜航 night**
```css
--color-bg:#0f121a; --color-surface:rgba(30,34,48,.74); --color-surface-2:rgba(40,45,65,.84);
--color-text-primary:#e8ebf2; -secondary:#a0a7bd; -tertiary:#6b7390;
--color-accent:#7c6eff; -hover:#988cff; -light:#a79cff; -text:#0f121a;
--color-border:rgba(255,255,255,.08); -light:rgba(255,255,255,.045); -focus:#988cff;
--color-success:#4cc38a; --color-warning:#d9a13b; --color-danger:#e06c6c;
```

**F · 数据驾驶舱 review-data（页面 scope）**
```css
--color-bg:#050a15; --color-surface:rgba(10,20,40,.46); --color-surface-2:rgba(15,30,60,.58);
--color-text-primary:#e6f4ff; -secondary:#7eb8ff; -tertiary:#3a6fb0;
--color-accent:#00d4ff; -hover:#40e0ff; -light:#7b61ff; -text:#031420;
--color-border:rgba(0,212,255,.24); -light:rgba(0,212,255,.11); -focus:#00d4ff;
--color-success:#2ee6a8; --color-warning:#ffd166; --color-danger:#ff6b8a;
--chart-1:#00d4ff; --chart-2:#7b61ff; --chart-3:#40e0ff; --chart-4:#a78bfa;
--chart-5:#22d3ee; --chart-6:#818cf8; --chart-7:#38bdf8; --chart-8:#67e8f9;
--chart-axis:#3a6fb0; --chart-text:#7eb8ff; --chart-grid:rgba(0,212,255,.1); --chart-glow:rgba(0,212,255,.5);
```

### 1.3 品牌 Accent（全主题固定，不随主题变）

```css
--color-brand:#4c6fe8; --color-brand-hover:#3855cc; --color-brand-light:#e9edfb; --color-brand-text:#fff;
```
仅用于 Logo / 应用图标 / 品牌 CTA。日常交互按钮 / 链接 / 焦点用 `--color-accent`。

---

## 2. Token 迁移映射（现状 → 目标）

现状 `src/styles/theme.css` 命名 → 目标 `--color-*`（一次性迁移，不留新旧并存）：

| 现状 | 目标 |
|------|------|
| `--page-bg` | `--color-bg` |
| `--surface-card` | `--color-surface` |
| `--surface-hover` / `--surface-active` / `--surface-secondary` | `--color-surface-2` |
| `--text-primary/secondary/tertiary` | `--color-text-primary/secondary/tertiary` |
| `--text-inverse` | `--color-text-inverse` |
| `--border-color` / `--border-light` / `--border-focus` | `--color-border` / `-light` / `-focus` |
| `--accent` / `-hover` / `-light` / `-text` | `--color-accent` / `-hover` / `-light` / `-text` |
| `--success` / `--warning` / `--danger`（+`-light`） | `--color-success` / `-warning` / `-danger`（+`-light`） |
| （无） | 新增 `--color-brand*`、`--color-info*`、`--space-*`、`--font-*`、`--radius-xl`、`--chart-1..8`、`--chart-*` |

**主题切换**：`data-theme` 值域 `mist | fluent | night`；旧 `data-theme='dark'` 映射为 `night`（`setTheme` 内做兼容，可短期保留别名）。复盘周/月/考试页挂 `data-visual-scope='review-data'`（兼容旧 `data-scope` 选择器，见 `design-foundation.css` §5）。

---

## 3. 材质系统（Material System）

> 四主题的材质是「空间差异」的核心载体，CODE 不得省略。完整实现见 `design-foundation.css` §7 + §11。

### 3.1 材质表面

```css
.material-surface { background:var(--color-surface); backdrop-filter:blur(18px); }
@supports not (backdrop-filter:blur(1px)) {
  .material-surface { background:var(--color-surface-2); backdrop-filter:none; }
}
```

**性能约束**：`backdrop-filter` 仅用于主 Surface / Floating Panel / 关键 Dialog，长列表不逐行使用。不支持时回退为「提高背景不透明度 + 关闭 blur」。

### 3.2 主题专属材质类（CODE 需在组件中按主题挂载）

| 主题 | 材质类 | 语义 |
|------|--------|------|
| A Mist | `.mist-paper`、`.paper-strip` | 纸页叠放、左侧书签条 |
| C Fluent | `.fluent-window`、`.fluent-float`、`.fluent-toolbar` | Mica 窗口、浮空亚克力面板、窗口工具栏 |
| D Night | `.night-stage`、`.night-focus`、`.night-pulse` | 深空舞台、聚焦卡、脉冲环 |
| F Review | `.review-space`、`.holo-hero`、`.holo-panel`、`.metric-chip` | 全息观测舱、Hero 光幕、数据面板、指标芯片 |

F 全息面板必须同时具备：`Transparency + Blur + Glow Edge + Depth + Inner Light`（见 `.holo-panel` / `.holo-hero` 的 `::before`/`::after` 发光边缘与内光）。禁止把普通 ECharts 图表直接换成蓝色，视觉统一为「数据空间中的光幕信息」。

---

## 4. 主题交互层（Theme Interaction Language）

> 四主题有各自独立的 hover 反馈语言，不做「统一浮起 + 发光」。完整实现见 `design-foundation.css` §12。

机制：JS 给可交互元素挂 `.theme-interactive`，`pointerenter/leave` 时加/去 `.is-hovered`（仅在 `(hover:hover) and (pointer:fine)` 下触发，兼容触屏）。列表行使用轻反馈，不做重度浮起。

| 主题 | Hover 反馈 | 关键表现 |
|------|-----------|----------|
| A Mist | 晨光照亮纸页 | `saturate+brightness` 轻升 + `translateY(-2px)` + 斜向晨光扫过（`mist-light-sweep`） |
| C Fluent | 浮起 + Acrylic 加深 | `translateY(-7px) scale(1.012)` + `blur(30px) saturate(155%)` + 高光渐变 |
| D Night | 月光扫过 + 焦点聚拢 | `translateY(-3px)` + 月光扫过（`night-moon-sweep`）+ `.night-focus-zone` 内其余卡退后 |
| F Review | 光幕浮起 + 边缘点亮 | `translateY(-8px) scale(1.012)` + 顶部发光边 + 数据响应 |

`prefers-reduced-motion: reduce` 下全部压平为无位移、无动画。

---

## 5. 容器与组件规格

### 5.1 容器系统

| 容器 | 视觉特征 | 适用场景 |
|------|----------|----------|
| Section | 无背景或极淡背景，间距分隔 | 页面大分区 |
| List | 行式、分隔线、无卡片背景 | 任务/备忘/闪卡队列 |
| Panel | 有边框、浅背景、无重阴影 | 设置/筛选/侧栏/图表容器 |
| Card | 背景 + 阴影 + 圆角 | 重点内容、数据卡（受控使用） |
| Data Block | 大数字 + 小标签、极简 | 统计指标 |

**反模式**：全页面 Card 化、盒子套盒子、为层次堆阴影、无意义渐变。

### 5.2 组件规格

| 组件 | Token / 规则 |
|------|-------------|
| Card | `radius-md + padding space-4 + border 1px color-border-light + shadow-sm`，禁止页面自定义 |
| Panel | `radius-md + border 1px color-border`，无重阴影 |
| List-item | 行式 + `border-bottom color-border-light`，hover `surface-2` |
| Data Block | 大数字用 `--font-mono` + `tabular-nums`；F 下用 `.holo` + `--data-font` |
| Button | `radius-sm`；primary 用 `--color-accent` + `--color-accent-text`；移动端目标区 ≥ 44px |
| 优先级 Tag | P0/P1/P2 用 `danger/warning/surface-2` 语义色，配文字不靠颜色唯一传义 |
| 空状态 | `.empty-state`：标题 + 说明 + 动作入口 |
| 骨架 | `.skeleton` shimmer，loading 不虚构成功 |

---

## 6. 关键页面规格

### 6.1 今日（首页）

**唯一目的**：回答「今天做什么 + 今天已做什么」。禁止长期成绩、全量图表、全部项目、全部笔记。

```text
┌──Sidebar──┬────────────────────────────┐
│           │  Header：日期 · 问候语       │
│  今日     ├────────────────────────────┤
│  计划     │  今天最重要的 3 件事（List）  │
│  学习     ├────────────────────────────┤
│  记录     │  今日计划（List，含完成率）    │
│  复盘     ├────────────────────────────┤
│  工具     │  今日状态（Data Block 行）    │
│           ├────────────────────────────┤
│           │  今晚复盘（CTA Panel）        │
└───────────┴────────────────────────────┘
```

交互：任务勾选（`.motion-task-done` + 划线淡出）；「今晚复盘」入口。空态：「今天还没有安排 —— 从收件箱或快速备忘开始」。错误：加载失败 → 页面级提示 + 重试，不虚构完成率。

### 6.2 学习总览

```text
[ 本周时长 | 掌握度 | 待复习闪卡 ]  ← 3 × Data Block
本周学科分布（横向条 + 图例 + 数值）
[ 薄弱知识点（List） | 最近错题（List）]  ← 双栏 Panel
成绩趋势（折线 + 周标签）
```

交互：薄弱知识点「去巩固」跳知识点中心；错题「去处理」跳错题页。图表均配文字数值，不靠颜色唯一传义。

### 6.3 闪卡

核心：卡片即内容核心，无侧栏；≥5 背景；四档评价明确；键盘可操作。

```text
        复习进度 26 / 32
      ┌───────────────────┐
      │  学科 · 知识点标签   │
      │   问题（第一视觉层）  │
      │        ↕ 翻转        │
      │   答案（第二面）      │
      └───────────────────┘
   😣 不会·1天  🤔 模糊·3天  🙂 会了·7天  😎 熟练·14天
```

5 背景：晨雾 / 夜空 / 森林 / 琥珀纸页 / 极简（`linear-gradient + 轻光晕/纹理`，禁高对比大图）。翻转用 `.flashcard-face` 3D flip。四档评价 `<button>` + 文字标签（不靠 emoji 传义）+ 键盘可达（`Space`/`Enter` 翻面，`1/2/3/4` 评价）。

### 6.4 复盘（周 / 月 / 考试）— review-data scope

统一规则：`review-data` scope + 双栏（指标概览 / 图表+正文）+ 图表非颜色唯一传义 + 每页末尾「下一步」出口。

| 页面 | 核心版式 |
|------|----------|
| 周复盘 | 4×Data Block（时长/完成率/闪卡/新增错题）→ 完成率趋势+学科分布双栏 → 错题类型 → 下一步 |
| 月复盘 | 4×Data Block（月时长/完成率/掌握度提升/闪卡总量）→ 每日热力+成绩趋势双栏 → 下一步 |
| 考试复盘 | 4×Data Block（总分/年级排名/班级排名/失分题数）→ 各科得分比+失分原因双栏 → 下一步 |

禁止三页「同一 Dashboard 只改标题」。F 允许轻 HUD（`LIVE / SYNCED / DATA STREAM / UPDATED` + 状态点 + 微型坐标线），HUD 只能辅助信息。

---

## 7. 响应式规则（三档）

| 断点 | 设备 | 规则 |
|------|------|------|
| ≥ 1024px | Desktop | 侧栏常驻 248px，完整功能，双栏/多栏，F 空间层级完整 |
| 768–1023px | Tablet | 侧栏折叠 64px 图标模式，布局自适应，F 减少远景装饰 |
| < 768px | Mobile | 侧栏变抽屉 + 汉堡 + 遮罩；底部导航；仅「查看今日 + 快速备忘 + 任务勾选」；触控目标 ≥ 44px；输入字号 ≥ 16px；F 仅 Hero Metric + 核心 Trend |

原则：不是桌面等比缩小，移动端重新取舍导航、卡片数量、信息密度与输入方式。

---

## 8. 无障碍规则（逐页校验清单）

- 普通文字对比度 ≥ 4.5:1、大文字 ≥ 3:1（Fluent 半透明需实测，surface 保持近不透明）。
- 全键盘可操作 + 可见 focus（`outline: 2px var(--color-border-focus)`）。
- 语义化结构（`nav/main/section/article/button/ul`）。
- 状态不靠颜色唯一传义：任务完成有划线+✓、闪卡评价有文字、图表有数值/图例。
- `prefers-reduced-motion: reduce` 压平动画。
- 图表（尤其 F）不得只用颜色区分，必须配数值标签/图例/纹理。

---

## 9. Review Metrics 契约标记

> ⚠️ `REQUIRES CODE METRICS CONTRACT`

冻结的指标**类型**为 5 类：`DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics`。但 `CODE_SPEC §3.2` 当前仍是 3 类（缺 Monthly / Exam），`ERRATA-04` 尚未落到源码。

因此：
- 已冻结（可据此实现）：信息架构、视觉结构、图表**位置与类型**、数据层级、`review-data` 视觉、下一步出口。
- **未冻结（禁止凭空发明字段）**：`MonthlyMetrics` / `ExamMetrics` 的**具体字段**（月度热力字段、考试分数/排名/科目对比的字段名与聚合口径）。

本包对复盘页的图表仅定义到「趋势 / 学科分布 / 错题类型 / 完成率 / 闪卡量 / 月度热力 / 考试得分与失分原因」这一**视觉与结构层级**。CODE 在实现数据绑定前，须先完成 `I-014`（5 类指标类型契约）并同步 `reviewAggregator`，再回填字段绑定。

---

## 10. 转交 CODE 清单

- [ ] `design-foundation.css` → 合并进 `src/styles/theme.css`（按 §2 迁移，一次性，v2.0 accent 已变）。
- [ ] `data-theme` 三值 + 旧 `dark→night` 兼容；`review-data` 页面 scope（`data-visual-scope`）。
- [ ] 材质类（§3.2）+ 交互层（§4）实现为组件可挂载的 class，勿只做颜色变量。
- [ ] 统一卡片/容器/状态类，删除页面级自定义卡片样式。
- [ ] 6 关键页面按 §6 实现（High Fidelity 先行）。
- [ ] 先完成 `I-014`（Review Metrics 5 类型契约）再绑定复盘图表字段。
- [ ] `prefers-reduced-motion` + focus-visible + 图表非颜色传义 + F 图表光幕表达。

---

## 11. Design QA 结果

| 检查项 | 结果 |
|--------|------|
| Token 命名统一、四主题同构 | PASS |
| 四主题材质独立（非换色） | PASS |
| 四主题交互语言独立 | PASS |
| `review-data` 未进入全局主题选择器 | PASS |
| 首页只回答「今天」 | PASS |
| 闪卡 ≥5 背景 + 文字第一视觉层 | PASS |
| 复盘末尾均有「下一步」 | PASS |
| 图表非颜色唯一传义（数值/图例） | PASS |
| 空状态含动作入口 | PASS |
| reduced-motion / focus-visible | PASS |
| Review Metrics 字段未发明 | PASS（已标记契约） |

**停止状态：`DESIGN_HANDOFF_READY`。** 不进入 CODE 实现；等待人工将本包转交 CODE Agent。
