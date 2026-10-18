# ERRATA-03 · 强调色双层体系

> 编号：ERRATA-03
> 状态：✅ 已批准（Phase 0 裁决冻结）
> 批准版本：`V8_MASTER_PLAN_v1.2.md`
> 类型：设计系统决策

---

## 冲突来源

- 现状：单一 `--accent: #6366f1`（靛蓝，偏饱和）。
- `V8_GLOBAL` §7.1「晨雾书房」要求低饱和强调色。

## 冲突描述

单一高饱和靛蓝强调色与「晨雾书房低饱和暖调」存在张力。

## 源码现状（Phase 0 核验）

`theme.css` 仅单一 `--accent: #6366f1`（亮）/ `#818cf8`（暗），无双层 Accent。

## 冻结裁决（DESIGN_SPEC §20 注 2 已裁决）

采用「品牌 Accent + 主题 Accent」双层体系：

```text
Brand Accent
└── 固定蓝系

Theme Accent
├── Mist   → 雾蓝
├── Fluent → Windows 蓝
├── Night  → 冷青蓝
└── Data   → 数据蓝
```

## 影响范围

| 文档 | 修正点 |
|------|--------|
| CODE_SPEC C-24 / DESIGN_SPEC §10 | 新增 `--color-accent-brand` + `--color-accent-theme` |

> 具体色值由 DESIGN 在 Design Phase 冻结，不在本 Erratum 中擅自指定。
