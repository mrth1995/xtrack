---
phase: 2
reviewers: [codex]
reviewed_at: 2026-04-28T00:00:00Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md
runtime_note: "Cycle 2. Claude Code (self) skipped per SELF_CLI=claude rule. Gemini, OpenCode, Qwen, Cursor not installed."
---

# Cross-AI Plan Review — Phase 2: Quick Add

---

## Cycle 2 (2026-04-28) — Post-Replan Review

> **Context:** This is the second review cycle. Cycle 1 raised 3 HIGH concerns; the plans were replanned to address them. Codex re-reviews the post-replan state.

---

## Codex Review (Cycle 2)

### Summary

The replanned Phase 2 is directionally strong and should achieve the core Quick Add goal: fast home-screen expense entry, immediate category save, visible recent expenses, and edit/delete correction paths. The split between shared utilities, home Quick Add, history/edit, and manual acceptance is sensible. The main residual risk is still idempotency: the UI debounce reduces accidental duplicates, but server behavior can still fail on repeated `client_id` submission until Phase 3. I would not block Phase 2 on that if it is explicitly accepted, but I would make the failure mode user-friendly and test-pinned.

### Strengths

- The phase is aligned with the product value: numpad-first, no dashboard, no system keyboard, category tap saves immediately.
- The one-page home design with today's list below the numpad matches the locked decisions and avoids navigation friction.
- Wave 0 RED test scaffolds are useful because they pin contracts before implementation, especially for server actions and soft delete behavior.
- Security-critical behaviors are explicitly called out: `household_id` from `locals`, no physical delete, `is_deleted=false` filters.
- WIB date handling is planned early in shared utilities instead of being scattered across routes.
- `ExpenseList.svelte` reuse between home and history should reduce divergence.
- Manual UAT includes real-device PWA concerns that automated tests may miss, especially iOS keyboard behavior and touch flow.

### Concerns

- **HIGH: Duplicate-save risk remains open at the server boundary.**
  The 500ms debounce and pressed state reduce double-tap duplicates, but they do not make the save operation idempotent. A repeated enhanced form submission, browser retry, slow network tap, or back/forward resubmit can still hit the unique `client_id` constraint and return an error. Since Phase 3 owns `ON CONFLICT DO NOTHING`, this is acceptable only if Phase 2 handles the duplicate error cleanly as "already saved" or shows a non-alarming message.

- **MEDIUM: `client_id` timing needs stricter definition.**
  Requirement INPUT-07 says each entry gets a UUID at numpad-open time. The plan says this, but the implementation must regenerate `client_id` only after a successful save or explicit reset. If it regenerates too often during reactivity, category tap, or amount changes, the duplicate protection weakens.

- **MEDIUM: `saveNote` ownership behavior is under-specified.**
  RLS is an acceptable backstop, but the action should still treat `0 rows updated` as a controlled failure or no-op, not a success. Otherwise tampered IDs, stale note sheets, deleted expenses, or cross-household attempts may appear successful to the user.

- **MEDIUM: Edit/delete update filters should include `is_deleted=false`.**
  The load query filters deleted rows, but the update actions should also avoid updating already-deleted rows. RLS handles household scope, but `is_deleted=false` guards stale forms and accidental resurrection-adjacent behavior.

- **MEDIUM: Date editing loses time-of-day unless deliberately accepted.**
  `input type="date"` plus `fromDateInputValue()` likely stores WIB midnight for edited expenses. That is fine if the product only edits the date, but it means saving an old expense may change its ordering within the day. The plan should state this behavior explicitly.

- **MEDIUM: SvelteKit enhanced forms can produce subtle race states.**
  Optimistic save, disabled category tiles, note sheet display, and numpad reset need a clear source of truth. If the UI resets before the server confirms, a failed save could leave the user with an empty numpad and no expense saved.

