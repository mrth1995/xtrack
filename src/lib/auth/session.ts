import { supabase } from '$lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Detect whether the app is running in iOS standalone mode (launched from the
 * Home Screen via "Add to Home Screen").
 *
 * In standalone mode, Safari and the installed app run in separate contexts.
 * A session established in Safari will NOT be available in standalone on first
 * launch; this function lets callers detect that scenario and trigger a restore.
 */
export function isStandalone(): boolean {
	if (typeof navigator === 'undefined') return false;
	// iOS Safari sets navigator.standalone = true in standalone mode.
	// The cast is needed because TypeScript's lib.dom.d.ts does not include it.
	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Attempt to restore or refresh the current session.
 *
 * Call this on app boot in standalone mode before rendering the protected shell.
 * If the session is still valid (token not expired) the supabase-js client will
 * refresh it automatically. If no usable session exists the returned `session`
 * will be null — the caller must redirect to auth in that case.
 *
 * Returns:
 *   { session, user }  — both non-null if restore succeeded
 *   { session: null, user: null } — if no session could be restored
 */
export async function restoreSession(): Promise<{ session: Session | null; user: User | null }> {
	const { data, error } = await supabase.auth.getSession();

	if (error || !data.session) {
		// Attempt a token refresh in case the access token is stale but the
		// refresh token is still valid (common after the device wakes from sleep).
		const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
		if (refreshError || !refreshed.session) {
			return { session: null, user: null };
		}
		return { session: refreshed.session, user: refreshed.user };
	}

	return { session: data.session, user: data.session.user };
}

/**
 * Standalone-aware session gate.
 *
 * In standalone mode, always attempt a session restore before the caller
 * decides whether to render the protected shell. In regular browser mode the
 * server's session check is authoritative; this function is a no-op client
 * safety net.
 *
 * Returns:
 *   { authenticated: true, session, user } — app can render the protected shell
 *   { authenticated: false } — caller must redirect to /auth
 */
export async function getSessionGate(): Promise<
	| { authenticated: true; session: Session; user: User }
	| { authenticated: false; session: null; user: null }
> {
	const { session, user } = await restoreSession();

	if (!session || !user) {
		return { authenticated: false, session: null, user: null };
	}

	return { authenticated: true, session, user };
}
