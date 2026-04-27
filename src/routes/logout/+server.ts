import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Logout endpoint.
 *
 * Signs out the current user and redirects back to the auth screen.
 * Accepts both GET and POST so it can be triggered from a link or a form action.
 *
 * The redirect is intentionally to /auth (not /) so the hook's auth guard does
 * not create an intermediate redirect loop.
 */
export const GET: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(303, '/auth');
};

export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase.auth.signOut();
	throw redirect(303, '/auth');
};
