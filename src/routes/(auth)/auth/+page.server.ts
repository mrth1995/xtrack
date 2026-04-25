import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerClient } from '$lib/supabase/server';
import { validateAuthForm } from '$lib/auth/schemas';

/**
 * Auth page load function.
 *
 * Handles SSR auth callback completion for PKCE redirects (`?code=...`) before
 * rendering the page. Redirect already-authenticated users directly to the app
 * so they do not see the auth screen unnecessarily.
 *
 * Redirect already-authenticated users directly to the app so they do not see
 * the auth screen unnecessarily.
 */
export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;
	const code = url.searchParams.get('code');

	if (code) {
		const supabase = createServerClient(event);
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			throw redirect(303, '/');
		}
	}

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
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				// Hosted Supabase projects default to Site URL when no redirect is
				// provided, which is often still localhost:3000. Use the current
				// request origin instead so confirmation emails return to this app.
				emailRedirectTo: new URL('/auth', event.url).toString()
			}
		});

		if (error) {
			return fail(400, {
				mode: 'signup',
				email,
				errors: {
					form: error.message ?? 'Could not create your account. Please try again.'
				}
			});
		}

		// Hosted Supabase projects usually require email confirmation. In that
		// case signUp returns a user but no session, so keep the user on /auth
		// and tell them to finish confirmation instead of redirecting into the
		// protected app unauthenticated.
		if (!data.session) {
			return {
				mode: 'signup' as const,
				email,
				success:
					'Check your email to confirm your account, then come back here to log in.'
			};
		}

		// Local dev with email confirmation disabled returns a session
		// immediately, so continue into the app.
		throw redirect(303, '/');
	}
};
