# 个人工作台 V8 — MASTER PLAN

> 版本：1.21  
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
> 本版不是重新制定需求，而是针对 v1.1 复审发现的**复盘指标契约缺口、C-16/C-18 追溯错误、C-19 施工落点缺失、Event Bus 接入时序歧义，以及少量执行追踪不完整**进行定点修订。

---

# 0. v1.2 修订结论

v1.1 的总体路线、Phase 结构与三方协作关系保持不变。本版只修订已确认的执行缺口，不重新定义 GOAL / SPEC。

v1.2 新增并冻结：

1. **Review Metrics 五粒度正式对齐**：`DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics`。
   `CODE_SPEC` 必须在 Phase 0 的 Spec Erratum 中补齐 Monthly / Exam 数据契约、聚合口径与适用 Review 类型；DESIGN / CODE 后续均以同一契约为准。

2. **C-16 / C-18 追溯修正**：
   - C-16 = 密码本继续独立，属于 KEEP / DO NOT TOUCH；实施重点仅为迁移、备份、恢复过程中验证 vault 不越界。
   - C-18 = 桌面端窗口，当前 Main + Quick Memo 双窗口保持；未来 Quick Task 浮窗继续作为 P2 增强，不阻塞核心闭环。

3. **C-19 Error Recovery 恢复明确施工落点**：
   从模糊的“Phase 13/15”改为 **Phase 11 Backup / Restore** 的显式工程能力，并在最终 QA / Release 中验证。

4. **Event Bus 接入时序冻结**：
   Phase 5 的任务完成与项目进度联动必须直接使用已在 Phase 3 建立的 Event Bus；Phase 9 不再重复实现，而是补齐剩余事件、切换旧手动刷新路径并做全量清理。

5. **C-14 OPFS 正文补齐**：
   Phase 13 明确实现附件存储；用于错题截图、PDF、笔记图片、闪卡图片等大附件，结构化数据仍由 IndexedDB 管理。

6. **`getAutoSummary` 既有索引缺陷显式标记**：
   Phase 4 的 `tasks.createdAt` / `mistakes.createdAt` 索引修正同时视为现有 `getAutoSummary` `.where(createdAt)` 查询缺陷的 Bug Fix。

7. **今日页高保真责任冻结**：
   Phase 2 完成“今日”高保真与 Handoff；Phase 5 不再重复设计今日，只补计划模块（收件箱 / 未来 / 周期 / 项目）及其导航结构。

8. **学习子页设计追踪补全**：
   成绩 / 阅读属于既有 KEEP 页面，沿用 Design Foundation；在 Phase 6 显式完成一致性 QA，但不扩大为新的产品需求。

9. **Phase 0 必须先完成 Spec Errata 与上游缺口核对**：
   不因 v1.2 已修订 Master Plan 就直接跳过上游契约收口。

v1.2 保留 v1.1 已确认的：
- P / Phase / Dexie version 三层分离；
- 测试跟随实现；
- High Fidelity 先于页面工程化；
- F = 页面级 `review-data` scope，不是全局主题；
- `--color-*` Token + Brand / Theme Accent；
- W-01~W-29 / C-01~C-25 Coverage Matrix；
- I-Task 标准；
- Migration 分步骤核验与回滚。

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

## 2.5 Review Metrics 契约先于复盘高保真与 Aggregator

复盘系统统一使用五粒度指标：

```text
DailyMetrics
SubjectMetrics
WeeklyMetrics
MonthlyMetrics
ExamMetrics
```

在 Phase 0 完成 `ERRATA-01` 前：

- DESIGN 不冻结依赖具体指标字段的最终复盘图表；
- CODE 不自行发明 Monthly / Exam 指标字段；
- ReviewEntry / ReviewAggregator / Chart 数据源必须使用同一套指标契约。

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

为消除 CODE_SPEC / DESIGN_SPEC 中 `data-theme=...data` 与“F 是页面级特例”的冲突：

