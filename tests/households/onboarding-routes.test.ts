import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateHousehold = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock('$lib/server/households/service', () => ({
	createHousehold: mockCreateHousehold
}));

vi.mock('$lib/supabase/server', () => ({
	createServerClient: mockCreateServerClient
}));

describe('onboarding route redirects', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		mockCreateServerClient.mockReturnValue({});
	});

	it('onboarding load redirects unauthenticated users to /auth', async () => {
		const { load } = await import('../../src/routes/(app)/onboarding/+page.server');

		await expect(
			load({
				locals: { session: null, householdId: null }
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/auth'
		});
	});

	it('onboarding load redirects users with a household to /', async () => {
		const { load } = await import('../../src/routes/(app)/onboarding/+page.server');

		await expect(
			load({
				locals: { session: { user: { id: 'user-1' } }, householdId: 'household-1' }
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('create household action redirects to / after successful creation', async () => {
		mockCreateHousehold.mockResolvedValueOnce({
			id: 'household-1',
			name: 'The Smiths',
			created_by: 'user-1',
			created_at: '2026-04-25T00:00:00Z'
		});

		const { actions } = await import('../../src/routes/(app)/onboarding/create/+page.server');
		const body = new URLSearchParams({ name: 'The Smiths' });
		const request = new Request('http://localhost:5173/onboarding/create', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			body
		});

		await expect(
			actions.default({
				request,
				locals: { session: { user: { id: 'user-1' } }, householdId: null }
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/'
		});

		expect(mockCreateHousehold).toHaveBeenCalledOnce();
		expect(mockCreateServerClient).toHaveBeenCalledOnce();
	});
});
