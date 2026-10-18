# V9 Personal OS · 全八阶段合订文档 v1.7 · Final Freeze

文档定位：V9 Personal OS 设计系统、架构、质量验证与发布治理全量规范
覆盖范围：Base → Surface → Theme → Component → Composite → Page → Domain → Data → Runtime → Quality → Governance
当前状态：Final Frozen
唯一事实来源：本合订文档
版本说明：v1.7 在 v1.6 基础上完成存储引擎路线回写，拆分为两类变更——Part A · Clarification（描述修正，无回归）：SQLite → IndexedDB 术语替换、R1.3 transient 例子修正、R6-13 语义修正、DP1.3 / DP1.7 / R1.4 / R1.7 描述性改写；Part B · Implementation Change（新增实现要求，需完整回归）：system_command_id 表、Mutation Lane 串行队列、备份落盘 Tauri 文件系统、Event Journal 无限保留。核心语义（原子性、幂等性、持久性、串行性、可恢复性）保持不变。本版本为设计交付基线。Part B 项已登记入 G1.6 Technical Debt Register（Debt-DB-01~04）。

符号约定:
  ✅: 已满足 / 已冻结 / 已通过
  ❌: 禁止 / 不满足 / 未通过
  N/A: 该场景不适用，不参与判定


正式术语固定为 Review Data Scope，Review Data 仅为显示名称

分册版本对照

分册

版本

Base + Surface

v1.0

Theme（四主题）

v1.0

Component System Phase 1

v1.1

Composite Pattern Phase 2

v1.1

Page System

v1.0

Domain System

v1.0

Data & Projection System

v1.1

Runtime & Application Architecture

v1.3

Quality / Security / Verification

v1.4

Release / Governance

v1.4

以上分册版本是历史分册版本；本合订本 v1.7 才是最终统一语义后的唯一事实来源。分册历史文档不得覆盖本合订本。

第一分册 · Base + Surface

A1 · Base System

A1.1 Layout 常量

Sidebar:
  expanded: 240px
  collapsed: 68px
  item-height: 38px
  item-radius: 8px
  icon-expanded: 18px
  icon-collapsed: 20px
  icon-text-gap: 11px
  text: 14px

Header:
  height: 64px
  range: 56~72px

Canvas:
  wide-default: 1080px
  wide-max: 1200px
  narrow: 720px

A1.2 Spacing Scale

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px

A1.3 语义间距层级

L1: 大转折（基线 64px）    — 主要语义转换
L2: 一般语义切换（基线 48px） — 同一 Section 内部主要切换
L2.5: 同级功能切换（基线 32px） — Panel→Panel
L3: 同块内子项（基线 24px） — Now→Next, LIFE→PLAY
L4: 对象间距（基线 16px）    — Card→Card
L5: 文本行内（基线 8px）      — Flow 内部元素

规则：

L1 → L5 是语义强度的严格降序。

A1.3 给出的是基线层级，不要求所有主题使用完全相同的像素值。

主题可以在 A3.4 给定范围内选择实现值。

最终选定值必须满足：

L1 > L2 > L2.5 > L3 > L4 > L5

即使某些主题的区间在边界处相邻或重叠，实际选定值仍必须严格递减。

L1 的语义：

L1:
  定义: 主要语义转换
  常见场景:
    - Section → Section
    - Section → Plane / Flow
    - LifeSurface → Memory
  不绑定于特定 Surface 类型。
  判定标准: 是否构成“从一类语境进入另一类语境”的转折。

Section 边界与内容间距规则：

SectionBoundaryRule:
  语义层级: L1
  内容层级: L2
  实现规则:
    actual_gap = max(semantic_level, content_level)
  禁止:
    - L1 + L2 叠加式间距
  权威性:
    本处为唯一权威定义。
    其他分册只引用，不重新定义。

Today 空间边界：

TodaySpatialBoundary:
  ActionSpace: Section
  LifeSurface: Section
  Memory: Plane / Flow

  semantic_rhythm:
    ActionSpace → LifeSurface: L1
    LifeSurface → Memory: L1

  rule:
    LifeSurface → Memory 是大转折，但 Memory 不是 Section。

基线声明：

A1.3 为 Mist / Fluent / Night 的基础间距语义。Review Data Scope 拥有独立密度范围，见 A3.4。

A1.4 全局 Typography

font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif
font-size: xs 11 / sm 13 / md 15 / lg 18 / xl 24 / display 32
font-weight: regular 400 / medium 550 / semibold 600
font-variant-numeric: tabular-nums

A1.5 组件 Typography

nav-item: 14px / nav-group-label: 10px
header-title: 28px / header-context: 13px
panel-title: 15px / card-title: 14px
body: 15px / meta: 13px / micro: 11px

A1.6 Focus Ring

width: 2px
offset: 1px
border-radius: inherit

A1.7 状态模型基础

Item 状态:
  Default / Hover / Press / Focus-visible / Selected
  / Selected+Hover / Selected+Focus-visible / Disabled

Header 状态:
  Resting / Scrolled / Interaction / Context（Selection / Editing）

Canvas 状态:
  Normal / Populated / Empty / Loading / Error

术语统一：

Focus-visible = 用户可见的键盘焦点状态。

DOM focus 不等于视觉 Focus-visible。

全局文档禁止以单独 Focus 或 :focus 表示“键盘焦点视觉态”。

A1.8 全局禁则

✗ 三列等宽卡片组
✗ 超过两层纵向滚动
✗ Hover 改变 Layout
✗ Focus-visible 导致尺寸变化
✗ 为了填满 Canvas 强行拉伸内容
✗ 所有主题 Loading 周期性闪烁

A2 · Surface System v1.0

A2.1 核心原则

1. Geometry Cannot Create Meaning
2. Content determines effective width
3. Spacing follows semantic hierarchy
4. Surface ≠ Visual Style

A2.2 六层谱系

Plane 环境权 → Section 语义权 → Panel 功能权 → Card 对象权 → Floating 前景控制权 → Overlay 临时控制权

A2.3 层级定义

Surface

角色

视觉权重

独立滚动

组合

禁止

Plane

环境

0

禁止

Plane → Section / Flow

边框/阴影/滚动/选中/拖拽

Section

语义分区

1

禁止

→ Flow/Panel/Card List/Mixed

默认背景框/圆角/阴影

Panel

独立功能模块

2

默认禁止，高密度允许

→ Flow/Card/List

套 Panel/变 Window/无限嵌套

Card

对象

3

默认禁止

Section→Card, Panel→Card

Card→Card/作为页面外壳

Floating

前景状态

4

继承原对象

Card→Floating, Panel→Floating

永久存在/无限叠加

Overlay

临时控制层

5

按需

可覆盖任何层

进入普通 Flow/修改 Canvas Layout

A2.4 升级条件

Plane → Section:  内容需要被理解为独立语义区域
Section → Panel: 至少满足两项（独立任务/操作/状态/数据/边界）
Card → Floating: 对象需脱离原空间 + 用户正在直接操作
Any → Overlay:   操作必须独立于当前空间上下文

A2.5 四主题 Surface 表达

Surface

