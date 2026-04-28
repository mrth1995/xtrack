---
phase: 2
slug: quick-add
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 + @testing-library/svelte 5.2.7 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm run test -- tests/expenses/ --reporter=verbose 2>&1 \| tail -30` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- tests/expenses/ --reporter=verbose`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | INPUT-03 | — | N/A | unit | `npm run test -- tests/expenses/formatters.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | INPUT-02, INPUT-06, INPUT-07 | — | N/A | unit | `npm run test -- tests/expenses/numpad.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | INPUT-05, INPUT-14 | T-05, T-06 | household_id from locals only | unit | `npm run test -- tests/expenses/quick-add.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | INPUT-12, INPUT-13 | T-05, T-06 | is_deleted soft delete; creator-only update | unit | `npm run test -- tests/expenses/edit.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-06, INPUT-07 | T-01 | amount/category validated server-side | unit + manual | `npm run test -- tests/expenses/` | ✅ after W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | INPUT-12, INPUT-13, INPUT-14 | T-02, T-03, T-04 | creator-only update; soft delete | unit + manual | `npm run test -- tests/expenses/edit.test.ts` | ✅ after W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | INPUT-01 | — | N/A | manual | (visual verification) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/expenses/formatters.test.ts` — unit tests for IDR formatter functions (INPUT-03)
- [ ] `tests/expenses/numpad.test.ts` — numpad renders 12 keys, debounce, UUID generation (INPUT-02, INPUT-06, INPUT-07)
- [ ] `tests/expenses/quick-add.test.ts` — saveExpense and saveNote server actions (INPUT-05, INPUT-14)
- [ ] `tests/expenses/edit.test.ts` — saveEdit and deleteExpense (soft delete) actions (INPUT-12, INPUT-13)

*Existing infrastructure: `tests/setup.ts`, `vitest.config.ts`, jsdom environment — all reusable without changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quick Add numpad is first screen after login | INPUT-01 | Navigation flow; requires browser session | Log in → verify numpad is visible without any other screen/tap |
| IDR formatting displays in real time on numpad | INPUT-03 | Visual real-time update | Tap 5, 4, 0, 0, 0 → display shows "54.000" at each keystroke |
| Category tile debounce (500ms visual feedback) | INPUT-06 | Timing-based UI state | Tap category tile → tile shows highlight for ~500ms; rapid double-tap doesn't submit twice |
| Bottom sheet slides up after save | INPUT-14 | CSS animation; JSDOM lacks rendering | Tap category after entering amount → bottom sheet slides up; "Skip" dismisses it |
| Edit form date field shows WIB date correctly | INPUT-12 | Timezone requires device testing | Log expense at 23:00 WIB → open edit → date field shows correct local date (not UTC-1 day) |
| Delete expense disappears from list | INPUT-13 | Requires navigation + DB state | Delete expense → redirect to home → expense not in today list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
