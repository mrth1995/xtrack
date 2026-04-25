import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { joinHouseholdSchema } from '$lib/households/schemas';
import { lookupInviteCode, acceptHouseholdInvite } from '$lib/server/households/service';
import type { HouseholdServiceError } from '$lib/server/households/service';
import { createServerClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		redirect(303, '/auth');
	}
	if (locals.householdId) {
		redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	/**
	 * Lookup action: validates and looks up the invite code to show household
	 * name confirmation. Does not join the household yet.
	 */
	lookupInvite: async (event) => {
		const { request, locals } = event;
		if (!locals.session) {
			redirect(303, '/auth');
		}

		const formData = await request.formData();
		const rawCode = formData.get('code');

		const parsed = joinHouseholdSchema.safeParse({ code: rawCode });
		if (!parsed.success) {
			return fail(400, {
				step: 'entry' as const,
				error: parsed.error.issues[0]?.message ?? 'Invalid invite code',
				code: typeof rawCode === 'string' ? rawCode : ''
			});
		}

		const supabase = createServerClient(event);
		try {
			const result = await lookupInviteCode(supabase, parsed.data.code);
			// Show confirmation step with household name per D-08
			return {
				step: 'confirm' as const,
				code: parsed.data.code,
				householdName: result.household.name,
				householdId: result.household.id,
				error: null
			};
		} catch (err: unknown) {
			const svcError = err as HouseholdServiceError;
			return fail(400, {
				step: 'entry' as const,
				error: svcError.message ?? 'That code is invalid, expired, or already used. Ask for a new code and try again.',
				code: parsed.data.code
			});
		}
	},

	/**
	 * Join action: accepts the confirmed invite code and joins the household.
	 * Only called after the user has seen the confirmation step.
	 */
	join: async (event) => {
		const { request, locals } = event;
		if (!locals.session) {
			redirect(303, '/auth');
		}

		const formData = await request.formData();
		const rawCode = formData.get('code');

		const parsed = joinHouseholdSchema.safeParse({ code: rawCode });
		if (!parsed.success) {
			return fail(400, {
				step: 'entry' as const,
				error: 'Invalid invite code',
				code: typeof rawCode === 'string' ? rawCode : ''
			});
		}

		const supabase = createServerClient(event);
		try {
			await acceptHouseholdInvite(supabase, parsed.data.code);
		} catch (err: unknown) {
			const svcError = err as HouseholdServiceError;
			return fail(400, {
				step: 'entry' as const,
				error: svcError.message ?? 'That code is invalid, expired, or already used. Ask for a new code and try again.',
				code: parsed.data.code
			});
		}

		redirect(303, '/');
	}
};
