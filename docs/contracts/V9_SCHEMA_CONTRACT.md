# V9_SCHEMA_CONTRACT — Dexie 数据库结构契约

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-001 |
| 版本 | 0.1.2（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §33 / §34 |
| 关联合同 | V9-C-002（投影）、V9-C-003（安全）、V9-C-004（Flex Study）、V9-C-005（游戏）、V9-C-006（迁移） |
| 基线事实来源 | `workbench-v8/src/db/database.ts`（真实代码，2026-08-30 勘察） |

---

## 1. 目的与总约束

1. 冻结 V9 全部**新增表**的字段、索引、枚举；冻结 V8 底座表的**只读引用**边界。
2. V9 是 V8 的**原地增量演进**：IndexedDB 数据库名保持 `WorkbenchV8` 不变（改名 = 用户数据丢失，禁止）。工程目录 `workbench-v8/` 保留（git 层面重命名目录不改变本契约）。
3. Dexie 版本号**单调递增**：当前基线 version 2，V9 所有新增表通过 `version(3)` 起的一次或多次升级挂载。
4. 任何破坏本契约的变更（改 V8 表结构/索引、改已冻结枚举、删字段语义）属于 NEED_CONFIRM，必须停下请示。

---

## 2. V8 底座冻结（只读引用）

以下 22 张表为 V8 现状，**V9 不得修改其结构、索引与字段语义**。基线已在 2026-08-30 从 `database.ts` 实测抄录：

| V8 表 | 现状索引（version 2） | V9 引用角色 |
|---|---|---|
| tasks | `++id, dueDate, priority, done, pinned, projectId, createdAt` | WORK 核心（主键为**字符串** id） |
| recurringTasks | `++id, enabled` | 周期任务 |
| projects | `++id, stage` | 蓝图中的 Plan |
| memos | `++id, createdAt` | 便签 |
| notes | `++id, notebook, favorite, updatedAt` | 蓝图中的 Knowledge 之一 |
| flashcards | `++id, subject, chapter, knowledgeId, nextReviewAt` | 闪卡内容 |
| flashcardReviews | `++id, flashcardId, reviewedAt` | 闪卡复习记录（投影派生源） |
| flashcardSchedule | `++id, flashcardId` | 闪卡调度状态 |
| subjects | `++id` | 科目 |
| mistakes | `++id, subject, mastered, createdAt` | 错题（蓝图 Mistake） |
| exams | `++id, date` | 蓝图中的 Score |
| reviewTemplates | `++id, type` | 复盘模板 |
| reviewEntries | `++id, type, templateId` | 蓝图 Review |
| reading | `++id, pinned` | 阅读 |
| finance | `++id, type, date` | 财务 |
| countdowns | `++id, showOnHome` | 倒计时 |
| pomodoroLogs | `++id, date` | 番茄钟（投影派生源） |
| vault | `++id` | 密码本（安全边界，普通备份永不包含） |
| settings | `&key` | 键值设置（theme、planningMode 等） |
| knowledgeRelations | `++id, knowledgeId, type, targetId` | 知识关联 |
| studySessions | `++id, subjectId, startedAt` | 学习会话（投影派生源） |
| appEvents | `++id, type, timestamp` | V8 事件日志（保留原样；V9 的 Operation Journal 用新表，见 §4） |

### 蓝图名称 ↔ V8 真实表名（全工程统一引用）

| 蓝图名称 | 真实落地 | 说明 |
|---|---|---|
| Task | tasks | 无变化 |
| Plan | projects | 无 plans 表 |
| Knowledge | notes + knowledgeRelations + subjects | 三表协作 |
| Mistake | mistakes | 无变化 |
| Flashcard | flashcards + flashcardReviews + flashcardSchedule | 三表协作 |
| Score | exams | 无变化 |
| Review | reviewEntries + reviewTemplates | 无变化 |
| Study | studySessions + pomodoroLogs | 无变化 |
| Search | V8 Search 模块（内存索引，无表） | 继续复用并扩展 |
| Theme | settings(key='theme') | 无变化 |
| Vault | vault | 无变化 |
| Backup | backup.ts 文件型机制（无表） | V9 新增 backupSnapshots/operationJournal 配合 |

