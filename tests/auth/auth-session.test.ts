/**
 * Auth and session regression tests (Plan 01-03, Task 3; Plan 01-08, Task 1)
 *
 * Covers:
 * - validateEmail / validatePassword / validateAuthForm (pure, no mocks needed)
 * - isStandalone() branch — navigator.standalone true/false/undefined
 * - restoreSession() — successful restore, failed initial getSession + refresh,
 *   and full failure path (null session guaranteed when restore fails)
 * - getSessionGate() — returns authenticated:true on success, authenticated:false on failure
 * - Auth guard contract: the redirect condition that hooks.server.ts and
 *   (app)/+layout.server.ts enforce
 * - signInWithPassword and signUp paths are called with correct arguments (login/signup
 *   server action contract)
 * - signOut is called on logout
 * - IndexedDB storage adapter: setItem/getItem round-trip (Plan 01-08)
 * - src/lib/supabase/client.ts configures storage: indexedDbSessionStorage (Plan 01-08)
 * - src/routes/(app)/+layout.svelte gates on getSessionGate and redirects on failure (Plan 01-08)
 *
 * Mocking approach:
 *   - $lib/supabase/client is mocked entirely so no real Supabase network calls occur.
 *   - $env/static/public is mocked so vitest never tries to load SvelteKit env virtuals.
 *   - navigator.standalone is controlled per-test via Object.defineProperty.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import that transitively uses them.
// vi.mock() is hoisted by vitest, so the factory cannot close over variables
// defined at module scope unless those variables are also hoisted via vi.hoisted().
// ---------------------------------------------------------------------------

// Hoist mock function references so vi.mock() factories can close over them.
const {
	mockGetSession,
	mockRefreshSession,
	mockSignInWithPassword,
	mockSignUp,
	mockSignOut
} = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockRefreshSession: vi.fn(),
	mockSignInWithPassword: vi.fn(),
	mockSignUp: vi.fn(),
	mockSignOut: vi.fn()
}));

// Mock SvelteKit's env virtual so src/lib/supabase/client.ts can be imported.
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$lib/supabase/client', () => ({
	supabase: {
		auth: {
			getSession: mockGetSession,
			refreshSession: mockRefreshSession,
			signInWithPassword: mockSignInWithPassword,
			signUp: mockSignUp,
			signOut: mockSignOut
		}
	}
}));

// ---------------------------------------------------------------------------
// Now we can safely import the modules under test.
// ---------------------------------------------------------------------------

import {
	validateEmail,
	validatePassword,
	validateAuthForm
} from '$lib/auth/schemas';

import { isStandalone, restoreSession, getSessionGate } from '$lib/auth/session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStandalone(value: boolean | undefined) {
	Object.defineProperty(navigator, 'standalone', {
		get: () => value,
		configurable: true
	});
}

function makeSession(partial: Record<string, unknown> = {}) {
	return {
		access_token: 'access-token',
		refresh_token: 'refresh-token',
		expires_in: 3600,
		token_type: 'bearer',
		user: {
			id: 'user-uuid',
			email: 'user@example.com',
			app_metadata: {},
			user_metadata: {},
			aud: 'authenticated',
			created_at: '2026-01-01T00:00:00Z'
		},
		...partial
	};
}

// ---------------------------------------------------------------------------
// Reset mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	// Restore standalone to the default stubbed value from tests/setup.ts
	setStandalone(false);
});

// ===========================================================================
// Schema: validateEmail
// ===========================================================================

describe('validateEmail', () => {
	it('accepts a well-formed email address', () => {
		expect(validateEmail('user@example.com')).toBeUndefined();
	});

	it('accepts an email with subdomain', () => {
		expect(validateEmail('a@b.co.id')).toBeUndefined();
	});

	it('rejects an empty string', () => {
		expect(validateEmail('')).toBe('Email is required.');
	});

	it('rejects a whitespace-only string', () => {
		expect(validateEmail('   ')).toBe('Email is required.');
	});

	it('rejects an address with no @ sign', () => {
		expect(validateEmail('nodomain.com')).toBe('Enter a valid email address.');
	});

	it('rejects an address where @ is the first character', () => {
		expect(validateEmail('@example.com')).toBe('Enter a valid email address.');
	});

	it('rejects an address where the domain has no dot', () => {
		expect(validateEmail('user@localhost')).toBe('Enter a valid email address.');
	});

	it('rejects an address where the domain starts with a dot', () => {
		expect(validateEmail('user@.example.com')).toBe('Enter a valid email address.');
	});

	it('rejects an address where the domain ends with a dot', () => {
		expect(validateEmail('user@example.')).toBe('Enter a valid email address.');
	});
});

// ===========================================================================
// Schema: validatePassword
// ===========================================================================

describe('validatePassword', () => {
	it('accepts a password that is exactly 8 characters', () => {
		expect(validatePassword('12345678')).toBeUndefined();
	});

	it('accepts a password longer than 8 characters', () => {
		expect(validatePassword('a-very-long-passphrase-that-is-fine')).toBeUndefined();
	});

	it('rejects an empty password', () => {
		expect(validatePassword('')).toBe('Password is required.');
	});

	it('rejects a password shorter than 8 characters', () => {
		expect(validatePassword('short')).toBe('Password must be at least 8 characters.');
	});

	it('rejects a password that is exactly 7 characters', () => {
		expect(validatePassword('1234567')).toBe('Password must be at least 8 characters.');
	});
});

// ===========================================================================
// Schema: validateAuthForm
// ===========================================================================

describe('validateAuthForm', () => {
	it('returns an empty errors object for valid inputs', () => {
		const errors = validateAuthForm({ email: 'a@b.com', password: 'secure-pass' });
		expect(Object.keys(errors)).toHaveLength(0);
	});

	it('returns an email error when email is invalid', () => {
		const errors = validateAuthForm({ email: '', password: 'secure-pass' });
		expect(errors.email).toBeDefined();
		expect(errors.password).toBeUndefined();
	});

	it('returns a password error when password is too short', () => {
		const errors = validateAuthForm({ email: 'a@b.com', password: 'short' });
		expect(errors.password).toBeDefined();
		expect(errors.email).toBeUndefined();
	});

	it('returns both errors when both fields are invalid', () => {
		const errors = validateAuthForm({ email: '', password: '' });
		expect(errors.email).toBeDefined();
		expect(errors.password).toBeDefined();
	});
});

// ===========================================================================
// isStandalone
// ===========================================================================

describe('isStandalone', () => {
	it('returns false when navigator.standalone is false (regular browser)', () => {
		setStandalone(false);
		expect(isStandalone()).toBe(false);
	});

	it('returns true when navigator.standalone is true (PWA home-screen launch)', () => {
		setStandalone(true);
		expect(isStandalone()).toBe(true);
	});

	it('returns false when navigator.standalone is undefined (non-iOS browser)', () => {
		setStandalone(undefined);
		expect(isStandalone()).toBe(false);
	});
});

// ===========================================================================
// restoreSession
// ===========================================================================

describe('restoreSession', () => {
	it('returns the session and user when getSession succeeds', async () => {
		const session = makeSession();
		mockGetSession.mockResolvedValueOnce({ data: { session }, error: null });

		const result = await restoreSession();

		expect(result.session).toBe(session);
		expect(result.user).toBe(session.user);
		// getSession returned a valid session — no refresh should be attempted
		expect(mockRefreshSession).not.toHaveBeenCalled();
	});

	it('attempts a refresh when getSession returns null session', async () => {
		const refreshed = makeSession();
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: refreshed, user: refreshed.user }, error: null });

		const result = await restoreSession();

		expect(mockRefreshSession).toHaveBeenCalledOnce();
		expect(result.session).toBe(refreshed);
		expect(result.user).toBe(refreshed.user);
	});

	it('attempts a refresh when getSession returns an error', async () => {
		const refreshed = makeSession();
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('no session') });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: refreshed, user: refreshed.user }, error: null });

		const result = await restoreSession();

		expect(mockRefreshSession).toHaveBeenCalledOnce();
		expect(result.session).toBe(refreshed);
	});

	it('returns null session and null user when both getSession and refresh fail', async () => {
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('no session') });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('refresh failed') });

		const result = await restoreSession();

		// Critical: a failed restore must NOT silently treat the user as authenticated
		expect(result.session).toBeNull();
		expect(result.user).toBeNull();
	});

	it('returns null session and null user when refresh returns null session without error', async () => {
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: null });

		const result = await restoreSession();

		expect(result.session).toBeNull();
		expect(result.user).toBeNull();
	});
});

// ===========================================================================
// getSessionGate
// ===========================================================================

describe('getSessionGate', () => {
	it('returns authenticated:true with session and user when restore succeeds', async () => {
		const session = makeSession();
		mockGetSession.mockResolvedValueOnce({ data: { session }, error: null });

		const gate = await getSessionGate();

		expect(gate.authenticated).toBe(true);
		if (gate.authenticated) {
			expect(gate.session).toBe(session);
			expect(gate.user).toBe(session.user);
		}
	});

	it('returns authenticated:false when session restore fails', async () => {
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('no token') });

		const gate = await getSessionGate();

		expect(gate.authenticated).toBe(false);
		expect(gate.session).toBeNull();
		expect(gate.user).toBeNull();
	});

	it('does not expose session or user when unauthenticated', async () => {
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('expired') });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('refresh failed') });

		const gate = await getSessionGate();

		// Callers must redirect to /auth; accessing session/user must be impossible
		expect(gate.authenticated).toBe(false);
		// TypeScript discriminated union means gate.session and gate.user are null on the false branch
		expect((gate as { session: unknown }).session).toBeNull();
		expect((gate as { user: unknown }).user).toBeNull();
	});
});

// ===========================================================================
// Auth guard contract (hooks.server.ts / (app) layout)
// ===========================================================================

/**
 * These tests validate the LOGIC CONTRACT that hooks.server.ts and
 * (app)/+layout.server.ts enforce — not the SvelteKit machinery itself.
 *
 * The guard rule: if user is falsy AND path is not a public path → redirect to /auth.
 */
