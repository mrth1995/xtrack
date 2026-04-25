# Phase 1 Research — Foundation

**Phase:** 1 — Foundation
**Researched:** 2026-04-25
**Status:** Ready for planning

## Planning Summary

Phase 1 should establish the greenfield application scaffold, Supabase integration, database schema, RLS, auth flow, household onboarding, invite lifecycle, first signed-in shell, Safari install guidance, and keep-alive automation in one cohesive foundation. The most important sequencing rule is that database schema and RLS are created together from the first migration; auth and household flows should consume that secure model rather than relying on temporary open tables.

The canonical stack for this phase is the one locked in `.planning/STATE.md` and `.planning/PROJECT.md`: `SvelteKit 2 + Svelte 5 + Tailwind 4 + Supabase + Cloudflare Pages + vite-plugin-pwa`. Earlier project research contains some older `Next.js`/`Dexie`/`Serwist` references; those should be treated as superseded research notes, not implementation direction.

## Scope Guidance

### Must be included in Phase 1

- Initial SvelteKit app scaffold with TypeScript, Tailwind 4, and Cloudflare adapter wiring
- Browser/server Supabase client setup plus environment variable scaffolding
- Email/password sign-up, login, logout, and session restoration path
- Household schema and invite schema sufficient for create/join and future shared expenses
- RLS and supporting SQL functions/policies enabled from the first migration
- Combined auth screen, household choice screen, create flow, join flow, join confirmation, brief success state, signed-in household shell, household details, and invite management surface
- Safari-only install guidance banner/card shown after auth and hidden in standalone mode
- Supabase keep-alive GitHub Actions cron

### Should not be pulled forward from later phases

- Quick Add numpad, expense entry UX, expense list, edit/delete, and notes
- Full offline queue and retry engine
- Realtime subscriptions as a primary feature
- Full PWA offline shell/service worker caching
- Receipt scan and templates

Phase 1 only needs enough shared expense data foundation to prove that two household members can safely land in the same household context and later see the same stream. The actual expense write path belongs to Phase 2.

## Recommended Implementation Shape

### App scaffold

Start with a fresh SvelteKit structure that already accounts for Phase 1 auth and later PWA work:

- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server/admin-safe helpers for hooks and load functions
- `src/hooks.server.ts` — session bootstrapping, auth cookie/session handling, guarded route redirects
- `src/lib/auth/` — auth service helpers, standalone recovery logic
- `src/lib/households/` — create/join/invite service layer and shared Zod validation
- `src/lib/install/` — Safari detection, standalone detection, snooze storage, banner visibility logic
- `src/routes/(auth)/` — combined auth screen
- `src/routes/(app)/` — signed-in household shell and details routes
- `src/routes/api/` or server actions — controlled server-side invite create/join mutations if needed
- `supabase/migrations/` — schema, functions, RLS, and seed-safe SQL
- `.github/workflows/supabase-keepalive.yml` — keep-alive cron

### Auth/session approach

Use Supabase email/password auth only. Do not introduce OAuth, magic links, or redirect-based flows because Phase 1 explicitly targets installed-PWA continuity and iOS redirect flows tend to break out to Safari.

The planner should include a dedicated task for standalone-session continuity:

- Persist auth state in durable browser storage compatible with Supabase JS on mobile
- On app boot, detect standalone context before rendering protected app routes
- Attempt silent session restoration/refresh before showing the signed-in shell
- Keep failure behavior explicit: if restoration fails, route back to auth with a clear inline explanation rather than rendering a broken shell

### Household onboarding

The Context decisions already lock the UX. The technical consequence is that create and join are not separate apps; they are branches of one signed-in onboarding state machine:

1. Auth succeeds
2. If user has no household membership, route to household choice screen
3. `Create household` creates household + membership atomically
4. `Join with code` validates on submit, shows household-name confirmation, then joins atomically
5. Success state auto-advances into the signed-in shell

Use server-side mutations or RPCs for household creation and invite acceptance so the invite lifecycle and membership write can be atomic and policy-safe.

## Data Model Guidance

Phase 1 needs at least these tables or their moral equivalent:

### `profiles`

- `id uuid primary key references auth.users(id)`
- profile row provisioned on first confirmed auth session
- optional display/email mirror fields if useful for UI

### `households`

