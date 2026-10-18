# 个人工作台 V8 — CODE 架构与工程文档

> 版本：0.8.0 优化方案 | 分类：CODE（架构 / 数据库 / 状态 / 桌面 / 测试）

---

## 目录

1. [文档定位](#1-文档定位)
2. [当前技术栈基线](#2-当前技术栈基线)
3. [架构任务清单 C-01 ~ C-25](#3-架构任务清单-c-01--c-25)
4. [目标架构：分层与目录](#4-目标架构分层与目录)
5. [状态管理规范](#5-状态管理规范)
6. [Domain Layer 领域逻辑层](#6-domain-layer-领域逻辑层)
7. [Event Bus 事件总线](#7-event-bus-事件总线)
8. [Review Aggregator 复盘聚合器](#8-review-aggregator-复盘聚合器)
9. [数据库 Schema 规划](#9-数据库-schema-规划)
10. [数据备份与恢复](#10-数据备份与恢复)
11. [桌面端 Tauri 架构](#11-桌面端-tauri-架构)
12. [错误恢复机制](#12-错误恢复机制)
13. [测试体系](#13-测试体系)
14. [性能优化](#14-性能优化)
15. [主题系统代码化](#15-主题系统代码化)
16. [执行顺序与优先级](#16-执行顺序与优先级)

---

## 1. 文档定位

本文档是个人工作台 V8 优化方案的 **CODE 部分**，聚焦架构设计、数据库 Schema、状态管理、领域逻辑、事件驱动、桌面端能力、测试与性能。

配套文档：
- `WORK.md` — 产品 / 信息架构 / 功能逻辑
- `DESIGN.md` — UI / 视觉 / 布局

---

## 2. 当前技术栈基线

### C-01｜保留当前技术栈

当前技术栈已经非常合适，**不建议为了所谓"先进"而重新换框架**。

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 后端语言 | Rust | 2021 edition |
| 前端框架 | React | 19.x |
| 语言 | TypeScript | 6.x |
| 构建工具 | Vite | 8.x |
| 路由 | React Router DOM | 7.x |
| 状态管理 | Zustand | 5.x |
| 数据库 | Dexie | 4.x |
| 图表 | ECharts | 6.x |
| 样式 | CSS Modules | — |

**结论**：下一阶段以重构领域逻辑 + UI 系统为主，而不是推倒技术栈。

---

## 3. 架构任务清单 C-01 ~ C-25

### 3.1 架构与状态

#### C-02｜统一 Store 规范

当前已经是：`Store → DB → Store → Page`，页面不直接访问 DB。保持。

#### 明确调用链

```
Page
 ↓
Store Action
 ↓
Domain Logic
 ↓
DB
 ↓
State Update
```

页面永远不直接调用 `db.xxx`，必须通过 Store Action。

---

#### C-03｜解决当前 Store 组织问题

目前 `store/`（单数）与 `stores/`（复数）两个目录并存，语义混乱。

#### 统一为

```
stores/
├── systemStore.ts
├── taskStore.ts
├── studyStore.ts
├── reviewStore.ts
├── recordStore.ts
├── flashcardStore.ts
├── projectStore.ts
├── recurringStore.ts
└── toolStore.ts
```

将 `store/systemStore.ts` 迁移至 `stores/systemStore.ts`，删除 `store/` 目录。

---

### 3.2 领域逻辑与事件

#### C-04｜新增 Domain Layer

不要所有业务逻辑都塞到 Store。增加 `domain/` 目录：

```
domain/
├── planning/
│   ├── recurringGenerator.ts   # 周期任务生成器
│   └── taskScheduler.ts        # 任务调度
├── study/
│   ├── studyMetrics.ts         # 学习统计
│   └── knowledgeGraph.ts       # 知识图谱
├── review/
│   └── reviewAggregator.ts     # 复盘聚合
├── flashcard/
│   └── flashcardScheduler.ts   # 闪卡间隔重复调度
└── recurring/
    └── ruleEngine.ts           # 周期规则引擎
```

**职责分离**：
- Store 负责状态（持有数据、提供 action）
- Domain 负责逻辑（纯函数、可测试、无副作用）

---

#### C-05｜事件总线

建立 `AppEvent` 事件总线，替代 Store 之间互相调用。

#### 事件类型

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
```

#### 订阅者模式

```
事件发布者                事件订阅者
─────────                ─────────
TaskStore               ├→ 更新今日完成率
  │ task.completed       ├→ 更新项目进度
  ▼                      ├→ 更新周期任务状态
EventBus ─────────────→ ├→ 记录 completedAt
                         └→ 进入复盘统计
```

这比每个 Store 互相调用干净得多。

---

#### C-06｜番茄钟事件

完成番茄时发布 `PomodoroCompleted` 事件，自动触发：

| 订阅者 | 动作 |
|--------|------|
| PomodoroStore | 写日志 |
| StudyStore | 写学习时长 |
| ProjectStore | 更新项目统计 |
| TodayStore | 更新今日统计 |
| ReviewAggregator | 更新复盘可用数据 |

---

#### C-07｜任务完成事件

任务完成时发布 `TaskCompleted` 事件，自动触发：

| 订阅者 | 动作 |
|--------|------|
| TaskStore | 更新今日完成率 |
| ProjectStore | 更新项目进度 |
| RecurringStore | 更新周期任务状态 |
| 数据库 | 记录 completedAt |
| ReviewAggregator | 进入复盘统计 |

---

#### C-08｜闪卡复习事件

闪卡评价时发布 `FlashcardReviewed` 事件，自动触发：

| 订阅者 | 动作 |
|--------|------|
| FlashcardStore | 更新 review log |
| FlashcardScheduler | 更新 nextReview |
| FlashcardStore | 更新 consecutiveCorrect |
| StudyStore | 更新知识点掌握度 |
| ReviewAggregator | 更新学习统计 |

---

#### C-09｜错题事件

创建错题时发布 `MistakeCreated` 事件，自动触发：

| 订阅者 | 动作 |
|--------|------|
| StudyStore | 关联知识点 |
| KnowledgeGraph | 增加 weakness score |
| ReviewAggregator | 进入学科复盘 |
| 统计模块 | 增加相关统计 |

---

### 3.3 复盘聚合

#### C-10｜复盘聚合器

增加 `ReviewAggregator`，页面不需要自己计算数据。

#### 输入

```
Task / Pomodoro / Mistake / Flashcard / Exam / Reading
```

#### 输出

```typescript
interface DailyMetrics {
  date: string
  tasksTotal: number
  tasksCompleted: number
  studyDuration: number     // 分钟
  pomodoroCount: number
  mistakesCreated: number
  flashcardsReviewed: number
  flashcardsCorrect: number
}

interface SubjectMetrics {
  subjectId: string
  subjectName: string
  studyDuration: number
  taskCompletionRate: number
  newMistakes: number
  flashcardReviews: number
  weakKnowledgePoints: string[]
}

interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  totalStudyDuration: number
  totalTasksCompleted: number
}

// MonthlyMetrics / ExamMetrics 同理
```

---

### 3.4 数据库

#### C-11｜数据库 schema

当前 Dexie 已经包含 19 张表，保留主体。建议增加 4 张新表：

| 新表 | 用途 |
|------|------|
| `knowledgeRelations` | 知识点关联关系（错题/闪卡/笔记的关联） |
| `reviewEntries` | 复盘回答条目（与 Template 分离） |
| `studySessions` | 学习会话记录 |
| `appEvents` | 事件日志（用于审计和重放） |

---

#### C-12｜Review 数据拆分

当前应该区分两个实体，不要混成一个：

| 实体 | 定义 | 存储 |
|------|------|------|
| **Template** | 定义"要问什么" | `reviewTemplates` 表 |
| **Entry** | 定义"用户答了什么" | `reviewEntries` 表（新增） |

#### 数据结构

```typescript
interface ReviewTemplate {
  id: string
  name: string
  type: ReviewType
  questions: string[]
}

interface ReviewEntry {
  id: string
  templateId: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  answers: Record<string, string>   // questionId → answer
  reflections: string[]
  nextActions: string[]
  autoSummary: DailyMetrics | SubjectMetrics | WeeklyMetrics
  createdAt: string
}
```

---

#### C-13｜闪卡数据分离

建议将闪卡数据拆为三个关注点：

| 实体 | 内容 | 表 |
|------|------|-----|
| **Flashcard** | 内容（问题/答案/学科/章节/知识点/难度/标签） | `flashcards` |
| **FlashcardReview** | 复习历史（每次评价记录） | `flashcardReviews` |
| **FlashcardSchedule** | 调度状态（下次复习时间、连续正确数、间隔） | 新增字段或新表 |

#### 调度字段

```typescript
interface FlashcardSchedule {
  flashcardId: string
  nextReviewAt: string
  consecutiveCorrect: number
  interval: number       // 天
  easeFactor: number
  reviewCount: number
  lastReviewedAt: string
}
```

---

#### C-14｜附件存储

按数据类型选择存储介质：

| 数据类型 | 存储介质 | 说明 |
|----------|----------|------|
| 结构化数据 | IndexedDB (Dexie) | 任务、笔记、错题、闪卡等 |
| 大附件 / 二进制 | OPFS (Origin Private File System) | 错题截图、PDF、笔记图片、闪卡图片 |

这符合当前浏览器本地存储的适用边界：IndexedDB 更适合结构化数据，OPFS 更适合大文件/二进制数据。

---

### 3.5 备份与安全

#### C-15｜数据备份

当前已经有每日自动 JSON 备份，保留最近 7 份。建议升级为完整备份体系：

| 功能 | 说明 |
|------|------|
| 自动备份 | 每日自动，保留最近 7 份 |
| 手动立即备份 | 用户随时触发 |
| 备份历史 | 列出所有备份文件，含时间和大小 |
| 恢复 | 从指定备份恢复 |
| 校验 | 备份文件完整性校验（checksum） |
| 迁移版本 | 备份文件带版本号，支持跨版本恢复 |

---

#### C-16｜密码本继续独立

密码本保持独立加密区：

| 特性 | 说明 |
|------|------|
| 加密算法 | PBKDF2 + AES-GCM（当前已采用） |
| 独立存储 | 与普通数据隔离 |
| 导出排除 | 普通数据导出默认排除密码本 |
| 主密码 | 用户设置主密码，派生加密密钥 |

---

### 3.6 桌面端

#### C-17｜桌面端

继续使用 Tauri，增加以下能力：

| 能力 | 说明 | Tauri 插件 |
|------|------|------------|
| Global Shortcut | 全局快捷键 | `tauri-plugin-global-shortcut`（已有） |
| Notification | 桌面通知 | `tauri-plugin-notification`（已有） |
| Tray | 系统托盘 | Tauri 核心 `tray-icon` feature（已有） |
| Autostart | 开机自启 | `tauri-plugin-autostart` |
| Single Instance | 单实例运行 | `tauri-plugin-single-instance` |
| Updater | 自动更新 | `tauri-plugin-updater` |

---

#### C-18｜桌面端窗口

当前双窗口架构：

| 窗口 | label | 用途 |
|------|-------|------|
| Main | `main` | 完整工作台 |
| Quick Memo | `quick-memo` | 快速记录浮动窗口 |

未来可以增加：

| 窗口 | 用途 | 优先级 |
|------|------|--------|
| Quick Task | 快速新建任务 | P2（不要一开始开太多浮窗） |

---

### 3.7 错误恢复与测试

#### C-19｜错误恢复

当前已有：ErrorBoundary + 数据完整性检查。

#### 升级为完整恢复流程

```
DB corrupted
    ↓
自动备份（立即导出当前数据快照）
    ↓
恢复界面（展示可用的备份列表）
    ↓
选择最近正常版本
    ↓
恢复并验证
```

---

#### C-20｜测试体系

至少三层测试：

#### Unit 单元测试

测试纯逻辑，无副作用：
- 周期规则生成
- 闪卡调度算法
- 日期计算
- 统计聚合

#### Integration 集成测试

测试模块间数据流：
- Task → Review（任务完成影响复盘数据）
- Pomodoro → Study（番茄钟影响学习统计）
- Flashcard → Knowledge（闪卡复习影响知识点掌握度）

#### E2E 端到端测试

测试完整用户流程：
- 新建任务 → 完成 → 今日首页更新 → 复盘数据可用

---

### 3.8 性能

#### C-21｜性能：Query-based Loading

**问题**：当前页面大量通过 Store `loadXxx()` 加载全量数据，规模扩大后容易出现重复读取。

**升级为查询式加载**：

```typescript
// ❌ 当前：加载全库
await loadAllTasks()

// ✅ 优化：按需查询
getTodayTasks()           // 仅查询今日任务
getDueFlashcards()        // 仅查询到期闪卡
getCurrentWeekMetrics()   // 仅查询本周统计
```

Store 内部使用 Dexie 的索引查询（`where()`、`filter()`），而非 `toArray()` 全表加载。

---

#### C-22｜分页 / 虚拟列表

未来大量数据的页面支持：

| 页面 | 数据量 | 方案 |
|------|--------|------|
| 错题 | 可能上千条 | Pagination / Virtual List |
| 笔记 | 可能上千条 | Pagination / Virtual List |
| 闪卡 | 可能上千条 | Virtual List（复习时按队列加载） |
| 复盘 | 随时间增长 | Pagination |

---

#### C-23｜数据索引优化

Dexie schema 需要重点索引以下字段，避免全表扫描：

| 字段 | 表 | 查询场景 |
|------|-----|----------|
| `dueDate` | tasks | 今日任务、未来任务 |
| `nextReviewAt` | flashcards | 到期闪卡 |
| `subject` | flashcards / mistakes | 按学科筛选 |
| `knowledgeId` | flashcards | 知识点关联闪卡 |
| `projectId` | tasks | 项目下任务 |
| `createdAt` | 多表 | 按时间排序 |
| `updatedAt` | notes / tasks | 最近编辑 |

---

### 3.9 主题系统

#### C-24｜主题系统代码化

不要写 `background: #xxx` 到处散落。

#### 统一 CSS 变量

```css
:root {
  --color-bg:           /* 背景 */
  --color-surface:      /* 表面 */
  --color-text:         /* 文字 */
  --color-border:       /* 边框 */
  --color-accent:       /* 强调色 */
}
```

#### 主题类名

```
theme-mist     /* 晨雾书房 */
theme-fluent   /* Windows Fluent */
theme-night    /* 深色夜航 */
theme-data     /* 数据驾驶舱 */
```

通过在根元素切换 `data-theme` 属性或 class 来切换主题。

---

### 3.10 目录整理

#### C-25｜最终代码目录

建议最终整理为：

```
src/
├── app/              # 应用入口、路由、全局 Provider
├── components/       # 通用组件（UI + 业务）
├── pages/            # 页面组件
├── stores/           # Zustand 状态管理（统一目录）
├── domain/           # 领域逻辑层（纯函数、可测试）
├── db/               # Dexie 数据库定义、迁移、备份
├── hooks/            # 自定义 React Hooks
├── types/            # TypeScript 类型定义
├── styles/           # 全局样式、主题变量、动画
├── utils/            # 工具函数
├── desktop/          # Tauri 桌面集成（窗口、通知、事件）
└── tests/            # 测试文件
```

---

## 4. 目标架构：分层与目录

### 4.1 分层架构图

```
┌─────────────────────────────────────────────────────┐
│                    Pages 页面层                       │
│         (React 组件，只渲染 + 调用 Store Action)      │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                   Stores 状态层                       │
│         (Zustand，持有状态 + 发布 Action)             │
└───────────┬───────────────────────┬─────────────────┘
            │                       │
┌───────────▼─────────┐  ┌────────▼──────────────────┐
│   Domain 领域层      │  │    Event Bus 事件总线      │
│  (纯函数逻辑：调度、  │  │  (task.completed 等事件，   │
│   聚合、规则引擎)     │  │   跨模块解耦通信)          │
└───────────┬─────────┘  └────────┬──────────────────┘
            │                       │
┌───────────▼───────────────────────▼─────────────────┐
│                    DB 数据层                          │
│         (Dexie / IndexedDB + OPFS 附件)              │
└───────────────────────────────────────────────────────┘
```

### 4.2 数据流

```
用户操作
   ↓
Page 调用 Store Action
   ↓
Store Action 调用 Domain Logic（纯函数计算）
   ↓
Store Action 写入 DB
   ↓
Store 更新内存状态 → React 重渲染
   ↓
Store 发布 AppEvent → 其他订阅者更新
```

### 4.3 目录结构

```
src/
├── app/
│   ├── App.tsx              # 根组件、路由配置
│   ├── main.tsx             # 入口引导
│   └── providers/           # 全局 Provider（Toast、ErrorBoundary）
│
├── components/
│   ├── ui/                  # 基础 UI 组件（Button、Card、Modal...）
│   ├── layout/              # 布局组件（Sidebar、AppLayout...）
│   └── business/            # 业务组件（TaskItem、FlashcardCard...）
│
├── pages/
│   ├── today/
│   ├── plan/
│   ├── study/
│   ├── record/
│   ├── review/
│   ├── tools/
│   ├── quickmemo/
│   ├── SettingsPage.tsx
│   └── VaultPage.tsx
│
├── stores/                   # 统一目录（原 store/ + stores/ 合并）
│   ├── systemStore.ts
│   ├── taskStore.ts
│   ├── recurringStore.ts
│   ├── projectStore.ts
│   ├── recordStore.ts
│   ├── studyStore.ts
│   ├── flashcardStore.ts
│   ├── reviewStore.ts
│   └── toolStore.ts
│
├── domain/                   # 新增：领域逻辑层
│   ├── planning/
│   │   ├── recurringGenerator.ts
│   │   └── taskScheduler.ts
│   ├── study/
│   │   ├── studyMetrics.ts
│   │   └── knowledgeGraph.ts
│   ├── review/
│   │   └── reviewAggregator.ts
│   ├── flashcard/
│   │   └── flashcardScheduler.ts
│   └── events/
│       └── eventBus.ts
│
├── db/
│   ├── database.ts           # Dexie 定义
│   ├── migration.ts          # 数据迁移
│   └── backup.ts             # 备份恢复
│
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useDesktopNotifications.ts
│   └── ...
│
├── types/
│   └── index.ts              # 全局类型定义
│
├── styles/
│   ├── global.css
│   ├── theme.css             # 四套主题变量
│   └── animations.css
│
├── utils/
│   ├── helpers.ts
│   ├── desktop.ts
│   └── errorRecovery.ts
│
├── desktop/                  # Tauri 桌面集成
│   ├── window.ts             # 窗口管理
│   ├── notification.ts       # 通知
│   ├── tray.ts               # 托盘
│   └── shortcuts.ts          # 快捷键
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 5. 状态管理规范

### 5.1 Store 职责

| 职责 | 说明 |
|------|------|
| 持有状态 | 内存中的数据副本 |
| 提供 Action | 对状态的修改入口 |
| 持久化 | Action 内部调用 DB 写入 |
| 发布事件 | 状态变更后发布 AppEvent |
| 派生查询 | 提供基于当前状态的计算方法 |

### 5.2 Store 不做的事

- ❌ 不包含复杂业务逻辑（移到 Domain Layer）
- ❌ 不直接被页面调用 DB
- ❌ 不互相直接调用（通过 Event Bus 解耦）
- ❌ 不在 Action 中做 UI 相关操作

### 5.3 Store Action 模板

```typescript
interface TaskState {
  tasks: Task[]
  loading: boolean

  // Actions
  loadTasks: () => Promise<void>
  addTask: (task: Partial<Task> & { title: string }) => Promise<void>
  toggleDone: (id: string) => Promise<void>

  // Derived queries
  getTodayTasks: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  toggleDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const done = !task.done
    // 1. 写入 DB
    await db.tasks.update(id, { done, updatedAt: new Date().toISOString() })
    // 2. 更新内存状态
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, done, updatedAt: new Date().toISOString() } : t,
      ),
    }))
    // 3. 发布事件（如果完成）
    if (done) {
      eventBus.publish({
        type: 'task.completed',
        taskId: id,
        completedAt: new Date().toISOString(),
      })
    }
  },

  getTodayTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => t.dueDate === today && !t.done)
  },
}))
```

---

## 6. Domain Layer 领域逻辑层

### 6.1 设计原则

- **纯函数**：输入确定，输出确定，无副作用
- **可测试**：不依赖 React、DB、浏览器 API
- **可组合**：小函数组合成复杂逻辑
- **与 Store 分离**：Store 调用 Domain，Domain 不依赖 Store

### 6.2 核心模块

#### `domain/flashcard/flashcardScheduler.ts`

```typescript
import type { ReviewRating, FlashcardSchedule } from '@/types'

/**
 * 闪卡间隔重复调度（简化版 SM-2）
 * 根据评价计算下次复习时间和间隔
 */
export function scheduleFlashcard(
  current: FlashcardSchedule,
  rating: ReviewRating,
): FlashcardSchedule {
  const now = new Date()
  let { interval, easeFactor, consecutiveCorrect } = current

  switch (rating) {
    case 'forgot':
      interval = 1
      consecutiveCorrect = 0
      easeFactor = Math.max(1.3, easeFactor - 0.2)
      break
    case 'fuzzy':
      interval = 3
      consecutiveCorrect = 0
      easeFactor = Math.max(1.3, easeFactor - 0.1)
      break
    case 'got':
      interval = consecutiveCorrect === 0 ? 7 : Math.round(interval * easeFactor)
      consecutiveCorrect += 1
      break
    case 'mastered':
      interval = consecutiveCorrect === 0 ? 14 : Math.round(interval * easeFactor * 1.2)
      consecutiveCorrect += 1
      easeFactor = Math.min(2.5, easeFactor + 0.1)
      break
  }

  const nextReviewAt = new Date(now.getTime() + interval * 86400000).toISOString()

  return {
    ...current,
    interval,
    easeFactor,
    consecutiveCorrect,
    nextReviewAt,
    lastReviewedAt: now.toISOString(),
    reviewCount: current.reviewCount + 1,
  }
}
```

#### `domain/planning/recurringGenerator.ts`

```typescript
import type { RecurringTask, Task } from '@/types'
import { uid, formatDate } from '@/utils/helpers'

/**
 * 根据周期规则生成指定日期的任务
 * @returns 新生成的 Task 数组（已存在的不重复生成）
 */
export function generateTasksForDate(
  rules: RecurringTask[],
  date: Date,
  existingTaskSourceIds: string[],
): Task[] {
  const dateStr = formatDate(date)
  const newTasks: Task[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (rule.startDate && dateStr < rule.startDate) continue
    if (rule.endDate && dateStr > rule.endDate) continue

    // 检查该规则今天是否已生成过
    if (existingTaskSourceIds.includes(rule.id)) continue

    // 判断规则是否匹配今天
    if (!matchesRule(rule, date)) continue

    newTasks.push({
      id: uid(),
      title: rule.title,
      priority: rule.priority,
      done: false,
      note: '',
      projectId: '',
      dueDate: dateStr,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceRecurringId: rule.id,
    })
  }

  return newTasks
}

function matchesRule(rule: RecurringTask, date: Date): boolean {
  const { rule: r } = rule
  switch (r.type) {
    case 'daily':
      return true
    case 'weekly':
      return r.daysOfWeek?.includes(date.getDay()) ?? false
    case 'monthly':
      const day = date.getDate()
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      if (r.daysOfMonth?.includes(day)) return true
      if (r.daysOfMonth?.includes(-1) && day === lastDay) return true
      return false
    case 'custom':
      if (!r.intervalDays || !rule.startDate) return false
      const diff = Math.floor(
        (date.getTime() - new Date(rule.startDate).getTime()) / 86400000,
      )
      return diff >= 0 && diff % r.intervalDays === 0
    default:
      return false
  }
}
```

#### `domain/review/reviewAggregator.ts`

```typescript
import type { Task, PomodoroLog, Mistake, FlashcardReview, Exam, Reading } from '@/types'
import type { DailyMetrics, SubjectMetrics, WeeklyMetrics } from '@/types'

/**
 * 复盘数据聚合器
 * 从原始数据计算出复盘页面需要的指标
 */
export class ReviewAggregator {
  constructor(
    private tasks: Task[],
    private pomodoros: PomodoroLog[],
    private mistakes: Mistake[],
    private flashcardReviews: FlashcardReview[],
    private exams: Exam[],
    private readings: Reading[],
  ) {}

  /** 计算单日指标 */
  getDailyMetrics(date: string): DailyMetrics {
    const dayTasks = this.tasks.filter((t) => t.dueDate === date)
    const dayPomodoros = this.pomodoros.filter((p) => p.date === date)
    const dayMistakes = this.mistakes.filter((m) => m.createdAt.startsWith(date))
    const dayReviews = this.flashcardReviews.filter((r) => r.reviewedAt.startsWith(date))

    return {
      date,
      tasksTotal: dayTasks.length,
      tasksCompleted: dayTasks.filter((t) => t.done).length,
      studyDuration: dayPomodoros.reduce((sum, p) => sum + p.duration, 0),
      pomodoroCount: dayPomodoros.length,
      mistakesCreated: dayMistakes.length,
      flashcardsReviewed: dayReviews.length,
      flashcardsCorrect: dayReviews.filter((r) => r.rating === 'got' || r.rating === 'mastered').length,
    }
  }

  /** 计算单学科指标 */
  getSubjectMetrics(subjectId: string, startDate: string, endDate: string): SubjectMetrics {
    // 按学科和时间范围筛选并计算...
    throw new Error('Not implemented')
  }

  /** 计算周指标 */
  getWeeklyMetrics(weekStart: string, weekEnd: string): WeeklyMetrics {
    // 遍历一周每天，聚合...
    throw new Error('Not implemented')
  }
}
```

---

## 7. Event Bus 事件总线

### 7.1 设计

简单的发布-订阅模式，不引入额外依赖。

```typescript
// domain/events/eventBus.ts

export type AppEvent =
  | { type: 'task.completed'; taskId: string; completedAt: string }
  | { type: 'task.created'; taskId: string }
  | { type: 'pomodoro.completed'; duration: number; taskId?: string }
  | { type: 'flashcard.reviewed'; flashcardId: string; rating: ReviewRating }
  | { type: 'mistake.created'; mistakeId: string; subject: string }
  | { type: 'exam.created'; examId: string }
  | { type: 'review.completed'; reviewId: string; type: ReviewType }
  | { type: 'recurring.generated'; ruleId: string; taskIds: string[] }

type EventHandler = (event: AppEvent) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  /** 订阅事件 */
  subscribe(type: AppEvent['type'], handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    // 返回取消订阅函数
    return () => this.handlers.get(type)?.delete(handler)
  }

  /** 发布事件 */
  publish(event: AppEvent): void {
    const handlers = this.handlers.get(event.type)
    if (!handlers) return
    handlers.forEach((handler) => {
      try {
        handler(event)
      } catch (err) {
        console.error(`[EventBus] Handler error for ${event.type}:`, err)
      }
    })
  }
}

export const eventBus = new EventBus()
```

### 7.2 事件订阅示例

```typescript
// 在 Store 初始化时订阅
function setupEventSubscriptions() {
  // 任务完成 → 更新项目进度
  eventBus.subscribe('task.completed', async ({ taskId }) => {
    const task = await db.tasks.get(taskId)
    if (task?.projectId) {
      await updateProjectProgress(task.projectId)
    }
  })

  // 闪卡复习 → 更新知识点掌握度
  eventBus.subscribe('flashcard.reviewed', async ({ flashcardId, rating }) => {
    const card = await db.flashcards.get(flashcardId)
    if (card?.knowledgeId) {
      await updateKnowledgeMastery(card.knowledgeId, rating)
    }
  })
}
```

---

## 8. Review Aggregator 复盘聚合器

### 8.1 职责

从原始数据表（Task / Pomodoro / Mistake / Flashcard / Exam / Reading）聚合出复盘页面需要的指标。

### 8.2 输出类型

```typescript
interface DailyMetrics {
  date: string
  tasksTotal: number
  tasksCompleted: number
  studyDuration: number       // 分钟
  pomodoroCount: number
  mistakesCreated: number
  flashcardsReviewed: number
  flashcardsCorrect: number
}

interface SubjectMetrics {
  subjectId: string
  subjectName: string
  studyDuration: number
  taskCompletionRate: number
  newMistakes: number
  flashcardReviews: number
  weakKnowledgePoints: string[]
}

interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  totalStudyDuration: number
  totalTasksCompleted: number
}

interface MonthlyMetrics {
  month: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  heatmapData: Record<string, number>  // date → study minutes
  totalStudyDuration: number
}

interface ExamMetrics {
  examId: string
  examName: string
  totalScore: number
  rank: number
  subjectScores: Record<string, number>
  comparedToPrevious: { difference: number; trend: 'up' | 'down' | 'same' }
}
```

### 8.3 使用方式

页面不直接查询多张表做计算，而是调用聚合器：

```typescript
// 在 reviewStore 中
async function loadDailyReview(date: string) {
  const [tasks, pomodoros, mistakes, reviews] = await Promise.all([
    db.tasks.toArray(),
    db.pomodoroLogs.toArray(),
    db.mistakes.toArray(),
    db.flashcardReviews.toArray(),
  ])

  const aggregator = new ReviewAggregator(tasks, pomodoros, mistakes, reviews, [], [])
  const metrics = aggregator.getDailyMetrics(date)
  set({ dailyMetrics: metrics })
}
```

---

## 9. 数据库 Schema 规划

### 9.1 完整表清单（23 张）

| 表名 | 主键 | 索引 | 新增 | 用途 |
|------|------|------|------|------|
| `tasks` | ++id | dueDate, priority, done, pinned, projectId | | 任务 |
| `recurringTasks` | ++id | enabled | | 周期任务规则 |
| `projects` | ++id | stage | | 项目 |
| `memos` | ++id | createdAt | | 备忘录 |
| `notes` | ++id | notebook, favorite, updatedAt | | 笔记 |
| `flashcards` | ++id | subject, chapter, knowledgeId, nextReviewAt | | 闪卡 |
| `flashcardReviews` | ++id | flashcardId, reviewedAt | | 闪卡复习记录 |
| `subjects` | ++id | | | 学科（含章节/知识点） |
| `mistakes` | ++id | subject, mastered | | 错题 |
| `exams` | ++id | date | | 考试 |
| `reviews` | ++id | type | | 复盘（保留兼容） |
| `reviewTemplates` | ++id | type | | 复盘模板 |
| `reading` | ++id | pinned | | 阅读进度 |
| `finance` | ++id | type, date | | 记账 |
| `countdowns` | ++id | showOnHome | | 倒数日 |
| `pomodoroLogs` | ++id | date | | 番茄钟记录 |
| `vault` | ++id | | | 密码本 |
| `settings` | &key | | | 键值设置 |
| `knowledgeRelations` | ++id | knowledgeId, type, targetId | ✅ | 知识点关联 |
| `reviewEntries` | ++id | type, templateId, dateRange | ✅ | 复盘回答条目 |
| `studySessions` | ++id | subjectId, startedAt, endedAt | ✅ | 学习会话 |
| `appEvents` | ++id | type, timestamp | ✅ | 事件日志 |

### 9.2 新增表结构

#### `knowledgeRelations`

```typescript
interface KnowledgeRelation {
  id: string
  knowledgeId: string
  type: 'mistake' | 'flashcard' | 'note' | 'reading'
  targetId: string
  createdAt: string
}
```

#### `reviewEntries`

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
  autoSummary: any
  createdAt: string
}
```

#### `studySessions`

```typescript
interface StudySession {
  id: string
  subjectId?: string
  taskId?: string
  startedAt: string
  endedAt: string
  duration: number  // 分钟
  note: string
}
```

#### `appEvents`

```typescript
interface AppEventLog {
  id: string
  type: string
  payload: any
  timestamp: string
}
```

### 9.3 版本迁移

Dexie 版本升级：

```typescript
// 当前 version 1 → 升级为 version 2
this.version(2).stores({
  // 原有表保持
  tasks: '++id, dueDate, priority, done, pinned, projectId',
  // ...
  // 新增表
  knowledgeRelations: '++id, knowledgeId, type, targetId',
  reviewEntries: '++id, type, templateId',
  studySessions: '++id, subjectId, startedAt',
  appEvents: '++id, type, timestamp',
}).upgrade(async (tx) => {
  // 数据迁移逻辑：将旧 reviews 表数据迁移到 reviewEntries
  // ...
})
```

---

## 10. 数据备份与恢复

### 10.1 备份体系

| 功能 | 实现 |
|------|------|
| 自动备份 | 每日触发，保留最近 7 份 |
| 手动备份 | 设置页按钮立即触发 |
| 备份历史 | 列出 `backup/` 目录下所有文件 |
| 恢复 | 选择备份文件，事务内清空并重写 |
| 校验 | 备份文件包含 checksum，恢复前验证 |
| 版本号 | 备份 JSON 顶层包含 `version` 字段 |

### 10.2 备份文件格式

```json
{
  "version": 2,
  "exportedAt": "2026-08-23T10:00:00.000Z",
  "checksum": "sha256:...",
  "data": {
    "tasks": [...],
    "notes": [...],
    "flashcards": [...],
    "...": "..."
  }
}
```

### 10.3 密码本排除

普通数据导出默认排除 `vault` 表。如需导出密码本，需单独操作并输入主密码加密。

---

## 11. 桌面端 Tauri 架构

### 11.1 插件清单

| 插件 | 用途 | 状态 |
|------|------|------|
| `tauri-plugin-global-shortcut` | 全局快捷键 | 已有 |
| `tauri-plugin-notification` | 桌面通知 | 已有 |
| `tray-icon` (Tauri core feature) | 系统托盘 | 已有 |
| `tauri-plugin-autostart` | 开机自启 | 待加 |
| `tauri-plugin-single-instance` | 单实例 | 待加 |
| `tauri-plugin-updater` | 自动更新 | 待加 |

### 11.2 窗口管理

| 窗口 | label | 尺寸 | 特性 |
|------|-------|------|------|
| 主窗口 | `main` | 1280×800 | 可调整大小、最小 960×640 |
| 快捷备忘 | `quick-memo` | 440×320 | 无边框、置顶、不可调整、默认隐藏、不显示任务栏 |

### 11.3 全局快捷键

| 快捷键 | 注册位置 | 功能 |
|--------|----------|------|
| `Ctrl+Shift+Space` | Rust (OS 级) | 唤起快捷备忘窗口 |
| `Ctrl+Alt+B` | Rust (OS 级) | 显示/隐藏主窗口 |
| `Ctrl+K` | 前端 | 全局搜索 |
| `Ctrl+Shift+T` | 前端 | 新任务 |
| `Ctrl+Shift+F` | 前端 | 闪卡 |
| `Ctrl+Shift+R` | 前端 | 每日复盘 |

### 11.4 前后端通信

| 方式 | 用途 | 示例 |
|------|------|------|
| `invoke` | 前端调用 Rust 命令 | `invoke('quit_app')` |
| `emit` / `listen` | 事件通信 | 快捷备忘保存后通知主窗口刷新 |
| `emitTo` | 定向窗口事件 | `emitTo('main', 'wb-quick-memo-saved')` |

---

## 12. 错误恢复机制

### 12.1 恢复流程

```
启动时检测
   ↓
DB 可用性检查 (db.isAvailable())
   ↓
数据完整性校验 (checkDataIntegrity)
   ↓
┌─ 正常 → 继续启动
│
└─ 异常 → 自动备份当前数据（快照）
           ↓
         展示恢复界面
           ↓
         列出可用备份（含时间和校验状态）
           ↓
         用户选择版本 → 事务内恢复
           ↓
         验证恢复结果
```

### 12.2 完整性检查项

- [ ] IndexedDB 可用
- [ ] 所有表可正常读取
- [ ] 记录不为 null/undefined
- [ ] 记录有必需的 id 字段
- [ ] 外键关联有效（如 task.projectId 对应存在的项目）

### 12.3 React 错误边界

```
ErrorBoundary 捕获渲染异常
   ↓
展示降级 UI（错误信息 + 刷新按钮）
   ↓
记录错误日志
```

---

## 13. 测试体系

### 13.1 三层测试

| 层级 | 测试对象 | 工具 | 示例 |
|------|----------|------|------|
| **Unit** | 纯函数、Domain Logic | Vitest | 闪卡调度、周期生成、日期计算 |
| **Integration** | 模块间数据流 | Vitest + 内存 DB | Task→Review、Pomodoro→Study |
| **E2E** | 完整用户流程 | Playwright | 新建任务→完成→首页更新→复盘 |

### 13.2 Unit 测试重点

- `flashcardScheduler.ts` — 各评价等级的间隔计算
- `recurringGenerator.ts` — 每日/每周/每月/自定义规则的匹配
- `studyMetrics.ts` — 学习时长、完成率统计
- `reviewAggregator.ts` — 日/周/月指标聚合
- 日期工具函数 — formatDate、isToday、getDaysDiff

### 13.3 Integration 测试重点

- 任务完成 → 今日完成率更新 → 复盘数据可用
- 番茄钟完成 → 学习时长增加 → 学科统计更新
- 闪卡复习 → 知识点掌握度变化 → 薄弱知识点列表更新
- 错题创建 → 知识点 weakness score 增加 → 学科复盘数据变化

### 13.4 E2E 测试重点

- 新建任务 → 标记完成 → 今日首页显示完成 → 复盘页能看到数据
- 快捷备忘窗口 → 输入 → 保存 → 主窗口备忘录列表更新
- 闪卡复习 → 评价 → 下次复习时间更新 → 到期队列变化

---

## 14. 性能优化

### 14.1 Query-based Loading

| 当前方式（问题） | 优化方式 |
|------------------|----------|
| `loadAllTasks()` 全表加载 | `getTodayTasks()` 按 dueDate 索引查询 |
| `loadAllFlashcards()` 全表加载 | `getDueFlashcards()` 按 nextReviewAt 查询 |
| 页面每次进入都 loadAll | Store 缓存 + 增量更新 |

### 14.2 Dexie 索引查询示例

```typescript
// ❌ 全表加载后过滤
const all = await db.tasks.toArray()
const today = all.filter((t) => t.dueDate === todayStr)

// ✅ 使用索引查询
const today = await db.tasks.where('dueDate').equals(todayStr).toArray()

// ✅ 复合条件
const pendingToday = await db.tasks
  .where('dueDate').equals(todayStr)
  .and((t) => !t.done)
  .toArray()
```

### 14.3 虚拟列表

大数据量页面（错题、笔记、闪卡列表）使用虚拟滚动，只渲染可视区域内的元素。

### 14.4 懒加载

- 页面组件：`React.lazy` + `Suspense`（已有）
- 图表库：ECharts 按需引入，不一次性加载全部图表类型
- 桌面 API：动态 `import('@tauri-apps/api/...')`，浏览器环境不加载

---

## 15. 主题系统代码化

### 15.1 CSS 变量体系

```css
/* styles/theme.css */

/* 晨雾书房（默认） */
:root, [data-theme='mist'] {
  --color-bg: #f5f8fc;
  --color-surface: #ffffff;
  --color-surface-2: #f8fafc;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-tertiary: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-focus: #6366f1;
  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
}

/* 深色夜航 */
[data-theme='night'] {
  --color-bg: #0d1117;
  --color-surface: #151b23;
  --color-surface-2: #1b2430;
  --color-text-primary: #e8edf4;
  --color-text-secondary: #9aa6b2;
  --color-text-tertiary: #6b7785;
  --color-border: #2a3441;
  --color-border-focus: #58a6ff;
  --color-accent: #58a6ff;
  --color-accent-hover: #79b8ff;
}

/* Windows Fluent */
[data-theme='fluent'] {
  --color-bg: #f3f3f3;
  --color-surface: rgba(255,255,255,0.7);
  --color-surface-2: rgba(249,249,249,0.8);
  --color-border: #e5e5e5;
  --color-accent: #0078d4;
  /* backdrop-filter: blur(20px); 半透明效果 */
}

/* 数据驾驶舱（复盘专用） */
[data-theme='data'] {
  --color-bg: #0a0e17;
  --color-surface: #111827;
  --color-accent: #22d3ee;
  --color-text-primary: #f0f9ff;
  /* 高对比度、数字强调 */
}
```

### 15.2 主题切换

```typescript
// stores/systemStore.ts
setTheme: (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('wb-theme', theme)
  set({ theme })
}
```

### 15.3 自动主题

```typescript
// 根据时间自动切换
function applyAutoTheme() {
  const hour = new Date().getHours()
  const theme = hour >= 6 && hour < 18 ? 'mist' : 'night'
  document.documentElement.setAttribute('data-theme', theme)
}
```

---

## 16. 执行顺序与优先级

### 第一批：P0（架构基础）

| 编号 | 任务 |
|------|------|
| C-02 | Store 规范统一（Page→Store→Domain→DB） |
| C-03 | Store 目录统一（合并 store/ 到 stores/） |
| C-04 | 新增 Domain Layer（领域逻辑层） |
| C-05 | Event Bus 事件总线 |
| C-10 | Review Aggregator 复盘聚合器 |
| C-11 | 数据库 Schema 升级（新增 4 表） |
| C-24 | 主题系统代码化（CSS 变量 + 四套主题） |

### 第二批：P1（事件联动与数据）

| 编号 | 任务 |
|------|------|
| C-06 | 番茄钟事件（PomodoroCompleted） |
| C-07 | 任务完成事件（TaskCompleted） |
| C-08 | 闪卡复习事件（FlashcardReviewed） |
| C-09 | 错题事件（MistakeCreated） |
| C-12 | Review 数据拆分（Template / Entry） |
| C-13 | 闪卡数据分离（内容 / 历史 / 调度） |
| C-14 | OPFS 附件存储 |
| C-15 | 数据备份体系升级 |
| C-17 | Tauri 插件增强（autostart / single-instance / updater） |

### 第三批：P2（质量与性能）

| 编号 | 任务 |
|------|------|
| C-19 | 错误恢复机制升级 |
| C-20 | 测试体系（Unit / Integration / E2E） |
| C-21 | 性能：Query-based Loading |
| C-22 | 分页 / 虚拟列表 |
| C-23 | 数据索引优化 |
| C-25 | 最终目录整理 |