- **LOW: CategoryGrid has two modes but only one component contract is described.**
  Quick Add uses "tap to save"; edit uses "select mode." The component API should distinguish `onCategoryTap` from selected value state clearly to avoid awkward event handling.

- **LOW: Gear menu actions are listed but not scoped.**
  "Invite member," "Household details," and "Log out" may already exist from Phase 1, but the plan should say whether this phase links to existing routes/actions or implements new ones. Otherwise 02-02 risks pulling in unrelated work.

- **LOW: Error toast is only mentioned in UAT, not implementation deliverables.**
  If server errors must surface as toast, 02-02 and 02-03 should name the toast mechanism or existing pattern.

### Suggestions

- Treat duplicate `client_id` unique violations in `saveExpense` as a controlled response in Phase 2, even before Phase 3's `ON CONFLICT`. For example: detect the duplicate error, fetch the existing expense by `client_id` under RLS, and return `{ success: true, expense, duplicate: true }`.

- Add tests that pin `client_id` lifecycle:
  - generated when numpad session starts
  - reused across double-tap / repeated submit
  - regenerated after successful save
  - not regenerated on amount edits before save

- In `saveNote`, check update result count or returned row. If no row is updated, return a clear failure such as `fail(404)` or `fail(403)` depending on the existing app convention.

- In `saveEdit` and `deleteExpense`, update with both `id` and `is_deleted=false`. If Supabase supports it in the local pattern, use `.select().single()` or equivalent to detect no-op updates.

- Make the optimistic save behavior conservative: disable category tiles immediately, keep enough pending state to restore the amount if save fails, and only show the note sheet after confirmed server success.

- Define note skip behavior in state terms. Since "Skip is permanent for that expense session," specify whether it is only client-side UI state or persisted. For v1, client-side is probably enough, but the plan should say so.

- Add a specific test for the WIB boundary:
  - expense at `2026-04-27T17:00:00Z` appears on `2026-04-28` WIB
  - expense at `2026-04-28T16:59:59Z` appears
  - expense at `2026-04-28T17:00:00Z` does not

- Keep 02-04's live Supabase RLS verification narrow and scripted. Manual "verify RLS" can become vague; a small SQL checklist or expected query matrix would make it reliable.

### Risk Assessment

**Overall risk: MEDIUM.**

The plan is complete enough to deliver the Phase 2 user experience, and the dependency ordering is reasonable. The remaining risks are mostly around transactional correctness, stale UI states, and SvelteKit form-action edge cases rather than broad architecture. The previous HIGH concerns are now documented and partially mitigated, but duplicate save is still a real open issue until server-side idempotency lands. I would proceed with Phase 2, but only after tightening the `client_id` lifecycle, duplicate-error handling, and no-op update handling in the implementation/tests.

---

## Cycle 2 Consensus Summary

Single reviewer invoked (Codex). Claude Code is the executing runtime and was excluded per the independence rule (`SELF_CLI=claude`). Other CLIs (Gemini, OpenCode, Qwen, Cursor) are not installed.

### Agreed Strengths (Cycle 2)

- Wave-0-first sequencing with RED test scaffolds pins contracts before feature implementation begins.
- Security-critical patterns explicitly documented: `household_id` from `locals`, soft delete only, `is_deleted=false` filters on load.
- WIB timezone handling centralized in formatters with round-trip test coverage.
- Human UAT plan covers real-device behaviors that jsdom cannot simulate (iOS keyboard suppression, touch flow, PWA install).
- ExpenseList reuse between home today-list and /expenses history prevents visual drift.

### Agreed Concerns (Cycle 2)

1. **(HIGH) Duplicate-save at server boundary remains open** — Phase 2 debounce reduces accidental double-taps but does not make the server action idempotent. A `client_id` UNIQUE conflict currently returns a 500. Phase 3 will add `ON CONFLICT DO NOTHING`; Phase 2 must ensure the 500 surfaces as a non-alarming error message rather than being silently swallowed. **Status: PARTIALLY RESOLVED — gap acknowledged, error-toast requirement added to 02-04 UAT, full fix deferred to Phase 3.**

