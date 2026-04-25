// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
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
