# MIGRATION_CONTRACT — MyDiary 2.x → V9 迁移契约

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-006 |
| 版本 | 0.1.1（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §27–§32 |
| 关联合同 | V9-C-001（migrationRuns/migrationLedger 表）、V9-C-002（迁移后重建投影）、V9-C-003（不导入旧密码） |
| 遗留基线 | MyDiary 2.x 真实代码勘察：`%APPDATA%/MyDiary/data/*.json`（部分 Fernet 加密）、`private/*.enc` |

---

## 1. 总流程（冻结）

```text
Source（%APPDATA%/MyDiary，只读）
  ↓
Python Sidecar（只读解析：明文/Fernet 检测、密码验证、解密、标准化）
  ↓
migration_export.json（中间文件，不依赖实时 IPC）
  ↓
V9 Transform（校验 + 字段映射）
  ↓
Target（Dexie，单事务）
  ↓
Validate（sourceCount/targetCount/failedCount/skippedCount + SHA-256）
  ↓
Commit（manifest + ledger）→ rebuildProjection()
```

- **Dry Run 模式**：全流程但**零写入**（不写 Dexie、不复制文件），输出 dryrun manifest。真实迁移前必须 Dry Run 全绿。
- **Sidecar 定位**：Python 只做 Legacy JSON / Fernet / 密码验证 / 提取；**不进入 V9 Core、不参与 V9 运行期**。

---

## 2. 遗留数据真实结构（2026-08-30 从代码勘察，Sidecar 据此实现）

