# 个人工作台 V9 · MASTER PLAN v1.0

**版本**：v1.0  
**日期**：2026-08-29  
**状态**：冻结母方案  
**基础**：V8 Workbench + MyDiary 2.x  
**定位**：以 Today 为入口、以 Timeline 为主线、以 LIFE / WORK / PLAY 为三大生活空间的 Personal OS

---

## 0. 最高优先级原则

1. **V9 不推倒重来**：继承 V8 已验证的 React + TypeScript + Dexie + Tauri + Vitest 技术体系与核心业务闭环。
2. **P0 按闭环而非模块数量裁剪**：任何新增能力必须服务于既定 P0 闭环，否则进入 P1/P2。
3. **Diary 只负责生活记录**：学习与娱乐数据只引用、不复制。
4. **Today 是统一入口**：用户打开应用首先看到“今天要做什么、今天过得怎样、接下来怎么办”。
5. **Timeline 是跨域胶水**：来自 LIFE / WORK / PLAY 的事件形成统一时间线。
6. **安全先于便利**：App Lock、备份、私密文件和迁移不允许以牺牲数据安全换取开发速度。
7. **迁移必须可回滚**：任何真实数据迁移前必须存在可验证备份与 Dry Run。
8. **不在 Phase 之间偷偷扩大范围**：未列入本 Phase 的新功能一律登记，不直接实施。
9. **设计与工程必须对齐**：先锁定关键页面设计，再实施页面；不允许为了“先跑起来”永久牺牲设计目标。
10. **所有关键模块必须通过启动/运行/错误检查**：不得仅以 TypeScript 编译通过作为“完成”。

---

# 1. 产品愿景

> **帮你把今天过好，然后记得它。**

V9 从“学习/工作效率工具”升级为个人数字生活操作系统：

- **LIFE**：记录生活、关系与个人表达。
- **WORK**：承接 V8 的学习、任务、知识、错题、闪卡、成绩与复盘闭环。
- **PLAY**：记录动漫、游戏、音乐等兴趣与娱乐体验。
- **TODAY**：统一呈现当天状态、待办、学习进度、生活记录、娱乐活动。
- **TIMELINE**：将各域真实数据聚合为个人时间线。
- **DAILY MEMORY / YEAR**：长期保存“我这一天发生过什么”，而不是只记录数字。

---

# 2. 用户场景

当前核心用户是中国高三生：

- 早上 7:00 前到校；
- 晚上 21:30 后离校；
- 单休；
- 白天基本无法持续使用 Workbench；
- 主要使用窗口集中在晚间；
- 核心需求是快速整理当天学习、错题、闪卡、复盘和第二天计划；
- 娱乐记录主要服务于兴趣整理与回忆，不追求强社交；
- 不希望使用联网 LLM 作为推荐系统核心，可接受本地机器学习/内容过滤路线。

因此 V9 优先解决：

**高三晚间收口 → 日常记录 → 长期记忆**。

---

# 3. 产品架构

```text
                            TODAY
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
           LIFE              WORK              PLAY
            │                 │                 │
      Diary / Calendar    Task / Study     Anime / Game / Music
      Friends / Material Knowledge / Mistakes
            │              Flashcards / Score
            │                 Review
            └─────────────────┼─────────────────┘
                              │
                         TIMELINE
                              │
                Collection / Daily Memory
                              │
                         Review / Year
```

---

# 4. 导航结构

## 顶层

```text
今日
生活
学习
娱乐
时间线
工具
密码本
设置
```

其中：

- **今日**：默认首页。
- **生活**：Diary / Calendar / Friends / Materials / Articles。
- **学习**：Tasks / Study / Knowledge / Mistakes / Flashcards / Scores / Review。
- **娱乐**：Anime / Games / Music / Collection。
- **时间线**：Timeline。
- **工具**：V8 工具 + 后续 Pocket Study 等。
- **密码本**：延续 V8 安全边界。
- **设置**：主题、通知、安全、数据管理。

---

# 5. P0 产品闭环

## P0-01 晚间学习收口

```text
21:30+ 回家
  ↓
Today
  ↓
查看任务与剩余时间
  ↓
执行学习 / 错题 / 闪卡
  ↓
Flex Block 动态调整
  ↓
Night Shutdown
  ↓
今日复盘
  ↓
生成明日最重要的一件事
```

