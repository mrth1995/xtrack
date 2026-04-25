import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

let _browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for browser use.
 * Only uses PUBLIC_ keys — never has access to service_role.
 */
export function getSupabaseClient(): SupabaseClient {
	if (!_browserClient) {
		_browserClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: false
			}
		});
	}
	return _browserClient;
}
