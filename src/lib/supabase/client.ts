import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import { validateSupabasePublicEnv } from './env';

const supabaseEnv = validateSupabasePublicEnv(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

/**
 * Browser-side Supabase client with SSR-compatible cookie persistence.
 *
 * Uses only PUBLIC_ prefixed environment variables. `detectSessionInUrl`
 * stays enabled so signup confirmation and other auth redirects can consume
 * tokens from the URL fragment and persist the session for SSR requests.
 */
export const supabase = createBrowserClient<Database>(
	supabaseEnv.url,
	supabaseEnv.anonKey,
	{
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true
	}
	}
);
