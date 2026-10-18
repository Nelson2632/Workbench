# V9 Release Fix & UI Interaction Implementation Spec v1.1

> **本文档不是「纯 UI 打磨」，而是 Release 修复 + 交互实现规范。**
> CODE Agent 施工前请先读 §0「施工边界」与 §2「不可触碰边界」。
> 上一版（`V8_UI_POLISH_PLAN_v1.0.md`）已被本 v1.1 取代。

---

## 0. 施工边界（冻结）

```
A · Sidebar
├── A0 Root Cause Gate   ← 前置门，未通过不得改高度链
├── A1 Scroll
├── A2 Custom Scrollbar
├── A3 Group Expand Animation
├── A4 ARIA
├── A5 Active Item Auto Scroll
└── A6 Edge Toggle

B · UI Interaction
├── B1 Button
├── B2 Input
├── B3 Dropdown
├── B4 List
├── B5 Card
├── B6 Active Indicator
└── B7 will-change Performance

C · Motion
├── C0 动作语义（跨组件统一契约）
├── C1 LIFE / WORK / PLAY
├── C2 Task Complete
├── C3 List Stagger
├── C4 Data Change
└── C5 Reduced Motion

D · Inbox / Plan   ← 新增，Release Fix 的一部分
├── D1 Inbox semantics
├── D2 Convert to Plan
├── D3 Plan Editor
├── D4 Priority
├── D5 Idempotency
└── D6 Today Plan

E · Final QA
├── 4 Themes
├── Keyboard
├── Accessibility
├── Tauri Runtime
├── Performance
├── Regression
└── Build/Test
```

---

## 1. 设计原则与铁律

1. **四主题语义不变**：mist「晨雾书房」/ fluent「Windows Fluent」/ night「深色夜航」/ review-data「数据驾驶舱」。只消费既有 CSS 变量（`--color-*` `--radius-*` `--shadow-*` `--transition-*`），不新造硬编码颜色。
2. **`prefers-reduced-motion: reduce` 下全部压平**：凡新增动画/过渡必须纳入 `theme.css` §6 与各 motion 文件的 reduced-motion 分支。
3. **性能克制**：无限循环只用 `transform/opacity`；`will-change` 不得常驻（见 B7）。
4. **无障碍**：新增交互补齐 `aria-expanded` / `aria-controls` / `:focus-visible`。
5. **动作语义优先于视觉**：任何状态反馈先归入 C0 的语义契约，再谈具体动效；禁止各组件自造动画语言。

---

## 2. 不可触碰边界（UI Sprint 铁律）

> 本次为 **UI / Release Fix Sprint**。以下红线一律不得触碰，违者视为越界：

- ❌ 不得修改数据模型 / Dexie schema / Migration（`version(*)` 升级）
- ❌ 不得修改 EventBus / Projection / 跨域数据流
- ❌ 不得修改安全边界 / 密码本 / 加密逻辑
- ❌ 不得改变任何路由的语义（路径、重定向、鉴权）

同时这些「副作用」必须为零：
- Sidebar 修复不得改变路由
- Sidebar Toggle 不得改变任何数据
- Hover 不得干扰点击命中
- Animation 不得阻塞输入（input 无卡顿）
- Theme 切换不得改变业务状态
- 滚动修复不得改变 footer / 底部固定元素
- Inbox → Plan 不得产生重复 Task

---

## 3. 现状盘点（代码勘察结论）