### 允许的 V8 表增量（不改结构）

- 允许在既有行上**写入附加字段**（Dexie 不要求字段与索引对齐），但不允许为新字段建索引。冻结清单：
  - `tasks.completedAt`：V9 在任务完成时写入 ISO 时间戳（投影与 Daily Memory 依赖，Phase 3 落地）。
  - `mistakes.masteredAt`：错题攻克时写入。
  - `reviewEntries.completedAt`：Review 真正完成时写入 ISO 时间戳（空 = 尚未完成；Timeline 的 `occurredAt` 必须取此值，见 V9-C-002 Patch C-002-03）。
- 任何其他附加字段须先在本合同修订记录中登记。

---

## 3. 通用数据约定

| 约定 | 冻结值 |
|---|---|
| 主键 | 主键类型只服从**被引用表自身**（Patch C-001-01）：<br>· V8 Legacy 表 → 保持真实代码中的现有主键类型，**不得因 V9 重构而改变**（`tasks` 主键为 `string`）<br>· V9 新增表 → 默认 `++id` 自增 `number` |
| 跨表引用主键 | **必须严格采用被引用表的真实主键类型**（Patch C-001-01）：<br>· 引用 V8 字符串主键（如 `tasks.id`）→ 字段为 `string`，直接引用原始 id，**禁止** `String(task.id)` 这类隐式类型转换式设计<br>· 引用 V9 数字主键 → 在投影/指针表（timelineEvents/collectionEntries/events.sourceId）中可按需 `String(id)` 统一为字符串存储 |
| 纯日期 | `'YYYY-MM-DD'`（本地日历日，无时区换算） |
| 时间戳 | ISO-8601 字符串（V8 惯例，如 `2026-08-30T21:30:00.000Z`） |
| 生日 | `'MM-DD'`（无年份，天然每年循环） |
| 枚举 | 英文标识符（lowercase / lowerCamelCase，如 `studySession`）；UI 中文文案是展示层，不入库 |
| JSON 列 | 对象原样存储（Dexie 支持），如 timelineEvents.metadata、gameRecords.data、dailyMemory.facts |
| 删除语义 | 软删除不进入 V9 Core；删除 = 物理删除 + 联动删除（见 V9-C-002 删除联动矩阵） |

### 3.1 主键类型硬约束（Patch C-001-01，编译期可校验）

```ts
tasks.id: string                 // V8 真实主键，类型不得改动
studyPlanItems.taskId: string    // 引用 tasks.id，直接引用原始值
timelineEvents.sourceId: string  // 投影统一字符串（可由 V9 number 主键 String(id) 转换）
```

禁止如下"隐式类型转换式"设计：

```ts
// ❌ 禁止
studyPlanItems.taskId = String(task.id)
studyPlanItems.taskId: number
task.id: number
```

> 验收标准：TypeScript 类型系统须能在编译期阻止 `studyPlanItems.taskId: number`、`task.id: number` 等类型错误，而不依赖运行时转换兜底。

### 3.2 CalendarEvent / DomainEvent 类型拆名（Patch C-001-07）

数据库表仍为 `events`，但 TypeScript 层禁止让 `event` 一个标识符承担两种语义：

```ts
CalendarEvent  // events 表实体（custom / birthday 日历事件）
DomainEvent    // operationJournal 领域事件（event.completed / event.created 的提升载荷）
```

禁止代码层出现 `event.event` 之类的语义污染命名。

---

## 4. V9 新增表（21 张，全部经 version(3) 升级挂载）

### 4.1 diaries — 日记（LIFE）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| date | string | ✓ | 'YYYY-MM-DD'；**不设唯一索引**（一天可多篇） |
| type | DiaryType | ✓ | quick / long |
| mood | Mood \| null | | 心情 |
| weather | Weather \| null | | 天气 |
| title | string | ✓ | 标题（quick 可缺省为空串） |
| content | string | ✓ | 正文（可空串） |
| photos | string[] | ✓ | 照片相对路径（Tauri 私有目录） |
| tags | string[] | ✓ | 标签 |
| createdAt / updatedAt | string | ✓ | ISO-8601 |

