# V9 施工蓝图总档（MASTER PLAN）

> 本文档是 V9 Personal OS 的唯一施工蓝图上位文件，两份原始输入合并存档：
> - Part A：启动令（执行纪律 / 8 里程碑 / 验证清单 / 降级决策 / 成功标准）
> - Part B：完整实施方案 v1.0（56 节）
> 与合同冲突时，以 `docs/contracts/` 下冻结合同为准（合同是蓝图的冻结化产物）。

---

# Part A — 启动令

## 目标

不是一次性造出所有功能，而是一步步构建闭环。目标不是"写完代码"，而是让以下四条主线依次跑通：

1. Today → Work → Review（学习闭环）
2. Life → Diary → Timeline（生活记录闭环）
3. Play → Record → Timeline（兴趣记录闭环）
4. Secure → Backup → Restore（安全闭环）

当这四条闭环全部绿灯，V9 Core 即成功。

## 执行原则

1. 不推倒 V8，所有成熟模块（Task、Plan、Knowledge、Mistake、Flashcard、Score、Review、Search、EventBus、Theme、Vault、Backup、Tauri、Dexie）视为底座。
2. P0 按闭环，不按功能数量——每个阶段只关注一条完整路径，不贪多。
3. Diary 不复制其他域事实，只做投影。
4. Timeline / Daily Memory 均为 Projection，必须可重建。
5. EventBus 是跨域联动主路径，禁止页面直接调用其他域 Store。
6. Flex Study 永远保留 Manual Fallback（硬安全阀）。
7. Game Adapter 永远不能成为 Core Dependency。
8. 推荐系统不依赖 LLM，P2 才考虑本地 ML。
9. Migration 必须可回滚，且先 Dry Run。
10. 普通 Backup 不包含 Vault 私密内容。
11. 主密码派生密钥绝不能持久化。
12. Python 只用于 Legacy Migration Sidecar，不进入 V9 Core。
13. 每个 Phase 的 Done 必须经过 Runtime Health Check。

## 8 个里程碑（每完成一个必须 Gate 验证，全部通过才进入下一里程碑）

| 里程碑 | 内容 | 核心交付 |
|---|---|---|
| M0 契约冻结 | Phase 0~0.5 | 六份合同 + Migration Dry Run 样例全绿 |
| M1 底座与安全基础 | Phase 1 | Dexie Schema、Domain 实体、EventBus、App Lock、Backup 骨架、Migration Sidecar |
| M2 LIFE 闭环 | Phase 2 | Diary、Diary Calendar、Calendar/Event、Friends、Life Moments |
| M3 WORK 闭环 | Phase 3 | Today、Flex Study、V8 整合、Night Shutdown |
| M4 PLAY 闭环 | Phase 4 | Anime、Generic Game、Music Memory |
| M5 跨域投影 | Phase 5 | Timeline Projection、Daily Memory、Collection Core |
| M6 安全与文件 | Phase 6 | Private Files、自动备份、Restore |
| M7 系统与迁移 | Phase 7~8 | 全局搜索、通知、导出、设置、MyDiary 完整迁移 |
| M8 视觉打磨与最终 QA | Phase 9~15 | 微动效、Accessibility、Runtime Matrix、E2E、打包 |

## 每日/每周验证清单

每天结束：TypeScript/单测通过？受影响页面 CRUD 手测？至少两个主题检查？数据变更是否更新投影/迁移脚本？

每完成一个里程碑：`pnpm test:unit` / `pnpm test:integration` / `pnpm build` / `pnpm tauri dev`，并更新 `V9_RUNTIME_HEALTH_REPORT.md`。

## 黑天鹅降级决策（必须实现时就内建）

- Flex Study 算法异常 → 切换 planningMode = manual，回退 V8 排序。
- Game Adapter API 超时 → 使用 lastKnownData，进入 offlineMode，允许手动编辑。
- Sidecar 迁移失败 → Retry 三次，仍失败则 Skip，保留旧 MyDiary 只读，V9 继续运行。
- Timeline 数据错乱 → 执行 rebuildProjection()，从各域事实表重新生成。
- 备份文件损坏 → 自动回退到上一份 Snapshot（保留当前数据，但提示用户）。

