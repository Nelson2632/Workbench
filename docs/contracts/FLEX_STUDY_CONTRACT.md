# FLEX_STUDY_CONTRACT — 弹性学习规划契约（三层优先级 + Manual Fallback）

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-004 |
| 版本 | 0.1.0（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §8 |
| 关联合同 | V9-C-001（studyPlanItems 表）、V9-C-002（flexStudy.fallback 事件） |

---

## 1. 目标场景（冻结）

用户学习时间短且不稳定（早 7 点到校、晚 21:30 后放学）。系统**不制定刚性时间表**，只回答：

> 现在应该做什么？还剩多少时间？哪些可以降级/推迟？

---

## 2. 三层优先级（冻结）

| 层级 | 语义 | 来源 |
|---|---|---|
| MUST | 必须完成 | 用户设定；deadline 为今日的任务自动**建议**列入（仅建议，不自动改） |
| SHOULD | 尽量完成 | 用户设定 |
| COULD | 有余力再做 | 用户设定 |

默认建议映射（可被用户覆盖）：V8 task.priority P0 → must，P1 → should，P2 → could。**studyPlanItems.priority 与 task.priority 是两个独立字段**，互不写回。

---

## 3. 核心数据（studyPlanItems，V9-C-001 已冻结表结构）

```ts
{
  taskId, planDate, priority, flexibility,
  estimatedMinutes, actualMinutes?, state, sortOrder?, note?
}
```

- 引用 tasks.id（字符串主键），**不复制任务内容**。
- state：pending → active（正在做）→ done；deferred（推迟，需用户确认）。

---

## 4. Adaptive 算法（冻结）

### 4.1 输入

```text
availableMinutes  用户输入（或从 Today 状态估算）
energy            1–5，用户自评；缺省 3
deadline          取自 task.dueDate
priority / estimatedMinutes / actualMinutes / flexibility / sortOrder
```

### 4.2 排序规则（确定性强约束）

1. 层级：must → should → could（MUST 永不在 SHOULD/COULD 之后）。
2. 层内：用户 sortOrder（若有）→ deadline 升序（空值最后）→ estimatedMinutes 升序 → taskId 字符串升序（**稳定终结键，保证确定性**）。
3. energy ≤ 2：建议把 COULD 全部 defer + 每 90 分钟建议 10 分钟休息（建议，非强制）。
4. energy ≥ 4：建议从 COULD 池补入 1–2 项（建议，非强制）。

### 4.3 输出

```text
orderedQueue       建议顺序
suggestedDowngrades[]   SHOULD→COULD 建议（需确认）
suggestedDeferrals[]    COULD 推迟建议（需确认）
timeSummary        {estimated, available, overflow}
```

### 4.4 硬禁止（算法与 UI 均不可违反）

- 删除用户任务 / 修改任务原始内容 / 把用户设定的 MUST 自动降级 / 强迫用户按算法执行。
- 任何建议必须**用户确认后**才写入 studyPlanItems。
- 不依赖 LLM、不依赖网络。

### 4.5 性能护栏

- 同步执行；≤200 项时必须在 50ms 内完成，超时视同异常（§6）。

---

## 5. Manual 模式（V8 原排序回退，硬安全阀）

- `planningMode = manual` 时，排序回退 **V8 原任务排序**（冻结顺序：pinned 优先 → dueDate 升序（空值最后）→ priority P0→P1→P2 → createdAt 升序）。Phase 0.5 需与 taskStore 现状核对一致，差异登记到本合同修订记录。
- Manual 永远**一键可达**；用户切换到 manual 后保持，直到主动切回 adaptive。
- Manual 下算法完全不运行，也不产生建议。

---

## 6. Fallback 触发与行为（冻结）

### 6.1 触发条件（任一）

1. 排序函数抛异常；
2. 输入含非法枚举 / NaN / 负数分钟；
3. 性能护栏超时（§4.5）；
4. 数据读取失败（IndexedDB 不可用）；
5. 用户主动切换。

### 6.2 触发后行为（原子）

1. `planningMode = manual` 写入 settings（持久）。
2. 立即切换为 §5 排序，**页面不白屏、不空屏**。
3. 发布 `flexStudy.fallback`（含 reason，仅入 operationJournal，不进 Timeline）。
4. UI 提示"已切换到手动模式"，并显示"重试 adaptive"按钮。

---

## 7. 可测性（冻结断言）

1. 同输入 → 同输出（确定性，§4.2 规则 + 稳定终结键）。
2. 注入异常（非法枚举、NaN、模拟超时）→ planningMode 变为 manual，V8 排序生效，无未捕获异常。
3. MUST 任务在任何 energy/availableMinutes 组合下都不会被建议降级。
4. 算法运行期间零网络请求、零 LLM 调用。
5. 用户原始 tasks 行在算法任何输出后 hash 不变（不写回任务内容）。

## 8. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：三层优先级、算法规则、Manual 回退、Fallback 原子行为、可测断言 |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: flexstudy -->
```json
{
  "contract": "flexstudy",
  "version": "0.1.0",
  "priorities": ["must", "should", "could"],
  "defaultPriorityMapping": {"P0": "must", "P1": "should", "P2": "could"},
  "planningModes": ["adaptive", "manual"],
  "defaultPlanningMode": "adaptive",
  "inputs": ["availableMinutes", "energy", "deadline", "priority", "estimatedMinutes", "actualMinutes", "flexibility", "sortOrder"],
  "outputs": ["orderedQueue", "suggestedDowngrades", "suggestedDeferrals", "timeSummary"],
  "energyDefault": 3,
  "energyRange": [1, 5],
  "sortTiebreaker": "taskId-asc",
  "manualOrder": ["pinned-desc", "dueDate-asc-null-last", "priority-P0-P1-P2", "createdAt-asc"],
  "fallbackTriggers": ["exception", "invalidEnum", "nanMinutes", "perfGuardTimeout", "dataReadFailure", "userToggle"],
  "fallbackActions": ["persistManualMode", "switchToManualOrdering", "publishFlexStudyFallback", "showUiNotice", "offerAdaptiveRetry"],
  "forbidden": ["deleteUserTask", "modifyTaskContent", "autoDemoteMust", "forceUserToFollow"],
  "suggestionsRequireConfirmation": true,
  "perfGuard": {"maxItems": 200, "maxMs": 50},
  "noLLM": true,
  "noNetwork": true
}
```
<!-- /V9-CONTRACT-MACHINE -->
