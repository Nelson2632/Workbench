# V9 Personal OS · Implementation Gap Audit

> 审计对象：V9 Personal OS 全八阶段合订文档 v1.6（Final Freeze）**设计契约** vs `workbench-v8/` **实际实现**
> 审计方式：逐层比对 11 个设计契约分册（Base → Surface → Theme → Component → Composite → Page → Domain → Data → Runtime → Quality → Governance）与源码/配置
> 证据来源：`workbench-v8/src/**`、`workbench-v8/src-tauri/**`、`docs/contracts/**`、`scripts/contract-gate.mjs`
> 审计日期：2026-09-06

---

## 0. 核心结论（TL;DR）

**v1.6 设计契约与实际实现描述的是两套不同的架构。**

| 维度 | v1.6 设计契约（唯一事实来源） | workbench-v8 实际实现 | 判定 |
|---|---|---|---|
| 存储引擎 | SQLite + WAL（DP1.3 / DP1.7 / R1.7 / R6-13） | **Dexie / IndexedDB**（`db/database.ts`） | ❌ S0 |
| 事件日志 | EventJournal = Domain History + Projection Input + Audit（DP1.1） | operationJournal，**30 天滚动裁剪**（`db/journal.ts`） | ❌ S0 |
| 写路径 | Mutation Lane（并发 1 / FIFO）+ commandId 幂等（R1.1 / DP1.5） | 无 Mutation Lane，**无 commandId / 幂等机制** | ❌ S0 |
| 原子性 | Domain Mutation + Journal Write 同事务（DP1.5 / R6-06） | 分离的 fire-and-forget journal sink（`setupJournalSink`） | ❌ S0 |
| 故障注入 | 8 个 Hook（R1.7 / Q1.5），test_mode enabled | **源码中不存在任何 fault injection** | ❌ S0 |
| 备份持久化 | Snapshot + Journal 落盘（DP1.7 FileSystem） | **localStorage**（`db/snapshot.ts` 注释明确「当前走 localStorage」） | ❌ S1 |
| 主题 | Night 为 Darkness/Light，glow 暖白 `#E8DCC8`，禁黑紫霓虹（B1.3 / B5） | Night accent = **`#7c6eff` 冷紫** | ❌ S2 |
| 布局常量 | Sidebar 240/68，Focus offset 1px（A1.1 / A1.6） | Sidebar **248/64**，offset **2px** | ⚠️ S2 |

现有 `docs/V9_RELEASE_READY_REPORT.md` 声明的「V9.0.0 Release Ready」「257/257 PASS」「Contract Gate 70/70」「Fault Injection PASS」，**验证的是「合同文档自洽」与「单元测试通过」，并未验证「实现是否符合 v1.6 设计契约」**。本次审计揭示的实现偏差，绝大多数不在这套自报绿门之内。

---

## 1. 审计方法与范围界定

- **「实现」= `workbench-v8/`**：React + TypeScript + Dexie（IndexedDB）+ Tauri/Rust。`workbench-v8/src-tauri/src/lib.rs` 仅含全局快捷键、托盘、私密文件读写命令，**无 SQLite / rusqlite 依赖**。
- **「契约」= 用户提供的 v1.6 合订文档**。注意：`docs/contracts/*`（Schema/Projection/Security/FlexStudy/Game/Migration 六份冻结合同）是**另一套更细粒度、且与 v1.6 不同的文档体系**。v1.6 声明「唯一事实来源」，但实现实际引用的是 `docs/contracts/*`——二者在存储引擎、事件命名、eventKey 结构上相互冲突（见 §3.3）。
- **判定符号**：✅ 满足 / ❌ 未满足 / ⚠️ 部分满足或需验证 / N/A 不适用。

---

## 2. 分层 Gap 总表

