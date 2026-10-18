# SECURITY_CONTRACT — App Lock / 加密 / 备份边界安全契约

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-003 |
| 版本 | 0.1.1（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §22 / §23 / §25 / §26 |
| 关联合同 | V9-C-001（appLock/privateFileMeta/backupSnapshots 表）、V9-C-002（restore 后重建）、V9-C-006（迁移不导入旧密码） |

---

## 1. 四条铁律（不可违反）

1. **主密码与派生密钥绝不持久化**：主密码、KEK、DEK 明文不得写入任何存储（IndexedDB、localStorage、文件、日志）。
2. **普通 Backup 永不包含 Vault 私密内容**（V8 现状已如此，V9 延续并扩展到 privateFileMeta 与密文文件）。
3. **PBKDF2 迭代次数不做"永远的业务常量"**：按参数版本冻结，Phase 1 用 benchmark 在目标硬件上实测校准后锁定最终值。
4. **密钥生命周期闭环**：锁定/退出 = 内存清空；改密码 = 重包裹全部 DEK；恢复备份 ≠ 恢复密钥。

---

## 2. App Lock 参数（冻结）

```text
Master Password
  ↓ PBKDF2-HMAC-SHA256（WebCrypto，异步原生实现，不阻塞 UI）
KEK（32 字节）
```

| 参数 | 冻结值 |
|---|---|
| KDF | PBKDF2-HMAC-SHA256 |
| Salt | 128-bit 随机（`crypto.getRandomValues`），base64 存 appLock.salt |
| 迭代次数 | kdfParamsVersion=1 暂定 **600,000**（OWASP 2023 推荐）；Phase 1 在目标 Windows 硬件实测，目标耗时 250–500ms，实测后在本合同修订记录锁定最终版本值（Patch C-003-10：见下方 Benchmark 测试矩阵） |
| KEK | 256-bit，仅存内存模块变量 |
| 校验器 | `verifier = HMAC-SHA256(KEK, 'v9-applock-verifier')`，base64 存 appLock.verifier；解锁时重算比对，**比对不存密钥本身** |
| 自动锁定 | 默认 15 分钟无操作（可配置，0=关闭） |
| 失败冷却 | 连续 5 次解锁失败 → 本地冷却 60 秒（仅本机防暴力枚举，无服务端） |
| 锁定动作 | 清空内存 KEK、发布 appLock.locked |
| 解锁动作 | 派生 KEK 成功 → 发布 appLock.unlocked |
| 主密码强度 | UI 建议 ≥8 字符，不做硬校验（本地应用，尊重用户自主） |

### 2.1 参数版本化规则

- `kdfParamsVersion` 递增时机：迭代次数、KDF 算法或 Salt 长度变更。
- 旧版本参数**永久保留在代码中**（解锁旧数据用），新设置只写新版本。
- 版本升级（如 1→2）需要用户处于解锁态时自动重派生。

### 2.2 KDF Benchmark 测试矩阵（Patch C-003-10）

最终迭代次数必须以实测锁定，禁止代码硬编码 `const ITERATIONS = 600000` 却与合同最终值脱节。测试矩阵冻结如下：

| 目标硬件 | 机型 | 期望耗时 |
|---|---|---|
| Intel i5 | Windows 11 低功耗笔记本 | 250–500ms |
| Intel i5 / Ryzen 5 | 普通台式机 | 250–500ms |

- 目标：PBKDF2-HMAC-SHA256 单次派生耗时落在 **250–500ms**。
- 结果写入本合同修订记录：最终写为 `kdfParamsVersion = 1` + `iterationsFinal = <实测锁定值>`，不得再出现"代码 600000 / 合同空白"的分裂。
- M0 阶段 `iterationsFinal` 保持待定（Phase 1 实测后冻结），但**不得阻塞 M0 Freeze**。

---

## 3. 文件加密信封（Private Files，Phase 6 实现，参数 Phase 1 冻结）

```text
主密码 → KDF → KEK
随机 DEK（256-bit，每文件独立）
文件密文 = AES-256-GCM(DEK, plaintext, fileIv, AAD="v9-file:"+ immutableFileId)
包裹 DEK  = AES-256-GCM(KEK, DEK, dekIv, AAD='v9-dek-wrap')
```

| 参数 | 冻结值 |
|---|---|
| 文件加密算法 | AES-256-GCM |
| IV | 96-bit，每次加密随机生成 |
| 认证标签 | 128-bit（GCM 默认） |
| AAD | **`'v9-file:' + immutableFileId`**（Patch C-003-05）；DEK 包裹用固定用途串 `'v9-dek-wrap'` |
| DEK | 256-bit 随机，每文件独立 |
| 文件身份 | AAD 绑定**不可变 fileId**，与展示名 `name` 解耦——`展示名 ≠ 密码学身份` |
| 密文位置 | Tauri 私有目录 `PrivateWorkbench/files/{uuid}.enc` |
| 元数据 | Dexie privateFileMeta（含 dekIv/dekCt/fileIv/fileTag/sha256Plain） |
| 明文路径 | 解密到临时目录，用后即删；**永不持久化明文路径** |
| 完整性 | 解密后验 SHA-256 与 sha256Plain 一致，不一致报"文件损坏" |

### 3.1 改主密码流程

解锁态 → 新密码派生新 KEK → 逐文件解包旧 DEK、用新 KEK 重包裹 → 替换 appLock 行（新 salt/verifier）→ 更新全部 privateFileMeta 包裹字段。全部在一个事务内。

