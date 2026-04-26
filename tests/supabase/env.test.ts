import { describe, expect, it } from 'vitest';
import { validateSupabasePublicEnv } from '$lib/supabase/env';

describe('Supabase public environment guard', () => {
	it('rejects placeholder Supabase URLs with setup guidance', () => {
		expect(() =>
			validateSupabasePublicEnv('https://placeholder.supabase.co', 'anon-key')
		).toThrow(/PUBLIC_SUPABASE_URL.*placeholder\.supabase\.co.*restart the dev server/i);
	});

	it('rejects missing URL and anon key values', () => {
		expect(() => validateSupabasePublicEnv('', 'anon-key')).toThrow(
			/PUBLIC_SUPABASE_URL is missing/i
		);
		expect(() => validateSupabasePublicEnv('https://abcd.supabase.co', '')).toThrow(
			/PUBLIC_SUPABASE_ANON_KEY is missing/i
		);
	});

	it('rejects non-URL Supabase URL values', () => {
		expect(() => validateSupabasePublicEnv('not a url', 'anon-key')).toThrow(
			/PUBLIC_SUPABASE_URL must be a valid URL/i
		);
	});

	it('accepts hosted and local Supabase URLs', () => {
		// Use keys >= 20 chars to pass the too-short guard (real keys are JWTs, always much longer)
		const mockKey = 'test-anon-key-for-unit-test-only';
		expect(validateSupabasePublicEnv('https://abcd.supabase.co', mockKey)).toEqual({
			url: 'https://abcd.supabase.co',
			anonKey: mockKey
		});
		expect(validateSupabasePublicEnv('http://127.0.0.1:54321', mockKey)).toEqual({
			url: 'http://127.0.0.1:54321',
			anonKey: mockKey
		});
	});
});

// ===========================================================================
// Plan 01-08: Task 2 — Hardened anon key validation
// ===========================================================================

describe('Supabase anon key — placeholder and short-value rejection (Plan 01-08)', () => {
	const VALID_URL = 'https://abcd.supabase.co';

	it('rejects "placeholder" anon key with placeholder message', () => {
		expect(() => validateSupabasePublicEnv(VALID_URL, 'placeholder')).toThrow(
			'PUBLIC_SUPABASE_ANON_KEY still contains a placeholder value.'
		);
	});

	it('rejects "your-anon-key" with placeholder message', () => {
		expect(() => validateSupabasePublicEnv(VALID_URL, 'your-anon-key')).toThrow(
			'PUBLIC_SUPABASE_ANON_KEY still contains a placeholder value.'
		);
	});

	it('rejects "replace-me" with placeholder message', () => {
		expect(() => validateSupabasePublicEnv(VALID_URL, 'replace-me')).toThrow(
			'PUBLIC_SUPABASE_ANON_KEY still contains a placeholder value.'
		);
	});

	it('rejects values shorter than 20 characters with too-short message', () => {
		// 'short-key' is 9 chars — not a known placeholder keyword but too short
		expect(() => validateSupabasePublicEnv(VALID_URL, 'short-key')).toThrow(
			'PUBLIC_SUPABASE_ANON_KEY is too short to be a Supabase anon key.'
		);
	});

	it('accepts a realistic-length anon key that is not a placeholder', () => {
		const realishKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
		expect(() => validateSupabasePublicEnv(VALID_URL, realishKey)).not.toThrow();
	});

	it('includes setup hint in anon key error messages', () => {
		expect(() => validateSupabasePublicEnv(VALID_URL, 'placeholder')).toThrow(
			/restart the dev server/i
		);
	});
});