### A · Base + Surface（第一分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| A1.1 Sidebar | 240px / 68px | `--sidebar-w: 248px` / `.collapsed 64px` | ❌ |
| A1.1 Header | 64px（56~72） | 未在 token 中显式定义 header 高度 | ⚠️ |
| A1.2 Spacing Scale | xs4/sm8/md16/lg24/xl32/xxl48/xxxl64 | `--space-1..8` = 4/8/**12**/16/**20**/24/32/**40**（含 12/20/40，缺 48/64） | ❌ |
| A1.3 语义间距 L1~L5 | 6 级语义层级 + 严格降序 | 无 L1~L5 具名令牌；仅 `.section + .section {margin-top}` | ❌ |
| A1.4 字体 | `"Inter", system-ui` | 无 Inter；Segoe UI / PingFang SC | ⚠️ |
| A1.4 字重 | medium 550 | `--font-weight-medium: 500` | ⚠️ |
| A1.6 Focus Ring | width 2px / offset 1px | `outline: 2px` / `outline-offset: 2px` | ❌ |
| A1.7 状态模型 | Item/Header/Canvas 三态 + Focus-visible 术语 | 部分（`.is-disabled`/`.skeleton`/`.empty-state`）；无 Header Scrolled 态 | ⚠️ |
| A2 Surface 六层 | Plane/Section/Panel/Card/Floating/Overlay | 有 `.section/.panel/.card`；**无 Plane / Floating / Overlay 具名层**；无「Geometry Cannot Create Meaning」约束 | ⚠️ |
| A3.4 主题密度 | 每主题 L1~L5 独立区间 | 无密度区间实现，spacing 全局一套 | ❌ |

### B · Theme（第二分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| B1.1 Mist accent | `#C58F5E` 琥珀 | `#c9b89a` 纸金 | ❌ |
| B1.2 Fluent accent | `#3B82F6` | `#5b8def` | ⚠️ |
| B1.3 Night | 无 accent，glow 暖白 `#E8DCC8` | accent `#7c6eff` 冷紫（注释自述「冷紫蓝」） | ❌ |
| B1.4 Review Data | data-blue/green/yellow/red/violet 数据色板 | 全息青 `#00d4ff` 色板（含 chart-* 全息系） | ⚠️ |
| B2.0 Review Data Scope | 页面级 scope，不进全局主题枚举 | `data-visual-scope` 正确实现为页面级，未入 theme 枚举 | ✅ |
| B2.0 does_not_apply_to | 不应用于 Sidebar/Header/Global | `AppLayout.tsx:22` 在外层包装器上设 `data-visual-scope`，**可能级联到 Sidebar/Header** | ⚠️ |
| B2.2 Focus offset | 1px | 2px | ❌ |
| B5 Redline | 「Night 黑紫霓虹」禁止 | Night 采用紫色 accent（虽标注「非霓虹」） | ❌ |

### C / D · Component / Composite（第三、四分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| C1 Button | Compact 32 / Standard 36 / Major 40 | 有 Button 组件，未按三档几何冻结 | ⚠️ |
| C2 Control 家族 | Input/Checkbox/Select/Button 分层 | 有 Input/Dropdown/Button，无独立 Checkbox/Select 组件 | ⚠️ |
| C6/D6 风险分级删除 | Low/Medium/High/Critical 四级 + Undo | 有 Modal + Toast；无系统化四级风险删除模型 | ⚠️ |
| D6.2 DefaultDeleteModel | soft_delete → Archived（可恢复） | 类型系统无「Archived」态枚举；delete 多为物理删除 + projection 联动 | ❌ |
| D8 Auto-save 状态机 | Clean/Editing/Dirty/Saving/Saved/Save Failed/Offline/Recovered | 未实现完整状态机 | ❌ |

### P · Page（第五分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| P1.2 Page Registry | 12 页（Today/Inbox/Timeline/Plan/Diary/Memory/Tasks/Projects/Review/Games/**Collection**/Settings） | 实际路由远多于 12，**Collection 页缺失**（有 `collection.ts` 域逻辑 + `collectionEntries` 表，但无路由/页面） | ❌ |
| P1.3/P1.4 Today Contract T-001 | 严格 Canvas 结构 + R-P01~R-P12 | TodayPage 存在，未逐条验证 T-001 结构（需视觉走查） | ⚠️ |
| P1.3 Review 为 Analysis / Wide 1200 | — | ReviewLayout 仅 `<Outlet />`，无宽度/scope 语义承载 | ⚠️ |