## 最终成功标准（四个场景）

1. **学习日**：Today → Flex Study 完成 MUST → 错题/闪卡 → Night Shutdown → Review 周进度 → 明日计划自动生成。
2. **记录生活**：LIFE → 写带照片 Diary → 添加好友生日 → 日历显示所有事件 → Timeline 看到日记和生日事件。
3. **娱乐时光**：PLAY → 标记一集动画进度 → 记录一场游戏结果 → Timeline 娱乐摘要 → Daily Memory 整合学习/生活/娱乐。
4. **安全无忧**：App Lock 保护启动 → 手动备份 → 删除数据 → Restore 恢复 → 全部恢复，Timeline 重建一致。

> 每次提交代码前自问："这个改动是否让『今天过好，然后记得它』更近一步？"

---

# Part B — 完整详细实施方案 v1.0

**项目定位**：个人工作台 V9 / Personal OS
**基础项目**：Workbench V8 + MyDiary 2.x
**目标平台**：Windows Desktop（Tauri）
**前端**：React + TypeScript
**本地数据**：Dexie / IndexedDB
**桌面能力**：Tauri / Rust
**遗留迁移**：Bundled Python Sidecar
**测试**：Vitest + fake-indexeddb + Playwright
**方案状态**：施工冻结版
**原则**：先方案、后设计、后工程；不在方案阶段直接修改业务代码。

## 1. 项目最终目标

将成熟的 Workbench V8 与独立 MyDiary 2.x 合并为单一桌面应用：**个人工作台 V9 · Personal OS**。

V9 不定义为"V8 + 一个日记模块"，而定义为：**以 Today 为入口，以 Timeline 为主线，以 LIFE / WORK / PLAY 为三个生活空间，以 Review 为反馈机制的本地 Personal OS。**

用户侧一句话：**帮你把今天过好，然后记得它。**

## 2. V9 与 V8 的关系

**不推倒 V8。** V8 已验证的能力全部视为成熟底座优先复用：Task、Plan、Knowledge、Mistake、Flashcard、Score、Review、Search、EventBus、Theme、Vault、Backup、Tauri、Dexie、Vitest、错误边界、数据迁移机制。

V9 主要负责新增：LIFE、PLAY、Diary、Calendar/Event、Friends、Materials、Articles、Timeline、Daily Memory、Night Shutdown、Flex Study、Generic Game、App Lock、MyDiary Migration。

## 3. 产品最终结构

```text
PERSONAL OS
├── TODAY
├── LIFE（Diary / Calendar·Event / Friends / Materials / Articles / Life Moments）
├── WORK（Plan / Task / Study / Knowledge / Mistake / Flashcard / Score / Reading / Review / Flex Study / Night Shutdown）
├── PLAY（Anime / Game / Music / Collection）
├── CROSS DOMAIN（Timeline / Daily Memory / Collection / Global Search）
├── SYSTEM（Backup / Notification / Export / Settings）
└── SECURITY（App Lock / Vault / Private Files）
```

## 4. 四个核心用户闭环

- 闭环 A（晚间学习）：放学 → Today → Flex Study → Task/Study → Mistake/Flashcard → Night Shutdown → Review → Next Action → 明日计划。这是 V9 最重要的闭环。
- 闭环 B（生活记录）：Today/LIFE → Diary → Calendar/Event → Timeline → Daily Memory。
- 闭环 C（兴趣记录）：PLAY → Anime/Game/Music → Collection/Progress → Timeline → Daily Memory。
- 闭环 D（安全）：App Lock → 正常使用 → Auto Backup → Snapshot → Restore。

## 5. V9 不做什么

不重新实现完整音乐播放器；不替代 QQ 音乐；不实现完整社交系统；不实现复杂习惯打卡平台；不实现通用 AI 助手；不以 LLM 作为推荐系统基础；不把所有数据都复制进 Diary；不把 Enka/第三方 API 作为 Core Dependency；不让 Game Adapter 依赖核心业务；不在 V9 Core 引入完整 Event Sourcing；不因新功能破坏现有 V8 学习闭环。

## 6. P0 / P1 / P2 范围

