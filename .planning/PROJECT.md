# xtrack

## What This Is

xtrack is a mobile-installable expense tracker (PWA) for Indonesian users who want to log spending fast and see where the money actually goes, one payday cycle at a time. Built personal-first for a household of two, designed so it can ship publicly to college students and young-adult families later.

## Core Value

Logging an expense must feel effortless — from the moment the user thinks "I just spent money" to the moment it's saved should be at most a few taps, no menu diving, no form filling.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Installable PWA that works on Android (primary) with home-screen icon + app-shortcut menu (long-press → Quick add / Scan receipt / View report)
- [ ] Cloud account sign-in so data survives device changes and can be shared across devices
- [ ] Shared household: one person creates a household, invites partner via link or short code; both see and add to the same expense stream
- [ ] Manual quick-add (first-class): big amount numpad opens first, then a row of category tiles — two to three taps to save
- [ ] Receipt scan (secondary): snap a photo, parse amount + category via free-tier LLM/OCR; if confidence is low, fall back to manual entry
- [ ] Fixed preset categories for v1 (food, transport, entertainment, utilities, shopping, health, others — final list locked during Requirements)
- [ ] IDR currency formatting throughout (thousand separators, short-form "15k / 1.5jt" where it helps legibility)
- [ ] Payday cycle: user sets a fixed day of month (e.g. 25th). "Current cycle" runs from that day to the day before next month's payday. All totals and reports default to the current cycle.
- [ ] Category breakdown report: pie/donut for the current cycle showing spending by category, plus total spent
- [ ] Saved expense templates (e.g. "Netflix 54k / Entertainment") — tap to re-add a known recurring expense; no auto-firing in v1
- [ ] Optional free-text note per expense
- [ ] Edit and delete logged expenses

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- iOS native app — PWA on iOS works but home-screen shortcuts are Android-only; iOS polish is v2
- Voice input — deferred; user picked receipt-first for AI-assisted input
- Multi-currency — IDR only; multi-currency adds FX, formatting, and data-model complexity with no current user need
- Budgets, goals, alerts — v1 is "track only"; budgeting is a future milestone
- Auto-firing recurring expenses / push notifications — saved templates only in v1; scheduled firing needs a background worker story we don't want to solve yet
- Trend comparison, timeline views, per-person breakdown — single category-breakdown view for v1 to keep the report surface small
- CSV / JSON export — deferred; reconsider when user base grows beyond the household
- Receipt parsing via paid LLM APIs — free tier only; paid accuracy upgrade is a later call
- Payday cycles that aren't monthly-fixed-date (bi-weekly, two-earner dual cycles) — one cycle per household for v1

## Context

- **Locale:** Indonesia. Currency is IDR, amounts are routinely 5–7 digits, and users think in "k" (thousand) and "jt" (million). Payment context includes Gojek, GrabFood, QRIS, e-wallets — informs example copy and receipt parsing expectations.
- **Primary device:** Android smartphones. PWA install to home screen, long-press for app-shortcuts (Android-supported), offline-tolerant input.
- **Household model:** Two users sharing one financial view. Not a multi-tenant SaaS concern yet, but data model must isolate household scope from day one so "invite a partner" isn't a rewrite later.
- **Why receipt-scan matters:** Indonesian receipts are common for food/groceries. Parsing with free-tier LLM is good enough for amount extraction most of the time; the fallback-to-manual UX protects against the times it isn't.
- **Prior work:** None — greenfield. No existing codebase, no accumulated tech debt.
- **Builder shape:** Solo developer building personal-first. Tech stack is open — research phase will propose a PWA + auth + DB stack that fits a single developer who wants to ship, not maintain infrastructure.

## Constraints

- **Tech stack:** PWA-capable web stack required (service worker, installable, app-shortcuts manifest). Specific libraries deferred to research.
- **Budget:** Running costs should stay near zero for a household-sized app. Receipt parsing uses free-tier LLM/OCR only. Hosting and database tiers should be free or near-free for two users.
- **Platform:** Android-first for home-screen shortcut behavior. iOS should degrade gracefully (still installable, still usable) but isn't the target.
- **Locale:** IDR-only, Indonesian-friendly formatting. No i18n framework investment needed.
- **Data:** Cloud-synced from day one (both partners need to see the same data) but offline-tolerant so a missed connection at the warteg doesn't block logging.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Personal-first, ship-later scope | Optimize for the builder's own use; ship-ability is a design constraint, not a v1 deliverable | — Pending |
| PWA over native | One codebase, home-screen install covers the Android case; avoids app-store overhead for personal use | — Pending |
| Cloud account (not local-only) | Shared household needs a single source of truth between two devices | — Pending |
| Shared household via invite code | Lets partners stay as separate identities while sharing one budget view (vs shared login which loses attribution) | — Pending |
| Track-only in v1 (no budgets) | Keeps v1 small and proves the input-speed + visibility loop before layering goals | — Pending |
| Fixed preset categories in v1 | Removes a setup step; customization is cheap to add later if presets don't fit | — Pending |
| Receipt parsing with free-tier LLM, manual fallback | Zero running cost, and the fallback makes parsing failures non-blocking | — Pending |
| Saved templates (not auto-firing) for recurring expenses | Avoids a scheduler/worker story in v1; a one-tap template is close enough to "auto" in practice | — Pending |
| Monthly fixed-date payday cycle | Covers the builder's actual case; defers variable/bi-weekly/dual-earner complexity | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after initialization*
