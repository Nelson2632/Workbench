# 个人工作台 V8 — MASTER PLAN

> 版本：1.1  
> 文档性质：项目级实施总计划  
> 阶段：PLAN  
> 修订依据：V8_MASTER_PLAN v1.0 + WORK / DESIGN / CODE 三方 Master Plan Review  
>
> 上游依据：
> - `V8_GLOBAL.md`
> - `WORK_SPEC.md`
> - `DESIGN_SPEC.md`
> - `CODE_SPEC.md`
>
> 本版不是重新制定需求，而是针对三方会审发现的**覆盖缺口、执行顺序冲突、设计与工程时序问题、测试过晚、迁移风险和 P0/P1/P2 映射不清**进行修订。

---

# 0. v1.1 修订结论

v1.0 的总体方向正确，但不能直接进入 Browser / Execute。三方审阅确认：

1. 产品语义没有被 Master Plan 偷改，Personal OS 核心闭环保持成立。
2. W-05 / W-06 / W-15 / W-25 / W-26 在 v1.0 中没有明确施工落点。
3. W-22 / W-24 / W-27 / W-29 只有隐式或部分覆盖，需要显式验收。
4. DESIGN 的 High Fidelity / Design Spec 交付放在所有页面 CODE 实现之后，存在明显返工风险。
5. Vitest 被放到很晚的独立 Phase，但 Domain / Migration / Scheduler 应在实现时同步测试。
6. C-14 OPFS 在优先级地图中出现，却没有明确实施 Phase。
7. Dexie Version 2 将 C-11 / C-12 / C-13 合并迁移在技术上合理，但 P0/P1 标签不能再被理解为 DB version 边界。
8. `data` 既被写成 global `data-theme`，又被定义为“页面级数据驾驶舱”，存在跨 SPEC 表述冲突。v1.1 明确：**F 是页面级视觉作用域，不是用户可切换的第四个全局主题**；实施前建立一个小型 Spec Erratum，统一 CODE / DESIGN 表述。
9. DESIGN_SPEC 已经裁决 `--color-*` Token 命名和“品牌 Accent + Theme Accent”双层体系，v1.1 将它们正式纳入 Design Foundation。
10. 自动主题的默认规则按 DESIGN_SPEC 注记采用：06:00 → 晨雾书房，18:00 → 深色夜航；允许手动覆盖。
11. 高保真、关键页面 Design Spec、响应式与可访问性不再集中到最后，改为**页面实施前交付 + 实现后 QA**。
12. Phase 不再等同于 P0/P1/P2。P 等级表示优先级；Phase 表示施工阶段；Dexie version 表示数据契约迁移边界。

---

# 1. 总体目标

将当前 Personal OS V8 从“各模块能够运行的桌面工具集合”升级为：

> **以「计划 → 执行 → 记录 → 数据 → 复盘 → 调整 → 下一轮计划」为核心闭环的本地优先、桌面优先个人操作系统。**

最终必须能够真实跑通：

```text
快捷记录 / 收件箱
        ↓
任务 / 计划
        ↓
今日执行
        ↓
学习 / 番茄 / 错题 / 闪卡 / 阅读
        ↓
数据沉淀
        ↓
复盘
        ↓
下一步
        ↓
回流任务 / 计划
```

---

# 2. 核心实施原则

## 2.1 SPEC 是合同

- WORK_SPEC 定义产品语义。
- DESIGN_SPEC 定义设计与交互表现。
- CODE_SPEC 定义工程实现。
- Master Plan 不得重新定义产品，只负责组织实施。

## 2.2 P 与 Phase 分离

```text
P0/P1/P2
= 优先级

Phase 0/1/2...
= 施工阶段

Dexie v1/v2/v3...
= 数据契约版本
```

三者不得混为一谈。

## 2.3 测试跟随实现

不是：

```text
写完整软件
↓
最后补测试
```

而是：

```text
Domain → test
Migration → test
Scheduler → test
Event → test
Page flow → E2E
```

最终 Test Phase 负责全量收口，而不是首次建立测试。

## 2.4 设计先于页面工程化

关键页面必须：

```text
IA / Wireframe
↓
High Fidelity
↓
Design Spec handoff
↓
CODE implementation
```

禁止：

```text
Wireframe
↓
CODE 先做
↓
最后才 High Fidelity
```

