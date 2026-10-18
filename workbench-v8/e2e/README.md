# V9 Playwright E2E

覆盖 V9_MASTER_PLAN 的四条核心闭环主链路 + 全局搜索 + 主题切换 + 降级触发。

## 前置安装（本会话未完成，原因见下）

```bash
cd workbench-v8
pnpm add -D @playwright/test
npx playwright install chromium
```

## 运行

```bash
pnpm exec playwright test            # 自动拉起 tauri dev（桌面窗口）
pnpm exec playwright test --headed   # 可见模式
```

## 本会话受阻说明

安装 `@playwright/test` 与 `@types/node` 时被 pnpm 存储冲突阻断：

> "If you want to use the new store location, reinstall your dependencies with pnpm install."

当前 node_modules 由另一 pnpm 版本/存储位置安装。**建议在干净环境执行**：

```bash
pnpm config set store-dir <统一路径> --global
# 或删除 node_modules 与 pnpm-lock.yaml 后重新 pnpm install
```

spec 与配置已就绪；环境恢复后上述两条命令即可运行 E2E。