```text
Global Theme
├── mist
├── fluent
└── night

Page Visual Scope
└── review-data
```

`review-data` 不出现在用户可选择的全局主题列表中。

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

### Phase 0 Spec Errata

必须在进入 Phase 2 高保真和 Phase 3/4 工程修改前完成：

**ERRATA-01 — Review Metrics**
- `CODE_SPEC` 补齐 MonthlyMetrics / ExamMetrics。
- 明确五种 Metrics 的字段、聚合口径、适用 Review 类型。
- 同步 ReviewEntry / ReviewAggregator / Design Data Source。

**ERRATA-02 — Theme Scope**
- `data-theme` 全局值域冻结为 `mist / fluent / night`。
- F 使用页面级 `review-data` scope。
- `review-data` 不进入主题设置。

**ERRATA-03 — C-16 / C-18 / C-25**
- C-16 = vault 独立，KEEP / DO NOT TOUCH。
- C-18 = Main + Quick Memo 双窗口，KEEP；Quick Task 为 P2。
- C-25 = 目录与 App 结构整理，Phase 3 实施。

### Gate 0

- [ ] 三份 SPEC 版本锁定
- [ ] Spec Errata 01~03 完成并同步到对应 SPEC
- [ ] W-01~W-29 / D-01~D-17 / C-01~C-25 Coverage Matrix 完成
- [ ] C-16 / C-18 / C-25 上游定义已核对
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

### C-25

本阶段完成目录与 App 结构整理：

```text
App.tsx / main.tsx
→ src/app/

桌面相关能力
→ src/desktop/

stores/
→ 唯一状态目录
```

### C-16 / C-18

本阶段只完成工程边界确认，不重新实现：

- C-16：vault 继续独立，不并入普通 Store / DB 流程。
- C-18：Main + Quick Memo 双窗口保持现状；Quick Task 不提前纳入 P0/P1。

### Gate 3

- [ ] `stores/` 唯一
- [ ] Domain 可独立运行
- [ ] Event Bus API 可用
- [ ] Vitest 可执行
- [ ] 已建立的 Domain 同阶段拥有测试
- [ ] C-16 vault 边界保持独立
- [ ] C-18 双窗口现状不被破坏
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

这两项同时标记为：

> **Bug Fix：修复现有 `getAutoSummary` 对 `createdAt` 使用 `.where()` 时缺少索引的运行时缺陷。**

因此 Phase 4 完成后，现有 `getAutoSummary` 查询必须可正常执行；后续 Phase 8 的 Domain Aggregator 重构属于架构升级，不再承担“发现并修复该 Bug”的职责。

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
- 计划页面高保真
- 收件箱 / 未来 / 周期 / 项目状态
- 与 Phase 2“今日”Handoff 对齐，不重复制作今日高保真

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

### Event Bus 接入要求

由于 Event Bus 已在 Phase 3 建立：

```text
toggleDone()
↓
emit task.completed
↓
Project Progress Subscriber
↓
Today / Review 可消费同一事件结果
```

Phase 5 不允许重新写一套“任务完成 → 项目进度”的第二套手动联动逻辑。

### Gate 5

```text
快速备忘
→ Task
→ Today
→ 完成
→ task.completed
→ 项目进度 / 今日状态更新
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

### 成绩 / 阅读 KEEP 页面

`成绩` 与 `阅读` 不新增产品范围：

- 沿用 Phase 1 Design Foundation。
- 在本 Phase 完成与新主题、容器、状态、响应式规则的一致性 QA。
- 不扩展为新的学习闭环功能。

### Gate 6

```text
知识点
→ 错题
→ 闪卡
→ 评价
→ 下一次复习
→ 掌握度
```

以及：

```text
成绩
阅读
→ 主题 / 容器 / 响应式一致
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

五种 Metrics 必须与 `ERRATA-01` 保持同一字段、聚合口径和时间边界。

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

