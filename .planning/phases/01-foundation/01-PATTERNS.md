# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 43
**Analogs found:** 43 / 43

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | batch | `package.json` | exact-current |
| `svelte.config.js` | config | request-response | `svelte.config.js` | exact-current |
| `vite.config.ts` | config | batch | `vite.config.ts` | exact-current |
| `vitest.config.ts` | config | batch | `vitest.config.ts` | exact-current |
| `tsconfig.json` | config | batch | `tsconfig.json` | exact-current |
| `.gitignore` | config | file-I/O | `.gitignore` | exact-current |
| `src/app.html` | component | request-response | `src/app.html` | exact-current |
| `src/app.d.ts` | config | request-response | `src/app.d.ts` | exact-current |
| `src/app.css` | component | transform | `src/app.css` | exact-current |
| `src/routes/+layout.svelte` | component | request-response | `src/routes/+layout.svelte` | exact-current |
| `src/lib/types/database.ts` | model | transform | `src/lib/types/database.ts` | exact-current |
| `src/lib/supabase/env.ts` | utility | transform | `src/lib/supabase/env.ts` | exact-current |
| `src/lib/supabase/client.ts` | service | request-response | `src/lib/supabase/client.ts` | exact-current |
| `src/lib/supabase/server.ts` | service | request-response | `src/lib/supabase/server.ts` | exact-current |
| `src/hooks.server.ts` | middleware | request-response | `src/hooks.server.ts` | exact-current |
| `src/lib/auth/schemas.ts` | utility | transform | `src/lib/auth/schemas.ts` | exact-current |
| `src/lib/auth/session.ts` | service | request-response | `src/lib/auth/session.ts` | exact-current |
| `src/routes/(auth)/auth/+page.server.ts` | route | request-response | `src/routes/(auth)/auth/+page.server.ts` | exact-current |
| `src/routes/(auth)/auth/+page.svelte` | component | request-response | `src/routes/(auth)/auth/+page.svelte` | exact-current |
| `src/routes/logout/+server.ts` | route | request-response | `src/routes/logout/+server.ts` | exact-current |
| `src/routes/(app)/+layout.server.ts` | route | request-response | `src/routes/(app)/+layout.server.ts` | exact-current |
| `src/lib/households/schemas.ts` | utility | transform | `src/lib/households/schemas.ts` | exact-current |
| `src/lib/server/households/service.ts` | service | CRUD | `src/lib/server/households/service.ts` | exact-current |
| `src/routes/(app)/onboarding/+page.server.ts` | route | request-response | `src/routes/(app)/onboarding/create/+page.server.ts` | role-match |
| `src/routes/(app)/onboarding/+page.svelte` | component | request-response | `src/routes/(app)/onboarding/join/+page.svelte` | role-match |
| `src/routes/(app)/onboarding/create/+page.server.ts` | route | request-response | `src/routes/(app)/onboarding/create/+page.server.ts` | exact-current |
| `src/routes/(app)/onboarding/create/+page.svelte` | component | request-response | `src/routes/(app)/onboarding/join/+page.svelte` | role-match |
| `src/routes/(app)/onboarding/join/+page.server.ts` | route | request-response | `src/routes/(app)/onboarding/join/+page.server.ts` | exact-current |
| `src/routes/(app)/onboarding/join/+page.svelte` | component | request-response | `src/routes/(app)/onboarding/join/+page.svelte` | exact-current |
| `src/routes/(app)/settings/invite/+page.server.ts` | route | request-response | `src/routes/(app)/settings/invite/+page.server.ts` | exact-current |
| `src/routes/(app)/settings/invite/+page.svelte` | component | request-response | `src/routes/(app)/onboarding/join/+page.svelte` | role-match |
| `src/routes/(app)/+page.server.ts` | route | CRUD | `src/routes/(app)/+page.server.ts` | exact-current |
| `src/routes/(app)/+page.svelte` | component | request-response | `src/routes/(app)/+page.svelte` | exact-current |
| `src/routes/(app)/household/+page.server.ts` | route | CRUD | `src/routes/(app)/household/+page.server.ts` | exact-current |
| `src/routes/(app)/household/+page.svelte` | component | request-response | `src/routes/(app)/+page.svelte` | role-match |
| `src/lib/install/visibility.ts` | utility | transform | `src/lib/install/visibility.ts` | exact-current |
| `src/lib/components/InstallGuidanceBanner.svelte` | component | event-driven | `src/lib/components/InstallGuidanceBanner.svelte` | exact-current |
| `supabase/config.toml` | config | batch | `supabase/config.toml` | exact-current |
| `supabase/migrations/2026042501_phase1_foundation.sql` | migration | CRUD | `supabase/migrations/2026042501_phase1_foundation.sql` | exact-current |
| `supabase/seed.sql` | migration | batch | `supabase/seed.sql` | exact-current |
| `tests/**/*.test.ts` | test | batch | `tests/db/phase1-rls.test.ts`, `tests/households/shared-shell.test.ts` | role-match |
| `.github/workflows/supabase-keepalive.yml` | config | batch | `.github/workflows/supabase-keepalive.yml` | exact-current |
| `scripts/supabase-keepalive.mjs` | utility | request-response | `scripts/supabase-keepalive.mjs` | exact-current |
| `docs/ops/supabase-keepalive.md` | config | file-I/O | `docs/ops/supabase-keepalive.md` | exact-current |

