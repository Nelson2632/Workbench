# V8 DESIGN MASTER IMPLEMENTATION SPEC v1.0

> 项目：个人工作台 V8  
> 文档性质：**视觉总纲 + 工程落地规范 + DESIGN → CODE Handoff**
> 适用对象：**主要交给 DESIGN Agent；完成后直接作为 CODE Agent 的视觉实现输入**
> 上游依据：`V8_GLOBAL.md` / `WORK_SPEC.md` / `DESIGN_SPEC.md` / `V8_MASTER_PLAN_v1.21.md` / `AUTONOMOUS_EXECUTION_PROTOCOL.md`
>
> **核心原则：V8 的四套主题不是“同一个 UI 换四套颜色”，而是同一套 Personal OS 在四种不同视觉空间中的表达。**
>
> A = 书房空间  
> C = Windows 原生桌面空间  
> D = 夜间专注空间  
> F = 数据观测空间

---

# 1. 文档定位与使用方法

本文件融合：

1. `V8_DESIGN_MASTER_BRIEF` 的视觉世界观、材质语言、空间层级、主题差异与验收标准。
2. 第二版多主题个人工作台方案的 Token、CSS、组件、ECharts、响应式、性能与兼容性方案。

因此本文件同时回答：

> DESIGN：最终应该“长成什么样”？

> CODE：应该“怎么把它稳定实现出来”？

职责仍然分开：

```text
DESIGN Agent
→ 视觉决策 / Layout / High Fidelity / Component Visual Specs / Design Handoff

CODE Agent
→ 生产代码 / Theme Infrastructure / Component / ECharts / Responsive / Accessibility / Performance
```

**DESIGN 不直接承担最终生产代码实现。**

---

# 2. 四主题总架构

## 2.1 共享层

四主题共用：

- 信息架构
- 组件语义
- 页面职责
- spacing
- typography
- Accessibility
- Responsive
- 交互语义
- Motion 基础规则

## 2.2 差异层

主题允许改变：

- Background
- Material
- Surface
- Depth
- Light
- Shape
- Border language
- Shadow language
- Motion tone
- Chart expression
- Decorative language
- Component presentation

因此：

> **共享语义组件 ≠ 共享视觉表现。**

---

# 3. 核心设计原则

## 3.1 Theme ≠ Color Palette

禁止：

```text
同一结构
+
换颜色
=
新主题
```

正确：

```text
Theme
=
Color
+
Material
+
Surface
+
Depth
+
Shape
+
Light
+
Background
+
Motion
+
Component Behavior
```

## 3.2 Container System > Card

V8 的容器体系：

```text
Section
List
Panel
Card
Data Block
```

Card 只是其中一种语义容器。

禁止：

> 所有内容都放进 Card。

## 3.3 第一视觉层始终是内容

主题装饰、纹理、发光、HUD 都不得抢过：

- 标题
- 核心数据
- 任务
- 闪卡内容
- 复盘结论

## 3.4 可实现性

禁止设计只为了截图效果而依赖：

- 不可控复杂 3D
- 持续高成本粒子
- 不可降级的模糊层
- 大量 Canvas 装饰
- 无意义视频背景

所有特殊视觉都必须有合理 Web / Tauri 实现路径。

---

# 4. Design Tokens

## 4.1 V8 冻结 Token 命名

统一使用：

```text
--color-bg
--color-surface
--color-surface-2

--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-inverse

--color-border
--color-border-light
--color-border-focus

--color-accent
--color-accent-hover
--color-accent-light
--color-accent-text

--color-success
--color-warning
--color-danger

--shadow-sm
--shadow-md
--shadow-lg

--radius-sm
--radius-md
--radius-lg
--radius-xl
--radius-full

--space-1 … --space-8

--font-family
--font-size-xs
--font-size-sm
--font-size-md
--font-size-lg
--font-size-xl
--font-size-2xl

--font-weight-regular
--font-weight-medium
--font-weight-semibold
--font-weight-bold

--transition-fast
--transition-normal
--transition-slow
```

不得重新引入 `--bg-page` / `--bg-card` / `--text-primary` 等第二套公共 Token 命名。

---

# 5. Global Theme 与 F Scope

## 5.1 Global Theme

仅允许：

```text
mist
fluent
night
```

## 5.2 F 数据驾驶舱

F 不是第四个用户可选 Global Theme。

使用：

```text
review-data
```

