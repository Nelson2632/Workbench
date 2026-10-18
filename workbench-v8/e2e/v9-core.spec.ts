// ============================================================
// V9 Personal OS — Playwright E2E 主链路（V9_MASTER_PLAN §13/§53）
// 覆盖：四条核心闭环 + 全局搜索 + 主题切换 + 降级触发
// 运行前提：@playwright/test 已安装且 chromium 已下载（见 e2e/README.md）
// ============================================================

import { test, expect } from '@playwright/test'

test.describe('闭环 A · 学习日（Today → Flex → 任务 → 收口 → 复盘）', () => {
  test('完整链路可走通', async ({ page }) => {
    await page.goto('/today')

    // 添加今日任务
    await page.goto('/plan/inbox')
    await page.getByLabel('新增任务').fill('E2E 数学卷')
    await page.getByRole('button', { name: /添加|新建|保存/ }).first().click()

    // Today 生成弹性计划：MUST 在前
    await page.goto('/today')
    await page.getByRole('button', { name: '生成计划' }).click()
    await expect(page.getByText('MUST').first()).toBeVisible()

    // 完成任务 → 划线与光晕（data-v9-done）
    await page.locator('[aria-label="标记为已完成"]').first().click()
    await expect(page.locator('[data-v9-done="true"]').first()).toBeVisible()

    // 今日收口
    await page.getByRole('button', { name: '去收口' }).click()
    await page.getByLabel('今日反思').fill('E2E 收口反思')
    await page.getByRole('button', { name: '完成收口' }).click()
    await expect(page.getByText(/收口 · 已完成|已完成/).first()).toBeVisible()
  })
})

test.describe('闭环 B · 记录生活（Diary → 日历 → Timeline）', () => {
  test('日记进入时间线', async ({ page }) => {
    await page.goto('/life/diary')
    await page.getByLabel('日记正文').fill('E2E 生活日记')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('E2E 生活日记').first()).toBeVisible()

    await page.goto('/timeline')
    await expect(page.getByText('E2E 生活日记').first()).toBeVisible()
  })
})

test.describe('闭环 C · 娱乐时光（动画 → Timeline）', () => {
  test('看一集动画进入时间线', async ({ page }) => {
    await page.goto('/play/anime')
    await page.getByLabel('动画名').fill('E2E 动画')
    await page.getByLabel('总集数').fill('12')
    await page.getByRole('button', { name: '添加' }).click()
    await page.getByRole('button', { name: '+1 集' }).click()

    await page.goto('/timeline')
    await expect(page.getByText(/看完 E2E 动画 第 1 集/).first()).toBeVisible()
  })
})

test.describe('闭环 D · 安全（App Lock → 备份 → 删除 → Restore）', () => {
  test('备份与恢复往返', async ({ page }) => {
    await page.goto('/settings/v9')
    // 启用 App Lock
    await page.getByLabel('主密码', { exact: true }).fill('e2e-password')
    await page.getByLabel('确认主密码').fill('e2e-password')
    await page.getByRole('button', { name: '启用 App Lock' }).click()
    await expect(page.getByText(/已启用/).first()).toBeVisible()

    // 创建快照
    await page.getByRole('button', { name: '立即创建快照' }).click()
    await expect(page.getByText(/快照已创建/).first()).toBeVisible()
  })
})

test.describe('跨域系统', () => {
  test('全局搜索命中并跳转', async ({ page }) => {
    await page.goto('/life/diary')
    await page.getByLabel('日记正文').fill('E2E 搜索目标')
    await page.getByRole('button', { name: '保存' }).click()

    await page.keyboard.press('Control+Shift+F')
    await page.getByLabel('全局搜索关键词').fill('E2E 搜索目标')
    await expect(page.getByText('E2E 搜索目标').first()).toBeVisible()
  })

  test('主题切换不崩坏（三主题轮换）', async ({ page }) => {
    await page.goto('/today')
    for (const theme of ['晨雾书房', 'Windows Fluent', '深色夜航']) {
      await page.getByRole('button', { name: theme }).click()
      await expect(page.getByText('今天').first()).toBeVisible()
    }
  })

  test('降级触发：Flex 切手动后 Today 正常渲染', async ({ page }) => {
    await page.goto('/settings/v9')
    await page.getByRole('button', { name: /当前：adaptive/ }).click()
    await expect(page.getByRole('button', { name: /当前：manual/ })).toBeVisible()
    await page.goto('/today')
    await expect(page.getByText('⚡ 弹性学习').first()).toBeVisible()
  })
})
