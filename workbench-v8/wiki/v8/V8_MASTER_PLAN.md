# 个人工作台 V8 — MASTER PLAN

> 版本：1.0  
> 文档性质：项目级实施总计划  
> 阶段：PLAN  
> 上游依据：
> - `V8_GLOBAL.md`
> - `WORK_SPEC.md`
> - `DESIGN_SPEC.md`
> - `CODE_SPEC.md`
>
> 本计划不是新的产品需求，也不替代三个 SPEC。它负责把已经冻结的产品、设计和工程规格组织成一条**可执行、可验证、可回滚的实施路径**。
>
> 核心原则：
>
> **SPEC 定义“是什么”，MASTER PLAN 定义“先做什么、谁做、依赖什么、何时验收”，BROWSER 只在确有未知/易变/高风险信息时触发。**

---

# 0. 总体目标

将当前 Personal OS V8 从“各模块能够运行的桌面工具集合”升级为：

> **以「计划 → 执行 → 记录 → 数据 → 复盘 → 调整 → 下一轮计划」为核心闭环的本地优先、桌面优先个人操作系统。**

本次实施不以“增加功能数量”为目标，而以：

1. 产品职责清晰；
2. 视觉体系统一；
3. 数据与领域逻辑分层；
4. 跨模块事件联动；
5. 复盘真正消费执行数据并产生下一步；
6. 数据迁移可验证；
7. 核心逻辑可测试；
8. 最终形成可长期维护、可继续迭代的桌面应用；

为最终交付标准。

---

# 1. 冻结决策

以下内容已经在上游 SPEC 中确认，本计划不得再次重新定义。

## 1.1 产品闭环

```text
计划
  ↓
执行
  ↓
记录
  ↓
数据沉淀
  ↓
复盘
  ↓
调整
  ↓
下一轮计划
```

学习子闭环：

```text
知识体系
  ↓
学习
  ↓
错题
  ↓
闪卡
  ↓
复习
  ↓
掌握度
  ↓
学科复盘
  ↓
下一阶段学习计划
```

## 1.2 顶层信息架构

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

计划：

```text
收件箱 / 今日 / 未来 / 周期 / 项目
```

学习：

```text
总览 / 知识体系 / 错题 / 闪卡 / 成绩 / 阅读
```

记录：

```text
备忘录 / 笔记
```

复盘：

```text
今日 / 学科 / 周 / 月 / 考试 / 模板
```

工具：

```text
番茄钟 / 随机 / 记账 / 倒数日
```

## 1.3 模块职责

| 对象 | 唯一职责 |
|---|---|
| Memo | 现在想到、以后再整理的内容 |
| Note | 长期知识沉淀 |
| Task | 要完成的行动 |
| Recurring Task | 反复生成任务的规则 |
| Project | 围绕共同目标组织的一组任务与里程碑 |
| Knowledge | 需要掌握的知识节点 |
| Mistake | 已发生的错误及其原因 |
| Flashcard | 主动回忆与复习的知识载体 |
| Review | 理解过去表现并形成下一阶段调整 |

任何实施不得破坏“一对象一主要归属”。

## 1.4 视觉冻结方向

### A：晨雾书房
白天默认，日常工作、计划、学习、记录。

### C：Windows Fluent
用户手动切换，只改变视觉表现，不改变信息架构。

### D：深色夜航
夜间默认，学习、阅读、闪卡、专注、复盘。

### F：数据驾驶舱
页面级视觉特例，仅服务于：
- 周复盘
- 月复盘
- 考试复盘

F 不扩散为全局主题。

## 1.5 工程冻结

- 不更换 Tauri 2 / React 19 / TypeScript 6 / Vite 8 / React Router 7 / Zustand 5 / Dexie 4 / ECharts 6 / CSS Modules。
- 页面不得直接操作 DB。
- 数据流遵循 `Page → Store / Domain → DB → State → Page`。
- `stores/` 为唯一状态目录。
- 新增 `domain/`。
- 新增 Event Bus。
- Dexie 本轮升级到 version 2。
- 当前实际源码表数量以 18 张为准，本轮目标 18 + 4 = 22 张。
- Vitest 本轮必须建立核心测试基线。
- V5 → V8 迁移不可破坏。
- vault 独立安全边界不可破坏。

