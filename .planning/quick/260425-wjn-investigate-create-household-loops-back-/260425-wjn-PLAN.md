# Quick Task 260425-wjn Plan

**Date:** 2026-04-25
**Description:** investigate create household loops back to no household yet after submit

## Goal

Stop the onboarding flow from staying on “No household yet” after successful household creation.

## Tasks

### 1. Fix server-side redirect handling
- Audit onboarding and invite server routes for incorrect `redirect(...)` calls.
- Convert affected redirects to `throw redirect(...)` so SvelteKit actually exits the handler.

### 2. Add regression coverage
- Add server-route tests proving onboarding redirects happen for unauthenticated users, existing-household users, and successful create-household submissions.

### 3. Verify the fix
- Run the new onboarding route test suite.
- Run Svelte type checks.

