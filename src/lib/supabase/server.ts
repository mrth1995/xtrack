import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Create a request-scoped Supabase client for server-side code (hooks, load
 * functions, server actions).
 *
 * Uses the SvelteKit cookies API so auth sessions can be restored from and
 * written back to cookies during SSR flows such as sign-in, sign-out, and
 * email confirmation redirects.
 */
export function createServerClient(event: RequestEvent) {
	return createSsrServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, {
						...options,
						path: options.path ?? '/'
					});
				}
			}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
