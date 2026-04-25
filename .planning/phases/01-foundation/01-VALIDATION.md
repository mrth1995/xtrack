---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + SvelteKit test utilities |
| **Config file** | `vitest.config.ts` or `vite.config.ts` test block — Wave 0 installs if missing |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test && npm run check` |
| **Estimated runtime** | ~20 seconds once scaffold exists |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test && npm run check`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | AUTH-01, AUTH-02, AUTH-03 | T-01-auth / T-01-env | App scaffold boots with test runner and env guards; no client exposure of privileged keys | unit | `npm run test:unit -- auth env` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04 | T-01-rls / T-01-invite-race | Schema, constraints, and RLS reject cross-household access and invite reuse | integration | `npm run test:unit -- db rls invite` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | AUTH-01, AUTH-02, AUTH-03, AUTH-04 | T-01-standalone-session | Email/password auth works and standalone session restoration has explicit pass/fail behavior | unit | `npm run test:unit -- auth session` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | HOUSE-01, HOUSE-02, HOUSE-03 | T-01-invite-race | Household create/join/invite happy and error paths are covered | integration | `npm run test:unit -- household invite` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 2 | PWA-02 | T-01-install-context | Install guidance appears only in Safari auth context and stays hidden in standalone mode | unit | `npm run test:unit -- install-banner` | ❌ W0 | ⬜ pending |
| 01-06-01 | 06 | 2 | INFRA-01 | T-01-secret-leak | Keep-alive workflow exists and uses secrets/config safely | static | `npm run test:unit -- keepalive` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — add test scripts for `test:unit`, `test`, and `check`
- [ ] `vitest.config.ts` or Vite test config — baseline unit/integration test setup
- [ ] `tests/setup.ts` or equivalent — shared mocks for browser/runtime detection
- [ ] `tests/db/` — SQL/RLS verification harness or script entrypoint
- [ ] `tests/auth/` — auth/session behavior tests
- [ ] `tests/households/` — create/join/invite happy/error path coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Safari first-visit install guidance | PWA-02 | Browser/install context is difficult to trust fully from unit tests alone | On iPhone Safari, sign in, confirm banner appears after auth, dismiss once, refresh, verify snooze behavior. |
| Safari-to-standalone continuity | AUTH-04 | Installed-PWA transition must be observed in real device context | Sign in in Safari, add to Home Screen, open installed app, verify session restoration path runs and user is not stranded on a broken shell. |
| Two-user household join smoke test | HOUSE-03, HOUSE-04 | Shared membership proof is easiest to trust with real accounts in early greenfield stage | Create household with user A, generate code, join with user B, verify both accounts resolve to the same household context. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
