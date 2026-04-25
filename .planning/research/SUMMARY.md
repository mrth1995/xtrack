# xtrack v1.0 — Research Summary

## Executive Summary

xtrack is an append-mostly, mobile-first expense tracker where the primary design constraint is logging speed — from "I just spent money" to saved must be 2-3 taps. The research confirms this class of app is best built with a lightweight PWA stack (SvelteKit + Supabase) rather than heavier frameworks, because bundle size directly impacts perceived responsiveness on mobile Safari. The free-tier cost constraint is achievable: Supabase (free hosted Postgres + Auth + Realtime + Storage), Cloudflare Pages (free hosting), and Gemini 1.5 Flash (1,500 free OCR requests/day) together produce a zero-running-cost stack capable of serving a household of two indefinitely.

The most important architectural insight is that Row-Level Security must be the first thing built, not retrofitted. Auth + household data model + RLS goes in Phase 1. Quick Add is the emotional core of the product but is correctly built in Phase 2, on top of an already-secure data layer.

The top risk category is iOS-specific PWA behavior: the Safari-to-standalone storage isolation problem, 7-day cache eviction, and the complete absence of Background Sync. These will affect every new user and must be designed in from Phase 1.

---

## Recommended Stack

| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Framework | SvelteKit | 2.58.x | ~85 KB bundle vs Next.js ~240 KB; Svelte 5 runes stable and ergonomic for solo dev |
| UI language | Svelte 5 | 5.55.x | `$state`/`$derived`/`$effect` runes from day one |
| Styling | Tailwind CSS | 4.x | Vite-native in v4; no PostCSS config; 100x faster incremental builds |
| PWA | vite-plugin-pwa | 1.2.x | Zero-config Workbox integration for SvelteKit |
| Backend / DB | Supabase | free tier | Postgres + RLS + Realtime + Auth + Storage; 500 MB DB, 1 GB storage, 50K MAU |
| Supabase client | @supabase/supabase-js | 2.103.x | Isomorphic; works in browser and SvelteKit server hooks |
| Server state | @tanstack/svelte-query | 5.x | Optimistic mutations, `networkMode: 'offlineFirst'`, IndexedDB persister |
| Offline persistence | idb-keyval | latest | Backs TanStack Query cache across sessions |
| OCR / AI | Gemini 1.5 Flash | free tier | 1,500 req/day free; multimodal; structured JSON output |
| Validation | zod | 3.x | Validate Gemini output + form inputs |
| Date arithmetic | date-fns | 3.x | Payday cycle math; tree-shakeable |
| Hosting | Cloudflare Pages | free tier | Unlimited bandwidth; no commercial-use ban; first-class SvelteKit adapter |

**Hard rejections:**
- Firebase: Cloud Storage removed from free Spark plan (February 2026)
- Vercel Hobby: commercial-use prohibition
- Next.js / React: 3x heavier bundle; no advantage here
- Background Sync API: not available on iOS Safari
- Web Share Target API: not available on iOS Safari

---

## Key Feature Decisions

**Table stakes — must ship in v1:**
- Manual quick-add: numpad is the default home screen; category tap = save; 2-3 taps total
- IDR numpad: full-screen custom keypad, **"000" key** (mandatory), real-time dot-separator formatting, no decimal key
- Fixed 7 preset categories: Food, Transport, Entertainment, Utilities, Shopping, Health, Others
- Edit and delete expenses (swipe-left to delete, tap to edit)
- Optional note per expense (revealed post-save, not a required form field)
- Category breakdown report: donut for current payday cycle; center-label shows total
- Cloud auth + shared household via invite code
- Payday cycle config: fixed day-of-month (1–28 in v1)
- PWA manifest + offline-tolerant input

**Differentiators — ship in v1:**
- Payday cycle (not calendar month)
- Shared household with separate identities per person
- Receipt scan (secondary input path, always requires user confirmation tap)
- Saved expense templates (one-tap re-add, no auto-firing)

**Anti-features — explicitly avoid:**
- Decimal key on numpad (IDR has no sub-rupiah amounts)
- Auto-saving receipt scan results (hallucinated amounts must always go through confirmation)
- Voice input (socially awkward in public; Indonesian ASR quality inconsistent)
- Budgets/alerts (v1 is track-only)
- Custom categories, trend comparisons, CSV/JSON export, multi-currency

---

## Architecture Highlights

**Build order (conflict resolved):** Auth + RLS first (Phase 1), Quick Add second (Phase 2). RLS is a hard dependency for every data write; it cannot be safely retrofitted.