作为页面级视觉作用域。

```text
Global Theme
├── mist
├── fluent
└── night

Page Visual Scope
└── review-data
```

## 5.3 用户体验

普通页面：

> 使用当前 Global Theme。

周 / 月 / 考试复盘：

> 按需进入 `review-data` scope。

F Scope 不改变 IA，不改变功能，只改变视觉表达。

---

# 6. A「晨雾书房」

## 6.1 视觉命题

> **晨光落在书桌上的第一小时。**

关键词：

```text
纸张 / 晨光 / 书页 / 木质 / 雾气 / 留白 / 温润 / 安静
```

不是奶油风，不是卡通手账，也不是普通米白 SaaS。

## 6.2 推荐 Token 方向

```css
[data-theme="mist"] {
  --color-bg: #f7f3ee;
  --color-surface: rgba(255, 255, 255, 0.78);
  --color-surface-2: rgba(250, 247, 242, 0.92);

  --color-text-primary: #2d2a26;
  --color-text-secondary: #6b6863;
  --color-text-tertiary: #9a9791;

  --color-accent: #c9b89a;
  --color-accent-hover: #b8a687;
  --color-accent-light: #e6d7c0;

  --color-border: rgba(70, 60, 50, 0.08);
  --color-border-light: rgba(70, 60, 50, 0.045);

  --shadow-sm: 0 2px 8px rgba(65, 50, 35, 0.025);
  --shadow-md: 0 8px 24px rgba(65, 50, 35, 0.045);
  --shadow-lg: 0 14px 40px rgba(65, 50, 35, 0.06);
}
```

以上为实现起始值，最终以 DESIGN 验证为准。

## 6.3 Material

### 纸张
- 微暖白
- 极轻纸纹
- 不明显颗粒
- 不做老旧纸张

### 木质
仅用于局部环境暗示，不做写实桌面。

### 雾
- 极淡灰蓝
- 柔和渐变
- 低存在感

## 6.4 Background

建议：

```text
暖白
+
极淡灰蓝
+
局部晨光
+
轻纸张 / 雾层
```

可使用轻量 SVG noise，但正常阅读距离几乎不应感知颗粒。

## 6.5 Surface

A 更接近：

> 纸页 / 书桌平面

因此：

- Section：留白分区
- List：行式纸页
- Panel：极淡材质
- Card：重点内容
- Data Block：极简

## 6.6 Shape

- 柔和圆角
- 8 / 12 / 16 为主要层级
- 不全部胶囊
- 少硬边框

## 6.7 Light

模拟窗边晨光：

- 漫射
- 柔和
- 不刺眼

禁止 neon、强发光、科技扫描。

## 6.8 失败判定

如果只是：

> 白色 → 米色

则失败。

---

# 7. C「Windows Fluent」

## 7.1 视觉命题

> **一个属于桌面的浮空窗口系统。**

关键词：

```text
Mica / Acrylic / Transparency / Blur / Floating / Depth / Desktop Native
```

## 7.2 推荐 Token 方向

```css
[data-theme="fluent"] {
  --color-bg: #eef4ff;
  --color-surface: rgba(255, 255, 255, 0.58);
  --color-surface-2: rgba(255, 255, 255, 0.72);

  --color-text-primary: #1a2035;
  --color-text-secondary: #5b6580;
  --color-text-tertiary: #8b95b0;

  --color-accent: #5b8def;
  --color-accent-hover: #3a6fd6;
  --color-accent-light: #8ab4ff;

  --color-border: rgba(255, 255, 255, 0.46);
  --color-border-light: rgba(255, 255, 255, 0.26);

  --shadow-sm: 0 2px 6px rgba(30, 60, 120, 0.06);
  --shadow-md: 0 8px 20px rgba(30, 60, 120, 0.09);
  --shadow-lg: 0 18px 44px rgba(30, 60, 120, 0.12);
}
```

## 7.3 Material

必须体现：

### Mica-like environment
背景环境色影响 Surface。

### Acrylic-like layer

```css
backdrop-filter: blur(18px);
-webkit-backdrop-filter: blur(18px);
```

必须同时结合：

- alpha
- border
- shadow
- environment background

不能只加 blur。

## 7.4 半透明必须真实存在

至少有：

- navigation surface
- main surface
- floating panel
- popover / dialog
- quick memo

必须让用户感知背景穿透。

## 7.5 Floating Hierarchy

