# V8 PHASE 0 — 风险清单（Risks）

> 文档性质：Phase 0 交付物 · 只读核验产物
> 生成时间：2026-08-23
> 关联：`V8_PHASE0_BASELINE.md`
> 裁决同步：Phase 0 裁决已冻结（见 `V8_MASTER_PLAN_v1.2.md`）。RISK-01 / RISK-02 / RISK-06 已解除；RISK-05 转 C-15 实施项。
> Gate 0 放行（附条件）：新增迁移异常风险 RISK-15（vault 明文，P0）/ RISK-16（Review.answers，P1）；I-012 为迁移前置。

---

## 风险分级说明

- **P0 / 阻塞**：阻断进入 Phase 1 或会造成数据丢失、产品语义被改。
- **P1 / 高**：Phase 0 后首个施工窗口必须处理。
- **P2 / 中**：按 Plan 既定 Phase 处理，不阻塞当前推进。

---

## 阻塞项（P0）

### RISK-01 · 上游实施文档缺失，ERRATA 无法逐条核验

- 现象：`V8_MASTER_PLAN_v1.2.md` 与 `ERRATA-01~03` 正式文档均不存在（仅 v1.0 / v1.1）。
- 影响：Phase 0 任务 #1"执行 ERRATA-01~03 工程侧核验"只能按 v1.1 §0.8/§4 的 erratum 意图做**等价核验**（已见 BASELINE §9），无法对正式条目逐条闭合。
- 缓解：阻塞点在于"文档本身缺失"而非工程事实。需先补齐 v1.2 / ERRATA 文档（或确认以 BASELINE §9 三候选为准）后再进入 Phase 1。

### RISK-02 · 表数量口径不一致（19 vs 18）

- 现象：`执行摘要/CODE.md` §9.1 写 23 张（19+4）、`WORK_SPEC` §15 待确认项 1 写"WIKI 18 / CODE 19"、源码实为 **18 张**。
- 影响：若下游直接沿用"19 张"作为迁移基线，version 2 的 22 张目标表清单会错位。
- 缓解：已以源码为准锁定 18 张（BASELINE §3）；`CODE_SPEC` 已作事实性修正。I-Task 必须引用 18 张作为迁移基线。

### RISK-03 · 迁移无 Dexie version 2

- 现象：Dexie 仍 version 1；C-11/C-12/C-13 的 v1→v2 语义迁移（reviews→reviewTemplates/reviewEntries、Flashcard.mastery→Schedule 字段）**完全未实现**。
- 影响：这是 Phase 4 核心工作，但也是数据丢失最高风险点（语义转换 vs 字段直接搬家）。
- 缓解：严格执行 CODE_SPEC §8.2 硬规则（快照 + 事务 + 子步骤核验 + 失败保留快照），并同步 migration tests（v1.1 §11）。

---

### RISK-15 · V5→V8 迁移将 vault 密码明文写入（数据安全红线）
- 现象：`migration.ts` L181-192 将 V5 `vault.password` 原样写入 V8 `vault`，未加密、未生成 `passwordIv`；而 V8 `VaultPage` 存储契约为 `password`=AES-GCM 密文 + `passwordIv`。
- 影响：V5 密码以明文落入 V8 vault 表，违反 PBKDF2+AES-GCM 与「密码本独立安全边界」（不可破坏项）。
- 缓解：**I-012 修复（迁移前加密 or 显式排除/降级），必须优先于 Dexie v2 迁移（I-006）**；不可推到 C-15/Phase 11。

---

## 高风险项（P1）

### RISK-04 · `createdAt` 索引缺失导致现有查询回退

- 现象：`reviewStore.getAutoSummary` 对 `tasks`/`mistakes` 的 `createdAt` 做 `where().between()`，但二者 schema 无该索引。
- 影响：Dexie 对非索引字段 where 会报错/回退为全表扫描，复盘聚合在数据量增大后出现性能与正确性问题。
- 缓解：C-11 补 `createdAt` 索引（version 2 一并完成）；I-Task 标注 MUST。

### RISK-05 · 普通备份包含 vault 表，违背"普通导出排除密码本"

- 现象：`db.exportAllData()` 的 18 张表清单含 `vault`（密码为 AES-GCM 密文，但未按 `V8_GLOBAL` §12 / `CODE_SPEC` §10 原则排除）。
- 影响：普通备份/导出会把密码本密文并入普通数据流，扩大敏感数据暴露面，且与冻结语义冲突。
- 缓解：备份/导出显式排除 `vault`（或单独加密导出），C-15 实施时一并处理。

### RISK-06 · Review Metrics 指标类型三层不一致 + 无类型化实现

