import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Onboarding choice screen load function.
 * Users without a household land here after auth.
 * Redirects users who already have a household to the app shell.
 */
export const load: PageServerLoad = async ({ locals }) => {
	// If user is not authenticated, redirect to auth
	if (!locals.session) {
		throw redirect(303, '/auth');
	}

	// If user already has a household, redirect to app shell
	if (locals.householdId) {
		throw redirect(303, '/');
	}

	return {};
};