## Pattern Assignments

### Scaffold and Tooling Files

**Applies to:** `package.json`, `vite.config.ts`, `vitest.config.ts`, `src/app.css`, `tests/setup.ts`

**Analogs:** `package.json`, `vite.config.ts`, `vitest.config.ts`, `src/app.css`, `tests/setup.ts`

**Package scripts/dependencies pattern** (`package.json` lines 5-18):
```json
"scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "test": "vitest run",
  "test:unit": "vitest run"
},
"dependencies": {
  "@supabase/ssr": "^0.10.2",
  "@supabase/supabase-js": "^2.104.1",
  "lucide-svelte": "^0.477.0",
  "zod": "^4.3.6"
}
```

**Vite/Tailwind plugin pattern** (`vite.config.ts` lines 1-7):
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
```

**Design-token CSS pattern** (`src/app.css` lines 1-20):
```css
@import "tailwindcss";

:root {
  --color-bg: #F7F3EB;
  --color-surface: #E7DED0;
  --color-accent: #176B5D;
  --color-accent-foreground: #FFFFFF;
  --color-destructive: #B9382F;
  --color-foreground: #1A1A1A;
  --color-muted: #6B6560;
}
```

**Vitest Svelte/jsdom pattern** (`vitest.config.ts` lines 1-23):
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		conditions: ['browser'],
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true
	}
});
```

**Browser API test stubs** (`tests/setup.ts` lines 3-17, 45-53):
```typescript
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string): MediaQueryList => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	})
});

if (!('standalone' in navigator)) {
	Object.defineProperty(navigator, 'standalone', {
		get: () => false,
		configurable: true
	});
}
```

---

### Supabase Client, Env, and Types

**Applies to:** `src/lib/supabase/env.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/types/database.ts`

**Analog:** `src/lib/supabase/server.ts`

**Imports pattern** (`src/lib/supabase/server.ts` lines 1-5):
```typescript
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';
import type { RequestEvent } from '@sveltejs/kit';
import { validateSupabasePublicEnv } from './env';
```

**Environment validation pattern** (`src/lib/supabase/env.ts` lines 13-47):
```typescript
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

	if (!trimmedAnonKey) {
		fail('PUBLIC_SUPABASE_ANON_KEY is missing.');
	}

	return { url: trimmedUrl, anonKey: trimmedAnonKey };
}
```

**Request-scoped Supabase SSR client pattern** (`src/lib/supabase/server.ts` lines 17-36):
```typescript
export function createServerClient(event: RequestEvent) {
	return createSsrServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, {
						...options,
						path: options.path ?? '/'
					});
				}
			}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
```

**Database type mirror pattern** (`src/lib/types/database.ts` lines 11-24, 136-183):
```typescript
export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string | null;
					display_name: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email?: string | null;
```

```typescript
Functions: {
	create_household_with_owner: {
		Args: { p_name: string };
		Returns: { id: string; name: string; created_by: string; created_at: string };
	};
	lookup_household_invite: {
		Args: { p_code: string };
		Returns: Array<{
			household_id: string;
			household_name: string;
			code: string;
			expires_at: string;
		}>;
	};
	current_household_id: {
		Args: Record<string, never>;
		Returns: string | null;
	};
};
```

---

### Auth Guards and Server Actions

