# V9 · MyDiary → Workbench Migration Plan

**版本**：v1.0  
**状态**：执行方案  
**原则**：先验证、后迁移；先复制、后切换；任何失败都能回到旧系统。

---

# 1. 目标

将 MyDiary 2.x 的结构化数据与私密文件安全迁移至 Workbench V9，不要求用户安装 Python。

最终：

```text
MyDiary
  ↓
Migration Sidecar
  ↓
standardized payload
  ↓
Workbench import
  ↓
V9 encrypted storage
```

---

# 2. 组件边界

## Python Sidecar

只负责：

- 读取旧 MyDiary 数据目录；
- 解析 JSON；
- 读取旧安全参数；
- Fernet 解密旧私密文件；
- 输出标准化迁移数据；
- 生成迁移 manifest。

**不负责** V9 日常业务。

## Tauri / Workbench

负责：

- 接收标准化数据；
- 写入 Dexie；
- 新体系加密；
- 私密文件写入；
- 校验；
- 回滚；
- UI 迁移进度。

---

# 3. Sidecar 打包原则

最终用户不能依赖外部 Python 环境。

```text
Workbench.exe
├─ frontend
├─ Tauri/Rust
└─ sidecar/
   └─ migration-tool.exe
```

Sidecar 为 bundled executable。

---

# 4. 数据来源清单

主要目录：

```text
%APPDATA%/MyDiary/
├─ data/
├─ private/
├─ backups/
├─ cache/
└─ password_security.json
```

同时检查：

- 项目根 `data_files/`
- 项目根 `private_files/`
- 旧程序镜像数据

必须先建立源数据清单。

---

# 5. 迁移分类

## A. V8 已存在

优先复用并去重：

- tasks
- subjects
- knowledge
- mistakes
- review
- flashcards
- exams / scores

## B. MyDiary 新增

- diaries
- materials
- articles
- friends
- events
- scores
- games
- music
- anime

## C. 高风险

- private files
- vault
- app lock

---

# 6. Migration Contract

在编码前锁定以下映射。

| Legacy | V9 | 策略 |
|---|---|---|
| diary_data.json[date].diary | diaries | 逐日转换 |
| diary_data.json[date].tasks.study/hobby | tasks | 类型映射 |
| diary_data.json[date].materials | materials | 按 type 拆分 |
| article_data.json | articles | 原文保留 |
| friend_data.json | friends | 字段映射 |
| score_data.json | scores | 分数明细保留 |
| subject_data.json | subjects | 合并去重 |
| knowledge JSON | knowledge | 去重后导入 |
| mistake JSON | mistakes | 字段标准化 |
| review JSON | reviewEntries / review | 按 V9 contract |
| calendar JSON | events | 时间规范化 |
| private_files/*.enc | PrivateWorkbench/*.enc | 解密→重加密 |
| password_security.json | appLock | 不直接复制旧 hash |

---

# 7. Phase 0 · Source Freeze

### 操作

1. 关闭 MyDiary；
2. 复制整个 `%APPDATA%/MyDiary/`；
3. 复制项目根镜像数据；
4. 计算文件 hash；
5. 生成 source-manifest；
6. 标记旧程序为 read-only 使用策略。

### 验收

- 原目录完整；
- 备份可读取；
- manifest 与磁盘一致；
- 未修改源文件。

---

# 8. Phase 0.5 · Dry Run

Dry Run 不修改真实数据库。

输入：

- source backup

输出：

- standardized migration package
- manifest
- warning report
- collision report

必须统计：

- source count
- mapped count
- skipped count
- conflict count
- unsupported count

---

# 9. 结构化数据迁移

顺序：

```text
subjects
 ↓
knowledge
 ↓
tasks
 ↓
mistakes
 ↓
flashcards
 ↓
reviews
 ↓
scores
 ↓
diaries
 ↓
materials/articles/friends/events
 ↓
PLAY records
```

原因：优先建立引用关系所需的主数据。

---

# 10. 去重策略

任何迁移都不能简单 `bulkAdd` 后假设唯一。

必须定义：

- stable legacy id
- content fingerprint
- source marker
- migration batch id

示例：

```ts
interface MigrationMeta {
  source: 'mydiary'
  sourceId: string
  migratedAt: number
  batchId: string
  fingerprint: string
}
```

确保 Dry Run 与正式迁移幂等。

---

# 11. Vault 安全

旧密码本不能直接作为 V9 vault 数据写入。

原则：

```text
旧数据
 ↓
旧密码验证
 ↓
旧内容解密/读取
 ↓
新主密码
 ↓
新 V9 加密
```

不得把旧明文密码直接写进 V9 vault。

---

# 12. Private File 迁移

## 12.1 源文件

MyDiary：

```text
private/**/*.enc
```

## 12.2 旧密钥

根据 MyDiary 当前实现读取：

```text
password_security.json
→ oldSalt
→ oldIter
→ oldMasterKey
→ sha256(oldMasterKey)
→ Fernet key
```

实际算法以 legacy 源码为最终依据，不在迁移文档里自行改写。

## 12.3 迁移

```text
old .enc
   ↓