### 3.2 Vault（V8 密码本）边界

- vault 表沿用 V8 现有加密机制，**不动**。
- 普通备份/导出/迁移 **永不包含** vault 表与 privateFileMeta 表及密文文件。
- 单独的"安全备份"为 P1，不进 V9 Core。

---

## 4. 备份与恢复安全边界（冻结）

| 规则 | 冻结值 |
|---|---|
| 快照内容 | V8 22 表（除 vault）+ V9 业务表 + **appLock 策略元数据**（仅 `enabled / autoLockMinutes / kdfParamsVersion`，可随备份走；`salt / verifier` 属认证态，不随备份语义回滚） |
| 快照排除 | vault、privateFileMeta、Tauri 私有目录密文文件、**operationJournal**（审计日志不随快照回滚，保留"刚发生过什么"的证据） |
| 快照校验 | SHA-256（备份 JSON canonical 化后），损坏 → 自动回退上一份快照并提示 |
| 快照保留 | Daily × 7 + Weekly × 4；高风险操作前强制快照 |
| Restore 前 | 必须先创建 safety snapshot |
| Restore 后 | integrity check + rebuildProjection()（V9-C-002 §9） |
| Restore 不恢复 | **当前 App Lock 认证状态**（Patch C-003-02）：不覆盖 `salt`、不恢复 `verifier`、不恢复 KEK；也不回滚用户当前密码体系 |
| Restore 语义 | **数据恢复 ≠ 身份恢复**（Patch C-003-02）：Restore 只负责恢复业务数据，不把用户当前密码体系回滚。用户修改密码后恢复旧快照，旧快照的 verifier **不得**覆盖当前有效 verifier |
| Journal 重放 | operationJournal 保留 30 天，用于恢复最近误操作（不含 vault 操作记录） |

---

## 5. 边界清单（QA 断言用）

1. 备份 JSON 全文搜索不得出现 vault 行内容与 `privateFileMeta` 键。
2. localStorage/sessionStorage/IndexedDB 中不得出现 KEK/DEK/主密码。
3. 锁定后内存 KEK 变量置 null（代码断言）。
4. MyDiary 遗留密码材料（diary_password.json、Fernet 密钥派生逻辑）**不导入** V9——App Lock 由用户全新设置（V9-C-006）。
5. **Restore 不回退认证态测试（Patch C-003-02 验收）**：`设置密码 A → 创建 backup → 修改密码 B → restore backup`，结果必须为 **密码 B 仍然有效、密码 A 无法重新获得认证权**。
6. **重命名不解密失败（Patch C-003-05 验收）**：`fileId=abc123`，`A.pdf → B.pdf`（改名/移动分组/改显示名）必须仍能解密成功；将同一密文复制到另一 `fileId` 必须认证失败（保留防篡改同时支持重命名）。

## 6. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：PBKDF2 参数、信封格式、备份边界、密钥生命周期。iterations 待 Phase 1 实测锁定 |
| 0.1.1 | 2026-08-30 | Patch 0.1.1：Restore 不回退当前 App Lock 认证态（C-003-02）、文件 AAD 绑定 immutable fileId（C-003-05）、appLock 新增 `createdAt` 审计字段（C-003-09，V9-C-001 §4.17）、新增 KDF Benchmark 测试矩阵（C-003-10） |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: security -->
```json
{
  "contract": "security",
  "version": "0.1.1",
  "kdf": "PBKDF2-HMAC-SHA256",
  "saltBits": 128,
  "iterationsProvisional": 600000,
  "iterationsMin": 210000,
  "iterationsFinal": null,
  "kdfBenchmarkTargetMs": [250, 500],
  "kdfBenchmarkMatrix": [
    {"cpu": "Intel i5", "platform": "Windows 11 low-power laptop"},
    {"cpu": "Intel i5 / Ryzen 5", "platform": "Windows 11 desktop"}
  ],
  "kdfParamsVersion": 1,
  "kekBits": 256,
  "dekBits": 256,
  "fileCipher": "AES-256-GCM",
  "ivBits": 96,
  "tagBits": 128,
  "verifier": "HMAC-SHA256(KEK, 'v9-applock-verifier')",
  "autoLockMinutesDefault": 15,
  "maxFailedAttempts": 5,
  "cooldownSeconds": 60,
  "dekWrapAad": "v9-dek-wrap",
  "fileAad": "v9-file:{immutableFileId}",
  "fileAadBindsImmutableFileId": true,
  "displayNameNotCryptographicIdentity": true,
  "backupExcludes": ["vault", "privateFileMeta", "privateFilesCiphertext", "operationJournal"],
  "backupIncludesAppLockRow": true,
  "backupAppLockScopePolicyMetadataOnly": true,
  "kekPersisted": false,
  "masterPasswordPersisted": false,
  "legacyPasswordImported": false,
  "restoreRequires": ["safetySnapshot", "integrityCheck", "projectionRebuild"],
  "restoreDoesNotRestoreAppLockAuthState": true,
  "restoreDoesNotRestore": ["salt", "verifier", "KEK"],
  "restoreDataNotIdentity": true,
  "snapshotRetention": {"daily": 7, "weekly": 4},
  "appLockHasCreatedAt": true
}
```
<!-- /V9-CONTRACT-MACHINE -->