## 2.5 Browser 按需触发

Browser 不是固定流水线。

只有以下情况才触发：

- 外部事实
- 平台规范
- 当前版本 API
- 安全 / 兼容性
- 新技术
- 明确需要竞品研究

---

# 3. 固定产品语义

## 3.1 顶层信息架构

```text
今日
计划
学习
记录
复盘
工具
密码本
设置
```

## 3.2 页面树

```text
个人工作台 V8
├── 今日
├── 计划
│   ├── 收件箱
│   ├── 今日
│   ├── 未来
│   ├── 周期
│   └── 项目
├── 学习
│   ├── 总览
│   ├── 知识体系
│   ├── 错题
│   ├── 闪卡
│   ├── 成绩
│   └── 阅读
├── 记录
│   ├── 备忘录
│   └── 笔记
├── 复盘
│   ├── 今日
│   ├── 学科
│   ├── 周
│   ├── 月
│   ├── 考试
│   └── 模板
├── 工具
│   ├── 番茄钟
│   ├── 随机
│   ├── 记账
│   └── 倒数日
├── 密码本
└── 设置
```

## 3.3 模块职责

| 对象 | 唯一职责 |
|---|---|
| Memo | 现在想到、以后再整理 |
| Note | 长期知识沉淀 |
| Task | 要完成的行动 |
| RecurringTask | 重复任务生成规则 |
| Project | 共同目标下的任务和里程碑 |
| Knowledge | 需要掌握的知识节点 |
| Mistake | 已发生错误及其原因 |
| Flashcard | 主动回忆载体 |
| Review | 理解表现并形成下一步 |

---

# 4. 视觉与主题冻结

## A：晨雾书房

- 白天默认
- 今日 / 计划 / 学习 / 记录 / 普通页面
- 米白背景
- 灰蓝主色方向
- 淡紫灰 / 沙色辅助方向
- 低饱和
- 长时间耐看

A/C 的最终 Hex 在 Design Phase 通过 BROWSER / DESIGN 冻结，不在 Master Plan 中擅自指定。

## C：Windows Fluent

- 用户手动切换
- 只改变视觉表现
- 不改变 IA
- 强调桌面原生层次

Fluent 细节依据 DESIGN_SPEC 的 P1 顺序实施。

## D：深色夜航

- 夜间默认
- 夜间学习 / 阅读 / 闪卡 / 专注 / 复盘
- 非纯黑
- 非赛博朋克
- 低刺激

## F：数据驾驶舱

**页面级视觉作用域，不是用户可切换的第四个全局主题。**

仅用于：

- 周复盘
- 月复盘
- 考试复盘

### 实施澄清

为消除 CODE_SPEC 中 `data-theme=...data` 与“F 是页面级特例”的冲突：

```text
Global Theme
├── mist
├── fluent
└── night

Page Visual Scope
└── review-data
```

执行前建立一个最小 Spec Erratum，同步修正 DESIGN_SPEC / CODE_SPEC 的表述，不改变任何产品语义。

---

# 5. Design Foundation

## Phase 1 的目标

建立“所有后续页面都能消费”的视觉底座，而不是直接把所有页面做完。

### DESIGN 必须产出

- Token
- 容器语义
- A/C/D 基础视觉
- F 数据视觉规范
- Brand Accent + Theme Accent 双层体系
- 关键状态
- 空状态 / 错误状态
- 键盘交互规则
- 设计组件规格

### Token 冻结

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
--radius-full

--space-1 ... --space-8

