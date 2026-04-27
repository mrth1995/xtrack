import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createHouseholdSchema } from '$lib/households/schemas';
import { createHousehold } from '$lib/server/households/service';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(303, '/auth');
	}
	if (locals.householdId) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.session) {
			throw redirect(303, '/auth');
		}

		const formData = await request.formData();
		const rawName = formData.get('name');

		// Validate using Zod schema
		const parsed = createHouseholdSchema.safeParse({ name: rawName });
		if (!parsed.success) {
			return fail(400, {
				error: parsed.error.issues[0]?.message ?? 'Invalid household name',
				name: typeof rawName === 'string' ? rawName : ''
			});
		}

		// Reuse the request-scoped client created in hooks.server.ts.
		const supabase = locals.supabase;
		try {
			await createHousehold(supabase, parsed.data.name);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to create household';
			return fail(500, {
				error: message,
				name: parsed.data.name
			});
		}

		throw redirect(303, '/');
	}
};
