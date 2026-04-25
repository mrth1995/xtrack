# Roadmap: xtrack

## Overview

xtrack v1.0 ships as a mobile-installable PWA for Indonesian households to track expenses at speed. The build order is security-first: RLS and auth isolation go in Phase 1 because they cannot be safely retrofitted. The core write path (Quick Add numpad) follows in Phase 2, validating the emotional core of the product before adding offline complexity. Phases 3 and 4 layer reliability (offline queue) and reach (PWA install + real-time sync). Phase 5 delivers reporting once real expense data exists to prove it. Phase 6 adds the secondary input paths (receipt scan + templates) after the write path is stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Auth, household model, DB schema, RLS, INFRA keep-alive, and iOS install guidance
- [ ] **Phase 2: Quick Add** - Core write path: numpad, categories, expense list, edit/delete, notes, IDR formatting
- [ ] **Phase 3: Offline Tolerance** - IndexedDB queue, sync flush, IN_FLIGHT recovery, idempotent server inserts
- [ ] **Phase 4: PWA + Realtime** - Service worker, web app manifest, full PWA install, Supabase Realtime household sync
- [ ] **Phase 5: Reports** - Payday cycle config, WIB-aware cycle boundaries, donut chart, cycle header
- [ ] **Phase 6: Secondary Input** - Receipt scan Edge Function + Gemini Flash, saved expense templates

## Phase Details

### Phase 1: Foundation
**Goal**: Secure, multi-device-ready data layer exists; users can create accounts, form a household, and install guidance appears on first Safari visit
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, HOUSE-01, HOUSE-02, HOUSE-03, HOUSE-04, INFRA-01, PWA-02
**Success Criteria** (what must be TRUE):
  1. User can sign up, log in, and log out with email and password
  2. After installing the PWA from Safari, opening from Home Screen does not log the user out (silent token refresh via IndexedDB-persisted session)
  3. User can create a household; a second user can join it by entering the invite code
  4. Both household members see the same expense stream (verified by joining household, not just by creating one)
  5. First Safari visit shows an "Add to Home Screen" install guidance banner; Supabase keep-alive cron is configured
**Plans**: 10 plans (7 complete, 3 gap-closure)
Plans:
- [x] 01-01-PLAN.md — Scaffold app, tooling, and Supabase baseline
- [x] 01-02-PLAN.md — Create Phase 1 schema, SQL helpers, and RLS
- [x] 01-03-PLAN.md — Implement auth and session handling
- [x] 01-04-PLAN.md — Implement household create/join/invite flows
- [x] 01-05-PLAN.md — Implement signed-in shell, household details, and install guidance
- [x] 01-06-PLAN.md — Add Supabase keep-alive automation
- [x] 01-07-PLAN.md — Fix invite lookup and active invite reuse gaps found during UAT
- [ ] 01-08-PLAN.md — Close app runtime gaps for AUTH-04, env validation, loader errors, and logout
- [ ] 01-09-PLAN.md — Close RLS and invite RPC security gaps
- [ ] 01-10-PLAN.md — Push Supabase schema and record two-user shared-stream verification
**UI hint**: yes

### Phase 2: Quick Add
**Goal**: Users can log an expense in 2–3 taps from home screen to saved, see their expense list, and correct mistakes via edit or delete
**Depends on**: Phase 1
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-06, INPUT-07, INPUT-12, INPUT-13, INPUT-14
**Success Criteria** (what must be TRUE):
  1. Quick Add numpad is the first screen after login; no dashboard or menu is required to reach it
  2. Tapping digits on the numpad shows a real-time IDR-formatted amount (e.g. "54.000"); tapping a category tile saves the expense immediately
  3. Double-tapping a category tile does not create a duplicate expense
  4. User can open a saved expense, change the amount, category, note, or date, and save the edit
  5. User can delete a saved expense; it disappears from the list
**Plans**: TBD
**UI hint**: yes

### Phase 3: Offline Tolerance
**Goal**: Expenses logged without connectivity are never lost; the queue self-heals after crashes and syncs automatically when connectivity returns
**Depends on**: Phase 2
**Requirements**: INPUT-08, INPUT-09, INPUT-10, INPUT-11
**Success Criteria** (what must be TRUE):
  1. Expense logged while offline appears in the list immediately and syncs to Supabase when connectivity returns
  2. Retrying a queued expense never creates a duplicate in Supabase (server-side idempotency enforced)
  3. An entry stuck in "syncing" for more than 5 minutes is automatically reset to "queued" on next app open
**Plans**: TBD

### Phase 4: PWA + Realtime
**Goal**: App is fully installable to iOS and Android home screens with offline shell loading; both household members see each other's expenses appear in real time
**Depends on**: Phase 3
**Requirements**: PWA-01, PWA-03, PWA-04, SYNC-01, SYNC-02
**Success Criteria** (what must be TRUE):
  1. App is installable to iOS Home Screen via Safari "Add to Home Screen" and opens as a standalone app (no browser chrome)
  2. App shell loads when the device is offline (after at least one prior visit)
  3. When one household member saves an expense, it appears on the other member's expense list without a manual refresh
  4. The current user's own new expense does not cause a redundant re-render via the Realtime channel
**Plans**: TBD
**UI hint**: yes

### Phase 5: Reports
**Goal**: Users can set their payday day and view a donut chart of spending by category for the current cycle, with correct WIB-aware cycle boundaries
**Depends on**: Phase 4
**Requirements**: REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, REPORT-06
**Success Criteria** (what must be TRUE):
  1. User can set a payday day (1–28) for the household; the current cycle updates immediately
  2. Report header shows the correct cycle date range (e.g. "25 Mar – 24 Apr") computed in WIB (Asia/Jakarta)
  3. Donut chart shows spending by category with total in the center label for the current cycle
  4. Months shorter than the configured payday day (e.g. day 30 in February) clamp to the last day of that month without error
  5. An empty state is shown when no expenses exist for the current cycle
**Plans**: TBD
**UI hint**: yes

### Phase 6: Secondary Input
**Goal**: Users can capture a receipt photo to pre-fill the Quick Add numpad, and can save named expense templates for one-tap re-add of recurring expenses
**Depends on**: Phase 5
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, TMPL-01, TMPL-02, TMPL-03
**Success Criteria** (what must be TRUE):
  1. User can photograph a receipt; if confidence ≥ 0.7 the amount and category pre-fill the numpad for confirmation
  2. If receipt confidence < 0.7, numpad opens blank with a "Couldn't read clearly — enter manually" banner; the user can still save manually
  3. Receipt scan never auto-saves; a category tap is always required to confirm
  4. User can save a named template (amount + category + optional note) and tap it to pre-fill the numpad
  5. User can delete a saved template
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 7/7 | Complete | 2026-04-25 |
| 2. Quick Add | 0/TBD | Not started | - |
| 3. Offline Tolerance | 0/TBD | Not started | - |
| 4. PWA + Realtime | 0/TBD | Not started | - |
| 5. Reports | 0/TBD | Not started | - |
| 6. Secondary Input | 0/TBD | Not started | - |