### C-19 Error Recovery

在 Backup / Restore 能力之上，显式实现：

```text
DB / 数据层异常
↓
检测
↓
保留 / 读取最近可用快照
↓
恢复界面
↓
选择版本
↓
事务恢复
↓
完整性验证
```

要求：

- 不能把错误伪装成成功。
- 恢复失败必须给出可理解原因。
- 恢复过程不得把 vault 并入普通恢复流。
- 普通 backup 不包含 vault。

### Gate 11

```text
备份
→ 校验
→ 恢复
→ 数据一致性验证
```

并验证：

```text
异常
→ Error Recovery
→ 恢复
→ 完整性验证
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

## OPFS（C-14）

P2：

用于大附件 / Binary 数据：

- 错题截图
- PDF
- 笔记图片
- 闪卡图片
- 其他达到附件存储阈值的文件

原则：

```text
结构化数据 → IndexedDB
大附件 / Binary → OPFS
```

必须明确：

- 文件关联
- 删除时的孤儿附件清理
- 导入 / 导出兼容
- Web fallback 行为

## Tauri（C-17 / C-18）

P2：

- autostart
- single-instance
- updater

C-18 当前：

- Main + Quick Memo 双窗口保持。
- Quick Task 浮窗属于 P2 未来增强，可在本阶段实现或继续后置，但不得影响核心闭环。

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
| C-14 | OPFS 附件存储 | Phase 13 |
| C-15 | Backup | Phase 11 |
| C-16 | 密码本继续独立（KEEP / DO NOT TOUCH） | Phase 0 / 4 / 11 核验 |
| C-17 | Tauri 增强 | Phase 13 |
| C-18 | 桌面端窗口（KEEP；Quick Task 为 P2） | Phase 0 / 13 核验 |
| C-19 | Error Recovery | Phase 11 |
| C-20 | Vitest | Phase 3 开始，随 Domain / Migration / Scheduler / Event 实现同步 |
| C-21 | Query Loading | Phase 12 |
| C-22 | Virtual List | Phase 12 |
| C-23 | Query-driven Index | Phase 12 |
| C-24 | Theme System | Phase 1 |
| C-25 | 目录 / App 结构整理 | Phase 3 |

> 注：C-16 / C-18 属于“已有能力 + 不可越界”类条目，不因 Master Plan 而新增产品范围。Phase 0 只核对其与正式 `CODE_SPEC` 的一致性并生成验证型 I-Task；C-16 重点验证 vault 独立边界，C-18 重点验证双窗口现状。

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
Backup / Restore + Error Recovery
        ↓
Phase 12
性能
        ↓
Phase 13
E2E / Tauri 增强 + OPFS
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

# 34. v1.2 变更记录

| 变更 ID | 内容 | 原因 |
|---|---|---|
| ER-01 | Review Metrics 从 3 类统一为 5 类 | DESIGN / CODE / WORK 的复盘粒度必须共享同一数据契约 |
| ER-02 | 修正 C-16 / C-18 定义 | v1.1 覆盖矩阵标签错误 |
| ER-03 | C-19 落入 Phase 11 | 恢复能力不应只存在于矩阵或 Release 阶段 |
| ER-04 | Phase 5 的 `task.completed` 直接走 Event Bus | 避免 Phase 9 重写项目进度联动 |
| ER-05 | C-14 OPFS 补入 Phase 13 正文 | 矩阵与 Phase 正文对齐 |
| ER-06 | `createdAt` 索引明确标记为 Bug Fix | 对齐现有 `getAutoSummary` 缺陷来源 |
| ER-07 | 今日 High Fidelity 责任冻结 | 避免 Phase 2 / 5 重复设计 |
| ER-08 | 成绩 / 阅读作为 KEEP 页面纳入 Phase 6 QA | 完成学习模块页面追踪，不扩大产品范围 |

本版不改变任何已冻结的产品语义、视觉方向或技术底座。

---

# 35. Autonomous Execution Layer

本项目采用**人工转接、Agent 自主连续执行**模式。

由于 WORK / DESIGN / CODE 三方 Agent **无法直接互通上下文**，不得假设一个 Agent 能直接读取另一个 Agent 的未交付中间状态。所有跨 Agent 信息必须通过人工完成文件转接。

因此：

```text
WORK
  ↓ 人工转接