---

# 2. 计划方法

本项目采用：

```text
阶段基线确认
    ↓
工程基础 + Design System
    ↓
数据 / Domain / Event 基础
    ↓
核心产品页面
    ↓
学习与复盘闭环
    ↓
跨模块联动
    ↓
测试
    ↓
性能
    ↓
桌面增强
    ↓
发布
```

但不是严格的单线串行。

允许并行：

```text
WORK / DESIGN / CODE
    ↘     ↓     ↙
       Integration
```

同时坚持：

> **产品语义以 WORK_SPEC 为上游；视觉以 DESIGN_SPEC 为上游；工程以 CODE_SPEC 为上游。**

---

# 3. Agent 分工

## WORK Agent

负责：

- 产品语义核对
- 内容 / 研究
- 需求文档
- 验收说明
- 产品层变更记录

不负责：

- CSS
- 数据库实现
- Store / Domain / Event 实现

## DESIGN Agent

负责：

- Design System
- 页面结构表达
- UI
- 交互状态
- 原型
- 响应式
- 可访问性
- 高保真设计产物

不负责：

- 改产品职责
- 改业务规则
- 决定数据库 / Store / Domain

## CODE Agent

负责：

- 架构
- DB
- Store
- Domain
- Event
- UI 工程实现
- 测试
- 性能
- 桌面能力
- 构建和交付

不负责：

- 擅自改变 WORK 产品语义
- 擅自改变 DESIGN 已冻结的交互与视觉目标

---

# 4. 主实施路线

## Phase 0 — 基线冻结与安全准备

### 目标

在任何重构发生前，建立可回退基线。

### CODE

- 建立当前工程基线分支/快照。
- 记录当前 build 状态。
- 导出当前数据库备份。
- 验证 V5 → V8 迁移仍可运行。
- 核对真实 18 张表与当前 migration。
- 记录当前主题、路由、快捷键、桌面能力。

### WORK

- 冻结 `WORK_SPEC.md`。
- 建立 W-01～W-29 → 产品定义 → 验收项映射表。

### DESIGN

- 冻结 `DESIGN_SPEC.md`。
- 建立关键页面基线截图清单。

### 验收

- 当前版本可构建。
- 备份可恢复。
- V5 → V8 迁移有可验证样本。
- 三份 SPEC 版本已锁定。

---

# Phase 1 — Design System 与视觉工程底座

## 目标

先解决“所有页面长得不是一个软件”的问题，同时不碰核心业务。

### DESIGN

优先产出：

1. Token 语义结构
2. Section / List / Panel / Card / Data Block
3. A / C / D / F 四场景视觉定义
4. 闪卡五种背景方向
5. 页面级状态规范
6. 响应式规范
7. 可访问性规范

### CODE

- 建立 CSS variables。
- 建立 `data-theme` 四值基础：
  - `mist`
  - `fluent`
  - `night`
  - `data`
- 兼容旧 `dark → night`。
- 统一 Token 命名。
- 将现有主题逐步迁移到统一 token。
- 不改变页面业务行为。

### 依赖

DESIGN_SPEC 已冻结。

### 验收

- 四主题可以切换。
- 切换不改变信息架构。
- 普通 Card 不再由页面私自定义视觉。
- 基础 token 可被 CODE 直接消费。

---

# Phase 2 — 工程分层基础

## 目标

把当前“业务逻辑堆在 Store”的结构改成稳定基础。

### CODE P0

1. `store/` → `stores/`
2. 新增 `domain/`
3. 建立 Event Bus
4. 建立 Domain 纯函数测试结构
5. `App.tsx` / `main.tsx` 迁移到 `src/app/`
6. 建立 `src/desktop/`
7. 建立 `tests/`

### Domain 第一批

```text
domain/
├── planning/
│   ├── recurringGenerator.ts
│   └── taskScheduler.ts
├── study/
│   ├── studyMetrics.ts
│   └── knowledgeGraph.ts
├── review/
│   └── reviewAggregator.ts
├── flashcard/
│   └── flashcardScheduler.ts
└── events/
    └── eventBus.ts
```

### 验收

