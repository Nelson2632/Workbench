# 个人工作台 · Personal Workbench (macOS port)

一个**单机优先（local-first）的个人操作系统**：把「计划 → 执行 → 记录 → 复盘 → 生活」串成闭环，
数据全部落在本机加密存储里，不依赖任何云服务。

本仓库是从 Windows 端迁移到 macOS 的完整工程：React 前端 + Tauri 2 桌面壳 + 设计/契约文档 + 构建脚本。

> 想快速了解全貌，先看 [项目概览.md](项目概览.md)；想动手构建，看 [docs/MAC_BUILD.md](docs/MAC_BUILD.md)。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 · TypeScript · Vite · React Router 7 · Zustand 5 · ECharts |
| 数据 | Dexie 4（IndexedDB）· 46 张表 · 8 个 schema 版本 · 事务 + 幂等写入 |
| 桌面壳 | Rust · Tauri 2 · 三窗口（主窗 / 快捷备忘浮窗 / 番茄钟浮窗） |
| 质量 | vitest 295 用例 · 契约门禁 · 实现门禁 · Playwright e2e |

## 目录结构

```
.
├── workbench-v8/            # 全部源码（前端 src/ + Tauri 壳层 src-tauri/）
├── docs/                    # 设计合订本、可机器校验的契约、macOS 构建手册
│   ├── USER_MOTIVATION_LOOPS_PLAN.md  # 用户积极性四闭环目标与实现路线
│   └── experiments/
│       └── motion-lab.html  # 四主题交互动画实验室（独立原型）
├── scripts/                 # 契约门禁 / 实现门禁脚本
├── build-mac.sh             # macOS 一键构建（.app + .dmg）
├── 项目概览.md               # 一页纸项目速览（架构 / 功能 / 边界）
└── 先读我-Mac移植说明.md      # 迁移包说明与上手步骤
```

## 用户积极性优化计划

- [四闭环优化计划](docs/USER_MOTIVATION_LOOPS_PLAN.md)：Start / Complete / Recover / Memory 的产品目标、工程约束、路线图和测试矩阵。
- [四主题动画实验室](docs/experiments/motion-lab.html)：可直接在浏览器打开的独立交互原型，仅用于体验和视觉验证，不连接真实数据层。

## 依赖管理

统一使用 npm 与 package-lock.json。干净安装使用 npm ci；请勿生成第二份 JavaScript lockfile。

## 构建（macOS）

```bash
cd workbench-v8
npm ci
npx tauri build --bundles app,dmg
# 产物：src-tauri/target/release/bundle/macos/个人工作台.app
#       src-tauri/target/release/bundle/dmg/个人工作台_0.8.1_aarch64.dmg
```

或在仓库根目录直接执行 `./build-mac.sh`。要求 Node ≥ 20、Rust 工具链、Xcode 命令行工具。

## 设计约束

1. **事实表 + 投影**：Timeline / Daily Memory 只是事件的投影，可从事实表幂等重建。
2. **跨域联动只走 EventBus**：业务页面不直接调用其他域的 Store。
3. **安全边界不可协商**：主密码 / KEK / DEK 仅存内存；普通备份永不包含密码本与私密文件元数据。

细节与机器可校验的契约见 [docs/contracts/](docs/contracts/)。

## 说明

- 本仓库**不包含**个人应用数据（日记、好友、时间线备份等），相关目录已在 `.gitignore` 中排除。
- 构建产物（`node_modules/`、`src-tauri/target/`、`dist/`）与本地工具链同样不入库。
- 未附开源许可证，默认保留所有权利。

## 个人双平台安装

Workbench 仅供个人本地使用。Mac / Windows 安装包获取、WebView2、备份迁移及验证范围见 [个人桌面使用说明](docs/PERSONAL_DESKTOP_USE.md)。不要求代码签名、公证或公开 Release。
