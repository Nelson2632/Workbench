# 个人工作台 V8 — MASTER PLAN

> 版本：1.2
> 文档性质：项目级实施总计划
> 阶段：PLAN（Phase 0 已完成，进入 Phase 1 前的冻结版本）
> 修订依据：`V8_MASTER_PLAN_v1.1.md` + Phase 0 裁决
>
> 上游依据：`V8_GLOBAL.md` / `WORK_SPEC.md` / `DESIGN_SPEC.md` / `CODE_SPEC.md`
> 关联交付：`V8_PHASE0_BASELINE.md` / `V8_PHASE0_RISKS.md` / `V8_PHASE0_I_TASKS.md` / `ERRATA-01~04.md`

---

# 0. v1.2 修订结论

v1.2 不是重新制定需求，而是基于 Phase 0 工程核验，对 v1.1 中的「待建立 Erratum」「表数量口径」「Review Metrics 口径」与「安全导出约束」进行**正式冻结**。其余 v1.1 内容（Phase 划分、P 等级与 Phase 分离、设计先于页面工程化、测试跟随实现、覆盖矩阵、Gate 定义）**全部继续有效**。

五项冻结：

1. **正式补齐 Spec Erratum**：v1.1 §0.8/§4 要求的「最小 Spec Erratum」落地为 `ERRATA-01~04`（已批准），不再处于「待建立」状态。
2. **数据库基线锁定**：现有表 **18 张**；`执行摘要/CODE.md` 的「19 张」视为历史笔误；Dexie Version 2 目标 = **18 + 4 = 22 张**。
3. **安全导出约束**：暂停普通 `db.exportAllData()` 全量导出（因其当前包含 `vault`），禁止据此生成普通备份副本；vault exclusion 在 Backup/Restore 正式实施（C-15）中处理。
4. **Review Metrics 冻结**：按 **5 类**（Daily / Subject / Weekly / Monthly / Exam）冻结，见 `ERRATA-04`。
5. **Gate 0 完成条件**：见 §5。

---

# 1. Spec Erratum 登记

| 编号 | 主题 | 类型 | 裁决 |
|------|------|------|------|
| ERRATA-01 | F 数据驾驶舱作用域 | 跨 SPEC 表述冲突 | 全局主题 `mist/fluent/night`；页面级 `review-data` |
| ERRATA-02 | Token 命名统一 | 实现命名对齐 | 统一 `--color-*` |
| ERRATA-03 | 强调色双层体系 | 设计系统决策 | Brand Accent + Theme Accent |
| ERRATA-04 | Review Metrics 指标类型口径 | 跨 SPEC 口径不一致 | 冻结 5 类指标 |

以上 Erratum 仅收敛 DESIGN_SPEC / CODE_SPEC 的**表述与实现口径**，不改变任何产品语义，不新增/删除 W 任务。

---

# 2. 数据库基线冻结

```text
现有表：18 张（源码 authority，见 V8_PHASE0_BASELINE §3）
执行摘要「19 张」：历史笔误，废弃
Dexie Version 2 目标：18 + 4 = 22 张
```

新增 4 表（C-11，ENGINEERING DECISION）：

| 表 | 主键 | 索引 | 用途 |
|----|------|------|------|
| `knowledgeRelations` | `++id` | `knowledgeId, type, targetId` | 知识点关联 |
| `reviewEntries` | `++id` | `type, templateId, dateRange` | 复盘回答条目 |
| `studySessions` | `++id` | `subjectId, startedAt` | 学习会话 |
| `appEvents` | `++id` | `type, timestamp` | 事件日志 |

同时补索引：`tasks.createdAt`、`mistakes.createdAt`（修复 `getAutoSummary` 非索引查询缺陷）。

---

# 3. Review Metrics 冻结

按 5 类冻结（详见 `ERRATA-04`）：

```text
DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics
```

`ReviewEntry.autoSummary` 联合由 3 类扩为 5 类；`reviewAggregator` 按 `type` 分支；Monthly / Exam 页面内联计算下沉。

---

# 4. 安全导出约束（I-001 修正）

Phase 0 内：

- **暂停** `db.exportAllData()` 的普通导出动作（当前含 `vault`）。
- **禁止**据此生成普通备份副本。
- 先完成**安全快照 / 基线验证**（排除 vault，或仅对非敏感表快照）。
- vault exclusion 的正式实现归入 Backup/Restore（C-15，Phase 11）。

---

# 5. Gate 0 最终结论（放行，附条件）

```text
Build                         ✅ PASS
18 表基线                      ✅
V5→V8 静态迁移核验              ✅（发现 2 异常，已登记 RISK-15/RISK-16）
运行时迁移验证                  ⏸ 环境限制（应用内首启迁移为验证口径）
安全快照                        ⏸ C-15 前置能力缺失（排除 vault）

RISK：Vault 明文迁移            🔴 P0/P1（I-012 前置）
RISK：Review.answers 迁移缺失   🟠 P1（I-013）
```

**放行条件已满足**：Phase 0 基线完成 + 阻塞风险已登记 + 迁移安全契约（I-012）列为迁移前置。

**进入 Phase 1 的首个工程任务是 I-012（修复 V5→V8 Vault 迁移安全），必须优先于 Dexie v2 迁移（I-006）。**

---

# 6. 冻结原则（延续 v1.1 §33，新增）

- 不再重新讨论 GOAL；不再重新定义 WORK_SPEC 产品语义。
- 不让 CODE 重新决定产品职责；不让 DESIGN 重新决定业务规则。
- **不因 Erratum 改变产品语义**：ERRATA 只修正表述与实现口径。
- **不因表数量口径修正而改变数据完整性要求**：18→22 迁移必须无损、可回退。
- **vault 独立安全边界始终成立**：普通导出/备份默认排除密码本，明文不入普通数据流。
- 若发现真实工程与 SPEC 冲突，仍走变更记录（格式见 v1.1 §33）。

---

# 7. 最终状态

```text
V8_GLOBAL             ✅
WORK_SPEC             ✅
DESIGN_SPEC           ✅
CODE_SPEC             ✅
MASTER_PLAN v1.0      ✅ reviewed
MASTER_PLAN v1.1      ✅ revised
MASTER_PLAN v1.2      ✅ frozen（Phase 0 裁决）
ERRATA-01 ~ ERRATA-04 ✅ 已批准
```

下一阶段：

> **Gate 0 已放行（附条件：I-012 迁移安全前置），进入 Phase 1（首任务 I-012）。**