| 维度 | 已具备 | 缺口 / 待优化 |
|---|---|---|
| 侧栏滚动 | `.nav` 已有 `overflow-y:auto` + `min-height:0` + `overscroll-behavior:contain`（[Sidebar.module.css](src/components/layout/Sidebar.module.css)） | 无自定义滚动条；9 组默认全展开内容过长却无滚动提示；分组展开/收起瞬时无过渡；无 `aria-expanded`；深路由激活项不在可视区；**滚动是否真的失效、根因未实机证明** |
| 侧栏收起 | `collapseToggle` 已存在（右侧边缘、垂直居中、◀/‹），有 `aria-label` 但**无 `aria-expanded`** | 需补 `aria-expanded={!sidebarCollapsed}` 并确认其不在 `.nav` 滚动区内（当前位于 `aside` 下、`nav` 外，正确，需固化） |
| 交互反馈 | `useThemeInteraction` 全局事件委托已启用（[useThemeInteraction.ts](src/hooks/useThemeInteraction.ts)） | 仅 `Card.tsx` 内置挂类 + 少数页面手挂；`Button`/`Input`/`Dropdown`/多数列表项未挂 `.theme-interactive`，四主题 hover 大面积不生效 |
| 侧栏激活指示 | 仅 fluent 有 `fluent-indicator`（`motion.css` §3） | 其余三主题无统一激活指示 |
| 页面进入动画 | `PageWrap` + `.anim-page-enter`，四主题分化已落地（[App.tsx](src/app/App.tsx)） | 无退出动画（明确不做，见 C5 备注） |
| 三区动效 | `v9-motion.css` 定义 LIFE/WORK/PLAY；已挂 `life`（LifeLayout）/`play`（PlayLayout）/`work`（仅 TodayPage） | Plan/Study/Tools/Record Layout 未挂 `data-v9-zone` |
| 列表错峰 | `.anim-list-stagger` 已定义，nth-child 写死 20 档 | 仅 3 页接入；档位有上限；**频繁更新列表会误伤** |
| 完成动画 | `data-v9-done` 已定义 | 未全面接入「勾选完成」列表 |
| Modal | 开合动画、Escape、scroll-lock、backdrop 关闭已实现（[Modal.tsx](src/components/ui/Modal.tsx)） | 无需改动 |
| Inbox/Plan | `InboxPage` 已有「转为计划」入口 + `handleConvertToPlan`（`updateTask` 原地更新，幂等） | Plan Editor 字段不足（缺开始时间/Deadline/学科/预计分钟）；转出后与 Today Plan 的语义未显式定义 |

---

## 4. A · Sidebar

### A0 Root Cause Gate（前置门，硬性）

> **施工前必须在 Tauri 实机（非浏览器工具栏截图）中证明滚动问题的真实根因。**

要求产出并记录以下测量数据（DevTools Console 或 `browser_evaluate` / `tracing`）：

```text
sidebar.clientHeight / sidebar.scrollHeight
nav.clientHeight / nav.scrollHeight
computed overflow-y
computed height
computed min-height
```

检查高度与滚动决策链（逐层）：
```text
AppLayout → .layout → .sidebar → .brand / .nav / .bottomNav / .themeSwitcher
```

并排查可能拦截或吞掉滚动的因素：
```text
wheel 事件是否被 preventDefault？
overlay / pointer-events 是否盖住 .nav？
scroll 容器是否真的命中了 .nav（而不是更外层）？
```

**判定规则：**
- 若测量证明滚动已工作（`nav.scrollHeight > nav.clientHeight` 且 `overflow-y: auto` 生效），则本项仅需「补齐滚动体验（A1–A5）」，**不得修改高度链**。
- 若滚动确实失效，必须依据测量数据定位真实根因（如外层高度未约束、`pointer-events` 阻断等），**在定位前不得无脑堆 `overflow` / `min-height:0`**。
- 记录「修复前数据 / 根因 / 修复动作 / 修复后数据」四项，作为验收证据。

### A1 Scroll（滚动体验）

- 保持 `.nav` 为唯一滚动容器；确认 `overscroll-behavior: contain` 生效（滚轮不传播到主内容区）。
- 确认底部固定元素（`.bottomNav` / `.themeSwitcher`）不随滚、不重叠、不因滚动被挤出。

### A2 Custom Scrollbar