**P0（V9 Core）**：TODAY（Dashboard/Daily Plan/Today Summary/Timeline 摘要/Daily Memory/Night Shutdown 入口）；LIFE（Diary/Diary Calendar/Calendar·Event/Friends·Birthday/Life Moments）；WORK（V8 Task/Plan + Study/Knowledge/Mistake/Flashcard/Score/Review + Flex Study/Night Shutdown）；PLAY（Anime/Generic Game/Music Memory）；CROSS DOMAIN（Timeline Core/Daily Memory/Collection Core/Global Search）；SECURITY（App Lock/Auto Backup/基础 Restore）。

**P1**：Collection 页面、Year in Review、高级 Calendar、游戏深度能力、原神/ZZZ 基础 Adapter、推荐 v1、更丰富 PLAY UI、私密文件完整体验、高级通知策略。

**P2**：Combat Lab、本地 ML 推荐、高级推荐探索、更多游戏 Adapter、Minecraft Adapter、更复杂年度回顾、跨设备同步、高级统计。

## 7. Today 详细方案

Today 是 V9 唯一主入口。回答"今天是什么情况？"而不是"系统所有东西是什么情况？"。

页面结构：日期/当前状态 → 今日最重要的事 → WORK → LIFE → PLAY → Timeline → Daily Memory → Night Shutdown。

P0 首页禁止塞入：全量项目、全部成绩历史、所有笔记、全量游戏数据、长篇图表、全量收藏、全部日记正文。

## 8. Flex Study 实施方案

针对用户：早上 7 点前后到校、晚上 21:30 后放学、学习时间短且不稳定。不能使用刚性时间表。

三层优先级：MUST 必须完成 / SHOULD 尽量完成 / COULD 有时间再做。

核心数据：`StudyPlanItem { taskId, estimatedMinutes, actualMinutes, priority, flexibility, state }`。

动态调整输入：availableMinutes、estimatedMinutes、actualMinutes、priority、deadline、energy；输出：当前应该做什么、剩余多少时间、哪些任务降级、哪些任务推迟。

禁止行为：删除用户任务、修改用户原始内容、自动将高优先级任务改成低优先级、强迫用户按照算法执行。

Fallback：默认 `planningMode = adaptive`；算法异常或用户主动关闭 → `planningMode = manual`，回退到 V8 原任务排序逻辑。这是 V9 的硬安全阀。

## 9. Night Shutdown

Night Shutdown 是每日轻量收口。职责边界：Night Shutdown 回答"今天怎么样？"（Daily Snapshot）；Review 回答"从一段时间来看，发生了什么？下一步应该怎么办？"（Periodic Analysis）。

输入：今日任务、今日学习、今日错题、今日闪卡、今日日历事件、今日 Diary、今日 PLAY 活动。输出：completed、unfinished、reason、reflection、tomorrowFocus。Night Shutdown 进入 Review 的数据管道，不单独建立第二套重复统计体系。

## 10. Diary 设计

数据边界——负责：天气、心情、今天发生的事、有趣的小事、个人感受、一句话、长文、生活照片。不拥有：Task、Flashcard、Mistake、Anime progress、Game progress、Music play count。

跨域引用：Diary 可以显示"今日完成 4 项任务 / 今日复习 42 张闪卡 / 今天看完 1 部动画"，但这是 Projection/Reference，不是复制原数据。

## 11. Timeline 架构

核心原则：**Timeline 不是事实数据库，而是事件投影。** 主链路：Domain → EventBus → Timeline Projection → timeline_events。

`TimelineEvent { id, sourceDomain, sourceType, sourceId, eventType, occurredAt, title, summary }`。

禁止 `timeline.taskPayload / diaryPayload / gamePayload` 之类载荷复制，只保留 sourceType/sourceId/事件元数据。

Timeline 必须支持重建：正常 EventBus → Projection；异常/migration/restore → Facts → Projection Rebuild → Timeline。**EventBus 是主更新路径，不是唯一数据来源。**

## 12. Daily Memory 架构

Daily Memory 同样属于 Projection：Facts + Domain Events → Daily Memory Aggregator → Daily Memory Projection。内容分为 Facts（机器整理事实）与 Human Reflection（人留下意义），例如 Facts: 学习 96 分钟 / 完成 4 个任务 / 复习 42 张闪卡；Human: "今天终于把那道错了很久的题弄明白了。"

