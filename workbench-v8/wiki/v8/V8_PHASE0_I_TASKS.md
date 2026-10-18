# V8 PHASE 0 — I-Task 清单

> 文档性质：Phase 0 交付物 · 施工任务登记（非执行）
> 生成时间：2026-08-23
> 说明：本清单只登记"做什么"，不进入 Phase 1 施工。每条按 `V8_MASTER_PLAN_v1.1` §30 标准给出 Goal / Related / Files / Dependencies / Implementation / Test / Acceptance / Rollback。
> 映射：C = CODE_SPEC，W = WORK，D = DESIGN。Target Phase 对应 v1.1 的 Phase 编号。

---

## 立即收口（Phase 0 内，进入 Phase 1 前）

### I-001 · 安全快照 + build 基线（暂停普通导出）
- **Related**：C-01；安全导出约束（Phase 0 裁决 #3）
- **Files / Modules**：`git` 仓库、`dist/`、`src/db/database.ts`
- **执行结果（Gate 0）**：
  - **I-001A build** ✅ PASS（`tsc && vite build`，exit 0，750 模块，1.76s；1 条非阻塞 chunk>500kB 告警）。
  - **I-001C migration 样本** ⚠️ 运行时级被环境阻塞（`migrateFromV5` 依赖 `localStorage`+IndexedDB，Node 无 IndexedDB 且无 fake-indexeddb/vitest 测试底座）；静态核验完成并发现 2 项异常（见下）。
  - **I-001B 安全快照** ⚠️ 阻塞：无 IndexedDB 运行时；且 `exportAllData()` 当前含 `vault`，不可作安全快照工具，归 C-15 实施。
- **Goal**：Phase 0「可回退快照 + build 基线 + 安全快照 + 验证 V5→V8 迁移」；**暂停普通 `db.exportAllData()`（当前含 vault）**。
- **Implementation**：`git status`/`git diff` 确认工作区；`npm run build`（tsc && vite build）记录通过/失败；**安全快照仅对非敏感表（排除 vault）** 或仅记录 schema/表清单为基线；对 V5 localStorage 样本跑 `migrateFromV5()` 验证记录数与关键字段。
- **Test**：build 成功；安全快照不含 vault；迁移前后记录数一致。
- **Acceptance**：满足 `V8_MASTER_PLAN_v1.2` §5 Gate 0；vault 不进入普通快照/备份。
- **Rollback**：`git` 工作区未提交前可 `restore`；快照为只读副本。

### I-002 · 补齐 V8_MASTER_PLAN_v1.2 与 ERRATA-01~04 文档 ✅ 已完成
- **Related**：C-01；跨 SPEC 表述收敛
- **Status**：已完成（Phase 0 裁决 #1）
- **产物**：`wiki/V8_MASTER_PLAN_v1.2.md`、`wiki/ERRATA-01~04.md`
- **Acceptance**：ERRATA-01~04 有正式条目；DESIGN_SPEC / CODE_SPEC 口径据此收敛；不改产品语义。
- **Rollback**：文档级，可回退版本。

---

## Phase 1 首任务（迁移安全契约，放行前置）

> 排序约束：**I-012 必须先于 Dexie v2 迁移（I-006）**；禁止带病数据迁移进入 v2。

### I-012 · 修复 V5→V8 Vault 迁移安全（P0，迁移前置）
- **Related**：C-16；V8_GLOBAL §12/§13；RISK-15
- **Files / Modules**：`src/db/migration.ts`、`src/utils/vaultCrypto.ts`
- **Goal**：V5 vault 密码不得以明文落入 V8 vault 表。
- **Implementation**：迁移 vault 时按主密码加密并生成 `passwordIv`；或显式策略（跳过+标记待处理/降级提示）。不得明文落库。
- **Test**：迁移样本 vault 记录含密文 + iv；解密往返通过。
- **Acceptance**：V5 vault 迁移后无明文密码；与 VaultPage 解密契约一致。
- **Rollback**：迁移前快照；失败保留快照。

### I-013 · 补 Review.answers 迁移
- **Related**：C-12；RISK-16
- **Files / Modules**：`src/db/migration.ts`
- **Goal**：V5 review → V8 `Review.answers` 补默认映射。
- **Implementation**：`answers: r.answers || {}`。
- **Test**：迁移样本含 `answers` 字段。
- **Acceptance**：迁移后 `Review.answers` 非 `undefined`。
- **Rollback**：迁移前快照。