**Applies to:** `src/hooks.server.ts`, `src/routes/(app)/+layout.server.ts`, `src/routes/(auth)/auth/+page.server.ts`, `src/routes/(auth)/auth/+page.svelte`, `src/routes/logout/+server.ts`, `src/lib/auth/*`

**Analogs:** `src/hooks.server.ts`, `src/routes/(auth)/auth/+page.server.ts`

**Global auth/session hook pattern** (`src/hooks.server.ts` lines 13-41):
```typescript
export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(event);

	const {
		data: { session }
	} = await supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = null;
	event.locals.householdId = null;

	if (session) {
		const {
			data: { user }
		} = await supabase.auth.getUser();

		event.locals.user = user;
	}

	if (event.locals.user) {
		const { data, error } = await supabase.rpc('current_household_id');

		if (!error && data) {
			event.locals.householdId = data as string;
		}
	}
```

**Protected-route redirect pattern** (`src/hooks.server.ts` lines 43-59):
```typescript
const path = event.url.pathname;

const isPublicPath =
	path === '/auth' ||
	path.startsWith('/auth') ||
	path === '/logout' ||
	path.startsWith('/logout') ||
	path.startsWith('/_app') ||
	path.startsWith('/favicon') ||
	path.startsWith('/manifest');

if (!isPublicPath && !event.locals.user) {
	throw redirect(303, '/auth');
}

return resolve(event);
```

**Layout defence-in-depth pattern** (`src/routes/(app)/+layout.server.ts` lines 12-21):
```typescript
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	return {
		user: locals.user,
		session: locals.session
	};
};
```

**Auth server action validation/error pattern** (`src/routes/(auth)/auth/+page.server.ts` lines 40-64):
```typescript
login: async (event) => {
	const formData = await event.request.formData();
	const email = String(formData.get('email') ?? '');
	const password = String(formData.get('password') ?? '');

	const errors = validateAuthForm({ email, password });
	if (Object.keys(errors).length > 0) {
		return fail(400, { mode: 'login', email, errors });
	}

	const supabase = createServerClient(event);
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		return fail(400, {
			mode: 'login',
			email,
			errors: {
				form: "Email or password didn't match. Try again."
			}
		});
	}

	throw redirect(303, '/');
},
```

**Auth callback/session exchange pattern** (`src/routes/(auth)/auth/+page.server.ts` lines 16-33):
```typescript
export const load: PageServerLoad = async (event) => {
	const { locals, url } = event;
	const code = url.searchParams.get('code');

	if (code) {
		const supabase = createServerClient(event);
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			throw redirect(303, '/');
		}
	}

	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};
```

**Standalone session helper pattern** (`src/lib/auth/session.ts` lines 12-17, 31-45):
```typescript
export function isStandalone(): boolean {
	if (typeof navigator === 'undefined') return false;
	return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function restoreSession(): Promise<{ session: Session | null; user: User | null }> {
	const { data, error } = await supabase.auth.getSession();

	if (error || !data.session) {
		const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
		if (refreshError || !refreshed.session) {
			return { session: null, user: null };
		}
		return { session: refreshed.session, user: refreshed.user };
	}

	return { session: data.session, user: data.session.user };
}
```

---

### Household Onboarding and Invite Services

**Applies to:** `src/lib/households/schemas.ts`, `src/lib/server/households/service.ts`, `src/routes/(app)/onboarding/**`, `src/routes/(app)/settings/invite/**`

**Analogs:** `src/lib/server/households/service.ts`, `src/routes/(app)/onboarding/join/+page.server.ts`, `src/routes/(app)/onboarding/join/+page.svelte`

**Zod schema pattern** (`src/lib/households/schemas.ts` lines 1-29):
```typescript
import { z } from 'zod';

export const createHouseholdSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Household name is required')
		.max(80, 'Household name must be 80 characters or fewer')
});

export const joinHouseholdSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, 'Invite code is required')
		.max(20, 'Invite code is too long')
		.transform((v) => v.toUpperCase())
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
```

**RPC-backed service pattern** (`src/lib/server/households/service.ts` lines 50-57, 118-139):
```typescript
export async function createHousehold(
	client: SupabaseClient,
	name: string
): Promise<HouseholdRow> {
	const { data, error } = await client.rpc('create_household_with_owner', { p_name: name });
	if (error) throw new Error(error.message);
	return data as HouseholdRow;
}
```

