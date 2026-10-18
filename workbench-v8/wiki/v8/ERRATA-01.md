# ERRATA-01 · F 数据驾驶舱作用域

> 编号：ERRATA-01
> 状态：✅ 已批准（Phase 0 裁决冻结）
> 批准版本：`V8_MASTER_PLAN_v1.2.md`
> 类型：跨 SPEC 表述冲突

---

## 冲突来源

- `CODE_SPEC` §3.2 / §7 / §2.3：将 `data` 写成全局 `data-theme` 第四值（`mist / fluent / night / data`）。
- `V8_GLOBAL` §7.4 / `V8_MASTER_PLAN_v1.1` §4：F 数据驾驶舱是「页面级视觉作用域，不是用户可切换的第四个全局主题」。

## 冲突描述

`CODE_SPEC` 的 `data-theme=...data` 与 `V8_GLOBAL` 的「F 仅周 / 月 / 考试复盘页面级」冲突。

## 源码现状（Phase 0 核验）

- `src/types/index.ts`：`Theme = 'light' | 'dark'`。
- `src/styles/theme.css`：仅 `:root`（亮）+ `[data-theme='dark']`。
- 四套主题尚未实现，冲突**尚未在代码层发生**，属纯 SPEC 表述待收敛。

## 冻结裁决

- 全局主题 = `mist` / `fluent` / `night`（3 值）。
- 页面级视觉作用域 = `review-data`（仅周 / 月 / 考试复盘）。
- 旧 `dark` 值兼容映射为 `night`。

## 影响范围

| 文档 | 修正点 |
|------|--------|
| DESIGN_SPEC §9 / §10 | 主题值域与 `data-theme` 表述（去掉全局 `data`） |
| CODE_SPEC §3.2 / §7 | `systemStore.theme` 由「四值」改为「三全局 + 页面级 `review-data`」 |

> 不改变产品语义与信息架构。F 依旧只服务周 / 月 / 考试复盘。