索引：`++id, date, type, updatedAt, *tags`

### 4.2 lifeMoments — 生活瞬间（LIFE）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| date | string | ✓ | 'YYYY-MM-DD' |
| content | string | ✓ | 一句话/小瞬间 |
| photoRefs | string[] | ✓ | 照片引用 |
| createdAt | string | ✓ | ISO-8601 |

索引：`++id, date, createdAt`

### 4.3 events — 日历事件（LIFE，独立实体，不复制 Task）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| date | string | ✓ | 'YYYY-MM-DD' |
| type | CalendarEventType | ✓ | custom / birthday |
| title | string | ✓ | |
| note | string | ✓ | 可空 |
| allDay | boolean | ✓ | 默认 true |
| sourceType | 'friend' \| null | | 生日事件来源 |
| sourceId | string \| null | | 生日事件对应 friend id |
| doneAt | string \| null | | 完成时刻（event.completed 的事实源） |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, date, type, [date+type], [sourceType+sourceId]`

### 4.4 friends — 好友（LIFE）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| name | string | ✓ | 非空 |
| alias | string \| null | | 昵称 |
| birthday | 'MM-DD' \| null | | 无年份 |
| relationship | string | ✓ | 关系（朋友/家人/同学/同事…，自由串） |
| contact | string | ✓ | 可空 |
| note | string | ✓ | 可空 |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, name, birthday`

### 4.5 materials — 素材（LIFE）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| title | string | ✓ | |
| category | string | ✓ | 分类（句子/诗词/知识点…，自由串） |
| tags | string[] | ✓ | |
| fileRefs | string[] | ✓ | |
| note | string | ✓ | 可空 |
| sourceDate | string \| null | | 迁移来源日期（V9-C-006） |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, title, category, updatedAt, *tags`

### 4.6 articles — 文章（LIFE）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| title | string | ✓ | |
| url | string | ✓ | 可空 |
| content | string | ✓ | 可空 |
| tags | string[] | ✓ | |
| favorite | boolean | ✓ | |
| source | string \| null | | 迁移来源标记（V9-C-006） |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, title, favorite, updatedAt, *tags`

### 4.7 anime — 动画（PLAY）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| name | string | ✓ | |
| coverRef | string \| null | | 封面引用 |
| status | AnimeStatus | ✓ | planned/watching/completed/paused/dropped |
| rating | number \| null | | 0–10，一位小数 |
| favorite | boolean | ✓ | |
| thoughts | string | ✓ | 感想 |
| totalEpisodes | number \| null | | 总集数 |
| watchedEpisodes | number | ✓ | 已看集数 |
| episodeLog | EpisodeLogEntry[] | ✓ | `{date, episode, note?}` 逐集记录（投影派生源） |
| completedAt | string \| null | | 完结时间 |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, name, status, favorite, updatedAt`

### 4.8 games — 游戏档案（PLAY）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| name | string | ✓ | |
| iconRef | string \| null | | |
| genre | string | ✓ | 可空 |
| platform | string | ✓ | 可空 |
| status | GameStatus | ✓ | playing/completed/paused/dropped/planned |
| favorite | boolean | ✓ | |
| rating | number \| null | | |
| note | string | ✓ | |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, name, status, favorite, updatedAt`

### 4.9 gameRecords — 游戏记录（PLAY，Adapter 数据也落此表）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| gameId | number | ✓ | 引用 games.id |
| type | GameRecordType | ✓ | profile/progress/playtime/result/note/combat |
| data | object | ✓ | 结构化快照（含 lastKnownData 语义，见 V9-C-005） |
| note | string | ✓ | |
| occurredAt | string | ✓ | ISO-8601 |
| createdAt | string | ✓ | |

索引：`++id, gameId, type, occurredAt, [gameId+occurredAt]`