```typescript
export async function acceptHouseholdInvite(
	client: SupabaseClient,
	code: string
): Promise<AcceptInviteResult> {
	const upperCode = code.trim().toUpperCase();

	const { data, error } = await client.rpc('accept_household_invite', { p_code: upperCode });

	if (error) {
		const rawHint = error.hint as string | undefined;
		const resolvedHint: InviteErrorHint | 'unknown' = isKnownInviteHint(rawHint)
			? rawHint
			: 'unknown';
		const svcError: HouseholdServiceError = {
			hint: resolvedHint,
			message: 'That code is invalid, expired, or already used. Ask for a new code and try again.'
		};
		throw svcError;
	}

	return { household: data as HouseholdRow };
}
```

**Two-step join server action pattern** (`src/routes/(app)/onboarding/join/+page.server.ts` lines 23-60, 66-97):
```typescript
lookupInvite: async (event) => {
	const { request, locals } = event;
	if (!locals.session) {
		throw redirect(303, '/auth');
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
```

```typescript
join: async (event) => {
	const { request, locals } = event;
	if (!locals.session) {
		throw redirect(303, '/auth');
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

	throw redirect(303, '/');
}
```

**Confirmation UI pattern** (`src/routes/(app)/onboarding/join/+page.svelte` lines 17-55):
```svelte
{#if step === 'confirm' && form && 'householdName' in form}
	<div class="mb-6">
		<h1 class="text-xl font-semibold" style="color: var(--color-text)">Join household</h1>
		<p class="mt-1 text-sm" style="color: var(--color-muted)">
			You are about to join this household.
		</p>
	</div>

	<div class="mb-6 rounded-xl border p-4" style="border-color: var(--color-border); background: var(--color-surface)">
		<p class="text-sm font-semibold" style="color: var(--color-muted)">Household</p>
		<p class="mt-1 text-lg font-semibold" style="color: var(--color-text)">
			{form.householdName}
		</p>
	</div>

	<form method="POST" action="?/join" use:enhance class="flex flex-col gap-3">
		<input type="hidden" name="code" value={form.code} />
		<button type="submit">Confirm and join</button>
		<a href="/onboarding/join">Use a different code</a>
	</form>
{/if}
```

**Invite management loader pattern** (`src/routes/(app)/settings/invite/+page.server.ts` lines 13-47):
```typescript
export const load: PageServerLoad = async (event) => {
	const { locals } = event;
	if (!locals.session) {
		throw redirect(303, '/auth');
	}

	const householdId = locals.householdId;
	if (!householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = createServerClient(event);
	try {
		const invite = await getOrCreateActiveInviteCode(supabase, householdId);

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
```

---

### Signed-In Shell and Household Detail Views

**Applies to:** `src/routes/(app)/+page.server.ts`, `src/routes/(app)/+page.svelte`, `src/routes/(app)/household/+page.server.ts`, `src/routes/(app)/household/+page.svelte`

**Analog:** `src/routes/(app)/+page.server.ts`

**Household-scoped loader pattern** (`src/routes/(app)/+page.server.ts` lines 49-64, 76-101):
```typescript
export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	if (!locals.householdId) {
		throw redirect(303, '/onboarding');
	}

	const supabase = createServerClient(event);
	const householdId = locals.householdId;

	const { data: householdRaw } = await supabase
		.from('households')
		.select('id, name, created_by, created_at')
		.eq('id', householdId)
		.single();
```

```typescript
const { data: membersRaw } = await supabase
	.from('household_members')
	.select(
		`
		id,
		role,
		joined_at,
		user_id,
		profiles (
			display_name,
			email
		)
	`
	)
	.eq('household_id', householdId)
	.order('joined_at', { ascending: true });

const { data: expensesRaw } = await supabase
	.from('expenses')
	.select('id, amount, category, note, spent_at, created_by')
	.eq('household_id', householdId)
	.eq('is_deleted', false)
	.order('spent_at', { ascending: false })
	.limit(5);
```