- 页面不直接 `db.*`。
- Domain 不依赖 React / DB / Browser API。
- `stores/` 为唯一状态目录。
- 原有页面仍能启动。

---

# Phase 3 — 数据层 Version 2 与迁移

## 目标

在核心逻辑重构前，建立未来闭环所需的数据结构。

### CODE

Dexie version 2：

新增：

```text
knowledgeRelations
reviewEntries
studySessions
appEvents
```

同时：

- tasks 增加 `createdAt` 索引。
- mistakes 增加 `createdAt` 索引。

### Review

从：

```text
Review
```

转为：

```text
ReviewTemplate
ReviewEntry
```

### Flashcard

拆分：

```text
Flashcard
FlashcardReview
FlashcardSchedule
```

### 迁移原则

```text
迁移前快照
    ↓
事务迁移
    ↓
记录数校验
    ↓
关键字段校验
    ↓
关联关系校验
```

特别验证：

```text
reviews → reviewEntries
Flashcard.mastery → FlashcardSchedule
```

禁止直接字段搬家。

### 验收

- version 2 启动成功。
- 旧数据记录数无损。
- V5 → V8 数据仍可使用。
- vault 不被迁移流程触碰。

---

# Phase 4 — 今日 + 计划系统重构

## 目标

让首页真正只回答：

> **今天我要做什么、今天已经做了什么？**

### WORK

产品逻辑：

- 今日只承载今天。
- 收件箱负责收集未安排事项。
- 未来管理非今日任务。
- 周期只管理规则。
- 项目负责长期目标。

### DESIGN

重新设计：

```text
今日 Hero
↓
今日三件最重要的事
↓
今日计划
↓
今日状态
↓
今日学习
↓
今晚复盘
```

避免全卡片化。

### CODE

实现：

- `getTodayTasks()`
- `getInboxTasks()`
- `getFutureTasks()`
- 周期规则实例生成
- 任务完成状态统一
- 任务与项目进度联动

### 验收

核心路径：

```text
快速备忘
→ 任务
→ 今日
→ 完成
→ 今日状态变化
```

---

# Phase 5 — 学习系统重构

## 目标

形成：

```text
知识体系
→ 学习
→ 错题
→ 闪卡
→ 复习
→ 掌握度
→ 学科复盘
```

### DESIGN

优先：

- 学习总览
- 知识点中心
- 错题
- 闪卡
- 学习统计
- 闪卡五主题
- 闪卡评价状态

### CODE

Domain：

```text
studyMetrics
knowledgeGraph
flashcardScheduler
```

实现：

- 知识点作为中心关联对象。
- 错题关联知识点。
- 闪卡关联知识点。
- 笔记 / 阅读可关联知识点。
- 闪卡 schedule 独立。

初始评价：

```text
😣 不会 → 1天
🤔 模糊 → 3天
🙂 会了 → 7天
😎 熟练 → 14天
```

本版不引入 FSRS。

### 验收

例如：

```text
知识点
→ 相关错题
→ 相关闪卡
→ 复习
→ 掌握度更新
```

链路可用。

---

# Phase 6 — 记录系统

## 目标

让 Memo 成为整个系统的低摩擦输入接口。

### DESIGN

重点设计：

- 备忘录 Inbox
- 快速整理动作
- 笔记组织
- Memo → Task / Note / Mistake

### CODE

- 快捷备忘浮窗数据同步。
- Memo 状态。
- 一键转化动作。
- 与搜索建立索引入口。

### 验收

```text
Ctrl+Shift+Space
→ 输入
→ Ctrl+Enter
→ 保存
→ 自动隐藏
→ 主窗口同步
```

同时：

```text
Memo
→ Task
Memo
→ Note
Memo
→ Mistake
```

路径可用。

---

# Phase 7 — 复盘系统

## 目标

让复盘从“数据展示”变成：

> **数据 → 理解 → 调整 → 下一步**

### 五种复盘

```text
今日
学科
周
月
考试
```

另有模板管理。

### WORK

冻结每种复盘独立问题：

- 今日：今天发生什么、哪里要调整？
- 学科：漏洞与错误模式是什么？
- 周：整体执行如何、下周怎么调整？
- 月：整体节奏与下一阶段方向？
- 考试：考试暴露什么、接下来怎么修正？

