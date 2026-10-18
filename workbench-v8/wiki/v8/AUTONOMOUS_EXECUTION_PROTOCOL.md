# AUTONOMOUS_EXECUTION_PROTOCOL

> 版本：1.0
> 项目：个人工作台 V8
> 配套：`V8_MASTER_PLAN_v1.21.md`
> 模式：人工转接 + Agent 自主连续执行

---

## 1. 核心目标

用户只需要批准“开工”。

Agent 不应要求用户逐个批准 I-Task，而应自行：

```text
读取 Master Plan
↓
选择 READY I-Task
↓
执行
↓
Test
↓
Self Review
↓
更新状态
↓
下一个 READY I-Task
↓
Phase Gate
↓
下一 Phase
```

只有真正越过权限边界时才暂停。

---

## 2. Agent 自主决策等级

### L0 · Agent 自行决定

- 文件命名
- 函数 / 组件命名
- 文件拆分
- CSS 细节
- 测试组织
- 小型重构
- 不改变行为的代码整理

### L1 · 自行决定并记录

- 小型性能优化
- 非破坏性内部 API 整理
- 小型错误处理改进
- 不改变产品语义的结构调整

### L2 · 自行决定 + Review

- 新增普通开发依赖
- 内部 API 较大调整
- 不破坏数据的架构调整
- 跨多个模块的非破坏性工程优化

### L3 · 必须人工确认

- 产品语义改变
- 上游 SPEC 冲突
- 破坏性 migration
- 数据可能丢失
- vault 安全边界变化
- 技术栈变化
- 重大架构变化
- 新增重大产品需求
- 无可靠回滚
- 外部研究推翻已冻结决策

---

## 3. 默认规则

当：

```text
SPEC 已冻结
+
I-Task READY
+
Dependencies 已满足
+
未触发 L3
```

Agent **必须继续执行，不询问“是否继续”。**

---

## 4. I-Task 状态机

```text
PENDING
↓
READY
↓
IN_PROGRESS
↓
TESTING
↓
REVIEW
↓
DONE
```

普通失败：

```text
FAILED
↓
AUTO_FIX
↓
TESTING
```

环境 / 规格 / 安全阻塞：

```text
BLOCKED
↓
NEED_CONFIRM
↓
STOP
```

---

## 5. 连续执行要求

每个 I-Task 完成后必须自动：

1. Test
2. Typecheck / Build（适用时）
3. Self Review
4. W / D / C 对照
5. Acceptance 检查
6. Risk 记录
7. State 更新
8. 查找下一项 READY 任务
9. 自动继续

不得在普通任务完成后等待用户回复。

---

## 6. Auto-Fix 原则

允许自动修复：

- TypeScript 错误
- lint
- import
- CSS
- 普通 runtime bug
- 非破坏性测试失败
- 小型性能问题

禁止为了让测试通过而：

- 删除测试
- 降低断言
- 屏蔽异常
- mock 核心真实逻辑
- 修改 Acceptance
- 修改 SPEC

---

## 7. Browser 规则

Browser 是按需触发器。

适用：

- 当前 API / SDK 版本不确定
- 官方行为需要确认
- 平台规范
- 安全公告
- 兼容性
- SPEC 要求外部研究

优先：

```text
官方文档
>
官方仓库
>
高可信技术资料
```

Browser 发现不能自动扩大产品范围。

若发现会推翻冻结决策：

> `NEED_CONFIRM`

---

## 8. 防止需求膨胀

发现额外工作：

```text
当前 I-Task
↓
发现非依赖优化
↓
登记 Future Task
↓
继续当前任务
```

只有当前任务明确依赖时才允许扩展。

---

## 9. Phase Gate

每个 Phase：

```text
Implementation
↓
Tests
↓
Self Review
↓
Gate
```

Gate PASS：

```text
Phase N DONE
↓
Phase N+1
```

Gate FAIL：

```text
Gap List
↓
AUTO_FIX
↓
重新 Gate
```

如果需要改产品、重大架构或安全边界：

> `NEED_CONFIRM`

---

## 10. Self Review

### WORK

- 用户要求
- 事实
- 研究
- 引用
- 结构
- 完整性

### DESIGN

- IA
- 信息层级
- Token
- Theme
- 状态
- Responsive
- Accessibility
- Motion
- Handoff

