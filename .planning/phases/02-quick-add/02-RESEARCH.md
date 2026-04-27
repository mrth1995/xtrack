# Phase 2: Quick Add - Research

**Researched:** 2026-04-27
**Domain:** SvelteKit 2 / Svelte 5 UI patterns — custom numpad, bottom sheet, expense CRUD, soft delete
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Screen structure**
- D-01: One scrollable page — custom numpad at top, today's expenses listed below in the same +page.svelte route. No tab bar or dedicated list tab.
- D-02: The home page expense list shows today's expenses only, flat, sorted most recent first.
- D-03: A separate `/expenses` route shows the full expense history. Linked from "View all history →" text link at the bottom of the today list.
- D-04: After saving via category tile tap, the numpad resets immediately to 0. No animation delay or transition on the numpad itself.
- D-05: Custom-crafted numpad using HTML button elements in a grid — the device system keyboard never opens. Required by INPUT-02 (000 key + no decimal).
- D-06: Tapping an expense row (on either the home today list or the /expenses list) navigates to `/expenses/:id/edit` for edit/delete.

**Note entry timing**
- D-07: After an expense saves, a bottom sheet slides up immediately over the numpad area.
- D-08: The note sheet stays visible until the user explicitly taps "Skip" or "Save note" — no auto-dismiss timeout.
- D-09: "Skip" is permanent for that expense session — no re-prompt on next app open.
- D-10: The note field is always present in the edit form (`/expenses/:id/edit`).

**Category tile style**
- D-11: Each category tile shows an emoji above the text label (emoji + text). No color-coding per category.
- D-12: 3-column grid layout — 3 rows of 3-3-1: Food/Transport/Entertainment, Utilities/Shopping/Health, Others.
- D-13: Default emojis: 🍜 Food, 🚗 Transport, 🎬 Entertainment, 💡 Utilities, 🛍️ Shopping, ❤️ Health, ✅ Others.
- D-14: Category tile shows a brief press highlight (darker/bordered state) for the 500ms debounce window after tap.

**Navigation shell**
- D-15: A gear icon (⚙️) in the top-right corner of the home screen opens a simple dropdown/slide-in menu. Menu items: Invite member, Household details, Log out.
- D-16: Full expense history (/expenses) is accessible via a "View all history →" link at the bottom of the today list.
- D-17: Edit expense opens as a full page at `/expenses/:id/edit` with a back button and Save action. Fields: amount, category, note, date.

### Claude's Discretion
- Exact gear menu animation style (dropdown vs slide-in overlay) and positioning — follow mobile PWA conventions.
- Visual styling of the amount display above the numpad (font size, color, empty-state placeholder).
- How the today list empty state looks when no expenses have been logged today.
- The exact edit-screen layout and form structure, as long as all 4 editable fields (amount, category, note, date) are present.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPUT-01 | Quick Add numpad is the default home screen (no dashboard first) | Home page (+page.svelte) completely replaced; numpad-first layout confirmed |
| INPUT-02 | Numpad shows digits 0–9, "000" key, and backspace; no decimal key | Custom HTML button grid (D-05); "000" first-class key per UI-SPEC |
| INPUT-03 | Amounts display with IDR dot-separator formatting in real time | `amount.toLocaleString('id-ID')` integer formatting; display triggers on each keypress |
| INPUT-04 | Category tile row shown below the numpad (7 presets) | Category grid component, 3×3-1 layout per D-12/D-13 |
| INPUT-05 | Tapping a category tile saves the expense and returns to fresh numpad | Server action insert + client state reset; optimistic today-list update |
| INPUT-06 | Save action is debounced (500ms) to prevent duplicate expenses | `pointer-events: none` on tiles + debounce flag in Svelte 5 `$state` |
| INPUT-07 | Each expense entry is assigned a UUID (`client_id`) at numpad-open time | `crypto.randomUUID()` on component mount; regenerated after each save |
| INPUT-12 | User can edit the amount, category, note, and date of a logged expense | `/expenses/[id]/edit` SvelteKit page with form action (UPDATE) |
| INPUT-13 | User can delete a logged expense (soft delete — `is_deleted: true`) | Edit page form action sets `is_deleted: true`; two-step confirm UI |
| INPUT-14 | User can add an optional free-text note to an expense (revealed post-save) | Bottom sheet with note textarea; PATCH action on expense record |

</phase_requirements>

---

## Summary

Phase 2 replaces the current Phase 1 household overview home page with a numpad-first expense entry screen. The full UI contract is already locked in `02-UI-SPEC.md` — no visual design decisions remain. The research focus is therefore: how to wire these screens correctly in SvelteKit 2 / Svelte 5 idioms, what server action patterns to follow, how to structure the optimistic update for the today list, and what test coverage the Nyquist protocol requires.