- `id uuid primary key`
- `name text not null`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`

### `household_members`

- `id uuid primary key` or composite key
- `household_id uuid not null references households(id)`
- `user_id uuid not null references profiles(id)`
- `role text not null default 'member'`
- `joined_at timestamptz not null default now()`
- unique constraint on `(household_id, user_id)`
- separate uniqueness or policy enforcing one active household per user in v1

### `household_invites`

- `id uuid primary key`
- `household_id uuid not null references households(id)`
- `code text not null unique`
- `created_by uuid not null references profiles(id)`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `used_by uuid null references profiles(id)`
- optional `revoked_at timestamptz null`

### `expenses`

Even though the write path is Phase 2, adding the base table in Phase 1 is reasonable because success criteria require future shared-stream compatibility and `HOUSE-04` explicitly depends on both members seeing shared data. Keep the schema minimal:

- `id uuid primary key`
- `household_id uuid not null references households(id)`
- `created_by uuid not null references profiles(id)`
- `amount integer not null`
- `category text not null`
- `note text null`
- `spent_at timestamptz not null`
- `client_id uuid not null unique`
- `is_deleted boolean not null default false`
- `created_at timestamptz not null default now()`

If the planner decides to defer physical `expenses` creation to Phase 2, it must still preserve `HOUSE-04` by creating at least one shared household-scoped data view or smoke-testable artifact proving membership scope works across two users. Creating the table in Phase 1 is the simpler plan.

## Security and RLS

This is the hardest non-negotiable part of Phase 1.

### Rules

- Enable RLS on every app table in the same migration that creates it
- Never put `service_role` in any browser-readable env var, client bundle, or client helper
- Do not rely on client-side household filtering for security
- Prefer SQL functions or RPCs for invite acceptance and household creation when the operation spans multiple tables

### Policy direction

- `profiles`: user can read/update only their own row
- `households`: user can read households they belong to through `household_members`
- `household_members`: user can read rows for their own household
- `household_invites`: only household members can read their household invite data; only eligible creators can create; join flow should use a controlled function that checks validity and marks the code used atomically
- `expenses`: household members can read rows in their household; inserts require both matching `household_id` and `created_by = auth.uid()`

### Invite race prevention

Invite acceptance must be atomic. The planner should prefer one of:

- Postgres function/RPC that locks the invite row, checks `used_at is null` and `expires_at > now()`, inserts membership if absent, sets `used_at`/`used_by`, then returns household metadata
- Equivalent server-side transaction path if the chosen Supabase interface supports it cleanly

Do not implement invite acceptance as separate client-issued `select`, `insert`, then `update` calls.

## Install Guidance Research

Phase 1 only needs install guidance, not full offline PWA delivery.

### Required behavior

- Show guidance only after successful auth
- Show only in Safari/iOS browser context, not in standalone mode
- Banner/card should be snoozable, not permanently dismissed
- Copy should stay literal: `Tap Share, then Add to Home Screen`

### Detection guidance

- Standalone detection: prefer runtime detection for iOS standalone mode
- Browser gating: distinguish Safari installable context from non-Safari iOS browsers so the UI can either guide install or explain that Safari is required
- Snooze state can live in lightweight client storage because it is a UX preference, not durable app data

## Realtime and Shared-Data Guidance

Do not let the presence of `HOUSE-04` pull full Supabase Realtime implementation into Phase 1 unless the planner has a tight reason. Phase 4 owns the realtime experience. For Phase 1 planning:

- Household membership and shared data model must be ready for realtime later
- Verification for the “shared expense stream” success criterion can be satisfied with a minimal shared table/read proof across two users if realtime is not yet implemented
- If the planner introduces a tiny shared-stream smoke path in Phase 1, it should stay deliberately narrow and not expand into the full Quick Add experience

## Keep-Alive Automation

The infra requirement is straightforward and belongs in its own plan:

- GitHub Actions cron on a cadence comfortably below Supabase free-tier inactivity pause window
- Ping a safe endpoint or lightweight DB-backed health surface
- Secrets handled through GitHub Actions secrets, never committed
- Include a short README or comments explaining why the workflow exists so it is not deleted later as “unused CI”

## Risks and Traps

### Confirmed risks the planner should encode

1. Safari and standalone session contexts can diverge; Phase 1 must include explicit restoration behavior.
2. RLS added later is not acceptable; schema and policies must ship together.
3. Invite acceptance without transaction safety can create reuse/race bugs.
4. UI flow can accidentally overbuild a dashboard; signed-in shell should stay household-status-focused.
5. Shared-stream success criteria can accidentally drag the whole Quick Add feature into Phase 1; keep proof narrow.

### Research conflict resolution

Project-level research files contain helpful domain notes, but some architecture details are stale:

- Use `SvelteKit`, not `Next.js`
- Use the locked project stack from `.planning/STATE.md`
- Treat `vite-plugin-pwa` as the future PWA direction
- Use minimal durable storage/session work only as needed for auth continuity in this phase

## Suggested Plan Boundaries

The phase should likely break into 4 to 6 plans:

1. Scaffold app, environment, and Supabase wiring
2. Create schema, migrations, SQL helpers, and RLS
3. Implement auth and standalone session restoration
4. Implement household create/join/invite flows
5. Implement signed-in shell, household details, and install guidance
6. Add keep-alive automation plus verification/fixtures if needed

The planner should keep database/security work ahead of UI wiring where possible, but the first executable plan may still need Wave 0 scaffold tasks so later plans have a real project to modify.

## Validation Architecture

Phase 1 validation should combine migration verification, policy verification, and user-flow checks.

### Automated checks to plan for

- project typecheck and lint commands once scaffold exists
- SQL/migration application succeeds in local or linked Supabase environment
- auth flow tests for sign-up, login, logout, and unauthenticated redirect behavior
- household create/join happy-path tests
- invite invalid/expired/used error-path tests
- standalone/install-banner logic unit tests for visibility decisions where practical
- RLS verification scripts or tests proving cross-household access is denied

### Manual checks that are still worth planning

- Safari first-visit install guidance appearance
- standalone launch after Safari auth/install flow
- two-user household join and shared visibility smoke test if automated E2E is not available yet

### Recommended validation artifacts

- Add baseline test infrastructure early if the scaffold does not include it
- Ensure at least one verification command can run quickly after each implementation task
- Include explicit acceptance criteria around SQL policy names, table existence, unique constraints, and invite TTL behavior

## Planner Notes

- Every Phase 1 requirement ID must map to a concrete plan
- Plans should mention exact files to create because the repo is currently planning-only
- Security-sensitive tasks should prefer server-side files/actions/functions over client-side direct writes where atomicity matters
- If any plan modifies `supabase/migrations/*.sql`, the planner should include a blocking schema push/apply task before verification
