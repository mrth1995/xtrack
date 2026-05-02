---
phase: 03
slug: offline-tolerance
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-02
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `3.1.1`; Playwright `1.59.1` to add in Wave 0 |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` to add in Wave 0 |
| **Quick run command** | `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts` |
| **Full suite command** | `npm run check && npm run test && npx playwright test tests/e2e/offline-quick-add.spec.ts` |
| **Estimated runtime** | ~90 seconds after Playwright browser install |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- tests/offline/expense-queue.test.ts tests/offline/expense-sync.test.ts`
- **After every plan wave:** Run `npm run check && npm run test`
- **Before `$gsd-verify-work`:** Run `npm run check && npm run test && npx playwright test tests/e2e/offline-quick-add.spec.ts`
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | INPUT-08 | T-03-05 | Queued payload stores only expense fields and retry metadata | unit | `npm run test:unit -- tests/offline/expense-queue.test.ts -t queued` | W0 | pending |
| 03-00-02 | 00 | 0 | INPUT-09 | T-03-04 | Flush trigger does not hot-loop on non-network auth/RLS failures | unit | `npm run test:unit -- tests/offline/expense-sync.test.ts -t triggers` | W0 | pending |
| 03-00-03 | 00 | 0 | INPUT-10 | T-03-04 | Stale syncing rows reset to queued without destructive data loss | unit | `npm run test:unit -- tests/offline/expense-queue.test.ts -t stale` | W0 | pending |
| 03-00-04 | 00 | 0 | INPUT-11 | T-03-02 | Retry uses server-side idempotency keyed by `client_id` | integration | `npm run test:unit -- tests/expenses/quick-add.test.ts -t idempotent` | partial | pending |
| 03-00-05 | 00 | 0 | INPUT-08, INPUT-11 | T-03-02 | Offline save becomes visible immediately and online flush does not duplicate | e2e | `npx playwright test tests/e2e/offline-quick-add.spec.ts` | W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/offline/expense-queue.test.ts` - covers INPUT-08 and INPUT-10.
- [ ] `tests/offline/expense-sync.test.ts` - covers INPUT-09 trigger and failure classification behavior.
- [ ] `tests/e2e/offline-quick-add.spec.ts` - covers offline save -> visible `Waiting` row -> online flush -> status disappears without duplicate.
- [ ] `playwright.config.ts` - configures browser-level offline flow tests.
- [ ] `package.json` - adds a `test:e2e` script or documents `npx playwright test tests/e2e/offline-quick-add.spec.ts`.
- [ ] `fake-indexeddb` setup in `tests/setup.ts` if jsdom IndexedDB APIs are insufficient for `idb`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Installed PWA/iOS offline behavior | Future PWA phase | Browser simulation is sufficient for Phase 03; installed app UAT belongs to Phase 04 | None for Phase 03 |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references from the research validation map.
- [x] No watch-mode flags.
- [x] Feedback latency target is below 120 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
