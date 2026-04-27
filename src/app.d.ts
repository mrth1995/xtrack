// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from '@supabase/supabase-js';
import type { createServerClient } from '$lib/supabase/server';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Request-scoped Supabase server client, created once in hooks.server.ts and reused. */
			supabase: ReturnType<typeof createServerClient>;
			/** Authenticated user, or null if the request is unauthenticated. */
			user: User | null;
			/** Current session, or null if the request is unauthenticated. */
			session: Session | null;
			/** Household ID for the authenticated user, or null if not in a household. */
			householdId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
