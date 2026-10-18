# V8 PHASE 0 — 工程基线（Baseline）

> 文档性质：Phase 0 交付物 · 只读核验，不改业务代码
> 生成时间：2026-08-23
> 上游依据：`V8_GLOBAL.md` / `CODE_GLOBAL.md` / `WORK_SPEC.md` / `DESIGN_SPEC.md` / `CODE_SPEC.md` / `V8_MASTER_PLAN_v1.1.md`
> 权威来源：当前源码（`src/`、`src-tauri/`）

---

## 0. 结论摘要

1. 技术底座、数据安全、桌面双窗口、V5→V8 迁移均已达标，**无需推倒重来**，与 `CODE_SPEC` 结论一致。
2. 真实 DB 表数量为 **18 张**（源码权威），`执行摘要/CODE.md` 写 19 张属笔误；`CODE_SPEC` 已修正为 18 张并据此规划 18+4=22。
3. **关键上游文档已补齐**（Phase 0 裁决）：`V8_MASTER_PLAN_v1.2.md` 与 `ERRATA-01~04` 已冻结产出；三处跨 SPEC 表述冲突的工程侧核验（§9）已固化为正式 Erratum。
4. Review Metrics 当前**没有任何类型化指标**（`autoSummary: any` + 单一不分型的 `getAutoSummary`），而非"仅支持 Daily/Subject/Weekly"的成品形态（详见 §8）。
5. C-16 已实现但内嵌页面、C-18 已实现、C-25 未开始（详见 §7）。

---

## 1. 文档存在性核验

| 文档 | 状态 | 位置 |
|------|------|------|
| `V8_GLOBAL.md` | ✅ 存在 | `wiki/V8_GLOBAL.md` |
| `agent/CODE_GLOBAL.md` | ✅ 存在 | `wiki/agent/CODE_GLOBAL.md` |
| `project/work/WORK_SPEC.md` | ✅ 存在 | `wiki/project/work/WORK_SPEC.md` |
| `project/design/DESIGN_SPEC.md` | ✅ 存在 | `wiki/project/design/DESIGN_SPEC.md` |
| `project/code/CODE_SPEC.md` | ✅ 存在 | `wiki/project/code/CODE_SPEC.md` |
| `执行摘要/WORK.md` / `DESIGN.md` / `CODE.md` | ✅ 存在 | `wiki/执行摘要/` |
| `V8_MASTER_PLAN.md`（v1.0） | ✅ 存在 | `wiki/V8_MASTER_PLAN.md` |
| `V8_MASTER_PLAN_v1.1.md` | ✅ 存在 | `wiki/V8_MASTER_PLAN_v1.1.md` |
| `V8_MASTER_PLAN_v1.2.md` | ✅ 已补齐（Phase 0 裁决） | `wiki/V8_MASTER_PLAN_v1.2.md` |
| `ERRATA-01 ~ ERRATA-04` | ✅ 已补齐（Phase 0 裁决） | `wiki/ERRATA-01.md` 等 4 份 |

> 已于 Phase 0 裁决补齐 v1.2 与 ERRATA-01~04（见 `V8_MASTER_PLAN_v1.2.md`），RISK-01 解除。§9 的等价核验结论已固化为正式 Erratum（ERRATA-01~03）。

---

## 2. 技术栈基线（与 CODE_SPEC 一致，未变）

| 层 | 技术 | 实测版本（package.json / Cargo.toml） |
|----|------|------|
| 桌面 | Tauri 2 | `tauri = "2"`，edition 2021 |
| 前端 | React | `^19.2.8` |
| 语言 | TypeScript | `~6.0.2` |
| 构建 | Vite | `^8.2.0` |
| 路由 | react-router-dom | `^7.18.2` |
| 状态 | zustand | `^5.0.15` |
| 数据库 | dexie | `^4.4.5` |
| 图表 | echarts / echarts-for-react | `^6.1.0` / `^3.0.6` |
| 样式 | CSS Modules | 全项目 `.module.css` |
| 桌面插件 | global-shortcut / notification / tray-icon | Cargo.toml 仅此三项 |

构建脚本（package.json）：`build = tsc && vite build`；`tauri:build = tauri build`。**无任何测试依赖**（无 vitest / playwright / jest）。

---

## 3. 数据库基线（真实 18 张表）

来源：`src/db/database.ts`（Dexie `version(1)`）。表清单如下：