2. **(HIGH/PARTIALLY RESOLVED) saveNote / saveEdit / deleteExpense horizontal privilege escalation** — RLS (`expenses_creator_update`) is the backstop. saveNote update result (0 rows) on tampered ID should be treated as controlled failure, not success. **Status: PARTIALLY RESOLVED — RLS documented as primary control, but `saveNote` 0-rows-updated handling not yet explicitly planned.**

3. **(HIGH/PARTIALLY RESOLVED) Edit/delete route authorization clarity** — Load query filters `id + is_deleted=false`; RLS provides household scope. Update actions do not re-check `is_deleted=false`, which could affect stale-form edge cases. **Status: PARTIALLY RESOLVED — RLS reliance documented; update-side `is_deleted=false` filter not yet planned.**

### Divergent Views

N/A — Single reviewer both cycles.

### Reviewer Notes for /gsd-plan-phase --reviews (Cycle 2)

1. **Duplicate error UX (HIGH):** Add explicit handling in `saveExpense` for the UNIQUE constraint violation (Postgres error code `23505`). Return `{ success: true, expense, duplicate: true }` by fetching the existing row by `client_id`, rather than letting the 500 propagate.

2. **`saveNote` 0-rows defense:** Add a row-count check after the update. If `count === 0`, return `fail(404, { error: 'Expense not found' })`.

3. **Update-side `is_deleted=false` filter:** Add `.eq('is_deleted', false)` to the `saveEdit` and `deleteExpense` update queries. This prevents stale form submissions from resurrecting soft-deleted rows.

4. **`client_id` lifecycle documentation:** Explicitly document in 02-02 that `client_id` is generated once on page mount, reused for the entire in-flight submit, and only regenerated on successful save confirmation. Amount edits do NOT regenerate it.

5. **WIB boundary test:** Add to `tests/expenses/quick-add.test.ts` a test that the WIB-bounded today query correctly includes `2026-04-27T17:00:00Z` (WIB midnight) and excludes `2026-04-28T17:00:00Z` (WIB next midnight).

---

## Cycle 1 (2026-04-27) — Original Review (Archived)

> **Note:** Cycle 1 raised 3 HIGH concerns that triggered a replan. The replanned state is reviewed in Cycle 2 above.

---

## Codex Review (Cycle 1)

### Summary

The plan set is coherent and mostly well-scoped for Phase 2. It correctly prioritizes the core product promise: home-screen-to-saved expense entry with no dashboard detour, custom numpad, immediate category save, edit/delete correction paths, and WIB-aware "today" semantics. The sequencing is sensible: shared utilities and test scaffolding first, Quick Add and History/Edit in parallel after foundation, then human UAT. Main risks are around SvelteKit form/action mechanics, duplicate-save prevention under real network latency, optimistic UI consistency, timezone/date conversion details, and route-level authorization guarantees.

### Strengths

- Clear dependency structure: `02-01` establishes shared formatters, schemas, category metadata, and list UI before feature pages consume them.
- Locked decisions are reflected well: one-page Quick Add, no tab bar, custom numpad, note bottom sheet, gear menu, `/expenses/:id/edit`, full history route.
- Good security instinct in `saveExpense`: deriving `household_id` from `locals` rather than trusting the client.
- Soft delete is correctly chosen over physical delete.
- WIB handling is explicitly planned instead of relying on server locale.
- Debounce and pressed-state behavior are treated as product requirements, not incidental UI polish.
- Human UAT plan covers the most important real-device risks, especially iOS keyboard suppression and install-style usage.

### Concerns

- **HIGH:** Duplicate prevention may be insufficient if debounce is only client-side. A double tap, replay, slow network, browser resubmission, or JS race can still create duplicates unless the server receives and enforces a stable `client_id` per attempted save. The `client_id uuid unique` column helps, but the plan must ensure the same `client_id` is reused for the in-flight request, not regenerated per submit.

