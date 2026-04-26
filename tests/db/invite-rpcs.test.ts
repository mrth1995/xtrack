import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Invite RPC schema coverage', () => {
	it('defines lookup and active-reuse invite RPCs in migrations', () => {
		const lookupMigration = readFileSync(
			resolve('supabase/migrations/2026042601_invite_lookup_rpc.sql'),
			'utf8'
		);
		const reuseMigration = readFileSync(
			resolve('supabase/migrations/2026042602_invite_reuse_rpc.sql'),
			'utf8'
		);

		expect(lookupMigration).toContain('lookup_household_invite');
		expect(reuseMigration).toContain('get_or_create_active_household_invite');
		expect(reuseMigration).toContain('SECURITY DEFINER');
		expect(reuseMigration).toContain('used_at IS NULL');
		expect(reuseMigration).toContain('revoked_at IS NULL');
		expect(reuseMigration).toContain('expires_at > now()');
	});

	it('mirrors invite RPCs in generated database types', () => {
		const databaseTypes = readFileSync(resolve('src/lib/types/database.ts'), 'utf8');

		expect(databaseTypes).toContain('lookup_household_invite');
		expect(databaseTypes).toContain('get_or_create_active_household_invite');
		expect(databaseTypes).toContain('Args: { p_household_id: string }');
	});
});

describe('Phase 1 RLS — SECURITY DEFINER membership helper', () => {
	const baseMigration = readFileSync(
		resolve('supabase/migrations/2026042501_phase1_foundation.sql'),
		'utf8'
	);

	it('defines the is_household_member SECURITY DEFINER helper', () => {
		expect(baseMigration).toContain('CREATE OR REPLACE FUNCTION public.is_household_member');
	});

	it('is_household_member has SECURITY DEFINER, STABLE, and SET search_path = public', () => {
		// Find the function block
		const fnStart = baseMigration.indexOf('CREATE OR REPLACE FUNCTION public.is_household_member');
		expect(fnStart).toBeGreaterThan(-1);
		// Extract text from function start to the closing $$
		const fnEnd = baseMigration.indexOf('$$;', fnStart);
		const fnBlock = baseMigration.slice(fnStart, fnEnd + 3);
		expect(fnBlock).toContain('SECURITY DEFINER');
		expect(fnBlock).toContain('STABLE');
		expect(fnBlock).toContain('SET search_path = public');
	});

	it('RLS policies use public.is_household_member for household, members, invites, and expenses', () => {
		expect(baseMigration).toContain(
			'public.is_household_member(public.households.id)'
		);
		expect(baseMigration).toContain(
			'public.is_household_member(public.household_members.household_id)'
		);
		expect(baseMigration).toContain(
			'public.is_household_member(public.household_invites.household_id)'
		);
		expect(baseMigration).toContain(
			'public.is_household_member(public.expenses.household_id)'
		);
	});

	it('migration no longer uses unqualified self-referential RLS patterns', () => {
		// These patterns indicate a self-referential membership subquery inside a policy
		// that references the outer table's unqualified column — the old buggy pattern
		expect(baseMigration).not.toMatch(/hm\.household_id = (?:id|household_id)(?!\s*=\s*p_)/);
	});
});