**Loader return mapping pattern** (`src/routes/(app)/+page.server.ts` lines 103-129):
```typescript
const members: HouseholdShellMember[] = (
	(membersRaw ?? []) as unknown as MemberWithProfile[]
).map((m) => ({
	id: m.id,
	userId: m.user_id,
	role: m.role,
	joinedAt: m.joined_at,
	displayName: m.profiles?.display_name ?? m.profiles?.email ?? 'Member',
	email: m.profiles?.email ?? null
}));

const recentExpenses: RecentExpense[] = ((expensesRaw ?? []) as unknown as RecentExpense[]).map(
	(e) => ({
		id: e.id,
		amount: e.amount,
		category: e.category,
		note: e.note,
		spent_at: e.spent_at,
		created_by: e.created_by
	})
);

return {
	household,
	members,
	recentExpenses
};
```

**Shell component pattern** (`src/routes/(app)/+page.svelte` lines 1-13, 33-57):
```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import InstallGuidanceBanner from '$lib/components/InstallGuidanceBanner.svelte';

	let { data }: Props = $props();

	const household = $derived(data.household);
	const members = $derived(data.members);
	const recentExpenses = $derived(data.recentExpenses);
</script>
```

```svelte
<main class="flex min-h-screen flex-col px-4 py-8">
	<div class="mx-auto w-full max-w-sm">
		<InstallGuidanceBanner />

		<div class="mb-6">
			<p class="text-sm" style="color: var(--color-muted)">Household</p>
			<h1 class="text-[28px] font-semibold leading-tight" style="color: var(--color-text, #1A1A1A)">
				{household?.name ?? 'Your household'}
			</h1>
			<p class="mt-1 text-sm" style="color: var(--color-muted)">
				{members.length}
				{members.length === 1 ? 'member' : 'members'}
			</p>
		</div>

		<a href="/household" class="mb-6 flex min-h-[48px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors">
			View household details
		</a>
```

---

### Install Guidance

**Applies to:** `src/lib/install/visibility.ts`, `src/lib/components/InstallGuidanceBanner.svelte`, install-guidance tests

**Analogs:** `src/lib/install/visibility.ts`, `src/lib/components/InstallGuidanceBanner.svelte`

**Visibility gate pattern** (`src/lib/install/visibility.ts` lines 36-63, 108-114):
```typescript
export function isSafariBrowser(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const isIOS = /iPhone|iPad|iPod/.test(ua);
	const isSafari = /Safari/.test(ua);
	const isChromeiOS = /CriOS/.test(ua);
	const isFirefoxiOS = /FxiOS/.test(ua);
	return isIOS && isSafari && !isChromeiOS && !isFirefoxiOS;
}

export function isStandalone(): boolean {
	if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
	if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) {
		return true;
	}
	if (typeof window.matchMedia === 'function') {
		return window.matchMedia('(display-mode: standalone)').matches;
	}
	return false;
}
```

```typescript
export function shouldShowInstallGuidance(isAuthenticated: boolean): boolean {
	if (!isAuthenticated) return false;
	if (!isSafariBrowser()) return false;
	if (isStandalone()) return false;
	if (isInstallGuidanceSnoozed()) return false;
	return true;
}
```

**Snooze pattern** (`src/lib/install/visibility.ts` lines 24-25, 69-88):
```typescript
const SNOOZE_KEY = 'xtrack_install_snoozed_until';
const DEFAULT_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function isInstallGuidanceSnoozed(): boolean {
	if (typeof localStorage === 'undefined') return false;
	const raw = localStorage.getItem(SNOOZE_KEY);
	if (!raw) return false;
	const snoozedUntil = parseInt(raw, 10);
	if (isNaN(snoozedUntil)) return false;
	return Date.now() < snoozedUntil;
}

export function snoozeInstallGuidance(durationMs: number = DEFAULT_SNOOZE_MS): void {
	if (typeof localStorage === 'undefined') return;
	const until = Date.now() + durationMs;
	localStorage.setItem(SNOOZE_KEY, String(until));
}
```

**Banner component pattern** (`src/lib/components/InstallGuidanceBanner.svelte` lines 9-26, 29-50):
```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		shouldShowInstallGuidance,
		snoozeInstallGuidance
	} from '$lib/install/visibility';

	let visible = $state(false);

	onMount(() => {
		visible = shouldShowInstallGuidance(true);
	});

	function dismiss() {
		snoozeInstallGuidance();
		visible = false;
	}
</script>
```

