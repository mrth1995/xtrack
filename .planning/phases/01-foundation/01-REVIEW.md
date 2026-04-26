---
phase: 01-foundation
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/lib/auth/indexeddb-storage.ts
  - src/routes/(app)/+layout.svelte
  - src/lib/supabase/client.ts
  - src/lib/supabase/env.ts
  - src/routes/(app)/+page.server.ts
  - src/routes/(app)/household/+page.server.ts
  - src/routes/(app)/household/+page.svelte
  - tests/auth/auth-session.test.ts
  - tests/supabase/env.test.ts
  - tests/households/shared-shell.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 01: Code Review Report (Plan 08 Gap Closure)

**Reviewed:** 2026-04-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This review covers the Plan 08 gap-closure additions to Phase 01: IndexedDB-backed session storage (`src/lib/auth/indexeddb-storage.ts` + `src/lib/supabase/client.ts`), the standalone boot gate in `src/routes/(app)/+layout.svelte`, hardened env validation in `src/lib/supabase/env.ts`, 503 error surfacing in both page server loaders, and logout form placement on all signed-in surfaces.

The overall implementation is sound and well-structured. The auth gate discriminated-union return type from `getSessionGate` is correctly applied. The 503 error throw pattern is consistent across both loaders. The env validator correctly rejects placeholder values, known short keys, and non-URL inputs before any network call can fire. Logout forms appear correctly in both `+page.svelte` files and the `POST /logout` handler exists.

Three warnings are raised:

1. The IDB storage adapter's `localStorage` fallback will throw a `ReferenceError` in any environment where `indexedDB` is also undefined (SSR/Node), because `localStorage` is equally absent there.
2. Each IDB storage operation opens a fresh `IDBDatabase` connection that is never explicitly closed, accumulating open handles over repeated auth storage calls.
3. The env mock key `'test-anon-key'` in `auth-session.test.ts` is 13 characters and would fail the new `< 20` length validator if the `$lib/supabase/client` mock were ever removed or bypassed.

Three informational items are also noted.

---

## Warnings

### WR-01: IDB storage `localStorage` fallback crashes in SSR/Node where `localStorage` is also undefined

**File:** `src/lib/auth/indexeddb-storage.ts:104-135`

**Issue:** `isIdbAvailable()` returns `false` when `typeof indexedDB === 'undefined'`, which is true in Node.js and test environments without an IDB polyfill. All three storage methods then fall back unconditionally to `localStorage.getItem / setItem / removeItem`. `localStorage` is equally undefined in those same contexts, so the fallback throws a `ReferenceError` instead of degrading gracefully.

The module comment states "Falls back to localStorage when IndexedDB is unavailable (non-browser environments such as SSR or test environments that lack IDB support) so the module does not crash in those contexts" — but that invariant is not upheld.

In production this is currently unreachable because `src/lib/supabase/client.ts` (which imports `indexedDbSessionStorage`) is a browser-only module and is never imported from server-side code. The risk is a future accidental server-side import, or a test that imports the adapter directly without a `localStorage` stub.

**Fix:** Guard the fallback branch with a `typeof localStorage !== 'undefined'` check:

```typescript
function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

// In getItem:
async getItem(key: string): Promise<string | null> {
  if (!isIdbAvailable()) {
    return isLocalStorageAvailable() ? localStorage.getItem(key) : null;
  }
  try {
    return await idbGet(key);
  } catch {
    return isLocalStorageAvailable() ? localStorage.getItem(key) : null;
  }
},

// In setItem: no-op when localStorage unavailable (silent, not a throw)
// In removeItem: no-op when localStorage unavailable
```

---

### WR-02: Each IDB operation opens a new `IDBDatabase` connection that is never closed

**File:** `src/lib/auth/indexeddb-storage.ts:27-46`

**Issue:** `openDb()` is called on every `getItem`, `setItem`, and `removeItem` invocation. Each call resolves a fresh `IDBDatabase` instance that is never passed to `db.close()`. Browsers impose per-origin limits on open IndexedDB connections and fire `versionchange` events against leaked handles during schema upgrades. For an auth storage adapter invoked on every session access, this handle accumulation grows with use.

**Fix:** Cache the database connection as a module-level singleton promise so `openDb()` only opens the database once:

