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

### the agent's Discretion
- Invite code presentation, copy/share affordances, regeneration, and expiry messaging can follow standard mobile PWA patterns unless discussed later.
- The temporary signed-in shell after successful household setup can stay minimal as long as it proves auth state and household linkage without leaking into Phase 2 Quick Add scope.
- Install guidance banner trigger and dismissal behavior remain open for later clarification in this phase if needed.

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

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-25*
