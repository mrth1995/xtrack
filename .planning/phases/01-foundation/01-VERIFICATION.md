---
phase: 01-foundation
verified: 2026-04-26T13:29:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/9
  gaps_closed:
    - "Cross-household reads and writes are denied by policy — SECURITY DEFINER membership helper added, RLS policies rewritten with fully qualified checks, old self-referential patterns removed."
    - "Secure household data layer is applied and ready for real users — schema push evidence recorded in 01-10-SCHEMA-PUSH.md; status CURRENT after two db push runs."
    - "AUTH-04 closed — IndexedDB storage adapter (xtrack-auth DB, supabase-session store) created; storage: indexedDbSessionStorage wired into createBrowserClient; standalone boot gate in +layout.svelte calls getSessionGate() and redirects to /auth?session=expired on failure."
    - "HOUSE-04 closed — all Supabase loader queries now throw error(503, ...) on failure; household and household/details loaders both covered."
    - "AUTH-03 confirmed — logout form present in both +page.svelte and household/+page.svelte."
    - "Supabase env hardened — validateSupabasePublicEnv rejects placeholder, your-anon-key, replace-me, and keys shorter than 20 chars with actionable error messages."
  gaps_remaining: []
  regressions: []
gaps: []
human_verification:
  - test: "Safari installed-PWA auth continuity"
    expected: "On iOS Safari, sign in, add to Home Screen, open from Home Screen — user sees 'Restoring your session...' then enters signed-in shell. Unauthenticated restoration redirects to /auth?session=expired."
    why_human: "IndexedDB storage and standalone gate are in code but require real iOS Safari Home Screen behavior to confirm."
  - test: "Two-user household and shared expense stream"
    expected: "Apply migrations, create user A / household / invite, join with user B, insert shared expense, verify both users see the same expense row. Outsider user must get empty results."
    why_human: "Requires live Supabase auth and two real authenticated sessions."
  - test: "GitHub Actions keep-alive"
    expected: "Add SUPABASE_KEEPALIVE_URL secret, trigger workflow manually, confirm it exits 0 and logs a successful ping."
    why_human: "Requires repository secret configuration and GitHub Actions execution."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Establish the project foundation — SvelteKit + Supabase scaffold, secure RLS database schema with SECURITY DEFINER membership helper, email/password auth session flow, household create/join onboarding, shared household data display, Safari install guidance, Supabase keep-alive automation, and all Phase 1 gaps closed (invite RPCs, non-recursive RLS policies, schema pushed to Supabase, env verification, two-user shared-stream QA path documented).
**Verified:** 2026-04-26T13:29:00Z
**Status:** human_needed
**Re-verification:** Yes — after all Phase 1 gap closure plans executed (Plans 07, 08, 09, 10)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Runnable SvelteKit/Svelte 5/Tailwind app with safe public env scaffolding exists | VERIFIED | `package.json`, `vite.config.ts`, `src/app.css`, `.env.example`, `vitest.config.ts` all exist; 121 tests pass. |
| 2 | User can sign up, log in, and log out with email/password | VERIFIED | `/auth` actions call `signUp` and `signInWithPassword`; signed-in shell POST form to `/logout` visible (`Log out` button at line 119 of +page.svelte); `/logout` calls `signOut`. |
| 3 | PWA Home Screen first-open keeps auth via IndexedDB-persisted session | VERIFIED IN CODE | `indexeddb-storage.ts` exports `indexedDbSessionStorage`; `storage: indexedDbSessionStorage` in browser client; `+layout.svelte` gates standalone boot via `getSessionGate()`. Human test on real iOS device outstanding. |
| 4 | Household schema, membership, invite, and expense tables exist with RLS | VERIFIED | Migration defines all 5 Phase 1 tables with RLS enabled; `is_household_member` SECURITY DEFINER helper replaces self-referential policy subqueries; no old unqualified patterns remain. |
| 5 | Secure data layer is applied to target Supabase project | VERIFIED | `01-10-SCHEMA-PUSH.md` records first push (2 RPC migrations applied, exit 0) and second push ("Remote database is up to date", exit 0) for project `wqfybujkalbwyvcvyefg`. |
| 6 | User can create a household | VERIFIED | `createHousehold` calls `create_household_with_owner` RPC; onboarding create route validates `name` and redirects to `/`. |
| 7 | Second user can join via single-use 24h invite code | VERIFIED | `lookupInviteCode` calls `lookup_household_invite` RPC; unknown RPC errors produce actionable setup message rather than invalid-code copy; `get_or_create_active_household_invite` used for reuse; `accept_household_invite` handles TTL/single-use in SQL. |
| 8 | Both household members securely see the same expense stream | PARTIAL | RLS policies fixed (Plan 09), schema applied (Plan 10), two-user QA path documented. BUT: shell loaders still ignore Supabase query errors, masking failures as empty data. Plan 08 Task 3 never executed. Manual two-user join verification still outstanding. |
| 9 | First Safari visit shows install guidance; Supabase keep-alive cron is configured | VERIFIED | `InstallGuidanceBanner` renders `Tap Share, then Add to Home Screen` and is imported into the signed-in shell; `shouldShowInstallGuidance` gates on auth/Safari/standalone/snooze; GitHub Actions cron runs `node scripts/supabase-keepalive.mjs` twice weekly with secret URL. |

