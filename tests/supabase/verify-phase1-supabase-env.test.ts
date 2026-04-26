/**
 * CLI script verification tests for scripts/verify-phase1-supabase-env.mjs
 *
 * These tests exercise the exit codes and output of the standalone Node.js
 * verification script (not the library function). They run the script as a
 * child process so they test the actual CLI behavior described in the plan.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT = resolve(process.cwd(), 'scripts/verify-phase1-supabase-env.mjs');

function runScript(env: Record<string, string> = {}): { exitCode: number; output: string } {
	const result = spawnSync(process.execPath, [SCRIPT], {
		env: { ...process.env, ...env },
		encoding: 'utf8',
		timeout: 5000
	});
	const output = (result.stdout ?? '') + (result.stderr ?? '');
	return { exitCode: result.status ?? 1, output };
}

describe('verify-phase1-supabase-env CLI', () => {
	it('exits non-zero and prints PUBLIC_SUPABASE_URL is missing when URL is absent', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: '',
			PUBLIC_SUPABASE_ANON_KEY: '',
			SUPABASE_SERVICE_ROLE_KEY: ''
		});
		expect(exitCode).not.toBe(0);
		expect(output).toContain('PUBLIC_SUPABASE_URL is missing');
	});

	it('exits non-zero and prints placeholder message when URL contains placeholder.supabase.co', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
			PUBLIC_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz',
			SUPABASE_SERVICE_ROLE_KEY: 'abcdefghijklmnopqrstuvwxyz'
		});
		expect(exitCode).not.toBe(0);
		expect(output).toContain('placeholder.supabase.co');
	});

	it('exits non-zero when anon key is missing', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
			PUBLIC_SUPABASE_ANON_KEY: '',
			SUPABASE_SERVICE_ROLE_KEY: 'abcdefghijklmnopqrstuvwxyz'
		});
		expect(exitCode).not.toBe(0);
		expect(output).toContain('PUBLIC_SUPABASE_ANON_KEY');
	});

	it('exits non-zero when service role key is missing', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
			PUBLIC_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz',
			SUPABASE_SERVICE_ROLE_KEY: ''
		});
		expect(exitCode).not.toBe(0);
		expect(output).toContain('SUPABASE_SERVICE_ROLE_KEY');
	});

	it('exits 0 and prints Supabase Phase 1 env looks ready with real-looking values', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
			PUBLIC_SUPABASE_ANON_KEY: 'abcdefghijklmnopqrstuvwxyz',
			SUPABASE_SERVICE_ROLE_KEY: 'abcdefghijklmnopqrstuvwxyz'
		});
		expect(exitCode).toBe(0);
		expect(output).toContain('Supabase Phase 1 env looks ready.');
	});

	it('includes setup hint in failure output', () => {
		const { exitCode, output } = runScript({
			PUBLIC_SUPABASE_URL: '',
			PUBLIC_SUPABASE_ANON_KEY: '',
			SUPABASE_SERVICE_ROLE_KEY: ''
		});
		expect(exitCode).not.toBe(0);
		expect(output).toContain('Set PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY');
	});
});
