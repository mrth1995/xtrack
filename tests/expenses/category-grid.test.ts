import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { CATEGORY_META, VALID_CATEGORIES } from '$lib/expenses/schemas';

describe('CategoryGrid component (INPUT-04)', () => {
	it('renders the 7 preset category tiles with expected labels and emoji', async () => {
		const { default: CategoryGrid } = await import('$lib/components/CategoryGrid.svelte');
		const onCategoryTap = vi.fn();
		const { getByRole, getByText } = render(CategoryGrid, {
			disabled: false,
			pressedCategory: null,
			onCategoryTap
		});

		for (const category of VALID_CATEGORIES) {
			expect(getByRole('button', { name: category })).toBeInTheDocument();
			expect(getByText(CATEGORY_META[category].emoji)).toBeInTheDocument();
		}
	});

	it('calls onCategoryTap with the selected category when enabled', async () => {
		const { default: CategoryGrid } = await import('$lib/components/CategoryGrid.svelte');
		const onCategoryTap = vi.fn();
		const { getByRole } = render(CategoryGrid, {
			disabled: false,
			pressedCategory: null,
			onCategoryTap
		});

		await fireEvent.click(getByRole('button', { name: 'Food' }));

		expect(onCategoryTap).toHaveBeenCalledWith('Food');
	});
});

describe('CategoryGrid disabled and pressed state (INPUT-06)', () => {
	it('disables every category tile and suppresses click callbacks', async () => {
		const { default: CategoryGrid } = await import('$lib/components/CategoryGrid.svelte');
		const onCategoryTap = vi.fn();
		const { getAllByRole, getByRole } = render(CategoryGrid, {
			disabled: true,
			pressedCategory: null,
			onCategoryTap
		});

		for (const tile of getAllByRole('button')) {
			expect(tile).toBeDisabled();
			expect(tile).toHaveStyle({ 'pointer-events': 'none' });
		}

		getByRole('button', { name: 'Food' }).click();

		expect(onCategoryTap).not.toHaveBeenCalled();
	});

	it('renders the pressed category with the pressed CSS tokens', async () => {
		const { default: CategoryGrid } = await import('$lib/components/CategoryGrid.svelte');
		const onCategoryTap = vi.fn();
		const { getByRole } = render(CategoryGrid, {
			disabled: false,
			pressedCategory: 'Food',
			onCategoryTap
		});

		const pressedTile = getByRole('button', { name: 'Food' });
		const idleTile = getByRole('button', { name: 'Transport' });

		expect(pressedTile.getAttribute('style')).toContain('var(--color-pressed)');
		expect(pressedTile.getAttribute('style')).toContain('2px solid var(--color-accent)');
		expect(idleTile.getAttribute('style')).not.toContain('var(--color-pressed)');
	});
});
