# Phase 03 UAT Evidence - Offline Tolerance

**Date:** 2026-05-02
**Scope:** Final automated Phase 03 acceptance gate for offline Quick Add, queue flush, retry idempotency, and security mitigations.

## Commands Run

- `npx playwright test tests/e2e/offline-quick-add.spec.ts --list` - passed; listed 1 Chromium test: `offline quick add queues then flushes without duplicate Food row`.
- `npm run check` - passed with 0 errors and 2 existing Svelte warnings about state initialized from route `data` in `src/routes/(app)/+page.svelte` and `src/routes/(app)/expenses/+page.svelte`.
- `npm run test` - passed; 20 test files passed, 188 tests passed, 13 skipped.
- `npx playwright test tests/e2e/offline-quick-add.spec.ts` - passed; 1 Chromium test passed.
- Full gate command `npm run check && npm run test && npx playwright test tests/e2e/offline-quick-add.spec.ts` - passed.

## Requirement Evidence

- `INPUT-08` - Offline Quick Add is captured locally and visible immediately. Evidence: `tests/e2e/offline-quick-add.spec.ts` drives `context.setOffline(true)`, taps `Food`, and asserts visible `Waiting`; `src/routes/(app)/+page.svelte` calls `queueExpense` with `household_id: data.householdId`, merges the queued row, and renders `sync_status: 'queued'`.
- `INPUT-09` - Queue flush triggers run on reconnect and foreground resume without hot-looping access failures. Evidence: `src/lib/offline/expense-sync.ts` installs `online` and `visibilitychange` handlers and filters queued/failed rows once per flush; `tests/offline/expense-sync.test.ts` verifies trigger installation and auth/household/RLS failure classification.
- `INPUT-10` - Stuck `syncing` records recover back to `Waiting` without data loss. Evidence: `src/lib/offline/expense-queue.ts` implements `recoverStaleSyncingExpenses` using the 5-minute threshold; `tests/offline/expense-queue.test.ts` verifies stale rows return to `queued` while fresh syncing rows stay locked.
- `INPUT-11` - Retry is idempotent and the browser flow does not duplicate rows. Evidence: `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql` uses `ON CONFLICT (client_id) DO NOTHING`; `tests/expenses/quick-add.test.ts` covers RPC retry behavior; `tests/e2e/offline-quick-add.spec.ts` asserts `toHaveCount(1)` for the final `Food` row after online flush.

## Security Evidence

- IndexedDB sensitive data - `tests/offline/expense-queue.test.ts` asserts queued records contain only amount, category, note, spent_at, client_id, household_id, sync status, timestamps, and retry metadata. `src/lib/offline/expense-queue.ts` does not store auth tokens, session objects, anon keys, or service-role material.
- household mismatch - `src/routes/(app)/+page.server.ts` rejects queued `household_id` values that differ from `locals.householdId` with `syncErrorCode: 'household_mismatch'`; `src/lib/offline/expense-sync.ts` also marks current-household mismatches failed before posting.
- replay/idempotency - `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql` enforces retry safety with `ON CONFLICT (client_id) DO NOTHING`; the e2e test proves one visible `Food` row remains after reconnect.
- expired auth - `src/routes/(app)/+page.server.ts` returns `syncErrorCode: 'auth'` for offline sync without a valid user/session; `src/lib/offline/expense-sync.ts` pauses flush when `sessionReady` or `householdId` is absent.
- RLS denial retry loops - `src/lib/offline/expense-sync.ts` classifies `household_access` as failed instead of treating it as a network retry; `tests/offline/expense-sync.test.ts` verifies the row becomes `failed` with no same-loop retry.
- migration/RPC access control - `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql` defines `save_expense_idempotent` as `SECURITY DEFINER`, checks `auth.uid()` and `public.is_household_member`, revokes `PUBLIC`, and grants execute only to `authenticated`.
