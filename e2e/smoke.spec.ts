import { test, expect } from '@playwright/test'

test.describe('Jobber calculator smoke', () => {
  test('loads and cycles modes to CIRCLE and STAIRS', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('group', { name: 'Calculator keypad' })).toBeVisible()
    await expect(page.locator('.mode-bar-cell').first()).toContainText('RIGHT TRIANGLE')

    const modeBtn = page.getByRole('button', { name: 'mode' })
    await modeBtn.click()
    await expect(page.locator('.mode-bar-cell').first()).toContainText('CIRCLE')

    // CIRCLE → ROOF → STAIRS
    await modeBtn.click()
    await modeBtn.click()
    await expect(page.locator('.mode-bar-cell').first()).toContainText('STAIRS')
  })

  test('3-4-5 right triangle via UI', async ({ page }) => {
    await page.goto('/')
    // Ensure triangle mode
    await expect(page.locator('.mode-bar-cell').first()).toContainText('RIGHT TRIANGLE')

    await page.getByRole('button', { name: 'INCH', exact: true }).click()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: 'Rise' }).click()
    await page.getByRole('button', { name: '4', exact: true }).click()
    await page.getByRole('button', { name: 'Run' }).click()
    await page.getByRole('button', { name: 'SLP' }).click()

    // 5 inches in FIS-ish or INCH display
    const main = page.locator('.disp-main-value')
    await expect(main).toBeVisible()
    const text = await main.innerText()
    expect(text.replace(/\s/g, '')).toMatch(/5/)
  })
})