`.nav` 增加主题贴合的自定义滚动条（默认隐藏、hover 显示、细、圆角、半透明）：

```css
.nav {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.nav:hover { scrollbar-color: var(--color-border) transparent; }
.nav::-webkit-scrollbar { width: 8px; }
.nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
.nav::-webkit-scrollbar-thumb:hover { background: var(--color-text-tertiary); }
```

### A3 Group Expand Animation

用 CSS Grid `0fr → 1fr` 高度折叠，替代 `{expanded && <div>}` 的条件渲染（无需 JS 量高度）：

```jsx
<div className={`${styles.children} ${expanded[group.id] ? styles.childrenOpen : ''}`}>
  {group.children!.map(...)}
</div>
```

```css
.children {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-normal) var(--ease-out-soft);
  overflow: hidden;
}
.childrenOpen { grid-template-rows: 1fr; }
.children > * { overflow: hidden; }
```

> 回退：若目标 WebView 不支持 `0fr→1fr`，用 `@supports not (grid-template-rows: 0fr)` 回退为 `max-height` 过渡或直接显隐。

### A4 ARIA

- 分组头 `<button>` 增加 `aria-expanded={expanded[group.id]}` 与 `aria-controls={`nav-group-${group.id}`}`。
- 分组容器增加 `id={`nav-group-${group.id}`}`。
- 侧栏整体 `<aside>` 补 `aria-label="主导航"`。

### A5 Active Item Auto Scroll

- `Sidebar` 内监听 `useLocation()`；激活项 `NavLink` 挂 ref；路由变化后 `activeRef.current?.scrollIntoView({ block: 'nearest' })`。
- `block: 'nearest'` 保证仅在不可见时滚动，不打断用户手动滚动。

### A6 Edge Toggle（侧栏收起按钮，正式纳入）

- **位置**：Sidebar 右侧边缘；**垂直 50%**（居中）。
- **形态**：展开态 `◀`、收起态 `▶`（当前为 `‹`/`›`，可统一为 `◀`/`▶`）。
- **语义**：
  - `aria-label="收起侧边栏"`（展开时） / `aria-label="展开侧边栏"`（收起时）
  - `aria-expanded={!sidebarCollapsed}`
  - `title` 同步。
- **约束**：按钮**不属于 `.nav` 滚动区域**（当前结构满足：位于 `aside` 直接子层、`nav` 之外）。固化此结构，不得移入滚动区。
- 现有实现参考：[Sidebar.tsx](src/components/layout/Sidebar.tsx) `collapseToggle`（约 L319），仅缺 `aria-expanded`。

---

## 5. B · UI Interaction

### 通用：交互反馈补全

现状 `useThemeInteraction` 已全局启用，只需把 `.theme-interactive` / `.theme-interactive--subtle` 挂到位即可自动获得 `.is-hovered/.is-active/.is-focus`。

| 组件 | 动作 | 说明 |
|---|---|---|
| B1 `Button` | 默认挂 `theme-interactive theme-interactive--subtle` | 按钮用轻反馈，不做 `translateY(-7px)` 浮起 |
| B2 `Input` | 触发元素挂 `theme-interactive--subtle` | 保留既有 focus 描边 |
| B3 `Dropdown` | 触发器挂 `theme-interactive--subtle` | 下拉面板开合另归 C |
| B4 `List`（`.list-item`） | 挂 `theme-interactive` | 已有轻反馈（translateX 轻位移），本次仅补挂类 |
| B5 `Card` | 已内置 `theme-interactive` | 无需改 |

### B6 Active Indicator（四主题统一）

将 `fluent-indicator` 泛化为 `.nav-indicator`（**保留 `fluent-indicator` 作别名，不删**），补三主题激活指示形态：

