# RELEASE_TEST_FAILURE_CLASSIFICATION — 单测失败分类报告

> 生成时间：2026-08-31
> 原则：任一失败先判类别（REAL BUG / TEST BUG / CONTRACT BUG / FIXTURE BUG），不得只改测试抹绿灯，也不得只改代码迁就测试。

## 1. 三个原始失败（修复前 `pnpm test` = 256 用例 / 3 失败）

| 失败用例 | 断言 | 分类 | 根因 | 处置 |
|---|---|---|---|---|
| `crossDomainHealthMatrix.test.ts` → `facts.work.tasksCompleted` 期望 1 实得 0 | RF-02 | **FIXTURE BUG** | 测试硬编码「今天」=`2026-08-30`，但 `toggleDone` 用真实时钟写 `completedAt`（当时已 08-31），`isSameDay` 判定落空 | 修测试：`vi.useFakeTimers({toFake:['Date']})` + `vi.setSystemTime('2026-08-30')` 固定时钟 |
| `lifeHealthMatrix.test.ts` → 生日事件未进日历可见列表 | RF-03 | **FIXTURE BUG** | 同上：`nextBirthday('08-30', 真实today=08-31)` 正确算出「明年 08-30」，测试却查 `2026-08-30` 区间 | 修测试：固定时钟（业务 `nextBirthday` 语义正确） |
| `workHealthMatrix.test.ts` → Night Shutdown `completed` 缺「数学卷」 | RF-04 | **FIXTURE BUG** | 同上：`completedAt` 落在 08-31，而收口聚合按 `date=08-30` 过滤 | 修测试：固定时钟 |

> 结论：三个失败**均非业务 bug**。生产代码 `completedAt`/`nextBirthday`/当日聚合均正确；是测试用硬编码日期 + 未固定时钟导致的「日期漂移」。修复方式为**固定测试时钟**（与既有 `appLock.test.ts` 同一约定），未删除/降低任何断言。

## 2. 修复过程中新暴露的失败

| 失败用例 | 断言 | 分类 | 根因 | 处置 |
|---|---|---|---|---|
| `timelineProjection.test.ts` 全量运行偶发（`task.created` 多 1 行 / `diary.created` 少 1 行） | — | **TEST BUG（基础设施）** | EventBus 投影 handler 是 fire-and-forget 异步，测试用固定 `setTimeout(25ms)` flush，全量并行负载下竞态 | 修源：`timelineProjection.ts` 增加 `_flushProjectionForTests()` 等待在途 handler；测试改用它。隔离运行本就通过，全量也稳定 |
| `runner.test.ts` 幂等断言 `skippedCount` 19 → 20 | — | **FIXTURE BUG** | 为 RF-05 空日记过滤新增了 1 条纯占位空日记 fixture，`sourceCount=20 / skipped=2`，该测试写死旧值 19 | 同步修正测试断言（业务/契约一致，非掩盖） |

## 3. 分类汇总

- **REAL BUG**：0
- **TEST BUG**：1（timelineProjection 竞态）
- **FIXTURE BUG**：4（三个日期漂移 + runner 计数）
- **CONTRACT BUG**：0

## 4. 最终状态

`pnpm test` → **257 / 257 PASS（39 文件）**，无删除用例、无降低断言、无关闭错误检查。