--font-*
--transition-*
```

### Accent

采用：

```text
Brand Accent
+
Theme Accent
```

方向：

```text
Mist → 雾蓝
Fluent → Windows 蓝
Night → 冷青蓝
Review Data → 数据蓝
```

具体色值由 DESIGN 冻结。

---

# 6. 关键页面 Design Handoff 前置规则

这是 v1.1 最重要的结构调整。

## 页面实施顺序

每个关键页面必须经过：

```text
产品语义
↓
页面 IA
↓
Wireframe
↓
High Fidelity
↓
Design Handoff
↓
CODE
↓
UI QA
```

### 关键页面

第一批：

- 今日
- 学习总览
- 闪卡
- 周/月/考试复盘

第二批：

- 计划
- 知识体系
- 错题
- 备忘录
- 笔记

第三批：

- 成绩
- 阅读
- 工具
- 设置
- 密码本

这样 CODE 不会在 High Fidelity 之前实现最终页面。

---

# 7. Phase 0 — 基线、备份与覆盖矩阵

## 目标

建立安全基线，并把 29 个 WORK、17 个 DESIGN、25 个 CODE 任务全部映射到施工阶段。

### CODE

- 建立当前可回退快照。
- 记录 build 基线。
- 导出数据库。
- 验证 V5 → V8 migration。
- 核对当前源码 18 张表。
- 记录当前路由、快捷键、Tauri 能力。

### WORK

建立：

```text
W-01~W-29
→ 产品要求
→ Phase
→ I-Task
→ 验收标准
```

### DESIGN

建立：

```text
D-01~D-17
→ Phase
→ Design Deliverable
→ CODE handoff
→ QA
```

### CODE

建立：

```text
C-01~C-25
→ Phase
→ Implementation Task
→ Test
→ Acceptance
```

### Gate 0

- [ ] 三份 SPEC 版本锁定
- [ ] 三份 Coverage Matrix 完成
- [ ] 当前版本可构建
- [ ] 数据库备份可读
- [ ] V5 → V8 migration 有可验证样本

---

# 8. Phase 1 — Design System + 主题工程基础

## 目标

先建立统一视觉语言和主题基础。

### DESIGN

P0 核心：

- 四场景方向冻结
- Token
- 容器语义
- Card 系统
- F 数据视觉

P1 预备：

- Fluent 视觉细化方向
- 闪卡背景规范

### CODE

- 统一 `data-theme` 的全局三主题。
- F 采用页面级 `review-data` scope。
- 兼容旧 `dark → night`。
- 建立 token 变量。
- 统一旧 CSS variable 命名迁移。
- 页面不直接定义核心主题变量。

### 自动主题

```text
06:00 → Mist
18:00 → Night
```

支持：

- 自动
- Mist
- Fluent
- Night

用户可以手动覆盖。

### Gate 1

- [ ] 全局主题切换可用
- [ ] F 不出现在普通主题选择器
- [ ] Token 命名统一
- [ ] Accent 双层体系可实现
- [ ] 原页面功能不受影响

---

# 9. Phase 2 — 关键页面高保真与 Design Handoff

## 目标

在 CODE 实现关键页面前，把最终视觉语言交付出去。

### DESIGN P0 / P1

先完成：

1. 今日
2. 学习总览
3. 闪卡
4. 周/月/考试复盘

每页提供：

- Wireframe
- High Fidelity
- 关键交互状态
- Empty / Error / Loading
- Desktop
- 必要的 Tablet / Mobile 规则
- Accessibility notes
- Code handoff

### 特别要求

#### 今日

只回答：

> 今天做什么、今天已经做了什么。

#### 闪卡

- 卡片即核心
- 背景有氛围
- 文字是第一视觉层
- ≥ 5 背景方向
- 评价按钮可键盘访问

#### 复盘

- F 仅周/月/考试
- Data Block + Chart
- 图表不能只靠颜色传递信息
- 每页末尾必须有“下一步”

### Gate 2

- [ ] 四个关键页面 High Fidelity 已确认
- [ ] Design Spec handoff 已交给 CODE
- [ ] CODE 不得先行实现与已交付页面冲突的版本

---

# 10. Phase 3 — 工程分层 + 测试基础

## CODE P0

### 架构

```text
Page
 ↓
Store
 ↓
Domain
 ↓
