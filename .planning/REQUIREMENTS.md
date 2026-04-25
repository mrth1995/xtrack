# xtrack v1.0 — Requirements

**Milestone:** v1.0 MVP Launch
**Status:** Active
**Last updated:** 2026-04-25

---

## v1.0 Requirements

### Foundation — Auth

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can log out
- [ ] **AUTH-04**: Auth session persists to IndexedDB so installing the PWA to Home Screen does not log the user out (silent token refresh on standalone first-open)

### Foundation — Household

- [ ] **HOUSE-01**: User can create a new household
- [ ] **HOUSE-02**: User can invite a partner via a single-use short code (24h TTL)
- [ ] **HOUSE-03**: Invited user can join household by entering the invite code
- [ ] **HOUSE-04**: Both household members see the same expense stream

### Foundation — Infrastructure

- [ ] **INFRA-01**: A keep-alive cron (GitHub Actions) pings Supabase every 5 days to prevent free-tier project pausing

### PWA

- [ ] **PWA-01**: App is installable to iOS Home Screen ("Add to Home Screen" via Safari)
- [ ] **PWA-02**: First Safari visit shows install guidance banner ("Tap Share → Add to Home Screen")
- [ ] **PWA-03**: App shell is cached via service worker; app loads offline
- [ ] **PWA-04**: Web app manifest defines name, icons, theme color, and `display: standalone`

### Core Input — Quick Add

- [ ] **INPUT-01**: Quick Add numpad is the default home screen (no dashboard first)
- [ ] **INPUT-02**: Numpad shows digits 0–9, "000" key, and backspace; no decimal key
- [ ] **INPUT-03**: Amounts display with IDR dot-separator formatting in real time (e.g. 54.000)
- [ ] **INPUT-04**: Category tile row is shown below the numpad (7 presets: Food, Transport, Entertainment, Utilities, Shopping, Health, Others)
- [ ] **INPUT-05**: Tapping a category tile saves the expense and returns to fresh numpad (category tap = save)
- [ ] **INPUT-06**: Save action is debounced (500ms) to prevent duplicate expenses from double-tap
- [ ] **INPUT-07**: Each expense entry is assigned a UUID (`client_id`) at numpad-open time

### Core Input — Offline

- [ ] **INPUT-08**: Expense logged without connectivity is queued in IndexedDB with `sync_status: "queued"`
- [ ] **INPUT-09**: Queue flushes to Supabase on foreground resume (`visibilitychange`) and on `online` event
- [ ] **INPUT-10**: `IN_FLIGHT` recovery: any queued entry stuck in `"syncing"` for >5 min is reset to `"queued"` on app open
- [ ] **INPUT-11**: Server insert uses `ON CONFLICT (client_id) DO NOTHING` for idempotent retry safety

### Core Input — Edit & Delete

- [ ] **INPUT-12**: User can edit the amount, category, note, and date of a logged expense
- [ ] **INPUT-13**: User can delete a logged expense (soft delete — `is_deleted: true`)

### Core Input — Note

- [ ] **INPUT-14**: User can add an optional free-text note to an expense (revealed post-save, not required in the quick-add flow)

### Sync

- [ ] **SYNC-01**: Both household members see new expenses appear in real time via Supabase Realtime (scoped to `household_id`)
- [ ] **SYNC-02**: Own inserts do not trigger a redundant re-render (skip via `client_id` match)

### Reports

- [ ] **REPORT-01**: User can set a payday day (1–28) for the household
- [ ] **REPORT-02**: "Current cycle" runs from the most recent payday date to the day before the next; computed in WIB (`Asia/Jakarta`)
- [ ] **REPORT-03**: Cycle boundary handles months shorter than the payday day by clamping to the last day of that month
- [ ] **REPORT-04**: Category breakdown report shows a donut chart for the current cycle, with total in the center label
- [ ] **REPORT-05**: Report header shows the cycle date range (e.g. "25 Mar – 24 Apr")
- [ ] **REPORT-06**: Empty state shown when no expenses exist for the current cycle

### Receipt Scan

- [ ] **SCAN-01**: User can capture a receipt photo using the device camera (`<input capture="environment">`)
- [ ] **SCAN-02**: Receipt image is processed via a Supabase Edge Function that calls Gemini Flash and returns `{ amount, category, note, confidence }`
- [ ] **SCAN-03**: If confidence ≥ 0.7, amount and category pre-fill the Quick Add numpad for user confirmation
- [ ] **SCAN-04**: If confidence < 0.7, numpad opens blank with a "Couldn't read clearly — enter manually" banner
- [ ] **SCAN-05**: Receipt scan never auto-saves; user must confirm via category tap

### Templates

- [ ] **TMPL-01**: User can save a named expense template (amount + category + optional note)
- [ ] **TMPL-02**: User can tap a template to pre-fill the Quick Add numpad (not auto-save)
- [ ] **TMPL-03**: User can delete a saved template

---

## Future Requirements

<!-- Deferred table stakes — reconsider in v1.1+ -->

- User can reset forgotten password via email link
- Household member can leave a household
- Per-expense attribution (which member logged it)
- Multiple payday cycles per household (for dual-earner households with different paydays)
- Trend comparison across cycles
- Per-person spending breakdown in reports

---

## Out of Scope

<!-- Explicit exclusions with reasoning -->

| Excluded | Reason |
|----------|--------|
| Android app shortcuts (long-press menu) | iOS-first; manifest `shortcuts` API not supported on iOS Safari |
| OAuth / magic link login | Redirect-based auth opens Safari, not the installed PWA |
| Voice input | Socially awkward in public; Indonesian ASR quality inconsistent |
| Decimal key on numpad | IDR has no sub-rupiah amounts in daily use |
| Auto-saving receipt scan results | Hallucinated amounts must always go through user confirmation |
| Budgets, goals, spending alerts | v1 is track-only; budgeting is a future milestone |
| Auto-firing recurring expenses | Requires a background worker story; saved templates are close enough |
| Trend comparison, timeline views | Single cycle view keeps v1 report surface small |
| Multi-currency | IDR-only; FX adds data model complexity with no current user need |
| CSV / JSON export | Defer until user base grows beyond the household |
| Custom categories | "Others" is the pressure valve; presets validate before customization |
| iOS native app wrapper | PWA covers the iOS case; native wrapper is future consideration |
| Per-user cost breakdown in reports | Single household view for v1 |

---

## Traceability

<!-- Filled by roadmapper — maps REQ-IDs to phases -->

| Requirement | Phase |
|-------------|-------|
| AUTH-01–04 | — |
| HOUSE-01–04 | — |
| INFRA-01 | — |
| PWA-01–04 | — |
| INPUT-01–14 | — |
| SYNC-01–02 | — |
| REPORT-01–06 | — |
| SCAN-01–05 | — |
| TMPL-01–03 | — |
