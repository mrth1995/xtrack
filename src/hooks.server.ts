import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { createServerClient } from '$lib/supabase/server';

/**
 * Global server hook.
 *
 * Responsibilities:
 * 1. Create a request-scoped Supabase client and attempt to restore the session
 *    from the request's Cookie header.
 * 2. Attach `user` and `session` to `event.locals` so all server load functions
 *    and actions can access auth state without re-fetching.
 * 3. Guard all `(app)` routes: redirect unauthenticated requests to `/auth`.
 *
 * Auth route (`/auth`, `/logout`) and static assets are exempt from the guard.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(event);

	// Attempt to restore the session from the cookie.
	const {
		data: { session }
	} = await supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = session?.user ?? null;

	const path = event.url.pathname;

	// Determine whether this path is inside the protected (app) group.
	// The (app) route group is typically mounted at the root after auth;
	// we protect everything except explicitly public paths.
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
