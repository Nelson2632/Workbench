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

## 数据与性能改动

- schema 8→9 只给 tasks.completedAt、studySessions.endedAt、mistakes.masteredAt 增加索引。没有替换任务主键，没有补写虚构历史时间，不触碰历史可能膨胀的 systemCommandIds 索引。
- Daily Memory 使用本地日历起止时刻的索引区间；支持夏令时 23/25 小时日。动画 episodeLog 仍按现有嵌套模型读取，不为性能重写数据架构。
- Timeline rebuild 复用预取事实与游戏 Map，消除每一行重新 get 的 N+1 读取；清空与重建在同一事务，失败不会留下空或半张投影表。
- 备份导出为一致读事务，读失败直接失败。普通备份/快照剔除 vaultMasterHash/Salt；恢复时保留本机认证设置并排除所有安全边界表。必须有 checksum；无效表拒绝恢复。
- Journal 重放标记已有 journal，避免不断重写自身；时间边界含等号，不遗漏同毫秒事件。测试等待 Journal/Projection 完成，不再使用固定 25ms 延时。
- 今日计划快速新增与收口支持稳定 ID 重试；主事实提交后不明错误重试不会生成重复任务。

升级前：使用旧版导出普通数据与单独的密码本加密备份。索引升级事务失败会回滚，旧事实保持；不要在两个不同版本间同时打开同一数据库。降级需在旧版重新导入升级前备份，不保证旧版直接打开高版本 IndexedDB。

## 平台限制与实现调整

Tauri Notification Actions 的官方支持仅限移动端（https://v2.tauri.app/plugin/notification/#actions）。已移除不可靠的 desktop onAction 监听，桌面保留系统文案提醒，应用内 opt-in 横幅提供真实 Shutdown CTA、当日关闭和收口后自动隐藏。绝不把系统通知点击描述为已验证。

默认关闭的声音按原审计继续延期；不引入音频权限或外部分析 SDK。P2 仓库整洁度采用生成物政策，不大规模挪动历史资料或删除二进制。

## 当前自动化基线

本地已执行：54 个测试文件、325 个用例通过；构建通过，最大 JS chunk 约 473 kB，不再有 >500 kB 警告；contract 70/70、implementation 18/18；npm audit 0。

覆盖率限定为本次关键命令/恢复/选择器/Memory 代码，**不是全仓库覆盖率**：语句 85.95%、分支 79.91%、函数 76.80%、行 90.33%。CI 阈值分别 80/75/70/85%，维持已验证底线；不为表面覆盖率编写与实现镜像的测试。

P2 本地指标已实现为默认关闭的可选四类计数（开始选择、捕获保存、完成反馈、计划调整），30 天保留期，可清除，不含内容或标识。它们不声称等同于投入时长、任务成功率或因果改善。

浏览器包含开发态失败注入与实际 production dist+CSP 的三主题核心路径。native 与浏览器远端结果将按最终提交核对后补充。
