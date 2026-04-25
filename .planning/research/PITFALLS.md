# Domain Pitfalls: xtrack v1.0

**Domain:** iOS-first PWA expense tracker — shared household, offline-first, free-tier LLM receipt scanning
**Researched:** 2026-04-25
**Confidence:** HIGH (verified with official WebKit docs, Supabase docs, multiple independent sources)

---

## Quick Reference: Pitfall Table

| Area | Pitfall | Impact | Prevention | When to Address |
|------|---------|--------|------------|-----------------|
| iOS PWA | Storage evicted if app not opened for ~7 days when running in Safari (not home screen) | Silent data loss, user re-authenticates | Force "Add to Home Screen" early; store critical data server-side, not in cache | Phase 1 (install flow) |
| iOS PWA | No automatic install prompt — 4-tap manual flow hides in Share menu | Low install conversion, users don't know how to install | Show inline install instructions with screenshots at first visit in Safari | Phase 1 (install flow) |
| iOS PWA | Session/cookie storage NOT shared between Safari and standalone (home screen) mode | User logged in via Safari has to re-login after installing | Detect `navigator.standalone`, route auth through IndexedDB or server-issued cookie that persists across contexts | Phase 1 (auth) |
| iOS PWA | Background Sync API unsupported on iOS | Sync queue won't drain when app is backgrounded | On-open sync trigger: drain the queue immediately on `visibilitychange` or app focus | Phase 2 (offline) |
| iOS PWA | `navigator.standalone` only set in Safari — Chrome/Firefox iOS users get no install path | Users on non-Safari iOS browsers cannot install the PWA | Detect and show "Please open in Safari to install" message | Phase 1 |
| Offline sync | Duplicate expense entries when retry fires after a network timeout where the server already committed | Two entries for the same spend, user confusion | Assign `client_id` (UUID) at creation; upsert on `client_id` server-side; never re-generate IDs on retry | Phase 2 (offline) |
| Offline sync | Sync queue corrupted or stuck in `IN_FLIGHT` state after app crash mid-upload | Entries never reach server silently | Add `IN_FLIGHT` state + timestamp; recovery job on app open checks entries stuck >5 minutes and requeues | Phase 2 (offline) |
| Offline sync | Two household members both edit the same expense offline (last-write-wins conflict) | Incorrect amount silently overwritten | Store `updated_at` + `device_id`; server rejects stale writes with 409; show conflict UI on client | Phase 2 (offline) |
| Offline sync | Retry storm: exponential retry without jitter hammers Supabase on reconnect | Supabase free tier connection pool exhausted | Exponential backoff with ±30% jitter; max 5 retries before marking as DEAD_LETTER | Phase 2 (offline) |
| Shared household | Race condition: two users accept the same invite code simultaneously | Both users joined but household now has duplicate membership records | DB transaction: check + claim invite atomically using `SELECT ... FOR UPDATE`; single-use token deleted before response | Phase 1 (auth/invite) |
| Shared household | Orphaned household: creator deletes account or leaves without transferring ownership | Partner loses all data access | Require ownership transfer before leave/delete; or auto-promote longest-standing member | Phase 1 (data model) |
| Shared household | Invite code never expires — old link shared publicly or in a group chat | Strangers join the household | Short TTL (24–48 hours); mark as used on first join; show creator when someone accepts | Phase 1 (invite flow) |
| Shared household | User creates second household after losing their invite link | Duplicate households, split data | Enforce one-household-per-user constraint in RLS; redirect to existing household if one exists | Phase 1 (data model) |
| RLS / Security | RLS disabled on a new table during schema migrations | All household expenses visible to any authenticated user | Enable RLS on every table immediately at creation; CI check that fails if RLS is off on any public schema table | Phase 1 (data model) |
| RLS / Security | `service_role` key shipped in frontend bundle or committed to git | Bypasses all RLS — full database exposure | `service_role` never touches the client; keep in server-side functions only; `.env.local` gitignored | Phase 1 |
| RLS / Security | RLS policy on `expenses` table but not on joined `categories` or `templates` tables | Cross-household data leak via join | Write and test RLS policies for EVERY table that is joined in queries, not just the primary table | Phase 1 |
| RLS / Security | RLS policy references `auth.uid()` but household membership check is missing | Any authenticated user can read any household's expenses if they guess a household ID | Policy must be `auth.uid() IN (SELECT user_id FROM household_members WHERE household_id = expenses.household_id)` — never just uid equality on a non-unique column | Phase 1 |
| Receipt scanning | LLM hallucinates an amount that is plausible but wrong (e.g., reads "15.000" as 15000 IDR instead of 15,000,000 IDR) | User logs wrong amount silently | Always pre-fill the numpad with extracted amount; require explicit confirm tap; never auto-save | Phase 3 (receipt) |
| Receipt scanning | Free-tier Gemini rate limit (15 RPM, 1500 RPD for Flash) hit during shared-household burst | 429 errors, broken scan flow for one or both users | Client-side debounce: one pending scan at a time per device; graceful fallback to manual entry on 429 | Phase 3 (receipt) |
| Receipt scanning | Receipt photo uploaded to Supabase Storage before LLM call — storage fills up on free tier (1 GB) | Free-tier storage exceeded, uploads blocked | Pass image as base64 directly to LLM API; do not persist receipt images unless user explicitly saves | Phase 3 (receipt) |
| Receipt scanning | Indonesian receipt layout: total labeled "TOTAL", "JUMLAH", "GRAND TOTAL", "SUBTOTAL" interchangeably | LLM picks subtotal instead of grand total | Prompt must explicitly request the final payable amount; post-process: prefer the largest amount on the last 5 lines of text | Phase 3 (receipt) |
| Receipt scanning | Thermal receipt photos are low-contrast, especially under warm lighting | OCR base layer fails before LLM processes the amount | Use a vision model (Gemini Flash 1.5+) that handles raw images natively, not a text-only LLM pipeline | Phase 3 (receipt) |
| Payday cycle | Payday set to 31st — February and months with 30 days overflow to next month | Cycle boundary query returns wrong date range; expenses fall into wrong cycle | Store payday as integer 1–28 max (warn user if they pick 29–31); clamp to last day of month at query time with `LEAST(payday, days_in_month)` | Phase 2 (cycle logic) |
| Payday cycle | Cycle query uses UTC midnight for boundaries but user is in WIB (UTC+7) | An expense logged at 23:30 WIB on cycle-end day appears in next cycle | Store all timestamps as UTC; compute cycle boundaries in WIB (`Asia/Jakarta`) then convert to UTC for DB queries | Phase 2 (cycle logic) |
| Payday cycle | `new Date()` used for cycle boundary calculation — DST ambiguity in environments that run in a different zone | Works locally, breaks on Vercel/server which runs UTC | Use `Intl` or a timezone-aware library (date-fns-tz) consistently; never use bare `new Date()` for boundary math | Phase 2 (cycle logic) |
| Payday cycle | Cycle query includes `>=` start AND `<=` end but the end is midnight of day D, not end-of-day | Last day of cycle's expenses are excluded | Use `< next_cycle_start` not `<= cycle_end`; avoids off-by-one on boundaries | Phase 2 (cycle logic) |
| IDR numpad UX | User accidentally enters "15000000" (15 juta) when they meant "15000" (15 ribu) — one too many taps | Inflated totals, distorted reports | Show running formatted value (Rp 15.000.000) in real time as they type; no auto-save; large confirm button requires deliberate press | Phase 1 (quick-add) |
| IDR numpad UX | No undo after save — user closes the app before realizing the wrong amount was saved | Stale data in cycle report | Add "Undo last entry" snackbar that is visible for 10 seconds after save; soft-delete + restore within that window | Phase 1 (quick-add) |
| IDR numpad UX | Paste from clipboard inserts a formatted number like "Rp 15.000" — the dot is treated as decimal | Amount parsed as 15.0 instead of 15000 | Strip all non-digit characters on paste before parsing; then reformat | Phase 1 (quick-add) |
| IDR numpad UX | "k" / "jt" shorthand input not handled — user types "15" expecting "15.000" | Confusion when amount shows as 15 IDR | Support suffix multiplier keys (k=×1000, jt=×1000000) on the numpad; display confirmation before committing | Phase 1 (quick-add) |
| Supabase free tier | Project auto-paused after 7 days of inactivity | App returns 503/connection refused to both household members | Add GitHub Actions cron (twice/week) to ping the DB; or set up a lightweight keep-alive via a public Edge Function | Phase 1 (infra) |

