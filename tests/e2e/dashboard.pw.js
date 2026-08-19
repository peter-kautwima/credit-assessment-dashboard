import { expect, test } from '@playwright/test'

test('analyst finds a high-risk completed file and reads its reason', async ({ page }) => {
	await page.goto('/')

	const search = page.getByRole('searchbox', { name: /Find a file/i })
	await search.fill('Bright Construction')
	await expect(page.getByText('1 file in view').first()).toBeVisible()

	await page.getByRole('button', { name: /Bright Construction/ }).click()
	await expect(page.getByRole('heading', { name: 'Bright Construction' })).toBeVisible()
	await expect(page.getByText('Complete', { exact: true }).last()).toBeVisible()
	await expect(page.getByText('High risk', { exact: true }).last()).toBeVisible()
	await expect(page.getByText('The credit report carries a High risk band.')).toBeVisible()
})

test('mobile file navigation restores focus to the docket row', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('/')

	const row = page.getByRole('button', { name: /Acme Traders/ })
	await expect(row).toBeVisible()
	await row.click()

	await expect(page.getByRole('heading', { name: 'Acme Traders' })).toBeFocused()
	await page.getByRole('button', { name: 'Back to docket' }).click()
	await expect(row).toBeFocused()
})