```css
[data-theme='mist']  .nav-indicator.is-active::before { background: var(--color-accent); }
[data-theme='fluent'] .nav-indicator.is-active::before { /* 现有 3px 竖条 */ }
[data-theme='night']  .nav-indicator.is-active::before { background: var(--color-accent); box-shadow: 0 0 8px var(--color-accent-light); }
[data-scope='review-data'] .nav-indicator.is-active::before,
[data-visual-scope='review-data'] .nav-indicator.is-active::before { background: var(--color-accent); }
```

### B7 will-change Performance（含性能验收）

**修复**：移除 `.theme-interactive` 常驻 `will-change`，仅在交互态启用：

```css
.theme-interactive { will-change: auto; }
.theme-interactive.is-hovered,
.theme-interactive.is-active { will-change: transform, filter, box-shadow; }
```

**性能验收（必须留证据，不允许只改 CSS 就自称完成）：**

```text
修复前 Compositing Layers = X
修复后 Compositing Layers = Y
长列表滚动：No noticeable jank（主观 + 滚动帧率采样）
```

验收方式：DevTools Rendering → `Show composited layer borders` / Performance 面板录制；X、Y 必须量化对比。

---

## 6. C · Motion

### C0 动作语义（跨组件统一契约，最高优先）

> 任何组件不再自造动画语言。状态反馈先归入下列语义，再套四主题风格。

| 动作语义 | 含义 | 触发时机 |
|---|---|---|
| `Hover`   | 预览反馈 | 指针悬停可交互元素 |
| `Focus`   | 可操作反馈 | 键盘/焦点进入 |
| `Press`   | 按压反馈 | 按下未释放 |
| `Success` | 成功反馈 | 操作成功（保存/创建） |
| `Complete`| 状态完成反馈 | 勾选完成/归档 |
| `Error`   | 异常反馈 | 校验失败/异常 |
| `Loading` | 等待反馈 | 异步加载/skeleton |

四主题分别赋予风格（在统一语义下表达）：

| 主题 | 风格词 | 表现基调 |
|---|---|---|
| Mist   | 温润 | 柔和扫光 / 轻压 / 纸张质感 |
| Fluent | 悬浮 | 浮起 / Acrylic / 指示条滑入 |
| Night  | 聚焦 | 月光掠过 / 焦点收缩 / 低刺激 |
| Review | 数据唤醒 | 点亮 / 扫描线 / 全息发光 |

落地：在现有 `motion.css` / `theme.css` 之上补一套**语义令牌**（如 `[data-feedback='press']` 或约定类名 `.fb-press` 等，命名由实施确定但必须唯一、全局可复用），Button/List/Card/Task/Sidebar 统一引用，禁止各写各的 `@keyframes`。

### C1 三区动效（LIFE/WORK/PLAY 全覆盖）

各 Layout 根容器补 `data-v9-zone`：
- `PlanLayout` → `work`
- `StudyLayout` → `work`
- `RecordLayout` → `work`
- `ToolsLayout` → `work`
- `ReviewLayout` 保持 `data-visual-scope="review-data"`（AppLayout 已挂，不重复套三区）。
- `LifeLayout`(`life`)、`PlayLayout`(`play`)、`TodayPage`(`work`) 已就位。

### C2 Task Complete（勾选完成 → 划线 → 微光扩散）

`v9-motion.css` 已定义 `data-v9-done` / `data-v9-done-title` / `data-v9-done-glow`。统一接入所有「勾选完成」列表（今日计划、收件箱转出、周期任务实例等）：

```jsx
<div data-v9-done={done ? 'true' : 'false'}>
  <span data-v9-done-title>{title}</span>
</div>
```

（特效本身已在 `v9-motion.css` §任务完成动画定义，无需新增 keyframes。）

### C3 List Stagger（错峰入场，含「不强制」规则）

- 将 `.anim-list-stagger` 由 20 档 nth-child 改为 `--i` 变量（无上限）：

```css
.anim-list-stagger > * {
  opacity: 0;
  animation: listItemEnter 0.4s ease forwards;
  animation-delay: calc(var(--i, 0) * 40ms);
}
```