`tasks`、`recurringTasks`、`projects`、`memos`、`notes`、`flashcards`、`flashcardReviews`、`subjects`、`mistakes`、`exams`、`reviews`、`reviewTemplates`、`reading`、`finance`、`countdowns`、`pomodoroLogs`、`vault`、`settings`。

| 项 | 结论 |
|----|------|
| 真实表数量 | **18 张** |
| Dexie 版本 | **version 1**（无 version 2） |
| `执行摘要/CODE.md` 声称 | 19 张（**与源码不符，属笔误**） |
| `CODE_SPEC` 声称 | 18 张（✅ 与源码一致，并已作事实性修正） |
| 目标（C-11） | 18 + 4 = 22 张，version 2 |

索引缺陷（`CODE_SPEC` §3.3 已识别，**已确认存在**）：`tasks`、`mistakes` 无 `createdAt` 索引，但 `reviewStore.getAutoSummary` 对二者做 `where('createdAt').between(...)`，属隐性缺陷，运行时会触发 Dexie 无索引告警/回退。

---

## 4. 目录结构基线（C-25 现状）

```
src/
├── assets/  components/  db/  hooks/  pages/
├── store/          # ← 单数，仅 systemStore.ts（待合并）
├── stores/         # ← 复数，8 个 store
├── styles/  types/  utils/
├── App.tsx  main.tsx  css-modules.d.ts
```

| 目标项（CODE_SPEC §2.3） | 现状 |
|------|------|
| `src/app/`（入口/路由迁入） | ❌ 不存在（App.tsx/main.tsx 仍在 src 根） |
| `src/domain/`（纯函数层） | ❌ 不存在 |
| `src/desktop/`（Tauri 集成） | ❌ 不存在（逻辑散于 hooks/utils） |
| `src/tests/`（测试） | ❌ 不存在 |
| `src/store/`（单数）合并到 `stores/` | ❌ 未合并，`store/systemStore.ts` 仍在 |

`stores/`（复数）现有 8 个：`flashcardStore`、`projectStore`、`recordStore`、`recurringStore`、`reviewStore`、`studyStore`、`taskStore`、`toolStore`。页面通过 Store Action 访问 DB，未发现页面直接调 `db.*`（vault 页除外，见 §6）。

---

## 5. 桌面端基线（C-18 双窗口）

来源：`src-tauri/tauri.conf.json` + `src-tauri/src/lib.rs`。

| 窗口 | label | 配置 | 状态 |
|------|-------|------|------|
| 主窗口 | `main` | 1280×800，min 960×640，可缩放 | ✅ 已实现 |
| 快捷备忘 | `quick-memo` | 440×320，无边框/置顶/不可缩放/默认隐藏/skipTaskbar，url=`/quick-memo` | ✅ 已实现 |

已实现桌面能力：全局快捷键（`Ctrl+Shift+Space` 唤起备忘、`Ctrl+Alt+B` 显隐主窗）、系统托盘（显示/备忘/退出）、桌面通知、关闭进托盘（main 与 quick-memo 均 `prevent_close` + hide）、`quit_app` 命令、`wb-quick-memo-saved` 事件同步。

未实现（C-17 P2）：autostart、single-instance、updater（Cargo.toml 无对应插件）。

---

## 6. 数据安全基线（C-16 vault）

来源：`src/pages/VaultPage.tsx`。

| 项 | 结论 |
|----|------|
| 加密算法 | ✅ PBKDF2（100000 迭代，SHA-256）+ AES-GCM 256，符合 `V8_GLOBAL` §12 |
| 主密码 | ✅ SHA-256 哈希 + 16 字节随机 salt，存 `settings` |
| 密码字段 | ✅ 每条目独立 IV，密文存储（`passwordIv` + `password` ciphertext） |
| 逻辑位置 | ⚠️ 内嵌于 `VaultPage.tsx`（未抽取 `utils/vaultCrypto.ts`，CODE_SPEC §10 SHOULD 项未做） |
| 普通导出排除 vault | ⚠️ **未满足**：`db.exportAllData()` 的 18 张表清单**包含 `vault`**（密码为密文，但未按"普通导出默认排除密码本"原则排除） |

---

## 7. 备份 / 迁移基线

### 7.1 备份（`src/db/backup.ts`）