- **HIGH:** Authorization for edit/delete loads and actions is not explicit enough. `eq('id', params.id)` plus RLS may be enough if RLS is correct, but the plan should require household/user scoping in queries where possible, or explicitly state reliance on tested RLS policies. Actions should not allow editing/deleting another household's expense through guessed IDs.

- **HIGH:** `saveNote` says "UPDATE only note field" but does not specify ownership/household scoping or whether it only updates the just-created expense. A malicious client could submit another `expense_id` unless protected by RLS and/or household-scoped query conditions.

- **MEDIUM:** The note sheet flow depends on returning `{ success, expense }` from a form action and updating local state. SvelteKit action result handling can get subtle when using hidden forms and `requestSubmit()`. The plan should specify whether it uses `use:enhance`, `applyAction`, or normal form submission. Without enhancement, the page may reload and make the bottom sheet behavior harder to preserve.

- **MEDIUM:** Optimistic today-list updates can drift from server truth. If save succeeds but note update fails, or if save response shape differs, the list and note sheet could disagree. Failed save handling is not described.

- **MEDIUM:** `/expenses` full history with no limit is acceptable for early MVP, but it will become slow as real households accumulate data. This is probably fine for Phase 2, but should be called out as an intentional temporary choice.

- **MEDIUM:** Date conversion needs careful testing around WIB boundaries. The proposed `setUTCDate(getUTCDate() + 1)` works for fixed `+07:00`, but it is easy to misread and should be covered by tests for late UTC / early WIB cases.

- **MEDIUM:** Edit amount uses native numeric input while Quick Add uses custom numpad. That is consistent with D-17, but the plan should specify formatting/parsing behavior clearly. If the input shows formatted dots, cursor behavior can be awkward; if it stores raw digits, validation messages need to be clear.

- **LOW:** `NoteSheet` "always in DOM" is fine, but if the textarea remains focusable or screen-reader-visible while closed, it can create accessibility issues. It should use `hidden`, `inert`, `aria-hidden`, or equivalent state handling when closed.

- **LOW:** Gear menu backdrop at `z-40` needs careful layering against the note sheet. The note sheet should not be trapped behind the menu or accidentally dismissed by unrelated backdrop clicks.

- **LOW:** Category emoji choices are locked, but rendering emoji varies by platform. That is acceptable, but button accessible names should include labels, not rely on emoji.

### Suggestions

- Add a server-side idempotency requirement: generate `client_id` before submit, keep it stable while the save is in flight, disable category buttons, and handle unique-constraint conflict by returning the existing/success state rather than surfacing an error.

- Make every mutation explicitly household-scoped where feasible:
  - `saveNote`: update by `id` and current `household_id`
  - `saveEdit`: update by `id`, current `household_id`, and `is_deleted=false`
  - `deleteExpense`: same constraints
  - Keep RLS as the backstop, not the only visible guardrail.

- Specify SvelteKit form enhancement mechanics in `02-02`: likely `use:enhance` for `saveExpense` so the amount resets immediately, the bottom sheet opens from the returned expense, and validation/server errors can be shown without navigation.

- Define save failure UX:
  - restore or keep amount if save fails
  - re-enable category buttons
  - show a compact error message
  - do not open note sheet unless expense creation succeeded.

- Add tests for:
  - WIB "today" includes `00:00:00+07:00` and excludes next midnight
  - duplicate `client_id` behavior
  - edit/delete authorization assumptions if testable locally
  - empty note to `null`
  - amount cap and `000` behavior.

- For `/expenses`, consider a simple initial limit such as 100 plus a future pagination note. If intentionally unlimited for MVP, document that as a known Phase 2 tradeoff.

- Ensure closed bottom sheet is non-interactive and inaccessible to tab/screen-reader navigation until opened.

- In UAT, add explicit checks for:
  - failed network/server validation behavior
  - refresh after save does not duplicate
  - editing an expense from today updates the home list after returning
  - deleting from edit removes it from both home and history.