```text
Desktop Environment
↓
Navigation Layer
↓
Main Surface
↓
Floating Panel
↓
Popover / Dialog
```

## 7.6 Shape

- 柔和大圆角
- 大层级与小控件形成明显尺度差
- 不全部使用同一个 radius

## 7.7 Depth

组合：

```text
Transparency
+
Blur
+
Border
+
Soft Shadow
+
Layering
```

而不是单一 drop-shadow。

## 7.8 Motion

体现窗口打开 / 关闭 / 浮起：

- opacity
- blur
- translateY
- tiny scale

---

# 8. D「深色夜航」

## 8.1 视觉命题

> **夜晚仍愿意连续使用几小时的空间。**

关键词：

```text
Night / Depth / Quiet / Focus / Low Stimulus / Reading
```

## 8.2 推荐 Token

```css
[data-theme="night"] {
  --color-bg: #0f121a;
  --color-surface: rgba(30, 34, 48, 0.74);
  --color-surface-2: rgba(40, 45, 65, 0.84);

  --color-text-primary: #e8ebf2;
  --color-text-secondary: #a0a7bd;
  --color-text-tertiary: #6b7390;

  --color-accent: #7c6eff;
  --color-accent-hover: #988cff;
  --color-accent-light: #a79cff;

  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-light: rgba(255, 255, 255, 0.045);

  --shadow-sm: 0 3px 10px rgba(0, 0, 0, 0.22);
  --shadow-md: 0 8px 22px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 18px 42px rgba(0, 0, 0, 0.34);
}
```

## 8.3 Material

不要纯黑。

Background / Surface / Raised Surface 必须存在清晰但低刺激的层级差。

## 8.4 Light

仅用于：

- focus
- active
- important data
- flashcard state

## 8.5 失败判定

深色 + 霓虹紫 + Cyberpunk = 失败。

---

# 9. F「数据驾驶舱 / Review Data」

## 9.1 视觉命题

> **不是深色 Dashboard，而是一个只在复盘时打开的数据观测舱。**

关键词：

```text
Data Space
Holographic
Transparency
Depth
Light Screen
Decision
Light Sci-Fi
```

## 9.2 推荐 Token 方向

```css
.review-data {
  --color-bg: #050a15;
  --color-surface: rgba(10, 20, 40, 0.46);
  --color-surface-2: rgba(15, 30, 60, 0.58);

  --color-text-primary: #e6f4ff;
  --color-text-secondary: #7eb8ff;
  --color-text-tertiary: #3a6fb0;

  --color-accent: #00d4ff;
  --color-accent-hover: #40e0ff;
  --color-accent-light: #7b61ff;

  --color-border: rgba(0, 212, 255, 0.24);
  --color-border-light: rgba(0, 212, 255, 0.11);

  --shadow-sm: 0 0 12px rgba(0, 212, 255, 0.08);
  --shadow-md: 0 0 20px rgba(0, 212, 255, 0.12);
  --shadow-lg: 0 0 34px rgba(0, 212, 255, 0.16);
}
```

## 9.3 F 五层空间结构

```text
Environment Layer
↓
Spatial Layer
↓
Holographic Surface
↓
Information Layer
↓
Interaction Layer
```

### Environment
- 深蓝黑
- 蓝 / 紫环境光
- 极淡 grid
- 少量微粒

### Spatial
形成：

```text
Background
↓
Large Panel
↓
Secondary Panel
↓
Data Point / HUD
```

不同深度。

### Holographic Surface

必须同时具备：

```text
Transparency
+
Blur
+
Glow Edge
+
Depth
+
Inner Light
```

目标：

> 像悬浮在空间中的透明光幕。

## 9.4 F 禁止普通 Card 堆叠

优先：

```text
Hero Data Block
+
Large Holographic Panel
+
Floating Data Panel
+
Detail Layer
```

## 9.5 图表表达

### Line
- luminous line
- glowing node
- subtle area fill

### Bar
- semi-transparent
- gradient
- soft glow

### Ring
- luminous ring
- center metric

### Radar
- transparent polygon
- luminous vertices

### Heatmap
- controlled intensity
- minimal legend
- grid structure

禁止直接把普通 ECharts 图表换成蓝色。

## 9.6 HUD

可少量：

- LIVE
- SYNCED
- DATA STREAM
- UPDATED
- 更新时间
- 小型状态点
- 微型坐标线
- 数据编号

