---
phase: 01-foundation
plan: "05"
subsystem: app-shell
tags: [sveltekit, pwa, safari-install, household-shell, svelte5, vitest]
dependency_graph:
  requires: [01-03, 01-04]
  provides: [signed-in-shell, household-details-page, safari-install-guidance, shared-data-proof]
  affects: [02-quick-add, future-phases]
tech_stack:
  added: []
  patterns:
    - shouldShowInstallGuidance() central gate pattern for PWA install UX (auth+Safari+standalone+snooze)
    - Explicit interface types + unknown cast pattern for Supabase chained query results
    - $derived() instead of const for reactive page data props in Svelte 5
    - snoozeInstallGuidance() / clearInstallGuidanceSnooze() localStorage snooze pattern
key_files:
  created:
    - src/routes/(app)/+page.server.ts
    - src/routes/(app)/+page.svelte
    - src/routes/(app)/household/+page.server.ts
    - src/routes/(app)/household/+page.svelte
    - src/lib/install/visibility.ts
    - src/lib/components/InstallGuidanceBanner.svelte
    - tests/households/shared-shell.test.ts
  modified:
    - src/routes/+page.svelte (deleted — route conflict with (app)/+page.svelte)
decisions:
  - "Remove root +page.svelte: SvelteKit (app) route group owns / URL — root and (app) pages cannot coexist"
  - "Cast Supabase query results via unknown to bypass generic narrowing to never in chained .eq().single() queries"
  - "Use $derived() for page data destructuring in Svelte 5 to avoid 'only captures initial value' warnings"
  - "shouldShowInstallGuidance() takes isAuthenticated bool from caller — visibility logic is pure/testable"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-25"
  tasks_completed: 3
  files_created: 7
---

# Phase 01 Plan 05: Signed-In Shell, Household Details, and Safari Install Guidance Summary

Signed-in household shell with household-scoped data proof, household details page showing Members, and centralized Safari install guidance with snooze and standalone protection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Signed-in shell and household details surfaces | 865406e | +page.server.ts, +page.svelte, household/+page.server.ts, household/+page.svelte |
| 2 | Safari install guidance with snooze and standalone protection | 64e1863 | src/lib/install/visibility.ts, src/lib/components/InstallGuidanceBanner.svelte |
| 3 | Shared-shell regression coverage | 250a747 | tests/households/shared-shell.test.ts |
| - | Fix ts-expect-error directives in tests | 8553ad4 | tests/households/shared-shell.test.ts |

## Verification Results

- `npm run check`: 0 errors, 0 warnings (509 files)
- `npm run test:unit -- shared-shell`: 17 tests passed
- `src/routes/(app)/+page.svelte` contains "View household details": confirmed
- `src/routes/(app)/household/+page.svelte` contains "Members": confirmed
- `src/lib/components/InstallGuidanceBanner.svelte` contains "Tap Share, then Add to Home Screen": confirmed
- `src/lib/install/visibility.ts` contains `shouldShowInstallGuidance` and `standalone` check: confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Route conflict between root +page.svelte and (app)/+page.svelte**
- **Found during:** Task 1 (first npm run check after creating (app)/+page.svelte)
- **Issue:** SvelteKit treats `(app)/` as a route group that matches `/`, so a root `+page.svelte` at `src/routes/+page.svelte` and `src/routes/(app)/+page.svelte` both serve `/` — SvelteKit refuses to sync and crashes.
- **Fix:** Deleted root `src/routes/+page.svelte` (placeholder from Plan 01). The `(app)` group now owns `/` as intended.
- **Files modified:** `src/routes/+page.svelte` (deleted)
- **Commit:** 865406e

**2. [Rule 3 - Blocking] Supabase chained query result typed as `never`**
- **Found during:** Task 1 (svelte-check after creating load functions)
- **Issue:** The Supabase typed client with `Database` generic narrows `.from('households').select(...).eq(...).single()` result to `never` in TypeScript when chaining multiple filter/query methods. This propagated `never` into PageData and caused errors in Svelte components.
- **Fix:** Added explicit interface types (`HouseholdSummary`, `HouseholdDetail`, `HouseholdShellMember`, `RecentExpense`) and cast raw query results via `as unknown as T` before use.
- **Files modified:** src/routes/(app)/+page.server.ts, src/routes/(app)/household/+page.server.ts
- **Commit:** 865406e

**3. [Rule 1 - Bug] Missing .env in worktree caused $env/static/public type errors**
- **Found during:** Task 1 (after route conflict fix allowed svelte-kit sync to proceed)
- **Issue:** Worktree lacked `.env` file; SvelteKit could not generate `$env/static/public` module types, producing 4 errors in supabase client files.
- **Fix:** Copied `.env` from main project root to worktree (gitignored, not committed).
- **Files modified:** `.env` (not committed — gitignored)

**4. [Rule 1 - Bug] Svelte 5 $state reference warning for data destructuring**
- **Found during:** Task 1 (svelte-check after fixes)
- **Issue:** `const household = data.household` in Svelte 5 `$props()` context only captures the initial value, not reactive updates. Svelte reported "state_referenced_locally" warnings.
- **Fix:** Changed `const` to `const x = $derived(data.x)` pattern for all three page data references.
- **Files modified:** src/routes/(app)/+page.svelte, src/routes/(app)/household/+page.svelte
- **Commit:** 865406e

**5. [Rule 1 - Bug] Unused @ts-expect-error in tests caused svelte-check errors**
- **Found during:** Task 3 verification (npm run check after test commit)
- **Issue:** Mock chain types were inferred correctly by TypeScript, making `@ts-expect-error` directives unused and triggering errors.
- **Fix:** Replaced with `eslint-disable` comments and explicit `as any` casts where needed.
- **Files modified:** tests/households/shared-shell.test.ts
- **Commit:** 8553ad4

## Known Stubs

None. All data flows are wired:
- `+page.server.ts` loads real household, member, and expense data from Supabase
- `InstallGuidanceBanner` uses real `shouldShowInstallGuidance()` logic via `onMount`
- No hardcoded placeholder values that block the plan's goal

## Threat Flags

None. No new network endpoints, auth paths, or file access patterns introduced beyond the planned surfaces. The shell reads household-scoped data with the existing RLS policies from Plan 02.

## Self-Check: PASSED
