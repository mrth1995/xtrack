---
phase: 2
reviewers: [codex]
reviewed_at: 2026-04-28T11:22:40Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md
runtime_note: "Cycle 4. Claude Code (self) skipped per SELF_CLI=claude rule. Gemini, OpenCode, Qwen, Cursor not installed."
---

# Cross-AI Plan Review — Phase 2: Quick Add

---

## Cycle 4 (2026-04-28) — Post-Cycle-3-Replan Review

> **Context:** This is the fourth review cycle. Cycle 3 found 1 HIGH and 4 MEDIUM concerns; the plans were updated to address all 6 items. Codex re-reviews the Cycle 4 state to verify convergence.

---

## Codex Review (Cycle 4)

### Summary

Cycle 4 is mostly converged. All six Cycle 3 concerns are addressed in the updated plan text and embedded code samples. I would not block on the original Cycle 3 items anymore, but I found a few new consistency and implementation risks that should be cleaned up before execution.

### Cycle 3 Resolution Verification

1. **FULLY RESOLVED: Duplicate recovery UI hole** — `02-02-PLAN.md` now uses `todayExpenses.some((e) => e.id === inserted.id)` before prepending, and explicitly avoids using `duplicate: true` as the sole guard.

2. **FULLY RESOLVED: `formatDisplayDate` WIB timezone not pinned** — `formatDisplayDate` now includes `timeZone: 'Asia/Jakarta'`, and the formatter test includes the `2026-04-26T22:30:00Z` → `27 Apr` cross-midnight case.

3. **FULLY RESOLVED: `saveNote` missing `is_deleted=false` filter** — The planned update chain is `.eq('id', expense_id).eq('is_deleted', false)`, with tests updated for the second chained `eq`.

4. **FULLY RESOLVED: P04 UAT saveNote instruction stale** — Step 14 now expects `fail(404)` / error toast, not silent success.

5. **FULLY RESOLVED: Duplicate-save UAT step unreliable** — `quick-add.test.ts` now includes a deterministic mocked `23505` path test.

6. **FULLY RESOLVED: Hardcoded `#D4C9B8` in component files** — The plan extracts `--color-pressed` into `src/app.css`, and component/edit page checks require `var(--color-pressed)` with zero hardcoded hex literals.

### New Concerns

- **HIGH: Hidden form submission may race Svelte state updates.** In `02-02-PLAN.md`, `onCategoryTap` assigns `pendingCategory` / `pendingAmount` and immediately calls `saveFormRef?.requestSubmit()` on lines 1038-1045. `onSaveNote` does the same with `pendingNote` on lines 1057-1064. Since DOM updates from state changes may not be flushed before `requestSubmit()`, the hidden inputs can submit stale values. Add `import { tick } from 'svelte'`, make these handlers `async`, and `await tick()` before `requestSubmit()`, or avoid DOM-bound hidden state by constructing/submitting current values directly.

- **MEDIUM: Duplicate recovery fetch can return a soft-deleted row.** The `23505` recovery fetch filters by `client_id` and `household_id`, but not `is_deleted=false` (`02-02-PLAN.md` lines 794-799). A rare stale retry after deletion could return a deleted expense and reinsert it into the visible client list. Add `.eq('is_deleted', false)` to the recovery fetch or explicitly handle deleted duplicates as a non-display success/error.

- **LOW: UAT validation-failure instruction contradicts empty-amount behavior.** Step 20 says tapping a category with amount `0` should do nothing (`02-04-PLAN.md` lines 193-194), but Step 21 says submitting amount `0` by tapping a category should show an error toast (line 202). The implementation returns early on zero amount, so Step 21 should be removed or rewritten as a unit/server-action validation check.

- **LOW: Acceptance grep for `is_deleted` count is internally inconsistent.** `02-02-PLAN.md` line 901 expects `grep -c "is_deleted', false"` to return `1`, but the same acceptance block later expects at least `2` for load + saveNote on line 909. The exact-count check should be changed to `at least 2` or scoped to the specific query.

### Suggestions

- Add `await tick()` before both hidden-form submissions (`onCategoryTap` and `onSaveNote`), add `is_deleted=false` to duplicate recovery fetch, and clean up the two stale/contradictory verification lines. These are small plan edits but prevent execution churn.