DESIGN
  ↓ 人工转接
CODE
  ↓
Integration / Review
```

## 35.1 Agent 的默认自主权

只要满足：

- 上游 SPEC 已冻结；
- 当前 I-Task 已 READY；
- 不改变产品语义；
- 不突破 V8_GLOBAL 不可破坏项；
- 不引入破坏性 migration；
- 不更换技术栈或重大架构；
- 可以安全回滚；

Agent **无需等待用户逐项批准**，应自动连续执行：

```text
READY
↓
EXECUTE
↓
TEST
↓
SELF REVIEW
↓
UPDATE STATE
↓
NEXT READY TASK
```

## 35.2 必须暂停并请求人工确认的情况

仅在以下情况进入 `NEED_CONFIRM`：

1. 改变 WORK_SPEC 已冻结的产品语义。
2. WORK / DESIGN / CODE 上游文档发生真实冲突。
3. 可能造成数据丢失、不可逆 migration 或 vault 安全边界受损。
4. 需要更换技术栈或重大架构。
5. 需要增加原计划之外的重大外部服务、基础设施或长期依赖。
6. 无法建立可靠回滚路径。
7. Browser 研究发现会推翻已冻结的核心决策。
8. 当前 I-Task 的验收条件无法安全满足，继续执行可能制造隐性技术债。
9. 发现必须新增产品功能才能完成当前目标。
10. 用户明确指定的约束与实际工程发生无法自行消解的冲突。

除以上情况外，普通工程细节不得频繁询问用户。

## 35.3 不需要确认的典型决策

以下默认由 Agent 自行决定：

- 文件如何拆分；
- 函数 / 组件如何命名；
- CSS / React / TypeScript 的具体实现；
- 小型内部重构；
- 小型性能优化；
- 测试用例组织；
- 小型错误处理；
- 不改变行为的代码整理；
- 依据已冻结 Design System 做页面细节实现。

## 35.4 自动执行状态机

每个 I-Task 使用：

```text
PENDING
↓
READY
↓
IN_PROGRESS
↓
TESTING
↓
REVIEW
↓
DONE
```

异常：

```text
IN_PROGRESS
↓
BLOCKED
↓
NEED_CONFIRM
```

或：

```text
IN_PROGRESS
↓
FAILED
↓
AUTO_FIX
↓
TESTING
```

只有：

```text
NEED_CONFIRM
```

才暂停等待人工。

## 35.5 I-Task 连续执行规则

Agent 完成一项 I-Task 后：

1. 自动运行该任务的 Test。
2. 自动执行 Self Review。
3. 自动检查对应 W / D / C 条目。
4. 更新执行状态。
5. 查找下一个依赖已满足的 READY I-Task。
6. 自动开始下一项。

不得在每个 I-Task 完成后等待用户说“继续”。

## 35.6 Browser 自动触发

Browser 为**按需能力**，不是固定阶段。

满足以下任意条件即可自动触发：

- 当前 API / SDK / 平台规则存在版本不确定性；
- 需要官方文档验证；
- 存在安全 / 兼容性问题；
- SPEC 明确要求外部事实；
- 当前技术方案依赖尚未确认的外部行为。

Browser 完成后：

```text
Finding
↓
判断是否影响当前 SPEC
├─ 否 → 记录并继续
└─ 是 → NEED_CONFIRM / 更新 SPEC
```

Agent 不得仅因竞品存在某功能就自动加入 V8。

## 35.7 Phase Gate 自动推进

每个 Phase 完成后自动执行：

```text
Implementation
↓
Tests
↓
Self Review
↓
Phase Gate
```

只有 Gate PASS：

```text
Phase N DONE
↓
Phase N+1 READY
```

如果 Gate FAIL：

```text
保持当前 Phase
↓
生成 Gap List
↓
自动修复
↓
重新 Gate
```

只有触发 `NEED_CONFIRM` 才停止。

---

# 36. 三 Agent 无互通时的人工转接协议

## 36.1 总原则

不要让后游 Agent 猜上游 Agent 做过什么。

所有跨 Agent 转接必须至少包含：

```text
上游 Global
+
Project Global
+
对应 SPEC
+
相关 Executive Summary
+
上游交付产物
+
相关 I-Task / Review
```

## 36.2 WORK → DESIGN

WORK 结束产品定义后，人工转交：

```text
WORK_GLOBAL
V8_PROJECT_GLOBAL
WORK_SPEC
DESIGN_SPEC
WORK Executive Summary
相关研究 / 内容产物
相关 I-Task
```

DESIGN 不重新解释产品语义，只负责设计表达。

## 36.3 DESIGN → CODE

DESIGN 完成关键页面与 Design Handoff 后，人工转交：

```text
CODE_GLOBAL
V8_PROJECT_GLOBAL
WORK_SPEC
DESIGN_SPEC
CODE_SPEC
DESIGN High Fidelity
Design System
Design Handoff
相关 I-Task / QA
```

CODE 不得根据截图自行重新发明产品逻辑。

## 36.4 CODE → WORK / DESIGN

只有以下情况需要回传：

- 发现产品语义冲突；
- 发现设计不可实现且无局部替代方案；
- 发生数据安全 / migration 风险；
- 完成阶段并需要上游验收。

否则 CODE 不需要频繁回传。

---

# 37. V8 推荐 Agent 开工顺序

因为三方**不互通**，不采用三个 Agent 同时自由施工。

## 第一顺位：DESIGN

先完成：

```text
Phase 1
Design Foundation
↓
Phase 2
关键页面 High Fidelity + Design Handoff
```

原因：

> CODE 最容易发生高成本返工的部分是页面/UI/交互，而 DESIGN_SPEC 又明确要求 High Fidelity 先于最终页面工程化。

DESIGN 完成后，人工把：

```text
Design System
+
High Fidelity
+
Design Handoff
```

转给 CODE。

## 第二顺位：CODE

收到完整 Design Handoff 后：

```text
Phase 3
工程分层 + Test Foundation
↓
Phase 4
Dexie v2 Migration
↓
Phase 5+
逐 Phase 自主执行
```

CODE 可以在收到 Design Handoff 后一直运行到项目完成，不需要用户逐项盯。

### 关于 CODE 是否可以提前

如果用户明确追求并行效率，可以让 CODE 提前做**纯工程基础**：

- `stores/` 整理；
- `domain/`；
- Event Bus；
- Vitest foundation；

但不要提前进入：

- 关键页面最终 UI；
- 主题最终视觉；
- 依赖 Design Handoff 的页面工程化。

在当前“尽量不盯着”的目标下，**推荐先 DESIGN，再完整转接 CODE**，简单且返工风险最低。

## WORK 的位置

WORK 不需要持续运行。

WORK 在：

```text
GOAL
SPEC
产品规则
研究
```

阶段完成主要职责。

只有出现：

```text
产品语义冲突
新增研究
重大需求变化
```

时才重新唤醒 WORK。

---

# 38. Autonomous Build 的单次启动指令

以后正式开工时，可直接将以下指令交给 Agent：

```text
读取并严格执行：

