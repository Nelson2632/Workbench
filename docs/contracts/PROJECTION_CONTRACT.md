# PROJECTION_CONTRACT — Timeline / Daily Memory 投影规则契约

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-002 |
| 版本 | 0.1.1（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §11 / §12 / §14 / §15 |
| 关联合同 | V9-C-001（表结构）、V9-C-003（安全）、V9-C-004（Flex Study）、V9-C-005（游戏）、V9-C-006（迁移） |

---

## 1. 六条核心原则（不可违反）

1. **Timeline 不是事实数据库，是事件投影**。只保留 `sourceType / sourceId / eventType / 事件元数据`；禁止 `taskPayload / diaryPayload / gamePayload` 之类的载荷复制。
2. **Daily Memory 同样是投影**：Facts 由机器从事实表派生，Human Reflection 由人书写；两者物理分离。
3. **EventBus 是跨域实时联动的唯一主路径**（Patch C-002-06）：业务页面禁止直接调用其他域 Store；域内部允许直接调用自身数据服务。消费者只订阅事件，不订阅"数据副本"。
   - **边界澄清**（禁止机械地把"唯一主路径"曲解为"一切跨域读取都禁止"）：
     - 实时业务联动 → 走 EventBus；
     - `rebuildProjection()` → 允许直接读取各事实表（§5）；
     - Restore / Migration / Integrity Check / Diagnostics → 允许跨表读取；
     - 业务页面 → 不直接调用其他域 Store。
4. **投影必须可重建**：EventBus 是主更新路径，不是唯一数据来源。`rebuildProjection()` 能从事实表完全重算，且结果幂等。
5. **重建确定**：同一事实集 → 同一 timeline 行集（同 eventKey 同内容）。所有非确定性时间戳按 §5.3 回退链处理。
6. **删除必须联动**：实体删除 → 对应投影行删除；不存在"孤儿投影行"长期存活。

---

## 2. 领域事件总表（V9 冻结版）

事件命名 `域.动作`。V8 既有 8 类事件**原样保留**；V9 新增事件追加。本表是整个工程唯一事件清单：

### WORK（V8 保留 + V9 新增）

| 事件 | 来源 | 引入版本 |
|---|---|---|
| task.created / task.completed | V8 | V8 |
| task.updated / task.deleted | V9 | Phase 3 |
| pomodoro.completed | V8 | V8 |
| flashcard.reviewed | V8 | V8 |
| mistake.created | V8 | V8 |
| mistake.resolved / mistake.deleted | V9 | Phase 3 |
| exam.created | V8 | V8 |
| exam.deleted | V9 | Phase 3 |
| review.completed | V8 | V8 |
| review.deleted | V9 | Phase 3 |
| recurring.generated | V8 | V8 |
| studySession.completed | V9 | Phase 3 |
| nightShutdown.completed | V9 | Phase 3 |
| flexStudy.fallback | V9 | Phase 3（降级信号） |

### LIFE（全部 V9 新增）

| 事件 | 说明 |
|---|---|
| diary.created / diary.updated / diary.deleted | |
| lifeMoment.created / lifeMoment.deleted | |
| event.created / event.updated / event.completed / event.deleted | 日历事件 |
| friend.created / friend.updated / friend.deleted | 触发生日事件同步 |
| friend.birthday | 每日 rollover 检测到今日生日时发布 |

### PLAY（全部 V9 新增）

| 事件 | 说明 |
|---|---|
| anime.created / anime.updated / anime.deleted | |
| anime.episodeWatched | 每看一集发布一次（载荷含 episode） |
| anime.completed | 状态变 completed 时 |
| game.created / game.updated / game.deleted | 游戏档案 |
| game.recorded | 每条游戏记录（含 Adapter 快照落库） |
| gameRecord.deleted | 删除游戏记录 |
| music.logged / music.deleted | 音乐记忆 |

### SYSTEM（仅入 operationJournal，不进 Timeline）

| 事件 | 说明 |
|---|---|
| backup.created / restore.completed | 备份/恢复 |
| timeline.rebuilt | 投影重建完成 |
| migration.completed | 迁移完成 |
| appLock.locked / appLock.unlocked | 锁定状态 |
| collection.favorited / collection.unfavorited | 收藏 |

**发布纪律**：事件由**域内 Store**在数据变更成功后发布；载荷必须携带定位字段（sourceType/sourceId）；发布失败不阻断域内写入。

---

