export interface SupabasePublicEnv {
	url: string;
	anonKey: string;
}

const SETUP_HINT =
	'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env with real Supabase project values, then restart the dev server.';

function fail(message: string): never {
	throw new Error(`${message} ${SETUP_HINT}`);
}

export function validateSupabasePublicEnv(
	url: string | undefined,
	anonKey: string | undefined
): SupabasePublicEnv {
	const trimmedUrl = url?.trim() ?? '';
	const trimmedAnonKey = anonKey?.trim() ?? '';

	if (!trimmedUrl) {
		fail('PUBLIC_SUPABASE_URL is missing.');
	}

	if (trimmedUrl.includes('placeholder.supabase.co')) {
		fail('PUBLIC_SUPABASE_URL still points at placeholder.supabase.co.');
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(trimmedUrl);
	} catch {
		fail('PUBLIC_SUPABASE_URL must be a valid URL.');
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		fail('PUBLIC_SUPABASE_URL must use http or https.');
	}

	if (!trimmedAnonKey) {
		fail('PUBLIC_SUPABASE_ANON_KEY is missing.');
	}

	// Reject well-known placeholder values before any network request can fire
	// against an incorrect host. These names are commonly copy-pasted from docs
	// or scaffolding and will cause opaque DNS/fetch failures if not caught here.
	const ANON_KEY_PLACEHOLDERS = ['placeholder', 'your-anon-key', 'replace-me'];
	if (ANON_KEY_PLACEHOLDERS.includes(trimmedAnonKey.toLowerCase())) {
		fail('PUBLIC_SUPABASE_ANON_KEY still contains a placeholder value.');
	}

	// Real Supabase anon keys are JWT strings — always longer than 20 characters.
	// A value shorter than this cannot be a real key and is likely a placeholder.
	if (trimmedAnonKey.length < 20) {
		fail('PUBLIC_SUPABASE_ANON_KEY is too short to be a Supabase anon key.');
	}

	return {
		url: trimmedUrl,
		anonKey: trimmedAnonKey
	};
}