### DESIGN

- 今日 / 学科：遵循 A / D。
- 周 / 月 / 考试：F 数据驾驶舱。
- 每份复盘末尾有“下一步”。

### CODE

建立：

```text
reviewAggregator
```

读取：

- Task
- Pomodoro
- Mistake
- Flashcard
- Exam
- Reading

生成：

```text
DailyMetrics
SubjectMetrics
WeeklyMetrics
MonthlyMetrics
ExamMetrics
```

### 验收

核心闭环：

```text
任务完成
+
学习数据
+
错题
+
闪卡
      ↓
复盘
      ↓
下一步
      ↓
回流计划
```

---

# Phase 8 — Event Bus 全量联动

## 目标

将模块之间的“手动刷新”替换为统一事件流。

核心事件：

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

### 核心订阅

`task.completed`：

```text
→ 今日完成率
→ 项目进度
→ 复盘数据可用
```

`pomodoro.completed`：

```text
→ 学习时长
→ 今日统计
→ 复盘数据
```

`flashcard.reviewed`：

```text
→ Schedule
→ 掌握度
→ 学习统计
→ 复盘
```

`mistake.created`：

```text
→ 知识点薄弱度
→ 学科复盘
```

### 实施原则

先新增事件。

逐个替换旧手动刷新。

稳定后再删除旧路径。

---

# Phase 9 — 全局搜索

## 目标

让 Personal OS 真正成为“一个系统”。

搜索范围：

```text
任务
项目
备忘录
笔记
知识点
错题
闪卡
复盘
考试
```

快捷键：

```text
Ctrl + K
```

### DESIGN

- 分组结果
- 类型识别
- 键盘导航
- 无结果状态
- 直接跳转原对象

### CODE

- 统一查询入口。
- 第一阶段可以组合已有表查询。
- 后续根据实际数据规模决定是否建立独立搜索索引。

---

# Phase 10 — Backup / Restore

## 目标

把“能备份”升级为“能放心恢复”。

### 保留

- 每日自动 JSON
- 最近 7 份

### P1

增加：

- checksum
- backup version
- 手动立即备份
- 历史记录
- 恢复入口

### 验收

备份文件：

```text
生成
→ 校验
→ 恢复
→ 数据一致
```

---

# Phase 11 — 性能优化

## P1

### C-21 Query-based Loading

禁止：

```text
toArray()
→ 全量加载
→ JS filter
```

优先：

```text
where
equals
between
sortBy
limit
```

建立：

```text
getTodayTasks()
getDueFlashcards()
getCurrentWeekMetrics()
```

### C-23

根据真实 Query：

```text
Query
→ Measure
→ Index
→ Re-measure
```

不要为了“看起来专业”无限增加索引。

## P2

C-22：

> Virtual List

仅在实际数据规模达到阈值后启用。

---

# Phase 12 — Vitest 测试基线

## P1 必须完成

核心单测：

```text
flashcardScheduler
recurringGenerator
reviewAggregator
migration mapping
Event handlers
```

重点覆盖边界：

### Recurring

- 每天
- 每周指定日
- 每月
- 自定义间隔
- 暂停
- 跳过

### Flashcard

- 4 档评价
- 间隔变化
- 连续正确
- 新卡

### Review

- 空数据
- 单日
- 跨周
- 学科过滤

### Migration

- 正常数据
- 缺旧字段
- 空表
- 重复迁移
- 迁移失败

---

# Phase 13 — E2E / 桌面增强

## P2

### Playwright

核心 E2E：

```text
新建任务
→ 完成
→ 今日更新
→ 复盘读取
```

```text
闪卡评价
→ Schedule 更新
→ 统计
```

```text
周期规则
→ 生成任务
→ 完成
```

### Tauri

增加：

- autostart
- single-instance
- updater

但不得阻塞 Personal OS 核心闭环。

---

# Phase 14 — Error Recovery

## P2

实现：

```text
DB 异常
↓
生成 / 使用快照
↓
恢复界面
↓
选择版本
↓
事务恢复
↓
完整性验证
```

普通错误：

```text
发生了什么
+
怎么办
```