## 13. Data Lineage

所有进入跨域层的数据必须具有：sourceDomain、sourceType、sourceId、createdAt、occurredAt。系统在源头写入时就知道，用户不需要手工告诉系统"这是 WORK 数据"。

## 14. Domain Event 规范

标准事件：task.created/completed/deleted、diary.created/updated、flashcard.reviewed、mistake.created、review.completed、anime.completed/updated、game.recorded、music.logged、event.created/completed、friend.birthday。所有跨域系统只消费事件。（V9 冻结版全表见 PROJECTION_CONTRACT §2。）

## 15. EventBus 规则

禁止业务页面直接 A Store 调用 B Store。跨域关系统一：A Domain → EventBus → B Projection/Domain Service。Domain 内部允许直接调用自身的数据服务。

## 16. LIFE 详细实施

- Diary：Quick、Long、Calendar View、Mood、Weather、Tags、Life Moments。
- Calendar：统一呈现 Event / Task / Birthday / Review，但 Event 与 Task 数据实体保持独立。
- Friends：name、alias、birthday、relationship、contact、note。生日自动生成 Event。

## 17. PLAY 详细实施

- Anime：状态 planned/watching/completed/paused/dropped；评分、收藏、感想、人物、时间记录、Discovery。
- Music：只做音乐档案、歌手、感想、收藏、与 Diary/Timeline 关联；不做播放器。

## 18. Generic Game

`Game { id, name, icon, genre, platform, status }`；能力：profile、tasks、progress、collection、playtime、sync、team、combat。用户可以 PLAY → 添加游戏 → 选择能力，不需要修改源码。

## 19. Game Adapter Contract

```ts
interface GameAdapter {
  gameId: string
  getCapabilities(): GameCapability[]
  fetchProfile(): Promise<GameProfile>
  fetchRecords(): Promise<GameRecord[]>
  simulateCombat?(input: CombatSimulationInput): Promise<CombatSimulationResult>
}
```

Core 隔离：Generic Game → Adapter optional，而不能 Game → 必须 Adapter。API 失败允许 lastKnownData/offlineMode/manualEdit/retry；禁止白屏、死循环 loading、数据清空、强制删除缓存。

## 20. Genshin / ZZZ

V9 首发 Generic Game；V9.1 上 Genshin Adapter、ZZZ Adapter（原神优先）。第一层：Showcase/Profile/Character/Weapon/Artifact/Team；第二层：Simulation/DPS。DPS 必须标注 theoretical 并明确计算条件，不能假装是实际战斗测量结果。

## 21. Recommendation System

不使用 LLM。推荐层 = Rule Engine + Content Similarity + Implicit Feedback + Exploration。反馈权重示例：click +1、detail +2、watch +5、completed +8、favorite +8、rating≥9 +10、skip -4、remove -10（允许版本调整）。冷启动用：用户主动收藏、初始兴趣标签、已看作品、已评分作品；不依赖其他用户。本地 ML 为 P2，V9 Core 不依赖模型。

## 22. Security

App Lock：Master Password → PBKDF2-HMAC-SHA256 → KEK。参数：Salt 128 bit、AES-GCM 256 bit、IV 96 bit。迭代次数不允许写死为业务常量，应通过 benchmark 冻结具体版本参数。

## 23. Private File

Password → KDF → KEK → Random DEK → AES-GCM → Encrypted File。文件元数据进入 Dexie，文件内容进入 Tauri 私有目录。

## 24. Tauri 文件权限

只开放 `PrivateWorkbench/**`，不开放任意磁盘权限；禁止 `fs:read-all`、`fs:write-all`。

## 25. Backup

Snapshot + Lightweight Journal。Snapshot：Daily × 7 + Weekly × 4；高风险操作前自动创建 snapshot。Journal 记录 task.deleted / diary.updated / anime.completed 等，用于恢复最近误操作。普通 Backup 永不包含 Vault 私密内容。

## 26. Restore

恢复粒度：Full Snapshot + Recent Journal Recovery。恢复前必须 create safety snapshot；恢复后 integrity check + projection rebuild。

## 27. MyDiary Migration

