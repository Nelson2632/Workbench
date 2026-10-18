# GAME_CONTRACT — Generic Game / Adapter 契约

| 项目 | 值 |
|---|---|
| 合同编号 | V9-C-005 |
| 版本 | 0.1.1（M0 Gate 通过后升 1.0.0 正式冻结） |
| 状态 | 冻结候选 |
| 冻结日期 | 2026-08-30 |
| 依据 | docs/V9_MASTER_PLAN.md §18 / §19 / §20 |
| 关联合同 | V9-C-001（games/gameRecords 表）、V9-C-002（game.recorded 事件） |

---

## 1. 核心隔离原则（不可违反）

```text
Generic Game（核心档案 + 手动记录）
        ↓ 可选
Adapter（动态注册、惰性加载）
```

- **Adapter 永远不能成为 Core Dependency**：核心业务、EventBus、投影、备份、构建流程禁止 `import` 任何 adapter 模块。
- 无 Adapter 时 Generic Game 完整可用（手动添加游戏、手动记录进度/时长/结果）。
- Adapter 只能通过**注册表**被 UI 发现；注册表本身属于核心，adapter 代码属于扩展。

---

## 2. 接口定义（冻结）

```ts
type GameCapability = 'profile' | 'records' | 'combat' | 'sync'

interface GameAdapter {
  /** 全局唯一游戏标识（如 'genshin' / 'zzz'） */
  readonly gameId: string
  /** adapter 自身语义版本（semver） */
  readonly adapterVersion: string
  /** 目标数据 schema 版本；与 V9 预期不符 → 禁用该 adapter */
  readonly targetSchemaVersion: number
  /** 支持运行的最小 Core 版本（semver）；低于它 → 禁用（Patch C-005-12） */
  readonly minCoreVersion: string
  /** adapter 能处理的最大 schema 版本；超过 Core 期望 → 视为过新，禁用（Patch C-005-12） */
  readonly maxSupportedSchemaVersion: number

  getCapabilities(): GameCapability[] | Promise<GameCapability[]>
  fetchProfile(): Promise<GameProfile>
  fetchRecords(): Promise<GameRecord[]>
  /** 可选能力；返回结果必须携带 theoretical 标记 */
  simulateCombat?(input: CombatSimulationInput): Promise<CombatSimulationResult>
  dispose?(): void
}

interface GameProfile {
  source: string        // adapter gameId
  updatedAt: string     // ISO
  data: Record<string, unknown>
}

interface CombatSimulationResult {
  theoretical: true     // 必须恒为 true，禁止伪装实测
  assumptions: string[] // 明确列出计算条件
  data: Record<string, unknown>
}
```

- `fetchProfile / fetchRecords` 返回的是**快照**，由 PLAY 域转写为 gameRecords 行（type=profile / 对应类型）落库——这就是 `lastKnownData` 的唯一来源。

---

## 3. 运行时策略（冻结）

| 项 | 冻结值 |
|---|---|
| 调用超时 | 每次调用 15 秒 |
| 重试 | 失败后最多 2 次，间隔 1s / 2s |
| 全部失败 | 进入 **offlineMode**：显示 lastKnownData（gameRecords 最新快照按 type），允许手动编辑/记录 |
| 离线状态 | 存 settings（key=`game.offline.{gameId}`），UI 常驻提示，提供"重试"按钮 |
| 版本不匹配 | adapter 禁用 + 提示升级，Generic Game 不受影响（Patch C-005-12：见生命周期版本约束） |
| 异常边界 | adapter 抛出的任何异常被 PLAY 域捕获并记入 operationJournal，**禁止冒泡进 EventBus 主链、禁止白屏、禁止死循环 loading、禁止清空数据、禁止强制删除缓存** |
| 战斗模拟 | 结果必须标注 `theoretical: true` 且列出 assumptions；UI 必须展示"理论值"标签 |

