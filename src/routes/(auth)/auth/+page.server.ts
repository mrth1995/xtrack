import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerClient } from '$lib/supabase/server';
import { validateAuthForm } from '$lib/auth/schemas';

/**
 * Auth page load function.
 *
 * Redirect already-authenticated users directly to the app so they do not see
 * the auth screen unnecessarily.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	/**
	 * Log in with email and password.
	 */
	login: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '');
		const password = String(formData.get('password') ?? '');

		const errors = validateAuthForm({ email, password });
		if (Object.keys(errors).length > 0) {
			return fail(400, { mode: 'login', email, errors });
		}

		const supabase = createServerClient(event);
		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, {
				mode: 'login',
				email,
				errors: {
					form: "Email or password didn't match. Try again."
				}
			});
		}

		throw redirect(303, '/');
	},

	/**
	 * Sign up with email and password.
	 *
	 * On success, the session is created immediately (email confirmation is
	 * disabled in local dev via supabase/config.toml) and the user is sent into
	 * household onboarding rather than a separate email-confirmation step.
	 */
	signup: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '');
		const password = String(formData.get('password') ?? '');

		const errors = validateAuthForm({ email, password });
		if (Object.keys(errors).length > 0) {
			return fail(400, { mode: 'signup', email, errors });
		}

		const supabase = createServerClient(event);
		const { error } = await supabase.auth.signUp({ email, password });

		if (error) {
			return fail(400, {
				mode: 'signup',
				email,
				errors: {
					form: error.message ?? 'Could not create your account. Please try again.'
				}
			});
		}

		// Session is available immediately — continue into the app.
		throw redirect(303, '/');
	}
};