The existing codebase is well-structured. Phase 1 established: Svelte 5 `$state`/`$derived`/`$props`, SvelteKit form actions with `fail()` + `redirect()`, Supabase via `locals.supabase`, Zod for validation, Vitest + jsdom + Testing Library for unit tests, and CSS custom properties for the design system. All of these carry forward unchanged. No new dependencies are needed for Phase 2. The `expenses` table and its RLS policies are already deployed.

The primary implementation challenge is the custom numpad with its 500ms debounce window, the bottom sheet slide animation in pure CSS/JS (no animation library), and the two-step delete confirmation without a modal. The edit form's date field requires careful handling of timezone conversion between Supabase's `timestamptz` storage (UTC) and the HTML `<input type="date">` value (local date string).

**Primary recommendation:** Build all three new server modules (`+page.server.ts` replace, `/expenses/+page.server.ts`, `/expenses/[id]/edit/+page.server.ts`) first using the established form action pattern, then layer the client-side UI components. Keep all Supabase queries on the server; the client should only trigger server actions via `<form method="POST">` enhanced with `use:enhance`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Expense insert | API / Backend (SvelteKit action) | — | RLS enforces household scope; `household_id` + `created_by` must come from `locals`, not client |
| Expense update / soft delete | API / Backend (SvelteKit action) | — | Same reason; creator-only UPDATE policy enforced at DB level |
| Note PATCH | API / Backend (SvelteKit action) | — | Reuses the same UPDATE RLS path |
| IDR numpad input state | Browser / Client | — | No server round-trip; pure JS string accumulation + `toLocaleString('id-ID')` |
| 500ms debounce lock | Browser / Client | — | `setTimeout` + Svelte `$state` boolean flag |
| UUID `client_id` generation | Browser / Client | — | `crypto.randomUUID()` on component mount and after each save |
| Bottom sheet animation | Browser / Client | — | CSS `transform: translateY` transition; no external library |
| Gear menu dropdown | Browser / Client | — | CSS `scaleY` transform + transparent backdrop div |
| Today expense list (server query) | API / Backend | Browser (optimistic) | SSR load for initial render; optimistic insert appended client-side on save |
| Full history list | API / Backend (SvelteKit load) | — | SSR; no real-time in Phase 2 |
| Two-step delete confirm | Browser / Client | — | UI state only; actual delete is a server action |
| Date field timezone handling | API / Backend | Browser | Store as UTC `timestamptz`; convert to `YYYY-MM-DD` local date for display |

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.16.0 | Routing, SSR, form actions | Locked in Phase 1 |
| Svelte | 5.25.0 | Reactive UI; runes API (`$state`, `$derived`, `$props`, `$effect`) | Locked in Phase 1 |
| Tailwind CSS 4 | 4.1.4 | Utility classes | Locked in Phase 1 |
| `@supabase/ssr` | 0.10.2 | Server-side Supabase client via `locals.supabase` | Locked in Phase 1 |
| `@supabase/supabase-js` | 2.104.1 | Supabase JS client types | Locked in Phase 1 |
| Zod | 4.3.6 | Form data validation in server actions | Locked in Phase 1 |
| Vitest | 3.1.1 | Unit test runner | Locked in Phase 1 |
| `@testing-library/svelte` | 5.2.7 | Component rendering in tests | Locked in Phase 1 |

[VERIFIED: package.json — all versions confirmed]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw CSS transitions for bottom sheet | svelte-transition or Framer Motion | Unnecessary dependency — 250ms translateY is trivial in raw CSS |
| `crypto.randomUUID()` for client_id | `uuid` npm package | `crypto.randomUUID()` is built into all modern browsers; no install needed |
| SvelteKit form actions for expense insert | Supabase JS client directly in browser | Server actions enforce RLS via `locals.supabase`; direct browser insert would require exposing `anon` key which is fine but bypasses the server auth guard |
| `<input type="date">` for date editing | Custom date picker | Native date input works on iOS Safari; avoids a third-party library for v1 |

**Installation:** No new packages required for Phase 2.

---

## Architecture Patterns

### System Architecture Diagram

```
User taps numpad key
        │
        ▼
[Browser: Svelte $state amountStr]
  ← append digit / 000 / backspace
  → toLocaleString('id-ID') → amount display re-renders
        │
User taps category tile
        │
        ▼
[Browser: debounce check (500ms flag)]
  if locked → ignore tap
  if free  → lock (pointer-events: none, accent border)
        │
        ▼
[Browser: form.requestSubmit() OR use:enhance form POST]
  POST / action=?/saveExpense
        │
        ▼
[SvelteKit Server Action: +page.server.ts]
  1. locals.supabase — auth verified by hook
  2. locals.householdId — from current_household_id() RPC
  3. Validate: amount > 0, category in VALID_CATEGORIES[]
  4. supabase.from('expenses').insert({...})
     ← RLS: expenses_household_insert enforces household scope
  5. return { success: true, expense: { id, category, amount, note, spent_at } }
        │
        ▼
[Browser: use:enhance result handler]
  1. Optimistically prepend new expense to todayExpenses[]
  2. Reset amountStr to ''
  3. Generate new client_id via crypto.randomUUID()
  4. Show bottom sheet (slideUp = true)
        │
User taps "Save note" or "Skip"
        │
        ▼ (if "Save note")
[SvelteKit Server Action: POST /?/saveNote]
  supabase.from('expenses').update({ note }).eq('id', expenseId)
        │
        ▼
[Browser]
  slideUp = false → sheet slides down
  User back on fresh numpad

─────────────────────────────────────────────────────

/expenses route (full history):
[Browser request] → [SvelteKit load: /expenses/+page.server.ts]
  supabase.from('expenses')
    .eq('household_id', householdId)
    .eq('is_deleted', false)
    .order('spent_at', { ascending: false })
  → grouped by date on client

/expenses/[id]/edit route:
[Browser request] → [SvelteKit load: +page.server.ts]
  supabase.from('expenses').select().eq('id', id).single()
[User edits form] → POST ?/saveEdit or ?/deleteExpense
  saveEdit: .update({ amount, category, note, spent_at })
  deleteExpense: .update({ is_deleted: true })
  redirect(303, back URL)
```