## 3. 事件 → Timeline 映射矩阵（冻结）

三类行为：

- `include`：写入 timelineEvents 一行。
- `mutate`：更新既有行（按 eventKey 定位）。
- `journal`：仅写 operationJournal（含联动作业）。

| eventType | 行为 | sourceType | instance | title 模板 | summary 模板 | occurredAt |
|---|---|---|---|---|---|---|
| task.completed | include | task | `1` | `{task.title}` | `完成任务（{task.priority}）` | tasks.completedAt |
| studySession.completed | include | studySession | `1` | `学习 {duration} 分钟` | `{subject} {note}` 拼接 | studySessions.endedAt |
| mistake.resolved | include | mistake | `1` | `错题攻克：{question 前 30 字}` | `{subject}` | mistakes.masteredAt |
| review.completed | include | review | `1` | `{type} 复盘完成` | `{nextActions 前 3 条}` | reviewEntries.completedAt（Patch C-002-03） |
| exam.created | include | exam | `1` | `考试记录：{name}` | `总分 {total}，排名 {rank}` | date→12:00（§5.3） |
| nightShutdown.completed | include | nightShutdown | `1` | `今日收口完成` | `{reflection 前 60 字}` | nightShutdown.createdAt |
| diary.created | include | diary | `1` | `{title 或 "日记"}` | `{content 前 60 字}` | date→12:00（§5.3） |
| diary.updated | mutate | diary | `1` | 刷新 title/summary | 同上 | 保持原 occurredAt |
| lifeMoment.created | include | lifeMoment | `1` | `生活瞬间` | `{content 前 60 字}` | date→12:00（§5.3） |
| event.created | include | event | `1` | `{title}` | `{note 前 60 字}`；生日事件加 `🎂` 前缀 | date→12:00（§5.3） |
| event.completed / event.updated | mutate | event | `1` | 仅更新 metadata（completedAt 等） | | 保持原 occurredAt |
| anime.episodeWatched | include | anime | `e{episode}` | `看完 {anime.name} 第 {episode} 集` | `{note?}` | episodeLog.date→12:00 |
| anime.completed | include | anime | `1` | `看完 {anime.name}` | `{rating? 评分}` | anime.completedAt |
| game.recorded | include | gameRecord | `1` | 按 type：profile→`游戏档案更新：{game}`；progress→`{game} 进度更新`；playtime→`{game} 游玩 {minutes} 分钟`；result→`{game} 战绩记录`；note→`{game} 笔记`；combat→`{game} 战斗模拟` | `{note 前 60 字}` | gameRecords.occurredAt |
| music.logged | include | music | `1` | `听了 {title} — {artist}` | `{thoughts 前 60 字}` | music.occurredAt |
| 其余全部事件 | journal | — | — | — | — | — |

> **exam.created 历史事实语义澄清（Patch C-002-04）**：在"历史考试记录"场景中，`exam.created` 表示"用户录入一条历史考试事实"，其事件**发生时间 ≠ 创建时间**。Timeline 的 `occurredAt` **一律取 `exam.date`**（本地时区当日 12:00，§5.3），**绝不取实体创建时间**。该语义已在该事件行冻结，不再新增 `exam.recorded` 事件种类（避免扩大 EventBus 规模）。

### 删除联动（冻结矩阵）

| 事件 | 联动动作 |
|---|---|
| task.deleted | 删除 `[sourceType=task, sourceId]` 全部行 |
| diary.deleted | 删除 `[sourceType=diary, sourceId]` 全部行 |
| lifeMoment.deleted | 删除 `[sourceType=lifeMoment, sourceId]` 全部行 |
| event.deleted | 删除 `[sourceType=event, sourceId]` 全部行 |
| anime.deleted | 删除 `[sourceType=anime, sourceId]` 全部行 |
| gameRecord.deleted | 删除 `[sourceType=gameRecord, sourceId]` 全部行 |
| music.deleted | 删除 `[sourceType=music, sourceId]` 全部行 |
| review.deleted | 删除 `[sourceType=review, sourceId]` 全部行 |
| exam.deleted | 删除 `[sourceType=exam, sourceId]` 全部行 |
| mistake.deleted | 删除 `[sourceType=mistake, sourceId]` 全部行 |
| friend.deleted | 删除该 friend 生成的未过生日 events（LIFE 域处理，触发 event.deleted 联动） |
| 实体删除（任何有收藏指针的） | 级联删除 collectionEntries 对应行 |

