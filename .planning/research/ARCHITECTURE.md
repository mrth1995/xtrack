# Architecture: xtrack v1.0

**Domain:** iOS-first PWA expense tracker with shared household model and offline sync
**Researched:** 2026-04-25
**Overall confidence:** HIGH (stack choices verified; data flow patterns verified against official docs)

---

## Component Overview

xtrack has four layers. Each layer has a clear boundary; no layer reaches across two layers.

```
┌──────────────────────────────────────────────────────┐
│  PWA Client (Next.js 15, App Router)                 │
│  - Quick Add UI (numpad + category tiles)            │
│  - Reports UI (payday cycle + pie/donut chart)       │
│  - Receipt Scan UI (camera capture + review form)    │
│  - Household settings, templates, auth               │
│  - Dexie.js (IndexedDB) — local cache + write queue  │
│  - Service Worker (Serwist) — app shell + sync API   │
└─────────────────────┬────────────────────────────────┘
                      │ HTTPS / Supabase JS client
┌─────────────────────▼────────────────────────────────┐
│  Supabase (BaaS)                                     │
│  - Auth (email+password, magic link)                 │
│  - Postgres DB + RLS policies                        │
│  - Realtime (Postgres Changes subscription)          │
│  - Storage bucket (receipt images)                   │
│  - Edge Function: scan-receipt                       │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP (server-to-server, no key in client)
┌─────────────────────▼────────────────────────────────┐
│  Google Gemini API (Flash, free tier)                │
│  - Multimodal image input + structured JSON output   │
│  - Called only from Edge Function, key never exposed │
└──────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| Next.js App Router pages | Route structure, server components for initial HTML | New |
| Quick Add screen (`/`) | Default screen; numpad + category → optimistic write | New |
| Expense list + Edit/Delete | Timeline for current cycle; inline edit/delete | New |
| Reports screen | Cycle picker, aggregate query, donut chart | New |
| Templates screen | List saved templates; tap-to-add flow | New |
| Household settings | Create household, generate invite code, join via code | New |
| Auth screens | Sign-up, sign-in, session persistence | New |
| `lib/db.ts` (Dexie) | Schema definition + typed CRUD helpers | New |
| `lib/sync.ts` | Write queue flush logic; online/offline events | New |
| `lib/supabase.ts` | Typed Supabase client (browser + server) | New |
| Service Worker (Serwist) | App-shell precache; routes network calls | New |
| `scan-receipt` Edge Function | Receives image URL, calls Gemini, returns JSON | New |
| Postgres schema | Tables + RLS + indexes | New |
| Supabase Realtime channel | Household-scoped subscription on `expenses` table | New |

---

## Data Model

### Key Entities

```sql
-- Households: the shared budget unit
households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  payday_day  smallint NOT NULL CHECK (payday_day BETWEEN 1 AND 28),
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at  timestamptz NOT NULL DEFAULT now()
)

-- Profiles: one per auth.users row, belongs to exactly one household
profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id),
  household_id uuid NOT NULL REFERENCES households(id),
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
)

-- Expenses: the core fact table
expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  created_by   uuid NOT NULL REFERENCES profiles(id),
  amount       integer NOT NULL,           -- IDR in full rupiah, never float
  category     text NOT NULL,              -- enum enforced in app layer
  note         text,
  receipt_url  text,                       -- Supabase Storage path, nullable
  spent_at     timestamptz NOT NULL,       -- user-local timestamp from device
  created_at   timestamptz NOT NULL DEFAULT now(),
  client_id    uuid NOT NULL,              -- client-generated idempotency key
  is_deleted   boolean NOT NULL DEFAULT false  -- soft delete
)