### 4.10 music — 音乐记忆（PLAY，无播放器）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| title | string | ✓ | 曲名 |
| artist | string | ✓ | 歌手 |
| album | string \| null | | |
| genre | string \| null | | |
| thoughts | string | ✓ | 感想 |
| favorite | boolean | ✓ | |
| occurredAt | string | ✓ | 记录时刻（即"听了"的时刻） |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, title, artist, favorite, occurredAt`

### 4.11 timelineEvents — 时间线投影（跨域，见 V9-C-002）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| eventKey | string | ✓ | 唯一键，格式 `{sourceType}:{sourceId}:{eventType}:{instance}` |
| sourceDomain | Domain | ✓ | life/work/play |
| sourceType | SourceType | ✓ | |
| sourceId | string | ✓ | 统一字符串 |
| eventType | string | ✓ | 领域事件名 |
| occurredAt | string | ✓ | ISO-8601 |
| title | string | ✓ | |
| summary | string | ✓ | 可空 |
| metadata | object \| null | | 只存事件元数据，**禁止复制事实载荷** |
| createdAt | string | ✓ | |

索引：`++id, occurredAt, [sourceType+sourceId], &eventKey`

### 4.12 dailyMemory — 每日记忆投影（跨域，见 V9-C-002）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| date | string | ✓ | 唯一（一天一行） |
| facts | object | ✓ | DailyMemoryFacts（机器派生，可重建） |
| reflection | string | ✓ | 人类反思（**聚合器永不写入**） |
| lastAutoUpdate | string \| null | | 上次自动重算时刻 |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, &date`

### 4.13 collectionEntries — 跨域收藏（指针表）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| sourceDomain | Domain | ✓ | |
| sourceType | string | ✓ | 收藏来源实体类型（含非时间线类型如 note/game） |
| sourceId | string | ✓ | |
| title | string | ✓ | 收藏时快照 |
| note | string | ✓ | |
| favoriteAt | string | ✓ | ISO-8601 |
| createdAt | string | ✓ | |

索引：`++id, sourceDomain, favoriteAt, &[sourceType+sourceId]`（同源条目唯一）