- 封顶：`animation-delay = calc(min(var(--i,0), 12) * 40ms)`，前 12 项错峰、其余统一，避免长列表拖尾。

- **不强制规则（硬约束）**：数据量大或频繁更新的列表**不得默认使用入场错峰**（Inbox / 任务 / 错题 / 搜索结果等）。推荐：
  - 首次进入页面 → `stagger`
  - 数据局部刷新（增删改、局部重渲染）→ `no stagger`
  - 用户主动展开（分组/详情）→ `subtle transition`（仅 opacity，无位移）

### C4 Data Change（数值更新微动效）

复盘/考试等 `data-block__value` 变化时，用 `motion-data-change`（`theme.css` §10）轻 fade + `tabular-nums`，让数字更新有「刷新」感知。

### C5 Reduced Motion

所有 A/B/C 新增的动画/过渡，必须落入 `theme.css` §6 与 `motion.css` / `v9-motion.css` 的 `prefers-reduced-motion` 分支。

**页面退出动画：明确不做**（SPA 路由求快，当前 remount + enter 已足够，引入 exit 成本高于收益）。

---

## 7. D · Inbox / Plan（Release Fix，新增）

### D1 Inbox semantics

- `Inbox` = **Capture / Triage**（捕获、分流）。
- `Today Plan` = **Execution Queue**（执行队列）。
- Inbox 内的条目只是「未分类的输入」，不直接承担执行语义。

### D2 Convert to Plan 流程

```text
Inbox 条目
   ↓ [转为计划]
Plan Editor（模态）
   ↓ 填写完整字段
确认
   ↓
Task（原地更新，幂等）
   ↓ 依据 dueDate 落入 Today / Future
Today Plan（/plan/today）
```

**不得直接创建默认任务**——必须经过 Plan Editor 显式确认。

### D3 Plan Editor 字段清单（最低支持）

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| 标题 | ✅ | string | 承自 Inbox 标题，可改 |
| 描述 | ⬜ | string(textarea) | |
| 日期 | ✅ | date | 承默认今天，可改 |
| 开始时间 | ⬜ | time? | 可选 |
| Deadline | ⬜ | datetime? | 可选（区别于开始时间） |
| 优先级 | ✅ | P0/P1/P2 | 默认 P2 |
| 学科 | ⬜ | string? | 如适用（学习场景） |
| 预计分钟 | ⬜ | number? | 预估投入 |

> 现状：[InboxPage.tsx](src/pages/plan/InboxPage.tsx) 的 Plan Editor 已有 title/note/dueDate/priority，**缺** startTime / deadline / subject / estimatedMinutes，需扩展。

### D4 Priority 语义

- **Task Priority（P0/P1/P2）是「执行优先级 / 紧急度」**，用于排序展示。
- 它**不等于** MUST / SHOULD / COULD（意图/承诺级别）。
- 两类概念不得混淆、不得混用字段；若未来需要 MUST/SHOULD/COULD 维度，另起字段，不在本次 Sprint 内实现。

### D5 Idempotency（幂等，硬约束）

- 「转为计划」对同一 Inbox 条目的重复提交，**不得产生重复 Task**。
- 实现策略：沿用现有 `updateTask(id, {...})` 原地更新（不 `addTask` 新纪录）；确认后关闭编辑器并清空表单态。
- 验收：连点两次「确认」只存在一条 Task。

### D6 Today Plan 落位

- 转出后的 Task 依据 `dueDate` 落入 Today（`/plan/today`）或 Future（`/plan/future`）队列。
- 转出成功 → 原 Inbox 条目从待分流列表消失（因已具备 `dueDate`，不再命中 `inboxTasks` 过滤）。

---

## 8. 实施清单（文件级，按阶段）