必须包含：

- Today
- Task / Plan
- Knowledge
- Mistake
- Flashcard
- Review
- Flex Block
- Night Shutdown
- App Lock

## P0-02 生活记录

```text
Diary
  ↓
天气 / 心情 / 一句话 / 正文 / 灵感
  ↓
Timeline
```

必须包含：

- Diary
- Calendar / Event
- Timeline

## P0-03 娱乐记录

```text
PLAY
 ↓
Anime / Game / Music
 ↓
状态 / 评分 / 感想
 ↓
Timeline / Collection
```

必须包含：

- Anime
- Generic Game
- Music
- Collection Core

## P0-04 数据安全

```text
App Lock
 ↓
解锁
 ↓
敏感数据访问
 ↓
自动备份
```

必须包含：

- App Lock
- Auto Backup
- Private File 基础能力

---

# 6. P0 功能清单

| 区域 | P0 功能 |
|---|---|
| HOME | Today 驾驶舱、Daily Memory、Timeline 摘要 |
| LIFE | Diary、Calendar/Event、Friends |
| WORK | Tasks、Study、Knowledge、Mistakes、Flashcards、Scores、Review |
| PLAY | Anime、Generic Game、Music |
| Cross | Timeline、Global Search、Collection Core |
| Planning | Flex Block、Night Shutdown |
| Security | App Lock、Auto Backup、Private File 基础能力 |
| Existing | V8 工具、主题、通知、密码本、设置 |

P0 不代表所有模块都必须一次做到“终极形态”，而是必须达到可用、稳定、可验收。

---

# 7. P1 / P2

## P1

- 漂亮的 Collection 页面
- Year in Review
- Game Adapter（Genshin / ZZZ）
- 本地推荐引擎 v1
- Pocket Study
- 高考手册深化
- 高级日历
- 更丰富的视觉动效

## P2

- Combat Lab 高级模拟
- 更深度的 Game Adapter
- 娱乐发现系统
- 更复杂的本地 ML
- 跨设备同步
- 高级年度报告

---

# 8. Diary 数据边界

Diary 禁止把其他模块数据复制成第二份事实源。

| 数据 | 所属 | Diary 行为 |
|---|---|---|
| 天气/心情/感受 | LIFE | 直接记录 |
| 生活照片 | LIFE | 直接记录 |
| 学习任务完成 | WORK | 只引用聚合结果 |
| 错题/闪卡 | WORK | 只引用聚合结果 |
| 动漫观看 | PLAY | 只引用记录 |
| 游戏进度 | PLAY | 只引用记录 |
| 音乐感想 | PLAY | 引用音乐条目/感想 |

---

# 9. Daily Memory

Daily Memory 是 V9 核心体验之一。

Today 底部呈现：

```text
今天

完成学习任务 4 项
学习 96 分钟
复习闪卡 12 张
看完 1 部动画
写了一篇日记

今天最值得记住的：
“……”
```

要求：

- 自动汇总，不伪造事实；
- 用户可以修改“最值得记住的”；
- 所有统计来自真实模块数据；
- 支持按日、周、月、年回顾。

---

# 10. Timeline

Timeline 统一承载跨域活动，但不改变原始数据归属。

事件来源示例：

- task.completed
- study.session.completed
- flashcard.reviewed
- review.completed
- diary.created
- anime.status.changed
- game.record.created
- music.note.created
- friend.birthday.reminder

每一条 Timeline Event 至少包含：

```ts
interface TimelineEvent {
  id: string
  timestamp: number
  domain: 'life' | 'work' | 'play'
  type: string
  title: string
  sourceId?: string
  sourceType?: string
  metadata?: Record<string, unknown>
}
```

---

# 11. Flex Block

Flex Block 不追求“精确排班”，而追求“剩余时间可执行”。

输入：

- 当前时间
- 当晚可用时间
- 每项任务预计时长
- 任务优先级
- 任务是否必须完成

输出：

- 预计总工作量
- 剩余可用时间
- 超额量
- 当前推荐执行顺序

原则：

> 系统帮助用户调整计划，不替用户强制排班。

---

# 12. Night Shutdown

Night Shutdown 是晚间使用场景的最终收口。

步骤：