Mist

Fluent

Night

Review Data

Plane

纸面

Desktop Environment

Dark Space

Instrument Base

Section

纸页间距

Air / Space

Darkness / Silence

Data Group

Panel

厚纸片

Raised Surface

Raised Dark Surface

Instrument Module

Card

便签纸片

Object

Focused Object

Data Row

Floating

被拿起的纸

Elevated Object

Light-separated

Temp Analysis Object

Overlay

纸条

Foreground Surface

Foreground Light

Data Control

A3 · Surface Geometry v1.0

A3.1 尺寸约束

| Surface | 宽度 | 最小宽度 | 最大宽度 | 高度约束 |
|---------|------|---------|----------|----------|
| Plane | fill Canvas | 无 | 无 | content |
| Section | fill Canvas | 无 | 无 | content |
| Panel | fill Section / natural | 480px (Wide) / 360px (Narrow) | 无硬上限 | min 120px |
| Card | 列表 fill / 网格按列 | content-driven / none | content-driven | min 48px；推荐 48~120px；无硬上限 |
| Floating | inherit | — | Canvas 80% | inherit |
| Overlay | content-driven | 依组件 | 依组件 | 依组件 |

**Card 高度语义**：

```yaml
Card 高度:
  最小高度: 48px
  推荐高度: 48~120px
  软阈值: 120px
    超过时重新检查是否仍然符合 Card 的对象语义
    不是硬转换命令
  硬上限: 无（内容驱动）
```

**Card 最大宽度语义**：

```yaml
Card 最大宽度:
  类型: content-driven
  硬最大宽度: 无
  120px 不是硬最大宽度，而是软密度判断阈值
  真实最大宽度由内容、容器与布局关系决定
```
A3.2 Padding

Panel: 24px (紧凑 16px)
Card: 16px (紧凑 12px)
规则: Panel Padding > Card Padding

A3.3 嵌套间距

Panel 之间（32px）> Panel 内 Card 之间（16px）> Card 内 Flow 之间（8px）
不可反向。

A3.4 主题密度

主题

L1

L2

L2.5

L3

L4

L5

密度

Mist

56~72

40~52

28~36

20~28

14~18

8~10

松

Fluent

48~64

32~48

22~28

16~24

12~16

6~8

标准

Night

56~72

36~48

26~32

18~24

12~16

8~10

较松

Review Data Scope

24~32

12~16

10~12

6~10

4~8

2~4

紧密

规则：

范围区间允许相邻或重叠；最终实现值必须满足：

L1 > L2 > L2.5 > L3 > L4 > L5

A3.5 Semantic Gate

三问：为什么需要 Surface？为什么这么大？为什么需要边界？
五问 Geometry：哪一层？比上一层小吗？四主题都成立吗？用了 Scale 外值吗？因为“空”加的吗？
五问 Surface Type：环境还是对象？独立任务？脱离原空间？独立于上下文？仅仅因为“整齐”？

判定: 答不上来 → 回 Plane。答“是”但理由不充分 → 删除。

第二分册 · Theme（四主题合订本 v1.0）

B1 · 四主题 Token

B1.1 Mist · 晨雾书房

world: 晨雾书房 / 清晨桌面
color:
  background: "#F6F4EF"
  surface-1: "#FBFAF7"
  surface-2: "#FFFFFF"
  shell: "#F1EEE8"
  ink: "#2B2926"
  ink-secondary: "#6E6A63"
  accent: "#C58F5E"
  border: "rgba(43,41,38,0.06)"
radius:
  panel: 6px / card: 4px / button: 4px / tooltip: 4px
shadow:
  xs: "0px 1px 2px rgba(43,41,38,0.04)"
  sm: "0px 2px 6px rgba(43,41,38,0.06)"
  md: "0px 3px 8px rgba(43,41,38,0.05)"
  lg: "0px 8px 20px rgba(43,41,38,0.08)"
motion:
  default: 200~280ms

B1.2 Fluent · 数字桌面

world: 数字桌面 / 有深度的空间
color:
  background: "#E8E9EE"
  acrylic-1: "rgba(255,255,255,0.55) + blur(30px)"
  acrylic-2: "rgba(255,255,255,0.72) + blur(20px)"
  acrylic-panel: "rgba(255,255,255,0.92) + blur(25px)"
  ink: "#1A1A1E"
  ink-secondary: "#55555C"
  accent: "#3B82F6"
  border: "rgba(0,0,0,0.06)"
radius:
  panel: 8px / card: 6px / button: 4~6px / tooltip: 6px
shadow:
  xs: "0px 1px 2px rgba(0,0,0,0.04)"
  sm: "0px 2px 6px rgba(0,0,0,0.06)"
  md: "0px 6px 16px rgba(0,0,0,0.10)"
  lg: "0px 10px 24px rgba(0,0,0,0.14)"
motion:
  default: 180~250ms

B1.3 Night · 夜航暗室

world: 深夜空间 / 低照度暗室
color:
  background: "#121417"
  surface-1: "#1A1D21"
  surface-2: "#23272D"
  focused-surface: "#2E3540"
  ink: "#E5E7EB"
  ink-secondary: "#9CA3AF"
  glow: "#E8DCC8"
  border: "rgba(255,255,255,0.05)"
radius:
  panel: 8px / card: 6px / button: 6px / tooltip: 8px
shadow:
  xs: "0px 1px 2px rgba(0,0,0,0.4)"
  sm: "0px 2px 8px rgba(0,0,0,0.5)"
  md: "0px 4px 10px rgba(0,0,0,0.5)"
  lg: "0px 8px 20px rgba(0,0,0,0.6)"
motion:
  default: 250~350ms
  light-transfer: 350~600ms
  ember-wake: 800ms

B1.4 Review Data · 数据驾驶舱

world: 数据仪表盘 / 工具视觉空间
scope_type: page_scope
global_theme: false
color:
  background: "#0F1115"
  surface: "#171A20"
  grid: "rgba(255,255,255,0.04)"
  ink: "#E6E8EB"
  ink-secondary: "#8A93A0"
  data-blue: "#5AB0F2"
  data-green: "#4ECB8D"
  data-yellow: "#E5B454"
  data-red: "#E56A5E"
  data-violet: "#9B8AF0"
  border: "rgba(255,255,255,0.04)"
radius:
  panel: 4px / card: 4px / button: 2px / tag: 2px / tooltip: 2px
shadow:
  xs: none
  sm: none
  md:
    value: "0px 4px 12px rgba(0,0,0,0.5)"
    reserved_for: Dialog
  lg:
    value: "0px 8px 20px rgba(0,0,0,0.6)"
    reserved_for: Dialog
motion:
  default: 120~180ms
  data-update: 100~150ms

B1.5 四主题核心 DNA

主题

核心介质

Hover

Selected

Motion

用户感受

Mist

Paper/Ink

墨色/纸面

墨迹确认

柔和

我在这里生活

Fluent

Acrylic/Depth

靠近/清晰

实体化

空间运动

我在这里工作

Night

Darkness/Light

局部照亮

光稳定

安静

我在这里专注

Review Data Scope

Grid/Data