### Risk Assessment

**Overall risk: MEDIUM.**

The plans are directionally strong and should achieve the Phase 2 user goals if implemented carefully. The risk is not scope or architecture; it is mostly in interaction correctness: idempotent saving, SvelteKit action handling, optimistic UI state, and authorization boundaries. Tightening those areas before execution would reduce the chance of subtle production bugs while keeping the phase appropriately small.

---

## Cycle 1 Consensus Summary

Only one external reviewer was invoked this cycle (Codex). Claude Code is the executing runtime and was excluded per the independence rule (`SELF_CLI=claude`). Other CLIs (Gemini, OpenCode, Qwen, Cursor) are not installed.

### Agreed Strengths (Cycle 1)

- Wave-0-first sequencing (formatters → schemas → shared component → test scaffolds) eliminates scavenger-hunt risk before feature plans execute.
- Security pattern of sourcing `household_id` from `locals` (not form data) is correctly identified and pinned with a grep acceptance criterion.
- Soft delete over physical delete — correctly aligned with Phase 3 offline-queue idempotency story.
- WIB timezone handling is explicit and tested via round-trip formatter tests.
- Human UAT plan (02-04) covers real-device behaviors that jsdom cannot simulate.

### Agreed Concerns (Cycle 1)

1. **(HIGH) Duplicate-save via client_id timing gap** — The current plan regenerates `client_id` after each successful save, which is correct. However, the plan does not explicitly cover what happens if the same `client_id` arrives twice at the server (e.g., network retry). The `client_id uuid UNIQUE` constraint in the DB provides a hard backstop, but the server action currently returns a 500 on the conflict rather than an idempotent success. This is partially deferred to Phase 3 INPUT-11 (`ON CONFLICT DO NOTHING`), but the plan should note the gap and ensure the 500 error surfaces correctly to the client rather than being silently swallowed. **Partially mitigated; server-side idempotency (ON CONFLICT) is explicitly deferred to Phase 3 with a note.**

2. **(HIGH) saveNote / saveEdit / deleteExpense horizontal privilege escalation risk** — RLS policies (`expenses_creator_update`) are in place from Phase 1. However, the plan comment in 02-02 acknowledges that `saveNote` relies solely on RLS for creator-scoping and a tampered `expense_id` would silently affect 0 rows. This is acceptable for v1 per the plan but should be called out explicitly in the human UAT gate so the reviewer can verify it via Supabase SQL. **Partially mitigated by RLS; explicit v1 acceptance documented in threat register.**

3. **(HIGH) Edit/delete route authorization clarity** — The edit load query filters by `eq('id', params.id) + eq('is_deleted', false)` but not by `household_id`. RLS provides the household-scope guarantee. The plan should explicitly state this reliance to prevent regressions if RLS policy names change. **Accepted as-is; RLS is tested in Phase 1 — cross-phase regression risk is low but exists.**

### Divergent Views (Cycle 1)

N/A — Single reviewer this cycle.

### Reviewer Notes for /gsd-plan-phase --reviews (Cycle 1)

When incorporating this review, the planner should consider:

1. Add an explicit note in 02-02-PLAN.md that `client_id` is kept stable for the duration of the in-flight request (it already is — `crypto.randomUUID()` runs at mount and is reset only on success). The note should clarify the retry behavior: a second category tap on the same session after a network error will reuse the same `client_id`, hitting the UNIQUE constraint. For Phase 2 this surfaces as a 500 → error toast; for Phase 3 it should become `ON CONFLICT DO NOTHING`.

2. Consider adding a household_id filter to `saveNote` update query as application-layer defence-in-depth, even though RLS covers it.

3. The 02-04-PLAN.md UAT block D step 14 (Supabase SQL verification of soft delete) already covers the most critical security check. Consider adding: log an expense, refresh the page, confirm no duplicate appears (validates idempotency story).