1. 查看今日完成情况；
2. 查看未完成事项；
3. 记录原因；
4. 记录今日收获/感受；
5. 生成明日最重要的一件事；
6. 写入 Review；
7. 回到 Today / 结束使用。

不得设计成长篇问卷。

---

# 13. 娱乐系统

## Anime

支持：

- 想看 / 在看 / 已看 / 搁置；
- 评分；
- 短评；
- 标签；
- 封面；
- 收藏。

## Music

核心不是播放器，而是：

- 音乐档案；
- 听歌感想；
- 歌手/作品记录；
- 收藏；
- 时间线引用。

## Game

首发使用 Generic Game：

- 游戏名称
- 图标
- 类型
- 状态
- 游玩记录
- 时长
- 自定义字段

Genshin / ZZZ 等 Adapter 后续以插件式方式加入，不修改核心 Game Domain。

---

# 14. Game Adapter 架构

```ts
interface GameAdapter {
  id: string
  name: string
  capabilities: string[]
  fetchProfile?(account: unknown): Promise<unknown>
  fetchRecords?(account: unknown): Promise<unknown>
  simulateCombat?(input: unknown): Promise<unknown>
}
```

核心原则：

- Generic Game 永远可用；
- 外部 API 不成为核心数据源；
- Adapter 异常不得导致 PLAY 崩溃；
- API 数据必须缓存；
- 网络失败时仍可使用本地记录。

---

# 15. 本地推荐

第一阶段只做内容过滤，不使用联网 LLM。

特征来源：

- 标签
- 类型
- 作者
- 年份
- 用户评分
- 收藏
- 完成状态
- 最近交互

排序模型：

```text
兴趣匹配
+ 最近偏好
+ 收藏权重
+ 探索项
- 已完成项
- 明确跳过项
```

推荐不是 P0 阻塞项。

---

# 16. 数据模型

首批新增表：

```text
 diaries
 materials
 articles
 friends
 scores
 events
 privateFileMeta
 appLock
 games
 gameRecords
 gameTeams
 collection_entries
```

V8 原有核心表继续复用：

```text
tasks
subjects
knowledge
mistakes
reviewEntries
reviewTemplates
flashcards
flashcardSchedule
exams
reviewEntries
```

最终 schema 必须在代码施工前形成正式 CODE_SPEC / migration contract。

---

# 17. 加密与安全

## 17.1 首发 KDF

```text
PBKDF2-HMAC-SHA256
iterations >= 600,000
salt = random 128-bit
```

## 17.2 文件加密

```text
AES-GCM-256
IV = random 96-bit
DEK per file
KEK derived from master password
```

## 17.3 App Lock

- 密码验证信息不得存储明文密码；
- 解锁后密钥只存在内存；
- 敏感页面受锁保护；
- 错误尝试需要限速；
- 锁定状态不允许通过 UI 绕过。

## 17.4 Private File

真实文件存储由 Tauri 文件系统能力承载；Dexie 只保存元数据。

---

# 18. MyDiary Migration

架构采用：

```text
MyDiary Legacy
      ↓
Bundled Python Sidecar
      ↓
旧数据解析 / Fernet 解密
      ↓
标准化迁移格式
      ↓
Tauri / Workbench
      ↓
新体系加密
      ↓
Dexie / PrivateWorkbench
```

Python 只负责 legacy compatibility，不参与 V9 日常业务。

---

# 19. Migration 硬约束

1. 真实迁移前必须 Dry Run。
2. 旧目录只读。
3. 新系统迁移失败不能破坏旧数据。
4. 私密文件迁移前必须完整备份。
5. staging 中的明文只能短期存在，操作结束立即删除。
6. 迁移必须生成 manifest。
7. 每一步必须可重试、可恢复。
8. 未通过一致性校验不得删除旧数据。
9. vault 与 private file 必须独立处理。
10. 主密码重设不能导致旧数据无法验证。

---

# 20. Phase 总览

## Phase 0 · Freeze / Baseline

- 冻结 V8 baseline
- 冻结 MyDiary baseline
- Git baseline
- 数据清单
- 风险清单
- 迁移合同

**Gate 0**：文档、代码、数据、备份基线全部可审计。

## Phase 0.5 · Migration Dry Run

- 非敏感数据 Dry Run
- 加密文件 Dry Run
- 迁移 manifest
- 一致性校验