标记/扫描

锁定

快速

我在这里理解自己

B2 · 组件材质对照

B2.0 Review Data Scope 声明

ReviewDataScope:
  formal_term: Review Data Scope
  type: page_level_visual_scope

  applies_only_to:
    - Review Canvas
    - Review-specific Panels
    - Review-specific Data Rows
    - Review-specific Controls
    - Review-canvas-triggered Overlays

  does_not_apply_to:
    - Sidebar
    - Global Header
    - Global Overlay
    - Global Search
    - Settings Theme Selector

  Overlay Inheritance:
    from_review_canvas: Review Data Scope
    from_app_shell: Current Global Theme

正式术语规则：

Review Data 是显示名称；Review Data Scope 是架构正式术语。
它不是 Global Theme，不进入全局 Theme 枚举，不参与全局主题轮换。

Motion 优先级规则：

Overlay Transition overrides Page Scope / Page Theme default Motion.

ThemeSwitchRule:
  Review 页面内不提供全局主题切换入口。
  用户需离开 Review 页面，在 Settings 中切换全局主题。
  切换全局主题不影响 Review Canvas 的 Review Data Scope 表达。
  Review Canvas 始终保持 Review Data Scope，无论全局主题为何。

B2.1 组件材质总表

组件

Mist

Fluent

Night

Review Data Scope

Canvas

暖灰纸张

环境桌面

暗室本身

仪表底盘

Sidebar

沉暖灰纸

Acrylic L1

暗面轮廓

N/A · 继承全局主题

Header

沉暖灰纸

Acrylic L1

暗面幽灵

N/A · 继承全局主题

Section

透明纸面

透明空气

暗室留白

透明+网格

Panel

厚纸片

Raised Surface

暗面工作台

仪表模块

Card

便签纸片

Object

暗室物体

Data Row

Button

纸+墨

Acrylic Int.

Surface+Light

仪表开关

Input

写字槽

Acrylic L2

休眠容器

读数窗口

B2.2 Focus-visible 行为

主题

Ring 色

Ring 宽

Offset

Mist

琥珀#C58F5E

2px

1px

Fluent

蓝#3B82F6

2px

1px

Night

暖白#E8DCC8

2px

1px

Review Data Scope

蓝#5AB0F2

2px

1px

B2.3 Motion

主题

默认时长

最长时长

Page Transition

Mist

200~280ms

350ms

200~280ms

Fluent

180~250ms

400ms

180~250ms

Night

250~350ms

800ms

250~350ms

Review Data Scope

120~180ms

200ms

120~180ms

Overlay Transition（全局硬约束，覆盖主题默认）：

类型

时长

表达

Tooltip

100~150ms

minimal fade

Popover

180~250ms

local rise / fade

Menu

150~200ms

local open / fade

Dialog

250~350ms

focus / backdrop emphasis

Toast

200~300ms

arrival / settle

B2.4 Empty / Error / Loading

状态

Mist

Fluent

Night

Review Data Scope

Empty

铅笔虚线

极轻虚线

极淡虚线

网格线+No data

Error

低饱和暖红

局部红框

暖红克制

数据红标

Loading

墨迹显影

Skeleton shimmer

光脉冲弱

数据行骨架

B3 · Today 页面三主题并排

B3.1 页面结构（Base 统一）

Today Canvas → Orientation → Capture → Action Space(Now/Next/Today Plan)
→ Life Surface(LIFE/PLAY) → Memory(Daily Memory)

B3.2 区域语义

区域

Mist

Fluent

Night

Orientation

纸上写下的字

桌面上的信息

被光照亮的字

Capture

写字线

悬浮输入面

休眠容器

Now

最深的墨

最高优先空间对象

唯一的光源

Today Plan

厚纸片

悬浮工作面

暗面工作台

Daily Memory

铅笔随笔

备忘条(轻量)

最弱的灯

B3.3 空间节奏

Header → L1 → Orientation → L2 → Capture → L1 → Action Space
→ L3 → Now → L2 → Today Plan
→ L1 → Life Surface
→ L3 → LIFE → PLAY
→ L1 → Memory

实现规则：

Section Boundary 由 A1.3 唯一权威规则决定。

Action Space → Life Surface 是 Section → Section，因此使用 SectionBoundaryRule。

Life Surface → Memory 是 L1 大转折，但 Memory 是 Plane / Flow，不把 Memory 提升成 Section。

不允许重复叠加 semantic gap + content gap。

B4 · Sidebar 折叠态

B4.1 通用 Base

折叠宽度: 68px
图标大小: 20px
Active Indicator: 3px 宽
分组线: hairline，左右缩进 20px
Tooltip 延迟: 400ms
Edge Toggle:
  position: sidebar right boundary
  overlap: 50%
  expanded_icon: ◀
  collapsed_icon: ▶
  scroll_container: outside nav scroll region

B4.2 三主题对比

维度

Mist

Fluent

Night

Icon 默认

#4A4742

#3A3A42

#9CA3AF

Active 指示

琥珀竖条

蓝色竖条

暖白微光竖条

Tooltip

白纸

Acrylic

深色表面

品牌色

琥珀

蓝

暖白

B5 · 设计红线

Canvas:
  三列等宽卡 / 强行扩张 / 超两层滚动

Sidebar:
  折叠态仅隐藏文字 / Divider 作对齐轴 / Hover 改 Layout
  Edge Toggle 进入 nav 滚动区

Header:
  换行 / Scrolled 浮动卡 / 标题挤压

Today:
  Now 装 Panel / LIFE-PLAY 等宽 / Memory 统计卡 / Header 进入 Scrolled
  Today 使用 Review Data Scope

Theme:
  混用材质 / Fluent Panel 做 Window / Night 黑紫霓虹
  / Review Data Scope 滥用阴影 / Loading 闪烁

Review Data Scope:
  应用于 Sidebar / Global Header / Global Overlay / Global Search

第三分册 · Component System Phase 1 v1.1

C1 · Button System v1.0

身份: Control，操作意图的物理入口
语义: Primary / Secondary / Quiet / Destructive
颜色不定义语义，role 定义语义

Geometry:
  Compact 32px
  Standard 36px
  Major 40px
  Icon-Text Gap 8px
  Text Padding 16px
  Text: 13px (Sec/Quiet) / 14px (Primary/Major)

状态:
  Default / Hover / Press / Focus-visible / Disabled
  / Loading / Success / Destructive-confirm

Press: ≤120ms
Focus-visible: 2px Ring / offset 1px
Button Group: 8px / 16px

四主题:
  Mist: 压纸
  Fluent: 压回桌面
  Night: 光收束
  Review Data Scope: 即时切换

C2 · Input System v1.0

C2.1 身份

Input 是 Control，不是 Surface
身份: 用户意图进入系统的入口

C2.2 Control 家族分层

Control
├── Input（Text / Text Area / Number-Data / Date-Time / Search）
├── Checkbox / Selection
├── Select / Picker（独立 Control，不属于 Input 子类型）
└── Button

C2.3 Geometry

Compact: 32px
Standard: 36px
Major: 40px
Text Area: min-height 80px, 顶部对齐

