---
phase: 03
slug: offline-tolerance
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-03
---

# Phase 03 - Security

Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser -> IndexedDB | User actions create and mutate durable local queued expenses. | Amount, category, note, spent_at, client_id, household_id, sync status, timestamps, retry metadata. |
| IndexedDB -> network flush | Tampered local payloads may be sent to the server action. | Queued expense payload and current sync context. |
| browser/form -> server action | Offline sync form data crosses into SvelteKit actions. | Form-encoded expense payload and queued household id. |
| server action -> Supabase RPC | Authenticated database write must enforce identity, household access, and idempotency. | RPC parameters derived from validated input and server locals. |
| migration -> production database | New RPC grant affects who can insert expenses. | `save_expense_idempotent` function, grants, and membership checks. |
| localhost test fixture -> app auth/action paths | Playwright fixture can bypass auth and deterministic save behavior only in local e2e mode. | Fake local session/household and fixture expense response. |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Information Disclosure | IndexedDB sensitive data | mitigate | `QueuedExpense` contains only expense payload, household id, sync status, timestamps, and retry metadata in `src/lib/offline/types.ts:5`; queue writes only those fields in `src/lib/offline/expense-queue.ts:76`; tests assert exact stored keys in `tests/offline/expense-queue.test.ts:44`. | closed |
| T-03-02 | Tampering/Elevation | Tampered queued payload household mismatch | mitigate | Flush marks mismatched queued household rows failed before POST in `src/lib/offline/expense-sync.ts:221`; server rejects queued household mismatch before RPC in `src/routes/(app)/+page.server.ts:148`; RPC uses server-derived `p_household_id: householdId` in `src/routes/(app)/+page.server.ts:172`; SQL verifies membership in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:32`. | closed |
| T-03-03 | Tampering/Repudiation | Replay/idempotency | mitigate | IndexedDB store is keyed by stable `client_id` in `src/lib/offline/expense-queue.ts:65`; sync posts the queued `client_id` in `src/lib/offline/expense-sync.ts:94`; UI dedupes by `client_id` in `src/routes/(app)/+page.svelte:86`; SQL uses `ON CONFLICT (client_id) DO NOTHING` and selects the existing same-household row in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:54`; Playwright asserts one Food row in `tests/e2e/offline-quick-add.spec.ts:23`. | closed |
| T-03-04 | Spoofing | Expired auth | mitigate | Flush pauses when session or household context is missing in `src/lib/offline/expense-sync.ts:201`; sync classifies `syncErrorCode: 'auth'` in `src/lib/offline/expense-sync.ts:77`; server maps offline sync without user/session to `syncErrorCode: 'auth'` in `src/routes/(app)/+page.server.ts:138`; RPC rejects unauthenticated callers with SQLSTATE `28000` in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:28`. | closed |
| T-03-05 | Denial of Service | RLS denial retry loops | mitigate | Access failures map to failed/local messages in `src/lib/offline/expense-sync.ts:32`; flush snapshots queued/failed rows once per invocation in `src/lib/offline/expense-sync.ts:209`, marks access failures failed in `src/lib/offline/expense-sync.ts:256`, and requeues only network failures in `src/lib/offline/expense-sync.ts:247`; tests verify one POST and failed status in `tests/offline/expense-sync.test.ts:69`; syncing rows are non-links in `src/lib/components/ExpenseList.svelte:56`; failed rows expose manual retry in `src/routes/(app)/expenses/[id]/edit/+page.svelte:284`. | closed |
| T-03-06 | Elevation | Database migration/RPC access control | mitigate | Migration uses `SECURITY DEFINER` and `SET search_path = public` in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:21`, checks auth and household membership in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:28`, revokes `PUBLIC` and grants only `authenticated` in `supabase/migrations/2026050201_phase3_idempotent_expense_insert.sql:82`; localhost Playwright fixtures require `PLAYWRIGHT_E2E_FIXTURE=1` and `127.0.0.1`/`localhost` in `src/hooks.server.ts:21` and `src/routes/(app)/+page.server.ts:86`. | closed |

## Threat Flags

| Flag | Mapping | Status | Evidence |
|------|---------|--------|----------|
| threat_flag: test-auth-bypass | T-03-06 | closed | `src/hooks.server.ts:21` requires `PLAYWRIGHT_E2E_FIXTURE=1` and host `127.0.0.1` or `localhost` before fake locals are installed. |
| threat_flag: test-action-fixture | T-03-06 | closed | `src/routes/(app)/+page.server.ts:86` requires `PLAYWRIGHT_E2E_FIXTURE=1` and host `127.0.0.1` or `localhost` before fixture load/action behavior is used. |

## Accepted Risks Log

No accepted risks.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-03 | 6 | 6 | 0 | Codex / gsd-security-auditor |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-03