### 快照语义（冻结）

- Timeline 行 = **事件发生时刻的快照**。除 diary.updated / event.completed / event.updated 外，事实后续变化**不实时回写**时间线行。
- 重建（§5）时以**事实当前值**重新生成全部行——重建 = 最新事实口径。
- **历史真实性原则（Patch C-002-13）**：
  > **Projection 不保证反映"事实当前状态"，只保证反映"事件发生时的事实快照"。**
  - 禁止因事实事后变化（如 `task.title` 被改名）而自动改写已写入的 Timeline 快照（`title/summary`）。
  - 该原则专门封堵"CODE 在 `task.completed` 后看到新 title 就把 Timeline 也改成新标题"的语义漂移。
  - 只有在显式的 `diary.updated / event.completed / event.updated` 更新事件、或重建（最新事实口径）时才允许刷新。

---

## 4. eventKey 与唯一性（冻结）

- 格式：`{sourceType}:{sourceId}:{eventType}:{instance}`
- `instance` 默认 `'1'`；多实例事件（anime.episodeWatched）为 `e{episode}`。
- timelineEvents 对 eventKey 建唯一索引：同源同事件同实例只会存在一行；重复发布 = upsert（更新 occurredAt/title/summary）。
- 重建幂等性依赖 eventKey 的**确定性**：instance 必须能从事实推导（集数、行主键等），禁止随机数/时间戳进入 eventKey。

---

## 5. rebuildProjection() 重建算法（冻结）

### 5.1 前置

重建只读**事实表**，不读 operationJournal、不读旧 timeline 行。

### 5.2 步骤

1. 事务内清空 timelineEvents。
2. **生日事件同步**（LIFE 前置）：对每个 friends 行按 §8 纯函数生成/补全 events 行（幂等）。
3. 按序扫描各事实表，逐行应用 §3 模板：
   - WORK：tasks(done=true) → task.completed；studySessions → studySession.completed；mistakes(mastered=true) → mistake.resolved；reviewEntries → review.completed；exams → exam.created；nightShutdown → nightShutdown.completed
   - LIFE：diaries → diary.created；lifeMoments → lifeMoment.created；events → event.created（completed 状态附 metadata）
   - PLAY：anime.episodeLog → anime.episodeWatched；anime(completedAt≠null) → anime.completed；gameRecords → game.recorded；music → music.logged
4. 生成 eventKey、title、summary、occurredAt（按 §3 与 §5.3）。
5. 提交事务；发布 `timeline.rebuilt`（仅 journal）。
6. **幂等断言**：连续两次重建结果按 eventKey 集合完全一致（M5 Gate 自动验证）。

### 5.3 occurredAt 回退链（冻结，保证确定性）

1. 专用时间戳字段（completedAt / masteredAt / endedAt / occurredAt / createdAt…按 §3）；
2. 实体 updatedAt；
3. 仅日期事实 → **本地时区当日 12:00:00** 对应的 ISO 串。

---

## 6. Daily Memory 契约（冻结）

### 6.1 Facts 结构（冻结 schema）

```ts
interface DailyMemoryFacts {
  work: {
    tasksCompleted: number
    studyMinutes: number
    mistakesResolved: number
    flashcardsReviewed: number
    pomodoros: number
    nightShutdownDone: boolean
  }
  life: {
    diaries: number
    lifeMoments: number
    events: number
    birthdays: string[]   // 今日生日好友名
  }
  play: {
    episodesWatched: number
    animeCompleted: number
    gameRecords: number
    musicLogged: number
  }
}
```

### 6.2 Facts 派生查询（冻结；全部可重建）

| 事实 | 查询 |
|---|---|
| tasksCompleted | count(tasks where done=true AND completedAt ∈ 当日) |
| studyMinutes | sum(studySessions.duration where endedAt ∈ 当日)；**若为 0 才回退** sum(pomodoroLogs.duration where date=当日)；两者**不叠加** |
| mistakesResolved | count(mistakes where mastered=true AND masteredAt ∈ 当日) |
| flashcardsReviewed | count(flashcardReviews where reviewedAt ∈ 当日) |
| pomodoros | count(pomodoroLogs where date=当日) |
| nightShutdownDone | exists(nightShutdown where date=当日) |
| diaries / lifeMoments | count(... where date=当日) |
| events | count(events where date=当日 AND type='custom') |
| birthdays | names(events where date=当日 AND type='birthday') |
| episodesWatched | count(anime.episodeLog 元素 where date=当日) |
| animeCompleted | count(anime where completedAt ∈ 当日) |
| gameRecords | count(gameRecords where occurredAt ∈ 当日) |
| musicLogged | count(music where occurredAt ∈ 当日) |