### 3.1 Adapter 生命周期版本约束（Patch C-005-12）

在接口中冻结 `minCoreVersion / maxSupportedSchemaVersion`，用**显式判定**替代"猜测兼容"：

| 场景 | 判定 | 动作 |
|---|---|---|
| `adapter.minCoreVersion > V9 Core version` | Adapter 过新 | **adapter disabled** |
| `adapter.maxSupportedSchemaVersion < Core 期望` | Adapter 过旧 | **adapter disabled** |
| `adapter.targetSchemaVersion > Core 期望 schema` | Schema 超前 | **adapter disabled** |

- 判定只做大小比较，不做"尽力猜测"兼容。
- 任一条件命中 → **直接 disabled**（UI 提示升级），Generic Game 核心功能不受影响。

---

## 4. 能力矩阵（冻结）

| 能力 | 说明 | 落库 |
|---|---|---|
| profile | 账号档案（等级/角色/资源） | gameRecords(type=profile) |
| records | 战绩/深境/深渊等记录 | gameRecords(type=result) |
| combat | 理论 DPS / 配队模拟 | gameRecords(type=combat)，带 theoretical 标记 |
| sync | 拉取远端数据（仍经本契约超时/重试/离线） | gameRecords(type=progress) |

- Adapter 不得自行写入 games / gameRecords 之外的任何表。
- Adapter 不得调用其他域（LIFE/WORK）的任何服务。

---

## 5. V9.1 轨道（不阻塞 V9 Core）

- Genshin Adapter、ZZZ Adapter 按本契约实现，优先级：Showcase/Profile/Character/Weapon/Artifact/Team → Simulation/DPS。
- 首发只交付 **Generic Game**（手动记录即可走通 PLAY 闭环）。

## 6. 修订记录

| 版本 | 日期 | 变更 |
|---|---|---|
| 0.1.0 | 2026-08-30 | 初稿：接口、隔离、超时重试、离线策略、theoretical 标记 |
| 0.1.1 | 2026-08-30 | Patch 0.1.1：Adapter 生命周期版本约束 `minCoreVersion / maxSupportedSchemaVersion`（C-005-12），过新/过旧一律 disabled 而非猜测兼容 |

---

## 附：机器可读块（contract-gate.mjs 校验用）

<!-- V9-CONTRACT-MACHINE: game -->
```json
{
  "contract": "game",
  "version": "0.1.1",
  "capabilities": ["profile", "records", "combat", "sync"],
  "interfaceMembers": ["gameId", "adapterVersion", "targetSchemaVersion", "minCoreVersion", "maxSupportedSchemaVersion", "getCapabilities", "fetchProfile", "fetchRecords", "simulateCombat", "dispose"],
  "optionalMembers": ["simulateCombat", "dispose"],
  "requiredMembers": ["gameId", "adapterVersion", "targetSchemaVersion", "minCoreVersion", "maxSupportedSchemaVersion", "getCapabilities", "fetchProfile", "fetchRecords"],
  "lifecycleVersionRules": {
    "minCoreVersionExceeded": "adapterDisabled",
    "maxSchemaTooNew": "adapterDisabled",
    "targetSchemaAhead": "adapterDisabled",
    "noGuessCompatibility": true
  },
  "timeoutMs": 15000,
  "retries": 2,
  "backoffMs": [1000, 2000],
  "offlineMode": {"useLastKnownData": true, "allowManualEdit": true, "showRetryButton": true},
  "forbidden": ["whiteScreen", "infiniteLoading", "dataClear", "forceCacheDelete", "eventBusPropagation"],
  "coreDependency": false,
  "adapterWritesLimitedTo": ["gameRecords"],
  "combatResultTheoreticalFlag": true,
  "v91Track": ["genshin", "zzz"],
  "v9FirstRelease": "genericGameOnly"
}
```
<!-- /V9-CONTRACT-MACHINE -->