DB
```

建立：

```text
src/app/
src/stores/
src/domain/
src/db/
src/hooks/
src/types/
src/styles/
src/utils/
src/desktop/
src/tests/
```

统一：

```text
store/
→ stores/
```

### Domain

```text
planning/
study/
review/
flashcard/
events/
```

### Event Bus

建立机制，但此 Phase 不要求全量业务接入。

### Test Foundation

Vitest 在本阶段正式引入。

不是等到最后。

第一批测试：

- recurringGenerator
- taskScheduler
- flashcardScheduler
- reviewAggregator

### Gate 3

- [ ] `stores/` 唯一
- [ ] Domain 可独立运行
- [ ] Event Bus API 可用
- [ ] Vitest 可执行
- [ ] 已建立的 Domain 同阶段拥有测试
- [ ] build 通过

---

# 11. Phase 4 — Dexie Version 2 Migration

## 目标

一次完成当前确定的数据契约升级，但在**同一个 Version 2 内进行分步骤、可核验的内部迁移**。

### 版本

```text
v1
↓
v2
```

新增：

```text
knowledgeRelations
reviewEntries
studySessions
appEvents
```

补：

```text
tasks.createdAt
mistakes.createdAt
```

### Review

```text
ReviewTemplate
ReviewEntry
```

### Flashcard

```text
Flashcard
FlashcardReview
FlashcardSchedule
```

### 内部迁移步骤

```text
Snapshot
↓
Create schema
↓
Migrate Review
↓
Verify Review
↓
Migrate Flashcard
↓
Verify Flashcard
↓
Write remaining migration data
↓
Final verification
```

不能因为“同一个 version”而把整个 upgrade callback 写成无法定位问题的大块逻辑。

### 失败条件

出现以下任一情况：

- 记录数异常
- 核心字段丢失
- 关键关联异常
- migration exception

立即视为失败：

```text
停止后续写入
+
保留原快照
+
报告失败点
+
提供恢复路径
```

### Migration Test

**必须在 Phase 4 同步完成。**

测试：

- 正常旧数据
- 缺字段
- 空表
- 重复迁移
- review mapping
- flashcard mapping
- 失败恢复

### Gate 4

- [ ] v1 → v2 无损
- [ ] 22 张表结构正确
- [ ] Review / Flashcard 语义转换通过
- [ ] migration tests 通过
- [ ] V5 → V8 仍可用
- [ ] vault 未被触碰

---

# 12. Phase 5 — 今日 / 计划 / 导航

## WORK

落地：

- W-03 今日驾驶舱
- W-04 首页降噪
- W-05 侧边栏
- W-06 导航心理成本
- W-07 任务重新划分
- W-08 周期规则
- W-09 周期规则升级

## DESIGN

交付：

- 侧栏
- 模块 / 页面两级层级
- 今日高保真
- 计划页面高保真
- 收件箱 / 未来 / 周期 / 项目状态

## CODE

实现：

- Today / Inbox / Future / Recurring / Project
- `getTodayTasks`
- `getInboxTasks`
- `getFutureTasks`
- 规则 → Task Instance
- 任务完成
- 项目进度

### 周期规则覆盖

- 每天
- 每周
- 每月
- 自定义 N 天
- 起始日期
- 终止日期
- 暂停
- 恢复
- 跳过一次
- 本次不执行

### W-27 / W-29 快捷入口

统一规划：

```text
Ctrl + K
Ctrl + Shift + Space
Ctrl + Shift + T
Ctrl + Shift + R
```

闪卡快捷键在 Phase 6 加入。

### Gate 5

```text
快速备忘
→ Task
→ Today
→ 完成
→ 状态更新
```

可真实运行。

---

# 13. Phase 6 — 学习系统

## WORK

明确：

- W-12 学习闭环
- W-13 知识点中心
- W-14 闪卡内容模型
- W-15 CSV / 粘贴导入
- W-16 智能抽背
- W-17 闪卡视觉

## DESIGN

交付：

- 学习总览
- 知识点中心
- 错题
- 闪卡
- 闪卡导入
- ≥5 背景
- 四档评价状态

## CODE

Domain：

```text
studyMetrics
knowledgeGraph
flashcardScheduler
```

实现：

```text
知识点
↕
错题
↕
闪卡
↕
笔记 / 阅读
```

### 闪卡导入

支持：

- CSV
- 粘贴导入

自动匹配 / 创建：

- 学科
- 章节
- 知识点

批量错误：

```text
成功 N
失败 M
原因
局部重试
```

### Scheduler

```text
不会 → 1 天
模糊 → 3 天
会了 → 7 天
熟练 → 14 天
```

本版不加入 FSRS。

### Test

Domain 实现后立即测试：

- scheduler
- knowledge graph
- import mapping

### Gate 6

```text
知识点
→ 错题
→ 闪卡
→ 评价
→ 下一次复习
→ 掌握度
```

可真实运行。

---

# 14. Phase 7 — 记录系统

## WORK

- W-10 Memo 输入接口
- W-11 Memo 自动整理

## DESIGN

- 备忘录 Inbox
- 空状态
- 转换动作
- 笔记组织

## CODE

实现：

```text
Memo
→ Task
Memo
→ Note
Memo
→ Mistake
```

快捷：

```text
Ctrl + Shift + Space
```

保存：

```text
Ctrl + Enter
```

### Gate 7

快速备忘必须：

```text
唤起
→ 输入
→ 保存
→ 自动隐藏
→ 主窗口同步
```

---

# 15. Phase 8 — 复盘系统

## WORK

落地：

- W-18 复盘重构
- W-19 今日复盘
- W-20 学科复盘
- W-21 周/月数据驾驶舱
- W-22 复盘可视化
- W-23 “下一步”出口

## DESIGN

### 今日 / 学科

使用：

> Mist / Night

### 周 / 月 / 考试

使用：

> Review Data Scope

图表至少满足：

- 趋势
- 学科分布
- 错题类型
- 完成率
- 闪卡量
- 必要的月度热力信息

图表不得只靠颜色表达。

## CODE

Review Aggregator 汇总：

```text
Task
Pomodoro
Mistake
Flashcard
Exam
Reading
```

输出：

```text
DailyMetrics
SubjectMetrics
WeeklyMetrics
MonthlyMetrics
ExamMetrics
```

### 每种复盘最后必须有：

```text
下一步
```

并支持：

> 创建任务 / 指定日期 / 回到计划

### Test

Aggregator 实现后立即测试。

覆盖：

- 空数据
- 单日
- 学科
- 周
- 月
- 考试
- 时间边界

### Gate 8

必须跑通：

```text
执行数据
↓
复盘
↓
下一步
↓
任务 / 计划
```

---

# 16. Phase 9 — Event Bus 全量联动

## CODE

统一：

```text
task.created
task.completed
pomodoro.completed
flashcard.reviewed
mistake.created
exam.created
review.completed
recurring.generated
```

### 联动

`task.completed`

→ 今日完成率  
→ 项目进度  
→ Review 数据源

`pomodoro.completed`

→ 学习时长  
→ 今日状态  
→ Review 数据源

`flashcard.reviewed`

→ Schedule  
→ 掌握度  
→ 学习统计  
→ Review 数据源

`mistake.created`

→ 知识点薄弱度  
→ 学科统计  
→ Review 数据源

### 迁移策略

保留旧手动刷新路径作为短期兜底。

逐事件替换。

稳定后删除旧路径。

### Test

每个事件 handler 立即加单测。

### Gate 9

不得出现：

> 页面 A 更新了，但页面 B 仍需手动刷新才知道。

---

# 17. Phase 10 — 全局搜索 + 工具 + 桌面快速入口

## W-24 工具减法

明确删除：

- 小费计算器
- 普通计算器
- 单位换算
- 温度换算
- 独立 BGM

保留：

- 番茄钟
- 随机
- 记账
- 倒数日

## W-25 倒数日

支持多个事件：

- 高考
- 旅行
- 截止日期
- 重要日期

允许：

> 首页显示 / 隐藏。

## W-26 随机工具

统一为一个入口：

```text
随机选择
随机数字
随机知识点
随机任务
抛硬币
```

## W-28 全局搜索

范围：

- Task
- Project
- Memo
- Note
- Knowledge
- Mistake
- Flashcard
- Review
- Exam

快捷键：

```text
Ctrl + K
```

## W-29

快速入口优先于“打开完整页面”：

- 快速备忘
- 快速任务
- 快速复盘
- 快速闪卡

### Gate 10

最常用动作无需先进入多层页面。

---

# 18. Phase 11 — Backup / Restore

## CODE P1

升级：

- checksum
- backup version
- 手动备份
- 历史备份
- 恢复入口

保持：

- 每日自动备份
- 最近 7 份

### Gate 11

```text
备份
→ 校验
→ 恢复
→ 数据一致性验证
```

密码本始终独立。

---

# 19. Phase 12 — 性能

## P1

### Query-based Loading

优先查询：

```text
getTodayTasks()
getInboxTasks()
getDueFlashcards()
getCurrentWeekMetrics()
```

减少：

```text
toArray()
→ JS filter
```

### C-23

按照：

```text
真实 Query
→ Measure
→ Index
→ Re-measure
```

优化。

### P2

Virtual List：

仅对达到规模阈值的：

- 错题
- 笔记
- 闪卡

引入。

---

# 20. Phase 13 — E2E 与 Tauri 增强

## Playwright

P2：

```text
任务
→ 完成
→ 今日
→ 复盘
```

```text
闪卡
→ 评价
→ Schedule
→ 统计
```

```text
周期
→ 生成
→ 完成
```

## Tauri

P2：

- autostart
- single-instance
- updater

核心 Web fallback 保持。

---

# 21. Phase 14 — QA / Accessibility / Responsive / Motion

这一 Phase 不再负责“第一次设计”，而负责**全局质量收口**。

## Responsive

Desktop：

> 完整体验

Tablet：

> 可折叠侧栏

Mobile：

> 查看今日 / 快速备忘 / 任务勾选

## Accessibility

检查：

- ≥4.5:1 普通文字
- ≥3:1 大文字
- keyboard
- focus-visible
- semantic
- 不只用颜色表达
- reduced motion

特别检查：

- Fluent 半透明背景
- F 图表
- 闪卡四档评价

## Motion

只保留：

- 页面进入
- 闪卡翻转
- 任务完成
- 数据变化

`prefers-reduced-motion` 下关闭 / 极低时长。

## Gate 14

所有主题 + 所有关键页面完成视觉、响应式、无障碍与动效 QA。

---

# 22. Phase 15 — Release / Final Integration

## DESIGN

- 最终设计资产
- Design Spec 最终版
- 视觉 QA
- 页面一致性检查

## CODE

- 清理旧路径
- 删除兼容过渡代码
- 构建
- 类型检查
- 测试
- Tauri 构建

## WORK

- 产品验收
- W-01~W-29 验收矩阵关闭
- 产品变更记录

---

# 23. W-01 ~ W-29 覆盖矩阵

| W | 内容 | 主要 Phase | 验收出口 |
|---|---|---|---|
| W-01 | 核心闭环 | Phase 8/9 | 执行→复盘→下一步→计划 |
| W-02 | 模块边界冻结 | Phase 0 | Coverage / 产品审查 |
| W-03 | 今日驾驶舱 | Phase 2/5 | 今日高保真 + 可运行 |
| W-04 | 首页降噪 | Phase 2/5 | 不承载长期数据 |
| W-05 | 侧边栏重构 | Phase 5 | 导航 IA + UI |
| W-06 | 导航心理成本 | Phase 5 | 模块重 / 页面轻 |
| W-07 | 任务系统重新划分 | Phase 5 | Inbox/Today/Future/Recurring/Project |
| W-08 | 周期只负责规则 | Phase 5 | Rule→Instance |
| W-09 | 周期规则升级 | Phase 5 | 全规则 + 测试 |
| W-10 | Memo 输入接口 | Phase 7 | 快速备忘 |
| W-11 | Memo 自动整理 | Phase 7 | Task/Note/Mistake |
| W-12 | 学习知识闭环 | Phase 6/8 | 知识→闪卡→复盘 |
| W-13 | 知识点中心 | Phase 6 | 关联对象可达 |
| W-14 | 闪卡内容模型 | Phase 6 | 内容 / 调度分离 |
| W-15 | CSV/粘贴导入 | Phase 6 | 批量导入 + 局部失败 |
| W-16 | 智能抽背 | Phase 6 | 1/3/7/14 |
| W-17 | 闪卡视觉 | Phase 1/2/6 | ≥5背景 + 可读性 |
| W-18 | 复盘重构 | Phase 8 | 五粒度复盘 |
| W-19 | 今日复盘 | Phase 8 | 今日问题 + 调整 |
| W-20 | 学科复盘 | Phase 8 | SubjectMetrics |
| W-21 | 周/月数据驾驶舱 | Phase 2/8 | F 视觉 |
| W-22 | 复盘可视化 | Phase 8 | 图表完整 + 无障碍 |
| W-23 | 复盘下一步 | Phase 8 | 创建下一步任务 |
| W-24 | 工具减法 | Phase 10 | 不必要工具删除 |
| W-25 | 倒数日升级 | Phase 10 | 多事件 |
| W-26 | 随机工具合并 | Phase 10 | 单一入口 |
| W-27 | 桌面快捷入口 | Phase 5/10/13 | 核心快捷键 |
| W-28 | 全局搜索 | Phase 10 | 9 类对象可跳转 |
| W-29 | 减少打开页面 | Phase 7/10 | 快速入口 |

---

# 24. C-01 ~ C-25 覆盖矩阵

| C | 内容 | Phase |
|---|---|---|
| C-01 | 需求/边界基线 | Phase 0 |
| C-02 | Store 规范 | Phase 3 |
| C-03 | store→stores | Phase 3 |
| C-04 | Domain | Phase 3 |
| C-05 | Event Bus | Phase 3/9 |
| C-06 | Task Event | Phase 9 |
| C-07 | Pomodoro Event | Phase 9 |
| C-08 | Flashcard Event | Phase 9 |
| C-09 | Mistake Event | Phase 9 |
| C-10 | Review Aggregator | Phase 3/8 |
| C-11 | DB Schema v2 | Phase 4 |
| C-12 | Review 拆分 | Phase 4/8 |
| C-13 | Flashcard Schedule | Phase 4/6 |
| C-14 | OPFS | Phase 13 |
| C-15 | Backup | Phase 11 |
| C-16 | Error/稳定性相关工程维护项 | 按实际 CODE Spec 对应实施 |
| C-17 | Tauri 增强 | Phase 13 |
| C-18 | 兼容/工程辅助项 | 随对应 Phase |
| C-19 | Error Recovery | Phase 13/15 |
| C-20 | Vitest | Phase 3 开始，贯穿全程 |
| C-21 | Query Loading | Phase 12 |
| C-22 | Virtual List | Phase 12 |
| C-23 | Query-driven Index | Phase 12 |
| C-24 | Theme System | Phase 1 |
| C-25 | 目录 / App 结构整理 | Phase 3 |

> 注：C-16 / C-18 在当前上游 CODE_SPEC 摘要中未形成独立实施章节时，不得凭空扩大其功能定义；Phase 0 必须从 CODE_SPEC 正式版本核对其具体要求，再生成 I-Task。

---

# 25. DESIGN 交付路线

## P0

- Design Tokens
- 容器语义
- 四场景方向
- F 数据视觉
- Card 系统

## P1

- Fluent 细化
- 首页
- 学习
- 闪卡
- 复盘
- 闪卡背景

## P2

- 动效精修
- Mobile 精修

但实际施工允许按页面依赖提前准备，并不把 P1 页面变成“P0 必须全部完成”。

---

# 26. 测试策略

测试横向贯穿：

```text
Phase 3
→ Vitest foundation