### Recommended Project Structure

```
src/routes/(app)/
├── +page.svelte              # REPLACED — Quick Add home screen
├── +page.server.ts           # REPLACED — today load + saveExpense + saveNote actions
├── expenses/
│   ├── +page.svelte          # NEW — full history list
│   ├── +page.server.ts       # NEW — load all expenses
│   └── [id]/
│       └── edit/
│           ├── +page.svelte  # NEW — edit form
│           └── +page.server.ts # NEW — load expense + saveEdit + deleteExpense actions

src/lib/
├── components/
│   ├── InstallGuidanceBanner.svelte  # UNCHANGED
│   ├── Numpad.svelte                 # NEW — digit grid component
│   ├── CategoryGrid.svelte           # NEW — 7 tile grid (reused in edit form)
│   ├── ExpenseList.svelte            # NEW — shared list component (home + /expenses)
│   └── NoteSheet.svelte              # NEW — bottom sheet overlay
├── expenses/
│   └── formatters.ts                 # NEW — IDR formatter, date formatter
└── types/
    └── database.ts                   # UNCHANGED
```

### Pattern 1: SvelteKit Form Actions with `use:enhance`

**What:** Server mutation triggered by `<form method="POST">` with progressive enhancement via SvelteKit's `enhance` action. The `enhance` callback intercepts submit, awaits the action, and allows client-side optimistic updates without a full page reload.

**When to use:** All expense mutations — insert, update (note or full edit), soft delete.

```typescript
// Source: SvelteKit docs (established Phase 1 pattern — see onboarding/create/+page.server.ts)
// +page.server.ts — named action
export const actions: Actions = {
  saveExpense: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const householdId = locals.householdId;
    if (!householdId) throw redirect(303, '/onboarding');

    const formData = await request.formData();
    const parsed = saveExpenseSchema.safeParse({
      amount: Number(formData.get('amount')),
      category: formData.get('category'),
      client_id: formData.get('client_id'),
      spent_at: new Date().toISOString()
    });
    if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        household_id: householdId,
        created_by: locals.user!.id,
        amount: parsed.data.amount,
        category: parsed.data.category,
        client_id: parsed.data.client_id,
        spent_at: parsed.data.spent_at
      })
      .select('id, amount, category, note, spent_at')
      .single();

    if (error) return fail(500, { error: 'Couldn\'t save. Check your connection and try again.' });
    return { success: true, expense: data };
  }
};
```

```svelte
<!-- Source: SvelteKit docs (established Phase 1 pattern) -->
<!-- +page.svelte — client side -->
<script lang="ts">
  import { enhance } from '$app/forms';

  let slideUp = $state(false);
  let savedExpense = $state<{ id: string; category: string; amount: number } | null>(null);
  let debounced = $state(false);
  let amountStr = $state('');
  let clientId = $state(crypto.randomUUID());

  function onCategoryTap(category: string) {
    if (debounced || !amountStr || amountStr === '0') return;
    debounced = true;
    // form.requestSubmit() or hidden form trigger
  }
</script>

<form method="POST" action="?/saveExpense" use:enhance={({ formData, cancel }) => {
  if (debounced === false) { cancel(); return; }
  return async ({ result, update }) => {
    if (result.type === 'success' && result.data?.expense) {
      savedExpense = result.data.expense;
      todayExpenses = [result.data.expense, ...todayExpenses]; // optimistic
      amountStr = '';
      clientId = crypto.randomUUID();
      slideUp = true;
    }
    // do NOT call update() — prevents full page reload
    setTimeout(() => { debounced = false; }, 500);
  };
}}>
```

[ASSUMED] The exact `use:enhance` callback signature — verified against known SvelteKit 2 patterns; minor API differences possible but structure is correct.

### Pattern 2: Svelte 5 Runes for Local UI State

**What:** Svelte 5 uses `$state()`, `$derived()`, `$props()`, and `$effect()` runes instead of Svelte 4's reactive declarations. Phase 1 code uses this API throughout.