| 文件 | 格式 | 结构 |
|---|---|---|
| diary_data.json | 明文 | `{ "YYYY-MM-DD": { "diary": {weather, mood, funny, log, tags[]}, "tasks": {study[], hobby[]}, "materials": {句子[], 诗词[], 知识点[]} } }` |
| friend_data.json | 明文 | `{ "朋友"|"家人"|"同事"|"同学": [ {name, contact, birthday("YYYY-MM-DD"), photo, personality, other} ] }` |
| calendar_data.json | 明文 | `{ "YYYY-MM-DD": [ {content, added_at("YYYY-MM-DD HH:MM:SS")} ] }` |
| score_data.json | **Fernet** | Sidecar 解密后按探测结构映射 exams |
| subject_data.json | 明文 | `{ "subjects": {...} }` → subjects |
| article_data.json | **Fernet** | 解密后映射 articles |
| material_data.json / task_data.json / wrong_question_data.json / knowledge_data.json / review_data.json | 存在性由 utils/migration.py 文件清单确认 | 各自映射 materials / tasks / mistakes / notes+knowledgeRelations / reviewEntries |
| stats_data.json / tools_data.json | 存在性同上 | **不迁移**（统计可重算、工具为临时态），计入 skipped 并说明 |
| diary_password.json | 明文（哈希） | **绝不读取、绝不导入**（V9-C-003 §5.4） |
| private/*.enc | Fernet 密文 | Phase 8：解密 → V9 信封重加密 → privateFileMeta；P0 可选 |

> Sidecar 对每个文件做**结构探测**；探测失败的文件按失败处理（failedCount+1），不阻塞其余文件。

---

## 3. 字段映射（冻结）

### 3.1 diary_data.json → diaries + materials

| 源 | 目标字段 | 规则 |
|---|---|---|
| 键（日期） | date | 原样 'YYYY-MM-DD' |
| mood（中文） | mood | 按 V9-C-001 §5 映射表；未知 → null（不失败） |
| weather（中文） | weather | 同上 |
| funny | title | 空 → `"{date} 日记"` |
| log | content | 非字符串 → 该行 **failed** |
| log.length ≤ 140 | type | `quick`，否则 `long` |
| tags | tags | 去重直传 |
| diary.tasks（study/hobby） | **不迁移** | V9 边界：Diary 不复制其他域事实；计入 skipped 说明 |
| diary.materials（句子/诗词/知识点） | materials 表 | title=条目，category=键名，sourceDate=日期 |

> **空日记占位记录过滤（RF-05）**：当某日记录为「纯占位空记录」——即 `log` 为空，且 `mood` / `weather` / `funny` / `tags` 均无有效值——时，该日记在 **Migration 层跳过**（`skipped`，计入 `skippedCount` 并在 manifest 记录原因），不进入 `diaries` 表、不进入 Timeline。反之，只要存在任一有效字段（正文 / 心情 / 天气 / 趣事 / 标签），即使 `log` 为空仍视为有效日记继续迁移。不得用简单的 `if (!content) skip` 忽略可能存在的其他有效字段。

### 3.2 friend_data.json → friends

| 源 | 目标字段 | 规则 |
|---|---|---|
| 分组键 | relationship | 原样（朋友/家人/同学/同事…） |
| name | name | 空/缺失 → 该行 **failed** |
| birthday | birthday | `"YYYY-MM-DD"` → `"MM-DD"`；无法解析 → null + issue 说明（不失败） |
| contact | contact | |
| personality + other | note | 拼接 `"性格：{p}；备注：{o}"`（空段省略） |
| photo | 弃用 | 文件迁移由 §5 文件流程处理 |

### 3.3 calendar_data.json → events

| 源 | 目标字段 | 规则 |
|---|---|---|
| 键（日期） | date | 原样 |
| content | title | 非字符串 → 该行 **failed** |
| added_at | createdAt | 本地时间 → ISO（**Dry Run 固定 +08:00 时区**；真实迁移按系统本地时区） |
| — | type='custom', allDay=true | 固定 |

### 3.4 score_data.json → exams（V8 结构）

Sidecar 解密后输出标准化行 `{name, date, scores, total, rank, note}`；结构探测失败 → 整个文件 failed，不阻塞。

### 3.5 subject_data.json → subjects / article_data.json → articles / task_data.json → tasks / wrong_question_data.json → mistakes / knowledge_data.json → notes + knowledgeRelations / review_data.json → reviewEntries

Sidecar 标准化为 V9 目标行结构；逐行校验，坏行 failed。

---

## 4. 校验与计数（冻结）

- 每个模块必须报告：`sourceCount / targetCount / failedCount / skippedCount / checksum`。
- checksum：**SHA-256 over 稳定字段 canonical JSON**（键排序；剔除 createdAt/updatedAt/finishedAt/exportedAt 等运行期时间戳）——保证"同源数据两次迁移 checksum 一致"。
- 行级 checksum 入 migrationLedger.checksum。
- 幂等：migrationLedger 按 `[runId+legacyId]` 唯一；重跑自动跳过已导入行。
- Dry Run fixture：`docs/contracts/sample/legacy_mydiary_sample.json`（脱敏构造，含 failed/skipped 用例）→ 期望导出 `expected_migration_export.json` → `scripts/contract-gate.mjs` 断言一致。

---

## 5. 文件与照片处理（冻结）

- Sidecar 复制引用的照片/私密文件到 `PrivateWorkbench/migrated/{sha256}.{ext}`，输出 fileMap（源路径 → 目标路径 → sha256）。
- V9 校验 sha256 后登记 ledger；失败文件 → failed + 保留源文件不动。
- 私密文件（*.enc）Phase 8 走"解密→重加密"流程（需要用户输入 MyDiary 密码）；跳过不阻塞。

---

## 6. 事务、回滚与归档（冻结）

1. **真实迁移**：先创建 safety snapshot（V9-C-003 §4）→ 单 Dexie 事务写入 → 写 ledger → 写 manifest（migrationRuns）。
2. **回滚**：按 runId 删除 ledger 记录的目标行 + 恢复 safety snapshot + 删除本次复制的新文件。旧 MyDiary 数据**全程只读**。
3. **失败策略**：Sidecar 启动失败 / Sidecar 解密失败 / 导出文件损坏 → **不进入死循环** → Retry ×3（2s/4s/8s 退避）→ 仍失败 → 状态 failed（migrationRuns.status='failed'）→ 用户可选 **Skip** 或查看诊断（见 §6.1 Migration Rescue Mode）。**迁移失败不能阻止 V9 正常启动**——Migration 是数据搬家，不是程序启动依赖。
4. **禁止**强制用户手动导出明文数据。
5. **归档顺序**：数据校验通过 → 备份 → 旧 MyDiary 置只读 → 观察期 → 用户确认 → 归档。任何步骤不等价于"立即删除"。

### 6.1 Migration Rescue Mode（Patch C-006-11）

当触发条件（Sidecar 启动失败 / Sidecar 解密失败 / 导出文件损坏）出现时：

```text
V9 不进入死循环
        ↓
迁移状态 = failed（migrationRuns.status='failed'）
        ↓
允许跳过迁移（Skip）
        ↓
继续作为全新 V9 正常使用
        ↓
旧 MyDiary 数据保留
```

- **迁移失败 ≠ 启动失败**：V9 必须在无迁移数据的情况下照常启动。
- 旧 MyDiary 源目录**只读保留**，不因跳过而删除。
- 用户可随时重新发起迁移（作为一次新的 run）。

### 6.2 跳过数据可见化（Patch C-006-14）

最终迁移报告必须输出**用户可见的三段式清单**：

```text
已迁移：xxx
跳过：xxx
失败：xxx
```

并提供"查看跳过项目"入口（列出每个 skipped 的文件/条目及原因），**不允许只呈现 `Migration completed.`**——让用户明确"是否有数据没过去"。跳过项来源包括 §2 `stats_data.json / tools_data.json`、§3.1 `diary.tasks` 内嵌字段等。

---

## 7. 迁移后动作（冻结）

- Commit 成功后：发布 `migration.completed`（journal）→ `rebuildProjection()`（V9-C-002 §9）→ 生成 Daily Memory 当日事实。
- 迁移数据与"用户手录数据"在后续行为上完全同权。

## 8. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：真实遗留结构、字段映射、计数/checksum、回滚、Dry Run fixture |
| 0.1.1 | 2026-08-30 | Patch 0.1.1：新增 §6.1 Migration Rescue Mode（C-006-11，失败不阻塞 V9 启动）、§6.2 跳过数据可见化（C-006-14）；失败策略补充"不进入死循环" |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: migration -->
```json
{
  "contract": "migration",
  "version": "0.1.1",
  "flow": ["Source", "Transform", "Target", "Validate", "Commit"],
  "countFields": ["sourceCount", "targetCount", "failedCount", "skippedCount", "checksum"],
  "checksumAlg": "sha256",
  "checksumScope": "stable-fields-canonical-json",
  "dryRunWritesNothing": true,
  "dryRunFixedClock": "2026-08-30T00:00:00.000Z",
  "dryRunTimezone": "+08:00",
  "retry": {"max": 3, "backoffSeconds": [2, 4, 8]},
  "skipAllowed": true,
  "legacyReadOnly": true,
  "passwordImport": false,
  "timezone": "system-local",
  "rescueMode": {
    "triggers": ["sidecarStartupFailure", "sidecarDecryptFailure", "exportFileCorrupt"],
    "migrationStateOnFailure": "failed",
    "allowSkip": true,
    "doesNotBlockV9Startup": true,
    "legacyDataKept": true
  },
  "skipDataVisibility": {
    "reportShowsMigratedSkippedFailed": true,
    "provideViewSkippedItems": true,
    "notJustMigrationCompleted": true
  },
  "rollback": ["removeLedgerRowsByRunId", "restoreSafetySnapshot", "deleteNewCopiedFiles"],
  "archiveOrder": ["validate", "backup", "setReadOnly", "observe", "userConfirm", "archive"],
  "postCommit": ["publishMigrationCompleted", "rebuildProjection", "aggregateDailyMemory"],
  "sampleFixture": "docs/contracts/sample/legacy_mydiary_sample.json",
  "expectedExport": "docs/contracts/sample/expected_migration_export.json",
  "mappingTargets": {
    "diary_data.json": ["diaries", "materials"],
    "friend_data.json": ["friends"],
    "calendar_data.json": ["events"],
    "score_data.json": ["exams"],
    "subject_data.json": ["subjects"],
    "article_data.json": ["articles"],
    "material_data.json": ["materials"],
    "task_data.json": ["tasks"],
    "wrong_question_data.json": ["mistakes"],
    "knowledge_data.json": ["notes", "knowledgeRelations"],
    "review_data.json": ["reviewEntries"]
  },
  "notMigrated": ["stats_data.json", "tools_data.json", "diary_password.json", "diary.tasks 内嵌字段"]
}
```
<!-- /V9-CONTRACT-MACHINE -->
