import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrCreateActiveInviteCode } from '$lib/server/households/service';
import { createServerClient } from '$lib/supabase/server';

/**
 * Invite management page load function.
 * Shows the active invite code if one exists, or creates a new one.
 *
 * Implements D-22 through D-27: show current active code if valid,
 * auto-generate only when expired/used, show joined status after use.
 */
export const load: PageServerLoad = async (event) => {
	const { locals } = event;
	if (!locals.session) {
		redirect(303, '/auth');
	}

	const householdId = locals.householdId;
	if (!householdId) {
		redirect(303, '/onboarding');
	}

	const supabase = createServerClient(event);
	try {
		const invite = await getOrCreateActiveInviteCode(supabase, householdId);

		// Determine if the invite has been used (joined state)
		const isUsed = invite.used_at !== null;

		return {
			invite: {
				code: invite.code,
				expires_at: invite.expires_at,
				used_at: invite.used_at,
				used_by: invite.used_by,
				isUsed
			}
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Could not load invite';
		return {
			invite: null,
			error: message
		};
	}
};