### 4.14 nightShutdown — 每日收口（WORK）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| date | string | ✓ | 唯一（一天一次收口） |
| completed | object[] | ✓ | 今日完成摘要行 |
| unfinished | object[] | ✓ | 未完成摘要行 |
| reason | string | ✓ | 未完成原因（可空） |
| reflection | string | ✓ | 反思 |
| tomorrowFocus | string[] | ✓ | 明日重点 |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, &date`

### 4.15 studyPlanItems — Flex Study 计划项（WORK，见 V9-C-004）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| taskId | string | ✓ | 引用 tasks.id（字符串主键） |
| planDate | string | ✓ | 计划日 'YYYY-MM-DD' |
| priority | Priority | ✓ | must/should/could |
| flexibility | Flexibility | ✓ | fixed/flexible |
| estimatedMinutes | number | ✓ | 预估分钟 |
| actualMinutes | number \| null | | 实际分钟 |
| state | FlexState | ✓ | pending/active/done/deferred |
| sortOrder | number \| null | | 用户手动排序钉 |
| note | string | ✓ | |
| createdAt / updatedAt | string | ✓ | |

索引：`++id, taskId, planDate, state, [planDate+priority]`

### 4.16 privateFileMeta — 私密文件元数据（SECURITY，见 V9-C-003）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| name | string | ✓ | 展示名 |
| size | number | ✓ | 明文字节数 |
| mimeType | string \| null | | |
| sha256Plain | string | ✓ | 明文 SHA-256（完整性校验） |
| encPath | string | ✓ | 密文相对路径（Tauri 私有目录 PrivateWorkbench/files/） |
| dekIv / dekCt | string | ✓ | 被 KEK 包裹的 DEK（base64）；**dekCt = AES-GCM 密文+128-bit 标签拼接**（V9-C-003 §3） |
| fileIv / fileTag | string | ✓ | 文件密文的 IV / 认证标签（base64） |
| createdAt / updatedAt | string | ✓ | |

> **P-1 收口（2026-08-30 补记，澄清非变更）**：Patch C-003-05 的文件 AAD 绑定"不可变 fileId"，冻结 **`immutableFileId = privateFileMeta.id`**（自增主键即密码学身份）。展示名 `name` 可改名/移动分组/改显示名，无需重加密；同一密文复制到其他 id 的元数据下必须认证失败。

索引：`++id, name, createdAt`

### 4.17 appLock — App Lock 状态（SECURITY，单行表，见 V9-C-003）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | string | ✓ | 固定 `'main'` |
| kdfParamsVersion | number | ✓ | KDF 参数版本（当前 1） |
| salt | string | ✓ | 128-bit，base64 |
| iterations | number | ✓ | PBKDF2 迭代次数（按版本冻结） |
| verifier | string | ✓ | HMAC-SHA256(KEK, 'v9-applock-verifier')，base64 |
| enabled | boolean | ✓ | 开关 |
| autoLockMinutes | number | ✓ | 自动锁分钟数，0=关 |
| createdAt | string | ✓ | 首次启用时间（安全审计与未来 KDF 策略升级迁移用，Patch C-003-09） |
| updatedAt | string | ✓ | |

索引：`id`（无自增）。**本表不含 KEK、不含主密码**，随普通备份走（salt/verifier 非秘密）。

### 4.18 backupSnapshots — 备份快照清单

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| snapshotId | string | ✓ | 唯一（`v9-snap-<时间戳>-<随机>`） |
| scope | BackupScope | ✓ | 当前仅 noVault |
| fileName | string | ✓ | |
| checksum | string | ✓ | SHA-256 |
| itemCounts | object | ✓ | 各表行数 |
| status | SnapshotStatus | ✓ | creating/ready/failed/expired |
| createdAt | string | ✓ | |

索引：`++id, &snapshotId, scope, status, createdAt`

### 4.19 operationJournal — 操作日志（轻量 Journal）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| seq | number | ✓ | ++seq 单调递增（重放顺序键） |
| eventType | string | ✓ | 领域事件名 |
| payload | object \| null | | 事件载荷（含 sourceType/sourceId 定位） |
| occurredAt | string | ✓ | ISO-8601 |

索引：`++seq, eventType, occurredAt`。保留 30 天（过期裁剪）。与 V8 appEvents 并存不冲突。

### 4.20 migrationRuns — 迁移运行记录（见 V9-C-006）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| runId | string | ✓ | 唯一 |
| mode | MigrationMode | ✓ | dry / real |
| status | MigrationStatus | ✓ | running/done/failed/skipped |
| startedAt / finishedAt | string | ✓/null | |
| sourceCount / targetCount / failedCount / skippedCount | number | ✓ | 契约字段（V9-C-006） |
| checksum | string \| null | | |
| manifestPath | string \| null | | |
| error | string \| null | | |

索引：`++id, &runId, status, startedAt`

### 4.21 migrationLedger — 迁移台账（回滚依据）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | number | ✓ | ++id |
| runId | string | ✓ | |
| legacyId | string | ✓ | 遗留数据行标识 |
| targetTable | string | ✓ | 目标表名 |
| targetId | string | ✓ | 目标行主键（字符串化） |
| checksum | string | ✓ | 该行稳定字段 SHA-256 |
| status | LedgerStatus | ✓ | ok/failed/skipped |
| note | string \| null | | 失败/跳过原因 |
| createdAt | string | ✓ | |

索引：`++id, [runId+legacyId], targetTable, status`

---

## 5. 枚举全集（冻结）

| 枚举 | 值 |
|---|---|
| Domain | `life` \| `work` \| `play` \| `system` |
| DiaryType | `quick` \| `long` |
| Mood | `great` \| `good` \| `neutral` \| `low` \| `bad` |
| Weather | `sunny` \| `cloudy` \| `overcast` \| `rainy` \| `stormy` \| `snowy` \| `windy` \| `foggy` |
| CalendarEventType | `custom` \| `birthday` |
| AnimeStatus | `planned` \| `watching` \| `completed` \| `paused` \| `dropped` |
| GameStatus | `playing` \| `completed` \| `paused` \| `dropped` \| `planned` |
| GameRecordType | `profile` \| `progress` \| `playtime` \| `result` \| `note` \| `combat` |
| Priority（Flex Study） | `must` \| `should` \| `could` |
| Flexibility | `fixed` \| `flexible` |
| FlexState | `pending` \| `active` \| `done` \| `deferred` |
| PlanningMode | `adaptive` \| `manual` |
| BackupScope | `noVault`（P0 唯一值） |
| SnapshotStatus | `creating` \| `ready` \| `failed` \| `expired` |
| MigrationMode | `dry` \| `real` |
| MigrationStatus | `running` \| `done` \| `failed` \| `skipped` |
| LedgerStatus | `ok` \| `failed` \| `skipped` |
| SourceType（时间线源，V9-C-002 使用） | `task` \| `studySession` \| `mistake` \| `review` \| `exam` \| `diary` \| `lifeMoment` \| `event` \| `anime` \| `gameRecord` \| `music` \| `nightShutdown` |
| Theme（V8 现状，冻结） | 全局 `mist` \| `fluent` \| `night`；`review-data` 为**页面级视觉作用域**（非第 4 全局主题；Review 页面使用该作用域呈现，UI 文案可称"Review"） |

### SourceType → Domain 归属（冻结）

| Domain | SourceType |
|---|---|
| work | task, studySession, mistake, review, exam, nightShutdown |
| life | diary, lifeMoment, event |
| play | anime, gameRecord, music |
| system | （无时间线源；system 事件仅入 operationJournal） |

### Mood / Weather ↔ MyDiary 遗留中文值（迁移映射，V9-C-006）

| MyDiary 心情 | Mood | MyDiary 天气 | Weather |
|---|---|---|---|
| 开心 / 非常开心 | great | 晴 | sunny |
| 还行 | good | 多云 | cloudy |
| 一般 | neutral | 阴 | overcast |
| 不太好 / 难过 | low | 雨 | rainy |
| 非常难过 / 极度难过 | bad | 雷 | stormy |
| 其他/未知 | null（不失败） | 雪 / 暴雪 | snowy |
| | | 未知 | null（不失败） |

---

## 6. 跨表引用图（冻结）

```text
tasks(★string) ← studyPlanItems.taskId
games(++id)     ← gameRecords.gameId(number，直连)
friends(++id)   → events(sourceType='friend', sourceId=String(id))   [生日自动事件]
diaries / lifeMoments / events / anime / gameRecords / music / tasks / studySessions /
  mistakes / reviewEntries / exams / nightShutdown
    → timelineEvents(sourceType, sourceId=String(主键), eventKey 唯一)
