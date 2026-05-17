# Phase 04: pwa-realtime - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 04-pwa-realtime
**Areas discussed:** Offline shell caching, Install polish, Realtime merge behavior, Own insert suppression and reconnects

---

## Offline Shell Caching

| Option | Description | Selected |
|--------|-------------|----------|
| Shell only | Cache app shell/assets so the installed app opens offline, then existing IndexedDB queue/list behavior supplies local rows where available. | yes |
| Shell + data | Also preserve last-known loaded route data for Today/history, which is richer but adds cache invalidation complexity. | |
| You decide | Let planning choose the smallest reliable implementation that satisfies `PWA-03`. | |

**User's choice:** Shell only.
**Notes:** Offline launch should stay quiet: normal app frame, local rows where available, no big banner or dedicated offline screen. Service worker updates should happen naturally on next open/reload rather than through a prompt or forced reload.

---

## Install Polish

| Option | Description | Selected |
|--------|-------------|----------|
| Functional install pass | Manifest, icons, theme color, standalone display, offline shell, and manual iOS/Android install verification. | yes |
| Polished install pass | Functional pass plus splash-screen/icon refinements and platform-specific visual QA. | |
| Minimal compliance | Only the minimum manifest/service-worker work needed to satisfy the listed requirements. | |

**User's choice:** Functional install pass.
**Notes:** Create a simple branded xtrack icon set. Android install support should remain passive: make the app installable, but do not add a separate Android `beforeinstallprompt` banner/button.

---

## Realtime Merge Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Appear instantly | Insert partner expenses directly into Today/history in sorted order with no prompt. | yes |
| Subtle indicator first | Show a "new expense" cue/button, then insert when tapped. | |
| Refresh silently later | Let route invalidation or next navigation pick them up, avoiding live list mutation. | |

**User's choice:** Appear instantly.
**Notes:** Incoming partner expenses must never interrupt Quick Add input. Home Today list and `/expenses` history should both update live in Phase 04.

---

## Own Insert Suppression and Reconnects

| Option | Description | Selected |
|--------|-------------|----------|
| `client_id` match | Skip incoming rows whose `client_id` already exists locally or in visible rows. | yes |
| `created_by` match | Skip all inserts from the current user, even if `client_id` is unfamiliar. | |
| Both guards | Use `client_id` for dedupe and `created_by` as an extra safety check. | |

**User's choice:** `client_id` match.
**Notes:** On Realtime reconnect, invalidate/reload server data and merge with local queued rows. If an incoming or reloaded server row shares `client_id` with a local/visible row, keep one row and merge/update the existing row rather than appending.

---

## the agent's Discretion

- Exact service worker setup, cache naming, and implementation module boundaries.
- Exact branded icon visual treatment within the existing xtrack style.
- Whether edit pages get any low-cost consistency hook beyond home/history live updates.

## Deferred Ideas

None - discussion stayed within phase scope.
