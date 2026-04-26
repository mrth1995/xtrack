---
status: partial
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-04-26T13:29:00Z
updated: 2026-04-26T13:29:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Safari installed-PWA auth continuity
expected: On iOS Safari, sign in, add to Home Screen, open from Home Screen — user sees "Restoring your session..." then enters signed-in shell. Unauthenticated restoration redirects to /auth?session=expired.
result: [pending]

### 2. Two-user household and shared expense stream
expected: Apply migrations, create user A / household / invite, join with user B in a separate browser profile. Insert a shared expense via SQL. Verify both users see the same expense row after refresh. Use a third user outside the household and confirm their household/expense queries return empty results.
result: [pending]

### 3. GitHub Actions keep-alive
expected: Add SUPABASE_KEEPALIVE_URL secret to the GitHub repository and run the workflow manually. Workflow exits 0 and logs a successful HTTP response.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