### I-014 · Review Metrics 五类型契约
- **Related**：C-10；ERRATA-04
- **Files / Modules**：`src/types/index.ts`
- **Goal**：冻结 5 类指标类型契约。
- **Implementation**：新增 `DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics`；`ReviewEntry.autoSummary` 联合由 `any` 扩为 5 类。
- **Test**：`tsc` 类型检查通过。
- **Acceptance**：CODE_SPEC §3.2 口径与 5 类契约一致；后续 I-007 聚合器按此契约实现。
- **Rollback**：类型层，可回退。

---

## Phase 1（Design Foundation + 主题工程基础）

### I-003 · 四套主题代码化（Global Theme + 页面级 review-data）
- **Related**：C-24；D-01/D-03/D-05/D-06；ERRATA-01
- **Files / Modules**：`src/styles/theme.css`、`src/store/systemStore.ts`、`src/types/index.ts`（Theme 枚举）
- **Goal**：`data-theme` 三全局主题 `mist/fluent/night` + 页面级 `review-data`；兼容旧 `dark→night`。
- **Implementation**：Theme 从 `'light'|'dark'` 扩展；`setTheme` 写 `data-theme`；复盘周/月/考试页挂 `review-data` scope。
- **Test**：切换三主题 + F 不出现在普通选择器；`dark` 旧值映射 `night`。
- **Acceptance**：v1.1 §8 Gate 1。
- **Rollback**：CSS 变量迁移可逆；`Theme` 枚举保留旧值兼容。

### I-004 · Token 命名统一迁移 + 双层 Accent
- **Related**：D-07/D-08；ERRATA-02/ERRATA-03
- **Files / Modules**：`src/styles/theme.css` + 全部 `*.module.css`
- **Goal**：旧命名（`--page-bg` 等）→ `--color-*`；新增 `--color-surface-2 / --space-* / --font-* / --transition-slow`；引入 `--color-accent-brand` + `--color-accent-theme`。
- **Implementation**：PLAN 阶段先冻结色值；一次性全量重命名，不留新旧并存。
- **Test**：全站无残留旧变量；四主题各 accent 生效。
- **Acceptance**：DESIGN_SPEC §19 验收 1（token 完整、四主题共用同构）。
- **Rollback**：保留旧变量别名作为过渡（短期）。

---

## Phase 3（工程分层 + 测试基础）

### I-005 · 目录统一 + Domain 层 + Event Bus + Vitest
- **Related**：C-02/C-03/C-04/C-05/C-25/C-20
- **Files / Modules**：`src/store/`→`src/stores/`；新增 `src/domain/`、`src/events/`、`src/tests/`；`src/app/`
- **Goal**：`stores/` 唯一；`Page → Store → Domain → DB`；Event Bus API 可用；Vitest 可执行。
- **Implementation**：迁移 `systemStore`；建 `domain/planning|study|review|flashcard|events`；Event Bus 机制（此 Phase 不要求全量业务接入）。
- **Test**：首批单测 `recurringGenerator / taskScheduler / flashcardScheduler / reviewAggregator`。
- **Acceptance**：v1.1 §10 Gate 3；页面不再直接 `db.*`（vault 页例外，另见 I-007）。
- **Rollback**：`store/` 删除前保留副本；分层为增量，可回退。

---

## Phase 4（Dexie Version 2 Migration）

### I-006 · version 2 迁移（+4 表 + 补索引 + Review/Flashcard 语义转换）
- **Related**：C-11/C-12/C-13；W-14/W-16
- **Files / Modules**：`src/db/database.ts`、`src/types/index.ts`
- **Goal**：18→22 张；`knowledgeRelations / reviewEntries / studySessions / appEvents`；补 `tasks.createdAt`、`mistakes.createdAt`；`reviews→reviewTemplates/reviewEntries`；`Flashcard.mastery→FlashcardSchedule`（语义转换，禁字段直接搬家）。
- **Implementation**：快照 → 建 schema → 迁移 Review → 核验 → 迁移 Flashcard → 核验 → 写剩余 → 终验；子步骤可定位。
- **Test**：正常/缺字段/空表/重复迁移/review mapping/flashcard mapping/失败恢复（v1.1 §11）。
- **Acceptance**：v1.1 §11 Gate 4（22 张结构正确、语义转换通过、V5→V8 仍可用、vault 未触碰）。
- **Rollback**：迁移失败保留原快照，停止后续写入，提供恢复路径。