- 现象：`执行摘要/CODE.md` 5 种、`CODE_SPEC` 3 种、源码 `any`（见 BASELINE §8）。
- 影响：若按 CODE_SPEC 的 3 种实施，会漏掉 Monthly/Exam；复盘聚合器（C-10）无契约可依。
- 缓解：Phase 0 已登记补齐路径；进入 Phase 3/8 前先冻结 5 种指标类型契约。

### RISK-07 · vault 加密逻辑内嵌页面，易在迁移/重构中误伤

- 现象：PBKDF2+AES-GCM 逻辑内嵌 `VaultPage.tsx`（未抽 `utils/vaultCrypto.ts`）。
- 影响：Phase 4 迁移、Phase 15 清理时改动 vault 相关代码风险集中。
- 缓解：CODE_SPEC §10 SHOULD 项——抽取为独立模块且**行为不变**；抽取后补单测覆盖加解密往返。

### RISK-08 · 闪卡导入未实现学科/章节/知识点自动创建（W-15 语义不完整）

- 现象：`importCSV/importPaste` 仅写 `subject/chapter` 字符串，`knowledgeId` 恒空，无自动匹配/创建，无"成功 N/失败 M"报告。
- 影响：W-15 产品语义（自动匹配/创建 + 局部失败可重试）未达成，若仅视"能导入"为完成会返工。
- 缓解：Phase 6 按 W-15 完整实现，I-Task 验收标准含"学科自动匹配/创建 + 单行失败不阻塞 + 可局部重试"。

### RISK-09 · 复盘页缺"下一步"出口（W-23 未落地）

- 现象：`nextActions` 字段存在，但 5 个复盘页均无结构化"下一步"动作区（不创建任务/不回流计划）。
- 影响：违背 `V8_GLOBAL` §10 / W-23"复盘末尾必须有下一步"非破坏项，复盘退化为数据墓地。
- 缓解：Phase 8 显式落地"下一步"动作区并接 Event/Store 回流任务。

---

### RISK-16 · V5→V8 迁移缺失 Review.answers 字段
- 现象：`migration.ts` L194-208 未映射 `answers`，迁移后 `Review.answers` 为 `undefined`（类型要求 `Record<string,string>`）。
- 影响：迁移后的复盘记录无回答内容，复盘页读取 `review.answers?.[key]` 退化为空。
- 缓解：**I-013 补 `answers: r.answers || {}` 映射**。

---

## 中风险项（P2）

### RISK-10 · 目录结构（C-25）与架构分层（C-02~C-05）尚未启动

- 现象：`store/`（单数）未并入 `stores/`；无 `domain/`、`app/`、`desktop/`、`tests/`。
- 影响：不阻塞 Phase 0，但 Phase 3 是 P0 架构基础，改动面大。
- 缓解：按 v1.1 Phase 3 顺序，先分层后接业务；`stores/` 唯一作为 Gate 3 验收项。

### RISK-11 · 测试基线与 E2E 完全缺失

- 现象：无 vitest/playwright，核心 Domain 无单测。
- 影响：迁移（RISK-03）、调度、聚合等高风险逻辑无回归保障。
- 缓解：Vitest 本轮必须（C-20），随 Domain/Migration/Scheduler 实现同步测试（v1.1 §2.3）。

### RISK-12 · 主题系统（C-24）与 Token 迁移（ERRATA-02）待实施

- 现象：仅 light/dark 两套；Token 旧命名；无双层 Accent。
- 影响：Phase 1 Design Foundation 落地时需全量 Token 重命名，涉及所有 `.module.css`。
- 缓解：PLAN 阶段先冻结命名与色值，一次迁移，避免新旧命名长期并存（DESIGN_SPEC §10 建议）。

### RISK-13 · 全表 `toArray()` 加载 + 无 Query-based Loading

- 现象：Store 普遍 `toArray()` 全表加载；`getDueCards` 等在内存 filter。
- 影响：数据规模增长后性能退化。
- 缓解：C-21/C-23 按"真实 Query → 测量 → 加索引 → 验证"节奏，P1 处理。

### RISK-14 · 桌面插件缺失（C-17 P2）

- 现象：无 autostart / single-instance / updater。
- 影响：不影响 Phase 0/1，属 Phase 13 增强。
- 缓解：保持现状，P2 处理。

---

## 已排除 / 低风险

- **技术栈更换**：非风险，已确认不推倒重来。
- **核心桌面能力（托盘/快捷键/通知/双窗口）**：已实现且工作正常（BASELINE §5）。
- **V5→V8 迁移**：已实现且事务包裹，为前置步骤保持生效。
- **四套主题"F 作用域"冲突**：代码层尚未发生（四主题未实现），仅 SPEC 表述待收敛（RISK 归入 RISK-01）。