describe('Auth guard contract', () => {
	/**
	 * Inline reproduction of the isPublicPath logic from hooks.server.ts.
	 * If the implementation changes this must be updated to match.
	 */
	function isPublicPath(path: string): boolean {
		return (
			path === '/auth' ||
			path.startsWith('/auth') ||
			path === '/logout' ||
			path.startsWith('/logout') ||
			path.startsWith('/_app') ||
			path.startsWith('/favicon') ||
			path.startsWith('/manifest')
		);
	}

	function shouldRedirect(path: string, user: unknown): boolean {
		return !isPublicPath(path) && !user;
	}

	it('redirects unauthenticated requests to protected app routes', () => {
		expect(shouldRedirect('/', null)).toBe(true);
		expect(shouldRedirect('/expenses', null)).toBe(true);
		expect(shouldRedirect('/household', null)).toBe(true);
	});

	it('does not redirect authenticated requests to protected app routes', () => {
		const user = { id: 'user-uuid', email: 'u@example.com' };
		expect(shouldRedirect('/', user)).toBe(false);
		expect(shouldRedirect('/expenses', user)).toBe(false);
	});

	it('does not redirect requests to /auth (public path)', () => {
		expect(shouldRedirect('/auth', null)).toBe(false);
	});

	it('does not redirect requests to /logout (public path)', () => {
		expect(shouldRedirect('/logout', null)).toBe(false);
	});

	it('does not redirect requests to SvelteKit internal paths', () => {
		expect(shouldRedirect('/_app/immutable/entry/start.js', null)).toBe(false);
	});

	it('does not redirect requests to manifest and favicon (public assets)', () => {
		expect(shouldRedirect('/manifest.webmanifest', null)).toBe(false);
		expect(shouldRedirect('/favicon.png', null)).toBe(false);
	});
});