**When to use:** All component-local state — `amountStr`, `debounced`, `slideUp`, `clientId`, `deleteConfirmPending`.

```svelte
<!-- Source: Phase 1 codebase — src/routes/(app)/settings/invite/+page.svelte -->
<script lang="ts">
  let amountStr = $state('');
  let debounced = $state(false);
  let slideUp = $state(false);
  let clientId = $state(crypto.randomUUID());

  // Derived IDR display string
  const displayAmount = $derived(
    amountStr === '' || amountStr === '0'
      ? '0'
      : parseInt(amountStr, 10).toLocaleString('id-ID')
  );

  function appendDigit(digit: string) {
    const next = amountStr + digit;
    if (parseInt(next, 10) > 99_999_999) return; // max 99.999.999
    amountStr = next.replace(/^0+/, '') || '0';
  }
</script>
```

[VERIFIED: src/routes/(app)/settings/invite/+page.svelte, src/routes/(app)/+layout.svelte — both use Svelte 5 runes]

### Pattern 3: CSS Transitions for Bottom Sheet

**What:** Pure CSS `transform: translateY` with a `transition` property. Svelte's `{#if}` block shows/hides the sheet; a CSS class drives the visual state.

**When to use:** Bottom sheet (note entry) and gear menu dropdown — no animation library needed.

```svelte
<!-- Source: [ASSUMED] — standard CSS transition pattern for mobile bottom sheets -->
<style>
  .sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(100%);
    transition: transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    /* border-radius, box-shadow from UI-SPEC */
  }
  .sheet.open {
    transform: translateY(0);
  }
</style>

<!-- In template -->
<div class="sheet" class:open={slideUp} role="dialog" aria-label="Add a note">
  <!-- sheet content -->
</div>
```

**Key detail:** The sheet element must always be in the DOM (not inside `{#if slideUp}`) so the CSS transition plays on both open and close. Use `inert` or `aria-hidden` to hide it from assistive technology when closed.

### Pattern 4: Soft Delete Pattern

**What:** `is_deleted: true` UPDATE instead of physical DELETE. Matches the existing schema constraint (`is_deleted boolean NOT NULL DEFAULT false`) and the RLS `expenses_creator_update` policy (creator-only UPDATE).

```typescript
// Source: Schema in supabase/migrations/2026042501_phase1_foundation.sql
// +page.server.ts (edit route)
deleteExpense: async ({ params, locals }) => {
  const { id } = params;
  const { error } = await locals.supabase
    .from('expenses')
    .update({ is_deleted: true })
    .eq('id', id);
  if (error) return fail(500, { error: "Couldn't delete. Check your connection and try again." });
  throw redirect(303, '/');
}
```

**Important:** All SELECT queries must include `.eq('is_deleted', false)` to filter soft-deleted rows. The Phase 1 `+page.server.ts` already does this for `recentExpenses`.

### Pattern 5: IDR Formatting

**What:** Integer cents-free IDR formatting using the browser's built-in `Intl.NumberFormat` via `toLocaleString`.

```typescript
// Source: [CITED: MDN — Intl.NumberFormat] + [VERIFIED: src/routes/(app)/+page.svelte]
// Full format for lists (with "Rp " prefix):
function formatIDR(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Numpad display (no prefix, no symbol):
function formatNumpad(amountStr: string): string {
  if (!amountStr || amountStr === '0') return '0';
  return parseInt(amountStr, 10).toLocaleString('id-ID');
}
// Result: 54000 → "54.000" (dot as thousands separator in id-ID locale)
```

**Note:** The existing `formatAmount()` in `+page.svelte` uses k/jt abbreviation — this is for Phase 1 household overview only. Phase 2 expense lists use full `toLocaleString('id-ID')` per the UI-SPEC IDR Formatting Contract. The `formatAmount` helper should NOT be reused for expense list rows.

### Pattern 6: Date Handling (timestamptz ↔ `<input type="date">`)

**What:** The `expenses.spent_at` column is `timestamptz` (UTC). The HTML `<input type="date">` value attribute is `YYYY-MM-DD` local date. Conversion is required in both directions.

```typescript
// Source: [ASSUMED] — standard date handling pattern

// Server load → display in edit form (UTC → local date string):
function toDateInputValue(timestamptz: string): string {
  // Use 'Asia/Jakarta' (WIB) as the display locale for Indonesian users
  return new Date(timestamptz).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta'
  }); // 'en-CA' produces YYYY-MM-DD format
}

// Edit form submit → Supabase (local date → UTC timestamptz):
function fromDateInputValue(dateStr: string): string {
  // Treat input as WIB midnight, convert to ISO UTC string
  return new Date(dateStr + 'T00:00:00+07:00').toISOString();
}
```

**Why this matters:** If you pass `new Date(timestamptz).toISOString().slice(0, 10)` you get the UTC date, which for a WIB evening expense (e.g., 23:00 WIB = 16:00 UTC) is the correct local date. For expenses logged before 07:00 WIB, UTC date is one day earlier. Use `toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })` to avoid the off-by-one.