HUD 只能辅助信息。

## 9.7 三种 Review Data 页面

### 周复盘
趋势 + 执行状态

### 月复盘
长周期趋势 + 学习结构 + 热力

### 考试复盘
结果 + 学科对比 + 能力诊断 + 下一步

禁止同一 Dashboard 只改标题。

## 9.8 F Motion

允许：

- Data Pulse
- Slow Scan
- Hover Float 2px

禁止：

- 大幅旋转
- 全屏闪烁
- 高速粒子
- 游戏化 HUD

---

# 10. 四主题 Component Behavior Matrix

| Component | A Mist | C Fluent | D Night | F Review Data |
|---|---|---|---|---|
| Background | 纸张 / 晨雾 | Mica 环境 | 深夜空间 | 数据空间 |
| Section | 大留白 | 轻分层 | 深色分区 | 大面积透明空间 |
| List | 纸页行 | 浮空行 | 深色行 | HUD-like data row |
| Panel | 轻材质 | Acrylic | Raised Dark | Holographic |
| Card | 纸页叠放 | 浮空玻璃 | 深色浮层 | 光幕面板 |
| Data Block | 极简 | 明确数据 | 柔和数字 | Hero Metric |
| Border | 极淡 | 微透明 | 微弱对比 | 发光边缘 |
| Shadow | 柔和扩散 | Depth | 低刺激 | Glow + Depth |
| Radius | 柔和 | 大圆角 | 克制 | 几何 + 柔和 |
| Hover | 纸页反馈 | 浮起 | 微亮 | 光晕 + 浮起 |
| Motion | 极轻 | Window-like | Slow | Pulse / Scan |

---

# 11. 工程实现规范

## 11.1 Theme Controller

建议：

```html
<html data-theme="mist">
```

Review 页面：

```html
<section data-visual-scope="review-data">
```

或者等价的 React / Vue Context / class 方案。

逻辑只负责：

1. 用户主题偏好；
2. Global Theme；
3. `review-data` scope；
4. 图表主题刷新；
5. 持久化。

不得批量修改每个元素的颜色。

## 11.2 Transition

禁止：

```css
* {
  transition: all ...
}
```

应按组件 / 状态声明动画。

---

# 12. ECharts

## 12.1 Chart Tokens

每个场景定义：

```text
--chart-1
--chart-2
--chart-3
--chart-axis
--chart-text
--chart-grid
--chart-glow
```

CODE 从 CSS Variables 读取。

## 12.2 主题切换

```text
theme-change
↓
chart registry
↓
setOption()
```

除非确有需要，不要销毁重建全部图表。

## 12.3 Review Data

优先：

- Trend
- Area
- Bar
- Ring
- Radar
- Heatmap

视觉统一为：

> 数据空间中的光幕信息。

---

# 13. 组件实现边界

所有主题共享语义：

```text
Card
Panel
Button
List
DataBlock
Modal
Input
Tabs
ChartFrame
```

主题可改变：

- material
- opacity
- blur
- shadow
- border
- glow
- motion tone
- layer depth

F 可拥有主题专属视觉变体：

```text
DataPanel
HolographicFrame
HeroMetric
ChartFrame
InsightLayer
```

仍必须属于统一 Design System。

---

# 14. Responsive

## Desktop
完整体验：

- 侧栏
- 多列布局
- 完整 Chart
- F 空间层级完整呈现

## Tablet

- 侧栏折叠
- 减少并列 Panel
- Chart 降密度
- F 减少远景装饰

## Mobile

至少保证：

- 今日
- 快速备忘
- 任务勾选
- 核心查看

F Mobile：

> Hero Metric + 核心 Trend 优先，不追求完整驾驶舱。

---

# 15. Accessibility

必须：

- 普通文字 ≥ 4.5:1
- 大文字 ≥ 3:1
- 全键盘
- visible focus
- semantic
- reduced motion
- 不依赖颜色唯一传义

C：

> 半透明 Surface 上的文字必须实测对比度。

F：

> 图表必须具备标签、图例、数值。

---

# 16. Motion

统一核心：

1. 页面进入
2. 闪卡翻转
3. 任务完成
4. 数据更新

主题：

```text
A → 极轻
C → Window-like
D → Slow / Quiet
F → Data Pulse / Scan
```

`prefers-reduced-motion: reduce` 时：

> 动效接近 0。

---

# 17. 性能与降级

## Backdrop Filter