| 目标（CODE.md §10 / CODE_SPEC C-15） | 现状 |
|------|------|
| 每日自动备份 | ✅ 实现（24h 节流） |
| 保留最近 7 份 | ✅ 实现（按文件名排序删除多余） |
| JSON 格式 | ✅ 实现 |
| 手动备份 | ❌ 无 |
| 恢复入口 / 历史管理 | ❌ 无 |
| checksum 校验 | ❌ 无 |
| 备份版本号（`version`/`exportedAt`） | ❌ 无（`exportAllData()` 返回裸 `{表: 行[]}`） |
| 排除 vault | ❌ 含 vault（见 §6） |

实现方式：浏览器 `showDirectoryPicker`（File System Access API）+ `<a download>` 兜底；非 Tauri 文件系统写入。

### 7.2 迁移（`src/db/migration.ts`）

| 项 | 结论 |
|----|------|
| V5→V8（localStorage→IndexedDB） | ✅ 已实现，事务包裹（`db.transaction('rw', db.tables, ...)`），`migrated` 标记防重 |
| 覆盖表 | tasks / notes / mistakes / exams / reading / finance / pomodoroLogs / subjects / projects / vault / reviews / countdowns |
| Dexie v1→v2 语义迁移 | ❌ **未实现**（当前 Dexie 仍 version 1，无 `version(2)`） |

---

## 8. Review Metrics 基线（任务 #2 结论）

> 裁决同步：已按 **5 类**（Daily / Subject / Weekly / Monthly / Exam）冻结，见 `ERRATA-04.md`。

来源：`src/types/index.ts` + `src/stores/reviewStore.ts` + 5 个复盘页。

**现状（源码为准）：**

- `Review.autoSummary: any`（`types/index.ts` L197）——**无类型化指标**。
- `ReviewType = 'daily' | 'subject' | 'weekly' | 'monthly' | 'exam'`（5 种类型已定义）。
- `reviewStore.getAutoSummary(type, dateRange)` **忽略 `type` 参数**，对所有类型返回同一份扁平 `Record<string, any>`：`totalTasks / completedTasks / totalReviews / ratings / newMistakes / masteredMistakes / totalIncome / totalExpense / totalPomodoro / totalPomodoroMinutes`。
- 无 `DailyMetrics / SubjectMetrics / WeeklyMetrics / MonthlyMetrics / ExamMetrics` 类型定义。

**三层文档对指标类型的表述不一致：**

