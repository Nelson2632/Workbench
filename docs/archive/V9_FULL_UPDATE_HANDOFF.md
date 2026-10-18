# V9 Personal OS 全量代码更新 · 执行交接令

> 用途：本文件是一份**自包含任务说明**，可原样交给一个新的执行 AI（它没有本会话的任何上下文）。
> 目标：把 V9 已完成的「参考实现」推广到整个代码库，让**全部实现**（而不只是被改过的文件）对齐 v1.7 冻结契约。

---

## 0. 先理解背景（读这些之前不要动手）

- 项目根目录：`D:\1 - Marty\diary\`
- V9 实现位于 `D:\1 - Marty\diary\workbench-v8\`，技术栈：React + TypeScript + Dexie(IndexedDB) + Tauri(Rust)。
- V9 已经历「Implementation Gap Audit → v1.6→v1.7 契约回写 → 11 条债务定点修复」。当前 11 条债务中 9 条已 done，2 条 partial（属阻塞项，**不要碰**，见 §5）。
- 「全量代码更新」= 把定点修复时做的「参考实现」推广到全量。核心缺口是：**Mutation Lane 只接线了 1 个 store**、**Journal 尚未与 domain 写原子化**、**Review 页尚未读投影**。

## 1. 唯一权威契约（先读这三份，顺序固定）

1. `D:\1 - Marty\diary\docs\V9-Personal-OS-v1.7.md` —— **唯一事实来源**。重点读：R1.1（三通道）、R1.8 的 R6-03/04/05/06、DP1.5（原子性与幂等）、G1.6（债务登记表，看哪些 done / partial）。
2. `D:\1 - Marty\diary\docs\V9_v1.7_CHANGE_RECORD.md` —— 变更历史与裁决记录。
3. `D:\1 - Marty\diary\docs\V9_IMPLEMENTATION_GAP_AUDIT.md` —— 审计结论与债务清单（了解全貌）。

## 2. 必读代码文件（照这些文件的样子做，不要另起炉灶）

**参考实现（先读懂，是你要推广的模板）：**
- `workbench-v8\src\db\mutationLane.ts` —— Mutation Lane（FIFO 串行队列 + `runCommand` 幂等）。这是 P1 的推广目标。
- `workbench-v8\src\stores\taskStore.ts` —— **唯一已接线的 store**。`addTask`/`toggleDone` 已用 `runCommand` 包裹，`mutate` 写 domain、`afterCommit` 发事件。P1 所有 store 照它改。
- `workbench-v8\src\utils\faultInjection.ts` —— 8 个故障注入 Hook（`fire/inject/enable`）。P2 会用到 `after_journal_write`。
- `workbench-v8\src\db\journal.ts` —— 现在 journal 走 `setupJournalSink`（fire-and-forget）。P2 要改它。
- `workbench-v8\src\db\database.ts` —— Dexie schema（version 6 加了 `systemCommandIds`，version 7 加了 `inboxItems`）。
- `workbench-v8\src\db\mutationLane.test.ts` + `workbench-v8\src\utils\faultInjection.test.ts` —— 已有测试的写法与断言口径。

**P1 要接线的 store（全部，逐个读 + 改）：**
`src\stores\` 下：`animeStore.ts`、`dailyMemoryStore.ts`、`diaryStore.ts`、`eventStore.ts`、`flashcardStore.ts`、`friendStore.ts`、`gameStore.ts`、`inboxStore.ts`（`addItem` 等未接线，`convertInboxItemToTask` 已接线）、`materialStore.ts`、`musicStore.ts`、`nightShutdownStore.ts`、`projectStore.ts`、`recordStore.ts`、`recurringStore.ts`、`reviewStore.ts`、`studyPlanStore.ts`、`studyStore.ts`、`systemStore.ts`、`timelineStore.ts`、`toolStore.ts`。
（`taskStore.ts` 已 done，跳过。）

**P3 要读的 Review 相关文件：**
- `workbench-v8\src\domain\review\reviewAggregator.ts` —— Review 投影（指标纯函数派生，已标注为 Projection）。
- `workbench-v8\src\stores\reviewStore.ts` —— 当前仍直读 `reviewEntries`。
- `workbench-v8\src\pages\review\*.tsx` —— DailyReview / SubjectReview / WeeklyReview / MonthlyReview / ExamReview / TemplatesPage。

## 3. 要做的四件事（按依赖顺序）

### P1 · Mutation Lane 全量推广（R6-03/04/05）
把 §2 列出的每个 store 的**写方法**（add/update/delete/toggle 等）全部用 `runCommand` 包裹：
- `commandType` 用 `域.动作` 命名（如 `diary.create`、`game.record`）。
- `commandId` 用能唯一标识该次写意图的稳定值（优先实体 id；无 id 时用自增/uid）。
- `tables` 填该写方法会写的表名。
- `mutate` 内只做 domain 写；`afterCommit` 内做 `set`（更新 zustand 状态）+ `eventBus.publish`。
- 只读方法（load/get/filter）**不要**接线。

### P2 · R6-06 原子 Journal
当前 `journal.ts` 的 `setupJournalSink` 在 EventBus 事件上 fire-and-forget 写 `operationJournal`，与 domain 写不在同一事务。
要求：把 journal 写移进 `mutationLane.runCommand` 的事务里（domain + commandId + journal 三写原子），并重构 `setupJournalSink` 避免重复写。注意 `faultInjection.fire('after_journal_write')` 的语义应落在「journal 已写、外层事务未提交」的点上。
> 这是四件事里唯一有设计味的一件，先写方案再动手。

### P3 · Review 读投影
把 `src\pages\review\*.tsx` 的读取从直读 `reviewEntries` 切到 `reviewAggregator`（投影）。指标读投影，用户撰写的正文/模板保持现状（不要动 reviewTemplates，见 §5 约束 1）。

### P4/P5 · 两个 partial 阻塞项（**跳过，不要做**）
见 §5。

## 4. 验证门禁（每完成一个 P 必须全绿，才能进下一个）

在 `D:\1 - Marty\diary\workbench-v8\` 下执行：
```bash
npx tsc --noEmit          # 类型检查
npx vitest run --reporter=dot   # 全量单测（当前 42 文件 / 267 测试）
cargo check               # 仅当改了 src-tauri\ 时（在 src-tauri\ 下跑）
```

## 5. 硬约束（绝对不能做）

1. **不要迁移 `reviewTemplates`**（Debt-DO-03，Architecture Decision Required）——其归属（Domain vs system_preferences）尚未裁决，未裁决前不得改、不得标 Closed。
2. **不要全量替换 `--space-1..8`**（Debt-UI-02，Visual Migration Pending）——契约尺不是旧 token 的一一映射，必须先建「历史 token → 语义尺」映射表 + 视觉回归，禁止搜 `--space-*` 全局替换。
3. **不要改 v1.7 契约**（`docs/V9-Personal-OS-v1.7.md`）。任何契约变更走 Governance 评审。
4. **不要绕过 `runCommand` 直写 db**——P1 之后所有 domain mutation 必须经 Mutation Lane。
5. **保持测试口径**：改 store 时同步更新受影响的测试断言，不要删测试掩盖回归。

## 6. 完成标准

- 三个 P 全部完成，且每个 P 后 `tsc` + 全量 `vitest` 绿。
- 无新增对 `db.*.add/update/delete` 的直写（Mutation 路径全部经 Lane）。
- 两个 partial 阻塞项保持原状，并在提交说明中注明「DO-03/UI-02 未动，属待裁决/待迁移」。
