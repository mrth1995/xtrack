---
phase: 2
reviewers: [codex]
reviewed_at: 2026-04-27T00:00:00Z
plans_reviewed:
  - 02-01-PLAN.md
  - 02-02-PLAN.md
  - 02-03-PLAN.md
  - 02-04-PLAN.md
runtime_note: "Claude Code (self) skipped per SELF_CLI=claude rule. Gemini, OpenCode, Qwen, Cursor not installed."
---

# Cross-AI Plan Review — Phase 2: Quick Add

## Codex Review

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

## Consensus Summary

Only one external reviewer was invoked this cycle (Codex). Claude Code is the executing runtime and was excluded per the independence rule (`SELF_CLI=claude`). Other CLIs (Gemini, OpenCode, Qwen, Cursor) are not installed.

### Agreed Strengths (from Codex)

- Wave-0-first sequencing (formatters → schemas → shared component → test scaffolds) eliminates scavenger-hunt risk before feature plans execute.
- Security pattern of sourcing `household_id` from `locals` (not form data) is correctly identified and pinned with a grep acceptance criterion.
- Soft delete over physical delete — correctly aligned with Phase 3 offline-queue idempotency story.
- WIB timezone handling is explicit and tested via round-trip formatter tests.
- Human UAT plan (02-04) covers real-device behaviors that jsdom cannot simulate.

### Agreed Concerns (highest priority)

1. **(HIGH) Duplicate-save via client_id timing gap** — The current plan regenerates `client_id` after each successful save, which is correct. However, the plan does not explicitly cover what happens if the same `client_id` arrives twice at the server (e.g., network retry). The `client_id uuid UNIQUE` constraint in the DB provides a hard backstop, but the server action currently returns a 500 on the conflict rather than an idempotent success. This is partially deferred to Phase 3 INPUT-11 (`ON CONFLICT DO NOTHING`), but the plan should note the gap and ensure the 500 error surfaces correctly to the client rather than being silently swallowed. **Partially mitigated; server-side idempotency (ON CONFLICT) is explicitly deferred to Phase 3 with a note.**

2. **(HIGH) saveNote / saveEdit / deleteExpense horizontal privilege escalation risk** — RLS policies (`expenses_creator_update`) are in place from Phase 1. However, the plan comment in 02-02 acknowledges that `saveNote` relies solely on RLS for creator-scoping and a tampered `expense_id` would silently affect 0 rows. This is acceptable for v1 per the plan but should be called out explicitly in the human UAT gate so the reviewer can verify it via Supabase SQL. **Partially mitigated by RLS; explicit v1 acceptance documented in threat register.**

3. **(HIGH) Edit/delete route authorization clarity** — The edit load query filters by `eq('id', params.id) + eq('is_deleted', false)` but not by `household_id`. RLS provides the household-scope guarantee. The plan should explicitly state this reliance to prevent regressions if RLS policy names change. **Accepted as-is; RLS is tested in Phase 1 — cross-phase regression risk is low but exists.**

### Divergent Views

N/A — Single reviewer this cycle.

### Reviewer Notes for /gsd-plan-phase --reviews

When incorporating this review, the planner should consider:

1. Add an explicit note in 02-02-PLAN.md that `client_id` is kept stable for the duration of the in-flight request (it already is — `crypto.randomUUID()` runs at mount and is reset only on success). The note should clarify the retry behavior: a second category tap on the same session after a network error will reuse the same `client_id`, hitting the UNIQUE constraint. For Phase 2 this surfaces as a 500 → error toast; for Phase 3 it should become `ON CONFLICT DO NOTHING`.

2. Consider adding a household_id filter to `saveNote` update query as application-layer defence-in-depth, even though RLS covers it.

3. The 02-04-PLAN.md UAT block D step 14 (Supabase SQL verification of soft delete) already covers the most critical security check. Consider adding: log an expense, refresh the page, confirm no duplicate appears (validates idempotency story).
