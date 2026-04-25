import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('$lib/supabase/server', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			exchangeCodeForSession: mockExchangeCodeForSession
		}
	}))
}));

describe('auth page server load', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('exchanges ?code callback params and redirects into the app', async () => {
		mockExchangeCodeForSession.mockResolvedValueOnce({ data: { session: {} }, error: null });

		const { load } = await import('../../src/routes/(auth)/auth/+page.server');

		await expect(
			load({
				locals: { user: null },
				url: new URL('http://localhost:5173/auth?code=test-auth-code')
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/'
		});

		expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code');
	});

	it('redirects authenticated users away from the auth page', async () => {
		const { load } = await import('../../src/routes/(auth)/auth/+page.server');

		await expect(
			load({
				locals: { user: { id: 'user-1' } },
				url: new URL('http://localhost:5173/auth')
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('renders the auth page when there is no code and no authenticated user', async () => {
		const { load } = await import('../../src/routes/(auth)/auth/+page.server');

		await expect(
			load({
				locals: { user: null },
				url: new URL('http://localhost:5173/auth')
			} as never)
		).resolves.toEqual({});
	});
});
