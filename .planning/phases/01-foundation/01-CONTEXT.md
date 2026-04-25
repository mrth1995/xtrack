# Phase 1: Foundation - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the secure Phase 1 foundation for xtrack: email/password auth, household creation and joining, RLS-safe shared data model setup, Supabase keep-alive, and first-visit Safari install guidance. This phase proves account access and shared household setup on a mobile-first PWA without building the Phase 2 Quick Add experience yet.

</domain>

<decisions>
## Implementation Decisions

### Household onboarding flow
- **D-01:** After sign-up or first sign-in without a household, show a choice screen with `Create household` and `Join with code`.
- **D-02:** The two onboarding actions have equal visual weight. Neither create nor join is the default primary path.
- **D-03:** Choosing `Create household` goes directly to a minimal create-household form with no explainer step.
- **D-04:** The create-household form asks for household name only.

### Join household flow
- **D-05:** Choosing `Join with code` opens a single-purpose join screen dedicated to code entry.
- **D-06:** Invite codes use a standard text input with manual entry and paste support. Do not use segmented OTP-style inputs.
- **D-07:** Validate the invite code only when the user submits the join action, not while typing.
- **D-08:** If the code is valid, show a confirmation step with the household name only before the user joins.
- **D-09:** If the code is invalid, expired, or already used, stay on the same screen and show a clear inline error with immediate retry.
- **D-10:** After a successful join, show a brief success state, then continue into the signed-in app.
- **D-11:** The join screen includes a clear secondary action to switch to creating a household instead.

### Auth screen flow
- **D-12:** Use a single combined auth screen rather than separate login and sign-up screens.
- **D-13:** The combined auth screen defaults to `Log in`.
- **D-14:** Users switch between `Log in` and `Sign up` via tabs or a segmented switch.
- **D-15:** Sign-up asks for email and password only.
- **D-16:** After successful sign-up, create the session and continue straight into household onboarding.
- **D-17:** Password fields are hidden by default and include a standard show/hide toggle.
- **D-18:** Auth failures stay on the same screen and show a clear inline error with immediate retry.
- **D-19:** The auth screen should include guided onboarding copy, not just terse utility text.

### Invite code handling
- **D-20:** Invite code access is optional after household creation, not a forced dedicated step.
- **D-21:** The invite entry point lives inside a menu or settings path rather than on the main signed-in shell.
- **D-22:** Opening the invite area shows the current active code if one exists; otherwise it should generate a new usable code.
- **D-23:** `Copy code` is the primary share action.
- **D-24:** Show explicit expiry information for the active invite code.
- **D-25:** If the prior code is expired or already used, opening the invite area should auto-generate a new code.
- **D-26:** If there is already an active unused code, the creator cannot manually replace it.
- **D-27:** After the invite is used successfully, the creator sees joined status with basic member identity.

### Post-setup signed-in screen
- **D-28:** After create or join completes, the Phase 1 signed-in shell should primarily communicate household-connected status.
- **D-29:** The shell should be richer than a bare success screen, using household overview blocks rather than future-feature previews.
- **D-30:** The easiest-to-reach action from the shell is `View household details`.
- **D-31:** The household details view should combine member status and household identity in one summary.
- **D-32:** Invite state and invite management stay out of the main signed-in shell.

### Install guidance banner
- **D-33:** The Safari install guidance should not appear on first paint. Show it only after the user has enough context.
- **D-34:** “Enough context” means after successful auth.
- **D-35:** The install guidance is a non-blocking banner or card, not a modal.
- **D-36:** Dismissing the banner snoozes it rather than permanently hiding it.
- **D-37:** After snooze, it can reappear on a later meaningful Safari visit.
- **D-38:** The banner copy should focus on direct install instruction: `Tap Share, then Add to Home Screen`.
- **D-39:** Never show install guidance when the app is already opened from the Home Screen in standalone mode.

### the agent's Discretion
- Exact visual hierarchy, typography, and component styling across auth, onboarding, and household-status screens can follow standard mobile-first PWA patterns.
- RLS policy structure, schema names, and Supabase migration organization remain planner and implementer choices as long as household isolation is enforced from the first migration.
- Keep-alive cron implementation details remain open as long as it satisfies `INFRA-01`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, dependency order, and scope boundary.
- `.planning/REQUIREMENTS.md` — Locked requirement IDs for Phase 1: `AUTH-01` to `AUTH-04`, `HOUSE-01` to `HOUSE-04`, `INFRA-01`, and `PWA-02`.

### Project constraints
- `.planning/PROJECT.md` — Product context, locked stack, household model, auth constraints, and PWA/iOS priorities.
- `.planning/STATE.md` — Current phase focus plus already-locked foundation decisions: email/password only auth, IndexedDB session persistence, RLS from first migration, and confirmed stack.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet. The repository is still planning-only and has no application scaffold.

### Established Patterns
- No code-level patterns exist yet. Phase 1 implementation will establish the initial SvelteKit, Supabase, auth, and mobile-PWA conventions for later phases.

### Integration Points
- New code will create the first app scaffold, auth flow, household data model, database policies, and initial signed-in shell that later phases build on.

</code_context>

<specifics>
## Specific Ideas

- Keep the first-run household setup lean and decisive rather than explanatory.
- Joining a household should feel safe and reversible: confirm the target household before joining, but avoid extra friction in code entry.
- Success states should be brief and confidence-building, not full-featured onboarding tours.
- The signed-in Phase 1 shell should feel like a real household status surface, not a placeholder and not an early Quick Add screen.
- Auth should still have guided framing copy even though the fields and transitions stay minimal.
- Install guidance should be practical and action-led, not promotional.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-25*