### Risk Assessment

**Overall risk: MEDIUM.** The Cycle 3 concerns are resolved, but the hidden-form state flush race is execution-critical because it can break the primary quick-add save path despite tests passing if mocks do not model DOM timing.

---

## Cycle 4 Consensus Summary

Single reviewer invoked (Codex). Claude Code is the executing runtime and was excluded per the independence rule (`SELF_CLI=claude`). Other CLIs (Gemini, OpenCode, Qwen, Cursor) are not installed.

### Agreed Strengths (Cycle 4)

- All six Cycle 3 concerns are fully resolved: idempotency-safe duplicate recovery UI, WIB-pinned `formatDisplayDate`, `saveNote` `is_deleted=false` guard, stale P04 UAT step corrected, deterministic 23505 unit test added, CSS token extraction completed.
- Plan convergence is strong: server-side correctness, security patterns, and test scaffolding are all solid.

### Agreed Concerns (Cycle 4)

1. **(HIGH) Svelte state/DOM race in `onCategoryTap` and `onSaveNote`.** Both handlers assign `$state` variables and immediately call `requestSubmit()` without `await tick()`, risking stale hidden input values being submitted. **Status: NEW — not raised in prior cycles.**

2. **(MEDIUM) Duplicate recovery fetch missing `is_deleted=false` filter.** The `23505` path recovery `select` in `saveExpense` does not guard against returning a soft-deleted row, which would reinsert a deleted expense into the visible client list. **Status: NEW.**

3. **(LOW) UAT steps 20/21 contradiction on zero-amount behavior.** Step 20 says zero amount does nothing; Step 21 implies an error toast. **Status: NEW.**

4. **(LOW) Grep count inconsistency in 02-02 acceptance criteria.** Line 901 expects count `1`; line 909 expects `at least 2` for the same file/pattern. **Status: NEW.**

### Divergent Views

N/A — Single reviewer all cycles.

### Reviewer Notes for /gsd-plan-phase --reviews (Cycle 4)

1. **Svelte tick() before requestSubmit() (HIGH):** In `02-02-PLAN.md`, update `onCategoryTap` and `onSaveNote` to be `async` functions that `await tick()` (imported from `'svelte'`) before calling `saveFormRef?.requestSubmit()` / `noteFormRef?.requestSubmit()`. This ensures Svelte flushes state to DOM (hidden inputs) before the form is submitted.

2. **Recovery fetch `is_deleted=false` (MEDIUM):** In `02-02-PLAN.md` `saveExpense` `23505` recovery block, add `.eq('is_deleted', false)` to the `select` query filtering by `client_id` + `household_id`. If no non-deleted row is found, either return a clear error or proceed to the generic 500 path rather than reinserting a deleted expense.

3. **UAT step 21 correction (LOW):** In `02-04-PLAN.md`, either remove Step 21 (since zero amount returns early client-side before any server call) or rewrite it as a unit test assertion rather than a manual UAT step.

4. **Grep count fix (LOW):** In `02-02-PLAN.md` acceptance criteria, change the `grep -c "is_deleted', false"` expected count from `1` to `at least 2` (or use `grep -c` with `>= 2` wording) to match the actual number of occurrences after the `saveNote` fix.

---

## Cycle 3 (2026-04-28) — Post-Cycle-2-Replan Review

> **Context:** This is the third review cycle. Cycle 2 found 1 HIGH and 2 PARTIALLY RESOLVED HIGHs after the first replan. The plans were updated again before this cycle. Codex re-reviews the Cycle 3 state.

---

## Codex Review (Cycle 3)

### Summary

The Cycle 3 plans are substantially stronger than the prior review state. The three Cycle 2 items are mostly addressed: `23505` duplicate handling is now planned at the server boundary, `saveNote` now checks exact update count and returns `fail(404)`, and `saveEdit`/`deleteExpense` now include `.eq('is_deleted', false)`. Overall, the phase plan should achieve the Quick Add goal, but there are still a few correctness gaps around idempotent UI reconciliation, WIB date display consistency, and UAT checks that do not match the updated behavior.

### Strengths