Phase 3 Domain
→ 同阶段测试

Phase 4 Migration
→ 同阶段 migration tests

Phase 6 Flashcard
→ scheduler / import tests

Phase 8 Review
→ aggregator tests

Phase 9 Events
→ event handler tests

Phase 13
→ E2E

Phase 14
→ UI / accessibility QA

Phase 15
→ final regression
```

禁止“最后才写全部测试”。

---

# 27. Migration 与回滚

任何 DB migration：

```text
Snapshot
↓
Preflight validation
↓
Transaction
↓
Sub-step verification
↓
Commit
↓
Postflight verification
```

失败：

```text
Abort
↓
保留旧快照
↓
恢复 / 重试
```

Version 2 是本轮唯一数据库升级边界，但内部必须有可定位的 migration 子步骤。

---

# 28. Review Gates

## Gate A — Product

WORK_SPEC 未被改变。

## Gate B — Design

High Fidelity / Design Handoff 在页面 CODE 之前。

## Gate C — Architecture

Domain / Store / Event / DB 边界正确。

## Gate D — Migration

数据无损、可恢复。

## Gate E — Core Loop

```text
Task
→ Execute
→ Record
→ Review
→ Next Action
→ Plan
```

真实运行。

## Gate F — Accessibility

所有主题和关键页面通过检查。

## Gate G — Build

```text
tsc
+
vite build
+
Vitest
+
必要 E2E
```

## Gate H — Release

Windows 构建 + Web fallback + 数据迁移验证。

---

# 29. Browser 计划

Master Plan 冻结后，不进行“全量研究”。

只做按问题触发：

## DESIGN Browser

- Windows Fluent 当前规范
- WCAG
- 图表无障碍
- 需要验证的视觉 / 交互模式

## CODE Browser

- Tauri 2 当前 plugin / updater / autostart / single-instance
- Dexie 4 migration / transaction
- React / ECharts 版本行为
- IndexedDB / OPFS
- 安全与兼容性

## WORK Browser

只有产品层明确需要：
- 最新数据
- 学术资料
- 外部事实
- 竞品验证

Browser 发现若影响 SPEC：

```text
Finding
→ 记录
→ 更新对应 SPEC
→ 再执行
```

不得 Browser 后直接私改产品。

---

# 30. I-Task 标准

Master Plan 本身不展开几百个代码任务，但执行前必须生成：

```text
I-001
I-002
...
```

每个 I-Task 必须包含：

```text
Goal
Related W
Related D
Related C
Files / Modules
Dependencies
Implementation
Test
Acceptance
Rollback
```

例如：

```text
I-XXX
W-15
D-12
C-13