### CODE

- 功能
- 数据
- 类型
- 错误处理
- 安全
- 性能
- 测试
- Build
- Rollback

---

## 11. 三 Agent 无互通规则

WORK / DESIGN / CODE 不共享实时上下文。

不得假设：

> “另一个 Agent 应该已经处理了。”

必须通过文件人工转接。

### WORK → DESIGN

至少转：

```text
WORK_GLOBAL
V8_PROJECT_GLOBAL
WORK_SPEC
DESIGN_SPEC
WORK Executive Summary
相关研究 / 内容
相关 I-Task / Review
```

### DESIGN → CODE

至少转：

```text
CODE_GLOBAL
V8_PROJECT_GLOBAL
WORK_SPEC
DESIGN_SPEC
CODE_SPEC
Design System
High Fidelity
Design Handoff
相关 I-Task / QA
```

### CODE → WORK / DESIGN

仅在：

- 产品语义冲突
- 设计不可实现
- 数据安全风险
- 重大技术变化
- 上游验收

时转回。

---

## 12. V8 推荐顺序

在当前项目的“少打扰”目标下：

```text
Gate 0 PASS
↓
DESIGN Phase 1
↓
DESIGN Phase 2
↓
人工转交 Design Handoff
↓
CODE Phase 3
↓
CODE Phase 4+
↓
Autonomous Build
```

### DESIGN 优先的原因

- Phase 1 建立 Design Foundation。
- Phase 2 输出关键页面 High Fidelity。
- CODE 的页面工程化需要 Design Handoff。
- 先锁定视觉 / 交互可明显降低返工。

### CODE 可提前的范围

如果用户另行要求并行，只允许提前做：

- stores/
- domain/
- Event Bus
- Vitest foundation

不要提前做最终 UI / 依赖 Design Handoff 的页面实现。

---

## 13. WORK 驻留策略

WORK 完成：

- GOAL
- SPEC
- 产品定义
- 研究

后退出主施工链。

重新启用 WORK 的条件：

- 新产品需求
- 产品语义冲突
- 新研究任务
- 用户主动修改规则

---

## 14. NEED_CONFIRM 标准格式

```text
NEED_CONFIRM

触发规则：
L3-XX

当前情况：
A

风险：
B

可选方案：
A / B / C

推荐：
X

已暂停：
I-XXX

继续所需：
用户确认 Y
```

用户确认后：

> 从暂停任务继续，不重做整个 Phase。

---

## 15. V8 硬规则

自主执行永远不能突破：

- V5 → V8 数据完整性
- Dexie migration 可回滚
- vault 独立安全边界
- 普通 backup 默认排除 vault
- F 为页面级 Review Data scope
- Theme 不改变 IA
- Web fallback
- 本地优先
- 冻结技术栈
- W / D / C 已冻结职责边界

---

## 16. 启动指令

正式启动时，直接给对应 Agent：

```text
读取并严格执行：

V8_GLOBAL.md
对应 Agent GLOBAL
V8_PROJECT_GLOBAL.md
WORK_SPEC.md
DESIGN_SPEC.md
CODE_SPEC.md
V8_MASTER_PLAN_v1.21.md
V8_PHASE0_BASELINE.md
V8_PHASE0_RISKS.md
V8_PHASE0_I_TASKS.md
AUTONOMOUS_EXECUTION_PROTOCOL.md

进入 Autonomous Build。

从当前第一个 READY I-Task 开始。
无需我逐项批准。
完成后自动 Test → Self Review → 更新状态 → 下一项。

Browser 按需自动触发。
普通实现问题自行解决。
不得扩大需求。
不得改变冻结产品语义。
不得突破 V8_GLOBAL 硬规则。

只有 NEED_CONFIRM 条件触发时暂停并请求人工确认。

Phase Gate PASS 后自动进入下一 Phase。

不要在每个 I-Task 完成后等待我的回复。
```

---

## 17. 正常停止条件

正常完成：

```text
所有 Phase DONE
+
所有 Gate PASS
+
所有 I-Task DONE
+
最终 Build PASS
+
最终 Test PASS
+
Final Review PASS
```

或正常暂停：

```text
NEED_CONFIRM
```

除此之外：

> Agent 应继续执行，而不是主动停工。