### 6.3 Reflection 保护（硬规则）

- dailyMemory.reflection 是**人类反思**字段；聚合器**永不写入、永不覆盖、永不删除**。
- Facts 重算（任何触发）只替换 `facts` 与 `lastAutoUpdate`。
- 重建（含 M5 Gate 的清空重算测试）后，人工 Reflection 必须原样保留。

### 6.4 聚合触发时机

1. 打开 Daily Memory 页面且 `lastAutoUpdate < 当日 00:00`；
2. nightShutdown.completed 之后；
3. timeline.rebuilt 之后；
4. 用户点"刷新事实"。

### 6.5 Night Shutdown 与 Daily Memory 职责边界（Patch C-002-08）

避免"两个今日反思"争夺同一产品位置。职责按下列核心原则冻结。

```text
Night Shutdown → 操作收口
Daily Memory   → 人生记忆
```

| 产品 | 回答的问题 | 归属 |
|---|---|---|
| Night Shutdown（nightShutdown 表） | 今天**没完成什么**？为什么？明天**先做什么**？ | 操作收口 |
| Daily Memory（dailyMemory 表） | 今天**发生了什么**？哪些事**值得被记住**？ | 人生记忆 |

- **Night Shutdown** 保留 `unfinished / reason / tomorrowFocus` 及必要完成统计；**不承担长期记忆**，不写"今日最值得记住的一件事"这类人类反思。
- **Daily Memory** 唯一承载人类反思（`dailyMemory.reflection` = "今天最值得记住的一件事"）；该字段由人书写，聚合器永不写入（§6.3 硬规则）。
- 两者数据独立：Night Shutdown 的变化**不**自动改写入 Daily Memory 的 reflection。

---

## 7. Collection Core 契约（冻结）

- collectionEntries 是**指针表**：只存 sourceDomain/sourceType/sourceId/title 快照/note/favoriteAt。
- 唯一性：同 `[sourceType+sourceId]` 只能有一条（再收藏 = 幂等）。
- 级联：实体删除事件 → 删除对应指针（§3 删除联动矩阵）。
- collection.favorited/unfavorited 只入 journal，不进 Timeline。

---

## 8. 日历投影与生日事件（冻结）

### 8.1 日历视图 = 存储 + 投影

- 月视图渲染：events（存储实体）+ tasks（投影，按 dueDate 只读显示）+ exams（投影，按 date 只读显示）。
- **禁止**把 Task/Exam 复制进 events 表；日历不修改 Task/Exam 实体。

### 8.2 生日事件纯函数（确定性核心）

```text
nextBirthday(MM-DD, today):
  candidate = `${today.year}-${MM-DD}`
  if candidate < today.date → candidate = `${today.year+1}-${MM-DD}`
  return candidate
```

- friend.created / friend.updated → 删除该 friend 全部"未来"birthday 事件 → 生成 nextBirthday 一行。
- 每日 rollover：对每个 friend，若其 nextBirthday 无事件行则补建。
- 事件行字段：date=候选日，type='birthday'，title=`{name} 生日`，sourceType='friend'，sourceId=String(friend.id)。
- 重建时按同一函数生成——与 rollover 结果幂等一致。

---

## 9. 重建与迁移/恢复的关系

- MyDiary 迁移（V9-C-006）提交后 → 执行一次 rebuildProjection()。
- Restore 恢复后（V9-C-003 / 备份流程）→ 必须执行 integrity check + rebuildProjection()。
- 重建产生的行与"正常使用"产生的行**无差异**（同 eventKey 同内容），因此重建可以随时兜底。