目标：
实现闪卡 CSV / 粘贴导入。

验收：
- CSV 成功导入
- 学科自动匹配
- 知识点自动匹配/创建
- 单行失败不会阻塞其他行
- 失败原因可读
- 可局部重试
```

---

# 31. 最终验收

## 产品

- [ ] W-01~W-29 全部有施工落点
- [ ] 模块边界未改变
- [ ] 首页只回答今天
- [ ] 周期计划只负责规则
- [ ] 每种复盘有独立目的
- [ ] 每种复盘有“下一步”
- [ ] 学习知识点成为中心节点
- [ ] 不必要工具已删除

## 设计

- [ ] A/C/D/F 正确
- [ ] F 为页面级作用域
- [ ] Token 统一
- [ ] Brand + Theme Accent
- [ ] Section/List/Panel/Card/Data Block
- [ ] 关键页面 High Fidelity 在 CODE 前完成
- [ ] 闪卡 ≥5 背景
- [ ] 文字第一视觉层
- [ ] Responsive
- [ ] Accessibility
- [ ] Motion / Reduced Motion

## 工程

- [ ] Page 不直接 DB
- [ ] Domain
- [ ] Event Bus
- [ ] stores/ 唯一
- [ ] Dexie v2
- [ ] 22 张目标表
- [ ] Review 拆分
- [ ] Flashcard Schedule
- [ ] Query Loading
- [ ] Index
- [ ] Vitest
- [ ] E2E（P2）
- [ ] OPFS（P2）
- [ ] Tauri 增强（P2）

## 数据

- [ ] V5 → V8 migration 通过
- [ ] v1 → v2 migration 无损
- [ ] rollback 可执行
- [ ] vault 独立
- [ ] 普通 backup 不含 vault

---

# 32. 最终施工顺序

```text
Phase 0
基线 + Coverage Matrix
        ↓
