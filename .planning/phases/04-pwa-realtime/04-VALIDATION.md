---
phase: 04
slug: pwa-realtime
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-03
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.1 and Playwright 1.59.1 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `tests/setup.ts` |
| **Quick run command** | `npm run test:unit -- tests/pwa/installability.test.ts tests/realtime/expense-merge.test.ts` |
| **Full suite command** | `npm run check && npm run test:unit && npm run test:e2e` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- tests/pwa/installability.test.ts tests/realtime/expense-merge.test.ts` after those files exist.
- **After every plan wave:** Run `npm run check && npm run test:unit`.
- **Before `$gsd-verify-work`:** Run `npm run check && npm run test:unit && npm run test:e2e` and complete the manual iOS/Android install checklist.
- **Max feedback latency:** 180 seconds for automated checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-W0-01 | 00 | 0 | PWA-01, PWA-04 | T-04-01 / T-04-04 | Install guidance does not expose session data and hides in standalone mode | unit | `npm run test:unit -- tests/pwa/installability.test.ts tests/pwa/manifest.test.ts` | No, W0 | pending |
| 04-W0-02 | 00 | 0 | PWA-03 | T-04-01 / T-04-04 | Service worker caches app shell/static assets only, not private API responses | e2e | `npx playwright test tests/e2e/pwa-offline-shell.spec.ts --project=chromium` | No, W0 | pending |
| 04-W0-03 | 00 | 0 | SYNC-01, SYNC-02 | T-04-02 / T-04-03 | Realtime rows are household-filtered and merged by `client_id` without duplicate own inserts | unit | `npm run test:unit -- tests/realtime/expense-merge.test.ts` | No, W0 | pending |
| 04-W0-04 | 00 | 0 | SYNC-01 | T-04-02 | Supabase channel uses `household_id=eq.${householdId}` and cleans up on unmount | unit | `npm run test:unit -- tests/realtime/expense-subscription.test.ts` | No, W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/pwa/installability.test.ts` — covers PWA-01/PWA-04 install guidance and standalone visibility helper logic.
- [ ] `tests/pwa/manifest.test.ts` — covers manifest fields: `name`, `short_name`, `display: standalone`, `theme_color`, and 192/512/maskable icon references.
- [ ] `tests/e2e/pwa-offline-shell.spec.ts` — covers first online visit, service worker readiness, offline reload/open, app shell visibility, and stale/offline notice.
- [ ] `tests/realtime/expense-merge.test.ts` — covers SYNC-01/SYNC-02 pure merge skip, queued replacement, and partner highlight behavior.
- [ ] `tests/realtime/expense-subscription.test.ts` — covers Supabase channel filter and cleanup using a mocked client.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Install from iOS Safari and launch as standalone | PWA-01 | iOS Add to Home Screen and browser chrome behavior must be verified on a real iOS device | Open the deployed app in Safari, use Share > Add to Home Screen, launch from the icon, and confirm it opens without Safari browser chrome. |
| Install from Android Chrome and launch as standalone | PWA-01 | Android install prompt/home-screen behavior varies by Chrome/device policy | Open the deployed app in Chrome on Android, install/add to home screen, launch from the icon, and confirm standalone display. |
| Partner device sees a new expense in real time | SYNC-01 | End-to-end Supabase Realtime requires two authenticated household sessions and live backend configuration | Log in as both household members on separate devices/browsers, save an expense as one member, and confirm the other Today list updates without refresh. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 180s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