- Clear dependency structure: P01 foundation feeds P02/P03, and P04 gates the whole phase.
- Good use of shared contracts: formatters, schemas, `ExpenseList`, and category constants reduce drift.
- Server-side validation is explicit with Zod and keeps `household_id`/`created_by` sourced from `locals`.
- The `23505` duplicate path is a real improvement over pure client debounce.
- Edit/delete stale soft-delete protection is now explicitly planned with `.eq('is_deleted', false)`.
- P04 correctly recognizes that iOS keyboard suppression, tap behavior, and bottom-sheet animation need human/device verification.

### Concerns

- **HIGH: Duplicate recovery UI has a client-side hole.** When `duplicate: true` is returned by `saveExpense`, the `use:enhance` handler in `+page.svelte` always skips prepending to the today list under the assumption the original save was already visible. In a real network retry case, the first insert may have succeeded server-side but the client never received the success response (e.g., network timeout). The recovered expense would not appear in the today list until a reload, leaving the user confused about whether their expense was saved.

- **MEDIUM: `formatDisplayDate` does not pin `timeZone: 'Asia/Jakarta'`.** The project locks WIB for all display and date logic, but the `formatDisplayDate` formatter in 02-01-PLAN.md uses the runtime/browser timezone. History grouping uses WIB keys (via `toDateInputValue` which correctly pins WIB), while the date labels rendered by `formatDisplayDate` may reflect the browser's local timezone — creating off-by-one labels near UTC day boundaries for users outside WIB (or server-side render).

- **MEDIUM: `saveNote` update does not filter `is_deleted=false`.** The update in 02-02-PLAN.md filters only by `expense_id`. RLS `expenses_creator_update` blocks cross-user writes, but a creator could still update the note on their own soft-deleted expense unless RLS explicitly blocks that state. The 0-rows defense catches many cases but not the case where the row IS accessible (creator-owned soft-deleted row).

- **MEDIUM: P04 UAT has a stale saveNote verification instruction.** 02-04-PLAN.md step 14 still says cross-user `saveNote` should "silently return success" — but the current plan correctly returns `fail(404)` on 0 rows. This mismatch in the acceptance script could produce false approval (verifier expects silent success, gets a 404 error, declares a failure that isn't really a failure).

- **MEDIUM: Duplicate-save UAT step is not a reliable test of `23505`.** After a normal success, `client_id` is regenerated and `amountStr` resets, so "tap another category rapidly" does not reliably exercise the `23505` path. The UAT needs a deterministic path (e.g., a controlled duplicate submission with the same hidden `client_id` value, or a test mock that forces the duplicate response).

- **LOW: `/expenses` history has no limit or pagination.** Explicitly accepted as a known tradeoff, but mobile performance will degrade for long-lived households. Should be documented as a Phase 3+ candidate.

- **LOW: Hardcoded `#D4C9B8` hex in category tile pressed/selected styles.** Both `CategoryGrid.svelte` and the edit page's category grid use `background: '#D4C9B8'` for the selected/pressed state, violating the project rule to use CSS custom properties only (no hex literals).

### Suggestions

- Change duplicate recovery in `use:enhance` to "prepend if not already present" rather than "never prepend when duplicate":
  ```
  if (!todayExpenses.some((e) => e.id === inserted.id)) {
    todayExpenses = [inserted, ...todayExpenses];
  }
  ```
  This handles the network-retry case where the client missed the original success response.

- Add `timeZone: 'Asia/Jakarta'` to `formatDisplayDate` in `formatters.ts`, and add a test for a UTC timestamp that crosses the WIB date boundary (same test file as the `toDateInputValue` WIB tests).

- Add `.eq('is_deleted', false)` to the `saveNote` UPDATE query in `+page.server.ts` to prevent note writes to soft-deleted expenses.

- Update P04's saveNote RLS UAT instruction (step 14) to expect a controlled 404/error response, not "silent success", when targeting a tampered or cross-user expense_id.

- Replace the duplicate-save manual UAT step with a deterministic test: reuse the same `client_id` value in a direct action test call and assert the `{ success: true, duplicate: true }` response, plus assert no duplicate row appears in the today list.

- Add an explicit comment or acceptance note in 02-03-PLAN.md that the `/expenses` history has no pagination by design (MVP), with a Phase 3+ candidate note.

- Extract the `#D4C9B8` hex value to a CSS custom property (e.g., `--color-pressed`) to comply with the project's CSS token rule.

### Risk Assessment

**Overall risk: MEDIUM.**

The major Cycle 2 server-side risks are largely resolved — duplicate insert handling, saveNote privilege escalation, and edit/delete soft-delete guards. The remaining risks are narrower: duplicate recovery is not fully robust on the client side (network-retry gap), WIB date display is not consistently pinned in `formatDisplayDate`, and some P04 UAT instructions are stale enough to produce false approval or missed verification. Fixing these would move the plan close to LOW risk for Phase 2 MVP execution.

---

## Cycle 3 Consensus Summary

Single reviewer invoked (Codex). Claude Code is the executing runtime and was excluded per the independence rule (`SELF_CLI=claude`). Other CLIs (Gemini, OpenCode, Qwen, Cursor) are not installed.

### Agreed Strengths (Cycle 3)

- Cycle 2's three HIGH/PARTIALLY-RESOLVED concerns are addressed at the server layer: `23505` duplicate recovery, `saveNote` 0-rows `fail(404)`, and `saveEdit`/`deleteExpense` update-side `is_deleted=false` filter.
- Shared component and utility contracts (formatters, schemas, ExpenseList) prevent implementation drift between P02 and P03.
- Security-critical patterns consistently enforced: `household_id` from `locals`, RLS as backstop, Zod validation on all action inputs.
- Wave-0-first sequencing with RED test scaffolds remains intact and correct.
- P04 human UAT gate correctly identifies behaviors that cannot be verified in jsdom.

### Agreed Concerns (Cycle 3)

1. **(HIGH) Duplicate recovery UI hole — network retry case.** The `use:enhance` handler skips prepending when `duplicate: true`, assuming the original expense is already visible. A network timeout before the first success response would leave the recovered expense invisible until reload. **Status: NEW — not raised in prior cycles.**

2. **(MEDIUM) `formatDisplayDate` timezone not pinned to WIB.** History date labels may show incorrect dates for users/environments not in UTC+7. **Status: NEW.**

3. **(MEDIUM) `saveNote` missing `is_deleted=false` filter.** The update can write to a creator's own soft-deleted row (RLS doesn't block same-creator writes). **Status: NEW.**