批量错误：

```text
成功 N
失败 M
原因
局部重试
```

---

# Phase 15 — 最终视觉与工程整合

## DESIGN

完成：

- 四主题高保真
- 首页
- 学习总览
- 闪卡
- 复盘
- 响应式
- 无障碍
- 动效
- Design Spec 交付

## CODE

完成：

- DESIGN token 落地
- 页面布局实现
- 状态实现
- 键盘操作
- reduced motion
- Web fallback

## 验收

不能出现：

```text
设计稿可行
但代码实现改变了产品语义
```

---

# 5. 并行关系

## 可并行

### Phase 1

DESIGN：

> Design System

CODE：

> Theme Infrastructure

两者可以同步，但 token 命名必须统一。

---

### Phase 2 / 3

CODE 可以独立完成架构与 DB。

DESIGN 可以同步准备关键页面 wireframe。

---

### Phase 4 / 5 / 6

WORK 定义已经冻结。

DESIGN 与 CODE 可以按页面和模块并行推进。

---

### Phase 7

复盘设计依赖：

- WORK 复盘逻辑
- CODE Aggregator
- DESIGN Data Dashboard

三个层面可以并行。

---

# 6. 不可并行的关键依赖

## 不能先于 WORK_SPEC

- 产品职责变化
- 用户流程变化
- 模块新增 / 删除

## 不能先于 DESIGN_SPEC

- 最终高保真 UI
- 最终主题细节
- 组件视觉实现

## 不能先于 CODE_SPEC

- DB Schema
- Event Bus
- Domain
- Migration

---

# 7. Browser 触发规则

BROWSER **不是固定阶段**。

只有满足以下任意条件才触发：

### WORK

- 最新资料
- 学术资料
- 外部事实
- 竞品研究

### DESIGN

- 平台设计规范
- Windows Fluent 当前规范
- WCAG / 无障碍
- 新设计模式

### CODE

- 版本变化
- API
- Tauri / Dexie / React 技术行为
- 安全公告
- 构建 / 兼容性问题

如果现有 SPEC 已经有充分依据：

> 不重复搜索。

---

# 8. Browser 结果如何进入项目

不允许：

```text
搜到一个功能
→ 直接加入 V8
```

必须：

```text
Browser
 ↓
Finding
 ↓
判断是否影响 SPEC
 ↓
必要时更新 SPEC
 ↓
再进入实施
```

SPEC 是产品合同，Browser 只是证据来源。

---

# 9. Master Plan 的任务编号体系

## WORK

```text
W-01 ~ W-29
```

## DESIGN

```text
D-01 ~ D-17
```

## CODE

```text
C-01 ~ C-25
```

## Implementation Task

执行时新增：

```text
I-001
I-002
I-003...
```

每个 I Task 必须注明对应：

```text
W-xx
D-xx
C-xx
```

例如：

```text
I-014
对应：
W-19 / W-23
D-06 / D-13
C-10 / C-06
```

这样以后可以追溯：

> 产品要求 → 设计 → 工程实现 → 验收。

---

# 10. Review Gates

每个大阶段必须设置 Gate。

## Gate A — 产品

确认：

- WORK_SPEC 未被改变。
- 核心产品闭环仍然成立。

## Gate B — 设计

确认：

- 页面符合 DESIGN_SPEC。
- 信息架构没有被视觉实现改变。

## Gate C — 工程

确认：

- CODE_SPEC 已实现。
- 没有跨层污染。

## Gate D — 数据

确认：

- migration 成功。
- 记录不丢。
- vault 不受影响。

## Gate E — 闭环

必须实际跑通：

```text
任务
→ 完成
→ 今日
→ 数据
→ 复盘
→ 下一步
→ 计划
```

## Gate F — Build

必须：

```text
tsc
+
vite build
+
核心 Vitest
```

通过。

---

# 11. 回滚策略

任何涉及：

- DB
- migration
- Event Bus
- Store 大规模变化

都必须：

1. 保留迁移前快照；
2. 分阶段提交；
3. build 验证；
4. 关键路径验证；
5. 失败可恢复。

原则：

> **宁可暂停一个 Phase，也不要为了“完成进度”破坏用户数据。**

