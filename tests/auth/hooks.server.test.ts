import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock('$lib/supabase/server', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			getSession: mockGetSession,
			getUser: mockGetUser
		},
		rpc: mockRpc
	}))
}));

describe('hooks.server handle', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('loads householdId via current_household_id() for authenticated users', async () => {
		mockGetSession.mockResolvedValueOnce({
			data: { session: { user: { id: 'user-1' } } }
		});
		mockGetUser.mockResolvedValueOnce({
			data: { user: { id: 'user-1', email: 'user@example.com' } }
		});
		mockRpc.mockResolvedValueOnce({
			data: 'household-1',
			error: null
		});

		const { handle } = await import('../../src/hooks.server');
		const resolve = vi.fn().mockResolvedValue(new Response('ok'));
		const event = {
			url: new URL('http://localhost:5173/'),
			locals: {},
			cookies: {
				getAll: vi.fn().mockReturnValue([]),
				set: vi.fn()
			}
		};

		await handle({ event, resolve } as never);

		expect(mockRpc).toHaveBeenCalledWith('current_household_id');
		expect((event.locals as Record<string, unknown>).householdId).toBe('household-1');
		expect(resolve).toHaveBeenCalledOnce();
	});

	it('redirects unauthenticated requests to protected routes', async () => {
		mockGetSession.mockResolvedValueOnce({
			data: { session: null }
		});

		const { handle } = await import('../../src/hooks.server');

		await expect(
			handle({
				event: {
					url: new URL('http://localhost:5173/'),
					locals: {},
					cookies: {
						getAll: vi.fn().mockReturnValue([]),
						set: vi.fn()
					}
				},
				resolve: vi.fn()
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/auth'
		});
	});
});