仅用于：

- 主 Surface
- Floating Panel
- 关键 Dialog

长列表不逐行使用。

不支持时：

```text
透明 Surface
↓
提高背景不透明度
↓
关闭 blur
```

## Noise / Grid

优先：

- CSS gradients
- 小型 SVG

## Motion

优先：

- transform
- opacity

## F Glow

仅服务：

- Hero
- Data Point
- Hover
- 状态

---

# 18. Browser

仅在需要时研究：

- Windows Fluent
- WCAG
- 浏览器 backdrop-filter
- ECharts 当前能力
- 特殊视觉技术可行性

优先官方资料。

Browser 结果若影响冻结决策：

> `NEED_CONFIRM`

---

# 19. Design Handoff 标准

DESIGN → CODE 一次性提供：

```text
Design Tokens
Theme Specs
Component Specs
Page Wireframes
High Fidelity
Interaction States
Responsive Rules
Accessibility Notes
Motion Rules
Assets
ECharts Visual Rules
Implementation Notes
```

必须回答：

> 页面层级是什么？

> 哪些是 Section / List / Panel / Card / Data Block？

> 主题改变了哪些视觉属性？

> 哪些状态存在？

> CODE 如何实现？

---

# 20. DESIGN / CODE 职责

## DESIGN Agent

负责：

- 视觉世界观
- Material
- Layout
- High Fidelity
- Component Visual Variants
- Interaction States
- Design Handoff

不负责：

- DB
- Domain
- Event Bus
- migration
- 最终生产代码

## CODE Agent

负责：

- CSS / React / Tauri
- Theme Infrastructure
- Components
- ECharts
- Responsive
- Accessibility
- Performance
- Build / Test

不得重新定义：

- 产品语义
- IA
- Review 粒度
- 四主题视觉世界观

---

# 21. 失败模式

以下任意出现均判定设计未完成：

### A
白色 SaaS → 米色 SaaS。

### C
白色 Card + Blur。

### D
黑底 + 紫蓝霓虹。

### F
黑底 + 蓝 Card + 普通 ECharts。

### 全局
所有内容都使用 Card。

### 全局
通过颜色变化制造主题差异。

### 全局
科幻感来自 HUD 堆砌，而非空间关系。

---

# 22. 推荐实施顺序

## DESIGN

```text
Phase 1
↓
Design Tokens
↓
Theme Material System
↓
Container System
↓
State System
↓
A / C / D / F Visual Language
        ↓
Phase 2
↓
今日
学习总览
闪卡
周复盘
月复盘
考试复盘
↓
High Fidelity
↓
Design Handoff
```

## CODE

收到 Design Handoff 后：

```text
Theme Infrastructure
↓
Token
↓
Container Components
↓
Theme Variants
↓
Page Implementation
↓
ECharts
↓
Responsive
↓
Accessibility
↓
Performance
```

---

# 23. 最终设计验收

## Identity
A/C/D/F 明显不同。

## Harmony
四主题仍属于同一个 V8。

## No Color-Swap
去掉主色后仍可辨认主题。

## Material
每套主题都有独立材质。

## Depth
A/C/F 至少形成明显空间层级。

## Components
共享语义组件，但主题表现不同。

## C Fluent
必须有：

```text
半透明
+
Blur
+
Mica / Acrylic 气质
+
Floating Layer
```

## A Mist
必须有：

```text
纸页
+
晨光
+
雾
+
柔和材质
```

## D Night
必须有：

```text
深色
+
低刺激
+
清晰层级
```

## F Review Data
必须有：

```text
空间背景
+
透明光幕
+
数据层级
+
轻 HUD
+
数据光效
```

## Accessibility
通过最低要求。

## Responsive
通过三档体验。

## Implementation
CODE 无需猜测。

---

# 24. 最终视觉问题

### A
> 这是一个真正安静的个人书桌吗？

### C
> 这是一个属于 Windows 桌面的浮空应用吗？

### D
> 我愿意晚上连续使用它吗？

### F
> 我真的进入了一个数据观测舱，而不是普通 Dashboard 吗？

四个答案均为“是”：

> **Design Master Implementation Spec 达标。**

---

# 25. 一句话冻结

> **V8 的主题系统不是四套皮肤，而是同一套 Personal OS 在四种不同空间中的视觉表达；工程实现必须保留这种空间差异，而不是把差异压缩成几组 CSS 颜色变量。**
