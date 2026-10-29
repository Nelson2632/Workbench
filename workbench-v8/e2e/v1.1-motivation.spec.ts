import { test, expect, type Page } from '@playwright/test'

async function seed(page: Page, count = 1) {
  await page.goto('/today')
  await page.getByLabel('快速捕获').waitFor()
  await page.evaluate(async (n) => {
    const path = '/src/stores/taskStore.ts'
    const { useTaskStore } = await import(path)
    const helpers = '/src/utils/helpers.ts'
    const { formatDate } = await import(helpers)
    for (let i = 0; i < n; i++) await useTaskStore.getState().addTask({ title: `运行验证 ${i}`, dueDate: formatDate(new Date()) })
  }, count)
}

async function fault(page: Page, hook: string, enabled = true) {
  await page.evaluate(async ({ hook, enabled }) => {
    const path = '/src/utils/faultInjection.ts'
    const { faultInjection } = await import(path)
    faultInjection.clear()
    if (enabled) {
      faultInjection.enable()
      faultInjection.inject(hook, () => { throw new Error('E2E injected failure') })
    }
  }, { hook, enabled })
}

test('Now and Next do not duplicate recurring or ordinary tasks; full plan stays accessible', async ({ page }) => {
  await seed(page, 8)
  await expect(page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' })).toHaveCount(1)
  await expect(page.getByTestId('today-next').getByRole('button', { name: '标记为已完成' })).toHaveCount(4)
  await expect(page.getByRole('button', { name: '查看完整计划（8 项）' })).toBeVisible()
})

test('rapid completion changes one fact and shows one transient success', async ({ page }) => {
  await seed(page)
  await page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' }).evaluate((button) => {
    (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click()
  })
  await expect(page.getByTestId('completion-feedback')).toHaveCount(1)
  const counts = await page.evaluate(async () => {
    const path = '/src/db/database.ts'
    const { db } = await import(path)
    return [await db.tasks.filter((t: { done: boolean }) => t.done).count(), await db.operationJournal.where('eventType').equals('task.completed').count(), await db.timelineEvents.count()]
  })
  expect(counts).toEqual([1, 1, 1])
  await expect(page.getByTestId('completion-feedback')).toHaveCount(0)
})

test('persistence failure retains capture text; retry uses one intent', async ({ page }) => {
  await page.goto('/plan/inbox')
  await page.getByLabel('新增任务').fill('不要丢掉这段话')
  await fault(page, 'before_domain_commit')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('文字已保留')
  await expect(page.getByLabel('新增任务')).toHaveValue('不要丢掉这段话')
  await fault(page, '', false)
  await page.getByRole('button', { name: '重试保存' }).click()
  await expect(page.getByLabel('新增任务')).toHaveValue('')
  await expect(page.getByText('不要丢掉这段话', { exact: true })).toHaveCount(1)
})

test('failed critical projection keeps fact complete and celebrates once after repair', async ({ page }) => {
  await seed(page)
  await fault(page, 'mid_projection')
  await page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' }).click()
  await expect(page.getByText(/已保存，回顾同步待重试/)).toBeVisible()
  await expect(page.getByTestId('completion-feedback')).toHaveCount(0)
  await fault(page, '', false)
  await page.getByRole('button', { name: '重试同步' }).click()
  await expect(page.getByTestId('completion-feedback')).toHaveCount(1)
})

test('reduced motion still presents textual completion without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  await page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' }).click()
  const feedback = page.getByTestId('completion-feedback')
  await expect(feedback).toContainText('已完成')
  await expect(feedback).toHaveCSS('animation-name', 'none')
})

test('recovery preview, batch stash and undo preserve tasks', async ({ page }) => {
  await seed(page, 2)
  await page.goto('/plan/today')
  const recovery = page.getByRole('region', { name: '重新安排' })
  await recovery.getByRole('checkbox').nth(0).check()
  await recovery.getByRole('checkbox').nth(1).check()
  await recovery.getByRole('button', { name: '预览暂存' }).click()
  await expect(recovery.getByRole('region', { name: '调整预览' })).toContainText('暂存 · 2 项')
  await recovery.getByRole('button', { name: '确认调整' }).click()
  await expect(recovery.getByRole('status').filter({ hasText: '已调整 2 项' })).toBeVisible()
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toHaveCount(0)
  await page.reload()
  await recovery.getByRole('button', { name: '撤销上次调整' }).click()
  await expect(page.getByRole('button', { name: '标记为已完成', exact: true })).toHaveCount(2)
})

test('shutdown allows empty reflection and Memory retains unsaved text during refresh', async ({ page }) => {
  await page.goto('/today/night-shutdown')
  await page.getByRole('button', { name: '完成收口', exact: true }).click()
  await expect(page.getByRole('heading', { name: /今日收口 · 已完成/ })).toBeVisible()
  await page.goto('/memory')
  await page.getByLabel('人类反思').fill('还没保存的想法')
  await page.getByRole('button', { name: '刷新事实' }).click()
  await expect(page.getByLabel('人类反思')).toHaveValue('还没保存的想法')
  await page.getByRole('button', { name: '保存反思' }).click()
  await expect(page.getByRole('status')).toContainText('反思已保存')
  await page.reload()
  await expect(page.getByLabel('人类反思')).toHaveValue('还没保存的想法')
})

test('Timeline opens the exact original task', async ({ page }) => {
  await seed(page)
  await page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' }).click()
  await expect(page.getByTestId('completion-feedback')).toHaveCount(1)
  await page.goto('/timeline')
  await page.getByRole('link', { name: /查看源记录 · 运行验证 0/ }).click()
  await expect(page).toHaveURL(/plan\/today\?task=/)
  await expect(page.getByRole('dialog')).toContainText('运行验证 0')
})

test('warning toast is a persistent alert and supports keyboard dismissal', async ({ page }) => {
  await page.goto('/today')
  await page.getByLabel('快速捕获').waitFor()
  await page.evaluate(async () => {
    const path = '/src/domain/system/notifications.ts'
    const { _currentToastFn } = await import(path)
    _currentToastFn()?.('需要阅读的警告', 'warning')
  })
  const alert = page.getByRole('alert').filter({ hasText: '需要阅读的警告' })
  await expect(alert).toBeVisible()
  await page.waitForTimeout(6500)
  await expect(alert).toBeVisible()
  await alert.getByRole('button', { name: '关闭通知' }).focus()
  await page.keyboard.press('Enter')
  await expect(alert).toHaveCount(0)
})
