import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';

/**
 * Browser-side Supabase client with SSR-compatible cookie persistence.
 *
 * Uses only PUBLIC_ prefixed environment variables. `detectSessionInUrl`
 * stays enabled so signup confirmation and other auth redirects can consume
 * tokens from the URL fragment and persist the session for SSR requests.
 */
export const supabase = createBrowserClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	{
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true
	}
	}
);
