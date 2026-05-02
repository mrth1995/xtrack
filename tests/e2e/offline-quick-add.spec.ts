import { expect, test } from '@playwright/test';

test('offline quick add queues then flushes without duplicate Food row', async ({ page, context }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Food' })).toBeVisible();

	await expect(async () => {
		await page.getByRole('button', { name: '5' }).click();
		await expect(page.locator('[aria-label="Amount"]')).toHaveText('5', { timeout: 250 });
	}).toPass();
	await page.getByRole('button', { name: '000' }).click();
	await expect(page.locator('[aria-label="Amount"]')).toHaveText('5.000');

	await context.setOffline(true);
	await page.getByRole('button', { name: 'Food' }).click();

	await expect(page.getByText('Waiting')).toBeVisible();

	await context.setOffline(false);
	await page.evaluate(() => window.dispatchEvent(new Event('online')));

	await expect(page.getByText('Waiting')).toBeHidden();
	await expect(page.getByRole('link', { name: /Food/ })).toHaveCount(1);
});
