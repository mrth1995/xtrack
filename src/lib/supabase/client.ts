import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';

/**
 * Browser-side Supabase client.
 *
 * Uses only PUBLIC_ prefixed environment variables that are safe for the
 * client bundle. The service-role key must never appear here.
 */
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	auth: {
		// Persist the session in localStorage so it survives page reloads
		// and app switches in iOS standalone mode.
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: false
	}
});