```svelte
{#if visible}
	<div class="mb-4 flex items-start justify-between gap-3 rounded-xl border p-4"
		style="border-color: var(--color-accent); background: var(--color-surface)"
		role="banner"
		aria-label="Install guidance">
		<div class="flex flex-col gap-1">
			<p class="text-sm font-semibold" style="color: var(--color-accent)">Add to Home Screen</p>
			<p class="text-sm" style="color: var(--color-text, #1A1A1A)">
				Tap Share, then Add to Home Screen
			</p>
		</div>
		<button onclick={dismiss} aria-label="Dismiss install guidance">x</button>
	</div>
{/if}
```

---

### Supabase Migrations, RLS, and RPCs

**Applies to:** `supabase/migrations/*.sql`, `supabase/seed.sql`, DB type updates, DB tests

**Analogs:** `supabase/migrations/2026042501_phase1_foundation.sql`, `supabase/migrations/2026042601_invite_lookup_rpc.sql`, `supabase/migrations/2026042602_invite_reuse_rpc.sql`

**Table + constraint pattern** (`supabase/migrations/2026042501_phase1_foundation.sql` lines 28-78):
```sql
CREATE TABLE IF NOT EXISTS public.household_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role          text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.household_invites (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households (id) ON DELETE CASCADE,
  code          text        NOT NULL UNIQUE,
  created_by    uuid        NOT NULL REFERENCES public.profiles (id),
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  used_by       uuid        REFERENCES public.profiles (id),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invite_expiry_max_24h CHECK (
    expires_at <= created_at + INTERVAL '24 hours'
  )
);
```

**RLS enable and policy pattern** (`supabase/migrations/2026042501_phase1_foundation.sql` lines 81-89, 117-126, 183-204):
```sql
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY households_member_select
  ON public.households
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY expenses_household_insert
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = expenses.household_id
        AND hm.user_id = auth.uid()
    )
  );
```

**Atomic invite acceptance pattern** (`supabase/migrations/2026042501_phase1_foundation.sql` lines 288-346):
```sql
CREATE OR REPLACE FUNCTION public.accept_household_invite(p_code text)
RETURNS public.households
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite    public.household_invites;
  v_household public.households;
BEGIN
  SELECT *
  INTO v_invite
  FROM public.household_invites
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code'
      USING ERRCODE = 'P0001', HINT = 'invalid_code';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code has already been used'
      USING ERRCODE = 'P0002', HINT = 'already_used';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite code has expired'
      USING ERRCODE = 'P0003', HINT = 'expired';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (v_invite.household_id, auth.uid(), 'member');

  UPDATE public.household_invites
  SET used_at = now(),
      used_by = auth.uid()
  WHERE id = v_invite.id;

  SELECT * INTO v_household
  FROM public.households
  WHERE id = v_invite.household_id;

  RETURN v_household;
END;
$$;
```

**Lookup-before-join pattern** (`supabase/migrations/2026042601_invite_lookup_rpc.sql` lines 3-15, 20-28, 52-64):
```sql
CREATE OR REPLACE FUNCTION public.lookup_household_invite(p_code text)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  household_created_by uuid,
  household_created_at timestamptz,
  code text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
```

```sql
SELECT *
INTO v_invite
FROM public.household_invites
WHERE household_invites.code = upper(trim(p_code));

IF NOT FOUND THEN
  RAISE EXCEPTION 'Invalid invite code'
    USING ERRCODE = 'P0001', HINT = 'invalid_code';
END IF;
```

```sql
household_id := v_household.id;
household_name := v_household.name;
household_created_by := v_household.created_by;
household_created_at := v_household.created_at;
code := v_invite.code;
expires_at := v_invite.expires_at;
RETURN NEXT;
```

**Reuse-active-invite pattern** (`supabase/migrations/2026042602_invite_reuse_rpc.sql` lines 24-36, 45-60):
```sql
SELECT *
INTO v_invite
FROM public.household_invites
WHERE household_id = p_household_id
  AND used_at IS NULL
  AND revoked_at IS NULL
  AND expires_at > now()
ORDER BY created_at DESC
LIMIT 1;

IF FOUND THEN
  RETURN v_invite;
END IF;
```

```sql
INSERT INTO public.household_invites (
  household_id,
  code,
  created_by,
  expires_at
)
VALUES (
  p_household_id,
  v_code,
  auth.uid(),
  now() + INTERVAL '24 hours'
)
RETURNING * INTO v_invite;
```

---

### Test Patterns