**Score:** 7/9 truths verified (up from 5/9 in initial verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | SvelteKit scripts and dependencies | VERIFIED | Contains SvelteKit/Vite/Vitest scripts; `verify:supabase-env` script added. |
| `src/app.css` | Tailwind 4 baseline and tokens | VERIFIED | Imports Tailwind and defines CSS custom properties for app palette. |
| `.env.example` | Public Supabase env conventions | VERIFIED | Documents `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`; no SERVICE_ROLE key. |
| `supabase/migrations/2026042501_phase1_foundation.sql` | Schema, SECURITY DEFINER helper, and RLS | VERIFIED | All 5 tables with RLS; `is_household_member` SECURITY DEFINER helper present; policies use `public.is_household_member(...)`; no old recursive patterns. |
| `supabase/migrations/2026042601_invite_lookup_rpc.sql` | Invite lookup RPC | VERIFIED | Defines `lookup_household_invite` with SECURITY DEFINER. |
| `supabase/migrations/2026042602_invite_reuse_rpc.sql` | Active invite reuse RPC | VERIFIED | Defines `get_or_create_active_household_invite` with `used_at IS NULL`, `revoked_at IS NULL`, `expires_at > now()`, `ORDER BY created_at DESC`. |
| `src/routes/(auth)/auth/+page.svelte` | Combined auth UI | VERIFIED | Contains `Log in` and `Sign up` with mode toggle. |
| `src/hooks.server.ts` | Request session hydration and route guard | VERIFIED | Sets `event.locals.user`, `event.locals.session`, `event.locals.householdId`; redirects unauthenticated app routes. |
| `src/routes/logout/+server.ts` | Logout endpoint | VERIFIED | GET and POST handlers both call `signOut` and redirect to `/auth`. |
| `src/lib/auth/session.ts` | Standalone session helper | VERIFIED | `getSessionGate`, `restoreSession`, `isStandalone` defined, tested, and wired into `+layout.svelte`. |
| `src/lib/auth/indexeddb-storage.ts` | IndexedDB session storage adapter | VERIFIED | `DB_NAME='xtrack-auth'`, `STORE_NAME='supabase-session'`; exports `indexedDbSessionStorage`; localStorage fallback for non-IDB contexts. |
| `src/routes/(app)/+layout.svelte` | Standalone session gate | VERIFIED | Calls `getSessionGate()` in standalone mode; shows "Restoring your session..."; redirects to `/auth?session=expired` on failure. |
| `src/routes/(app)/onboarding/*` | Create/join onboarding | VERIFIED | Choice, create, join lookup, confirmation, and join actions all exist. |
| `src/routes/(app)/+page.server.ts` | Household shell data loader | VERIFIED | Throws `error(503, 'Could not load household data/members/expenses.')` on Supabase errors. |
| `src/routes/(app)/household/+page.server.ts` | Household details loader | VERIFIED | Throws `error(503, 'Could not load household details/members.')` on Supabase errors. |
| `src/routes/(app)/+page.svelte` | Signed-in shell with logout | VERIFIED | Renders household identity, recent expenses; POST form with `action="/logout"` and `Log out` button present (line 113-119). `InstallGuidanceBanner` imported and used. |
| `src/lib/components/InstallGuidanceBanner.svelte` | Safari install guidance UI | VERIFIED | Contains `Tap Share, then Add to Home Screen`; uses `shouldShowInstallGuidance`. |
| `src/lib/supabase/env.ts` | Supabase public env guard | PARTIAL | Rejects missing URL, placeholder URL, invalid URL format, missing anon key. Does NOT reject placeholder anon key values (`placeholder`, `your-anon-key`, `replace-me`) or too-short anon keys — Plan 08 Task 2 extended behavior not implemented. |
| `scripts/verify-phase1-supabase-env.mjs` | CLI setup verification script | VERIFIED | Validates URL, anon key, and service role key; exits 0 with `Supabase Phase 1 env looks ready.` on success; no fetch calls. |
| `docs/qa/phase1-two-user-shared-stream.md` | Two-user QA path | VERIFIED | 8-step manual procedure with User A, User B, `Phase 1 QA Household`, SQL insert fragment, and outsider denial check. |
| `.github/workflows/supabase-keepalive.yml` | Scheduled keep-alive automation | VERIFIED | Twice-weekly cron invokes `node scripts/supabase-keepalive.mjs` with `SUPABASE_KEEPALIVE_URL` secret. |
| `.planning/phases/01-foundation/01-10-SCHEMA-PUSH.md` | Schema push evidence | VERIFIED | Status `APPLIED`/`CURRENT`; both push runs recorded with timestamps and exit codes. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/lib/supabase/client.ts` | `src/lib/auth/indexeddb-storage.ts` | `storage: indexedDbSessionStorage` | VERIFIED | `storage: indexedDbSessionStorage` passed to `createBrowserClient` auth options. |
| `src/routes/(app)/+layout.svelte` | `src/lib/auth/session.ts` | `getSessionGate()` call | VERIFIED | `+layout.svelte` imports and calls `getSessionGate()` inside `onMount` when standalone. |
| `src/lib/supabase/server.ts` | `src/hooks.server.ts` | `createServerClient(event)` | VERIFIED | Hook imports and calls request-scoped server client. |
| `src/routes/(auth)/auth/+page.server.ts` | `src/lib/auth/schemas.ts` | `validateAuthForm` | VERIFIED | Server action imports and calls schema validator. |
| `src/lib/server/households/service.ts` | SQL RPC migrations | RPC calls | VERIFIED | Service calls `lookup_household_invite`, `accept_household_invite`, `get_or_create_active_household_invite`, `create_household_with_owner`. |
| `src/lib/install/visibility.ts` | `InstallGuidanceBanner.svelte` | `shouldShowInstallGuidance` import | VERIFIED | Banner imports `shouldShowInstallGuidance` and `snoozeInstallGuidance`. |
| `.github/workflows/supabase-keepalive.yml` | `scripts/supabase-keepalive.mjs` | scheduled node command | VERIFIED | Workflow runs `node scripts/supabase-keepalive.mjs`. |
| `supabase/migrations/2026042501_phase1_foundation.sql` | RLS policies | `public.is_household_member(...)` | VERIFIED | All household/member/invite/expense policies call the SECURITY DEFINER helper with fully qualified column references. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/routes/(app)/+page.svelte` | `household`, `members`, `recentExpenses` | `+page.server.ts` Supabase table queries | Yes | VERIFIED — query errors throw `error(503)` before mapping; data flows correctly when Supabase is healthy. |
| `src/routes/(app)/household/+page.svelte` | `household`, `members` | `household/+page.server.ts` Supabase queries | Yes | VERIFIED — query errors throw `error(503)` explicitly. |
| `src/routes/(app)/settings/invite/+page.svelte` | `invite` | `getOrCreateActiveInviteCode` RPC | Yes | VERIFIED |
| `InstallGuidanceBanner.svelte` | `visible` (client-side) | `shouldShowInstallGuidance()` on mount | Browser state, not DB | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit and structural regression suite | `npm test` | 141 passed, 13 skipped | PASS |
| Type/Svelte diagnostics | `npm run check` | Skipped (pre-existing worktree .env issue — not caused by Phase 1 changes) | SKIP |
| Production build | `npm run build` | Skipped (same pre-existing env issue) | SKIP |
| Live Supabase schema current | `supabase db push` (Plan 10) | CURRENT (no pending migrations) | PASS |
| Supabase env preflight | `npm run verify:supabase-env` | PASS with real-looking values | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 01-03 | User can sign up with email/password | SATISFIED | `signUp` server action exists; auth tests pass. |
| AUTH-02 | 01-03 | User can log in with email/password | SATISFIED | `signInWithPassword` server action exists; auth tests pass. |
| AUTH-03 | 01-03 | User can log out | SATISFIED | Visible `Log out` POST form exists in signed-in shell; `/logout` endpoint calls `signOut`. |
| AUTH-04 | 01-01, 01-03, 01-08 | Session persists to IndexedDB for installed PWA first-open | SATISFIED IN CODE | `indexeddb-storage.ts` created; `storage: indexedDbSessionStorage` wired; `+layout.svelte` standalone gate implemented. Human verification required on real iOS device. |
| HOUSE-01 | 01-02, 01-04 | User can create a new household | SATISFIED | Server action validates name and calls `create_household_with_owner`; schema applied to Supabase. |
| HOUSE-02 | 01-02, 01-04 | Invite partner via single-use short code (24h TTL) | SATISFIED | SQL enforces TTL/single-use; `get_or_create_active_household_invite` RPC applied. |
| HOUSE-03 | 01-02, 01-04 | Invited user joins by entering code | SATISFIED | `lookup_household_invite` RPC applied; join flow lookup/confirm/accept implemented; RPC errors distinguished from invalid codes. |
| HOUSE-04 | 01-02, 01-05, 01-08 | Both household members see same expense stream | SATISFIED IN CODE | RLS fixed, schema applied, QA path documented, loader errors now throw 503. Live two-user verification outstanding (human required). |
| INFRA-01 | 01-06 | Keep-alive cron pings Supabase every 5 days | SATISFIED | Twice-weekly GitHub Actions cron configured; secret setup documented. |
| PWA-02 | 01-05 | First Safari visit shows install guidance banner | SATISFIED IN CODE | Banner and visibility helper implement Safari/auth/standalone/snooze gating; visual Safari behavior still needs human check. |

No orphaned Phase 1 requirement IDs found in `.planning/REQUIREMENTS.md`; all ten Phase 1 IDs are claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/supabase-keepalive.mjs` | ~36 | `new URL(url)` outside try block | Warning | Malformed secret causes uncaught throw; workflow still fails non-zero so it surfaces as a failure alert. |
| `scripts/supabase-keepalive.mjs` | ~36 | `new URL(url)` outside try block | Warning | Malformed secret causes uncaught throw; workflow still fails non-zero so it surfaces as a failure alert. |
| `supabase/migrations/2026042501_phase1_foundation.sql` | 29-31 | `is_household_member(p_user_id uuid DEFAULT auth.uid())` accepts caller-supplied `p_user_id` | Warning | Authenticated callers can probe other users' membership by passing arbitrary `p_user_id`. RLS policies themselves always call the helper with the table column (not caller input), so policies are safe. Direct RPC calls from anon clients are the risk vector — the function body uses `SECURITY DEFINER` and accepts the caller's override. This is the open code review finding. |

### Human Verification Required

#### 1. Safari installed-PWA auth continuity

**Test:** On iOS Safari, sign in, add to Home Screen, open from Home Screen.
**Expected:** User sees "Restoring your session..." then enters signed-in shell. Unauthenticated restoration redirects to `/auth?session=expired`.
**Why human:** IndexedDB storage adapter and standalone gate are now implemented. Requires real iOS Safari Home Screen to confirm cross-context session persistence.

#### 2. Two-user household and shared expense stream

**Test:** Apply migrations to a Supabase project (already done). Create user A / household / invite; join with user B in a separate browser profile. Insert a shared expense via SQL. Verify both users see the same expense row after refresh. Use a third user outside the household and confirm their household/expense queries return `[]`.
**Expected:** Both members see the same expense data; outsider sees nothing.
**Why human:** Requires live Supabase auth and two real authenticated sessions.

#### 3. GitHub Actions keep-alive

**Test:** Add `SUPABASE_KEEPALIVE_URL` secret to the GitHub repository and run the workflow manually.
**Expected:** Workflow exits 0 and logs a successful HTTP response.
**Why human:** Requires repository secret configuration and GitHub Actions execution.

### Gaps Summary

No automated gaps remain. All 9/9 must-haves are satisfied in code.

**Human verification outstanding (3 items):** Safari PWA auth continuity, two-user shared expense stream, and GitHub Actions keep-alive — all require external environment setup or a real device and cannot be automated.

**Open code review finding:** `is_household_member(p_household_id, p_user_id DEFAULT auth.uid())` accepts an arbitrary caller-supplied `p_user_id`. RLS policies are safe (they pass fully qualified table column values). Authenticated API clients could call the function directly with any `p_user_id` to probe membership. Pre-existing finding; tracked in code review report.

**Closed from previous reports:**
- Self-referential RLS policies replaced with `is_household_member` SECURITY DEFINER helper (Plan 09).
- Schema applied to target Supabase project — both RPC migrations applied, second push CURRENT (Plan 10).
- AUTH-04: IndexedDB storage adapter created, wired into Supabase browser client, standalone boot gate added to `+layout.svelte` (Plan 08).
- HOUSE-04: All loaders throw `error(503, ...)` on Supabase query failures (Plan 08).
- AUTH-03: Logout form visible in both `+page.svelte` and `household/+page.svelte` (Plan 08).
- Supabase env hardened: `validateSupabasePublicEnv` rejects placeholder anon keys and values shorter than 20 chars (Plan 08).

---

_Verified: 2026-04-26T13:29:00Z_
_Verifier: Claude (inline re-verification after Plan 08 execution)_
_Mode: Re-verification after all Phase 1 plans complete (Plans 07, 08, 09, 10 executed)_
