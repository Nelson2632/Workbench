# 开发与审核

在独立分支开发，通过 PR 审核；不要直接写 main。使用 Node 24 与 npm，`workbench-v8` 下执行 `npm ci`。

常规验证：`npm run test:run -- --coverage`、`npm run build`；根目录执行 `node scripts/contract-gate.mjs`、`node scripts/implementation-gate.mjs`、`node scripts/release-consistency.mjs`。浏览器执行 `npm run test:e2e:web`，构建后执行 `npm run test:e2e:production`。

保留 Mutation Lane/EventBus 分工；事实提交不能由 CSS/动画代表。相同意图重试保留 commandId；投影失败不得回滚已提交事实。修改事实模型时增加旧数据升级与备份往返测试。

建议维护者将 `required` 与 `desktop-required` 设置为 main 的 required checks，并要求 PR 审核。仓库内 workflow 不等同于 GitHub 管理端已启用强制策略。

发布必须另行确认版本、签名/公证、平台矩阵与人工体验验收。Actions 工件是未签名候选，不是正式 Release。
