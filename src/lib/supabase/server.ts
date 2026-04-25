import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Creates a request-scoped Supabase client for server-side usage.
 * Called from hooks.server.ts or server load functions.
 * Uses the public anon key — row-level security handles access control.
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY must never be used here.
 * Service-role bypass is only allowed in trusted GitHub Actions contexts.
 */
export function createServerSupabaseClient(): SupabaseClient {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		}
	});
}