C2.4 状态模型

Interaction:
  Default / Hover / Focus-visible / Editing

Value:
  Empty / Filled

C2.5 生命周期（示例，非强制状态机）

Text Field: Empty → Active → Editing → Filled → Accepted / Committed
Search: Empty → Active → Editing → Query Executed
Read-only: Filled → Focus-visible
Checkbox: 见 C3

Active 表示控件已进入交互上下文；Focus-visible 表示可见键盘焦点。两者不是同一状态。

C2.6 Input → Auto-save 映射

Input Lifecycle

Auto-save

Typing

Editing

Value changed

Dirty

Accepted/Committed

Saved

Validation failed

Save Failed

C2.7 四主题

主题

隐喻

Focus-visible

Mist

写入纸面

纸面被擦亮

Fluent

工作表面

材质变实

Night

被唤醒

被光照亮

Review Data Scope

读数窗口

读数窗口激活

C3 · Checkbox / Selection v1.0

三种语义:
  Completion
  Selection
  Boolean Setting

核心:
  Checked ≠ Selected

Geometry:
  Visual 16×16
  Hit Area ≥32×32

Keyboard:
  Space → Toggle
  Enter → 默认不 Toggle

C4 · Select / Picker v1.1

身份: 与 Input 并列的独立 Control
Active Option: 当前键盘导航位置，与 List/Row Highlighted 不同

Keyboard:
  Space / Enter → Open
  ↑ / ↓ → Navigate
  Enter → Confirm
  Esc → Close

Popover:
  Select → Popover → Options

C5 · List / Row v1.1

核心:
  Row = 对象的化身
  List = 对象的队列

Density:
  Compact: 36~44
  Standard: 48~64
  Comfortable: 64~96
  Data: 36~48

Leading ≤2
Trailing ≤2

Selected = user state
Highlighted = system state（1500~2000ms，一次性）
Grouping: List → Group → Row
Group ≠ Section

身份转变:
  脱离 List → Floating Card
  失去 Row 身份

C6 · Overlay System v1.0

Tooltip = Explain
Popover = Interact
Menu = Command
Dialog = Decide
Toast = Notify

Dialog:
  Focus Trap 必须
  Escape Close
  Simple Editing → 不使用 Dialog

Toast:
  Success: 2.5~4s
  Info: 3~5s
  Warning: 4~6s
  Error: 8~12s
  Undo: 5~10s

第四分册 · Composite Pattern Phase 2 v1.1

D1 · Form System v1.0

身份: 共同任务目标 + 共同 Commit Boundary
结构:
  Purpose → Form Group → Field → Validation → Commit → Actions

Commit:
  Immediate: Checkbox
  Field: Date / Number / Select
  Form: Plan Editor

D2 · Search System v1.1

三种:
  Global / Page / Command

Result:
  Search → Result Group → Row

Match Highlight:
  不触发 List/Row Highlighted

D3 · Selection Mode v1.1

进入:
  Explicit / Checkbox / Cmd+Click 自动激活

Header:
  已选 N 项

Esc:
  Clear + Exit

范围:
  List-level，不跨 List

D4 · Drag & Drop v1.1

Row → Floating Object
Edge Zone: 上下约 40px
Keyboard Equivalent: 强制
Review Data Scope: 优先 Sort / Filter

D5 · Empty / Loading / Error v1.0

Empty:
  Context + Explanation + Action
  禁插画

Loading:
  Skeleton Row
  禁闪烁

Error:
  What + Context + Action
  优先 Retry

D6 · Confirm / Delete v1.1

D6.1 风险等级

Low:
  单击 + Toast + Undo

Medium:
  单击 + 提示 + 可恢复

High:
  Dialog Confirm

Critical:
  强上下文 + 额外验证

D6.2 默认删除模型

DefaultDeleteModel:

  soft_delete:
    定义: 可恢复删除，进入 Archived
    undo: available
    默认: 所有普通 Primary / Operational Domain Object
    projection:
      - 默认视图隐藏
      - 历史投影保留
      - derivedFromDeleted 不置 true

  permanent_delete:
    定义: 不可恢复删除
    undo: prohibited
    确认: High / Critical
    projection:
      - Timeline 移除对应投影事件
      - Daily Memory 重建时移除
      - StudyRecord.derivedFromDeleted = true（仅永久删除）
      - 引用对象保留 sourceId + deletedMarker

Archive ≠ Delete；Soft Delete ≠ Permanent Delete；Projection 不因 Soft Delete 自动抹去历史。

D7 · Undo / Recovery v1.1

Undo Window: 5~10s
幂等: 连续点击只能恢复一次

不可 Undo:
  Permanent Delete
  Vault Security
  不可逆 Migration

D8 · Auto-save v1.1

状态:
  Clean / Editing / Dirty / Saving / Saved / Save Failed
  / Offline Pending / Recovered

Save Failed:
  必须 Retry
  必须保留本地草稿

第五分册 · Page System v1.0

P1 · 完整页面规范

P1.1 Page Type Registry

Page Type

作用

典型

Home

当前生活入口

Today

Workspace

持续工作

Plan / Tasks

Collection

浏览管理

Diary / Memory

Analysis

理解数据

Review / Timeline

Utility

系统设置

Settings

P1.2 完整 Page Registry

Page

Page Type

Sidebar

Canvas

Today

Home

Core

Wide 1080

Inbox

Collection

Core

Wide 1080

Timeline

Analysis

Core

Wide 1080

Plan

Workspace

Core

Wide 1080

Diary

Collection

LIFE

Narrow 720

Memory

Collection

LIFE

Narrow 720

Tasks

Workspace

WORK

Wide 1080

Projects

Collection

WORK

Wide 1080

Review

Analysis

独立入口

Wide 1200

Games

Collection

PLAY

Narrow 720

Collection

Collection

PLAY

Narrow 720

Settings

Utility

Footer

Narrow 720

P1.3 Review Data Scope

applies_to:
  - Review Canvas
  - Review-specific Panels
  - Review-specific Data Rows
  - Review-specific Controls
  - Canvas-triggered Overlays

does_not_apply_to:
  - Sidebar
  - Global Header
  - Global Overlay
  - Global Search
  - Settings Theme Selector

正式术语:
  Review Data Scope

P1.4 Today Page Contract T-001

Canvas 结构:
  Today Page
  ├── Context（Header: Search / More）
  ├── Orientation（Plane/Flow）
  ├── Capture（Plane/Flow + Input）
  ├── Action Space（Section）
  │   ├── Now（Plane/Flow，禁止 Panel）
  │   ├── Next（Flow，最多 2~4 条）
  │   └── Today Plan（唯一默认 Panel）
  ├── Life Surface（Section）
  │   ├── LIFE（Flow）
  │   └── PLAY（Flow）
  └── Memory（Plane/Flow，不是 Section）

状态矩阵:
  Data:
    → A1.7 Canvas State
  Interaction:
    → A1.7 Item State / Focus-visible / Selection
  Persistence:
    → D8 Auto-save State

初始键盘焦点:
  Capture

鼠标进入:
  不自动 autofocus

