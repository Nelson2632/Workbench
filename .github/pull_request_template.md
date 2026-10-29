## 问题与用户行为变化

关联审计项：
Before / After：

## 实现与失败路径

- commandId 生命周期、主事实提交点、投影完成点、反馈触发点：
- 写入失败、投影失败、重试行为：
- 数据迁移、备份与回滚：

## 验证结果

- [ ] 单元测试 / 覆盖率门禁
- [ ] TypeScript + Vite build
- [ ] contract / implementation / release consistency gates
- [ ] Playwright 相关场景（含 reduced-motion、键盘）
- [ ] 原生编译 / macOS bundle + startup smoke（如适用）

通过、失败和无法验证分别说明；不要用编写测试代替执行结果。

## 剩余问题与风险

本 PR 不自动合并或发布。涉及迁移时注明最低兼容版本与升级前备份要求。
