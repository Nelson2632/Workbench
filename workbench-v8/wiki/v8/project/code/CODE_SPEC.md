# CODE SPEC

> 版本：1.1 | 阶段：SPEC（GOAL → **SPEC** → PLAN → BROWSER → IMPLEMENT → TEST → REVIEW → DELIVER）
> 依据：`V8_GLOBAL.md` / `agent/CODE_GLOBAL.md` / `project/work/WORK_SPEC.md` / `project/design/DESIGN_SPEC.md` / `执行摘要/CODE.md` / `WIKI.md`（源码现状） / `project/code/code goal.docx`（已解析）
> 说明：本文定义「工程实现是什么」，不写最终代码。目标是把 V8 从「各模块孤立、业务逻辑堆在 Store」重构为「分层 + 事件驱动」架构，落地 WORK 定义的「计划 → 执行 → 记录 → 复盘 → 调整」闭环。所有结论以当前源码为权威。

---

## 0. 决策标记约定（贯穿全文）

每条工程决策必须标注其一，且只有后两类可自由设计：

- **PRODUCT CONSTRAINT**：来自 `WORK_SPEC` 的冻结产品语义，CODE 不得改变。
- **ENGINEERING DECISION**：CODE 的工程实现选择（可改，但不反噬产品语义）。
- **IMPLEMENTATION DETAIL**：纯实现细节（可改）。

---

## 0.1 审阅结论（当前工程现状）

