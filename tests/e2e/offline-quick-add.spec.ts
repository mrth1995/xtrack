// Requires authenticated test fixture before execution
import { expect, test } from '@playwright/test';

test('offline quick add queues then flushes without duplicate Food row', async ({ page, context }) => {
	await page.goto('/');

	await context.setOffline(true);
	await page.getByRole('button', { name: '5' }).click();
	await page.getByRole('button', { name: '000' }).click();
	await page.getByRole('button', { name: 'Food' }).click();

	await expect(page.getByText('Waiting')).toBeVisible();

	await context.setOffline(false);
	await page.evaluate(() => window.dispatchEvent(new Event('online')));

	await expect(page.getByText('Waiting')).toBeHidden();
	await expect(page.getByRole('link', { name: /Food/ })).toHaveCount(1);
});