**Applies to:** `tests/auth/*.test.ts`, `tests/households/*.test.ts`, `tests/db/*.test.ts`, `tests/smoke/*.test.ts`

**Analogs:** `tests/auth/auth-page.server.test.ts`, `tests/db/phase1-rls.test.ts`, `tests/households/shared-shell.test.ts`

**SvelteKit server module mock pattern** (`tests/auth/auth-page.server.test.ts` lines 1-11, 19-35):
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('$lib/supabase/server', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			exchangeCodeForSession: mockExchangeCodeForSession
		}
	}))
}));
```

```typescript
it('exchanges ?code callback params and redirects into the app', async () => {
	mockExchangeCodeForSession.mockResolvedValueOnce({ data: { session: {} }, error: null });

	const { load } = await import('../../src/routes/(auth)/auth/+page.server');

	await expect(
		load({
			locals: { user: null },
			url: new URL('http://localhost:5173/auth?code=test-auth-code')
		} as never)
	).rejects.toMatchObject({
		status: 303,
		location: '/'
	});

	expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code');
});
```

**DB integration skip-guard pattern** (`tests/db/phase1-rls.test.ts` lines 19-29, 48-77):
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
}

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

async function signInAs(email: string, password = 'password123'): Promise<SupabaseClient> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
  }
  return client;
}

const SKIP_INTEGRATION = !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY;
```

**RLS same-household/cross-household assertion pattern** (`tests/db/phase1-rls.test.ts` lines 121-145, 148-176):
```typescript
it.skipIf(SKIP_INTEGRATION)('Both members can read the shared expense', async () => {
  const aliceClient = await signInAs('alice@example.com');
  const bobClient = await signInAs('bob@example.com');

  const [aliceResult, bobResult] = await Promise.all([
    aliceClient
      .from('expenses')
      .select('client_id')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('client_id', EXPENSE_CLIENT_ID)
      .maybeSingle(),
    bobClient
      .from('expenses')
      .select('client_id')
      .eq('household_id', HOUSEHOLD_ID)
      .eq('client_id', EXPENSE_CLIENT_ID)
      .maybeSingle()
  ]);

  expect(aliceResult.error).toBeNull();
  expect(aliceResult.data?.client_id).toBe(EXPENSE_CLIENT_ID);
  expect(bobResult.error).toBeNull();
  expect(bobResult.data?.client_id).toBe(EXPENSE_CLIENT_ID);
});
```

```typescript
it.skipIf(SKIP_INTEGRATION)('An outsider user cannot read a household they do not belong to', async () => {
  const sc = serviceClient();
  const timestamp = Date.now();
  const outsiderEmail = `outsider_${timestamp}@example.com`;

  const { data: userData, error: createError } = await sc.auth.admin.createUser({
    email: outsiderEmail,
    password: 'password123',
    email_confirm: true
  });
  expect(createError).toBeNull();

  const outsiderClient = await signInAs(outsiderEmail);
  const { data, error } = await outsiderClient
    .from('households')
    .select('id')
    .eq('id', HOUSEHOLD_ID);

  expect(error).toBeNull();
  expect(data).toEqual([]);

  if (userData?.user) {
    await sc.auth.admin.deleteUser(userData.user.id);
  }
});
```

**Browser utility test pattern** (`tests/households/shared-shell.test.ts` lines 37-51, 67-88):
```typescript
function setUserAgent(ua: string) {
	Object.defineProperty(navigator, 'userAgent', {
		value: ua,
		writable: true,
		configurable: true
	});
}

function setStandalone(value: boolean) {
	Object.defineProperty(navigator, 'standalone', {
		value,
		writable: true,
		configurable: true
	});
}
```

```typescript
it('returns false when standalone is true (app already on Home Screen)', () => {
	setStandalone(true);
	const result = shouldShowInstallGuidance(true);
	expect(result).toBe(false);
});

it('shouldShowInstallGuidance passes when standalone is false and auth+Safari context', () => {
	setStandalone(false);
	const result = shouldShowInstallGuidance(true);
	expect(result).toBe(true);
});
```

---

### Keep-Alive Automation

**Applies to:** `.github/workflows/supabase-keepalive.yml`, `scripts/supabase-keepalive.mjs`, `docs/ops/supabase-keepalive.md`

**Analogs:** `.github/workflows/supabase-keepalive.yml`, `scripts/supabase-keepalive.mjs`