---

## iOS-Specific Gotchas

### 1. The Two-Context Storage Problem

Safari and the installed PWA (standalone mode) are two completely isolated storage contexts on iOS. If the user authenticates inside Safari and then taps "Add to Home Screen," they arrive at the installed app in a logged-out state with an empty IndexedDB. The fix is to detect `navigator.standalone === true` on load and show a re-auth prompt, or design the auth flow so the first launch of the standalone app always does a silent token refresh via the server.

Detection: `window.navigator.standalone === true` is the reliable signal in WebKit. Do not rely on `display-mode: standalone` CSS media query for logic-critical paths in early setup.

### 2. The 7-Day Eviction Boundary Is for Safari, Not Home Screen Apps

Apple's 7-day script-writable storage cap applies to origins accessed through Safari, not to installed Home Screen apps. Installed PWAs have their own activity timer. However, if the device is under storage pressure, iOS can still evict IndexedDB data from installed apps. The practical implication: all user data must be cloud-backed (Supabase), and local IndexedDB is a cache only, never the source of truth for expense records.

### 3. Background Sync Does Not Exist on iOS

The Background Sync API (`SyncManager`) is absent in WebKit and listed as "Unlikely soon" by the WebKit team. Any sync queue that relies on `sync` events simply never fires. The correct pattern: trigger sync on `visibilitychange` (document becomes visible), on the `focus` event, and on any user interaction when `navigator.onLine` is true. The sync queue must live in IndexedDB (not sessionStorage) so it survives app kills.