### 阶段 A — Sidebar
- [ ] A0：实机测量并记录根因证据（未通过则先只做 A1–A5，不碰高度链）
- [ ] `src/components/layout/Sidebar.module.css`：滚动条样式、`.children` grid 折叠过渡
- [ ] `src/components/layout/Sidebar.tsx`：`aria-expanded`/`aria-controls`、children 始终渲染 + 折叠类、激活项 ref + 自动滚动、Edge Toggle 补 `aria-expanded`
- [ ] 固化 Edge Toggle 在 `nav` 之外的结构

### 阶段 B — UI Interaction
- [ ] `src/styles/theme.css`：`.theme-interactive` 收敛 `will-change`；新增 `--subtle` 四主题轻反馈；补全局滚动条
- [ ] `src/styles/motion.css`：`fluent-indicator` → `.nav-indicator`（含 night/review 形态，保留别名）
- [ ] `src/components/ui/Button.tsx` / `Input.tsx` / `Dropdown.tsx`：挂轻量交互类
- [ ] 列表页 `.list-item` 补挂 `.theme-interactive`
- [ ] B7 性能验收证据

### 阶段 C — Motion
- [ ] 建立 C0 动作语义令牌（全局唯一命名）
- [ ] `PlanLayout` / `StudyLayout` / `RecordLayout` / `ToolsLayout` 补 `data-v9-zone`
- [ ] `src/styles/animations.css`：`anim-list-stagger` 改 `--i` + 封顶
- [ ] 列表页接入 `anim-list-stagger`（仅低更新频率页）；完成态列表接入 `data-v9-done*`
- [ ] 数值变化接入 `motion-data-change`

### 阶段 D — Inbox / Plan
- [ ] `src/pages/plan/InboxPage.tsx`：扩展 Plan Editor 字段（startTime/deadline/subject/estimatedMinutes）
- [ ] 确认 `updateTask` 幂等路径；转出后正确落入 Today/Future
- [ ] 校验 Task Priority 语义不被 MUST/SHOULD/COULD 污染

### 阶段 E — Final QA
- [ ] 四主题 + 移动端抽屉回归
- [ ] 键盘 / 无障碍 / Tauri 实机
- [ ] 性能证据（Compositing Layers 前后）
- [ ] 无功能回归（§2 红线清单逐项验证）

---

## 9. 风险与回滚

| 风险 | 影响 | 缓解 |
|---|---|---|
| Grid `0fr→1fr` 在个别 WebView 不支持 | 分组展开失效 | `@supports not` 回退 max-height 或直接显隐 |
| `will-change` 收敛后 hover 首帧掉帧 | 交互质感下降 | 已在 hover 态启用；仍明显则只对高频交互保留 |
| `.nav-indicator` 改名破坏 fluent 指示条 | fluent 指示失效 | 保留 `.fluent-indicator` 别名 |
| 列表错峰误伤高频列表 | 页面「一直动」 | 遵循 C3 不强制规则，仅首入页 stagger |
| Inbox → Plan 重复点击产生重复 Task | 数据脏 | D5 幂等：`updateTask` 原地更新 |
| 全局滚动条影响触屏 | 样式套用于触屏 | `@media (hover:hover)` 内启用自定义滚动条 |

---

## 10. 冻结说明

本 v1.1 已纳入审批要求的 7 项约束：
1. A0 Root Cause Gate（实机证明根因，未定位不改高度链）
2. A6 Sidebar Edge Toggle（正式纳入 + aria-expanded + 不属滚动区）
3. D · Inbox/Plan 完整施工项（Editor 字段 + 幂等 + 优先级语义）
4. C0 动作语义（Hover/Focus/Press/Success/Complete/Error/Loading + 四主题风格）
5. B7 will-change 性能验收（Compositing Layers 量化对比）
6. C3 stagger 不强制（首入 stagger / 刷新 no-stagger / 展开 subtle）
7. §2 无功能回归红线 + 副作用零清单

施工按 A → B → C → D → E 顺序，每阶段末尾做一次 Gate 校验。