### Anti-Patterns to Avoid

- **Opening system keyboard on numpad:** Never use `<input type="number">` or `<input type="tel">` for the numpad. The system keyboard must NOT open (D-05). Use `<button>` elements only for the numpad grid.
- **Auto-dismiss on bottom sheet:** D-08 explicitly forbids timeout-based dismiss. No `setTimeout(() => { slideUp = false; })` after save.
- **Decimal input on numpad:** No decimal key (IDR has no sub-rupiah amounts — REQUIREMENTS.md explicit exclusion).
- **Calling `update()` in `use:enhance` handler:** If you call `update()`, SvelteKit re-runs the load function and replaces the page. For the quick-add screen, use optimistic updates and skip `update()` after a successful insert.
- **Querying expenses without `is_deleted: false`:** All SELECT queries on `expenses` must filter `is_deleted = false` or soft-deleted rows appear in lists.
- **Duplicate save from double-tap:** The 500ms debounce flag (`debounced = true` → `pointer-events: none` on tiles) must be set before the server action fires. Reset to `false` after 500ms regardless of action outcome.
- **k/jt format in expense list rows:** The `formatAmount` helper (k/jt notation) is for the Phase 1 household summary only. Expense rows use full IDR: `amount.toLocaleString('id-ID')`.
- **Using `{#if slideUp}` for the sheet:** This unmounts and remounts the DOM on each open/close, preventing CSS transition from playing. Keep the sheet in the DOM and toggle a CSS class.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IDR formatting | Custom string manipulation | `amount.toLocaleString('id-ID')` | Browser Intl handles edge cases (e.g., 0, large numbers) |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Standards-compliant, available in all modern browsers and Node.js 18+ |
| Form validation | Manual string checks | Zod `.safeParse()` (already in use) | Consistent with Phase 1 pattern; handles type coercion |
| Debounce | Manual flag + race condition logic | Simple `$state(false)` boolean with `setTimeout` | The 500ms requirement is simple enough; no library needed |
| Animation timing | requestAnimationFrame loops | CSS `transition` property | One line of CSS; hardware-accelerated on iOS |

**Key insight:** This phase has no new technical problems — only UI assembly of established patterns. The temptation to add animation libraries or date-picker libraries should be resisted. Every feature can be solved with the existing stack.

---

## Common Pitfalls

### Pitfall 1: 300ms Tap Delay on iOS Safari
**What goes wrong:** Numpad keys and category tiles feel sluggish because iOS Safari adds a 300ms delay before firing click events on touch devices.
**Why it happens:** Historical iOS behavior to distinguish taps from double-taps for zoom.
**How to avoid:** Add `touch-action: manipulation` CSS on all interactive elements. The UI-SPEC already specifies this. Also add `user-select: none` on numpad keys so selecting text doesn't interfere.
**Warning signs:** Numpad feels slow; category tile tap doesn't fire immediately.

### Pitfall 2: Bottom Sheet Focus Trap Breaking on iOS
**What goes wrong:** After the note bottom sheet appears, the note textarea `autofocus` doesn't work on iOS because iOS doesn't respect `autofocus` on elements added dynamically.
**Why it happens:** iOS Safari ignores `autofocus` unless the focus is triggered by a direct user interaction event.
**How to avoid:** In the Svelte `$effect` that runs when `slideUp` becomes `true`, programmatically call `inputEl.focus()` inside a `setTimeout(() => { inputEl.focus(); }, 50)`. This is after the touch event has cleared.
**Warning signs:** Note textarea doesn't receive focus; keyboard doesn't open after save.

### Pitfall 3: Supabase Type Cast with `.select()` After `.insert()`
**What goes wrong:** `supabase.from('expenses').insert({...}).select('...')` may return `null` data with TypeScript errors because the Supabase client generics don't narrow correctly after chained `.select()`.
**Why it happens:** Phase 1 code already works around this with `as unknown as ExpenseType`. The same cast is needed for insert-then-select chains.
**How to avoid:** Use `as unknown as ExpenseRow | null` cast on the result `data`. Established pattern in `+page.server.ts` Phase 1.
**Warning signs:** TypeScript errors on `.data` access after insert; runtime `null` when insert succeeded.

### Pitfall 4: `redirect()` Throws Inside `use:enhance` Handler
**What goes wrong:** The server action for `saveExpense` should NOT `redirect()` on success — the client handles the UI update. A `redirect()` would cause SvelteKit to navigate away from the quick-add screen, breaking the instant-reset flow (D-04).
**Why it happens:** Form actions that redirect are normal for multi-page forms. The quick-add screen is a single-page flow.
**How to avoid:** Return `{ success: true, expense: data }` (not a redirect) from `saveExpense` and `saveNote` actions. Reserve `redirect(303, '/')` for `saveEdit` and `deleteExpense` actions only.
**Warning signs:** After category tap, screen navigates away; optimistic update never renders.