### 4. No Automatic Install Prompt — Ever

iOS will never fire `beforeinstallprompt`. The only install path is Safari → Share Sheet → "Add to Home Screen." This is a 4-step process that most users will not discover without guidance. Show an in-app banner (detect: `!navigator.standalone && /iPhone|iPad/.test(navigator.userAgent)`) with a screenshot of the exact Share button location. Dismiss to localStorage so it doesn't repeat after install.

### 5. Links Opened from the Installed PWA Break Out to Safari

Any `<a target="_blank">` or `window.open()` call inside the standalone PWA opens in Safari, not inside the app. The user loses the app's navigation context. For auth callbacks (magic links, OAuth), this creates a hard problem: the redirect lands in Safari, not the installed app. Use universal links / deep links carefully, or keep auth entirely within the app using popup-free flows (email/password, no OAuth redirects in v1).

### 6. Service Worker Scope Registration Timing

On iOS, service workers occasionally fail to register if the page load is interrupted. Always register the service worker defensively with an `isReady` check and retry logic. The service worker must be registered at the top-level path (`/sw.js` served with `Service-Worker-Allowed: /`) to control the entire app scope.

### 7. Web Push Only Works for Installed PWAs on iOS 16.4+

Push notifications are out of scope for v1, but note for future: push permission can only be requested in a user-gesture handler (button tap), and the app must already be installed. This means the install flow is a prerequisite for any future notification feature — get the install UX right in v1.

---

## Integration Pitfalls

These emerge from the interaction between features, not from any single feature in isolation.

### Offline Queue + Household Sync: The Household-Join-Then-Offline Race

**Scenario:** User A creates a household at 09:00. User B accepts the invite at 09:05 while offline (the invite acceptance was queued). User A logs an expense at 09:10 that is synced. User B comes online at 09:15 and the invite acceptance fires — but the expense sync may complete before the membership is confirmed, and the RLS policy may reject the expense read.

**Prevention:** The offline queue must track a `household_membership_confirmed` flag before allowing expense sync. Do not assume membership state is consistent across offline sessions.

### Offline Queue + Payday Cycle: The Wrong-Cycle Assignment Problem

**Scenario:** User logs an expense at 23:55 WIB on the last day of cycle. The device is offline. The expense is queued with `created_at` = client timestamp. The device comes online at 00:10 WIB (next cycle). The server receives the expense with a timestamp from the previous cycle but processes it in the new cycle's window because server `NOW()` is used as the timestamp.

**Prevention:** Always use `client_created_at` (set at queue time, not sync time) for cycle assignment. The server must accept and trust the client timestamp within a reasonable window (e.g., ±24 hours). Add a server-side cycle assignment function that uses `client_created_at` for this reason.

### Receipt Scanning + Offline Queue: Failed Scan Leaves Orphaned Image

**Scenario:** User scans a receipt while online. Image is uploaded, LLM call times out, user dismisses the error and logs manually. The base64 image or upload reference is never cleaned up.

**Prevention:** Do not persist receipt images to Supabase Storage. Pass the image as base64 inline to the LLM API only. If the call fails, there is nothing to clean up. On 1 GB free-tier storage, a few hundred undeleted receipt photos would exhaust the quota.

### RLS + Offline Sync: RLS Rejects Stale Household Token

**Scenario:** User is removed from a household (or household is deleted) while they are offline with a pending sync queue. When they come back online, the queued `INSERT` on the `expenses` table is rejected by RLS (no matching household_member row). The queue entry loops indefinitely.

**Prevention:** Handle RLS 403/401 errors from the sync queue as DEAD_LETTER (do not retry). Surface a "Some expenses could not be saved — you may no longer be a member of this household" error to the user instead of silently retrying.

