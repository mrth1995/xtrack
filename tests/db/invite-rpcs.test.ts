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
