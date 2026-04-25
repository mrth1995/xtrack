import type { Handle } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/supabase/server';

/**
 * Server hook: initialises request-scoped locals for every request.
 *
 * Sets:
 *   event.locals.supabase   — request-scoped Supabase client (anon key)
 *   event.locals.session    — current auth session or null
 *   event.locals.householdId — household ID for the authenticated user or null
 *
 * Route-level redirects (auth guard, household guard) are handled in each
 * route's +page.server.ts / +layout.server.ts load function.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerSupabaseClient();
	event.locals.supabase = supabase;
	event.locals.session = null;
	event.locals.householdId = null;

	// Attempt to restore session from cookies
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (session) {
		event.locals.session = session;

		// Look up the user's household membership (v1: one household per user)
		const { data: membership } = await supabase
			.from('household_members')
			.select('household_id')
			.eq('user_id', session.user.id)
			.limit(1)
			.maybeSingle();

		if (membership?.household_id) {
			event.locals.householdId = membership.household_id;
		}
	}

	return resolve(event);
};
