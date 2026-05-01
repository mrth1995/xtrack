import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

describe('GearMenu component (D-15)', () => {
	it('opens a menu with invite, household details, and logout actions', async () => {
		const { default: GearMenu } = await import('$lib/components/GearMenu.svelte');
		const { getByRole, queryByRole } = render(GearMenu);

		expect(queryByRole('link', { name: 'Invite member' })).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: 'Open menu' }));

		const invite = getByRole('link', { name: 'Invite member' });
		const household = getByRole('link', { name: 'Household details' });
		const logout = getByRole('button', { name: 'Log out' });

		expect(invite).toHaveAttribute('href', '/settings/invite');
		expect(household).toHaveAttribute('href', '/household');
		expect(logout.closest('form')).toHaveAttribute('method', 'POST');
		expect(logout.closest('form')).toHaveAttribute('action', '/logout');
	});
});