Tab:
  Header Search → More → Capture → Now → Next → Plan → LIFE → PLAY → Memory

Today Redlines · R-P01 ~ R-P12：

R-P01  Today 不得使用 Review Data Scope。
R-P02  Today Header 不得进入 Scrolled Floating Card 状态。
R-P03  Orientation 不得使用 >60px 的标题字号。
R-P04  Capture 必须保持轻量，不得强制输入 Priority / Date / Subject / Estimated Minutes / MUST-SHOULD-COULD。
R-P05  Now 不得升级为 Panel。
R-P06  Next 只承担“接下来”，默认最多展示 2~4 条。
R-P07  Today Plan 是 Today 唯一默认 Panel，不得再生成同级 Panel 群。
R-P08  LIFE 与 PLAY 不得形成两个等宽并排 Panel。
R-P09  Action Space → Life Surface 使用 L1，且不得额外叠加第二个 section gap。
R-P10  Life Surface → Memory 使用 L1，但 Memory 保持 Plane / Flow。
R-P11  Daily Memory 不得使用统计卡片作为主要视觉结构。
R-P12  Action Space 内必须形成 Now → Next → Today Plan 的视觉进程，禁止三个对象视觉等权。

第六分册 · Domain System v1.0

DO1 · 完整对象语义与生命周期

DO1.1 Domain 分类

Core: Task / Project
Intake: Inbox Item
Life: Diary Record / Person
Study: Study Record
Play: Game Record / Collection Item
Cross-Domain: Timeline Event / Daily Memory
Analysis: Review Projection

DO1.2 Primary vs Derived

Primary (7):
  Task / Project / Diary / Study / Game / Collection Item / Person

Operational (1):
  Inbox Item

Derived (2):
  Timeline Event / Daily Memory

Projection (1):
  Review Projection

DO1.3 完整生命周期

对象

生命周期

Task

Planned → In Progress → Completed → Archived

Project

Planned → Active → Archived

Inbox Item

New → Triaged → Converted / Discarded

Diary Record

Draft → Published → Archived

Person

Active → Archived

Study Record

Draft → Recorded → Archived

Game Record

Draft → Recorded → Archived

Collection Item

Active → Archived → Removed

Timeline Event

Projected → Stale → Rebuilt / Removed

Daily Memory

Projected → Stale → Rebuilt

Review Projection

Fresh → Stale → Rebuilt

删除语义补充：

Archived 是可恢复逻辑状态，不等于物理移除。

Removed 仅用于明确的永久移除或外部源失效后的 Projection removal。

Projection 无业务编辑权限，其“状态”描述的是投影可用性，不是业务对象生命周期。

DO1.4 核心规则

Priority ≠ Flex
Inbox Item ≠ Task
Diary ≠ Daily Memory
Timeline 是 Projection
Facts ≠ Reflection
Delete ≠ Archive ≠ Detach

DO1.5 Study Record 溯源

derivedFrom: null | taskId
sourceType: task | manual | import | unknown
derivedFromDeleted: boolean
rule:
  derivedFromDeleted = true
  only when source Task has been permanently deleted
  never when source is only Soft Deleted / Archived

DO1.6 Collection Item 引用

sourceType: external | internal | manual
sourceId?: string
sourceUrl?: string

DO1.7 Relationship Vocabulary

允许:
  belongsTo
  references
  mentions
  derivedFrom
  produces
  contains

避免:
  relatedTo
  associatedWith
  connectedTo

第七分册 · Data & Projection System v1.1

DP1 · 完整数据架构与投影规范

DP1.1 State-based 架构

SourceOfTruth:
  Domain Data

EventJournal:
  role:
    - Domain Event History
    - Projection Input
    - Audit
  retention:
    policy: indefinite
    禁止: 30 天滚动裁剪
    理由: Event Journal 承担 Audit 与 Projection Input 角色，裁剪会破坏历史可重建性与审计完整性

EventJournal 不是:
  - Source of Truth
  - Domain State Storage

DP1.2 Journal 损坏恢复

JournalRecovery:

  domain_healthy: true
  journal_corrupted: true

  allowed_state:
    domain:
      usable: true

    projections:
      Timeline:
        status: degraded
      DailyMemory:
        status: degraded
      Review:
        status: usable_if_domain_based
      SearchIndex:
        status: usable_if_domain_based
      TodayOrdering:
        status: usable

  rules:
    - Projection rebuild 不得导致 Domain 失败
    - 使用可用事件与 Domain Data 尽可能重建
    - 不可用部分必须显式标记 degraded
    - 禁止伪造缺失历史
    - Journal integrity 恢复后允许再次 rebuild

DP1.3 IndexedDB Transaction Boundary

IndexedDBTransactionBoundary:
  database_engine: Dexie / IndexedDB
  transaction_model: Dexie transaction（跨表原子写）

  IndexedDB:
    role: 浏览器级事务与崩溃恢复机制
    guarantees:
      - 跨表事务原子性
      - 事务内任意步骤失败则全部回滚
      - 事务完成即持久化到浏览器存储层

  V9_EventJournal:
    role:
      - Domain Event History
      - Projection Input
      - Audit
    independent_from:
      IndexedDB 底层实现

  rule:
    - V9 不解析 IndexedDB 内部日志来重建业务状态
    - IndexedDB 负责事务恢复
    - V9 在数据库打开后执行 Integrity Check
    - V9 Event Journal 的业务语义独立于 IndexedDB 存储实现

DP1.4 Projection Registry

Projection

Source

Journal 依赖

降级重建

Timeline

Domain + Events

是

domain_reconstruction + 可用 Events

Daily Memory

Domain + Events

是

domain_reconstruction + 可用 Events

Review

Domain

否

Domain rebuild

Search Index

Domain

否

Domain rebuild

Today Ordering

Task.scheduledDate

否

Domain query

DP1.4a ProjectionPolicy：

定义:
  每个 Projection 必须显式声明其消费的 eventType 集合。
  任何不在 Projection Policy 中列出的 eventType 不得进入该 Projection。

结构:
  projection_name:
    consumes: [eventType, ...]
    excludes: [eventType, ...]

默认策略:

  Timeline:
    consumes:
      - task.completed
      - diary.created
      - study.recorded
      - game.session.completed
    excludes:
      - pomodoro.completed
      - flashcard.reviewed
      - recurring.generated

  DailyMemory:
    consumes:
      - task.completed
      - diary.created
      - study.recorded
      - game.session.completed
    excludes:
      - pomodoro.completed
      - flashcard.reviewed
      - recurring.generated

  Review:
    consumes_domain_data_only: true

  SearchIndex:
    consumes_domain_data_only: true

  TodayOrdering:
    consumes_domain_data_only: true

规则:
  任何不在 Projection Policy 中显式列出的事件类型，
  不得进入该 Projection。
  Journal-only events 始终被所有 Projection 排除。

DP1.5 原子性与幂等

AtomicMutation:
  Domain Mutation + Event Journal Write
  must_be_atomic: true

