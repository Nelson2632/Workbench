# CONTRACT_GATE_REPORT — 里程碑 0 验证报告

> 生成时间：2026-10-08T16:39:23.585Z ｜ 检查 70 项，通过 70 项，失败 0 项

## 检查清单

| 结果 | 检查项 | 说明 |
|---|---|---|
| PASS | 合同齐全性: V9_SCHEMA_CONTRACT.md | 存在且含机器块 |
| PASS | 合同齐全性: PROJECTION_CONTRACT.md | 存在且含机器块 |
| PASS | 合同齐全性: SECURITY_CONTRACT.md | 存在且含机器块 |
| PASS | 合同齐全性: FLEX_STUDY_CONTRACT.md | 存在且含机器块 |
| PASS | 合同齐全性: GAME_CONTRACT.md | 存在且含机器块 |
| PASS | 合同齐全性: MIGRATION_CONTRACT.md | 存在且含机器块 |
| PASS | Schema: v8Tables 与真实底座一致 | 22 张 V8 表逐名核对 |
| PASS | Schema: 新增表名唯一 | 共 21 张新增表 |
| PASS | Schema: 枚举值非空且唯一 | 全部小写字符串枚举 |
| PASS | Projection: include/mutate/delete 事件 ⊆ 事件总表 | 无幽灵事件 |
| PASS | Projection: include 的 sourceType ⊆ Schema SourceType |  |
| PASS | Projection: sourceTypeDomain 覆盖全部 SourceType |  |
| PASS | Projection: Daily Memory 三域齐全 |  |
| PASS | Projection: reflection 永不被覆盖 |  |
| PASS | Projection: 日历渲染 Task/Exam 为投影 |  |
| PASS | Projection: 重建步骤含幂等断言 |  |
| PASS | Security: 加密参数正确 | PBKDF2-HMAC-SHA256 / AES-256-GCM / 96-bit IV |
| PASS | Security: 迭代次数下限合法 | 暂定 600000，下限 210000 |
| PASS | Security: 备份排除 vault 与私密文件 |  |
| PASS | Security: 密钥绝不持久化 |  |
| PASS | Security: 不导入遗留密码 |  |
| PASS | Security: Restore 三步动作冻结 |  |
| PASS | Flex: priorities = Schema Priority |  |
| PASS | Flex: planningModes = Schema PlanningMode |  |
| PASS | Flex: 映射键为 V8 P0/P1/P2 |  |
| PASS | Flex: 默认 adaptive |  |
| PASS | Flex: fallback 触发与动作齐备 |  |
| PASS | Flex: 硬禁止清单齐备 |  |
| PASS | Flex: 建议需确认 + 无 LLM 无网络 |  |
| PASS | Flex: 性能护栏 |  |
| PASS | Game: 接口成员冻结 |  |
| PASS | Game: 非 Core 依赖 |  |
| PASS | Game: 超时/重试/离线策略 |  |
| PASS | Game: 禁止清单齐备 |  |
| PASS | Game: 战斗模拟必须标注理论值 |  |
| PASS | Migration: 流程五步冻结 |  |
| PASS | Migration: 五大计数字段 |  |
| PASS | Migration: 映射目标表全部存在 |  |
| PASS | Migration: 不迁移清单含密码与内嵌任务 |  |
| PASS | Migration: 重试 ×3 + 允许 Skip |  |
| PASS | Migration: 回滚三步冻结 |  |
| PASS | Migration: 旧 MyDiary 只读 |  |
| PASS | Migration: Dry Run 零写入 + 固定时钟/时区 |  |
| PASS | 交叉: 迁移目标表 ∈ Schema 表集 |  |
| PASS | 交叉: Timeline 源类型 ∈ SourceType 枚举 |  |
| PASS | 交叉: 各合同版本 = Patch 0.1.2 期望值 | schema=0.1.2 / projection=0.1.1 / security=0.1.1 / flexstudy=0.1.0 / game=0.1.1 / migration=0.1.1 |
| PASS | Patch: V8 主键类型保持真实类型（tasks=string） |  |
| PASS | Patch: 跨表引用严格采用被引用表真实主键类型，禁止隐式 String 转换 |  |
| PASS | Patch: 新表默认 ++id(number)，仅投影/指针表 String 化 |  |
| PASS | Patch: CalendarEvent / DomainEvent 类型拆名 |  |
| PASS | Patch: EventBus = 实时跨域联动主路径（非单向禁止） |  |
| PASS | Patch: EventBus 边界四象限已冻结 |  |
| PASS | Patch: Projection 为历史快照，不反映事实当前态 |  |
| PASS | Patch: review.completed 取 completedAt 而非 createdAt |  |
| PASS | Patch: exam 历史时间语义冻结（occurredAt=exam.date） |  |
| PASS | Patch: Restore 不回退当前 App Lock 认证态 |  |
| PASS | Patch: Restore 不恢复 salt/verifier/KEK |  |
| PASS | Patch: 文件 AAD 绑定 immutable fileId（展示名≠密码学身份） |  |
| PASS | Patch: KDF Benchmark 测试矩阵落地 + 250-500ms 目标 |  |
| PASS | Patch: iterationsFinal 状态明确（M0 待定/Phase1 锁定） |  |
| PASS | Patch: appLock.createdAt 审计字段 |  |
| PASS | Patch: Adapter 生命周期版本字段齐备 |  |
| PASS | Patch: Adapter 版本不匹配一律 disabled 而非猜测兼容 |  |
| PASS | Patch: Migration Rescue Mode（失败不阻塞 V9 启动） |  |
| PASS | Patch: 跳过数据三段式可见 + 可查跳过项 |  |
| PASS | Dry Run: 样例与期望导出存在 |  |
| PASS | Dry Run: 计数与期望一致 | source=20 target=18 failed=3 skipped=2 |
| PASS | Dry Run: 行数据与期望一致（稳定字段口径） |  |
| PASS | Dry Run: issues 与期望一致 |  |
| PASS | Dry Run: SHA-256 计算正确 | 13ea94c39447fe32… |

## 结论

**全部通过。** 六份合同齐全、互相无冲突，Migration Dry Run 样例数据全绿 —— 里程碑 0 Gate 通过。