### Pitfall 5: `is_deleted` Filter Missing on Today Query
**What goes wrong:** Soft-deleted expenses appear in the today list after deletion.
**Why it happens:** Forgetting `.eq('is_deleted', false)` in the SELECT query.
**How to avoid:** All expense queries must include `.eq('is_deleted', false)`. Template: `supabase.from('expenses').select(...).eq('household_id', hid).eq('is_deleted', false)`.
**Warning signs:** Deleted expense reappears on list after delete and page refresh.

### Pitfall 6: WIB Date Boundary for "Today" Query
**What goes wrong:** The today query filters expenses for "today" using UTC midnight, causing expenses logged between 00:00–07:00 WIB to appear as "today" when they were actually logged yesterday WIB.
**Why it happens:** `new Date().toISOString()` gives UTC date; Indonesia (WIB) is UTC+7.
**How to avoid:** Compute today's start and end in WIB on the server:
```typescript
// Source: [ASSUMED]
const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000); // offset by +7h
const todayStartWIB = new Date(nowWIB.toISOString().slice(0, 10) + 'T00:00:00+07:00');
const todayEndWIB = new Date(nowWIB.toISOString().slice(0, 10) + 'T23:59:59+07:00');
// Then: .gte('spent_at', todayStartWIB.toISOString()).lte('spent_at', todayEndWIB.toISOString())
```
**Warning signs:** Expenses logged after midnight WIB don't show in today's list.

### Pitfall 7: Edit Form Amount Field — Stored Int vs Display String
**What goes wrong:** The edit form amount field shows the raw integer (e.g., "54000") instead of the IDR-formatted string (e.g., "54.000"). On save, the formatted string "54.000" is submitted as the amount, which `parseInt("54.000", 10)` parses as `54` (stops at the dot).
**Why it happens:** Mixing display formatting with the form value.
**How to avoid:** The amount `<input>` value binding must use the raw integer (no dots): `value={expense.amount}`. Display the IDR-formatted string as a separate label or use `oninput` to format/strip dots for display only. On server, receive the raw integer string and parse with `parseInt(rawStr.replace(/\./g, ''), 10)`.
**Warning signs:** Edit saves wrong amount (truncated at first dot separator).

---

## Code Examples

### IDR Formatter Module

```typescript
// Proposed: src/lib/expenses/formatters.ts
// Source: [CITED: MDN Intl.NumberFormat] + [VERIFIED: Phase 1 pattern in +page.svelte]

/** Full IDR format with "Rp " prefix — for expense list rows */
export function formatIDR(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

/** Numpad display format — no prefix, dot separator only */
export function formatNumpad(amountStr: string): string {
  if (!amountStr || amountStr === '0') return '0';
  return parseInt(amountStr, 10).toLocaleString('id-ID');
}

/** Date display — id-ID locale, short month */
export function formatDisplayDate(timestamptz: string): string {
  return new Date(timestamptz).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

/** Date input value — YYYY-MM-DD in WIB timezone */
export function toDateInputValue(timestamptz: string): string {
  return new Date(timestamptz).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta'
  });
}

/** Convert date input YYYY-MM-DD back to UTC ISO string (WIB midnight) */
export function fromDateInputValue(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00+07:00').toISOString();
}
```

### Expense Insert Zod Schema

```typescript
// Source: [ASSUMED] — follows Phase 1 Zod schema pattern (src/lib/auth/schemas.ts, src/lib/households/schemas.ts)
import { z } from 'zod';

const VALID_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Others'] as const;

export const saveExpenseSchema = z.object({
  amount: z.number().int().positive().max(99_999_999),
  category: z.enum(VALID_CATEGORIES),
  client_id: z.string().uuid(),
  spent_at: z.string().datetime()
});

export const saveNoteSchema = z.object({
  expense_id: z.string().uuid(),
  note: z.string().max(500).optional()
});

export const editExpenseSchema = z.object({
  amount: z.number().int().positive().max(99_999_999),
  category: z.enum(VALID_CATEGORIES),
  note: z.string().max(500).nullable(),
  spent_at: z.string().datetime()
});
```

### Gear Menu Dropdown (Svelte 5)

