---
status: diagnosed
phase: 01-foundation
source:
  - .planning/phases/01-foundation/01-01-SUMMARY.md
  - .planning/phases/01-foundation/01-02-SUMMARY.md
  - .planning/phases/01-foundation/01-03-SUMMARY.md
  - .planning/phases/01-foundation/01-04-SUMMARY.md
  - .planning/phases/01-foundation/01-05-SUMMARY.md
  - .planning/phases/01-foundation/01-06-SUMMARY.md
started: 2026-04-25T15:48:39Z
updated: 2026-04-26T06:17:25+07:00
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running dev server, then start the app from scratch. The app should boot without startup errors, and loading the main URL should show a live page instead of a crash, blank screen, or setup failure.
result: issue
reported: "I got failed fetch failed with error logs [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co"
severity: blocker

### 2. Database Migration Apply
expected: Run the documented Supabase migration setup for Phase 1. The schema should apply cleanly, and a second push should report no pending migrations instead of failing or reapplying work.
result: issue
reported: "I got error [TypeError: fetch failed] { [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co } in my error logs"
severity: blocker

### 3. Auth Guard Redirect
expected: While signed out, opening the app root or another protected app route should redirect to /auth instead of showing protected content or an error page.
result: pass

### 4. Email Sign-Up
expected: On /auth, switching to sign-up with a valid email and password should create the account and continue into the authenticated flow without a crash.
result: pass

### 5. Email Sign-In and Logout
expected: An existing account should be able to sign in from /auth, reach the signed-in app, and then log out back to /auth cleanly.
result: issue
reported: "no logout button"
severity: major

### 6. Create Household Onboarding
expected: A signed-in user without a household should land on onboarding, be able to create a household with only a name, and then land in the signed-in shell.
result: pass

### 7. Join Household by Invite
expected: Entering a valid invite code should show a confirmation step with the household name, and confirming should join that household. Invalid or expired codes should stay on the same screen with an inline error.
result: issue
reported: "cannot join household, always shows \"That code is invalid, expired, or already used. Ask for a new code and try again\" even when code is valid"
severity: major

### 8. Invite Management Reuse
expected: From household settings, invite management should show an active invite code and reuse the existing valid code instead of replacing it with a different one.
result: issue
reported: "it doesn't reuse existing valid code, always replacing"
severity: major

### 9. Household Shell and Details
expected: The signed-in home should show household-scoped content with a clear path to View household details, and the household details page should list Members.
result: blocked
blocked_by: prior-phase
reason: "cannot be tested because cannot invite member"

### 10. Safari Install Guidance
expected: In Safari browser context, install guidance should appear with Tap Share, then Add to Home Screen, be snoozable, and stay hidden in standalone mode.
result: pass

### 11. Supabase Keep-Alive Setup
expected: The repo should include the scheduled keep-alive workflow and ops runbook, and after adding SUPABASE_KEEPALIVE_URL as a GitHub Actions secret the workflow should be manually runnable without embedding credentials in the repo.
result: pass

## Summary

total: 11
passed: 5
issues: 5
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Stop any running dev server, then start the app from scratch. The app should boot without startup errors, and loading the main URL should show a live page instead of a crash, blank screen, or setup failure."
  status: failed
  reason: "User reported: I got failed fetch failed with error logs [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co"
  severity: blocker
  test: 1
  root_cause: "The runtime environment was still pointing at a placeholder Supabase host. The app now documents real Supabase env setup, but there is no startup guard that fails fast with an actionable local error before Supabase fetches `placeholder.supabase.co`."
  artifacts:
    - path: "src/lib/supabase/client.ts"
      issue: "Client uses PUBLIC_SUPABASE_URL directly; invalid placeholder values surface as fetch/DNS failures."
    - path: "src/lib/supabase/server.ts"
      issue: "Server uses PUBLIC_SUPABASE_URL directly; invalid placeholder values surface as fetch/DNS failures."
    - path: "README.md"
      issue: "Docs explain the placeholder failure, but the app does not prevent it at startup."
  missing:
    - "Add explicit Supabase env validation for empty or placeholder PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY."
    - "Return an actionable setup failure before Supabase client calls produce DNS errors."
