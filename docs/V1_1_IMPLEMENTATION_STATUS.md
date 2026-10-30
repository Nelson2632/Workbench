# Workbench v1.1 实施记录

更新：2026-10-30（Asia/Shanghai）。基线：`97376e706f7f455bb290a25c07ababb397a862f0`。

## 当前交付状态

P0/P1 核心工作包及 P2 索引、投影批处理、本地可选计数、覆盖率和生成物政策已实现，代码按依赖拆分为 PR #2→#3→#4→#5→#6。全部尚未合并，main 未修改，未创建正式 Release。版本为 1.1.0-rc.1。

| 工作包 | 交付 |
|---|---|
| P0 命令与反馈 | 稳定 intent、desired-state、幂等重试、关键投影屏障、真实完成反馈、失败保留输入 |
| Start | Now≤1、Next≤4 且不重复；完整计划与无需计时的开始入口 |
| Recover | 延期、拆分、暂存、放弃；预览、原子提交、持久 Undo、冲突保护 |
| Memory/Shutdown | 源记录导航、实时刷新、历史同日、草稿保护、可选反思、默认关闭的夜间提醒 |
| 可访问性 | 状态文字、持久错误 Toast、键盘关闭、reduced-motion；人工读屏仍待验证 |
| 安全/工具链 | npm 单锁、已修复依赖告警、备份安全边界、最小 CSP、版本一致性 |
| 性能与指标 | schema 9 时间索引、Timeline 批量派生、默认关闭的本地计数、关键模块覆盖率门禁 |
| 桌面 | macOS 未签名 app/dmg 与进程启动检查、Windows 原生测试；正式签名、公证未执行 |

最新验证证据、迁移说明、未完成的人工验收见 [发布候选验收](./V1_1_RELEASE_READINESS.md)。声音按审计继续延期；不接外部 analytics。自动检查通过不等于已经证明全部平台兼容性或可以免审发布。

以下保留首批 P0 的审计与测试历史，历史测试数量/环境限制不代表最终分支状态。

## 依据与核实结果

依据用户补发的《Workbench v1.1 深度审计与 Codex 实施计划》；此前误贴的 deep-research-agent 报告不适用于本仓库。

已核实：完成调用生成随机 commandId；afterCommit 先于异步投影；Now 全量、Next 周期子集重复；Inbox 异步写入前清空；Task.completedAt 类型缺失；默认夜间复盘提醒开启；CSP 为 null；npm/pnpm 双锁；无既有 Actions 工作流。

报告差异：当前 NightShutdownPage 是一个必填 reflection 字段，不存在 didWell/improve/canSubmit 片段。EventBus 事件使用 game.recorded、anime.episodeWatched、music.logged，不能照抄不存在的 gameRecord.created/anime.progressed。Tauri 已声明 minimumSystemVersion=10.15，但这不是本次实际兼容性测试结论。

额外动态发现：原始单元测试在 America/New_York 下 293/295，通过切换 Asia/Shanghai 得到 295/295；原因是本地业务日期与 UTC 时间戳前十位混用。此次修复 Memory/Shutdown 的时间戳归日，不改 date-only 字段或历史时间戳。

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

## 后续阶段

首批 P0 的 Recover、Memory、依赖、安全、版本和迁移待办已由后续 PR 实现。正式发布仍需人工验收、签名策略和仓库审核；最终状态以发布候选验收文档为准。

P0 本身无 schema/index 变化；最终 RC 包含 schema 8→9 索引升级，回退应恢复升级前备份，不能直接套用 P0 的无迁移回滚方法。