### IDR Numpad + Offline Queue: Double-Tap Save Creates Two Queue Entries

**Scenario:** User taps the save button twice quickly. The UI has no debounce. Two queue entries are created with different `client_id` values (if ID is generated on button press). Both sync to the server as separate legitimate inserts.

**Prevention:** Generate `client_id` (UUID v4) at numpad-open time, not at save time. Debounce the save button with 500ms lockout. The `client_id` uniqueness constraint on the server provides a final backstop.

### Shared Household + Payday Cycle: Per-User vs Per-Household Cycle

**Scenario:** Partner A has payday on the 25th. Partner B has payday on the 1st. The household has one shared cycle configuration. Partner B's salary gets counted in the "wrong" cycle in the reports.

**Prevention (current scope):** One cycle per household, set by the creator. Document this limitation explicitly in onboarding: "Cycle date applies to the entire household." Defer dual-cycle support to a future milestone. The data model must store `payday_day` on the `households` table, not on users, to make this constraint explicit.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| PWA install + auth (Phase 1) | Users authenticate in Safari, then install and are logged out in standalone | Design re-auth as a first-open flow; persist tokens in IndexedDB, not sessionStorage |
| Data model + RLS (Phase 1) | Shipping without RLS enabled, planning to "add it later" | Enable RLS on all tables before any data is written, day one |
| Invite system (Phase 1) | Invite code reuse race condition | Use DB transaction with `FOR UPDATE` lock on invite row |
| Quick-add numpad (Phase 1) | Double-tap duplicate entries | Generate expense UUID at screen-open time; save button debounce |
| Offline queue (Phase 2) | Entries stuck in IN_FLIGHT after crash | Recovery sweep on app open for items stuck >5 min |
| Payday cycle math (Phase 2) | Cycle boundary uses server `NOW()` for offline-queued expenses | Always write `client_created_at` to queue entry; server uses that for cycle assignment |
| Receipt scan (Phase 3) | Auto-saving hallucinated amount | Extracted amount always goes into editable numpad, never auto-commits |
| Receipt scan (Phase 3) | Gemini free-tier 1500 RPD exhausted by two users | Client-side scan throttle; queue subsequent scans; fail open to manual entry |
| Supabase free tier (all phases) | Project paused after 7 days of no use | GitHub Actions keep-alive cron from day 1 of deployment |

---

## Sources

- [WebKit: Updates to Storage Policy (iOS 17)](https://webkit.org/blog/14403/updates-to-storage-policy/) — HIGH confidence, official
- [MagicBell: PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — HIGH confidence, verified against WebKit docs
- [Vinova: Navigating Safari/iOS PWA Limitations](https://vinova.sg/navigating-safari-ios-pwa-limitations/) — MEDIUM confidence
- [DEV Community: Hidden Problems of Offline-First Sync](https://dev.to/salazarismo/the-hidden-problems-of-offline-first-sync-idempotency-retry-storms-and-dead-letters-1no8) — HIGH confidence, matches known patterns
- [Supabase Docs: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence, official
- [ProsperaSoft: Fixing RLS Misconfigurations in Supabase](https://prosperasoft.com/blog/database/supabase/supabase-rls-issues/) — MEDIUM confidence
- [Precursor Security: Row-Level Recklessness](https://www.precursorsecurity.com/blog/row-level-recklessness-testing-supabase-security) — MEDIUM confidence
- [Stingrai: Supabase Security — Exposed Anon Keys](https://www.stingrai.io/blog/supabase-powerful-but-one-misconfiguration-away-from-disaster) — MEDIUM confidence
- [HackerOne: Race Condition on Invite Token](https://hackerone.com/reports/1285538) — HIGH confidence, real exploit report
- [Google AI: Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) — HIGH confidence, official
- [AI Free API: Google Gemini API Free Tier March 2026](https://www.aifreeapi.com/en/posts/google-gemini-api-free-tier) — MEDIUM confidence
- [DEV Community: We had a date bug that happened twice a year](https://dev.to/novu/we-had-a-date-bug-that-happened-two-times-a-year-and-we-didnt-know-you-might-have-it-too-56o6) — MEDIUM confidence, real production case study
- [Supabase: Free Plan Inactivity Pause](https://github.com/orgs/supabase/discussions/38200) — HIGH confidence, official community
- [GitHub: supabase-pause-prevention](https://github.com/travisvn/supabase-pause-prevention) — MEDIUM confidence, community pattern
- [CORD Dataset: Indonesian Receipt OCR](https://github.com/clovaai/cord) — MEDIUM confidence, research dataset
- [MDN: Storage Quotas and Eviction Criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — HIGH confidence, official
