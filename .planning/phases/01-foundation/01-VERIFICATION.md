---
phase: 01-foundation
verified: 2026-04-25T23:37:09Z
status: gaps_found
score: 5/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "After installing the PWA from Safari, opening from Home Screen does not log the user out (silent token refresh via IndexedDB-persisted session)"
    status: failed
    reason: "No IndexedDB-backed session storage exists, and the standalone session gate is only tested as a helper, not wired into the app shell."
    artifacts:
      - path: "src/lib/supabase/client.ts"
        issue: "Uses @supabase/ssr browser client with persistSession, but no IndexedDB storage adapter or IndexedDB code is present."
      - path: "src/lib/auth/session.ts"
        issue: "restoreSession/getSessionGate helpers call Supabase getSession/refreshSession but are not imported or called by app routes/layouts."
    missing:
      - "Add IndexedDB-backed session persistence or an equivalent accepted override."
      - "Wire standalone first-open session restoration into the protected app boot path before rendering the signed-in shell."
  - truth: "Secure household data layer is applied and ready for real users"
    status: failed
    reason: "The original blocking schema apply step was documented as not executed, and Plan 07 still requires supabase db push before manual UAT."
    artifacts:
      - path: ".planning/phases/01-foundation/01-02-SUMMARY.md"
        issue: "Records Task 3 supabase db push as BLOCKED because Supabase CLI was unavailable."
      - path: ".planning/phases/01-foundation/01-07-SUMMARY.md"
        issue: "User setup still says to apply latest migrations before manual UAT retest."
    missing:
      - "Apply all Phase 1 migrations to the target Supabase project, or record explicit evidence that the target schema is current."
  - truth: "Cross-household reads and writes are denied by policy"
    status: failed
    reason: "The critical review finding still exists: RLS policies query household_members from inside household_members policy and use unqualified outer columns, risking recursion or incorrect tenant filtering."
    artifacts:
      - path: "supabase/migrations/2026042501_phase1_foundation.sql"
        issue: "Policies at lines 117, 139, 155, and 183 use self-referential membership subqueries with unqualified id/household_id."
    missing:
      - "Add SECURITY DEFINER membership helper(s) and replace the affected RLS policies with fully qualified policy checks."
      - "Add regression coverage for the exact policy behavior, not just structural SQL strings."
  - truth: "Both household members see the same expense stream (verified by joining household, not just by creating one)"
    status: failed
    reason: "The shell reads expenses by household_id, but RLS isolation remains defective and loader errors are ignored, so a broken/missing policy can render an empty stream as normal UI."
    artifacts:
      - path: "src/routes/(app)/+page.server.ts"
        issue: "Household, member, and expense queries destructure only data and ignore Supabase errors."
      - path: "supabase/migrations/2026042501_phase1_foundation.sql"
        issue: "expenses_household_select depends on the defective membership policy pattern."
    missing:
      - "Fix RLS policy isolation and loader error handling."
      - "Run or document an end-to-end two-user join test proving both users can read the same household expense rows."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Secure, multi-device-ready data layer exists; users can create accounts, form a household, and install guidance appears on first Safari visit  
**Verified:** 2026-04-25T23:37:09Z  
**Status:** gaps_found  
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Runnable SvelteKit/Svelte 5/Tailwind app with safe public env scaffolding exists | VERIFIED | `package.json`, `vite.config.ts`, `src/app.css`, `.env.example`, and `vitest.config.ts` exist; `npm run check` and `npm run build` pass. |
| 2 | User can sign up, log in, and log out with email/password | VERIFIED | `/auth` actions call `signUp` and `signInWithPassword`; signed-in shell posts to `/logout`; `/logout` calls `signOut` and redirects to `/auth`. |
| 3 | PWA Home Screen first-open keeps auth via IndexedDB-persisted session | FAILED | No IndexedDB/session storage adapter found; `getSessionGate()` is not wired into app shell. |
| 4 | Household schema, membership, invite, and expense tables exist with RLS | VERIFIED | Migration defines all Phase 1 tables and enables RLS on each table. |
| 5 | Secure data layer is applied to target Supabase project | FAILED | Plan 02 summary records `supabase db push` as blocked; Plan 07 summary still requires applying migrations before UAT. |
| 6 | User can create a household | VERIFIED | `createHousehold` calls `create_household_with_owner`; onboarding create route validates `name` and redirects to `/`. |
| 7 | Second user can join via single-use 24h invite code | VERIFIED | Invite lookup, accept, and reuse RPCs exist; service calls `lookup_household_invite`, `accept_household_invite`, and `get_or_create_active_household_invite`; invite TTL/single-use checks are in SQL. |
| 8 | Both household members securely see the same expense stream | FAILED | Shell queries household expenses, but RLS policies are defective and loader errors are ignored, so this cannot be trusted as a secure shared stream. |
| 9 | First Safari visit shows install guidance; Supabase keep-alive cron is configured | VERIFIED | `InstallGuidanceBanner` is wired into signed-in shell and gated by Safari/auth/standalone/snooze helper; GitHub Actions cron runs `node scripts/supabase-keepalive.mjs` twice weekly. |

