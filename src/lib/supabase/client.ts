import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import { validateSupabasePublicEnv } from './env';
import { indexedDbSessionStorage } from '$lib/auth/indexeddb-storage';

const supabaseEnv = validateSupabasePublicEnv(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

/**
 * Browser-side Supabase client with IndexedDB-backed session persistence.
 *
 * Uses only PUBLIC_ prefixed environment variables. `detectSessionInUrl`
 * stays enabled so signup confirmation and other auth redirects can consume
 * tokens from the URL fragment and persist the session for SSR requests.
 *
 * IndexedDB is used as the auth storage backend (via indexedDbSessionStorage)
 * so sessions survive the Safari → Standalone (Home Screen) context boundary
 * on iOS. Without this, users are logged out every time they open the PWA
 * from the Home Screen because Safari and the installed-app container have
 * separate localStorage contexts.
 */
export const supabase = createBrowserClient<Database>(
	supabaseEnv.url,
	supabaseEnv.anonKey,
	{
		auth: {
			storage: indexedDbSessionStorage,
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	}
);