## 10. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：事件总表、映射矩阵、删除联动、eventKey、重建算法、Daily Memory、Collection、生日纯函数 |
| 0.1.1 | 2026-08-30 | Patch 0.1.1：review.completed 取 `completedAt`（C-002-03）、exam 历史时间语义冻结（C-002-04）、EventBus 边界澄清为"实时联动主路径"（C-002-06）、Night Shutdown / Daily Memory 职责边界（C-002-08）、Projection 历史快照语义（C-002-13） |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: projection -->
```json
{
  "contract": "projection",
  "version": "0.1.1",
  "principles": [
    "timelineIsProjectionNotFacts",
    "dailyMemoryIsProjection",
    "eventBusIsRealtimeCrossDomainPath",
    "projectionMustBeRebuildable",
    "rebuildMustBeDeterministic",
    "deleteMustCascade",
    "projectionIsHistoricalSnapshot",
    "timelineNotReflectCurrentFactState"
  ],
  "events": [
    "task.created","task.completed","task.updated","task.deleted",
    "pomodoro.completed","flashcard.reviewed","mistake.created","mistake.resolved","mistake.deleted",
    "exam.created","exam.deleted","review.completed","review.deleted","recurring.generated",
    "studySession.completed","nightShutdown.completed","flexStudy.fallback",
    "diary.created","diary.updated","diary.deleted",
    "lifeMoment.created","lifeMoment.deleted",
    "event.created","event.updated","event.completed","event.deleted",
    "friend.created","friend.updated","friend.deleted","friend.birthday",
    "anime.created","anime.updated","anime.episodeWatched","anime.completed","anime.deleted",
    "game.created","game.updated","game.deleted","game.recorded","gameRecord.deleted",
    "music.logged","music.deleted",
    "backup.created","restore.completed","timeline.rebuilt","migration.completed",
    "appLock.locked","appLock.unlocked","collection.favorited","collection.unfavorited"
  ],
  "timelineInclude": {
    "task.completed": {"sourceType":"task","instance":"1"},
    "studySession.completed": {"sourceType":"studySession","instance":"1"},
    "mistake.resolved": {"sourceType":"mistake","instance":"1"},
    "review.completed": {"sourceType":"review","instance":"1"},
    "exam.created": {"sourceType":"exam","instance":"1"},
    "nightShutdown.completed": {"sourceType":"nightShutdown","instance":"1"},
    "diary.created": {"sourceType":"diary","instance":"1"},
    "lifeMoment.created": {"sourceType":"lifeMoment","instance":"1"},
    "event.created": {"sourceType":"event","instance":"1"},
    "anime.episodeWatched": {"sourceType":"anime","instance":"e{episode}"},
    "anime.completed": {"sourceType":"anime","instance":"1"},
    "game.recorded": {"sourceType":"gameRecord","instance":"1"},
    "music.logged": {"sourceType":"music","instance":"1"}
  },
  "timelineMutate": ["diary.updated","event.updated","event.completed"],
  "deleteLinkage": {
    "task.deleted":"task","diary.deleted":"diary","lifeMoment.deleted":"lifeMoment",
    "event.deleted":"event","anime.deleted":"anime","gameRecord.deleted":"gameRecord",
    "music.deleted":"music","review.deleted":"review","exam.deleted":"exam","mistake.deleted":"mistake"
  },
  "occurredAtFallback": ["specificTimestamp","updatedAt","dateAtLocalNoon"],
  "dailyMemoryFacts": {
    "work": ["tasksCompleted","studyMinutes","mistakesResolved","flashcardsReviewed","pomodoros","nightShutdownDone"],
    "life": ["diaries","lifeMoments","events","birthdays"],
    "play": ["episodesWatched","animeCompleted","gameRecords","musicLogged"]
  },
  "reflectionNeverOverwritten": true,
  "collectionCascadeOnDelete": true,
  "calendarRendersTaskExamAsProjection": true,
  "rebuildSteps": ["clearTimeline","syncBirthdayEvents","scanFactsInDomainOrder","deriveRows","commit","publishTimelineRebuilt","idempotencyAssert"],
  "eventBusBoundaries": {
    "realtimeBusinessLinking": "eventBus",
    "projectionRebuild": "directFactReadAllowed",
    "restoreMigrationIntegrityDiagnostics": "crossTableReadAllowed",
    "businessPage": "noDirectOtherDomainStoreCall"
  },
  "reviewCompletedAt": {"timelineOccursAt": "reviewEntries.completedAt", "neverUseCreatedAtAsCompletedAt": true},
  "examHistoricalSemantics": "exam.created means exam fact recorded; occurredAt takes exam.date not created time",
  "nightShutdownVsDailyMemory": {
    "nightShutdown": "operationClosure",
    "dailyMemoryReflection": "humanReflectionOnly",
    "nightShutdownDoesNotWriteDailyMemoryReflection": true
  }
}
```
<!-- /V9-CONTRACT-MACHINE -->
