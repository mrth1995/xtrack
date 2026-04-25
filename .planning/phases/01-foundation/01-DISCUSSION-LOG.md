# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 1-Foundation
**Areas discussed:** Household onboarding flow, Join household flow

---

## Household onboarding flow

| Option | Description | Selected |
|--------|-------------|----------|
| Choice screen | Show two clear actions right away: `Create household` or `Join with code`. | ✓ |
| Create-first | Default them into creating a household, with a secondary link or button for joining instead. | |
| Join-first | Default them into entering an invite code, with a secondary link or button for creating instead. | |
| Other | User-defined flow. | |

**User's choice:** Choice screen
**Notes:** The first signed-in moment for users without a household should start with a neutral decision point rather than presuming create or join.

| Option | Description | Selected |
|--------|-------------|----------|
| Equal buttons | `Create household` and `Join with code` get the same visual weight. | ✓ |
| Create emphasized | Both are shown, but `Create household` is primary and `Join with code` is secondary. | |
| Join emphasized | Both are shown, but `Join with code` is primary and `Create household` is secondary. | |
| Other | User-defined hierarchy. | |

**User's choice:** Equal buttons
**Notes:** Neither onboarding path should be treated as the default.

| Option | Description | Selected |
|--------|-------------|----------|
| Instant create form | Go straight into a simple create-household form with the minimum required fields. | ✓ |
| One-tap create | Create immediately with defaults, then show invite/share afterward. | |
| Explain first | Show a short explainer about what a household is before creation. | |
| Other | User-defined create flow. | |

**User's choice:** Instant create form
**Notes:** The create path should stay direct and skip extra explanatory steps.

| Option | Description | Selected |
|--------|-------------|----------|
| Name only | Ask only for a household name, then create it. | ✓ |
| No form details | Create with defaults and allow rename later. | |
| Small setup form | Ask for household name plus one or two setup details now. | |
| Other | User-defined minimum fields. | |

**User's choice:** Name only
**Notes:** The create flow should collect the minimum possible information in Phase 1.

---

## Join household flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single code screen | Go straight to one simple screen with the invite code input and join action. | ✓ |
| Join explainer first | Show a short explanation before revealing the code entry screen. | |
| Paste-first flow | Open with a focused code-entry UI optimized for pasted or auto-filled codes. | |
| Other | User-defined join entry flow. | |

**User's choice:** Single code screen
**Notes:** The invited-user path should begin with one focused join screen.

| Option | Description | Selected |
|--------|-------------|----------|
| Manual entry with paste support | A normal input field where the user can type or paste the code. | ✓ |
| Segmented code boxes | Show the code as separate character boxes for guided entry. | |
| Paste-focused | Optimize primarily for pasted or shared codes, with manual typing still possible. | |
| Other | User-defined input style. | |

**User's choice:** Manual entry with paste support
**Notes:** The code field should stay simple and not use OTP-style segmented inputs.

| Option | Description | Selected |
|--------|-------------|----------|
| Show confirmation first | Show the household name and ask the user to confirm joining. | ✓ |
| Join immediately | Submit the code and join right away with no confirmation step. | |
| Preview with details | Show the household name plus a little more context before confirming. | |
| Other | User-defined success flow. | |

**User's choice:** Show confirmation first
**Notes:** The user wants a short confirmation step before joining.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error on same screen | Stay on the same screen, show a clear error message, and let the user retry immediately. | ✓ |
| Full error state | Replace the screen with a dedicated error state and a retry path. | |
| Contact sharer message | Show a stronger message telling the user to ask the creator for a new code. | |
| Other | User-defined error behavior. | |

**User's choice:** Inline error on same screen
**Notes:** Recovery should be immediate and low-friction for invalid, expired, or already-used codes.

| Option | Description | Selected |
|--------|-------------|----------|
| Success then continue | Show a brief success state, then continue into the signed-in app. | ✓ |
| Go straight in | Immediately land in the app with no intermediate success screen. | |
| Success with next steps | Show success plus a little guidance before continuing. | |
| Other | User-defined post-join behavior. | |

**User's choice:** Success then continue
**Notes:** A short confidence-building completion moment is preferred after joining.

| Option | Description | Selected |
|--------|-------------|----------|
| Switch to create | Show a clear secondary action to go create a household instead. | ✓ |
| Back only | Let them go back, but do not show a direct create option on this screen. | |
| No escape hatch | Keep the screen focused on joining only. | |
| Other | User-defined fallback. | |

**User's choice:** Switch to create
**Notes:** Users who arrive without a code should have a direct path to creation.

| Option | Description | Selected |
|--------|-------------|----------|
| Name only | Show just the household name and a confirm button. | ✓ |
| Name + inviter context | Show the household name plus who invited them, if available. | |
| More preview details | Show the household name and a little more context before joining. | |
| Other | User-defined confirmation details. | |

**User's choice:** Name only
**Notes:** The confirmation step should stay sparse and not reveal extra household details.

| Option | Description | Selected |
|--------|-------------|----------|
| On submit only | Validate when the user taps the join action, keeping the form simple. | ✓ |
| As soon as length looks complete | Auto-check once the code appears complete, then still let the user confirm. | |
| Live while typing | Continuously validate as the user types. | |
| Other | User-defined validation behavior. | |

**User's choice:** On submit only
**Notes:** Validation should not fire during typing.

## the agent's Discretion

- Invite code display, share affordances, regeneration, and expiry messaging are still open.
- The post-setup signed-in shell is still open.
- The Safari install guidance banner behavior is still open.

## Deferred Ideas

None.
