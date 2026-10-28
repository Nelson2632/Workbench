# Workbench v1.1 实施记录

状态：首批 P0 实现与工具链安全补丁已提交，尚未达到发布门槛。禁止据本文标记 v1.1/v10.1 Release Ready。
补充核验：P0 代码 `1d83994` 的 [Actions run 40722066304](https://github.com/Nelson2632/Workbench/actions/runs/40722066304) 三时区、构建、两门禁和浏览器 5/5 均通过。下文浏览器失败记录属于本地环境；工具链修复与后续验收见 [安全补丁记录](./V1_1_SECURITY_TOOLCHAIN.md)。

日期：2026-10-28（Asia/Shanghai）。基线：`97376e706f7f455bb290a25c07ababb397a862f0`。

## 依据与核实结果

依据用户补发的《Workbench v1.1 深度审计与 Codex 实施计划》；此前误贴的 deep-research-agent 报告不适用于本仓库。

已核实：完成调用生成随机 commandId；afterCommit 先于异步投影；Now 全量、Next 周期子集重复；Inbox 异步写入前清空；Task.completedAt 类型缺失；默认夜间复盘提醒开启；CSP 为 null；npm/pnpm 双锁；无既有 Actions 工作流。

报告差异：当前 NightShutdownPage 是一个必填 reflection 字段，不存在 didWell/improve/canSubmit 片段。EventBus 事件使用 game.recorded、anime.episodeWatched、music.logged，不能照抄不存在的 gameRecord.created/anime.progressed。Tauri 已声明 minimumSystemVersion=10.15，但这不是本次实际兼容性测试结论。

额外动态发现：原始单元测试在 America/New_York 下 293/295，通过切换 Asia/Shanghai 得到 295/295；原因是本地业务日期与 UTC 时间戳前十位混用。此次修复 Memory/Shutdown 的时间戳归日，不改 date-only 字段或历史时间戳。

## 实施次序

| 优先级/阶段 | 内容 | 本次状态 |
|---|---|---|
| P0-A | 稳定完成意图、显式 desiredDone、关键投影屏障、错误分层 | 已实现，单元及远端浏览器通过 |
| P0-B | 独立 transient feedback、按意图去重、Reduced Motion | 已实现，远端运行时场景 5/5 通过 |
| P0-C | Now≤1/Next≤4、完整计划入口、Capture 失败保留输入 | 已实现，选择器单元及远端浏览器通过 |
| P0-D | 任务完成/撤销实时更新 Timeline 与 Daily Memory；本地日期 | 已实现，单元通过 |
| P1-A | 非破坏式 Recover 生命周期、拆分、批量 preview/Undo、迁移 | 待实施，单独 PR，不能用 delete 代替 |
| P1-B | Memory 回源与全面事件覆盖、可选反思、提醒策略、Toast | 待实施 |
| P1-C | npm 单一管理器、仓库质量门、a11y/运行时回归 | 已新增 CI、test:run/web 与 npm 单一管理；远端 browser 通过，桌面 e2e 仍未验证 |
| P1-D | CSP 与真实 macOS bundle/启动/备份升级验证 | 待 macOS 环境验证；此环境不能证明通过 |
| P2 | 索引/批量投影性能、本地指标、声音、仓库归档 | 延后；不接外部 analytics |

## 首批代码行为

- 新增 `CompletionIntent {taskId, desiredDone, commandId}` 和 setDone；保留 toggleDone 作为旧调用方兼容入口，同一 pending/失败操作复用已有意图。
- commandId/domain/journal 仍同事务；新增可选 projectCritical，不把整个 EventBus async 化。关键投影只直接写派生表，不再排入 Mutation Lane，避免队列互等。
- afterCommit 只代表事实提交，UI 异常单独隔离，不再截断事件。关键投影成功后才排入反馈；失败为 sync-pending，任务事实保留。
- 关键事件带内存 Symbol 表明其投影由 coordinator 负责，普通通知仍接收事件；Timeline 的后台订阅跳过重复写入。
- Timeline writer 串行化，按 canonical eventKey 幂等处理；任务撤销清理完成投影，改名保留事件标题快照（既有测试保护）。
- 失败后同 commandId 重放不重写事实，重新从 canonical Task 修复 Timeline/Memory。会话内反馈去重，旧命令冷重放不庆祝。
- transient feedback 挂在主布局，不依赖 Today 未完成行，切页不会重播。Reduced Motion 下只保留短文字状态。
- 统一 Today 选择器；Now/Next 不重叠，Next 最多四项，完整计划管理仍可访问。当前选择是会话叙事状态，不捏造持久“已开始”事实。
- Inbox/Today 捕获共用失败安全 hook，pending 防重复，失败保留文字、焦点和同一 ID；保存时继续输入的新内容不被清空。
- Task.completedAt / Inbox.sourceCommandId 是可选非索引字段，无数据库版本变更；systemCommandIds 增加可选非索引恢复元数据。现有记录缺失字段仍可读；不批量补写虚构完成时间。
- Memory 背景刷新在写事务内重新读取 reflection，保护聚合期间写入的人工内容。

## 实测结果

环境：Linux、Node 24.22.1、npm 11.9.0。系统进程默认时区 America/New_York；与用户时区区分记录。

| 命令 | 工作目录 | 结果 |
|---|---|---|
| npm ci --ignore-scripts --no-audit --no-fund | workbench-v8 | 退出 0，安装成功；未变更依赖或锁文件 |
| npm run test:run | workbench-v8 | 48 文件、308/308 通过（默认时区） |
| TZ=Asia/Shanghai npm run test:run | workbench-v8 | 48 文件、308/308 通过 |
| TZ=UTC npm run test:run | workbench-v8 | 48 文件、308/308 通过 |
| npm run build | workbench-v8 | TypeScript/Vite 成功，仍有 >500 kB chunk 警告 |
| node scripts/contract-gate.mjs | 根目录 | 70/70，通过 |
| node scripts/implementation-gate.mjs | 根目录 | 18/18，通过；静态检查不等于运行时完整证明 |
| npm exec -- playwright test --config playwright.web.config.ts | workbench-v8 | 5 场景均在启动前失败：Chromium executable 不存在，未执行断言 |
| npm exec -- playwright install chromium | workbench-v8 | 下载损坏 zip（End of central directory…），未成功安装 |
| 原 Playwright 桌面配置 | workbench-v8 | webServer 无法启动：cargo metadata 找不到 cargo |
| Tauri/macOS 实机、VoiceOver、签名/公证 | — | 未验证：Linux 环境无 cargo/macOS 工具链 |

新增测试验证：并发同意图、DB 写入失败重试、投影失败恢复、投影延迟不早反馈、事务后结果不明、取消完成、冷重放不庆祝、重启恢复待投影入口且不被缓存清理、Now/Next/完整计划、当地午夜归日。新增 5 个浏览器用例覆盖实际 UI，但不能把编写完成计为验证通过。

CI 新增 UTC/Shanghai/New_York 单元矩阵、构建、现有两门禁、浏览器 motivation suite 和聚合 required job，Actions SHA 从官方仓库 ref 查询。已核对 P0 远端 Actions success（包括 5 个浏览器场景）；GitHub ruleset 需配置 required check 才能强制阻止合并，本 PR 不擅自更改管理员规则。

## 合并与发布阻断项

1. P0 browser suite 已在远端通过，仍需人工三主题/焦点/读屏和真实桌面验证；当前 PR 保持 Draft。
2. P1 Recover 等尚未实施；没有把任务生命周期、提醒、CSP 随 P0 一起改掉。
3. 待投影恢复元数据与主事实同事务写入 systemCommandIds（可选非索引字段），清理幂等缓存时保留未完成恢复。重启 loadTasks 后恢复同步重试入口，修复历史派生数据不播放旧庆祝；此路径已有单元测试，桌面重启仍需实测。
4. 跨窗口串行性不由模块内 FIFO 自动保证，需桌面多窗口验证。冷重放仅恢复派生数据，不重发历史庆祝。
5. 旧 DailyMemoryStore 的手动刷新与反思路径仍应在 P1 进一步审查并发覆盖风险；此次只收紧背景聚合写入。
6. 没有证明覆盖率、性能预算、完整安全审计、迁移备份升级与正式支持平台矩阵。
7. 前端 package.version=0.0.0、Tauri=0.8.1、窗口标题 V8、设计 V9 的版本漂移留待 release PR 统一；不擅自改成 v10.1。

回滚：此批无 schema/index 或依赖升级，回退该代码提交即可；可选字段可留在本地对象中，不回写/删除历史数据。任何后续 schema 变更须独立升级/备份/恢复测试。