Fernet decrypt
   ↓
plaintext memory/staging
   ↓
new DEK
   ↓
AES-GCM
   ↓
PrivateWorkbench/*.enc
```

---

# 13. 明文生命周期控制

目标：不产生持久化明文副本。

优先：

```text
memory → re-encrypt → write
```

如必须 staging：

- 使用受限临时目录；
- 权限仅当前用户；
- 单文件完成即删除；
- 整批完成后再次清理；
- 不写敏感内容日志。

---

# 14. 新文件格式

建议结构：

```text
magic
version
kdfVersion
kdfSalt
kdfIterations
wrappedDEK
iv
ciphertext
```

其中：

- DEK per file；
- KEK 由主密码派生；
- AES-GCM 提供机密性与完整性。

最终字节布局以正式 CODE_SPEC 为准。

---

# 15. 主密码迁移

不直接复制：

```text
old bcrypt hash
old SHA256
old PBKDF2 verifier
```

迁移采用：

```text
旧密码验证
 ↓
完成 legacy 解密
 ↓
用户设置 V9 新主密码
 ↓
PBKDF2-HMAC-SHA256
 ↓
V9 appLock
```

新的主密码只用于 V9。

---

# 16. Migration Manifest

每次运行生成：

```json
{
  "version": 1,
  "startedAt": 0,
  "finishedAt": 0,
  "source": "MyDiary",
  "batchId": "...",
  "tables": {},
  "files": {
    "total": 0,
    "migrated": 0,
    "failed": 0
  },
  "warnings": [],
  "errors": [],
  "checksums": []
}
```

禁止写入：

- password
- decrypted file content
- secret keys

---

# 17. 失败与恢复

任何步骤失败：

```text
暂停
 ↓
保留源数据
 ↓
保留当前 migration batch 状态
 ↓
记录非敏感错误
 ↓
允许 retry
```

如果目标 DB 已发生部分写入：

- 优先使用 transaction；
- 若跨资源写入无法事务统一，则通过 batch 状态 + rollback snapshot 恢复。

---

# 18. 一致性验证

## 结构化数据

逐表比较：

- count
- id mapping
- key fields
- relation integrity

## 文件

至少验证：

- 文件数
- 文件名
- size
- hash/fingerprint
- 抽样解密可读

## 安全

验证：

- 未解锁无法读敏感内容；
- 普通 backup 不含 vault/private plaintext；
- 新密钥可正常解密。

---

# 19. Dry Run 验收用例

| 编号 | 场景 | 预期 |
|---|---|---|
| DR-01 | 5 条任务 | 5 条任务正确映射 |
| DR-02 | 3 天日记 | 3 天日记完整 |
| DR-03 | 重复任务 | 不产生重复 |
| DR-04 | 错题引用知识点 | 关系正确 |
| DR-05 | 旧加密文件 | 可解密并重加密 |
| DR-06 | 错误密码 | 不写入目标数据 |
| DR-07 | 中断恢复 | 可继续 |
| DR-08 | 重复运行 | 幂等，不重复导入 |

---

# 20. 最终切换

只有满足：

```text
Source Backup ✅
Dry Run ✅
Structured Validation ✅
Private File Validation ✅
Restore Drill ✅
Security Audit ✅
```

才允许：

```text
Workbench = primary
MyDiary = read-only archive
```

至少在用户确认旧数据已完整迁移前，不自动删除旧程序数据。

---

# 21. 与 V9 开发的关系

Migration 不应阻塞所有 UI 开发。

允许：

- Phase 1 建 schema；
- Phase 2 开发 import contract；
- Phase 0.5/6 做真实迁移演练。

但：

> 在真实用户数据切换前，Migration Gate 必须通过。

---

# 22. Agent 迁移执行规则

AI 在迁移相关任务中：

1. 不得删除源数据；
2. 不得直接改写 legacy 文件；
3. 不得将旧密码/密钥写入普通日志；
4. 不得把未加密 vault 数据直接写入 V9 vault；
5. 不得绕过 manifest；
6. 不得因迁移失败而“继续往下跑并宣布完成”；
7. 遇到字段语义不明必须停在 NEED_CONFIRM；
8. 其余工程性问题自行处理。
