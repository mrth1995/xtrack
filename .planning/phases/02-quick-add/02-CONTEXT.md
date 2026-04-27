# Phase 2: Quick Add - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the core write path: a custom numpad-first expense entry screen that becomes the app's default home screen, with 7 preset category tiles, IDR dot-separator formatting, and a 2–3 tap save flow. The home screen shows today's expenses below the numpad; a separate /expenses route provides full history with edit and delete access. A post-save bottom sheet enables optional note entry. A gear icon gives access to household settings and navigation.

</domain>

<decisions>
## Implementation Decisions

### Screen structure
- **D-01:** One scrollable page — custom numpad at top, today's expenses listed below in the same +page.svelte route. No tab bar or dedicated list tab.
- **D-02:** The home page expense list shows today's expenses only, flat, sorted most recent first (descending by spent_at).
- **D-03:** A separate `/expenses` route shows the full expense history. Used to edit or delete older expenses. Linked from a "View all history →" text link at the bottom of the today list on the home page.
- **D-04:** After saving via category tile tap, the numpad resets immediately to 0. No animation delay or transition on the numpad itself.
- **D-05:** Custom-crafted numpad using HTML button elements in a grid — the device system keyboard never opens. Required by INPUT-02 (000 key + no decimal).
- **D-06:** Tapping an expense row (on either the home today list or the /expenses list) navigates to `/expenses/:id/edit` for edit/delete.

### Note entry timing
- **D-07:** After an expense saves, a bottom sheet slides up immediately over the numpad area. The sheet shows the saved expense summary (category + amount) and an "Add a note (optional)" text input.
- **D-08:** The note sheet stays visible until the user explicitly taps "Skip" or "Save note" — no auto-dismiss timeout.
- **D-09:** "Skip" is permanent for that expense session — no re-prompt on next app open.
- **D-10:** The note field is always present in the edit form (`/expenses/:id/edit`). The user can add or update a note at any time via the edit screen, not only at save time.

### Category tile style
- **D-11:** Each category tile shows an emoji above the text label (emoji + text). No color-coding per category.
- **D-12:** 3-column grid layout — 3 rows of 3-3-1: Food/Transport/Entertainment, Utilities/Shopping/Health, Others.
- **D-13:** Default emojis: 🍜 Food, 🚗 Transport, 🎬 Entertainment, 💡 Utilities, 🛍️ Shopping, ❤️ Health, ✅ Others.
- **D-14:** Category tile shows a brief press highlight (darker/bordered state) for the 500ms debounce window after tap. Provides tap confirmation feedback.

### Navigation shell
- **D-15:** A gear icon (⚙️) in the top-right corner of the home screen opens a simple dropdown/slide-in menu. Menu items: Invite member, Household details, Log out.
- **D-16:** Full expense history (/expenses) is accessible via a "View all history →" link at the bottom of the today list on the home screen.
- **D-17:** Edit expense opens as a full page at `/expenses/:id/edit` with a back button and Save action. Fields: amount, category, note, date.

### Claude's Discretion
- Exact gear menu animation style (dropdown vs slide-in overlay) and positioning — follow mobile PWA conventions.
- Visual styling of the amount display above the numpad (font size, color, empty-state placeholder).
- How the today list empty state looks when no expenses have been logged today.
- The exact edit-screen layout and form structure, as long as all 4 editable fields (amount, category, note, date) are present.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency order, and scope boundary.
- `.planning/REQUIREMENTS.md` — Locked requirement IDs for Phase 2: `INPUT-01` through `INPUT-07`, `INPUT-12`, `INPUT-13`, `INPUT-14`.

### Project constraints
- `.planning/PROJECT.md` — Product context, locked stack (SvelteKit 2 + Svelte 5 + Tailwind 4 + Supabase + Cloudflare Pages), household model, PWA/iOS priorities, IDR locale requirements.
- `.planning/STATE.md` — Foundation decisions carried forward: email/password-only auth, IndexedDB session persistence, RLS from first migration, confirmed stack.

### Phase 1 context (decisions that constrain Phase 2)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 navigation and shell decisions. The gear menu in Phase 2 replaces the Phase 1 signed-in shell and must carry forward the same entry points (invite, household details, log out).

### Database schema
- `supabase/migrations/2026042501_phase1_foundation.sql` — The `expenses` table is already defined here. Phase 2 must write to this schema without altering it. Key fields: `amount` (integer, IDR), `category` (text), `note` (text, nullable), `spent_at` (timestamptz), `client_id` (uuid, unique), `is_deleted` (boolean, soft delete), `household_id`, `created_by`.
- `src/lib/types/database.ts` — TypeScript types mirroring the schema. Phase 2 must use the existing `expenses` Row/Insert/Update types.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/(app)/+page.svelte` — Current home page. Has `formatAmount()` (k/jt notation) and `formatDate()` helpers that Phase 2 should reuse. Also has the household identity block and recent expenses list pattern to reference.
- `src/lib/components/InstallGuidanceBanner.svelte` — Existing component; should remain on the home screen.
- `src/lib/types/database.ts` — `expenses` table types are ready for use. No new type definitions needed for basic CRUD.

### Established Patterns
- CSS custom properties: `var(--color-accent)`, `var(--color-muted)`, `var(--color-text)`, `var(--color-border)`, `var(--color-surface)` — used throughout Phase 1 components. Phase 2 must follow this pattern.
- Touch targets: `min-h-[48px]` for primary actions, `min-h-[44px]` for secondary. Match this for category tiles.
- Form submissions via SvelteKit form actions (`method="POST" action="/..."`) — established in Phase 1 auth and household flows.
- Supabase client via `locals.supabase` in load functions and server actions.

### Integration Points
- Home screen (`src/routes/(app)/+page.svelte`) gets replaced by the Quick Add UI in Phase 2. The Phase 1 household overview content (household name, member count, invite link, logout) moves into the gear menu or settings path.
- New routes to create: `/expenses` (full history list), `/expenses/[id]/edit` (edit form).
- RLS on `expenses` table is already set up — insert/select/update will be household-scoped automatically.
- The `current_household_id()` RPC (already defined) can be used in server load functions to scope expense queries.

</code_context>

<specifics>
## Specific Ideas

- The numpad UI should feel like a calculator: large tap targets, clear amount display above the grid, immediate visual response on each key press.
- "000" key is a first-class key on the numpad (equal size to other keys) — not a secondary shortcut.
- The note bottom sheet should show the saved expense details prominently (e.g., "Food • 54.000") so the user knows what they're annotating, especially if the note is added a few seconds after save.
- The /expenses history page should use the same expense list component as the home page's today list for visual consistency.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-quick-add*
*Context gathered: 2026-04-27*