```typescript
let _dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!_dbPromise) {
    _dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) =>
        resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event) => {
        _dbPromise = null; // allow retry on next call
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }
  return _dbPromise;
}
```

Reset `_dbPromise = null` in the `onerror` handler so a transient open failure allows a retry on the next call.

---

### WR-03: Test mock anon key `'test-anon-key'` (13 chars) would fail the new length validator if client mock is removed

**File:** `tests/auth/auth-session.test.ts:51`

**Issue:** The `$env/static/public` mock at line 49-52 sets `PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'`. This value is 13 characters and would be rejected by `validateSupabasePublicEnv` ("too short to be a Supabase anon key") if `src/lib/supabase/client.ts` were ever imported directly instead of via the `vi.mock('$lib/supabase/client', ...)` factory.

Currently the full module mock prevents `client.ts` from initialising, so no failure occurs. However, the env mock and the client mock are now implicitly coupled: removing or adjusting the client mock without updating the env mock would cause all tests in this file to fail with an env-validation error rather than a meaningful test assertion failure.

**Fix:** Update the env mock to use a value that satisfies the `>= 20` character guard:

```typescript
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-for-unit-tests-only' // 33 chars
}));
```

---

## Info

### IN-01: Tautological test — banner copy asserts a local string literal equals itself

**File:** `tests/households/shared-shell.test.ts:329-334`

**Issue:** The test "install guidance copy is exactly 'Tap Share, then Add to Home Screen'" creates a local string variable and then asserts it equals itself. No source file is read; no production code is exercised. This test always passes regardless of what `InstallGuidanceBanner.svelte` actually renders and provides zero protection for the acceptance criterion it claims to lock.

```typescript
// Current: always green, tests nothing
const bannerCopy = 'Tap Share, then Add to Home Screen';
expect(bannerCopy).toBe('Tap Share, then Add to Home Screen');
```

**Fix:** Read the component source and assert the literal is present there:

```typescript
it('install guidance copy is exactly "Tap Share, then Add to Home Screen"', () => {
  const source = readFileSync(
    resolve('src/lib/components/InstallGuidanceBanner.svelte'),
    'utf8'
  );
  expect(source).toContain('Tap Share, then Add to Home Screen');
});
```

---

### IN-02: `household` typed as nullable in page server returns but the null path is structurally unreachable

**File:** `src/routes/(app)/+page.server.ts:70-78`, `src/routes/(app)/household/+page.server.ts:56-64`

**Issue:** Both loaders declare `household` as `HouseholdSummary | null` (or `HouseholdDetail | null`) and return it. The Svelte templates use `household?.name ?? 'Your household'` — a null guard on the name only. In practice `household` is never null when execution reaches the return statement: `locals.householdId` is validated before the query runs, and `.single()` maps a missing row to a PGRST116 error which is caught by the preceding `if (householdError)` guard. The nullable type is a type-system artefact of the `as unknown as T | null` cast pattern, not a runtime reality.

This is not a bug, but the nullable return type causes the template to carry defensive `?.` chains that obscure the actual invariant, and it means the templates render a degraded-but-wrong state (`'Your household'` heading with a real member list) if the invariant were ever violated.

**Fix:** Narrow the type to non-nullable after the error guard, or add an explicit null throw:

```typescript
if (!householdRaw) {
  throw error(503, 'Household not found.');
}
const household: HouseholdSummary = householdRaw as unknown as HouseholdSummary;
```

This simplifies template code and makes the invariant explicit.

---

### IN-03: Duplicated `as unknown as T` cast-and-map pattern across two page servers

**File:** `src/routes/(app)/+page.server.ts:70-78, 115-124`, `src/routes/(app)/household/+page.server.ts:56-64, 88-97`

**Issue:** Both page server files repeat an identical three-step pattern: cast to `unknown`, cast to the target type, then map to a plain object. The household row mapping and the member array mapping each appear twice across two files with only the interface name differing. The inline comment "cast via unknown to avoid Supabase generic narrowing to never" is correct, but maintaining the cast boundary in four separate places increases the risk of a silent divergence if the query columns change.

This is a code quality note — not a bug. No immediate action is required.

**Fix:** Extract the cast-and-map logic into shared helpers (e.g., `src/lib/supabase/mappers.ts`) once a third page server needs the same data shape. Premature extraction is not recommended at the current scale.

---

_Reviewed: 2026-04-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
