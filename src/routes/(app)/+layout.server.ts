import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Layout server load for the (app) protected route group.
 *
 * The global hook in hooks.server.ts already redirects unauthenticated requests,
 * but this secondary guard provides defence-in-depth: if a request somehow
 * reaches this layout without a valid user in locals, redirect to auth
 * immediately rather than rendering a broken authenticated shell.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	return {
		user: locals.user,
		session: locals.session
	};
};
