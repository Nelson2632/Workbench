import { test, expect } from '@playwright/test'

for (const theme of ['晨雾书房', 'Windows', '深色夜航']) {
  test(`built app under CSP: ${theme}, capture, completion and source navigation`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (/violates.*Content Security Policy|Refused to.*because it violates/i.test(message.text())) errors.push(message.text())
    })
    await page.goto('/settings')
    await page.getByRole('button', { name: new RegExp(theme) }).click()
    await page.goto('/plan/today')
    await page.getByLabel('新增任务').fill('真实构建任务')
    await page.getByRole('button', { name: '添加', exact: true }).click()
    await expect(page.getByLabel('新增任务')).toHaveValue('')
    await page.goto('/today')
    await page.getByTestId('today-now').getByRole('button', { name: '标记为已完成' }).click()
    await expect(page.getByTestId('completion-feedback')).toContainText('已完成')
    await page.screenshot({ path: testInfo.outputPath(`${theme}-today.png`), fullPage: true })
    await page.goto('/timeline')
    await page.getByRole('link', { name: '查看源记录 · 真实构建任务' }).click()
    await expect(page.getByRole('dialog')).toContainText('真实构建任务')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.goto('/memory')
    await expect(page.getByText('WORK：完成 1 任务', { exact: false })).toBeVisible()
    await page.goto('/tools/finance')
    await expect(page.getByRole('heading', { name: /记账/ })).toBeVisible()
    expect(errors).toEqual([])
  })
}
