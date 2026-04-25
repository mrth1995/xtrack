import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Create a request-scoped Supabase client for server-side code (hooks, load
 * functions, server actions).
 *
 * Forwards the request Cookie header so Supabase can restore the session from
 * HttpOnly cookies. Uses the anon key only — the service-role key must never
 * appear here.
 */
export function createServerClient(event: RequestEvent) {
	return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		},
		global: {
			headers: {
				Cookie: event.request.headers.get('cookie') ?? ''
			}
		}
	});
}
