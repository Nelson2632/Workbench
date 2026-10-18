# ERRATA-02 · Token 命名统一

> 编号：ERRATA-02
> 状态：✅ 已批准（Phase 0 裁决冻结）
> 批准版本：`V8_MASTER_PLAN_v1.2.md`
> 类型：实现命名对齐（IMPLEMENTATION DETAIL）

---

## 冲突来源

- 现状 `src/styles/theme.css`：`--page-bg` / `--surface-card` / `--text-primary` / `--border-color` / `--accent` 等。
- 目标（`CODE.md` C-24 / `DESIGN_SPEC` §10）：`--color-bg` / `--color-surface` / `--color-text-primary` / `--color-border` / `--color-accent` 等。

## 冲突描述

两套命名不一致，若长期并存会造成维护混乱。

## 源码现状（Phase 0 核验）

`theme.css` 现用旧命名，页面已引用旧变量（如 `var(--text-secondary)`、`var(--border-color)`、`var(--surface-secondary)`、`var(--radius-sm)`）。

## 冻结裁决（DESIGN_SPEC §20 注 3 已裁决）

统一采用 `--color-*` 命名：

```text
--color-bg / --color-surface / --color-surface-2
--color-text-primary / --color-text-secondary / --color-text-tertiary / --color-text-inverse
--color-border / --color-border-light / --color-border-focus
--color-accent / --color-accent-hover / --color-accent-light / --color-accent-text
--color-success / --color-warning / --color-danger（+ 各自 -light）
--shadow-sm / --shadow-md / --shadow-lg
--radius-sm / --radius-md / --radius-lg / --radius-full
--space-1 … --space-8
--font-* / --transition-fast / --transition-normal / --transition-slow
```

## 影响范围

- `theme.css` + 全部 `*.module.css` 一次性重命名，不留新旧并存。
- 纯实现层，不改产品语义。
