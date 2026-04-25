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
	event.locals.user = session?.user ?? null;
	event.locals.householdId = null;

	if (session) {
		// Look up the user's household membership (v1: one household per user)
		const { data } = await supabase
			.from('household_members')
			.select('household_id')
			.eq('user_id', session.user.id)
			.limit(1)
			.maybeSingle();
		const membership = data as { household_id: string } | null;

		if (membership?.household_id) {
			event.locals.householdId = membership.household_id;
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