---

## Phase 8（复盘系统）

### I-007 · Review Metrics 5 类型化 + ReviewAggregator
- **Related**：C-10；W-18/W-20/W-21/W-22；补齐 Monthly/Exam（BASELINE §8）
- **Files / Modules**：`src/types/index.ts`、`src/domain/review/reviewAggregator.ts`、`src/stores/reviewStore.ts`
- **Goal**：定义 `DailyMetrics/SubjectMetrics/WeeklyMetrics/MonthlyMetrics/ExamMetrics`；`getAutoSummary` 按 `type` 分支；下沉 Monthly/Exam 页面的内联计算。
- **Implementation**：`ReviewEntry.autoSummary` 联合扩为 5 种；aggregator 输出 monthly heatmap、exam 分数/排名/科目对比。
- **Test**：空数据/单日/学科/周/月/考试/时间边界（v1.1 §15）。
- **Acceptance**：v1.1 §15 Gate 8；`createdAt` 索引缺陷（RISK-04）已修。
- **Rollback**：`autoSummary` 先保留 `any` 兼容，聚合器纯函数可独立回退。

### I-008 · 复盘"下一步"出口（W-23）
- **Related**：W-23；D-13
- **Files / Modules**：`src/pages/review/*`、`src/stores/taskStore.ts`
- **Goal**：每份复盘末尾结构化"下一步"动作区，支持"创建任务/指定日期/回流计划"。
- **Implementation**：复用 `Review.nextActions`，页面渲染可编辑动作区，保存时经 Store 生成任务。
- **Acceptance**：v1.1 §15 Gate 8 闭环"执行→复盘→下一步→任务/计划"。
- **Rollback**：动作区为新增 UI，不影响既有复盘保存。

---

## Phase 6（学习 / 闪卡）

### I-009 · 闪卡导入完整化（学科/章节/知识点自动创建 + 局部失败报告）
- **Related**：W-15；D-12；C-13
- **Files / Modules**：`src/stores/flashcardStore.ts`、`src/stores/studyStore.ts`、`src/pages/study/FlashcardsPage.tsx`
- **Goal**：CSV/粘贴导入时自动匹配/创建学科·章节·知识点；批量结果"成功 N / 失败 M / 原因 / 可局部重试"。
- **Implementation**：导入时查/建 `subjects.chapters.topics`，回填 `knowledgeId`；逐行校验并累计失败原因。
- **Test**：CSV 成功导入、学科自动匹配、知识点自动创建、单行失败不阻塞、失败原因可读。
- **Acceptance**：v1.1 §13 Gate 6 + 例 I-XXX（W-15 验收）。
- **Rollback**：导入为增量新增，失败行不落库。

---

## Phase 11 / 15（备份 / 安全收口）

### I-010 · 备份体系升级 + vault 排除
- **Related**：C-15/C-16；V8_GLOBAL §11/§12
- **Files / Modules**：`src/db/backup.ts`、`src/db/database.ts`（`exportAllData`）
- **Goal**：`exportAllData`/备份显式排除 `vault`；补 checksum + 版本号 + 手动备份 + 历史 + 恢复入口。
- **Implementation**：`exportAllData` 默认排除 vault，新增 `exportVaultEncrypted()` 单独导出；备份 JSON 加 `version/exportedAt/checksum`。
- **Acceptance**：v1.1 §18 Gate 11（备份→校验→恢复→一致性）；密码本始终独立。
- **Rollback**：恢复走事务，失败可回退。

### I-011 · vault 加密逻辑抽取（行为不变）
- **Related**：C-16；CODE_SPEC §10 SHOULD
- **Files / Modules**：`src/utils/vaultCrypto.ts`（新）、`src/pages/VaultPage.tsx`
- **Goal**：PBKDF2+AES-GCM 抽取为独立模块，供复用与单测，行为不变。
- **Test**：加解密往返、改密重加密往返。
- **Acceptance**：密码本功能与导出排除不受影响。
- **Rollback**：抽函数为等价迁移，可回退内嵌实现。