**Offline strategy — optimistic write + deferred queue:**
1. Generate `client_id` (UUID v4) at numpad-open time (not at save time)
2. Write to IndexedDB immediately with `sync_status: "queued"`; UI renders optimistically
3. POST to Supabase; on success → `"synced"`; on failure → stays `"queued"`
4. Flush queue on: `window.online` event, `visibilitychange` to visible, any successful online write
5. Server uses `ON CONFLICT (client_id) DO NOTHING` — idempotent inserts prevent duplicates on retry
6. Exponential backoff with ±30% jitter; max 5 retries; then `DEAD_LETTER` surfaced to user
7. Do NOT use Background Sync API (unsupported on iOS Safari)

**Data model key points:**
- `amount` stored as integer rupiah (e.g. `54000`), never float
- `payday_day` on `households` table, capped at 28 (DB constraint)
- `client_id` UUID on `expenses` with UNIQUE constraint
- `is_deleted` boolean (soft delete — hard deletes break sync idempotency)
- `spent_at` is client-local timestamp; cycle math uses `spent_at`, never server `NOW()`
- RLS on ALL tables from day one

**Receipt scan flow:**
1. `<input type="file" accept="image/*" capture="environment">` (iOS camera; no Web Share Target)
2. Client uploads to Supabase Storage
3. Edge Function `scan-receipt`: generates signed URL, calls Gemini Flash, returns `{ amount, category, note, confidence }`
4. Confidence ≥ 0.7: pre-fill numpad. Confidence < 0.7: blank numpad + "Couldn't read receipt" banner
5. User confirmation tap = normal Quick Add save flow

---

## Critical Pitfalls to Address Early

1. **RLS not enabled from day one.** Any table without RLS exposes all rows to any authenticated user. Enable at migration time; `service_role` key never in client bundle.

2. **Safari-to-standalone auth context isolation.** User authenticates in Safari, installs PWA, opens from Home Screen — logged out. Fix: persist auth tokens to IndexedDB; on `window.navigator.standalone === true` first-open, perform silent token refresh before rendering.

3. **Offline queue stuck in `IN_FLIGHT` after app crash.** Fix: recovery sweep on app open — any `sync_status: "syncing"` entry older than 5 minutes is reset to `"queued"`.

4. **Wrong-cycle assignment for offline-queued expenses.** Fix: always write `spent_at` (client timestamp, set at queue time); server uses `spent_at` for cycle assignment, never INSERT time.

5. **Duplicate expenses from double-tap save.** Fix: generate `client_id` at numpad-open time; 500ms save debounce; server UNIQUE constraint on `client_id` as final backstop.

---

## Phase Order Recommendation

| Phase | Name | Key work |
|-------|------|----------|
| 1 | Foundation | Auth + household + DB schema + all RLS + iOS install banner + auth token persistence |
| 2 | Core Write Path | Quick Add UI, numpad, category tiles, expense list, edit/delete, IDR formatting |
| 3 | Offline Tolerance | TanStack Query offline persister, sync queue, flush on foreground, IN_FLIGHT recovery |
| 4 | Shared View | Supabase Realtime sync, vite-plugin-pwa Workbox config, PWA manifest |
| 5 | Reports | Payday cycle setting, cycle boundary math (WIB), donut chart, aggregate queries |
| 6 | Secondary Input | Receipt scan Edge Function, Gemini Flash, saved expense templates |

---

## Open Questions

1. **Receipt image: base64 inline vs Storage upload.** Conflict between PITFALLS.md (inline base64 saves storage quota) and ARCHITECTURE.md (Storage + signed URL). Recommended: base64 inline for Gemini; only persist to Storage if user explicitly saves. Decide during Phase 6 planning.

2. **Auth flow in standalone mode.** Magic links and OAuth redirects open in Safari, not the PWA. v1 must use email+password or OTP-in-app only. Confirm during Phase 1.

3. **Payday day 29/30/31.** DB caps at 28. Document in UI: "Day 29–31? Use 28." Validate during Phase 5.

4. **Supabase keep-alive cron.** GitHub Actions cron to prevent free-tier project pausing. Set up in Phase 1.

5. **Gemini model version.** STACK.md says Gemini 1.5 Flash; 2.5 Flash may have higher free quota. Verify at https://ai.google.dev/gemini-api/docs/pricing before Phase 6.

6. **One payday cycle per household.** Onboarding copy must set this expectation explicitly. Lock copy in Phase 1 household creation flow.
