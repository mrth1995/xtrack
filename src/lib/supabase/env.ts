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

	return {
		url: trimmedUrl,
		anonKey: trimmedAnonKey
	};
}