- truth: "Run the documented Supabase migration setup for Phase 1. The schema should apply cleanly, and a second push should report no pending migrations instead of failing or reapplying work."
  status: failed
  reason: "User reported: I got error [TypeError: fetch failed] { [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co } in my error logs"
  severity: blocker
  test: 2
  root_cause: "The reported failure is the same placeholder Supabase URL problem as Test 1, so database verification is blocked before migration state can be meaningfully validated."
  artifacts:
    - path: ".env.example"
      issue: "Template is safe, but local `.env` can still contain placeholder values without a clear app-level guard."
    - path: "README.md"
      issue: "Docs describe migration setup, but there is no single verification command that validates env + migration readiness."
  missing:
    - "Add a setup verification path that checks Supabase env values before running app/database verification."
    - "Document and/or script the expected migration validation sequence after real Supabase credentials are configured."
- truth: "An existing account should be able to sign in from /auth, reach the signed-in app, and then log out back to /auth cleanly."
  status: failed
  reason: "User reported: no logout button"
  severity: major
  test: 5
  root_cause: "A logout endpoint exists, but the signed-in shell does not expose a visible logout form/link, so users cannot discover or trigger it from the UI."
  artifacts:
    - path: "src/routes/logout/+server.ts"
      issue: "Backend logout endpoint exists and signs out."
    - path: "src/routes/(app)/+page.svelte"
      issue: "Signed-in shell has household and invite actions but no logout control."
    - path: "src/routes/(app)/household/+page.svelte"
      issue: "Household details page also lacks a logout control."
  missing:
    - "Add a visible logout control in the signed-in shell."
    - "Cover the logout control with a regression test."
- truth: "Entering a valid invite code should show a confirmation step with the household name, and confirming should join that household. Invalid or expired codes should stay on the same screen with an inline error."
  status: failed
  reason: "User reported: cannot join household, always shows \"That code is invalid, expired, or already used. Ask for a new code and try again\" even when code is valid"
  severity: major
  test: 7
  root_cause: "The join lookup now depends on `lookup_household_invite`, a new migration-created RPC. If that migration is not applied, Supabase returns an RPC error without an invite hint and the service collapses it into the generic invalid-code message. The invite flow also lacks live DB verification for the new lookup RPC."
  artifacts:
    - path: "src/lib/server/households/service.ts"
      issue: "`lookupInviteCode` maps unknown RPC errors to `invalid_code`, hiding missing-function/deployment failures."
    - path: "supabase/migrations/2026042601_invite_lookup_rpc.sql"
      issue: "New lookup RPC must be applied to the target Supabase database before valid codes can be confirmed."
    - path: "tests/db/phase1-rls.test.ts"
      issue: "Live invite lookup/acceptance coverage is skipped without Supabase credentials."
  missing:
    - "Distinguish missing/unavailable lookup RPC from true invalid invite codes."
    - "Add live or structural verification that `lookup_household_invite` exists and handles valid codes."
    - "Ensure the new migration is applied before manual invite UAT."
- truth: "From household settings, invite management should show an active invite code and reuse the existing valid code instead of replacing it with a different one."
  status: failed
  reason: "User reported: it doesn't reuse existing valid code, always replacing"
  severity: major
  test: 8
  root_cause: "`getOrCreateActiveInviteCode` performs a direct RLS-scoped select for an existing invite and ignores lookup errors. If the existing-invite read returns no visible row or an error, the service falls through to `create_household_invite`, which always inserts a new invite. Reuse should be enforced in a database RPC, not split across client-side read then create."
  artifacts:
    - path: "src/lib/server/households/service.ts"
      issue: "Existing invite lookup ignores errors and falls back to creating a new invite."
    - path: "supabase/migrations/2026042501_phase1_foundation.sql"
      issue: "`create_household_invite` always inserts a new row instead of returning an existing active invite."
    - path: "src/routes/(app)/settings/invite/+page.server.ts"
      issue: "Page relies on service behavior, so every failed lookup appears as replacement."
  missing:
    - "Move get-or-create invite reuse into a `SECURITY DEFINER` RPC that returns an existing active invite before inserting."
    - "Handle existing-invite read errors explicitly instead of silently creating a replacement."
    - "Add regression coverage for active invite reuse through the RPC/service boundary."