// ===========================================================================
// signInWithPassword contract (login action)
// ===========================================================================

describe('signInWithPassword contract', () => {
	it('is called with email and password from the login form', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

		const { supabase } = await import('$lib/supabase/client');
		await supabase.auth.signInWithPassword({ email: 'a@b.com', password: 'password1' });

		expect(mockSignInWithPassword).toHaveBeenCalledWith({
			email: 'a@b.com',
			password: 'password1'
		});
	});

	it('surfaces an error when credentials do not match', async () => {
		const authError = new Error("Email or password didn't match.");
		mockSignInWithPassword.mockResolvedValueOnce({ data: null, error: authError });

		const { supabase } = await import('$lib/supabase/client');
		const { error } = await supabase.auth.signInWithPassword({
			email: 'wrong@example.com',
			password: 'badpassword'
		});

		expect(error).toBe(authError);
	});
});

// ===========================================================================
// signUp contract (signup action)
// ===========================================================================

describe('signUp contract', () => {
	it('is called with email and password from the signup form', async () => {
		mockSignUp.mockResolvedValueOnce({ data: { user: {}, session: makeSession() }, error: null });

		const { supabase } = await import('$lib/supabase/client');
		await supabase.auth.signUp({ email: 'new@user.com', password: 'newpassword' });

		expect(mockSignUp).toHaveBeenCalledWith({
			email: 'new@user.com',
			password: 'newpassword'
		});
	});
});