```svelte
<!-- Source: [ASSUMED] — standard dropdown pattern in Svelte 5 -->
<script lang="ts">
  let menuOpen = $state(false);
  function toggleMenu() { menuOpen = !menuOpen; }
  function closeMenu() { menuOpen = false; }
</script>

{#if menuOpen}
  <!-- Transparent backdrop to catch outside-clicks -->
  <div
    class="fixed inset-0 z-40"
    role="presentation"
    onclick={closeMenu}
    onkeydown={closeMenu}
  ></div>
{/if}

<button
  class="relative z-50"
  onclick={toggleMenu}
  aria-label="Open menu"
  style="min-width: 44px; min-height: 44px"
>⚙</button>

{#if menuOpen}
  <div
    class="absolute right-4 top-12 z-50 w-48 overflow-hidden rounded-xl border"
    style="background: var(--color-bg); border-color: var(--color-surface);
           box-shadow: 0 4px 16px rgba(0,0,0,0.10);
           transform-origin: top right;
           animation: dropdown-in 150ms ease-out;"
  >
    <a href="/settings/invite" onclick={closeMenu} class="flex min-h-[48px] items-center px-4">Invite member</a>
    <a href="/household" onclick={closeMenu} class="flex min-h-[48px] items-center px-4">Household details</a>
    <hr style="border-color: var(--color-surface)">
    <form method="POST" action="/logout">
      <button type="submit" class="flex min-h-[48px] w-full items-center px-4" style="color: var(--color-destructive)">Log out</button>
    </form>
  </div>
{/if}
```

### Two-Step Delete Confirmation

```svelte
<!-- Source: UI-SPEC Screen 4; [ASSUMED] implementation pattern -->
<script lang="ts">
  let deleteConfirm = $state(false);
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;

  function onDeleteClick() {
    if (!deleteConfirm) {
      deleteConfirm = true;
      deleteTimer = setTimeout(() => { deleteConfirm = false; }, 3000);
    }
    // Second click handled by form submit below
  }
</script>

<form method="POST" action="?/deleteExpense" use:enhance={...}>
  <button
    type={deleteConfirm ? 'submit' : 'button'}
    onclick={deleteConfirm ? undefined : onDeleteClick}
    class="min-h-[48px] w-full rounded-lg text-base font-semibold"
    style={deleteConfirm
      ? 'border: 1px solid var(--color-destructive); background: transparent; color: var(--color-destructive)'
      : 'background: var(--color-destructive); color: var(--color-destructive-foreground)'}
    aria-live="polite"
  >
    {deleteConfirm ? 'Tap again to confirm delete' : 'Delete expense'}
  </button>
</form>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 reactive `$:` declarations | Svelte 5 runes (`$state`, `$derived`, `$effect`) | Svelte 5 GA (2024) | Must use runes — mixing is not supported in Phase 1 established code |
| SvelteKit `+page.js` load + fetch | SvelteKit `+page.server.ts` with `locals.supabase` | Phase 1 established | Server-side Supabase client; auth via cookies |
| `fail()` from `@sveltejs/kit` for validation errors | Same — unchanged | Established | Return `fail(400, {...})` from actions |

**No deprecated patterns identified for this phase.**

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `use:enhance` callback skips `update()` to prevent page reload on quick-add save | Pattern 1 | If wrong: full page reload after each save, breaking the instant-reset UX |
| A2 | CSS `transition` on `.sheet` element plays on close as well as open (element must stay in DOM) | Pattern 3 | If wrong: sheet close transition doesn't animate |
| A3 | `setTimeout(() => { inputEl.focus(); }, 50)` makes iOS autofocus work on bottom sheet textarea | Pitfall 2 | If wrong: keyboard doesn't open after save; user must manually tap input |
| A4 | `toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })` produces `YYYY-MM-DD` | Pattern 6 / Code Examples | If wrong: wrong date shown in edit form; verify in test |
| A5 | Zod 4.x API is compatible with Zod 3.x `.safeParse()` usage | Standard Stack | If wrong: Zod import errors; check zod v4 migration guide |

---

## Open Questions

1. **Expense grouping on /expenses by date — client or server?**
   - What we know: The server returns a flat list ordered by `spent_at DESC`. Date group headers are needed in the UI (e.g., "26 Apr").
   - What's unclear: Whether grouping happens in the server load (returning grouped arrays) or in the Svelte component (iterating and emitting headers on date change).
   - Recommendation: Group in the Svelte component using a `$derived` computed value. Simpler server load, no extra round-trip.

2. **Optimistic today list after save — does it survive a page refresh?**
   - What we know: The optimistic prepend adds the expense to a client-side array. A page reload re-runs the server load which queries today's expenses from Supabase.
   - What's unclear: Whether the insert has fully committed by the time a near-instant refresh happens.
   - Recommendation: The server action's `await supabase.from('expenses').insert(...)` is synchronous before returning — the insert is committed. No race condition.

3. **`SvelteKitError` vs `fail()` for auth guard in actions**
   - What we know: Phase 1 actions use `throw redirect(303, ...)` for auth failures. `fail()` is for validation errors.
   - Recommendation: Keep the same pattern. Auth guard: `throw redirect(303, '/auth')`. Validation error: `return fail(400, {...})`. Server error: `return fail(500, {...})`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build / test | ✓ | (system) | — |
| Vitest | Unit tests | ✓ | 3.1.1 | — |
| Supabase project (linked) | expenses table, RLS | ✓ | Already deployed (Phase 1 migration) | — |
| `crypto.randomUUID()` | client_id generation | ✓ | Native browser/Node 18+ | — |
| `Intl.NumberFormat` (id-ID) | IDR formatting | ✓ | All modern browsers | — |

All dependencies are already available. No environment setup needed for Phase 2.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.1 + @testing-library/svelte 5.2.7 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test -- --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INPUT-02 | Numpad renders 12 keys: 0-9, 000, backspace | unit | `npm run test -- tests/expenses/numpad.test.ts -t "renders"` | ❌ Wave 0 |
| INPUT-03 | `formatNumpad('54000')` returns `'54.000'` | unit | `npm run test -- tests/expenses/formatters.test.ts` | ❌ Wave 0 |
| INPUT-03 | Amount display shows '0' when amountStr is empty | unit | `npm run test -- tests/expenses/numpad.test.ts -t "empty state"` | ❌ Wave 0 |
| INPUT-06 | Second category tap within 500ms does not trigger a second save | unit | `npm run test -- tests/expenses/numpad.test.ts -t "debounce"` | ❌ Wave 0 |
| INPUT-07 | `client_id` is a valid UUID generated before first tap | unit | `npm run test -- tests/expenses/numpad.test.ts -t "client_id"` | ❌ Wave 0 |
| INPUT-12 | Edit form server action updates amount, category, note, spent_at | unit | `npm run test -- tests/expenses/edit.test.ts -t "saveEdit"` | ❌ Wave 0 |
| INPUT-13 | Delete action sets is_deleted=true (not physical delete) | unit | `npm run test -- tests/expenses/edit.test.ts -t "deleteExpense"` | ❌ Wave 0 |
| INPUT-14 | saveNote action patches note field only | unit | `npm run test -- tests/expenses/quick-add.test.ts -t "saveNote"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- tests/expenses/ --reporter=verbose`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/expenses/formatters.test.ts` — covers INPUT-03 (IDR formatter unit tests)
- [ ] `tests/expenses/numpad.test.ts` — covers INPUT-02, INPUT-03 (empty state), INPUT-06, INPUT-07
- [ ] `tests/expenses/quick-add.test.ts` — covers INPUT-05 (save action), INPUT-14 (saveNote action)
- [ ] `tests/expenses/edit.test.ts` — covers INPUT-12 (saveEdit), INPUT-13 (deleteExpense soft delete)