**GitHub Actions cron pattern** (`.github/workflows/supabase-keepalive.yml` lines 7-29):
```yaml
on:
  schedule:
    - cron: "0 8 * * 2,5"
  workflow_dispatch:

jobs:
  keepalive:
    name: Ping Supabase
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run keep-alive script
        env:
          SUPABASE_KEEPALIVE_URL: ${{ secrets.SUPABASE_KEEPALIVE_URL }}
        run: node scripts/supabase-keepalive.mjs
```

**Keep-alive script env and fetch pattern** (`scripts/supabase-keepalive.mjs` lines 24-46, 48-83):
```javascript
const url = process.env.SUPABASE_KEEPALIVE_URL;

if (!url) {
  console.error(
    "[keepalive] ERROR: SUPABASE_KEEPALIVE_URL environment variable is not set."
  );
  console.error(
    "[keepalive] Add this secret to your GitHub repository settings."
  );
  process.exit(1);
}

console.log(`[keepalive] Pinging Supabase at: ${new URL(url).origin}`);

try {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "xtrack-keepalive/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  });
```

```javascript
if (response.ok || response.status === 400) {
  console.log(
    `[keepalive] SUCCESS - Supabase responded with HTTP ${response.status}`
  );
  process.exit(0);
}

if (response.status >= 500) {
  console.error(
    `[keepalive] ERROR - Supabase returned HTTP ${response.status}. Project may be paused.`
  );
  process.exit(1);
}

console.log(
  `[keepalive] OK - Supabase responded with HTTP ${response.status} (treated as alive)`
);
process.exit(0);
```

## Shared Patterns

### Auth and Route Guarding

**Source:** `src/hooks.server.ts`
**Apply to:** all protected route loaders and server actions

Use `event.locals.user`, `event.locals.session`, and `event.locals.householdId` as the canonical request-scoped auth state. Redirect unauthenticated app routes to `/auth`, and redirect signed-in users without a household to `/onboarding`.

### Server-Side Supabase Access

**Source:** `src/lib/supabase/server.ts`
**Apply to:** all `+page.server.ts`, `+server.ts`, and `hooks.server.ts` files

Create a request-scoped Supabase client from `createServerClient(event)`. Do not expose `service_role` to browser code. Browser-readable env must be limited to `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.

### Validation

**Source:** `src/lib/auth/schemas.ts`, `src/lib/households/schemas.ts`
**Apply to:** all form actions

Validate form data before calling Supabase. Return SvelteKit `fail(400, {...})` with field/form errors and previously-entered values for inline retry.

### Atomic Household Mutations

**Source:** `src/lib/server/households/service.ts`, `supabase/migrations/2026042501_phase1_foundation.sql`
**Apply to:** household creation, invite lookup, invite acceptance, invite code generation

Use database RPCs for operations that span multiple rows/tables. Invite acceptance must stay atomic with row locking and stable error hints.

### RLS From First Migration

**Source:** `supabase/migrations/2026042501_phase1_foundation.sql`
**Apply to:** every app table migration

Create tables, enable RLS in the same migration, then attach explicit named policies. Household visibility is enforced by membership existence checks, never by client-side filtering alone.

### UI State and Styling

**Source:** `src/routes/(auth)/auth/+page.svelte`, `src/routes/(app)/+page.svelte`
**Apply to:** all Svelte components

Use Svelte 5 `$props`, `$state`, and `$derived`. Use Tailwind utility classes with project CSS variables for color. Keep mobile-first `max-w-sm` layouts and 44-48px tap targets.

### Testing

**Source:** `vitest.config.ts`, `tests/setup.ts`, `tests/db/phase1-rls.test.ts`
**Apply to:** all unit/integration tests

Use Vitest with jsdom, `$lib` alias, and browser API stubs. For DB integration tests, gate live Supabase checks behind env-var availability and keep static structural checks runnable without a local DB.

## No Analog Found

No files in the Phase 1 scope lacked an analog because the repository already contains the current Phase 1 scaffold and implementation. Treat `exact-current` rows as canonical project patterns for future Phase 1 planning or repair work.

## Metadata

**Analog search scope:** `src/`, `supabase/`, `tests/`, `.github/workflows/`, `scripts/`, `docs/ops/`, root config files
**Files scanned:** 55 source/planning/config files
**Pattern extraction date:** 2026-04-26