CommandIdempotency:
  scope: Command Type + commandId
  lookup:
    location: Mutation Lane entry
    order: before Domain Validation

  persistence:
    commandId record:
      durable: true
      same_transaction_as:
        - Domain Mutation
        - Event Journal Write
      implementation:
        storage: system_command_id 表
        transaction: 与 domain_* / journal_* 写入共用同一 Dexie transaction
        restart_behavior: 重启后仍幂等（基于持久化的 system_command_id）

restart_behavior:
  duplicate commandId after restart:
    result: no-op
    event: none

cleanup:
  v1_0_policy:
    retain_command_ids: true
    retention_window: indefinite
    manual_cleanup: prohibited
    note:
      v1.0 不清理 commandId 记录。
      未来如需清理，必须作为独立变更提交 Contract 评审，
      并在新的 retention policy 冻结后方可执行。
DP1.6 eventKey 规则

CanonicalEventIdentity:

base:
  <eventType>:<aggregateId>:<semanticVersion>

repeated_event:
  canonical_form:
    <eventType>:<aggregateId>:<semanticVersion>:<stableEventIdentity>

stableEventIdentity:
  source:
    domain_event_id
  requirement:
    globally unique within V9 event journal

rule:
  - 同一 aggregate 上同一 eventType 若只允许出现一次，可使用 base form。
  - 若允许重复发生，必须使用 repeated_event form。
  - semanticVersion 不得被用于替代 stableEventIdentity。
  - eventKey 必须在 timelineEvents 中唯一。

Projection Rebuild:
  - 只处理满足该 Projection ProjectionPolicy 的事件。
  - Journal-only events 始终排除。
  - 已处理/未处理状态不改变其是否属于 rebuild input。

DP1.7 Storage 分层与物理边界

StorageLayers:

  PrimaryDB:
    role:
      - Domain Data
      - Domain Event Journal
    source_of_truth: true
    implementation: Dexie 单一数据库，domain_* 与 journal_* 表分区

  ProjectionDB:
    role:
      - Logical storage boundary for Projection data
    source_of_truth: false
    implementation:
      - 同一 Dexie 数据库内 projection_* 表分区
      - 物理上不拆分；逻辑分区通过表前缀实现
    rule:
      Projection DB 是逻辑架构边界，不要求物理分离。

  SearchIndex:
    role: derived_index
    rebuildable: true
    implementation: 使用 Dexie 索引（自动由 Dexie 维护），非独立存储。

  FileSystem:
    role:
      - encrypted Private File storage
      - 备份快照落盘（新增）
    implementation: Tauri PrivateWorkbench/files + Backup 专用子目录

Schema 分区：

domain_ / journal_ / projection_ / system_

DP1.8 Default Delete Policy

soft_delete:
  object:
    enters: Archived
  projection:
    default_view_hidden: true
    historical_projection_retained: true

permanent_delete:
  object:
    physically_removed: true
  projection:
    rebuild_or_remove: true

第八分册 · Runtime & Application Architecture v1.3

R1 · 完整运行时行为契约

R1.1 三通道执行模型

Interaction Lane:
  短查询 / 命令分发

Mutation Lane:
  串行域事务
  concurrency: 1
  order: FIFO
  implementation:
    - 使用 Promise chain 实现串行队列
    - 每个 Mutation 内部的 Domain 写入与 Journal 写入共用同一个 Dexie transaction
    - Mutation Lane 入口处执行 commandId 去重

Background Lane:
  投影 / 备份 / 索引

R1.2 Event Bus

三层:
  Domain Event
  Application Event
  Runtime Event

UI:
  Invalidate → Query → View Model → Render

禁止:
  UI 直接以 Domain Event Payload 作为最终 View State

R1.3 Error Taxonomy

错误

retryable

Recovery

Validation

❌

Level 1

Domain

❌

Level 1

Projection

✅

Level 2

Security

❌

Level 5

Migration

❌

Level 5

Persistence Failure 分类：

transient:
  example: IndexedDB 事务冲突 / 浏览器存储层 busy
  recovery: Level 1

resource:
  example: Disk full
  recovery: Resource Intervention

corruption:
  example: database corruption
  recovery: Level 4 / Level 5

integrity_failure:
  recovery: Level 5

Recovery Level 定义：

Level 1:
  Local Correction / Retry
  用户可直接修正或单次重试

Level 2:
  Background Recovery
  后台任务可重试、重新计算、重建局部 Projection

Level 3:
  Service Restart / Controlled Rebuild
  重启相关服务或重新初始化运行时资源

Level 4:
  Snapshot Recovery
  使用已验证 Snapshot 恢复非核心或可恢复数据

Level 5:
  Rescue / Human Intervention
  停止自动写入，进入 Rescue Mode 或要求用户人工决策

R1.4 Startup / Migration

Startup:
  Process
  → Native Init
  → Config
  → Security
  → Dexie 数据库打开
  → Schema 版本校验
  → Migration
  → Journal 完整性检查（基于 journal_* 表）
  → Projection State
  → Recovery Check
  → Services Start
  → UI Mount
  → Ready

Migration 六步模型：

1. Preflight
2. Dry Run
3. Snapshot
4. Apply / Transform
5. Verify
6. Commit

Verify 至少检查：

- source/target count 按 mapping contract 校验
- 抽样数据语义等价
- 关系完整性
- eventKey 无重复
- Schema 版本号匹配
- checksum / manifest 完整
- failedCount 与 Migration Manifest 中记录的 failedCount 一致
- skippedCount 与 Migration Manifest 中记录的 skippedCount 一致

Count Verification：

one_to_one:
  exact source-to-target equality expected

one_to_many:
  expected expansion count required

many_to_one:
  expected normalized target count required

skipped:
  skippedCount must match manifest

failed:
  failedCount must match manifest

rule:
  禁止把“source row count = target row count”作为所有映射类型的普适条件。

Failure：

Failure → Rollback / Rescue

R1.5 备份安全

Backup Key ≠ Vault Key
PBKDF2-HMAC-SHA256 ≥ 600,000 iterations

R1.6 版本兼容

Schema:
  Forward Migration 支持
  Downgrade 不支持

Command API:
  旧版支持则执行

Projection:
  版本不匹配 → stale → rebuild

R1.7 Fault Injection Hooks

FaultInjection:
  hooks:
    before_domain_commit:
      transaction: open

after_journal_write:
  meaning: Event Journal 记录已写入，但外层 Dexie 事务尚未成功提交。
  transaction_state: in_flight
  crash_expected_behavior:
    IndexedDB 事务未提交则自动回滚，包括：
      - Domain 更新
      - Event Journal 写入
    重启后 Domain 与 Journal 保持一致，无半成功状态。

    after_domain_commit:
      transaction: committed

    mid_projection:
      transaction: background

    mid_backup_write:
      transaction: filesystem_write

    mid_migration_transform:
      transaction: migration_run

    mid_import:
      transaction: import_run

    mid_export:
      transaction: export_run

production: disabled
test_mode: enabled

Q1.5 只引用本注册表，不得重新声明另一份 Hook 集合。

R1.8 Runtime Redlines · R6-01 ~ R6-25

