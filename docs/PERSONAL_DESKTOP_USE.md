# 我自己的 Workbench：Mac / Windows 安装与验证

目标是本地个人使用。无需 Apple/Microsoft 代码签名、Apple 公证、GitHub Release 或自动更新；保留安装包、数据保护与质量检查。历史文档中公开发行的签名要求不再是本项目完成条件。

## 获取安装包

打开仓库 Actions → **Personal desktop checks** → 选择 `codex/v1.1-windows-personal` 最新成功运行（代码依赖 PR #6），在 Artifacts 下载：

- `macos-unsigned-candidate`：`.dmg`、`.app` 及检查日志。当前 macos-15 runner 产物为 Apple Silicon arm64；不能当作 Intel Mac 包。
- `windows-personal-installer`：NSIS `*-setup.exe`、SHA-256 与安装/重装后的检查 JSON。当前 Windows runner 产物为 x64。

工件保留 7 天。过期后重新执行该工作流；无需创建 Release。优先用 DMG/EXE，不依赖压缩包内 `.app` 的可执行权限。不要安装来自陌生分支或他人重打包的文件。

## 首次安装

Mac：打开 DMG，把「个人工作台」拖到 Applications 后启动。如果未签名提示阻止打开，先核对下载源和构建提交，再在系统设置「隐私与安全性」针对这个应用允许打开。不要全局关闭 Gatekeeper；不要把“文件已损坏”或恶意软件告警一概当作签名提示绕过。

Windows：运行 NSIS EXE，默认只安装给当前用户，无需管理员安装。SmartScreen 可能显示未知发布者：只在确认来自自己仓库的成功构建、校验 SHA-256 一致后，对该文件选择允许；不要关闭 Defender 或系统级防护。PowerShell 可用 `Get-FileHash '<安装包路径>' -Algorithm SHA256` 对照工件里的哈希。

Windows 需要 Microsoft Edge WebView2 Evergreen Runtime。系统已装时复用；未装时安装器下载微软 bootstrapper（需要网络），不绕过依赖检测。离线机器须先从微软官方安装对应 WebView2 Runtime，再装 Workbench。CI 已装 Runtime 的启动验证不能证明“完全干净离线机器”首次安装。

## 关闭、快捷键和原生功能

- 关闭主窗口会隐藏到托盘，不会结束进程。真正退出用托盘「退出」或应用退出按钮。
- Windows：`Ctrl+Shift+Space` 打开快捷备忘，`Ctrl+Alt+B` 显示/隐藏主窗。macOS：`Cmd+Shift+Space`、`Cmd+Option+B`。
- 最小化主窗后显隐快捷键应恢复主窗；快捷键冲突时界面显示提示，托盘入口仍可用。解除冲突后重启重试。
- 托盘菜单可打开快捷备忘、番茄钟浮窗。浮窗关闭是隐藏；不应退出主应用。
- 系统通知受系统权限、免打扰及 Windows 通知设置影响。夜间提醒默认关闭；应用内收尾入口不依赖系统通知点击。

## 数据与换设备

两台设备分别使用自己的数据库，**不要复制或同步正在使用的 WebView/IndexedDB 目录**。系统数据目录通过 Tauri API 获取，不硬编码用户名或盘符。

普通备份是 UTF-8 JSON，版本、checksum、ISO 时间戳和 date-only 字段跨平台一致。同版本导入支持 Mac↔Windows；首次使用先在目标设备导出自己的备份，再导入。恢复是替换普通数据，不是合并或实时同步。不同本地时区会使时间戳归入不同本地日期，这是显示语义，不应改写原时间戳。

普通备份不包含密码本密文及认证设置，也不覆盖目标机安全认证态。密码本须用独立加密导出/导入并保留原主密码；私人附件与安全表不属于普通备份，另行妥善备份。普通 JSON 不是加密文件，不要公开上传。checksum 用于发现损坏/改写，不证明来源可信。

升级前分别备份普通数据和密码本。当前 schema 8→9 只增加时间索引；不要用旧程序直接打开已升级数据库。需要回退时用旧版导入升级前的备份。不通过删除个人数据库来“解决升级”。

## 自动验证能证明什么

每次 CI 同时执行：两平台单元测试、前端构建、Rust 测试；Mac app/dmg；Windows NSIS 安装到含中文与空格的目录、启动、重装及再启动。三时区及浏览器关键业务路径由 quality workflow 执行。

原生 smoke 必须收到三个真实 WebView 的 React 内容、IPC 回报，检查主数据库已初始化；用独立临时数据库验证共享备份样本、Unicode、时间索引、普通恢复保留本机密码本设置。Rust 检查托盘对象、窗口尺寸、显示/隐藏/聚焦 API、中文应用数据路径，并正常退出。重装后检查专用 IndexedDB 和原生文件标记仍存在。测试不清空个人业务库。

`CI=true` 和 `WORKBENCH_NATIVE_SMOKE=<报告路径>` 同时存在才启用诊断模式，仅用于一次性 CI 环境；普通启动不运行测试或自动退出。不要在自己的日常启动命令中设置它们。

| 能力 | 自动验证范围 | 仍需两台真实设备确认 |
|---|---|---|
| 安装/启动 | NSIS 安装重装、Mac 打包、三 WebView 渲染/IPC、正常退出 | 个人设备权限/安全提示；Intel Mac、不同 Windows 版本 |
| Today/Inbox/Recover/Memory/Shutdown | 通用浏览器交互、三时区单元；原生数据库和渲染 smoke | 原生 WebKit/WebView2 上完整手动业务流程 |
| 数据迁移/备份 | 旧 schema 单元升级、共用备份样本两引擎往返、安全边界、重装持久标记 | 真实历史数据副本互导、实际旧安装包升级 |
| 多窗口/托盘 | 对象创建、窗口尺寸、显示/隐藏/聚焦 API 成功 | 真实菜单点击、拖动、置顶、关闭到托盘 |
| 全局快捷键 | 注册失败安全降级与界面提示；平台按键定义 | 真实按键、系统/第三方冲突和输入法 |
| 中文输入 | isComposing/229 保护、浏览器候选确认回归、Unicode 数据 | 微软拼音和 macOS 拼音真实候选操作 |
| 系统通知 | 插件初始化、既有调度测试 | 通知中心展示、权限、免打扰；不承诺点击导航 |
| DPI/多显示器 | 响应式浏览器路径、窗口有效尺寸 | 100/125/150/200% 缩放、跨显示器移动 |

逐次实际通过/失败及安装工件链接记录在 PR #7；“已写入工作流”不等于已通过。启动检查不替代完整原生交互验收。

## 自己验收一次（先用数据备份副本）

1. 新增中文任务、快速捕获、双击完成、回看 Timeline/Memory；完成空反思收尾。
2. 批量延期、暂存/放弃、撤销；确认没有物理删除任务。
3. Mac 导出 → Windows 导入，再反向导入测试副本；核对任务、日期、中文和密码本独立边界。
4. 测试快捷键、浮窗、托盘、最小化恢复、关闭与真正退出；开启一项通知验证展示。
5. 用实际显示器及常用缩放操作；用中文输入法确认候选，不应提前保存。

参考：[Tauri Windows 安装器](https://v2.tauri.app/distribute/windows-installer/)、[微软 WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。

本次另移除了仓库内写死的 Visual Studio Community/MSVC 路径；CI 使用 vswhere 查找已安装的 x64 linker。自己构建时请安装 Visual Studio C++ Build Tools，并使用 PowerShell/Developer PowerShell，不需要照搬他人的工具链绝对路径。