**Score:** 5/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | SvelteKit scripts and dependencies | VERIFIED | Contains SvelteKit/Vite/Vitest scripts; checks pass. |
| `src/app.css` | Tailwind 4 baseline and tokens | VERIFIED | Imports Tailwind and defines app tokens. |
| `.env.example` | Public Supabase env conventions | VERIFIED | Documents `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and server-only secret warning. |
| `supabase/migrations/2026042501_phase1_foundation.sql` | Schema and RLS | FAILED | Exists and is substantive, but RLS policy implementation has a critical isolation defect. |
| `supabase/migrations/2026042601_invite_lookup_rpc.sql` | Invite lookup RPC | VERIFIED | Defines `lookup_household_invite`. |
| `supabase/migrations/2026042602_invite_reuse_rpc.sql` | Active invite reuse RPC | VERIFIED | Defines `get_or_create_active_household_invite`. |
| `src/routes/(auth)/auth/+page.svelte` | Combined auth UI | VERIFIED | Relocated from planned `src/routes/(auth)/+page.svelte`; actual URL is `/auth`. |
| `src/hooks.server.ts` | Request session hydration and route guard | VERIFIED | Creates request Supabase client, sets locals, redirects unauthenticated app routes. |
| `src/routes/logout/+server.ts` | Logout endpoint | VERIFIED | GET/POST call `signOut`. |
| `src/lib/auth/session.ts` | Standalone session helper | PARTIAL | Helper exists and is tested, but it is not wired into app boot and does not use IndexedDB. |
| `src/routes/(app)/onboarding/*` | Create/join onboarding | VERIFIED | Choice, create, join lookup, confirmation, and join actions exist. |
| `src/routes/(app)/+page.server.ts` | Household shell data loader | PARTIAL | Loads household/member/expense data but ignores Supabase query errors. |
| `src/routes/(app)/+page.svelte` | Signed-in household shell | VERIFIED | Renders household identity, recent expenses, invite link, and logout. |
| `src/lib/components/InstallGuidanceBanner.svelte` | Safari install guidance UI | VERIFIED | Contains required copy and snooze behavior. |
| `.github/workflows/supabase-keepalive.yml` | Scheduled keep-alive automation | VERIFIED | Twice-weekly cron invokes script with secret env var. |
| `scripts/supabase-keepalive.mjs` | Keep-alive request script | WARNING | Uses env var and fetch; malformed URL throws before handled diagnostics. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `package.json` | `vitest.config.ts` | `test:unit` script | VERIFIED | `gsd-sdk verify.key-links` passed. |
| `.env.example` | Supabase client env usage | public env convention | VERIFIED | Only public Supabase keys are used by browser/server public clients. |
| `src/lib/supabase/server.ts` | `src/hooks.server.ts` | `createServerClient(event)` | VERIFIED | Hook imports and calls request-scoped server client. |
| `src/routes/(auth)/auth/+page.server.ts` | `src/lib/auth/schemas.ts` | form validation | VERIFIED | Planned path differed, but actual route imports `validateAuthForm`. |
| `src/lib/server/households/service.ts` | SQL RPC migrations | RPC calls | VERIFIED | Service calls create, lookup, accept, and reuse RPCs. |
| `src/lib/install/visibility.ts` | `InstallGuidanceBanner.svelte` | visibility helper | VERIFIED | Banner imports `shouldShowInstallGuidance` and `snoozeInstallGuidance`. |
| `.github/workflows/supabase-keepalive.yml` | `scripts/supabase-keepalive.mjs` | scheduled node command | VERIFIED | Workflow runs `node scripts/supabase-keepalive.mjs`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/routes/(app)/+page.svelte` | `household`, `members`, `recentExpenses` | `+page.server.ts` Supabase table queries | Yes, but errors ignored | PARTIAL |
| `src/routes/(app)/household/+page.svelte` | `household`, `members` | household detail loader Supabase queries | Yes, but errors ignored | PARTIAL |
| `src/routes/(app)/settings/invite/+page.svelte` | `invite` | `getOrCreateActiveInviteCode` RPC | Yes | VERIFIED |
| `InstallGuidanceBanner.svelte` | `visible` | `shouldShowInstallGuidance(true)` on mount | Browser state, not DB | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Unit and structural regression suite | `npm test` | 111 passed, 10 skipped | PASS |
| Type/Svelte diagnostics | `npm run check` | 0 errors, 0 warnings | PASS |
| Production build | `npm run build` | Cloudflare adapter build completed | PASS |
| Live Supabase schema current | Not run | Requires configured Supabase CLI/project | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| AUTH-01 | 01-03 | User can sign up with email/password | SATISFIED | `signUp` server action exists; auth tests pass. |
| AUTH-02 | 01-03 | User can log in with email/password | SATISFIED | `signInWithPassword` server action exists; auth tests pass. |
| AUTH-03 | 01-03 | User can log out | SATISFIED | Visible logout form posts to `/logout`; endpoint calls `signOut`. |
| AUTH-04 | 01-01, 01-03 | Session persists to IndexedDB for installed PWA first-open | BLOCKED | No IndexedDB implementation and standalone helper is not wired into shell. |
| HOUSE-01 | 01-02, 01-04 | User can create a household | SATISFIED IN CODE | Server action validates name and calls `create_household_with_owner`; live DB apply still unresolved. |
| HOUSE-02 | 01-02, 01-04 | Invite partner via single-use short code, 24h TTL | SATISFIED IN CODE | SQL functions enforce TTL/single-use; reuse RPC added. |
| HOUSE-03 | 01-02, 01-04 | Invited user joins by entering code | SATISFIED IN CODE | Join flow lookup/confirm/accept actions and RPCs exist. |
| HOUSE-04 | 01-02, 01-05 | Both household members see same expense stream | BLOCKED | Expense stream loader exists, but RLS defect and ignored query errors block secure verification. |
| INFRA-01 | 01-06 | Keep-alive cron pings Supabase every 5 days | SATISFIED | Twice-weekly GitHub Actions cron configured; secret setup required. |
| PWA-02 | 01-05 | First Safari visit shows install guidance | SATISFIED IN CODE | Banner and visibility helper implement Safari/auth/standalone/snooze gating; visual Safari behavior needs human check. |

No orphaned Phase 1 requirement IDs were found in `.planning/REQUIREMENTS.md`; all ten Phase 1 IDs are claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `supabase/migrations/2026042501_phase1_foundation.sql` | 117 | Self-referential/unqualified RLS membership checks | Blocker | Can fail with policy recursion or incorrectly allow/deny household data. |
| `src/routes/(app)/+page.server.ts` | 60 | Supabase query error ignored | Warning | Broken RLS/missing migrations can render empty shell instead of surfacing failure. |
| `src/routes/(app)/household/+page.server.ts` | 46 | Supabase query error ignored | Warning | Household detail failures can be hidden. |
| `scripts/supabase-keepalive.mjs` | 36 | `new URL(url)` outside try block | Warning | Malformed secret bypasses intended diagnostics; workflow still fails non-zero. |

### Human Verification Required

1. **Safari installed-PWA auth continuity**

**Test:** On iOS Safari, sign in, add to Home Screen, open from Home Screen.  
**Expected:** User remains authenticated or sees a deliberate restoration flow before protected shell render.  
**Why human:** Requires real iOS Safari/Home Screen storage behavior.

2. **Two-user household and shared expense stream**

**Test:** Apply migrations to a Supabase project, create user A/household/invite, join with user B, insert or seed an expense, and verify both users see the same expense stream.  
**Expected:** Both users see the same household expenses; users outside the household cannot.  
**Why human:** Requires live Supabase auth/RLS behavior with two real sessions unless full integration env is configured.

3. **GitHub Actions keep-alive**

**Test:** Add `SUPABASE_KEEPALIVE_URL` secret and run the workflow manually.  
**Expected:** Workflow succeeds and logs an HTTP response treated as alive.  
**Why human:** Requires repository secret configuration and GitHub Actions execution.

### Gaps Summary

Phase 1 is close in application surface area, and the normal local checks pass, but the phase goal is not achieved yet. The two biggest blockers are security and installed-PWA persistence: the RLS policies still contain the critical reviewed isolation defect, and AUTH-04 specifically requires IndexedDB-backed persistence across Safari/Home Screen context, which is not present or wired. The database also has not been proven applied to the target Supabase project, so the create/join/shared-stream flows remain code-complete but not delivery-complete.

---

_Verified: 2026-04-25T23:37:09Z_  
_Verifier: Claude (gsd-verifier)_
