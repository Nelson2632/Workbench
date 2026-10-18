# macOS 构建与迁移手册 · 个人工作台 V9

> 适用范围：workbench-v8（V9 Personal OS，v0.8.1）→ macOS（个人使用、ad-hoc 签名、不做公证）。
> 目标产物：`个人工作台.app` + `.dmg`，自用本机运行。

---

## 1. 环境准备（Mac 上一次性）

| 项 | 要求 | 检查/安装命令 |
|---|---|---|
| 系统 | macOS 10.15 及以上（Apple Silicon / Intel 均可） | — |
| Xcode 命令行工具 | 必需（提供 clang/linker） | `xcode-select --install` |
| Rust | rustup stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | ≥ 20 | `node -v` |

- Apple Silicon 上默认 target `aarch64-apple-darwin` 已随 rustup 安装，无需额外操作。
- 需要 **universal 二进制**（同时覆盖 Intel 老机器）时：`rustup target add x86_64-apple-darwin aarch64-apple-darwin`，构建命令加 `--target universal-apple-darwin`。
- 仓库 `.cargo/config.toml` 里的 rsproxy 镜像对国内网络生效，**无需改动**；MSVC linker 配置是 Windows 目标门控的，Mac 上自动忽略。

## 2. 构建

```bash
cd workbench-v8
npm install

# 打包 .app + .dmg（--bundles 覆盖仓库默认的 nsis targets，Windows 配置不受影响）
npx tauri build --bundles app,dmg

# 仅产 .app（免 DMG 壳）
npx tauri build --bundles app
```

产物位置：

```
src-tauri/target/release/bundle/macos/个人工作台.app
src-tauri/target/release/bundle/macos/个人工作台_0.8.1_x64.dmg   # 或 aarch64
```

Tauri 会自动做 ad-hoc 签名（identity `-`），个人本机运行足够。

## 3. 首次运行

1. **本机构建**的 .app：双击直接运行，无需任何处理。
2. **跨机器传输**（AirDrop / 网盘 / U 盘）后：macOS 会给文件打 quarantine 标记，首次需**右键 → 打开**一次（或 `xattr -cr "个人工作台.app"` 后双击）。
3. 权限授权：
   - **辅助功能**（全局快捷键必需）：系统设置 → 隐私与安全性 → 辅助功能 → 勾选「个人工作台」。未授权时快捷键静默失效（应用已内置降级，不会崩溃），托盘菜单仍可用。
   - **通知**：首次发送通知时系统弹窗，允许即可。
4. 快捷键（macOS 版）：
   - `Cmd+Shift+Space` — 快捷备忘浮窗
   - `Cmd+Option+B` — 显示/隐藏主窗口
   - 与第三方输入法等冲突时，改走托盘菜单（快捷备忘/番茄钟/显示主窗口/退出）。

## 4. 关闭与恢复窗口的行为

- 点红色关闭键 = 隐藏到托盘（与 Windows 版一致），应用常驻。
- **点击 Dock 图标**会重新显示主窗口（已适配 `RunEvent::Reopen`）。
- 托盘菜单「退出」或应用内退出才真正结束进程。

## 5. 数据目录

| 用途 | 路径 |
|---|---|
| 备份快照 | `~/Library/Application Support/com.marty.workbench/PrivateWorkbench/backup/` |
| 私密文件密文 | `~/Library/Application Support/com.marty.workbench/PrivateWorkbench/files/` |

## 6. Windows → Mac 数据迁移

| 数据 | 操作 | 状态 |
|---|---|---|
| **业务数据**（任务/日记/时间线/复盘/游戏/阅读等） | ① Windows 上应用内创建备份；② 拷贝 `%APPDATA%\com.marty.workbench\PrivateWorkbench\backup\` 下最新 `*.json`；③ Mac 上放到第 5 节 backup 目录；④ Mac 应用内「恢复」选择该快照（快照带 SHA-256 校验，自动先做 safety snapshot） | ✅ 现成 |
| **密码本 Vault** | Windows 上 Vault 页「导出密码本」→ JSON 文件 → Mac 上 Vault 页「导入密码本」（密文随自身口令，跨平台可解） | ✅ 已提供 UI |
| **私密文件** | **无官方导出路径**（安全契约 Patch C-003-02 刻意把 privateFileMeta 排除在所有导出之外）。手工迁移：Windows 上逐个打开私密文件 → 解密导出到本地文件夹 → Mac 上逐个重新导入加密。已知限制；如需一键迁移可提「加密迁移包」增强 | ⚠️ 手工 |
| **App Lock** | 不迁移（认证态不随备份，数据恢复 ≠ 身份恢复）。Mac 上重新设置主密码/4 位锁 | ✅ 按设计 |

> 说明：IndexedDB 数据在 WebView2（Windows）与 WKWebView（macOS）之间**不可直接拷贝库文件**，跨平台迁移一律走上述 JSON 路径。

## 7. 排障

| 现象 | 处理 |
|---|---|
| dmg 打包或 codesign 报错（中文 productName 相关） | 后备方案：`tauri.conf.json` 加根级 `"mainBinaryName": "workbench"`（ASCII 二进制名）。注意该键会同时改 Windows 产物名，改动前确认 |
| 全局快捷键无效 | 检查「辅助功能」授权；用托盘菜单验证其余功能正常（应用降级设计） |
| 通知收不到 | 系统设置 → 通知 → 个人工作台 → 允许 |
| 首次双击提示「无法打开」 | 右键 → 打开（quarantine）；或 `xattr -cr` 后重试 |
| 视觉细节与 Windows 版有差异 | WKWebView 与 WebView2 渲染差异属预期，按四主题逐页截图对比（Q1.7 视觉基线，1px 容差） |

## 8. 验证清单（Mac 实机验收）

- [ ] `npx tauri build --bundles app,dmg` 成功，产物双击可启动
- [ ] 主窗口 / 快捷备忘浮窗 / 番茄钟浮窗三窗口正常
- [ ] `Cmd+Shift+Space`、`Cmd+Option+B` 生效（授权后）；未授权时优雅降级
- [ ] 托盘图标为单色模板样式，菜单显示 ⌘ 文案；关闭窗口后点 Dock 图标可恢复
- [ ] 通知送达；备份落盘 backup 目录；私密文件加密读写往返正确
- [ ] 业务数据从 Windows 备份 JSON 恢复后字段级一致（Q1.10）
