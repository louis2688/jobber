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


test.describe('soft-key labels and mode workflows', () => {
  test('cycles all six program titles and shows mode-specific soft keys', async ({ page }) => {
    await page.goto('/')
    const modeBtn = page.getByRole('button', { name: 'mode' })
    const titles = [
      'RIGHT TRIANGLE',
      'CIRCLE',
      'ROOF',
      'STAIRS',
      'OBLIQUE TRIANGLE',
      'TECHNICAL',
    ]
    const softKeys = [
      ['Rise', 'Run', 'SLP'],
      ['RAD', 'Diam', 'Circ'],
      ['pitch', 'HIP', 'Spac'],
      ['riserH', 'FL-FL', 'stringr'],
      ['a side', 'b side', 'Area'],
      ['SINE', 'COS', 'π'],
    ]
    for (let i = 0; i < titles.length; i++) {
      await expect(page.locator('.mode-bar-cell').first()).toContainText(titles[i])
      for (const label of softKeys[i]) {
        await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
      }
      await modeBtn.click()
    }
    await expect(page.locator('.mode-bar-cell').first()).toContainText('RIGHT TRIANGLE')
  })

  test('CIRCLE: Diam 24 → Circ ≈ 75.4', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'mode' }).click()
    await expect(page.locator('.mode-bar-cell').first()).toContainText('CIRCLE')
    await page.getByRole('button', { name: 'INCH', exact: true }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: '4', exact: true }).click()
    await page.getByRole('button', { name: 'Diam' }).click()
    await page.getByRole('button', { name: 'Circ' }).click()
    const text = (await page.locator('.disp-main-value').innerText()).replace(/\s/g, '')
    expect(text).toMatch(/75/)
  })

  test('TECHNICAL: 30 SINE → 0.5', async ({ page }) => {
    await page.goto('/')
    const modeBtn = page.getByRole('button', { name: 'mode' })
    for (let i = 0; i < 5; i++) await modeBtn.click()
    await expect(page.locator('.mode-bar-cell').first()).toContainText('TECHNICAL')
    await page.getByRole('button', { name: 'DEC', exact: true }).click()
    const keys = page.getByRole('group', { name: 'Calculator keypad' })
    await keys.getByRole('button', { name: '3', exact: true }).click()
    await keys.getByRole('button', { name: '0', exact: true }).click()
    await keys.getByRole('button', { name: 'SINE' }).click()
    const text = (await page.locator('.disp-main-value').innerText()).replace(/\s/g, '')
    expect(text).toMatch(/0\.5/)
  })

  test('unit keys DEC/FIS/INCH/MET toggle active class', async ({ page }) => {
    await page.goto('/')
    for (const unit of ['DEC', 'FIS', 'INCH', 'MET']) {
      await page.getByRole('button', { name: unit, exact: true }).click()
      await expect(page.getByRole('button', { name: unit, exact: true })).toHaveClass(/active/)
    }
  })

  test('export FAB is present and does not break keypad', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.fab-export')).toBeVisible()
    await page.getByRole('button', { name: 'INCH', exact: true }).click()
    await page.getByRole('button', { name: '5', exact: true }).click()
    await page.getByRole('button', { name: '+', exact: true }).click()
    await page.getByRole('button', { name: '5', exact: true }).click()
    await page.getByRole('button', { name: '=', exact: true }).click()
    const text = (await page.locator('.disp-main-value').innerText()).replace(/\s/g, '')
    expect(text).toMatch(/10/)
  })

  test('FIS digits enter from the right at 0/16 (Jobber shift)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'FIS', exact: true }).click()
    await page.getByRole('button', { name: 'CE/C' }).click()
    const keys = page.getByRole('group', { name: 'Calculator keypad' })
    const main = page.locator('.disp-main-value')
    await keys.getByRole('button', { name: '9', exact: true }).click()
    await expect(main).toHaveText('0 ft. : 0 : 9/16 inch')
    await keys.getByRole('button', { name: '9', exact: true }).click()
    await expect(main).toHaveText('0 ft. : 9 : 9/16 inch')
    await keys.getByRole('button', { name: '9', exact: true }).click()
    await expect(main).toHaveText('9 ft. : 9 : 9/16 inch')
  })
})