4. **(MEDIUM) P04 UAT saveNote instruction is stale** — expects silent success where the implementation returns `fail(404)`. **Status: NEW.**

5. **(MEDIUM) Duplicate-save UAT step is unreliable** — the normal post-save flow regenerates `client_id`, so rapid taps don't exercise `23505`. **Status: NEW.**

### Divergent Views

N/A — Single reviewer all cycles.

### Reviewer Notes for /gsd-plan-phase --reviews (Cycle 3)

1. **Duplicate recovery UI (HIGH):** In `+page.svelte` `use:enhance`, replace the `duplicate: true` branch with an idempotency-safe prepend: check `todayExpenses.some((e) => e.id === inserted.id)` before prepending. This makes duplicate recovery work correctly for both the double-tap case (already visible, no-op) and the network-retry case (not yet visible, prepend).

2. **`formatDisplayDate` timezone:** Add `timeZone: 'Asia/Jakarta'` to the `toLocaleDateString` call in `formatters.ts`. Update `formatters.test.ts` to include a cross-midnight UTC/WIB test for `formatDisplayDate`.

3. **`saveNote` `is_deleted=false` guard:** Add `.eq('is_deleted', false)` to the `saveNote` UPDATE chain in `+page.server.ts`, matching the pattern already used in `saveEdit` and `deleteExpense`.

4. **P04 UAT step 14 correction:** Update the saveNote privilege escalation instruction to say: cross-user `saveNote` should return a 404/error response (not silent success), because the implementation now has the 0-rows defense. The verifier should look for the error toast, not absence of note change.

5. **Duplicate-save UAT determinism:** Add a unit test (or update `quick-add.test.ts`) that exercises the `23505` path directly: mock the Supabase `insert` to return `code: '23505'`, mock the subsequent `select` to return the existing row, and assert the action returns `{ success: true, duplicate: true, expense }`.

6. **CSS token for pressed state:** Extract `#D4C9B8` to `--color-pressed` in `app.css` and reference it in `CategoryGrid.svelte` and the edit page category grid.

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
