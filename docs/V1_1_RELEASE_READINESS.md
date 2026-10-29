# Workbench v1.1 发布候选验收

本分支实现审计中的 v1.1 工作包。软件元数据统一为 **1.1.0-rc.1**，并非正式发布；历史 V8/V9 文档与数据库名称保留以兼容已有资料和本地数据。v10.1 命名未擅自套用为正式发布号。

## 桌面检查

- Tauri CSP 允许本地脚本、样式、图片和 IPC；禁止远程脚本、对象与 frame。style-src 的 unsafe-inline 保留 React/ECharts 的行内样式需求，script-src 不允许 unsafe-inline/unsafe-eval。
- 开发 CSP 仅额外允许 Vite localhost WebSocket。
- npm/Cargo/Tauri 元数据统一。bundle targets 由平台决定，macOS CI 显式构建 .app/.dmg，Windows 编译与原生测试。
- macOS CI 启动真实 .app，检查进程存活并留存屏幕截图。此项不是 WebView 全交互/读屏测试，也不是签名公证。
- CI 仅保留 7 天未签名候选工件，不创建 Release，不自动部署或合并。
- Finance 改为与其他页面相同的 ECharts 按需导入；清理 dist 后构建，避免残留旧版本资源进入安装包。

官方配置依据：https://v2.tauri.app/security/csp/ 、https://v2.tauri.app/distribute/macos-application-bundle/ 。

此记录随最终检查更新；现阶段 native CI 尚待实际执行，不能把 workflow 文件存在视为检查通过。
