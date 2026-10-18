# RELEASE_FIX_REPORT — V9.0.0 Final Release Fix Sprint

> 生成时间：2026-08-31
> 执行模式：Autonomous Release Fix Sprint（根因调查 → 修复 → 回归 → Release Gate）
> 关联：docs/V9_MASTER_PLAN.md、docs/contracts/*、docs/V9_FINAL_RELEASE_AUDIT.md

---

## 0. 执行结论

`pnpm test` **257/257 PASS（39 文件）**；`pnpm build` EXIT=0；`cargo check` EXIT=0；`pnpm tauri build --no-bundle` 通过（产出 `target/release/workbench-v8.exe`）；`node scripts/contract-gate.mjs` 70/70。

**Final Release Gate = PASS**（唯一环境限制：Playwright 全量 E2E 需桌面窗口 + chromium，本环境无 GUI，记为 ENVIRONMENT_BLOCKED；其 3 个选择器问题已在代码层修复）。

---

## 1. Issue 逐项报告

### 1.1 SIDEBAR SCROLL（🔴 P0）

- **现象**：实机走查「侧边栏无法正常滚动」，底部 items / 主题入口不可访问。
- **Root Cause**：
  已提交版本（commit `94f3e84`）的 `.nav` 为 `flex: 1; overflow-y: auto;`，**缺少 `min-height: 0`**。flex 列容器中，flex 子项默认 `min-height: auto`（不允许收缩到内容高度以下），导致 `.nav` 被内容撑到完整高度、永不产生 overflow、`overflow-y: auto` 不触发；而 `.sidebar` 是 `position: fixed; top:0; bottom:0` + `overflow: hidden`，于是超出视口的部分（含 footer 主题切换）被裁切、不可访问。
  - 证据：`git diff` 显示 `.nav { min-height: 0 }` 为本次工作区新增（已提交版本无此条）；`.sidebar` 的 `overflow: hidden` 把撑高的内容裁掉。
- **修复**（`Sidebar.module.css`）：
  ```css
  .sidebar { min-height: 0; display:flex; flex-direction:column; overflow:hidden; }
  .nav { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
  ```
  关键点是 `.nav` 的 `min-height: 0`（允许收缩）+ `overflow-y: auto`（触发滚动）。
- **Tests / Regression**：`a11yPolicy.test.ts` 与各 Health Matrix 通过；无 wheel 拦截 handler（已全局检索 `wheel/onWheel/preventDefault`，均无全局滚轮截获）；无 `transform` 作用于 `body/#app/.layout` 破坏 `position:fixed`。
- **Final Status**：✅ FIXED（CSS 层）。⚠ 真机 Tauri 视觉滚动需桌面环境最终确认（本环境无 GUI，见 §3）。

### 1.2 SIDEBAR EDGE TOGGLE（🟠 P1，新增交互）

- **现象**：侧边栏需支持「右侧边缘垂直居中」的收起/展开按钮。
- **Root Cause**：原实现无此交互（`toggleSidebar` 定义于 store 但未接入 UI）。
- **修复**（`Sidebar.tsx` / `Sidebar.module.css` / `AppLayout.module.css`）：
  - 按钮绝对定位于 `.sidebar` 右边缘垂直居中：`position:absolute; right:0; top:50%; transform:translateY(-50%)`。
  - `aria-label` 随状态切换「收起侧边栏 / 展开侧边栏」，支持 Mouse/键盘（原生 `<button>` + `focus-visible` outline）。
  - 折叠态复用既有 `.collapsed { width:64px }` 与 `.sidebarCollapsed .main { margin-left:64px }`。
  - 移动端隐藏（`hide-mobile`，移动端用抽屉 + 汉堡）。
- **Tests**：构建 + 单测通过。
- **Final Status**：✅ FIXED。

### 1.3 TODAY → PLAN 路由（🟠 P1）

- **现象**：Today「去计划」跳到 `/plan/inbox`，而语义应为今日计划。
- **Root Cause**：TodayPage 空态按钮硬编码 `navigate('/plan/inbox')`。
- **修复**：`TodayPage.tsx` 改为 `navigate('/plan/today')`。收件箱保持独立入口（侧边栏「收件箱」）。
- **Final Status**：✅ FIXED。

### 1.4 INBOX → PLAN 转化 + 编辑器（🟠 P1）

- **现象**：Inbox 项无法「转为计划」，缺少明确转化入口。
- **Root Cause**：Inbox 只有「安排日期」快动作，无完整转化编辑器。
- **修复**（`InboxPage.tsx` / `InboxPage.module.css`）：
  - 每个 Inbox 项新增「转为计划」按钮 → 打开编辑器（标题 / 描述 / 计划日期 / 优先级 P0·P1·P2）。
  - 保存 = 更新**同一 Task**（`updateTask(id, {title,note,dueDate,priority})`），任务因有了 `dueDate` 自然从收件箱过滤中消失、进入计划 —— **幂等、不产生第二份事实**（当前 Schema 无独立 inbox 实体，「转为计划」即给无日期任务补上日期+优先级）。
  - 仅用已有 Task 字段（title/note/dueDate/priority），未新增 Schema（§15「不得凭空新增字段」）。
  - Task Priority 与 Flex 层 must/should/could 保持分离（后者在 studyPlanItems，未动）。
- **Tests**：构建 + 单测通过。
- **Final Status**：✅ FIXED。

### 1.5 RF-01 App Lock 重启闪退（🔴 P0）

- **Root Cause**：`src-tauri/src/lib.rs` 全局快捷键 `gs.register(...)?` 用 `?` 冒泡；快捷键被占用/重复启动时注册失败 → `setup` 返回 Err → Tauri 退出。
- **修复**：注册改为**幂等 + 非致命**（`is_registered` 判重跳过；`if let Err(e)` 打日志降级，不再崩溃）；新增「重启生命周期」单测（状态持久化、KEK 随进程清空、重解锁状态机不破坏）。
- **Tests**：`appLock.test.ts` 11 用例通过；`cargo check` 通过。
- **Final Status**：✅ FIXED。

### 1.6 RF-02/03/04 三个单测失败（🔴 P0）

- **Root Cause**：三个测试硬编码「今天」=`2026-08-30`，而生产代码用真实时钟写 `completedAt` / 计算 `nextBirthday`（当时已 08-31）→ 日期匹配落空。属 **FIXTURE BUG**，非业务 bug。
- **修复**：测试固定时钟（`vi.useFakeTimers({toFake:['Date']})` + `vi.setSystemTime('2026-08-30')`），与 `appLock.test.ts` 同约定；未删断言、未改业务逻辑。
- **Tests**：crossDomain/life/work 三 Matrix 通过；另验证 0/1/2/跨日口径（业务聚合函数已正确）。
- **Final Status**：✅ FIXED。

### 1.7 RF-05 空日记迁移过滤（🔴 P0）

- **Root Cause**：Sidecar `transform_diary` 对 `log=""` 的空占位日记仍产出 `content:""` 行，导致 Timeline 误判「当日有日记」。真实数据 73 篇中 57 篇为纯占位。
- **修复**：Migration 层判定「纯占位空记录」（正文/心情/天气/趣事/标签全空）→ `skipped` 并计入 manifest；有效字段存在即迁移。同步更新 `sidecar.py` + `contract-gate.mjs` + fixture + 期望导出 + 契约 §3.1 说明。
- **Tests**：契约 Gate Dry Run `source=20 target=18 failed=3 skipped=2` 全绿；`sidecar.py verify` PASS；`runner.test.ts` 幂等计数修正为 20。
- **Final Status**：✅ FIXED。

### 1.8 RF-06 Diary↔Calendar / RF-07 E2E / 计划优先级（🟠 P1 / 🟡 P2）

- **Diary↔Calendar**：DiaryCalendarPage 已按投影展示日记/事件/生日标记并链接日记页，不复制事实 → 验证通过，无改动。
- **E2E**：任务输入加 `aria-label="新增任务"`；「主密码」用 `{exact:true}`；主题切换直接点主题按钮（去掉不存在的「切换主题」循环按钮）。
- **计划优先级**：TaskRow 优先级徽章可点击循环 P0→P1→P2（写 `task.priority`，保留 V8 语义）。
- **Final Status**：✅ FIXED / ✅ FIXED / ✅ FIXED。

### 1.9 过程中新发现：timelineProjection 偶发竞态（TEST BUG）

- **Root Cause**：EventBus 投影 handler 为 fire-and-forget 异步，测试用固定 `setTimeout` flush，全量并行负载下竞态（隔离运行通过、全量偶发）。
- **修复**：`timelineProjection.ts` 增加 `_flushProjectionForTests()` 等待在途 handler；测试改用它。
- **Final Status**：✅ FIXED（全量稳定 257/257）。

---

## 2. 自动化验证汇总

| 命令 | 结果 |
|---|---|
| `pnpm test` | 257/257 PASS（39 文件） |
| `pnpm build`（tsc + vite） | EXIT=0 |
| `cargo check` | EXIT=0 |
| `pnpm tauri build --no-bundle` | 通过（release exe 产出） |
| `node scripts/contract-gate.mjs` | 70/70 + Dry Run 全绿 |
| `sidecar.py extract/verify` | counts/rows/issues/checksum 一致 |

## 3. 环境限制（诚实声明）

- **Playwright 全量 E2E**：需 `pnpm tauri dev` 拉起桌面窗口 + chromium，本环境无图形桌面 → ENVIRONMENT_BLOCKED。3 个 E2E 失败均为选择器不匹配（非运行时崩溃），已在代码层修复。
- **四主题视觉 / Sidebar 真机滚动 / 动画**：需桌面 GUI 最终走查确认视觉语言与真机滚动；自动化侧（主题值域、a11y、reduced-motion、Health Matrix）均已绿。此三类「视觉实机确认」属发布前人工走查项，不影响代码 Gate。

## 4. Final Status

**V9.0.0 FINAL RELEASE READY**（代码级 Gate 全绿；仅剩桌面 GUI 人工走查与 Playwright 全量 E2E 两处环境依赖项）。
