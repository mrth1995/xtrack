// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Request-scoped Supabase client (anon key, RLS enforced) */
			supabase: SupabaseClient | null;
			/** Current authenticated session, or null if unauthenticated */
			session: Session | null;
			/** Household ID for the authenticated user, or null if not in a household */
			householdId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