R6-01  UI 不得直接执行持久化写入；必须经过 Command / Application boundary。
R6-02  Query 不得修改 Domain State。
R6-03  Mutation Lane 并发必须为 1，顺序必须 FIFO。
R6-04  commandId 去重必须发生在 Mutation Lane 入口。
R6-05  已处理 commandId 不得再次产生 Domain Event。
R6-06  Domain Mutation 与 Event Journal Write 必须同事务原子提交。
      实现要求：两者必须在同一个 Dexie transaction 中完成，
      不得拆分为 fire-and-forget 的先后调用。
R6-07  Event Bus 不得成为 Source of Truth。
R6-08  UI 不得把 Domain Event Payload 直接当作最终 View Model。
R6-09  Projection 不得同步运行于 UI Thread。
R6-10  Projection 失败不得回滚已经成功提交的 Domain Mutation。
R6-11  Projection 必须可重试且可重建。
R6-12  Journal-only events 不得进入 Projection Rebuild。
R6-13  IndexedDB 的内部存储日志（WAL 等价物）不得被 V9 作为业务事件源解析。
R6-14  数据库 Integrity Check 失败不得静默进入 Ready。
R6-15  Security Boundary 失败不得通过 UI 绕过。
R6-16  Vault Key / Backup Key 不得混用。
R6-17  KEK / DEK / 主密码不得持久写入普通业务存储。
R6-18  Fault Injection 生产环境必须关闭。
R6-19  Long Job 不得阻塞 UI Thread。
R6-20  Multi-window 所有 Domain Mutation 必须进入同一 Mutation Lane。
R6-21  Runtime Event 不得改变 Domain Semantics。
R6-22  Schema Migration 不得支持未经定义的 downgrade。
R6-23  Projection Version mismatch 必须进入 stale / rebuild 流程。
R6-24  单实例约束下不得产生第二份独立 Domain Runtime。
R6-25  Runtime Readiness 与 Operational Health 必须保持正交，不得混成单一状态枚举。

第九分册 · Quality, Security & Verification v1.4

Q1 · 质量验证与发布门禁

Q1.1 Verification Pyramid

Release Gate
    ↑
E2E / Runtime
    ↑
Integration
    ↑
Contract
    ↑
Unit

Q1.2 Contract Gate 与 Governance Gate

Machine-verifiable:
  C / D / D-Data / R / Q

Governance Controls:
  G

Release Gate 4:
  Contract Gate PASS
  + Governance Gate PASS

Q1.3 Performance SLO

cold_start:
  target <3000ms
  hard <5000ms

normal_command:
  target <150ms
  hard <300ms

today_query:
  target <80ms
  hard <150ms

search(10000):
  target <120ms
  hard <250ms

projection_ui_block:
  synchronous_calls: 0
  static_check: PASS
  runtime_fault_test: PASS
  p95_main_thread_block: <50ms

测量规则：

≥10 runs
Median ≤ target
P95 ≤ hard
Release build

Q1.4 Benchmark Environment

必录:
  os
  cpu
  cores
  ram
  build_type
  dataset_size
  disk
  schema_version

Q1.5 Fault Injection

引用:
  R1.7 完整 Hook 集合（已实现：utils/faultInjection.ts，8 个 Hook）

production:
  disabled

test_mode:
  enabled

实现:
  faultInjection.fire / inject / enable + _resetFaultInjectionForTests。
  Hook 接线：before/after_domain_commit（mutationLane）、after_journal_write（journal）、
  mid_projection（timelineProjection）、mid_backup_write（snapshot）、
  mid_migration_transform（migration runner）、mid_import/mid_export（db 导入导出）。

Q1.6 Release Gate

Gate0:
  Static / Structural Gate
  checks:
    - Type / compile checks
    - contract machine block parse
    - forbidden architecture pattern scan
    - required file / route / schema presence

Gate1:
  Unit + Contract Gate
  checks:
    - Unit PASS
    - Contract Gate PASS
    - Domain invariants PASS
    - Data semantics PASS

Gate2:
  Integration + Migration + Data Integrity Gate
  checks:
    - Integration PASS
    - Migration Dry Run / Real Fixture PASS
    - Data Integrity PASS
    - Backup 文件落盘验证 PASS（检查 PrivateWorkbench/backup/ 存在且非空）
    - Restore fixture PASS（从文件系统快照恢复）

Gate3:
  Runtime + E2E + A11y + Security + Recovery + Performance + Visual
  checks:
    - Runtime Matrix PASS
    - E2E PASS
    - Keyboard / Screen Reader basic flow PASS
    - Contrast / reduced motion PASS
    - Security checks PASS
    - Fault Injection / Recovery PASS
    - Performance SLO PASS
    - Visual Baseline PASS

Gate4:
  Final Release Gate
  rule:
    Gate0~Gate3 PASS
    + No S0/S1
    + Backup Restore PASS
    + Final Acceptance PASS
    + Governance Gate PASS

Gate 判定：

任何 Gate 的 blocker fail = Gate FAIL
只允许把明确标记为 non-blocking 的已登记 Technical Debt 带入下一阶段。

Q1.7 Visual Baseline

granularity:
  theme × page × state × breakpoint

platform_specific: true
rasterization_tolerance: approximately 1px

structural_diff:
  approval_required: true

auto_accept:
  prohibited

Q1.8 OS Matrix

Windows:
  primary
  full verification

macOS:
  compatibility verification

Linux:
  build + basic smoke

Q1.9 Security Verification

Crypto
Authentication
App Lock
Vault
Backup
Migration
IPC
Tauri Capabilities
Logging
Filesystem Permissions
Unauthorized Invoke
Capability Bypass

Unauthorized invoke / capability bypass = blocker。

Q1.10 Backup / Restore Semantic Equality

field-by-field
relations exact
timestamps: millisecond precision
ordering: normalized
projections: excluded

实现要求:
  Backup 快照必须落盘到 Tauri 文件系统（PrivateWorkbench/backup/）。
  不允许仅存 localStorage。
  Restore 测试必须从文件系统读取快照，而非从 localStorage。

第十分册 · Release, Operations & Final Governance v1.4

G1 · 发布治理与最终验收

G1.1 Change Classification

类型

审批

回归

Clarification

直接修正

无

Bug Fix

恢复 Contract

相关测试

Implementation

行为不变

完整回归

Behavior

重新审核 Contract

完整 + Contract

Architecture

重新打开受影响 Phase

全系统

G1.2 Frozen Contract Rule

Frozen Contract Change 必须提交：
Why
Affected Phase
Affected Contract
Behavior Impact
Regression Impact
Migration Impact
Security Impact

G1.3 Operations State

Runtime Readiness:
  booting
  database_ready
  recovering
  ready
  locked

Operational Health:
  normal
  degraded
  recovery
  rescue

规则:
  两者正交

G1.4 Final Acceptance Scenario

Install
→ Launch
→ Configure
→ Create Inbox
→ Convert Task
→ Plan
→ Execute
→ Complete
→ Timeline
→ Daily Memory
→ Review
→ Backup
→ Validate Backup
→ Restore clean environment
→ Verify Restore
→ Restart
→ Verify Persistence
→ Keyboard Full Path
→ Screen Reader Basic Flow

