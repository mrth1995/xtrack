---
status: testing
phase: 01-foundation
source:
  - .planning/phases/01-foundation/01-01-SUMMARY.md
  - .planning/phases/01-foundation/01-02-SUMMARY.md
  - .planning/phases/01-foundation/01-03-SUMMARY.md
  - .planning/phases/01-foundation/01-04-SUMMARY.md
  - .planning/phases/01-foundation/01-05-SUMMARY.md
  - .planning/phases/01-foundation/01-06-SUMMARY.md
started: 2026-04-25T15:48:39Z
updated: 2026-04-25T15:48:39Z
---

## Current Test

number: 3
name: Auth Guard Redirect
expected: |
  While signed out, opening the app root or another protected app route should redirect to /auth instead of showing protected content or an error page.
awaiting: user response

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
result: [pending]

### 4. Email Sign-Up
expected: On /auth, switching to sign-up with a valid email and password should create the account and continue into the authenticated flow without a crash.
result: [pending]

### 5. Email Sign-In and Logout
expected: An existing account should be able to sign in from /auth, reach the signed-in app, and then log out back to /auth cleanly.
result: [pending]

### 6. Create Household Onboarding
expected: A signed-in user without a household should land on onboarding, be able to create a household with only a name, and then land in the signed-in shell.
result: [pending]

### 7. Join Household by Invite
expected: Entering a valid invite code should show a confirmation step with the household name, and confirming should join that household. Invalid or expired codes should stay on the same screen with an inline error.
result: [pending]

### 8. Invite Management Reuse
expected: From household settings, invite management should show an active invite code and reuse the existing valid code instead of replacing it with a different one.
result: [pending]

### 9. Household Shell and Details
expected: The signed-in home should show household-scoped content with a clear path to View household details, and the household details page should list Members.
result: [pending]

### 10. Safari Install Guidance
expected: In Safari browser context, install guidance should appear with Tap Share, then Add to Home Screen, be snoozable, and stay hidden in standalone mode.
result: [pending]

### 11. Supabase Keep-Alive Setup
expected: The repo should include the scheduled keep-alive workflow and ops runbook, and after adding SUPABASE_KEEPALIVE_URL as a GitHub Actions secret the workflow should be manually runnable without embedding credentials in the repo.
result: [pending]

## Summary

total: 11
passed: 0
issues: 2
pending: 9
skipped: 0
blocked: 0

## Gaps

- truth: "Stop any running dev server, then start the app from scratch. The app should boot without startup errors, and loading the main URL should show a live page instead of a crash, blank screen, or setup failure."
  status: failed
  reason: "User reported: I got failed fetch failed with error logs [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co"
  severity: blocker
  test: 1
  artifacts: []
  missing: []
- truth: "Run the documented Supabase migration setup for Phase 1. The schema should apply cleanly, and a second push should report no pending migrations instead of failing or reapplying work."
  status: failed
  reason: "User reported: I got error [TypeError: fetch failed] { [cause]: Error: getaddrinfo ENOTFOUND placeholder.supabase.co } in my error logs"
  severity: blocker
  test: 2
  artifacts: []
  missing: []
