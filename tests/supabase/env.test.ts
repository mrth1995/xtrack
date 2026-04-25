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
		expect(validateSupabasePublicEnv('https://abcd.supabase.co', 'anon-key')).toEqual({
			url: 'https://abcd.supabase.co',
			anonKey: 'anon-key'
		});
		expect(validateSupabasePublicEnv('http://127.0.0.1:54321', 'local-anon')).toEqual({
			url: 'http://127.0.0.1:54321',
			anonKey: 'local-anon'
		});
	});
});