V8_GLOBAL.md
对应 Agent GLOBAL
V8_PROJECT_GLOBAL.md
WORK_SPEC.md
DESIGN_SPEC.md
CODE_SPEC.md
V8_MASTER_PLAN_v1.21.md
V8_PHASE0_BASELINE.md
V8_PHASE0_RISKS.md
V8_PHASE0_I_TASKS.md
AUTONOMOUS_EXECUTION_PROTOCOL.md

当前任务：
进入 Autonomous Build。

规则：

1. 从当前第一个 READY I-Task 开始。
2. 无需我逐个批准。
3. 完成一个 I-Task 后自动 Test / Self Review / 更新状态 / 进入下一项。
4. Browser 按需自动触发，优先官方资料。
5. 不得扩大需求。
6. 不得改变上游 SPEC 的产品语义。
7. 不得破坏 V8_GLOBAL 不可破坏项。
8. 不得为了通过任务而制造临时代码或虚假测试。
9. 遇到普通实现问题自行解决。
10. 只有满足 NEED_CONFIRM 条件时暂停并请求人工确认。
11. Phase Gate PASS 后自动进入下一 Phase。
12. 一直执行，直到：
   - 所有当前 Phase 完成；或
   - 项目完成；或
   - 进入 NEED_CONFIRM。