G1.5 Governance Roles

ProductOwner:
  Product / UX

ArchitectureOwner:
  Architecture / Contract

SecurityOwner:
  安全边界决策
  veto_power:
    可单方面否决涉及 Security Boundary 的修改

ReleaseOwner:
  Release / Stable declaration
  restrictions:
    - 不得覆盖 SecurityOwner 的 Blocker
    - 不得绕过 Contract Gate
    - 不得绕过 Governance Gate

ConflictResolution:
  SecurityOwner Blocker vs ReleaseOwner:
    SecurityOwner 的 Blocker 优先。
    除非 ArchitectureOwner 和 ProductOwner 共同签署
    “该问题不涉及安全边界”，否则 Blocker 保持有效。

  ReleaseOwner 对 Stable 的否决:
    ReleaseOwner 可拒绝宣布 Stable，
    但必须给出明确的 Gate 失败项或未完成的验收项。

G1.6 Technical Debt Register

等级:
  Critical / High / Medium / Low

登记流程:
  任何发现的技术债务必须通过 Debt Register 登记。
  每次 Release Review 中重新确认其：
    - 等级
    - 当前影响
    - workaround
    - target version
    - status

字段:
  id
  description
  impact
  workaround
  introduced_version
  target_version?
  severity
  status

初始登记（v1.7 回写 Part B + 四项裁决，共 11 条；severity 已归一为 Critical / High / Medium / Low）:

Debt-DB-01:
  description: system_command_id 表未实现，commandId 幂等缺失
  severity: Critical
  target_version: v9.0.1
  status: done

Debt-DB-02:
  description: Mutation Lane 串行队列未实现
  severity: Critical
  target_version: v9.0.1
  status: done

Debt-DB-03:
  description: 备份快照未落盘 Tauri 文件系统
  severity: High
  target_version: v9.0.1
  status: done

Debt-DB-04:
  description: Journal 30 天裁剪与契约 indefinite 冲突
  severity: Critical
  target_version: v9.0.1
  status: done

Debt-QA-01:
  description: 故障注入 Hook（R1.7 的 8 个注入点）未实现
  impact: Q1.5 无法执行，Gate 3 的 Fault Injection / Recovery 项不可验证
  severity: High
  target_version: v9.0.2
  dependency: 存储引擎路线稳定（v1.7 落地后）
  status: done

Debt-DP-01:
  description: eventKey 缺失 semanticVersion 维度
  impact: 事件语义版本演进时幂等判定可能失效
  severity: High
  target_version: v9.0.1
  status: done

Debt-DO-01:
  description: Inbox Item 非独立实体，复用任务域
  impact: 破坏 Inbox→Task 转换语义，Conversion 幂等性无法保证
  severity: High
  target_version: v9.1.0
  change_type: Behavior Change
  status: done

Debt-DO-02:
  description: Place 实体从契约中移除（按实现改契约）
  impact: 无实际影响（当前无 Place 实现与数据）
  severity: Low
  target_version: v1.7（立即执行）
  change_type: Behavior Change
  status: approved_pending → 已执行（Place 已从 DO1.1/1.2/1.3 移除）

Debt-DO-03:
  description: Review 实现为域对象，应改为投影
  impact: 违反 Source of Truth 原则，用户可直接编辑分析结果
  severity: High
  target_version: v9.1.0
  change_type: Behavior Change
  status: partial — Architecture Decision Required（非 S0/S1 缺陷，不升级 Release Blocker）
  阻塞级别: Architecture Decision
  下一动作: Architecture Owner 裁决 reviewTemplates 归 Domain 还是 system_preferences
  裁决需明确: 数据生命周期 / 备份恢复边界 / 迁移策略
  约束: 不得直接迁移 reviewTemplates；未裁决前不得标 Closed

Debt-UI-01:
  description: Night 主题 accent 使用冷紫，违反 B5 红线
  impact: 与契约的"暖白 glow"定义冲突
  severity: Medium
  target_version: v9.0.1
  change_type: Bug Fix
  status: done

Debt-UI-02:
  description: Sidebar 248/64（契约 240/68）、Focus offset 2px（契约 1px）；Spacing 尺缺少 48/64，包含非契约值 12/20/40
  impact: 与契约数值偏差，视觉回归基线无法对齐
  severity: Medium
  target_version: v9.1.0
  status: partial — Visual Migration Pending（非 S0/S1 缺陷，不升级 Release Blocker）
  阻塞级别: Visual Migration
  下一动作: 建立历史 token → 语义尺映射表 → 按组件/页面迁移 → 视觉回归 → baseline 审批 → 删除旧 token
  注: 契约尺非旧 spacing token 的一一映射；历史 token 混合承担 section/component/control/text/card/responsive 间距

G1.7 Governance Principle

Frozen means controlled, not immutable forever.

全八阶段最终状态

┌──────────────────────────────────────────────────────┐
│                  V9 PERSONAL OS                      │
├──────────────────────────────────────────────────────┤
│ Phase 1  Component System                   Frozen ✅ │
│ Phase 2  Composite Pattern System           Frozen ✅ │
│ Phase 3  Page System                        Frozen ✅ │
│ Phase 4  Domain System                      Frozen ✅ │
│ Phase 5  Data & Projection System           Frozen ✅ │
│ Phase 6  Runtime & Application Architecture Frozen ✅ │
│ Phase 7  Quality / Security / Verification  Frozen ✅ │
│ Phase 8  Release / Governance               Frozen ✅ │
├──────────────────────────────────────────────────────┤
│ DESIGN: COMPLETE                                     │
│ ARCHITECTURE: FROZEN                                 │
│ CONTRACT: SELF-CONTAINED                             │
│ RELEASE MODEL: EXECUTABLE                            │
└──────────────────────────────────────────────────────┘

Final Design Contract

1. Base 定义几何与状态术语。
2. Surface 定义空间层级与边界。
3. Theme 定义表达，不改变组件心理模型。
4. Component 提供能力，不定义业务规则。
5. Composite Pattern 组合能力，不重新定义 Domain。
6. Page 定义呈现语境，不改变 Domain 身份。
7. Domain 是业务事实与对象生命周期的唯一语义来源。
8. Data / Projection 定义事实、事件与派生数据的边界。
9. Runtime 定义命令、事务、事件、恢复与并发行为。
10. Quality 定义机器可验证门禁。
11. Governance 定义冻结、变更、债务与发布权限。
12. 任何后续实现都不得通过“顺手优化”绕过本 Contract。

最终设计生命周期

DESIGN → BUILD → VERIFY → RELEASE → MAINTAIN

当前状态

DESIGN
  ↓
COMPLETE ✅

ARCHITECTURE
  ↓
FROZEN ✅

CONTRACT
  ↓
SELF-CONTAINED ✅

RELEASE MODEL
  ↓
EXECUTABLE ✅

NEXT ACTION
  ↓
Implementation Gap Audit（已完成）→ 契约回写 v1.7 完成 → 实现追赶（补齐 system_command_id / Mutation Lane / 备份落盘）

V9 Personal OS · 全八阶段合订文档 v1.7 · Final Freeze 全文完。
