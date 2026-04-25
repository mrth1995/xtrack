---
phase: 01-foundation
plan: "04"
subsystem: household-onboarding
tags: [households, onboarding, invite, sveltekit, zod, vitest]
dependency_graph:
  requires: [01-02, 01-03]
  provides: [household-service, onboarding-flow, invite-management, household-tests]
  affects: [01-05]
tech_stack:
  added: []
  patterns:
    - Zod schemas for server-side form validation (createHouseholdSchema, joinHouseholdSchema)
    - Two-step join flow — lookup then confirm — prevents premature household data disclosure
    - getOrCreateActiveInviteCode reuses existing valid codes; never replaces an active unused code
    - Service layer mocked via vi.fn() chains for unit tests without live Supabase
    - $lib alias added to vitest.config.ts so test files can resolve $lib/* without SvelteKit plugin
key_files:
  created:
    - src/lib/households/schemas.ts
    - src/lib/server/households/service.ts
    - src/routes/(app)/onboarding/+page.server.ts
    - src/routes/(app)/onboarding/+page.svelte
    - src/routes/(app)/onboarding/create/+page.server.ts
    - src/routes/(app)/onboarding/create/+page.svelte
    - src/routes/(app)/onboarding/join/+page.server.ts
    - src/routes/(app)/onboarding/join/+page.svelte
    - src/routes/(app)/settings/invite/+page.server.ts
    - src/routes/(app)/settings/invite/+page.svelte
    - tests/households/onboarding.test.ts
  modified:
    - vitest.config.ts
decisions:
  - Household join uses a two-step lookup+confirm pattern on the server to avoid exposing household data before user commits
  - Active invite reuse: getOrCreateActiveInviteCode never replaces a valid unused code; creates new only when expired/used/revoked
  - Invite management lives under /settings/invite — not in the main shell nav per CONTEXT.md D-22
  - Service methods call SQL RPC helpers (create_household_with_owner, accept_household_invite) for atomic behavior
  - $lib alias added to vitest.config.ts (Rule 3 fix) so unit tests can import service and schema files directly
metrics:
  duration: "~25 minutes (Task 3 only; Tasks 1-2 were pre-completed)"
  completed: "2026-04-25"
  tasks_completed: 3
  files_created: 12
  files_modified: 1
---

# Phase 01 Plan 04: Household Onboarding and Invite Management Summary

**One-liner:** Zod-validated household create/join flow with two-step lookup confirmation and reuse-first invite management, backed by atomic SQL RPC helpers.

---

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Server-side household service and form validation | 516b83b | schemas.ts, service.ts, create/+page.server.ts, join/+page.server.ts |
| 2 | Onboarding and invite-management screens | 2abebf1 | onboarding/+page.svelte, create/+page.svelte, join/+page.svelte, settings/invite/* |
| 3 | Household onboarding regression coverage | 5468534 | tests/households/onboarding.test.ts, vitest.config.ts |

---

## What Was Built

**Task 1 — Service layer:**
- `src/lib/households/schemas.ts`: Zod schemas for `name` (createHouseholdSchema, max 80 chars) and `code` (joinHouseholdSchema, auto-uppercased, max 20 chars)
- `src/lib/server/households/service.ts`: Four methods — `createHousehold` (calls `create_household_with_owner` RPC), `lookupInviteCode` (validates code without claiming it, returns household name for confirmation), `acceptHouseholdInvite` (calls `accept_household_invite` RPC with typed error hints), `getOrCreateActiveInviteCode` (reuse-first invite logic)
- Server actions wire Zod validation to service methods, returning typed `fail()` responses

**Task 2 — Onboarding screens:**
- `/onboarding`: Equal-weight create/join choice screen per D-01/D-02
- `/onboarding/create`: Minimal name-only form; redirects to `/` after success
- `/onboarding/join`: Two-step flow — code entry → confirmation (shows household name) → join; all error states shown inline without navigation loss
- `/settings/invite`: Active invite code display with Copy code, expiry, joined status; generates new code only when prior is expired/used

**Task 3 — Test coverage:**
- 32 unit tests covering schema validation, service method happy paths, and all error paths (expired, used, revoked, invalid_code, already_member, unknown)
- Invite management reuse logic tested — confirms RPC not called when active invite exists
- Structural checks embed the required acceptance-criteria strings: `Create household`, `Join with code`, `Copy code`, `expired`

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added $lib path alias to vitest.config.ts**
- **Found during:** Task 3 implementation
- **Issue:** `vitest.config.ts` uses the bare `svelte` vite plugin (not the SvelteKit plugin), so `$lib/*` imports from test files failed with "Failed to resolve import"
- **Fix:** Added `resolve.alias.$lib = path.resolve('./src/lib')` to `vitest.config.ts`
- **Files modified:** `vitest.config.ts`
- **Commit:** 5468534
- **Note:** Pre-existing `npm run check` errors (4 errors about `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` missing from `$env/static/public`) were present before Task 3 and are out of scope — they reflect missing `.env` in the worktree, not code issues.

---

## Known Stubs

None — all service methods call real SQL RPC helpers. The tests mock the Supabase client, not the service methods, so production paths remain untouched.

---

## Threat Flags

None — no new network endpoints or trust boundaries introduced. All routes were already in scope of the plan's threat model (server-side validation and atomic SQL helpers mitigate the invite-race and early-disclosure threats).

---

## Self-Check: PASSED

Files verified:
- `tests/households/onboarding.test.ts` — FOUND
- `vitest.config.ts` — FOUND (modified with $lib alias)
- `.planning/phases/01-foundation/01-04-SUMMARY.md` — FOUND (this file)

Commits verified:
- 5468534 (Task 3) — FOUND in git log
- 2abebf1 (Task 2) — FOUND in git log
- 516b83b (Task 1) — FOUND in git log

Test run: `npx vitest run` — 38 passed, 10 skipped (DB integration tests require live Supabase), 0 failed.