最终架构：Workbench.exe ├ React ├ Tauri/Rust ├ Dexie └ migration-tool.exe。Python 只负责 Legacy JSON、Legacy Fernet、Legacy password verification、Migration extraction，不参与 V9 Core。

## 28. Sidecar 通信

优先 Sidecar → migration_export.json → Workbench，而不是让 V9 长时间依赖实时 IPC。

## 29. Migration Contract

标准：Source → Transform → Target → Validate → Commit。所有模块都必须有 sourceCount、targetCount、failedCount、skippedCount、checksum。

## 30. Migration Failure

Sidecar 失败：显示失败 → Retry → Diagnostics → Skip Migration，用户仍然可以继续使用 V9。禁止强制要求手动导出明文数据。旧 MyDiary 保留只读/归档。

## 31. Migration Dry Run

正式迁移前：Sample Data → Migration → Validation → Manifest → Rollback。真实数据迁移前必须通过。

## 32. MyDiary 归档策略

不要立即删除。最终：Workbench Migration → Data Validation → Backup → Old MyDiary READ ONLY → Observation → User Confirmation → Archive。

## 33. Dexie Schema

由 `V9_SCHEMA_CONTRACT.md` 冻结。重点新增：diaries、materials、articles、friends、events、scores、privateFileMeta、appLock、timelineEvents、dailyMemory、collectionEntries、games、gameRecords。具体字段、索引、nullable、枚举在 Schema Contract 单独冻结。

## 34. Diary 主键策略

不采用 date as primary key；默认 `++id`，建立 date 索引，未来支持一天多篇。

## 35. Search

全局搜索继续复用 V8 Search，扩展 Diary/Article/Material/Friend/Anime/Game/Music/Event/Timeline。搜索结果统一：sourceDomain、sourceType、sourceId、title、snippet。

## 36. Theme

继续继承 V8：Mist、Fluent、Night、Review Data。LIFE/WORK/PLAY 是区域微风格，不是第四层主题。

## 37. Motion

LIFE 柔和（fade/paper light/slow glow）；WORK 快速明确（check/shift/snap/data update）；PLAY 更丰富（cover hover/subtle parallax/glow/progress animation）。

## 38. 任务完成动画

点击完成：press → checkbox confirm → line transition → 微弱粒子/光晕 → 状态变更 → EventBus。四主题：Mist 纸页亮起、Fluent 卡片微浮、Night 聚焦点灯、Review 数据脉冲。

## 39. Accessibility

每个模块必须支持：keyboard、focus-visible、screen reader semantics、color-independent status、reduced-motion、44px interaction target。

## 40. Runtime QA

必须建立 Module Health Matrix：Module ×（Startup / Empty State / Normal State / Create / Read / Update / Delete / Search / Filter / Keyboard / Theme / Error / Recovery）。

## 41. 每个页面必须验证

首次启动、刷新、切换路由、返回、关闭、重新打开、无数据、有数据、异常数据、网络失败、主题切换、键盘操作。

## 42. V9 的 Phase

Phase 0 Baseline/Safety Freeze → Phase 0.1 Contract Freeze → Phase 0.5 Migration Dry Run → Phase 1 Foundation → Phase 2 LIFE → Phase 3 WORK → Phase 4 PLAY → Phase 5 Cross Domain → Phase 6 Security & Files → Phase 7 System → Phase 8 MyDiary Migration → Phase 9 Visual/Motion → Phase 10 Recommendation → Phase 11 Game Adapter（V9.1 轨道，不阻塞 Core Release）→ Phase 12 Full QA → Phase 13 E2E/Tauri → Phase 14 Release Candidate → Phase 15 Final Release。

## 43. 并行执行关系

Contract ├ Design ├ Migration └ Foundation；Foundation ├ LIFE ├ WORK └ PLAY；LIFE+WORK+PLAY → Cross Domain；Security 可以部分并行；Recommendation/Adapter 后置；QA → Release。

## 44. DESIGN / CODE / WORK 三方协作

三方保持不直接互通。WORK 定义做什么/为什么/产品逻辑；DESIGN 定义长什么样/怎么交互/视觉规范；CODE 定义怎么实现/数据如何组织/工程如何落地。

## 45. 人工转接规则

