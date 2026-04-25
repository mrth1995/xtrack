import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/supabase/server';

/**
 * Global server hook.
 *
 * Responsibilities:
 * 1. Create a request-scoped Supabase client and restore the session from cookies.
 * 2. Attach `user`, `session`, and `householdId` to `event.locals`.
 * 3. Guard all `(app)` routes: redirect unauthenticated requests to `/auth`.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(event);

	const {
		data: { session }
	} = await supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = null;
	event.locals.householdId = null;

	if (session) {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		event.locals.user = user;
	}

	if (event.locals.user) {
		// Resolve the user's household through the SECURITY DEFINER helper.
		// This avoids depending on direct household_members reads during the
		// first request after onboarding actions.
		const { data, error } = await supabase.rpc('current_household_id');

		if (!error && data) {
			event.locals.householdId = data as string;
		}
	}

	const path = event.url.pathname;

	const isPublicPath =
		path === '/auth' ||
		path.startsWith('/auth') ||
		path === '/logout' ||
		path.startsWith('/logout') ||
		path.startsWith('/_app') ||
		path.startsWith('/favicon') ||
		path.startsWith('/manifest');

	if (!isPublicPath && !event.locals.user) {
		throw redirect(303, '/auth');
	}

	return resolve(event);
};
