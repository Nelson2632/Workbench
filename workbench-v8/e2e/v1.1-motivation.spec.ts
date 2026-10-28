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