---

# 12. 最终交付顺序

最终发布前必须得到：

## 产品

- `WORK_SPEC.md`
- 产品验收记录

## 设计

- Design System
- 高保真关键页面
- 响应式
- 可访问性
- Design Spec

## 工程

- 重构后的 `src/`
- Dexie version 2 migration
- Domain
- Event Bus
- Vitest
- 构建产物
- CHANGELOG

## 验证

- Build
- 核心单测
- 核心 E2E（若当前阶段已启用）
- V5 → V8 migration
- 数据恢复验证
- 核心闭环验证

---

# 13. 发布前最终验收清单

## 产品

- [ ] 首页只回答“今天”
- [ ] 模块职责无重叠
- [ ] 周期计划只负责规则
- [ ] 每种复盘都有独立目的
- [ ] 每种复盘都有“下一步”
- [ ] 学习知识点成为中心节点
- [ ] 新增功能均能进入闭环

## 设计

- [ ] A/C/D/F 视觉体系完成
- [ ] Design Token 统一
- [ ] Section / List / Panel / Card / Data Block 已分层
- [ ] 首页不再全卡片化
- [ ] 学习页不再信息墙化
- [ ] 闪卡文字始终是第一视觉层
- [ ] ≥5 套闪卡背景
- [ ] reduced-motion
- [ ] 键盘 / focus / 对比度
- [ ] Desktop / Tablet / Mobile

## 工程

- [ ] stores/ 唯一
- [ ] domain/ 存在
- [ ] 页面无直接 DB 调用
- [ ] Event Bus 可用
- [ ] version 2 migration 通过
- [ ] Review Template / Entry 拆分
- [ ] Flashcard Schedule 分离
- [ ] Query-based Loading
- [ ] 必要索引
- [ ] Vitest 通过
- [ ] Build 通过

## 数据安全

- [ ] V5 → V8 迁移通过
- [ ] version 1 → version 2 无损
- [ ] migration 失败可恢复
- [ ] vault 独立
- [ ] 普通备份不包含 vault
- [ ] 无明文敏感信息写入日志

---

# 14. 最终优先级地图

```text
P0
│
├─ Design System / Theme
├─ Store / Domain / Event Bus
├─ DB Version 2
├─ 今日 / 计划基础
└─ Review Aggregator 基础
        ↓
P1
│
├─ Task / Pomodoro / Flashcard / Mistake 事件
├─ Review 拆分
├─ Flashcard Schedule
├─ Backup
├─ Query-based Loading
├─ Index Optimization
└─ Vitest
        ↓
P2
│
├─ OPFS
├─ Tauri 增强
├─ Error Recovery
├─ Virtual List
├─ Playwright
└─ 更深性能优化
```

---

# 15. 成功定义

V8 不以：

> “所有页面都重写完了”

作为唯一完成标准。

真正的完成标准是：

> **用户从输入一个想法开始，到执行任务、沉淀学习数据、完成复盘，再从“下一步”回到新的计划，整个循环可以真实运行。**

最终验证路径：

```text
快捷备忘
    ↓
任务
    ↓
今日
    ↓
执行
    ↓
番茄 / 学习 / 错题 / 闪卡
    ↓
数据沉淀
    ↓
复盘
    ↓
下一步
    ↓
计划
```

如果这条路径能够稳定、低摩擦、可恢复地运行，那么 V8 才真正从“工具集合”跨过了那条线，成为 Personal OS。

---

# 16. 计划状态

当前上游规格状态：

| 文档 | 状态 |
|---|---|
| `V8_GLOBAL.md` | ✅ 冻结 |
| `WORK_SPEC.md` | ✅ 冻结 |
| `DESIGN_SPEC.md` | ✅ 冻结 |
| `CODE_SPEC.md` | ✅ 冻结 |
| `V8_MASTER_PLAN.md` | ✅ 本次生成 |

下一阶段：

> **进入按 Phase 执行。**

不再重新讨论已冻结的 GOAL / SPEC；如实施中出现冲突，必须创建变更记录，说明：

```text
冲突来源
影响范围
拟议修改
受影响的 W / D / C 条目
迁移影响
验收影响
```

经确认后再更新对应 SPEC。
