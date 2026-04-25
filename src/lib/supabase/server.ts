import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Create a request-scoped Supabase client for server-side code (hooks, load
 * functions, server actions).
 *
 * This helper reads the session from the request's cookie/auth header so each
 * server request uses the authenticated user's context. It uses the anon key
 * only — the service-role key must never appear in this client.
 *
 * Pass the request event so the client can read and write auth cookies.
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
				// Forward the cookie header so Supabase can restore the session
				// from HttpOnly cookies set by the auth helpers.
				Cookie: event.request.headers.get('cookie') ?? ''
			}
		}
	});
}