| 文档 | autoSummary 类型 | 覆盖度 |
|------|------|------|
| `执行摘要/CODE.md` §8.2 | 定义了 5 种（Daily/Subject/Weekly/**Monthly/Exam**） | 5/5 |
| `CODE_SPEC.md` §3.2 | `DailyMetrics \| SubjectMetrics \| WeeklyMetrics` | 仅 3/5，**缺 Monthly/Exam** |
| 实际源码 | `any`（不分型） | 0/5 |

**补齐 Monthly/Exam 所需（非本阶段执行，仅登记）：**

1. 定义 `MonthlyMetrics`（month / daily / bySubject / heatmapData / totalStudyDuration）与 `ExamMetrics`（examId / examName / totalScore / rank / subjectScores / comparedToPrevious）。
2. 将 `ReviewEntry.autoSummary` 联合扩展为 5 种。
3. 让 `getAutoSummary` / `reviewAggregator` 按 `type` 分支产出对应指标。
4. 下沉页面内联计算：`MonthlyReviewPage` 现于页面内联算 `monthMinutes / completionRate / monthMistakes`；`ExamReviewPage` 现于页面内联算 `scoreChange / subjectScoreChanges / mistakeTypeDist / knowledgeDist` 且**完全不调用** `getAutoSummary`。二者应统一走 aggregator。

**附带发现（W-23 缺口）：** `nextActions` 字段存在但仅出现在 migration 映射、`addReview` 默认空数组与 SearchDialog 索引中；**5 个复盘页均无"下一步"结构化产出**（无"创建任务/指定日期/回流计划"动作区），W-23"复盘末尾必须有下一步"未落地（属 Phase 8）。

---

## 9. ERRATA-01~03 工程侧核验

> 裁决同步：本节等价核验结论已固化为正式 `ERRATA-01` / `ERRATA-02` / `ERRATA-03`（Phase 0 裁决 #1）。

### ERRATA-01 — F 数据驾驶舱作用域

- 冲突：`CODE_SPEC` 写 `data-theme=...data`（把 `data` 当全局第四主题），与 `V8_GLOBAL` §7.4 / v1.1 §4"F 是页面级视觉作用域"冲突。
- v1.1 裁决：全局主题 = `mist/fluent/night`，页面级作用域 = `review-data`。
- **工程现状**：源码 `Theme = 'light' | 'dark'`，`theme.css` 仅 `:root`（亮）+ `[data-theme='dark']`。**四套主题尚未实现**，故该冲突在代码层面为"未发生"状态；纯 SPEC 表述待收敛，实现 C-24 时应直接采用 `mist/fluent/night` + 页面级 `review-data`。

### ERRATA-02 — Token 命名统一

- 冲突：现状命名（`--page-bg / --surface-card / --text-primary / --border-color / --accent`）与目标（`--color-bg / --color-surface / --color-text-primary / --color-border / --color-accent`）不一致。
- **工程现状**：`theme.css` 采用旧命名（`--page-bg`、`--surface-card`、`--surface-hover`、`--surface-active`、`--surface-secondary`、`--surface-overlay`、`--text-*`、`--border-color`、`--border-light`、`--border-focus`、`--accent*`、`--success*`、`--warning*`、`--danger*`、`--shadow-*`、`--radius-*`、`--transition-fast/normal`）。页面已引用旧变量（如 `var(--text-secondary)`、`var(--border-color)`、`var(--surface-secondary)`）。迁移为**纯重命名 + 新增**（`--color-surface-2`、`--space-*`、`--font-*`、`--transition-slow`），DESIGN_SPEC §20 注记已裁决采用 `--color-*`。

### ERRATA-03 — 强调色双层体系

- 冲突：单一 `--accent: #6366f1`（靛蓝，偏饱和）与"晨雾书房低饱和暖调"张力。
- DESIGN_SPEC §20 注记裁决：采用"品牌 Accent + 主题 Accent"双层体系（Brand 蓝系固定；Theme Accent 按 Mist→雾蓝 / Fluent→Windows 蓝 / Night→冷青蓝 / Data→数据蓝）。
- **工程现状**：`theme.css` 仅单一 `--accent: #6366f1`（亮）/ `#818cf8`（暗），**无双层 Accent**。需新增 `--color-accent-brand` + `--color-accent-theme`（或等价）并让主题各自定义 Theme Accent。

---

## 10. 闪卡导入基线（W-15 关联）

来源：`src/stores/flashcardStore.ts` + `src/pages/study/FlashcardsPage.tsx`。

| 项 | 现状 |
|----|------|
| CSV 导入 | ✅ `importCSV`（question/answer/subject/chapter 列解析） |
| 粘贴导入 | ✅ `importPaste`（Q/A 格式或 JSON） |
| JSON 导入 | ✅ `importJSON` |
| 自动匹配/创建 学科·章节·知识点 | ❌ 未实现（`subject/chapter` 仅作字符串写入，`knowledgeId` 恒 `undefined`，无学科/章节/知识点自动创建） |
| 批量失败报告（成功 N / 失败 M / 原因 / 局部重试） | ❌ 未实现（仅返回导入数量，非法行静默跳过） |

---

## 11. 构建 / 测试 / 主题 / 性能基线快照

- **构建**：`npm run build`（tsc + vite build）为本轮 Gate；`npm run tauri:build` 产出 Windows 安装包（NSIS/WiX zh-CN）。`@` alias 已配置。
- **测试**：无（无 vitest/playwright/jest），`CODE_SPEC` C-20 要求本轮补 Vitest。
- **主题**：仅 light/dark 两套，四套主题（mist/fluent/night/review-data）未实现（C-24）。
- **性能**：路由级 `React.lazy` 已存在；Store 普遍 `toArray()` 全表加载；`getAutoSummary` 命中未建索引的 `createdAt`（§3）。
- **错误恢复**：`ErrorBoundary` + `db.isAvailable()` + `checkDataIntegrity`（utils/errorRecovery）已具备基础，未到 C-19 完整恢复流程。

---

## 12. 可回退快照确认

Phase 0 要求"建立当前可回退快照 + 记录 build 基线 + 导出数据库"。本阶段为**只读核验**，未执行 `git commit`、未运行 build、未触发数据库导出；这三项作为 `V8_PHASE0_I_TASKS.md` 的首个可执行 I-Task（I-001）登记，待用户确认后进入 Phase 1 前执行。