*(Existing test infrastructure: `tests/setup.ts`, `vitest.config.ts`, jsdom environment — all reusable without changes)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth is Phase 1 established; Phase 2 reuses session |
| V3 Session Management | no | Session management is Phase 1 established |
| V4 Access Control | yes | RLS policies on `expenses` table (already deployed) |
| V5 Input Validation | yes | Zod schemas on all server actions |
| V6 Cryptography | no | `crypto.randomUUID()` is standard; no custom crypto |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation (one household reads another's expenses) | Information Disclosure | RLS `expenses_household_select` policy — `is_household_member(household_id)` enforced at DB level |
| Expense insert for another household | Tampering | `household_id` sourced from `locals.householdId` (server-side); never from form data |
| Edit/delete another user's expense | Tampering | RLS `expenses_creator_update` policy — `created_by = auth.uid()` enforced at DB level |
| Amount overflow | Tampering | Zod `max(99_999_999)` + client-side max check in numpad |
| Note XSS | XSS | SvelteKit / Svelte auto-escapes text interpolation; no `{@html}` usage |
| Double-save race | Integrity | `client_id` UUID unique constraint + 500ms debounce; `ON CONFLICT (client_id) DO NOTHING` is Phase 3 (INPUT-11) but idempotency is architecturally safe already |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: `supabase/migrations/2026042501_phase1_foundation.sql`] — `expenses` table schema, RLS policies, `current_household_id()` RPC
- [VERIFIED: `src/lib/types/database.ts`] — TypeScript types for all expense operations
- [VERIFIED: `package.json`] — All dependency versions
- [VERIFIED: `src/app.css`] — CSS custom properties (design tokens)
- [VERIFIED: `vitest.config.ts`] — Test framework configuration
- [VERIFIED: `src/routes/(app)/+page.server.ts`] — Form action pattern, Supabase query pattern, TypeScript cast pattern
- [VERIFIED: `.planning/phases/02-quick-add/02-UI-SPEC.md`] — Full UI contract, all interaction specs
- [VERIFIED: `.planning/phases/02-quick-add/02-CONTEXT.md`] — All locked decisions

### Secondary (MEDIUM confidence)
- [CITED: MDN Intl.NumberFormat] — `toLocaleString('id-ID')` produces dot-separator formatting for integers

### Tertiary (LOW confidence)
- [ASSUMED] — `use:enhance` callback pattern for optimistic insert without `update()` call — consistent with known SvelteKit 2 docs but not re-verified via Context7 in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json and codebase
- Architecture: HIGH — derived directly from locked decisions in CONTEXT.md + UI-SPEC.md
- Pitfalls: MEDIUM — most derived from codebase analysis; A3 (iOS autofocus) is assumed
- Test map: HIGH — framework verified; specific test file names are Wave 0 proposals

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable stack; no fast-moving dependencies)
