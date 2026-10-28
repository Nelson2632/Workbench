# v1.1 工具链安全补丁与单一 npm 管理

日期：2026-10-28。依赖 P0 PR #2，基线代码提交 `1d83994a5e6633b44b572ffab5f696290bfabca8`。

## 发现与适用范围

P0 的 GitHub Actions browser job 成功，但 npm ci 日志报告 2 high + 2 moderate。本地随后执行 npm audit --json 复核，四个依赖节点为 vite、source-map-js、vitest、@vitest/mocker。不能用 CI 通过替代安全检查。

这些主要涉及开发服务器、测试工具与 source-map 处理。已确认版本落入公告范围，没有据此宣称本项目发生过入侵或正式安装包存在已验证利用链。

| 依赖 | 基线 lockfile | 此补丁 | 原因 |
|---|---|---|---|
| vite | 8.2.1（本地已装 8.2.2） | 精确 8.2.4 | 当前 8.2 分支安全修复 |
| vitest / @vitest/mocker | 4.1.11 | 精确 4.1.12（mocker 随依赖） | mock 注册注入及 Windows 路径绕过修复 |
| source-map-js | 1.2.1 | override 1.2.2 | 不可信 indexed source-map 偏移导致事件循环 DoS |

来源（2026-10-28 核对）：
- [Vitest mock 注册注入 GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8)
- [Vitest Windows 路径绕过 GHSA-xp26-3454-mjgp](https://github.com/advisories/GHSA-xp26-3454-mjgp)
- [source-map-js GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
- [Vite/launch-editor Windows 参数检查绕过 GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm)
- 其余 Vite 公告由 npm audit 提供：GHSA-698v-4r3x-3vcv、GHSA-r825-w8mm-5pxw、GHSA-9jrq-w75r-8gcw、GHSA-rq7h-c2jc-7f22、GHSA-vfpm-58rq-9qcg。

没有使用 npm audit fix 或跨主版本更新；通过明确安装目标补丁版本更新 lockfile，保留依赖完整性哈希，提交相关传递依赖变化。

## 管理器与质量门

- 统一 npm + package-lock.json，删除 pnpm-lock.yaml；Rust Cargo.lock 保留。
- README、macOS 构建脚本/手册与 E2E 文档统一 npm ci。
- 原 Playwright 桌面启动改为 npm run tauri:dev；browser suite 继续使用独立 Vite 配置。
- 在 UTC CI job 新增 npm audit --audit-level=moderate，阻止未来 moderate/high/critical 告警静默通过；不以此代表完整代码安全审计。
- 包管理器切换不涉及个人数据、Dexie schema 或运行时业务逻辑。

## 本地验证

| 检查 | 结果 |
|---|---|
| npm ci --ignore-scripts --no-audit --no-fund | 74 packages，退出 0 |
| npm run test:run | 48 文件、308/308 通过，Vitest 4.1.12 |
| npm run build | 通过，Vite 8.2.4；保留既有大 chunk 警告 |
| npm audit --json | info/low/moderate/high/critical 全部 0；total=0 |
| contract gate / implementation gate | 70/70、18/18，通过 |
| git diff --check | 通过 |
| macOS 原生构建/启动/VoiceOver | 本地未验证，无 cargo/macOS 环境 |
| 本地 Chromium | 下载损坏，不能启动；需由本分支 GitHub Actions 重跑 5 个场景 |

P0 的同一代码提交已由 [Actions run 40722066304](https://github.com/Nelson2632/Workbench/actions/runs/40722066304) 完成三时区单元、构建、两门禁及 5/5 browser 场景；工具链升级后的远端结果以本安全 PR 的 checks 为准。

## 风险与回滚

补丁版本和传递依赖改变仍可能影响编译产物或测试环境；先看 CI，再做桌面 smoke。source-map-js override 必须随着上游依赖升级重新审查，不永久掩盖版本不兼容。

回滚可单独 revert 本补丁，业务数据不变；但会重新暴露已确认依赖告警，因此不能作为忽略安全问题后的正式发布方案。P1 Recover、Memory 来源、可选收口/通知、Toast、CSP 和 macOS 发布验证仍在后续队列，未标记 Release Ready。
