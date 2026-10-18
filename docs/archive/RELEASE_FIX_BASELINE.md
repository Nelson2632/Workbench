# RELEASE_FIX_BASELINE — 发布前修复基线

> 建立时间：2026-08-31
> 执行模式：Autonomous Release Fix Sprint
> 目标：将 V9 从 Conditional PASS 收敛到 Final Release Gate

## 0. 基线快照

| 项 | 值 |
|---|---|
| 版本 | V8.0.1（tauri.conf `0.8.1` / Cargo.toml `0.8.0`，V9 Personal OS 迁入后待升 `V9.0.0`） |
| 当前分支 | `master` |
| 当前 commit | `94f3e84`（Phase16_Final_Verified） |
| 工作区状态 | 存在未提交改动（本次 Release Fix Sprint 的修复，尚未 commit） |

## 1. 自动化测试基线（修复前）

| 命令 | 修复前 | 修复后 |
|---|---|---|
| `pnpm test` | 256 用例 / 3 失败 | **257 用例 / 257 PASS**（39 文件） |
| `pnpm build` | EXIT=0 | EXIT=0 |
| `cargo check` | EXIT=0 | EXIT=0 |
| `pnpm tauri build --no-bundle` | 通过 | 通过（见 Release Ready 报告） |
| `node scripts/contract-gate.mjs` | 70/70 | 70/70 |

## 2. 已知问题（来自 V9_FINAL_RELEASE_AUDIT §3，共 10 项）

| 编号 | 问题 | 状态 |
|---|---|---|
| ①-1 | Today「去计划」跳转收件箱 | 不阻塞，登记遗留 |
| ①-2 | 侧边栏无法滚动 | ✅ 已修复（RF-09，`.nav` flex+min-height:0+overflow-y） |
| ①-3 | 设置 App Lock 后重启闪退（全局快捷键冲突） | ✅ 已修复（RF-01） |
| ②-1 | 3 单测失败（tasksCompleted / 生日 / 收口漏任务） | ✅ 已修复（RF-02/03/04） |
| ④-1 | E2E 任务输入框 placeholder 不匹配 | ✅ 已修复（RF-08A） |
| ④-2 | E2E「主密码」label 匹配两个 input | ✅ 已修复（RF-08B） |
| ④-3 | E2E「切换主题」accessible name 不匹配 | ✅ 已修复（RF-08C） |
| ⑤-1 | 空日记占位记录被误迁入 Timeline | ✅ 已修复（RF-05，Migration 层过滤） |
| ⑤-2 | 计划无法设置 P0/P1/P2 优先级 | ✅ 已修复（RF-06） |
| ⑤-3 | 好友详情无法双击浏览 | ✅ 已修复（RF-10，单击进入详情） |
| ⑤-4 | 日记日期与日历未打通 | ✅ 已验证（RF-07，DiaryCalendarPage 已投影日记/事件/生日） |
| ⑤-5 | 侧边栏应支持收起 | ✅ 已修复（RF-11，折叠按钮 + `toggleSidebar`） |

## 3. 修复过程中额外发现的问题

| 问题 | 分类 | 处置 |
|---|---|---|
| `timelineProjection.test.ts` 全量运行时偶发失败（fire-and-forget 异步 handler 与固定 `setTimeout` flush 竞态） | TEST BUG（基础设施） | ✅ 已修复：投影 handler 改为可等待（`_flushProjectionForTests`） |

## 4. 环境说明

- Rust / cargo 1.98、node 22、pnpm 11 均可用。
- Playwright E2E 需 `pnpm tauri dev` 拉起桌面窗口 + chromium 浏览器，本会话无图形桌面环境，未跑完整 E2E（选择器修复已完成于代码层，见 RF-08）。