13. 不要在每个 I-Task 完成后等待我的回复。
14. 所有新增风险写入执行状态，而不是隐藏。

执行时优先保证：
数据安全 > 产品语义 > 正确性 > 可维护性 > 性能 > 装饰性优化。
```

# 39. Autonomous Build 决策原则

优先级：

```text
L0  Agent 自行决定
L1  Agent 自行决定并记录
L2  Agent 自行决定 + 加入 Review
L3  必须人工确认
```

### L0

- 命名；
- 文件拆分；
- CSS 细节；
- 测试组织；
- 小型重构。

### L1

- 小型性能优化；
- 非破坏性内部 API 整理；
- 不改变行为的依赖更新。

### L2

- 新增普通开发依赖；
- 内部 API 结构改变；
- 不破坏数据的架构调整。

### L3

- 产品语义；
- 安全边界；
- 破坏性 migration；
- 技术栈；
- 重大架构；
- 数据不可逆操作；
- 新增重大需求。

---

# 40. 最终自动化工作流

```text
MASTER PLAN
      ↓
Current Phase
      ↓
I-Task Queue
      ↓
Dependency Check
      ↓
READY?
 ┌────┴────┐
No          Yes
↓            ↓
Blocked    Execute
             ↓
          Browser?
          /     \
        No       Yes
        ↓         ↓
      Execute   Research
                   ↓
               Continue
                   ↓
                Test
                   ↓
             Self Review
                   ↓
          ┌────────┴────────┐
          ↓                 ↓
        PASS               FAIL
          ↓                 ↓
        DONE             AUTO_FIX
          ↓                 ↓
     Next I-Task ←─────────┘
          ↓
      Phase Gate
          ↓
       PASS?
      /     \
    No       Yes
    ↓         ↓
  Fix      Next Phase
              ↓
            ...
              ↓
        NEED_CONFIRM?
         /        \
       No          Yes
       ↓            ↓
   Continue       STOP
                    ↓
                  User
```

# 41. 最终停止条件

项目可以自行运行到：

```text
所有 Phase DONE
+
所有 Gate PASS
+
所有 I-Task DONE
+
最终 Build PASS
+
最终 Test PASS
+
最终 Review PASS
```

或：

```text
NEED_CONFIRM
```

只有这两种情况属于正常停止。




```text
V8_GLOBAL             ✅
WORK_SPEC             ✅
DESIGN_SPEC           ✅
CODE_SPEC             ✅
MASTER_PLAN v1.0      ✅ reviewed
MASTER_PLAN v1.1      ✅ reviewed
```

下一阶段：

> **三方仅做差异复审，不再重新生成 SPEC / PLAN。**

通过后：

> **按 Phase 触发必要 Browser，再进入 I-Task 执行。**

