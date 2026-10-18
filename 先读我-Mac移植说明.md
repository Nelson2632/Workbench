# 个人工作台 V9 → macOS 移植包 · 先读我

> 生成时间：2026-10-09 ｜ 来源：D:\1 -  Marty\diary（workbench-v8 / V9 Personal OS v0.8.1）
> 目标：在 Mac 上构建 个人工作台.app + .dmg（个人使用、ad-hoc 签名）

---

## 1. 这个盘里有什么

    workbench-mac-port\
    ├── 先读我-Mac移植说明.md        ← 本文件
    ├── workbench-v8\                ← 完整源码 + 构建配置 + .git 历史（含 macOS 移植改动）
    ├── docs\                        ← MAC_BUILD.md（构建+迁移手册）、设计合订本、契约
    ├── scripts\                     ← 质量门禁脚本（可选）
    └── 数据迁移_应用数据\            ← Windows 端应用数据（含私密内容，见第 4 节）

已包含的关键文件（缺一不可）：

| 文件 | 作用 |
|---|---|
| workbench-v8/package.json、package-lock.json、pnpm-lock.yaml | Node 依赖清单（Mac 上重新安装） |
| workbench-v8/src-tauri/Cargo.toml、Cargo.lock、build.rs | Rust 壳层依赖（全部跨平台） |
| workbench-v8/src-tauri/tauri.conf.json | 打包配置，已含 bundle.macOS 段 |
| workbench-v8/src-tauri/src/lib.rs | 壳层，已含 macOS 条件编译（Cmd 快捷键 / 托盘模板图标 / Dock 点击恢复窗口） |
| workbench-v8/src-tauri/icons/icon.icns | macOS 图标（已就绪，无需重做） |
| workbench-v8/src-tauri/capabilities/default.json | Tauri 2 IPC 权限 |
| workbench-v8/src/ | 前端源码（含 macOS 快捷键文案适配） |
| docs/MAC_BUILD.md | 构建 / 验收 / 数据迁移完整手册 |

## 2. 已刻意排除的内容（不是遗漏）

| 排除项 | 原因 |
|---|---|
| workbench-v8/node_modules/ | 平台相关（Windows 二进制），Mac 上执行 npm install 重新装 |
| workbench-v8/src-tauri/target/ | Windows 构建缓存（12.7 GB），Mac 上由 cargo 生成 |
| workbench-v8/dist/、dist-verify/、test-results/ | 构建/测试产物，可重新生成 |
| *.log | 构建日志，无价值 |
| 个人工作台.exe | Windows 可执行文件，Mac 不可用 |
| 仓库其他目录（legacy/、migration_sidecar/、_migration_backup/） | 与 Mac 构建无关（旧版归档 / 旧数据） |

## 3. Mac 上的操作步骤（详见 docs/MAC_BUILD.md）

    # 1) 把 workbench-mac-port/workbench-v8 拷到 Mac（如 ~/workbench-v8）

    # 2) 装环境（一次性）
    xcode-select --install                 # Xcode 命令行工具
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust
    node -v                                # 需要 >= 20

    # 3) 构建
    cd ~/workbench-v8
    npm install
    npx tauri build --bundles app,dmg
    # 产物：src-tauri/target/release/bundle/macos/个人工作台.app + .dmg

首次运行要点：

- 本机构建的 .app 双击即可运行；经 U 盘/AirDrop 传输的首次需右键 → 打开（Gatekeeper）。
- 全局快捷键：Cmd+Shift+Space（快捷备忘）、Cmd+Option+B（显隐主窗）。首次须在
  系统设置 → 隐私与安全性 → 辅助功能 勾选本应用；未授权时应用优雅降级、不会崩溃。

## 4. 数据迁移（Windows → Mac）

盘上 数据迁移_应用数据\PrivateWorkbench\ 就是 Windows 端应用数据（16 个快照 JSON，27.85 MB）。
在 Mac 上的对接方式：

    # Mac 应用数据目录（先随便跑一次 App，让目录生成）
    mkdir -p ~/Library/Application\ Support/com.marty.workbench
    # 把盘上 PrivateWorkbench 整个拷进去
    cp -R /Volumes/<U盘名>/workbench-mac-port/数据迁移_应用数据/PrivateWorkbench \
          ~/Library/Application\ Support/com.marty.workbench/
    # 然后打开 App → 备份/恢复 页面 → 选择最新快照 → 恢复

| 数据 | 状态 |
|---|---|
| 业务数据（任务/日记/时间线/复盘等） | 已在盘上（备份快照，应用内「恢复」即可） |
| 密码本 Vault | 未包含（存于浏览器库，需在 Windows 端 Vault 页点「导出」生成 JSON 再带过来） |
| 私密文件 | 未包含（当前 Windows 端无此数据；如有需逐个解密导出） |
| App Lock | 不迁移（认证态不随备份），Mac 上重新设置 |

> 提醒：快照 JSON 是明文业务数据，本 U 盘现在含私密内容，请妥善保管、勿借他人。
> IndexedDB 数据在 Windows(WebView2) 与 Mac(WKWebView) 之间不能直接拷库文件，务必走上面的 JSON 路径。

## 5. 校验

本包与源逐字节一致（复制后已用 robocopy 复核，copied=0 / FAILED=0；应用数据另做逐文件 SHA-256 比对，0 不一致）：

- [x] workbench-v8 源码树 553 文件 23.03 MB（含 .git 9.2 MB）
- [x] tauri.conf.json 含 bundle.macOS（10.15 下限 + DMG 布局）
- [x] lib.rs 含 #[cfg(target_os = "macos")] 快捷键与托盘分支、RunEvent::Reopen 处理
- [x] src/desktop/index.ts 含 isMacOS / modKeyLabel / formatShortcutDisplay
- [x] src/db/database.ts 含 importVaultData、VaultPage 含导出/导入入口
- [x] docs/MAC_BUILD.md 在盘内
- [x] 应用数据 16 文件 27.85 MB，SHA-256 全部一致
- [x] 源仓库验证结论（复制前已通过）：tsc PASS、vitest 295/295 PASS、cargo check 零警告 PASS、
      contract-gate PASS、implementation-gate 18/18 PASS、Windows 打包冒烟 PASS

磁盘格式为 FAT32：单文件不能超过 4 GB（本包无此问题）；Mac 会写入 .Spotlight-V100 索引目录属正常现象。
拔盘前请先在任务栏「安全删除硬件」弹出，确保写入落盘。