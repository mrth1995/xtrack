#!/usr/bin/env node
/**
 * scripts/verify-phase1-supabase-env.mjs
 *
 * Preflight check for Phase 1 Supabase environment setup.
 *
 * Validates that PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY are set to real Supabase project values.
 *
 * Security: this script validates presence and shape only.
 * It does NOT print secret values. It does NOT call fetch().
 *
 * Exit 0: env looks ready.
 * Exit 1: env is missing or contains placeholder values.
 */

const SETUP_HINT =
	'Set PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY with real Supabase project values, then retry.';

const PLACEHOLDER_ANON_KEYS = new Set(['placeholder', 'your-anon-key', 'replace-me']);
const MIN_KEY_LENGTH = 20;

function fail(message) {
	process.stderr.write(message + '\n');
	process.stderr.write(SETUP_HINT + '\n');
	process.exit(1);
}

// --- PUBLIC_SUPABASE_URL ---
const rawUrl = (process.env.PUBLIC_SUPABASE_URL ?? '').trim();

if (!rawUrl) {
	fail('PUBLIC_SUPABASE_URL is missing.');
}

if (rawUrl.includes('placeholder.supabase.co')) {
	fail('PUBLIC_SUPABASE_URL still points at placeholder.supabase.co. Replace it with your real project URL.');
}

let parsedUrl;
try {
	parsedUrl = new URL(rawUrl);
} catch {
	fail('PUBLIC_SUPABASE_URL must be a valid URL.');
}

if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
	fail('PUBLIC_SUPABASE_URL must use http or https.');
}

// --- PUBLIC_SUPABASE_ANON_KEY ---
const rawAnonKey = (process.env.PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!rawAnonKey) {
	fail('PUBLIC_SUPABASE_ANON_KEY is missing.');
}

if (PLACEHOLDER_ANON_KEYS.has(rawAnonKey.toLowerCase())) {
	fail('PUBLIC_SUPABASE_ANON_KEY contains a placeholder value. Replace it with your real anon key.');
}

if (rawAnonKey.length < MIN_KEY_LENGTH) {
	fail(
		`PUBLIC_SUPABASE_ANON_KEY is too short (${rawAnonKey.length} chars). Real anon keys are at least ${MIN_KEY_LENGTH} characters.`
	);
}

// --- SUPABASE_SERVICE_ROLE_KEY ---
const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

if (!rawServiceKey) {
	fail('SUPABASE_SERVICE_ROLE_KEY is missing.');
}

// Success
process.stdout.write('Supabase Phase 1 env looks ready.\n');
process.exit(0);
