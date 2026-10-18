# ERRATA-04 · Review Metrics 指标类型口径

> 编号：ERRATA-04
> 状态：✅ 已批准（Phase 0 裁决 #4 冻结）
> 批准版本：`V8_MASTER_PLAN_v1.2.md`
> 类型：跨 SPEC 口径不一致

---

## 冲突来源

- `执行摘要/CODE.md` §8.2：定义 **5 类**（Daily / Subject / Weekly / Monthly / Exam）。
- `CODE_SPEC` §3.2：`ReviewEntry.autoSummary` 联合仅 **3 类**（Daily / Subject / Weekly），缺 Monthly / Exam。
- 源码：`Review.autoSummary = any`（0 类类型化，`getAutoSummary` 不分 `type`）。

## 冲突描述

三处对「复盘指标类型」的口径不一致：5 类 vs 3 类 vs 无类型化。

## 源码现状（Phase 0 核验）

- `src/types/index.ts` L197：`autoSummary: any`。
- `src/stores/reviewStore.ts`：`getAutoSummary(type, dateRange)` 忽略 `type`，返回同一份扁平 `Record<string, any>`。
- `MonthlyReviewPage` / `ExamReviewPage` 在页面内联计算指标；`ExamReviewPage` 完全不调用 `getAutoSummary`。
- 无 `DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics` 类型定义。

## 冻结裁决

Review Metrics 按 **5 类**冻结：

```text
DailyMetrics
SubjectMetrics
WeeklyMetrics
MonthlyMetrics
ExamMetrics
```

## 影响范围

| 文档 / 模块 | 修正点 |
|------|--------|
| CODE_SPEC §3.2 | `ReviewEntry.autoSummary` 联合由 3 类扩为 5 类 |
| `src/types/index.ts` | 新增 `MonthlyMetrics` / `ExamMetrics` |
| `domain/review/reviewAggregator.ts` | `getAutoSummary` / aggregator 按 `type` 分支 |
| 复盘页 | Monthly / Exam 内联计算下沉到 aggregator |

> 不改变产品语义：5 复盘粒度（今日 / 学科 / 周 / 月 / 考试）本已冻结于 `V8_GLOBAL` §10。