| 维度 | 现状 | 关键文件 |
|------|------|----------|
| 目录 | `src/` 根下 `store/`（单数，systemStore）与 `stores/`（复数，8 个）并存；**无** `domain/`、`tests/`、`src/app/` | — |
| 技术栈 | Tauri 2 / Rust 2021 / React 19 / TS 6 / Vite 8 / React Router 7 / Zustand 5 / Dexie 4 / ECharts 6 / CSS Modules | [package.json](file:///d:/1%20-%20%20Marty/diary/workbench-v8/package.json)、[Cargo.toml](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src-tauri/Cargo.toml) |
| 依赖 | 前端无测试依赖；桌面仅 `global-shortcut` + `notification` + `tray-icon` | — |
| 数据模型 | Dexie version 1，**18 张表**（源码为准）；`Review.autoSummary: any`；`Flashcard` 调度字段内联 | [database.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/db/database.ts#L52-L71)、[types/index.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/types/index.ts) |
| 状态管理 | Zustand；Store 直接调 `db.*`；无 Domain、无 Event Bus；主题仅 light/dark | [taskStore.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/stores/taskStore.ts)、[systemStore.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/store/systemStore.ts) |
| 页面 | 页面树完整，`React.lazy` 路由懒加载 | [App.tsx](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/App.tsx) |
| API | Tauri 命令仅 `quit_app`；事件 `wb-quick-memo-saved` | [lib.rs](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src-tauri/src/lib.rs) |
| 构建 | `tsc && vite build`；`tauri build`；`@` alias | [vite.config.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/vite.config.ts)、[tauri.conf.json](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src-tauri/tauri.conf.json) |
| 测试 | **无**（无 vitest/playwright/jest） | — |
| 数据迁移 | V5 → IndexedDB 已实现；备份为每日 JSON + 保留 7 份，无 checksum/版本 | [migration.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/db/migration.ts)、[backup.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/db/backup.ts) |
| 安全 | vault 加密（PBKDF2 100k + AES-GCM）**已实现但内嵌在页面组件**；CSP `null` | [VaultPage.tsx](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/pages/VaultPage.tsx#L43-L67) |
| 性能 | 已有 React.lazy；Store 普遍 `toArray()` 全表加载；`getAutoSummary` 命中未建索引的 `createdAt` 字段 | [reviewStore.ts](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/stores/reviewStore.ts#L109-L115) |

**核心结论**：技术底座与数据安全已达标，不推倒重来；本次重构聚焦「分层 + 事件联动 + 数据层升级 + 核心单测」，而非加功能。

> 表数量修正：`CODE.md`/`code goal.docx` 均写 19 张，但源码 `database.ts` 实际为 **18 张**。本 SPEC 以源码为准，目标为 18 + 4 = **22 张**。

---

## 1. 功能规格

### 1.1 目标

在不换技术栈、不破坏现有数据的前提下，把工程从「各模块孤立、逻辑堆在 Store、跨模块手动刷新」重构为「分层 + 事件驱动」架构，使复盘能消费执行层数据并最终导向「下一步计划」。

### 1.2 功能范围与实施顺序（已冻结，来自 code goal.docx）

**SPEC 全覆盖 C-01~C-25，P0/P1/P2 仅决定实施顺序（不因优先级省略定义）。**

**P0 — 架构基础**
- C-01 需求 / 边界基线：保留技术栈 + 冻结 WORK_SPEC 上游语义 + 决策标记约定。
- C-02 Store 规范：`Page → Store → Domain → DB`，页面永不直接调 `db.*`。
- C-03 Store 目录统一：合并 `store/` 到 `stores/`。
- C-04 Domain Layer：新增 `domain/` 纯函数层。
- C-05 Event Bus：`AppEvent` 事件总线。
- C-10 Review Aggregator：复盘聚合器。
- C-11 DB Schema 基础升级：新增 4 表 + 索引修正。
- C-24 主题系统代码化：四套主题 `data-theme`。

**P1 — 核心闭环联动**
- C-06 任务完成事件、C-07 番茄钟事件、C-08 闪卡复习事件、C-09 错题创建事件。
- C-12 Review 拆分（Template / Entry）。
- C-13 Flashcard Schedule 分离。
- C-15 备份体系升级。
- C-20 Vitest 核心测试基线（本轮必须，不延后）。
- C-21 Query-based Loading。
- C-23 查询驱动的索引优化。

**P2 — 工程完善（不阻塞 Personal OS 闭环）**
- C-14 OPFS 附件存储、C-17 Tauri autostart/single-instance/updater、C-19 错误恢复升级、C-22 虚拟列表。
- Playwright E2E 完善、进一步性能优化、桌面端增强。

---

## 2. 技术架构

### 2.1 分层架构（ENGINEERING DECISION）

```
┌────────────── Pages（React 组件：渲染 + 调 Store Action）──────────────┐
└──────────────────────────────┬───────────────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────────────┐
│  Stores（Zustand：持状态 + 发布 Action + 派生查询）                      │
└───────────────┬──────────────────────────┬───────────────────────────┘
                │                          │
┌───────────────▼──────────┐   ┌───────────▼──────────────────────────┐
│  Domain（纯函数逻辑：调度/ │   │  Event Bus（task.completed 等事件，     │
│  聚合/规则引擎，可单测）   │   │  跨模块解耦通信）                       │
└───────────────┬──────────┘   └───────────┬──────────────────────────┘
                │                          │
┌───────────────▼──────────────────────────▼───────────────────────────┐
│  DB（Dexie / IndexedDB，附件后续 OPFS）                                 │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户操作 → Page 调 Store Action → Store 调 Domain（纯计算）
        → Store 写 DB → Store 更新内存 → React 重渲染
        → Store 发布 AppEvent → 其他订阅者更新
```

### 2.3 目录结构（目标，C-25，ENGINEERING DECISION）

```
src/
├── app/               # 入口、路由、全局 Provider（App.tsx/main.tsx 迁入）
├── components/        # ui / layout / business
├── pages/
├── stores/            # 统一目录（删除 store/ 单数目录）
├── domain/            # 纯函数领域逻辑
│   ├── planning/recurringGenerator.ts, taskScheduler.ts
│   ├── study/studyMetrics.ts, knowledgeGraph.ts
│   ├── review/reviewAggregator.ts
│   ├── flashcard/flashcardScheduler.ts
│   └── events/eventBus.ts
├── db/                # database / migration / backup
├── hooks/
├── types/
├── styles/
├── utils/
├── desktop/           # Tauri 集成
└── tests/             # unit / integration / e2e
```

---

## 3. 数据模型

### 3.1 表清单（18 现有 + 4 新增 = 22）

现有 18 表保持主键与索引主体不变。新增 4 表（ENGINEERING DECISION）：

| 新表 | 主键 | 索引 | 用途 |
|------|------|------|------|
| `knowledgeRelations` | `++id` | `knowledgeId, type, targetId` | 知识点关联（错题/闪卡/笔记/阅读） |
| `reviewEntries` | `++id` | `type, templateId, dateRange` | 复盘回答条目（与 Template 分离） |
| `studySessions` | `++id` | `subjectId, startedAt` | 学习会话 |
| `appEvents` | `++id` | `type, timestamp` | 事件日志（审计/重放） |

> 注：`knowledgeRelations` 用关系表还是别的实现是 ENGINEERING DECISION；但「知识点可关联错题与闪卡」是 PRODUCT CONSTRAINT（来自 WORK_SPEC W-13），不得缩窄为「只有闪卡能关联」。

### 3.2 关键实体拆分

**Review**（C-12）：拆为 Template（问什么）与 Entry（答了什么）。`autoSummary` 从 `any` 收敛为联合指标类型。

```typescript
interface ReviewEntry {
  id: string
  templateId: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  answers: Record<string, string>
  reflections: string[]
  nextActions: string[]
  autoSummary: DailyMetrics | SubjectMetrics | WeeklyMetrics
  createdAt: string
}
```

**Flashcard**（C-13）：拆为三个关注点——`Flashcard`（内容）、`FlashcardReview`（历史，已有）、`FlashcardSchedule`（调度状态，新增）。

```typescript
interface FlashcardSchedule {
  flashcardId: string
  nextReviewAt: string
  consecutiveCorrect: number
  interval: number        // 天
  easeFactor: number
  reviewCount: number
  lastReviewedAt: string
}
```

### 3.3 索引修正（MUST）

`getAutoSummary` 对 `tasks`/`mistakes` 的 `createdAt` 做 `.where()`，但二者索引不含 `createdAt`，属隐性缺陷。必须为 `tasks`、`mistakes` 增补 `createdAt` 索引（对齐 C-23）。

---

## 4. API / Interface

### 4.1 Store Action 接口（示例）

```typescript
interface TaskState {
  tasks: Task[]
  loading: boolean
  loadTasks: () => Promise<void>
  addTask: (task: Partial<Task> & { title: string }) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  getTodayTasks: () => Task[]        // 派生查询
  getInboxTasks: () => Task[]
}
```

Action 内按 `Domain 计算 → DB 写入 → 内存更新 → 发布事件` 顺序执行。

### 4.2 Domain 纯函数接口

- `scheduleFlashcard(current: FlashcardSchedule, rating: ReviewRating): FlashcardSchedule`
- `generateTasksForDate(rules: RecurringTask[], date: Date, existingSourceIds: string[]): Task[]`
- `ReviewAggregator.getDailyMetrics(date) / getSubjectMetrics(...) / getWeeklyMetrics(...)`

### 4.3 Event Bus 接口

```typescript
type AppEvent =
  | { type: 'task.completed'; taskId: string; completedAt: string }
  | { type: 'task.created'; taskId: string }
  | { type: 'pomodoro.completed'; duration: number; taskId?: string }
  | { type: 'flashcard.reviewed'; flashcardId: string; rating: ReviewRating }
  | { type: 'mistake.created'; mistakeId: string; subject: string }
  | { type: 'exam.created'; examId: string }
  | { type: 'review.completed'; reviewId: string; type: ReviewType }
  | { type: 'recurring.generated'; ruleId: string; taskIds: string[] }

eventBus.subscribe(type, handler): () => void
eventBus.publish(event): void
```

> 事件 payload 的具体字段为 ENGINEERING DECISION，但「任务完成须联动项目进度 / 复盘数据」是 PRODUCT CONSTRAINT（WORK_SPEC W-01）。

### 4.4 桌面 API

保留 `quit_app` 命令与 `wb-quick-memo-saved` 事件；P2 增补 autostart/single-instance/updater 插件命令。前端桌面能力收敛到 `src/desktop/`，浏览器环境动态 `import('@tauri-apps/api/...')` 保证 Web fallback。

---

## 5. State

### 5.1 Store 职责

- 持有内存状态副本
- 提供 Action（状态修改入口）
- Action 内持久化到 DB
- 状态变更后发布 AppEvent
- 提供派生查询

### 5.2 Store 不做

- 不含复杂业务逻辑（归 Domain）
- 不直接被页面调用 DB
- 不互相直接调用（走 Event Bus）
- 不在 Action 中做 UI 操作

### 5.3 现状修正点

- `store/systemStore.ts`（单数）迁移至 `stores/systemStore.ts`，删除旧目录。
- `systemStore.theme` 从 `'light' | 'dark'` 扩展为四套（`mist`/`fluent`/`night`/`data`），统一 `data-theme` 属性切换；旧 `dark` 值兼容映射到 `night`（IMPLEMENTATION DETAIL）。

---

## 6. Domain Logic

新增 `domain/`，纯函数、无副作用、不依赖 React/DB/浏览器 API，可单测：

| 模块 | 职责 | 现状归属 |
|------|------|----------|
| `planning/recurringGenerator.ts` | 周期规则 → 任务实例生成 | 散落于 recurringStore |
| `planning/taskScheduler.ts` | 任务时间调度 | 无 |
| `study/studyMetrics.ts` | 学习时长/完成率统计 | 散落于 studyStore |
| `study/knowledgeGraph.ts` | 知识点掌握度/薄弱点 | 无 |
| `review/reviewAggregator.ts` | 日/周/月/学科指标聚合 | 内嵌于 reviewStore.getAutoSummary |
| `flashcard/flashcardScheduler.ts` | 间隔重复调度（简化 SM-2） | 内嵌于 flashcardStore |
| `events/eventBus.ts` | 发布/订阅 | 无 |

`reviewStore.getAutoSummary` 聚合逻辑下沉到 `reviewAggregator`，并顺带修复 `createdAt` 索引缺陷。

---

## 7. UI Integration

- 页面经 `PageWrap` + `React.lazy` 懒加载（保留）。
- 页面只读 Store 派生查询，不直接 `db.*`。
- 主题切换统一 `document.documentElement.setAttribute('data-theme', theme)`，值域 `mist/fluent/night/data`；数据驾驶舱为周/月/考试复盘页面级特例。
- 容器层级（Section/List/Panel/Card/Data Block）由 DESIGN_SPEC 第 11 节约束，CODE 只实现不改产品逻辑。
- 闪卡页保留 3D 翻转与 5 主题（KEEP）。

---

## 8. Migration

### 8.1 分阶段 version 升级（已冻结决策）

**采用分阶段 version migration，不为「多版本」而多版本。** 本轮 `version(2)` 完成当前结构升级：

```typescript
this.version(2).stores({
  tasks: '++id, dueDate, priority, done, pinned, projectId, createdAt',   // 补索引
  mistakes: '++id, subject, mastered, createdAt',                         // 补索引
  // 原其余表保持 + 新增 4 表
  knowledgeRelations: '++id, knowledgeId, type, targetId',
  reviewEntries: '++id, type, templateId',
  studySessions: '++id, subjectId, startedAt',
  appEvents: '++id, type, timestamp',
}).upgrade(async (tx) => {
  // reviews → reviewEntries 数据搬迁（语义转换）
  // flashcards → 生成 FlashcardSchedule 初始记录（语义转换）
})
```

后续仅在发生新的 schema breaking change 时再建 `version(3+)`，不把未来变更 cram 进本轮。

### 8.2 迁移硬规则（已冻结）

- 迁移前快照 + 迁移事务 + 迁移后核验（总记录数 / 关键字段 / 关联关系）。
- **禁止「字段直接搬家」**：旧字段必须经语义转换再写新字段。
- 两个危险映射必须显式转换：
  - `reviews` → `reviewTemplates` / `reviewEntries`
  - `Flashcard.mastery(0–100)` → `FlashcardSchedule.easeFactor / consecutiveCorrect`（语义不同）
- 迁移失败不静默丢数据。

### 8.3 不可破坏项

- V5 → V8 的 localStorage 迁移（`migration.ts`）保持生效，作为前置步骤。
- 现有用户数据完整性不可破坏。

---

## 9. Error Handling

- 保留 `ErrorBoundary` + 数据完整性检查。
- 异步 Action 覆盖 `loading / success / error / empty` 态，错误给可理解反馈并留日志。
- 复盘聚合/闪卡导入等批量操作：区分「成功 N 条 / 失败 M 条 + 原因」，支持局部重试。
- 错误恢复流程（P2）：DB 损坏 → 自动快照 → 恢复界面 → 选择版本 → 事务恢复 → 验证。

---

## 10. Security

- **vault 加密算法保持 PBKDF2（100000，SHA-256）+ AES-GCM 256，不改**。当前加密内嵌在 [VaultPage.tsx](file:///d:/1%20-%20%20Marty/diary/workbench-v8/src/pages/VaultPage.tsx#L43-L67)，SHOULD 抽取为独立 `utils/vaultCrypto.ts` 以便复用与单测，**行为不变**。
- 普通数据导出/备份**继续排除 `vault` 表**；密码本单独加密导出。
- 不得把 vault 明文并入普通数据流（PRODUCT CONSTRAINT）。
- 迁移/备份/日志不得记录明文密码。

---

## 11. Performance

- **修复索引缺陷**（MUST）：`tasks`/`mistakes` 补 `createdAt` 索引。
- **C-21 Query-based Loading → P1**：将 `loadAll()`/`toArray()` 全表加载替换为索引查询（`where('dueDate').equals(...)`、`getDueFlashcards()` 等）。
- **C-23 查询驱动索引优化 → P1**：先定义真实 Query → 测量 → 加索引 → 验证，不为加索引而加索引。
- **C-22 虚拟列表 → P2**：错题/笔记/闪卡列表在数据量达标后引入。
- 保留 React.lazy 路由懒加载；ECharts 按需引入；桌面 API 动态 import。

---

## 12. Test Requirements

- **Vitest（本轮必须，P1）**：为核心 Domain 纯函数建立单元测试基线。
  - `flashcardScheduler` — 四档评价间隔计算
  - `recurringGenerator` — daily/weekly/monthly/custom 规则匹配
  - `reviewAggregator` — 日/周/月指标聚合
  - `migration mapping` — 迁移字段语义转换
  - 核心事件处理
- **Playwright（P2，不阻塞 P0）**：E2E 覆盖「新建任务 → 完成 → 今日更新 → 复盘读取」「闪卡评价 → 调度更新 → 统计」「周期规则 → 生成任务」。

---

## 13. Build / Release

- `npm run build` = `tsc && vite build`，必须类型检查通过 + 构建成功。
- `npm run tauri:build` 产出 Windows 安装包（NSIS/WiX，zh-CN）。
- 本轮新增构建依赖仅 Vitest；不改变产物目标与标识。

---

## 14. Backward Compatibility

- **V5 → V8 迁移能力不可破坏**（`migration.ts` 保持生效）。
- **现有用户数据完整性不可破坏**：version 2 升级必须无损。
- **Web fallback 不可破坏**：核心逻辑不依赖 Tauri 才能运行；桌面 API 动态 import。
- 旧 `reviews` 表升级后仍可读（搬迁到 `reviewEntries`）。
- 主题：旧 `data-theme='dark'` 兼容映射到 `night`。

---

## 15. Acceptance Criteria

1. 页面组件中不再出现 `db.*`，全部经 Store Action。
2. `src/stores/` 为唯一状态目录，`src/store/` 已删除。
3. `src/domain/` 存在，核心模块为纯函数且可独立单测。
4. `eventBus` 可用，`task.completed` 能触发「今日完成率 + 项目进度 + 复盘数据」联动。
5. Dexie 升级到 version 2，新增 4 表 + 补索引；旧 version 1 数据启动后记录数不丢失、字段可读。
6. Review 拆为 Template / Entry；闪卡调度状态与内容分离（语义转换，非字段直接搬家）。
7. 四套主题经 `data-theme` 切换，切换不改变信息架构。
8. 核心闭环实测：新建任务 → 标记完成 → 今日更新 → 复盘可读。
9. `tsc && vite build` 通过；Vitest 核心单测通过。
10. 密码本功能与导出排除不受影响；V5 用户数据迁移验证通过。

---

## 16. Technical Risks

| 风险 | 说明 | 缓解 |
|------|------|------|
| 数据迁移丢失 | version 1→2 与 `reviews→reviewEntries`、`flashcards` 字段对齐 | 事务迁移 + 快照 + 记录数/字段/关联核验 |
| 字段语义漂移 | `Flashcard.mastery`(0–100) 与 `FlashcardSchedule.easeFactor/consecutiveCorrect` 语义不同 | 显式语义转换，禁止直接搬家 |
| 事件联动回归 | 引入 Event Bus 后旧手动刷新路径遗漏 | 逐事件替换 + 保留旧刷新兜底至稳定 |
| 过度重构 | 一次性改动面过大 | 按 P0→P1→P2 分阶段，每阶段 build + 验证 |
| 无测试基线 | 当前无测试 | 本轮补 Vitest 核心单测（P1） |
| 密码本风险 | 迁移/导出改动误伤 vault | vault 独立、迁移显式排除、算法不改 |
| 索引缺陷 | `createdAt` 未建索引导致现有查询即会报错 | 本版必须修正 |

---

## 17. 已冻结决策（原「未决问题」已解决）

来自 `code goal.docx`，本版**不存在阻塞性未决项**：

1. **CODE SPEC 完整覆盖 C-01~C-25**；P0/P1/P2 仅决定实施顺序，不因优先级省略定义（与 WORK_SPEC 处理方式一致）。
2. **WORK_SPEC 已冻结**，作为产品语义上游合同；CODE 不得改变其已冻结的产品规则。CODE 可设计工程模型（字段/索引/事件 payload），但不得反向改变产品语义。
3. **Dexie 分阶段 version migration**：本轮 `version(2)` 完成结构升级；未来 breaking schema change 再建 `version(3+)`。
4. **测试框架**：Vitest 本轮必须；Playwright E2E 后置 P1/P2，不阻塞 P0。
5. **性能项**：C-21 Query-based Loading 与 C-23 查询驱动索引优化 → P1；C-22 Virtual List → P2。
6. **Schema 由 CODE 决定**，但必须标注 PRODUCT CONSTRAINT / ENGINEERING DECISION / IMPLEMENTATION DETAIL，且不得改变 WORK_SPEC 产品语义。

> 事实性修正（非决策）：表数量以源码为准为 **18 张**（CODE.md / code goal.docx 写 19）。

---

## 18. 变更分类

### MUST CHANGE（P0 + P1 必做）

- 新增 `domain/` 纯函数层（C-04）
- 新增 Event Bus（C-05）
- 统一 `stores/` 目录，删除 `store/`（C-03）
- Dexie version 2：新增 4 表 + 补 `createdAt` 索引（C-11 + 修正）
- 修复 `reviewStore.getAutoSummary` 的 `createdAt` 非索引查询缺陷
- Review 拆分为 Template / Entry（C-12）
- 闪卡调度状态与内容分离（C-13）
- 主题系统四套代码化（C-24）
- 事件订阅全量联动（C-06~C-09，P1）
- Vitest 核心单测基线（C-20 核心，P1）
- Query-based Loading（C-21，P1）与查询驱动索引优化（C-23，P1）

### SHOULD CHANGE（P1 建议 / P2 部分）

- 备份体系升级（checksum/版本/手动/历史，C-15，P1）
- vault 加密逻辑抽取为独立模块（行为不变）
- `src/App.tsx`/`main.tsx` 迁入 `src/app/`（C-25 部分）

### KEEP（保留）

- 技术栈（Tauri/React/TS/Vite/Zustand/Dexie/ECharts/CSS Modules）
- React.lazy 路由懒加载
- 18 张现有表主体结构与主键
- V5 → V8 迁移逻辑（`migration.ts`）
- 备份机制基础（每日 JSON + 保留 7 份）
- 桌面窗口/托盘/全局快捷键/通知（`lib.rs`）
- vault PBKDF2 + AES-GCM 算法
- CSS Modules、`ErrorBoundary`、`@` alias

### DO NOT TOUCH（不得破坏）

- 12 条不可破坏项（`V8_GLOBAL` 第 22 节）
- 密码本独立安全边界（明文不入普通数据流、导出排除）
- V5 → V8 数据迁移能力
- 现有用户数据完整性
- 核心桌面能力（快捷备忘/托盘/全局快捷键/通知）
- 核心信息架构（今日/计划/学习/记录/复盘/工具/设置/密码本）

---

> 本 SPEC 定义「是什么」。确认后进入 PLAN（定义「怎么做」），再进入 BROWSER / IMPLEMENT。