Phase 1
Design Foundation + Theme Foundation
        ↓
Phase 2
关键页面 High Fidelity + Design Handoff
        ↓
Phase 3
Store / Domain / Event / Test Foundation
        ↓
Phase 4
DB Version 2 Migration
        ↓
Phase 5
今日 / 计划 / 导航
        ↓
Phase 6
学习 / 闪卡
        ↓
Phase 7
Memo / Note
        ↓
Phase 8
复盘
        ↓
Phase 9
Event 全量联动
        ↓
Phase 10
搜索 / 工具 / 快速入口
        ↓
Phase 11
Backup / Restore
        ↓
Phase 12
性能
        ↓
Phase 13
E2E / Tauri 增强 / OPFS
        ↓
Phase 14
Responsive / Accessibility / Motion QA
        ↓
Phase 15
Final Integration / Release
```

---

# 33. v1.1 冻结原则

本版修订后：

- 不再重新讨论 GOAL。
- 不再重新定义 WORK_SPEC 产品语义。
- 不让 CODE 重新决定产品职责。
- 不让 DESIGN 重新决定业务规则。
- 不让 Browser 自动产生新功能。
- 不在执行阶段随意改变 Phase。
- 若发现真实工程与 SPEC 冲突，必须走变更记录。

变更格式：

```text
Change ID
来源
冲突
影响 W/D/C
产品影响
设计影响
工程影响
迁移影响
验收影响
批准后版本
```

---

# 34. 最终状态

```text
V8_GLOBAL             ✅
WORK_SPEC             ✅
DESIGN_SPEC           ✅
CODE_SPEC             ✅
MASTER_PLAN v1.0      ✅ reviewed
MASTER_PLAN v1.1      ✅ revised
```

下一阶段：

> **三方仅做差异复审，不再重新生成 SPEC / PLAN。**

通过后：

> **按 Phase 触发必要 Browser，再进入 I-Task 执行。**