**Gate 0.5**：真实数据不被修改，Dry Run 报告可复现。

## Phase 1 · Foundation

- Dexie schema
- App Lock
- Security
- Tauri fs 权限
- Event / Timeline 基础

**Gate 1**：可构建、可运行、可锁定/解锁、无核心数据错误。

## Phase 2 · V8 Core Reinforcement

- Today
- Tasks
- Study
- Knowledge
- Mistakes
- Flashcards
- Review
- Flex Block
- Night Shutdown

**Gate 2**：晚间学习闭环完整。

## Phase 3 · LIFE

- Diary
- Calendar/Event
- Friends
- Timeline 联动

**Gate 3**：生活记录闭环完整。

## Phase 4 · PLAY

- Anime
- Game
- Music
- Collection Core

**Gate 4**：娱乐记录闭环完整。

## Phase 5 · Cross Domain

- Daily Memory
- Timeline 深化
- Global Search
- Collection

**Gate 5**：三域数据可互相引用但无重复事实源。

## Phase 6 · Security / Private File

- Private File
- Migration
- Backup / Restore
- Vault hardening

**Gate 6**：安全与迁移通过专项审计。

## Phase 7 · Product Polish

- UI 收敛
- 动画
- Loading / Empty / Error State
- Accessibility
- Performance

**Gate 7**：完整视觉与稳定性验收。

## Phase 8 · P1 Expansion

- Game Adapter
- Recommendation
- Year in Review
- Pocket Study

## Phase 9 · Release

- 全量回归
- Tauri build
- 安装包
- Migration final rehearsal
- 文档
- Release candidate

---

# 21. 测试门槛

每个 Phase 至少通过：

### 静态
- tsc
- lint
- formatting

### 单元
- domain
- store
- migration
- security

### 集成
- 页面启动
- 读写数据
- 关键联动

### 回归
- 原有 V8 功能不退化

### 人工
- 每个模块实际打开
- 每个关键操作实际执行
- 错误路径实际验证

最终要求：

> **不能只证明“代码能编译”，必须证明“程序能启动、模块能打开、操作有反馈、错误可处理、数据不丢失”。**

---

# 22. 全模块启动检查

每个模块至少验证：

```text
启动
→ 首屏渲染
→ 空状态
→ 正常数据
→ 新增
→ 编辑
→ 删除
→ 搜索
→ 筛选
→ 返回
→ 刷新
→ 异常
→ 再次进入
```

任何模块出现：

- blank page
- uncaught exception
- promise rejection
- route crash
- data load failure
- console error
- button no-op

均不得标记该 Phase 完成。

---

# 23. 变更控制

所有超出当前 Phase 范围的事项进入：

```text
Backlog / NEED_CONFIRM / Future Phase
```

AI / Agent 不得因为“顺手优化”擅自扩大功能范围。

只有以下情况允许立即处理：

- 安全漏洞
- 数据损坏
- 阻塞当前 Phase 的致命 bug
- 明显导致程序无法启动/使用的错误

---

# 24. 完成定义

V9 只有同时满足以下条件，才可标记最终完成：

- P0 全部闭环可用
- V8 核心能力无回归
- MyDiary 迁移可验证
- 安全边界通过
- 每个模块可正常启动
- 每个页面有 loading / empty / error state
- 无未捕获运行时异常
- build/test 全绿
- Tauri 打包通过
- 最终 exe 可安装、启动、使用
- 用户真实数据迁移后抽样一致

---

# 25. Agent 执行原则

AI 执行 V9 时：

1. 先读取本 Master Plan 与当前 Phase 文件；
2. 只实施当前 Phase；
3. 完成后自测；
4. 运行 build/test；
5. 做模块启动检查；
6. 更新 Phase 状态与变更记录；
7. 进入下一 Phase；
8. 遇到用户语义、数据安全、产品范围、破坏性迁移等问题必须暂停并请求确认；
9. 普通工程问题自行解决，不打断用户；
10. 除非发生 NEED_CONFIRM，否则持续执行到当前 Phase 的 Gate。

---

# 26. 最终产品哲学

V9 不追求“功能最多”。

它追求：

> **今天好用，晚上收得住；生活有地方记，兴趣有地方放；过去不会消失，数据不会失控。**
