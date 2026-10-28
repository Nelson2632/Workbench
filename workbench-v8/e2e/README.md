# Browser 与桌面回归

统一使用 npm，在 `workbench-v8` 执行：

```bash
npm ci
npx playwright install chromium
npm run test:e2e:web
```

`test:e2e:web` 启动 Vite，覆盖 v1.1 的 Now/Next、双击、保存失败、投影恢复与 Reduced Motion。故障注入仅由测试通过 Vite 的源码模块装配，没有生产 debug API。

完整桌面回归另执行：

```bash
npx playwright test --config playwright.config.ts
```

桌面配置使用 `npm run tauri:dev`，需要 Rust、平台 Tauri 系统依赖及可用图形环境。浏览器测试成功不等同于 macOS WebView、原生通知、浮窗、文件备份、安装包或 VoiceOver 已验收。

如果工作区残留另一包管理器生成的 node_modules，请在独立干净 checkout 执行 npm ci；不修改全局包管理器配置。不要重新生成 pnpm-lock.yaml。