-- Templates: saved recurring expense patterns
templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  label        text NOT NULL,             -- e.g. "Netflix 54k"
  amount       integer NOT NULL,
  category     text NOT NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
)
```

### Relationships

```
auth.users (1) ──── (1) profiles (N) ──── (1) households
households  (1) ──── (N) expenses
households  (1) ──── (N) templates
```

### Amount Encoding

Store IDR as integer rupiah (e.g. 54000 not 54.0). Avoids floating-point rounding. Format to "54k / 1.5jt" purely in the display layer.

### Payday Cycle Arithmetic

The "current cycle" is computed entirely in the client; no dedicated cycle table is needed.

```typescript
// Returns {start, end} as Date objects for the cycle containing `now`
function getCurrentCycle(paydayDay: number, now: Date = new Date()) {
  const d = now.getDate();
  const m = now.getMonth();
  const y = now.getFullYear();

  if (d >= paydayDay) {
    // We are in the cycle that started this month
    const start = new Date(y, m, paydayDay);
    const end   = new Date(y, m + 1, paydayDay - 1, 23, 59, 59, 999);
    return { start, end };
  } else {
    // We are in the cycle that started last month
    const start = new Date(y, m - 1, paydayDay);
    const end   = new Date(y, m, paydayDay - 1, 23, 59, 59, 999);
    return { start, end };
  }
}
```

Edge case: payday_day capped at 28 in the DB constraint to avoid months with < 31 days producing invalid dates (Feb 30, etc.). Users who are paid on the 29th/30th/31st configure 28 as the closest safe day. This is an intentional v1 simplification.

### RLS Policies

Household isolation is enforced at the database layer. All tables use a profile lookup join; no custom JWT claims are needed.

```sql
-- expenses: read own household
CREATE POLICY "household members can read expenses"
  ON expenses FOR SELECT
  USING (
    household_id = (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
  );

-- expenses: insert only into own household
CREATE POLICY "household members can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    household_id = (
      SELECT household_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- expenses: update/delete only own rows
CREATE POLICY "owner can modify own expenses"
  ON expenses FOR UPDATE
  USING (created_by = auth.uid());

-- Same pattern applies to templates
```

Add a partial index on `profiles(household_id)` and `expenses(household_id, spent_at)` to make RLS subqueries and cycle-range queries fast at scale.

---

## Key Data Flows

### 1. Quick Add Expense (Online Path)

```
User taps Save
    │
    ▼
Generate client_id (UUIDv4 in browser)
    │
    ▼
Write to Dexie expenses table (status: "synced-pending")
    │
    ├──► Update React state → expense appears instantly in list
    │
    ▼
POST to Supabase via supabase-js insert()
    │
    ├── Success ──► Update Dexie row status to "synced"
    │
    └── Failure ──► Update Dexie row status to "queued"
                    (sync retried on next online event)
```

### 2. Quick Add Expense (Offline Path)

```
User taps Save (no connection)
    │
    ▼
Generate client_id (UUIDv4 in browser)
    │
    ▼
Write to Dexie with status: "queued"
    │
    ▼
UI shows expense immediately (optimistic)
    │
  [... device regains connection ...]
    │
    ▼
navigator.onLine → "online" event fires
    │
    ▼
lib/sync.ts reads all Dexie rows with status: "queued"
    │
    ▼
Insert each row to Supabase using client_id as idempotency guard
(ON CONFLICT (client_id) DO NOTHING)
    │
    ▼
Update Dexie row status to "synced"
```

The `client_id` column has a UNIQUE constraint, so re-sending a queued item after a network blip does not create duplicates. This is the primary conflict prevention strategy — last-write-wins on idempotent inserts, not CRDTs. This is appropriate for append-mostly expense data.

### 3. Realtime Sync (Two Users Simultaneously)

```
User A inserts expense (online)
    │
    ▼
Supabase Postgres writes row
    │
    ▼
Postgres logical replication slot fires Realtime event
    │
    ├──► User A's client: already has row in Dexie, skips duplicate
    │    (match on client_id)
    │
    └──► User B's client: receives INSERT event via Realtime subscription
              │
              ▼
         Write new row to Dexie (status: "synced")
              │
              ▼
         React state update → expense appears in User B's list
```

Supabase Realtime subscription is scoped to the household:

```typescript
supabase
  .channel(`household:${householdId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'expenses',
    filter: `household_id=eq.${householdId}`,
  }, handleRemoteChange)
  .subscribe();
```

### 4. Receipt Scan Flow

```
User taps "Scan Receipt"
    │
    ▼
<input type="file" accept="image/*" capture="environment">
(triggers iOS Camera app directly)
    │
    ▼
Client uploads image to Supabase Storage bucket "receipts"
(path: receipts/{household_id}/{uuid}.jpg)
    │
    ▼
Client calls Edge Function: POST /functions/v1/scan-receipt
Body: { storage_path: "receipts/{household_id}/{uuid}.jpg" }
    │
    ▼
Edge Function:
  1. Validates caller is authenticated + belongs to household
  2. Generates a signed URL for the image (short TTL: 60s)
  3. Calls Gemini Flash API with:
     - The signed image URL (multimodal input)
     - System prompt requesting JSON: { amount, category, note, confidence }
     - response_mime_type: "application/json"
  4. Parses response; maps category to allowed preset list
  5. Returns { amount, category, note, confidence, raw_text }
    │
    ├── confidence >= 0.7 ──► Pre-fill Quick Add form; user confirms
    │
    └── confidence < 0.7  ──► Show raw_text as hint; user fills manually
    │
    ▼
User confirms or edits pre-filled form → normal Quick Add save flow
```

The receipt image is stored in Supabase Storage regardless of parse outcome so users can review it later. The Gemini API key lives only in the Edge Function environment — never in client code.

The Edge Function is also the right place to enforce free-tier rate limiting: reject if the household has already called scan-receipt more than N times in the current hour (simple counter in a Postgres table or Supabase KV).

---

## Offline Strategy

### Strategy: Optimistic Write + Deferred Queue

This is the correct strategy for an expense tracker. The alternatives (pessimistic, CRDT-based) add complexity with no benefit for this data shape.

| Property | This app | Justification |
|----------|----------|---------------|
| Data shape | Append-mostly (expenses rarely edited) | Simpler conflict model |
| Conflict type | Two users add different expenses | No conflict — independent rows |
| Conflict type | Two users edit same expense | Rare; last-write-wins is acceptable |
| Offline duration | Minutes to hours (walk to a place with wifi) | Queue depth stays small |

### Implementation

- **Dexie.js** wraps IndexedDB. Use `useLiveQuery()` hook for reactive UI.
- Each expense row has a `sync_status` field: `"queued" | "syncing" | "synced" | "error"`.
- A `lib/sync.ts` module exports a `flushQueue()` function. Call it on:
  - `window.addEventListener("online", flushQueue)`
  - App visibility change (`visibilitychange` → `document.visibilityState === "visible"`)
  - After every successful online write (trigger cascade)
- Dexie `client_id` maps to Postgres `client_id` UNIQUE column. This is the idempotency key.
- Exponential backoff with a cap of 30s for retries on error status rows.
- **Do not** use Background Sync API for v1. It has unreliable iOS Safari support and adds service-worker complexity. The `online` event + visibility change covers the household-of-two case adequately.

### App Shell Caching

Use Serwist (successor to next-pwa / workbox) with Next.js 15:
- Precache: app shell HTML, JS bundles, CSS, icons, font subsets
- Runtime cache: Supabase API responses NOT cached (data freshness required)
- Strategy for `/api/*` and Supabase REST calls: **NetworkFirst with 5s timeout**, falling back to a "You're offline" state (not stale data — stale expense totals mislead users)

### iOS Safari Notes

- `beforeinstallprompt` does not fire on iOS Safari. Show a static banner: "Tap Share → Add to Home Screen" on first visit.
- Service workers work on iOS 16.4+ (released March 2023). Target iOS 16.4+.
- Background Sync API is NOT available on iOS Safari as of 2025. Do not depend on it.
- IndexedDB works reliably on iOS Safari 15+.

---

## Build Order Recommendation

Build in dependency order. Each phase produces something usable end-to-end before the next layer is added.

### Phase 1 — Foundation: Auth + Household + Data Model
What: Supabase project setup, Postgres schema, RLS policies, Next.js scaffold, Supabase JS client, auth screens (sign-up, sign-in, magic link).
Why first: Every other feature depends on knowing who the user is and which household they belong to. RLS must be in place before any data writes happen — retrofitting it is a rewrite risk.
Deliverable: Two users can sign up, create a household, and join it via invite code.

### Phase 2 — Core Write Path: Quick Add (Online)
What: Quick Add UI (numpad + category tiles), expenses table writes, expense list display, edit/delete.
Why second: This is the core value proposition. Validate the 2-3 tap flow before adding offline or realtime complexity.
Deliverable: One user can log an expense and see it appear.

### Phase 3 — Offline Tolerance: Dexie + Sync Queue
What: Dexie schema mirroring Postgres expenses, optimistic writes, sync queue, online/offline event handlers, sync_status indicator in UI.
Why third: Offline is a UX concern layered on top of the write path. The Dexie schema must match the Postgres schema, so Postgres must be stable first.
Deliverable: User can log expenses without connectivity; they sync when connection returns.

### Phase 4 — Shared View: Realtime + PWA Install
What: Supabase Realtime subscription, household expense list reflects both users' writes. Service worker (Serwist) setup, web app manifest, iOS install banner.
Why fourth: Realtime requires the write path to be stable. PWA install requires a stable app shell. Both are polish on top of working core functionality.
Deliverable: Both users see each other's expenses live. App is installable on iOS via Safari.

### Phase 5 — Reports: Payday Cycle + Category Chart
What: Payday day setting in household, cycle date logic, aggregate query (sum by category for cycle date range), donut chart (Recharts or Chart.js).
Why fifth: Reports are read-only and depend on having real expense data to display. No new write paths.
Deliverable: Users see current cycle totals broken down by category.

### Phase 6 — Receipt Scan + Templates
What: Supabase Edge Function `scan-receipt`, Gemini Flash integration, camera capture UI, pre-fill form flow. Templates CRUD, tap-to-add flow.
Why sixth: These are secondary input methods. Receipt scan adds external API dependency (Gemini). Templates are purely additive. Both are deferrable without blocking core value.
Deliverable: Users can scan a receipt to pre-fill Quick Add. Saved templates enable one-tap re-add.

---

## Integration Points

| Integration | Direction | Mechanism | Risk |
|-------------|-----------|-----------|------|
| Client ↔ Supabase Auth | Bidirectional | supabase-js `signIn`, `getSession`, cookie-based session | Low |
| Client ↔ Supabase DB | Client → DB (write), DB → Client (realtime) | supabase-js insert/select + Realtime channel | Low |
| Client ↔ Dexie | Local only | Dexie `useLiveQuery()` hook | Low |
| Dexie ↔ Supabase sync | Client-driven | `flushQueue()` on online events | Medium — test idempotency |
| Client → Supabase Storage | Client → Storage | `supabase.storage.from('receipts').upload()` | Low |
| Edge Function → Supabase Storage | Server → Storage | Signed URL generation | Low |
| Edge Function → Gemini API | Server → External | fetch() with GEMINI_API_KEY env var | Medium — free tier rate limits |
| Gemini → Edge Function → Client | Server → Client | JSON response via Edge Function HTTP response | Medium — LLM output parsing |

---

## Open Questions

1. **Supabase free tier pausing.** Free projects pause after 7 days of inactivity. For a daily-use personal app this is unlikely to trigger, but a cron-based keep-alive ping (hitting a lightweight Edge Function via cron-job.org) should be set up from day one. Pro plan ($25/month) eliminates the problem if the app is used by more than 2 people.

2. **Gemini free tier rate limits.** Gemini 2.5 Flash free tier: 15 requests/minute, 1500 requests/day (as of April 2026 — verify against https://ai.google.dev/gemini-api/docs/pricing before implementation). For a household of two, this is ample. If limits are tightened, fall back to `gemini-2.0-flash-lite` which has higher free quotas.

3. **Receipt image storage cost.** Supabase free tier: 1 GB storage. A compressed JPEG receipt is ~200-400 KB. 1 GB gives ~2500-5000 receipts before hitting the limit. Implement client-side canvas resize to 1024px max dimension before upload to keep images under 200 KB each.

4. **Payday day 29/30/31 edge case.** Capped at 28 in v1. Some users are paid on the last day of the month. "28" is the safe proxy. Document this limitation in the household settings UI.

5. **Supabase Realtime and RLS.** When using `postgres_changes` with RLS enabled, Supabase checks each change event against the subscribed user's RLS policy — this means 2 reads per insert for a 2-user household, which is negligible. At scale (100+ users per household) this would be a concern; not relevant for v1.

6. **iOS Safari service worker scope.** Ensure the Next.js app is served from the root path (`/`) so the service worker scope covers all routes. Subdirectory deployments (`/app/`) require explicit scope headers and are a known gotcha.

---

## Sources

- [Offline-first frontend apps in 2025: IndexedDB and SQLite in the browser](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Building an Offline-First PWA Notes App with Next.js, IndexedDB, and Supabase](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [Dexie.js — IndexedDB wrapper](https://github.com/dexie/Dexie.js/)
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage — Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Gemini via Supabase Edge Functions](https://medium.com/@ngommans/google-gemini-via-supabase-edge-functions-e382fb3c65b7)
- [Gemini API Pricing (free tier)](https://ai.google.dev/gemini-api/docs/pricing)
- [Next.js PWA Guide (official)](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist (next-pwa successor)](https://javascript.plainenglish.io/building-a-progressive-web-app-pwa-in-next-js-with-serwist-next-pwa-successor-94e05cb418d7)
- [Offline sync & conflict resolution patterns (April 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-crash-course-practical-guide-apr-8-2026/)
- [Supabase Pricing & Free Tier Limits](https://supabase.com/pricing)
- [Prevent Supabase Free Tier Pausing](https://shadhujan.medium.com/how-to-keep-supabase-free-tier-projects-active-d60fd4a17263)
