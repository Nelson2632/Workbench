# 仓库文件与生成物政策

- `workbench-v8/src`、构建配置、锁文件和手写设计文档是源文件；历史 V8/V9 资料保留路径，避免破坏链接。
- `dist`、`coverage`、Playwright 结果、原生 target/bundle 只作为 CI 工件，不提交。构建前清理 dist，避免旧 hash 资源混入安装包。
- 已入库的大型 wiki/code dump 保留为历史参考，后续更新使用生成脚本与明确基线；不把每次生成的完整代码镜像追加进主目录。
- 新的大型二进制资源需说明用途与来源，优先使用 Release/CI 工件；确需版本控制时单独评估 LFS。不得未经备份批量删除历史文件。
- CI 工件保留 7 天，均标记 unsigned candidate；正式发布与签名、公证仍由维护者确认。