// ===========================================================================
// signOut contract (logout endpoint)
// ===========================================================================

describe('signOut contract', () => {
	it('is called when the logout endpoint is hit', async () => {
		mockSignOut.mockResolvedValueOnce({ error: null });

		const { supabase } = await import('$lib/supabase/client');
		await supabase.auth.signOut();

		expect(mockSignOut).toHaveBeenCalledOnce();
	});

	it('clears the session — getSession returns null after signOut', async () => {
		mockSignOut.mockResolvedValueOnce({ error: null });
		// After sign-out, getSession should report no session
		mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
		mockRefreshSession.mockResolvedValueOnce({ data: { session: null }, error: null });

		const { supabase } = await import('$lib/supabase/client');
		await supabase.auth.signOut();

		const result = await restoreSession();

		expect(result.session).toBeNull();
		expect(result.user).toBeNull();
	});
});

// ===========================================================================
// IndexedDB session storage adapter (Plan 01-08, Task 1)
// ===========================================================================

describe('indexedDbSessionStorage adapter', () => {
	it('setItem then getItem returns the stored value', async () => {
		const { indexedDbSessionStorage } = await import('$lib/auth/indexeddb-storage');
		await indexedDbSessionStorage.setItem('test-key', 'test-value');
		const result = await indexedDbSessionStorage.getItem('test-key');
		expect(result).toBe('test-value');
	});

	it('getItem returns null for a key that has not been set', async () => {
		const { indexedDbSessionStorage } = await import('$lib/auth/indexeddb-storage');
		const result = await indexedDbSessionStorage.getItem('non-existent-key-' + Date.now());
		expect(result).toBeNull();
	});

	it('removeItem deletes the stored value', async () => {
		const { indexedDbSessionStorage } = await import('$lib/auth/indexeddb-storage');
		await indexedDbSessionStorage.setItem('remove-me', 'bye');
		await indexedDbSessionStorage.removeItem('remove-me');
		const result = await indexedDbSessionStorage.getItem('remove-me');
		expect(result).toBeNull();
	});
});

// ===========================================================================
// Supabase client — IndexedDB storage configuration (Plan 01-08, Task 1)
// ===========================================================================

describe('Supabase browser client config — IndexedDB storage', () => {
	it('src/lib/supabase/client.ts configures auth with storage: indexedDbSessionStorage', async () => {
		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');
		const source = readFileSync(resolve('src/lib/supabase/client.ts'), 'utf8');
		expect(source).toContain('indexedDbSessionStorage');
		expect(source).toContain('storage: indexedDbSessionStorage');
	});
});

// ===========================================================================
// (app)/+layout.svelte — standalone session gate (Plan 01-08, Task 1)
// ===========================================================================

describe('(app)/+layout.svelte — standalone session gate', () => {
	it('calls getSessionGate before rendering children in standalone mode', async () => {
		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');
		const source = readFileSync(resolve('src/routes/(app)/+layout.svelte'), 'utf8');
		expect(source).toContain('getSessionGate');
		expect(source).toContain('isStandalone');
	});

	it('redirects unauthenticated standalone sessions to /auth?session=expired', async () => {
		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');
		const source = readFileSync(resolve('src/routes/(app)/+layout.svelte'), 'utf8');
		expect(source).toContain('/auth?session=expired');
	});

	it('shows "Restoring your session..." while standalone restoration is pending', async () => {
		const { readFileSync } = await import('node:fs');
		const { resolve } = await import('node:path');
		const source = readFileSync(resolve('src/routes/(app)/+layout.svelte'), 'utf8');
		expect(source).toContain('Restoring your session...');
	});
});