WORK → WORK_SPEC → 人工转给 DESIGN → DESIGN_SPEC → 人工转给 CODE → CODE_SPEC → Implementation。Agent 不允许自行读取另一方"未授权输入"替代正式交接。

## 46. Trae Work 自主执行规则

可以连续执行多个 Phase，但必须：Read Master Plan → Read Current Phase → Implement → Test → Build → Runtime Check → Gate → Next Phase。

## 47. Trae 什么时候必须停？

仅在 NEED_CONFIRM 时停，例如：数据语义改变、用户隐私边界改变、Schema 重大破坏性变更、安全协议改变、P0 范围扩大、第三方服务选择重大变化、原需求存在多个不可兼容解释、可能造成历史数据不可逆损坏。

## 48. 不需要确认的情况

CSS、重构、文件拆分、类型改进、测试补充、性能优化、bug 修复、无破坏性 API 调整、UI 微调、token 使用、缺少的错误处理——前提：不改变冻结产品语义。

## 49. Definition of Done

任何 Phase：功能完成 AND TypeScript PASS AND Unit PASS AND Integration PASS AND Build PASS AND Runtime PASS AND 页面启动 PASS AND Error PASS AND Theme PASS AND Accessibility PASS AND Regression PASS。

## 50. 全局 Runtime Gate

每次 Release Candidate 必须自动生成 `V9_RUNTIME_HEALTH_REPORT.md`，包含 LIFE/WORK/PLAY/TODAY/TIMELINE/DAILY MEMORY/REVIEW/SEARCH/SETTINGS/VAULT/SECURITY，每项必须有 STARTUP=CRUD=EMPTY=ERROR=RECOVERY=THEME=PASS。

## 51. 黑天鹅降级体系

Flex Study 失败 → Adaptive→Manual；Game API 失败 → Adapter→Offline→Generic Game；Sidecar 失败 → Migration→Retry→Skip→V9 continues；Timeline Projection 损坏 → Projection→Rebuild from Facts；Backup 损坏 → Current Data→Older Snapshot。

## 52. 最终风险优先级

S0：数据丢失、Vault 泄露、错误迁移、主密码失效、Restore 失败。S1：Flex Study 错误规划、Timeline 投影错误、Diary/Work 数据串域、Game Adapter 破坏 Core。S2：推荐不准确、页面性能、UI 细节、动画缺失。

## 53. V9 首发成功标准

不要求"所有梦想功能完成"，而要求四件事：Today→Work→Review 完整；Life→Diary→Timeline 完整；Play→Record→Timeline 完整；Secure→Backup→Restore 完整。这四条闭环成立：V9 Core Release = SUCCESS。

## 54. 最终产品结构

用户每天最常接触：TODAY → LIFE/WORK/PLAY → TIMELINE → DAILY MEMORY → NIGHT SHUTDOWN → REVIEW → NEXT ACTION。这条链就是整个 V9 的"脊柱"。

## 55. 最终工程原则（15 条）

1. V8 不推倒。2. P0 按闭环，不按数量。3. Diary 不复制其他域事实。4. Timeline 是 Projection。5. Daily Memory 是 Projection。6. EventBus 是跨域联动主路径。7. Projection 必须可重建。8. Flex Study 永远保留 Manual Fallback。9. Game Adapter 永远不能成为 Core Dependency。10. 推荐系统不依赖 LLM。11. Migration 必须可回滚。12. 普通 Backup 不包含 Vault。13. 主密码派生密钥不能持久化。14. Python 只属于 Legacy Migration。15. 最终完成必须经过 Runtime Health Check。

## 56. 最终 V9 愿景

V8 是"帮助我学习和工作"。V9 是"帮助我生活、学习、娱乐，并记住我经历过的一天"。

```text
                   PERSONAL OS
                         │
             ┌───────────┼───────────┐
             ↓           ↓           ↓
            LIFE        WORK        PLAY
             │           │           │
             └───────────┼───────────┘
                         ↓
                       TODAY
                         ↓
                      TIMELINE
                         ↓
                   DAILY MEMORY
                         ↓
                  NIGHT SHUTDOWN
                         ↓
                       REVIEW
                         ↓
                    NEXT ACTION
```

**这就是 V9 的完整施工蓝图。**