上述各域实体 → collectionEntries(sourceType, sourceId)
```

---

## 7. 版本升级策略（冻结）

1. V9 首次升级 `version(3).stores({...21 张新表...})`，**不设 upgrade 回写**（新表全空）。
2. 后续任何新索引/新表一律追加新 version，禁止修改旧 version 定义。
3. 升级函数必须幂等、只做加法；失败回滚由 Dexie 事务保证。
4. 破坏性变更流程：登记本文件修订记录 → NEED_CONFIRM → 批准后写 version(n).upgrade + V9-C-006 迁移计划。

## 8. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：冻结 V8 22 表底座、21 张新增表、枚举全集、引用图 |
| 0.1.1 | 2026-08-30 | events 表新增 `doneAt: string \| null`（event.completed 事实源，M2 需要；纯增量字段，无索引变更） |
| 0.1.2 | 2026-08-30 | Patch 0.1.2：§3 主键/跨表引用类型硬约束（C-001-01）、新增 §3.1/§3.2（C-001-07 类型拆名）、§2 允许增量新增 `reviewEntries.completedAt`、appLock 新增 `createdAt`（C-003-09） |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: schema -->
```json
{
  "contract": "schema",
  "version": "0.1.2",
  "dbName": "WorkbenchV8",
  "baselineVersion": 2,
  "v9Version": 3,
  "v8Tables": ["tasks","recurringTasks","projects","memos","notes","flashcards","flashcardReviews","flashcardSchedule","subjects","mistakes","exams","reviewTemplates","reviewEntries","reading","finance","countdowns","pomodoroLogs","vault","settings","knowledgeRelations","studySessions","appEvents"],
  "newTables": [
    {"name":"diaries","pk":"++id","indexes":["date","type","updatedAt","*tags"]},
    {"name":"lifeMoments","pk":"++id","indexes":["date","createdAt"]},
    {"name":"events","pk":"++id","indexes":["date","type","[date+type]","[sourceType+sourceId]"]},
    {"name":"friends","pk":"++id","indexes":["name","birthday"]},
    {"name":"materials","pk":"++id","indexes":["title","category","updatedAt","*tags"]},
    {"name":"articles","pk":"++id","indexes":["title","favorite","updatedAt","*tags"]},
    {"name":"anime","pk":"++id","indexes":["name","status","favorite","updatedAt"]},
    {"name":"games","pk":"++id","indexes":["name","status","favorite","updatedAt"]},
    {"name":"gameRecords","pk":"++id","indexes":["gameId","type","occurredAt","[gameId+occurredAt]"]},
    {"name":"music","pk":"++id","indexes":["title","artist","favorite","occurredAt"]},
    {"name":"timelineEvents","pk":"++id","indexes":["occurredAt","[sourceType+sourceId]","&eventKey"]},
    {"name":"dailyMemory","pk":"++id","indexes":["&date"]},
    {"name":"collectionEntries","pk":"++id","indexes":["sourceDomain","favoriteAt","&[sourceType+sourceId]"]},
    {"name":"nightShutdown","pk":"++id","indexes":["&date"]},
    {"name":"studyPlanItems","pk":"++id","indexes":["taskId","planDate","state","[planDate+priority]"]},
    {"name":"privateFileMeta","pk":"++id","indexes":["name","createdAt"]},
    {"name":"appLock","pk":"id","indexes":[]},
    {"name":"backupSnapshots","pk":"++id","indexes":["&snapshotId","scope","status","createdAt"]},
    {"name":"operationJournal","pk":"++seq","indexes":["eventType","occurredAt"]},
    {"name":"migrationRuns","pk":"++id","indexes":["&runId","status","startedAt"]},
    {"name":"migrationLedger","pk":"++id","indexes":["[runId+legacyId]","targetTable","status"]}
  ],
  "enums": {
    "Domain": ["life","work","play","system"],
    "DiaryType": ["quick","long"],
    "Mood": ["great","good","neutral","low","bad"],
    "Weather": ["sunny","cloudy","overcast","rainy","stormy","snowy","windy","foggy"],
    "CalendarEventType": ["custom","birthday"],
    "AnimeStatus": ["planned","watching","completed","paused","dropped"],
    "GameStatus": ["playing","completed","paused","dropped","planned"],
    "GameRecordType": ["profile","progress","playtime","result","note","combat"],
    "Priority": ["must","should","could"],
    "Flexibility": ["fixed","flexible"],
    "FlexState": ["pending","active","done","deferred"],
    "PlanningMode": ["adaptive","manual"],
    "BackupScope": ["noVault"],
    "SnapshotStatus": ["creating","ready","failed","expired"],
    "MigrationMode": ["dry","real"],
    "MigrationStatus": ["running","done","failed","skipped"],
    "LedgerStatus": ["ok","failed","skipped"],
    "SourceType": ["task","studySession","mistake","review","exam","diary","lifeMoment","event","anime","gameRecord","music","nightShutdown"]
  },
  "sourceTypeDomain": {
    "task":"work","studySession":"work","mistake":"work","review":"work","exam":"work","nightShutdown":"work",
    "diary":"life","lifeMoment":"life","event":"life",
    "anime":"play","gameRecord":"play","music":"play"
  },
  "pkRules": {
    "v8KeepExistingPkType": true,
    "v9NewTablesDefaultNumber": true,
    "crossRefUsesRealTargetPkType": true,
    "taskIdIsString": true,
    "forbidImplicitStringConversionOfTaskId": true,
    "integerPkAsStringOnlyForProjectionSourceId": true
  },
  "typeNamingSplit": {"calendarEvent": true, "domainEvent": true}
}
```
<!-- /V9-CONTRACT-MACHINE -->