### DO · Domain（第六分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| DO1.2 Primary(8) | Task/Project/Diary/Study/Game/Collection Item/**Person**/**Place** | Person→**Friend** 改名；**Place 实体缺失** | ❌ |
| DO1.2 Operational(1) | **Inbox Item** | 无 inbox 表；InboxPage 复用任务域，非独立实体 | ❌ |
| DO1.2 Projection(1) | **Review Projection**（Fresh→Stale→Rebuilt） | Review 实现为**域对象**（reviewEntries/reviewTemplates），非投影 | ❌ |
| DO1.3 生命周期 | 各对象含 Archived 态 | 多数对象无 Archived 状态 | ⚠️ |

### DP · Data & Projection（第七分册）—— 差距最大分册

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| DP1.1 SourceOfTruth | Domain Data + EventJournal（History/ProjectionInput/Audit） | Domain=IndexedDB 表；operationJournal 仅 30 天 | ❌ |
| DP1.3 SQLite WAL Boundary | SQLite + WAL，V9 不得解析 WAL | **无 SQLite**，WAL 条款整体失效 | ❌ |
| DP1.4 Projection Registry | Timeline/DailyMemory/Review/SearchIndex/**TodayOrdering** | Timeline✓ DailyMemory✓；Review 为域对象；SearchIndex 为直读域查询；**TodayOrdering 缺失** | ⚠️ |
| DP1.4a ProjectionPolicy | 每投影显式 consumes/excludes | timelineProjection 有 INCLUDE_SOURCE 映射，但事件命名与契约不同（`study.recorded` vs `studySession.completed`） | ⚠️ |
| DP1.5 原子性 + 幂等 | Domain+Journal 原子；commandId 去重 | 非原子；无 commandId | ❌ |
| DP1.6 eventKey | `<eventType>:<aggregateId>:<semanticVersion>` | `<sourceType>:<sourceId>:<eventType>:<instance>`，**semanticVersion 缺失** | ❌ |
| DP1.7 Storage 分层 | PrimaryDB/ProjectionDB/SearchIndex/FileSystem + `domain_/journal_/projection_/system_` 前缀 | 单一 Dexie DB，表名无前缀分区；备份走 localStorage | ❌ |
| DP1.8 Default Delete | soft_delete（Archived）/permanent_delete | 无 Archived；删除→projection 联动删除 | ⚠️ |

### R · Runtime（第八分册）—— 与 DP 并列的 S0 区

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| R1.1 三通道 | Interaction / Mutation(并发1,FIFO) / Background | 无显式通道模型；projection 为 fire-and-forget 异步（近似 Background） | ❌ |
| R1.2 Event Bus 三层 | Domain/Application/Runtime Event | 单一 AppEvent 联合类型，无三层划分 | ⚠️ |
| R1.3 Error Taxonomy | Validation/Domain/Projection/Security/Migration + Level1~5 | 有 checkDataIntegrity/ErrorBoundary，无 Recovery Level 分级 | ⚠️ |
| R1.4 Startup 序列 | 14 步 + Migration 六步 | 有 migrationV2/runner，无完整 14 步 Startup 序列 + Journal Integrity 检查 | ⚠️ |
| R1.5 备份安全 | Backup Key ≠ Vault Key；PBKDF2 ≥600K | PBKDF2 600K ✓（实测确认）；Backup/Vault 密钥隔离需复核 | ✅/⚠️ |
| R1.7 Fault Injection | 8 Hook + production disabled | **无任何 fault injection 代码** | ❌ |
| R1.8 R6-01~25 | 25 条红线 | R6-06（原子）❌、R6-13（WAL）N/A、R6-03/04/05（Lane+幂等）❌、其余部分满足 | ⚠️ |

### Q / G · Quality & Governance（第九、十分册）

| 契约项 | 契约要求 | 实现 | 判定 |
|---|---|---|---|
| Q1.6 Release Gate 0~4 | 五级 Gate | 仅 `contract-gate.mjs`（Contract Gate）+ 单测；无 Gate0 结构扫描 / Gate3 视觉基线 / Gate4 最终验收的自动化实现 | ❌ |
| Q1.2 Contract Gate | Machine-verifiable C/D/R/Q + Governance G | contract-gate 仅验证**六份合同文档相互自洽 + 迁移 Dry Run**，**不验证实现** | ❌ |
| Q1.3 Performance SLO | cold_start/normal_command/today_query/search 等硬指标 | 无性能 SLO 测量脚本（`utils/` 无 bench） | ❌ |
| Q1.7 Visual Baseline | theme×page×state×breakpoint + 像素级 diff | 无视觉基线机制 | ❌ |
| Q1.8 OS Matrix | Win 全量/macOS 兼容/Linux smoke | Tauri 仅配 NSIS（Windows），无 macOS/Linux 产物证据 | ⚠️ |
| G1.6 Technical Debt Register | 结构化字段（id/impact/workaround/target_version…） | 无正式 Debt Register；仅 Audit 文档内 10 项清单 | ⚠️ |
| G1.5 Governance Roles | PO/Arch/Security/Release 四角色 + 冲突仲裁 | 未落地（单人项目，可接受，但属契约未实现） | ⚠️ |

---

## 3. 重点 Gap 详析

### 3.1 【S0】存储引擎与事件架构整体错位

v1.6 的 Data/Runtime 分册是围绕 **SQLite + WAL + Event Journal + Mutation Lane** 写的：

- `DP1.3`：`database_engine: SQLite, journal_mode: WAL`；V9 不得解析 WAL 重建业务状态。
- `DP1.7`：PrimaryDB（Domain+Journal）/ ProjectionDB / SearchIndex / FileSystem 四层，`domain_/journal_/projection_/system_` 前缀分区。
- `R1.7`：`after_journal_write` hook 明写「Event Journal 记录已写入 SQLite，但外层事务尚未 COMMIT」，期望 SQLite 回滚整个事务。
- `R6-13`：「SQLite WAL 不得被 V9 作为业务事件源解析」。

实现为 **Dexie/IndexedDB**，`src-tauri/src/lib.rs` 无任何 SQLite 依赖。这意味着契约中关于 WAL 崩溃恢复、事务原子提交、journal 语义的**一整套条文在实现中不成立（N/A）**。这不是「实现略有偏差」，而是「契约描述的运行时在实现中不存在」。

### 3.2 【S0】无 Mutation Lane / commandId 幂等 / 故障注入

对 `src/` 全量检索 `commandId|idempoten|faultInject|MutationLane|mutation lane` **零命中**。

- `R1.1` 三通道（Mutation Lane 并发 1 / FIFO）未实现。
- `DP1.5` CommandIdempotency（commandId 与 Domain Mutation 同事务持久化、重启后去重）未实现。
- `R6-03/04/05`（Mutation Lane 并发/FIFO、commandId 入口去重、已处理 commandId 不重复发事件）未满足。
- `R1.7`/`Q1.5` 故障注入 Hook 集合（before_domain_commit / after_journal_write / mid_projection / mid_backup_write / mid_migration_transform / mid_import / mid_export）在源码中**完全不存在**。

而 `V9_RELEASE_READY_REPORT.md` §5 却登记「FAULT INJECTION / RECOVERY ✅」。此为自报绿门与实际实现不符的直接证据。

### 3.3 【S0/S1】Event Journal 语义降级为「30 天审计日志」

`db/journal.ts`：`JOURNAL_RETENTION_DAYS = 30`，`pruneJournal()` 滚动删除。但契约 DP1.1 要求 EventJournal 承担「Domain Event History + Projection Input + Audit」三重角色，DP1.5 要求 commandId 记录 `retention_window: indefinite`。

- 30 天滚动 → 无法作为长期 Projection Input（Timeline 重建实际读事实表，未消费 journal，故「Projection Input」角色名存实亡）。
- 30 天滚动 → 无法作为持久 Audit 轨迹。
- `restoreSnapshot()` 的 `replayRecentJournal()` 依赖 30 天内的 journal，超出部分静默丢失。

### 3.4 【S1】备份持久化仍走 localStorage

`db/snapshot.ts` 顶部注释原文：「（Tauri 文件持久化在 Phase 6 接入；当前走 localStorage）」。快照载荷经 `snapshotStorage.save → localStorage.setItem` 落库。

- `V9_RUNTIME_HEALTH_REPORT.md` 标记 M6（安全与文件）✅，但备份快照实际未落盘到 Tauri 文件系统。
- localStorage 受 WebView 源隔离、约 5–10MB 容量、可被清空三重约束，不满足「Secure → Backup → Restore」闭环 D 的持久性要求。
- 注：私密文件已正确落 Tauri `PrivateWorkbench/files`（`lib.rs` + 防路径逃逸 `validate_rel_path`），此条不涉私密文件，仅涉备份快照。

### 3.5 【S1】数据完整性检查遗漏 V9 全部新表

`utils/errorRecovery.ts` 的 `TABLE_NAMES` 仅列 22 张 **V8 老表**（tasks…settings），**不含任何 V9 新表**（diaries/events/friends/timelineEvents/dailyMemory/collectionEntries/games 等）。故 `checkDataIntegrity()` 对 V9 用户数据**形同虚设**，违反 R6-14 的 Integrity Check 语义。

### 3.6 【S1】Domain 与 Projection 模型错位

- **Place 实体缺失**、**Inbox Item 非独立实体**、**Person→Friend 改名**（DO1.2 Primary/Operational 清单不吻合）。
- **Review 被实现为域对象而非投影**：契约 DP1.4 将 Review 列为「Source: Domain, Journal 依赖: 否」的投影，生命周期 Fresh→Stale→Rebuilt；实现为可编辑的 reviewEntries/reviewTemplates 域表。
- **Today Ordering 投影缺失**（DP1.4 明确列出）。
- **eventKey 结构不符**：契约 `<eventType>:<aggregateId>:<semanticVersion>`，实现 `<sourceType>:<sourceId>:<eventType>:<instance>`，且 `semanticVersion` 完全缺失（DP1.6）。

### 3.7 【S1】「Contract Gate 70/70」≠ 实现保真

`scripts/contract-gate.mjs` 的职责（脚本自述）：
1. 六份合同齐全性 + 机器块解析；
2. 合同间交叉一致性；
3. Migration Dry Run（样例 → 转换 → 计数 → SHA-256 → 与期望导出比对）。

它校验的是 **`docs/contracts/*` 六份冻结合同之间的自洽 + 迁移样例**，**从不读取 `src/` 源码去核对实现是否符合契约**。因此「70/70 PASS」无法支撑「实现与 v1.6 契约一致」的结论。

---

## 4. 正确实现项（平衡评估）

以下契约项在实现中得到**正确落地**，应予以肯定：

| 项 | 证据 |
|---|---|
| Review Data Scope 为页面级 scope、不入全局主题枚举（B2.0） | `data-visual-scope` 实现，未加入 `data-theme` 值域 |
| Projection 从事实表确定性重建（DP1.2「Facts → Rebuild」） | `timelineProjection.rebuildProjection()` 遍历各事实表 |
| Daily Memory Facts/Reflection 分离、聚合器永不写 reflection（DP1.2 核心规则） | `dailyMemory.ts` `setDailyReflection` 为 reflection 唯一入口 |
| 普通备份排除 vault/privateFileMeta/appLock（D6/G 安全边界） | `BACKUP_EXCLUDED_TABLES` / `SNAPSHOT_EXCLUDES` |
| PBKDF2-HMAC-SHA256 600,000 迭代（R1.5） | 实测 ≈114ms，`appLock` 冻结参数 |
| 私密文件落 Tauri 私目录 + 路径逃逸防护（§24/DP1.7 FileSystem） | `lib.rs` `validate_rel_path` + `PrivateWorkbench/files` |
| Tauri 权限最小化（不开 `fs:read-all/write-all`） | `capabilities/default.json` 仅 core 默认 + window + notification |
| 迁移走 Python Sidecar、不进 V9 Core（§27） | `migration_sidecar/` 独立存在 |

---

## 5. 优先级 Gap 登记表

| 级别 | 编号 | Gap | 关联契约 |
|---|---|---|---|
| S0 | G-01 | 存储引擎错位：SQLite/WAL（契约）vs IndexedDB（实现） | DP1.3/DP1.7/R1.7/R6-13 |
| S0 | G-02 | 无 Mutation Lane / commandId 幂等 / 三通道模型 | R1.1/DP1.5/R6-03~05 |
| S0 | G-03 | Domain Mutation + Journal Write 非原子 | DP1.5/R6-06 |
| S0 | G-04 | EventJournal 降级为 30 天滚动日志 | DP1.1/DP1.5 |
| S0 | G-05 | 无故障注入 Hook（自报 PASS 不符） | R1.7/Q1.5 |
| S1 | G-06 | 备份快照走 localStorage，未落 Tauri 文件 | DP1.7/M6 |
| S1 | G-07 | 完整性检查遗漏全部 V9 新表 | R6-14 |
| S1 | G-08 | Domain 模型错位（Place 缺/Inbox 非实体/Review 非投影） | DO1.2/DP1.4 |
| S1 | G-09 | eventKey 结构 + semanticVersion 缺失 | DP1.6 |
| S1 | G-10 | Today Ordering 投影缺失 | DP1.4 |
| S1 | G-11 | Collection 页面缺失 | P1.2 |
| S1 | G-12 | Contract Gate 不验证实现 | Q1.2/Q1.6 |
| S2 | G-13 | Night 紫色 accent（B5 红线）/ 四主题色值偏差 | B1/B5 |
| S2 | G-14 | 布局常量偏差（Sidebar 248/64、offset 2px、spacing 尺） | A1.1/A1.2/A1.6 |
| S2 | G-15 | 语义间距 L1~L5 / Surface 六层未具名落地 | A1.3/A2 |
| S2 | G-16 | Page Registry 超集 + 缺少规范页 | P1.2 |
| S2 | G-17 | Release Gate 0~4 / Visual Baseline / 性能 SLO 无自动化 | Q1.3/Q1.6/Q1.7 |
| S2 | G-18 | 无正式 Technical Debt Register | G1.6 |

---

## 6. 根因判断

1. **契约与实现分属两条技术路线**：v1.6 的 Data/Runtime 分册按「SQLite + Event Sourcing 风格」撰写，而 V9 工程从一开始（`V9_MASTER_PLAN.md` §33）就确定 Dexie/IndexedDB。两者从未对齐，v1.6 却声明「唯一事实来源」。
2. **文档与工程脱节**：`docs/contracts/*`（冻结合同）与 v1.6 合订本并存，且事件命名/eventKey/存储引擎互不一致，实际工程绑定的是前者，而审计输入是后者。
3. **验证范围错位**：Contract Gate 只做「合同文档自洽」，运行时矩阵只做「单元测试」，没有一条自动化路径把「实现」与「设计契约」做逐项对照，导致 S0 级偏差长期未被暴露。

---

## 7. 建议（NEXT ACTION）

1. **冻结前先做一次「契约 vs 实现」的机器对照**：新增一个 `implementation-gate`（读 `src/`，逐项核对 v1.6 机器可验证项），与现有 `contract-gate` 并列，堵住 G-12。
2. **裁定存储引擎**：二选一并回写契约——要么 v1.6 的 Data/Runtime 分册改为 IndexedDB 语义（删 WAL/事务回滚条款），要么实现迁 SQLite。当前二者并存属「契约漂移」，违反 Frozen Contract Rule（G1.2）。
3. **补齐 S0 缺失**：Mutation Lane + commandId 幂等（或明确声明降级并登记 Debt）、Domain+Journal 原子写、故障注入 Hook（R1.7 是 Q1.5 与 Gate3 的前置）。
4. **备份落盘**：快照从 localStorage 迁至 Tauri 文件持久化，否则闭环 D 的「Restore clean environment」验收（G1.4）无法真正通过。
5. **修 `errorRecovery.ts` 的 TABLE_NAMES**：纳入全部 V9 表（低风险、立即可做）。
6. **主题/布局对齐**：Night 紫色 accent 触及 B5 红线，需回契约评审（Behavior 级变更，G1.1 要求重新审核 Contract）。
7. **补建 Technical Debt Register**（G1.6 字段），把本审计的 S0/S1 项登记入册，随 Release Review 复评。

---

> 本审计仅陈述「设计契约 vs 实现」的客观差距，不修改任何代码。是否将上述 Gap 登记为 Debt、回写契约、或修实现，属 Governance 决策，需 Product/Architecture Owner 共同签署。
