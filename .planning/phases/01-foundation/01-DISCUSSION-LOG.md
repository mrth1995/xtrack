# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 1-Foundation
**Areas discussed:** Household onboarding flow, Join household flow, Auth screen flow, Invite code handling, Post-setup signed-in screen, Install guidance banner

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

---

## Auth screen flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single combined auth screen | One screen with a toggle or switch between `Log in` and `Sign up`. | ✓ |
| Separate login and sign-up screens | Distinct screens for each flow. | |
| Login-first screen | Default to login, with sign-up as a secondary path. | |
| Other | User-defined auth entry flow. | |

**User's choice:** Single combined auth screen
**Notes:** Auth should stay compact rather than split across multiple screens.

| Option | Description | Selected |
|--------|-------------|----------|
| Email + password only | Ask only for email and password. | ✓ |
| Email + password + confirm password | Add an explicit confirmation field. | |
| Small signup form | Include one or two more fields during sign-up. | |
| Other | User-defined signup fields. | |

**User's choice:** Email + password only
**Notes:** Sign-up should be as lean as the rest of the Phase 1 flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Go straight to household onboarding | Create the session and immediately continue into the create-or-join household flow. | ✓ |
| Show auth success first | Show a brief account-created success state before continuing. | |
| Return to login mode | Create the account, then ask the user to log in explicitly. | |
| Other | User-defined post-sign-up flow. | |

**User's choice:** Go straight to household onboarding
**Notes:** Successful sign-up should feel continuous and not bounce through an extra checkpoint.

| Option | Description | Selected |
|--------|-------------|----------|
| Simple account/menu affordance | Put logout in a small account or overflow menu in the temporary signed-in shell. | ✓ |
| Visible button on the main shell | Show logout as an always-visible action. | |
| Only on auth screen fallback | Do not expose it prominently in-app. | |
| Other | User-defined logout location. | |

**User's choice:** Simple account/menu affordance
**Notes:** Phase 1 needs a real logout path without giving it center-stage.

| Option | Description | Selected |
|--------|-------------|----------|
| Log in by default | Open in login mode, with a clear switch to sign up. | ✓ |
| Neutral chooser first | Start with no default mode selected. | |
| Sign up by default | Open in sign-up mode, with login as the secondary path. | |
| Other | User-defined default state. | |

**User's choice:** Log in by default
**Notes:** Returning users should be optimized first.

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error on the same screen | Show a clear message near the form and let the user retry immediately. | ✓ |
| Top banner error | Show a dismissible banner at the top. | |
| Generic failure message only | Keep the message broad and minimal. | |
| Other | User-defined error behavior. | |

**User's choice:** Inline error on the same screen
**Notes:** Auth errors should stay local and recoverable.

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs or segmented switch | Both modes are visible as peer options at the top. | ✓ |
| Primary form + text link | Show the current form, with a smaller text link to switch modes. | |
| Button-style mode switcher | Use larger explicit buttons to swap modes. | |
| Other | User-defined mode switch pattern. | |

**User's choice:** Tabs or segmented switch
**Notes:** Login and sign-up should feel like peer states on one screen.

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden by default with show/hide toggle | Standard password field with an eye toggle. | ✓ |
| Always hidden | No reveal toggle. | |
| Visible while typing, then hidden | A more guided but less standard behavior. | |
| Other | User-defined password behavior. | |

**User's choice:** Hidden by default with show/hide toggle
**Notes:** Use a conventional password pattern.

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal utility copy | Just a short title and concise helper text. | |
| Light product explanation | Include a brief line about shared household expense tracking. | |
| More guided onboarding copy | Add a fuller explanation of what the app does and what happens after sign-up. | ✓ |
| Other | User-defined copy approach. | |

**User's choice:** More guided onboarding copy
**Notes:** The auth screen should orient the user, not just present fields.

---

## Invite code handling

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated invite step right away | Immediately show a focused screen/card with the invite code and sharing actions. | |
| Inline on the post-setup shell | Show the code inside the temporary signed-in shell. | |
| Optional reveal | Do not show it immediately; let the user open an invite section when they want it. | ✓ |
| Other | User-defined creator-side invite flow. | |

**User's choice:** Optional reveal
**Notes:** Invite should remain available but not forced immediately after creation.

| Option | Description | Selected |
|--------|-------------|----------|
| Clearly visible secondary action | Do not force invite, but make `Invite partner` obvious on the next screen. | |
| Inside menu or settings | Keep the main shell cleaner and tuck invite behind a smaller menu path. | ✓ |
| Subtle link only | Show a light text link, but keep focus elsewhere. | |
| Other | User-defined visibility. | |

**User's choice:** Inside menu or settings
**Notes:** Invite is a management action, not part of the main shell.

| Option | Description | Selected |
|--------|-------------|----------|
| Show current active code if one exists | If there is still a valid unused code, show it; otherwise generate a new one. | ✓ |
| Always generate a new code | Opening invite always creates a fresh code and invalidates the old one. | |
| Ask before generating | Let the user choose whether to reuse or make a new code. | |
| Other | User-defined generation behavior. | |

**User's choice:** Show current active code if one exists
**Notes:** Avoid unnecessary code churn.

| Option | Description | Selected |
|--------|-------------|----------|
| Copy code first | Make copying the code the main action; sharing can be secondary. | ✓ |
| System share first | Use the native share sheet as the main action. | |
| Equal copy and share actions | Present both as peer actions. | |
| Other | User-defined sharing behavior. | |

**User's choice:** Copy code first
**Notes:** Keep the primary action simple and reliable across platforms.

| Option | Description | Selected |
|--------|-------------|----------|
| Show status and offer regenerate | Clearly show that the old code is no longer usable and provide a `Generate new code` action. | |
| Auto-regenerate immediately | Replace it with a new code automatically when the invite area opens. | ✓ |
| Hide old code and show empty state | Do not show the old code at all; just say there is no active invite. | |
| Other | User-defined expired-code behavior. | |

**User's choice:** Auto-regenerate immediately
**Notes:** Opening the invite area should roll forward to a usable code without extra recovery steps.

| Option | Description | Selected |
|--------|-------------|----------|
| Show explicit expiry time | Display that the code expires in 24 hours, ideally with exact or relative time. | ✓ |
| Show simple active status only | Just indicate that the code is active. | |
| No expiry info | Do not mention expiry unless it has already expired. | |
| Other | User-defined expiry visibility. | |

**User's choice:** Show explicit expiry time
**Notes:** The creator should understand the 24-hour validity clearly.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, via regenerate action | Show the current code, but also allow generating a new one on purpose. | |
| No, lock to current active code | Prevent replacement while the current code is still valid. | ✓ |
| Only after confirmation | Allow regeneration, but require an explicit confirm step. | |
| Other | User-defined replacement behavior. | |

**User's choice:** No, lock to current active code
**Notes:** There should be only one active invite path at a time.

| Option | Description | Selected |
|--------|-------------|----------|
| Joined status, no active code | Show that the partner joined successfully and there is no longer an active invite. | |
| Return to neutral invite state | Do not mention the successful join. | |
| Show joined status with member details | Confirm that someone joined and include a bit more context. | ✓ |
| Other | User-defined post-join invite state. | |

**User's choice:** Show joined status with member details
**Notes:** The creator should get a meaningful acknowledgement after the invite is used.

| Option | Description | Selected |
|--------|-------------|----------|
| Basic member identity | Show a simple confirmation like the joined person’s email or display name. | ✓ |
| Member + joined time | Show who joined and when they joined. | |
| Richer household summary | Show the joined member plus a little more household status/context. | |
| Other | User-defined detail level. | |

**User's choice:** Basic member identity
**Notes:** Keep the confirmation simple rather than expanding into a bigger summary.

---

## Post-setup signed-in screen

| Option | Description | Selected |
|--------|-------------|----------|
| Household connected status | Make it clear the user is signed in and connected to a household, with a simple success-oriented shell. | ✓ |
| Early expense stream preview | Show the shared expense area even if mostly empty in Phase 1. | |
| Setup completion hub | Treat it like a lightweight checklist or completion screen. | |
| Other | User-defined main screen role. | |

**User's choice:** Household connected status
**Notes:** Phase 1 should prove the household connection, not preview Quick Add.

| Option | Description | Selected |
|--------|-------------|----------|
| Very minimal | Show signed-in state, household identity, member info/status, and a few essential actions only. | |
| Moderately informative | Include a bit more explanatory copy and status detail. | |
| Richer shell | Add more sections so it feels closer to a full home screen. | ✓ |
| Other | User-defined content amount. | |

**User's choice:** Richer shell
**Notes:** The shell should feel real, not skeletal.

| Option | Description | Selected |
|--------|-------------|----------|
| Household overview blocks | More structure around household name, member list/status, invite status, and setup state. | ✓ |
| Roadmap-style next steps | Explain what the user can do now and what’s coming next. | |
| Soft preview cards | Show placeholder-style cards hinting at future areas like expenses. | |
| Other | User-defined richer-shell content. | |

**User's choice:** Household overview blocks
**Notes:** The shell should be grounded in current capability, not future previews.

| Option | Description | Selected |
|--------|-------------|----------|
| Invite partner | Make it the most prominent action. | |
| Manage account | Keep the shell focused on account/session controls first. | |
| View household details | Prioritize inspection over action. | ✓ |
| Other | User-defined primary action. | |

**User's choice:** View household details
**Notes:** The shell should lean toward household understanding rather than action-first workflows.

| Option | Description | Selected |
|--------|-------------|----------|
| Member list and roles/status | Focus on who is in the household and their current join state. | |
| Household identity details | Focus on household name, invite state, and basic metadata. | |
| Combined household summary | Show both member status and household identity together. | ✓ |
| Other | User-defined details emphasis. | |

**User's choice:** Combined household summary
**Notes:** Member and household identity should be presented together, not split.

| Option | Description | Selected |
|--------|-------------|----------|
| Show invite status only | Surface whether there is an active invite and its high-level state. | |
| Expose full invite controls here | Let the shell directly manage the invite code. | |
| Keep invite completely out of the shell | Do not mention invite state on the main signed-in screen. | ✓ |
| Other | User-defined shell invite treatment. | |

**User's choice:** Keep invite completely out of the shell
**Notes:** Invite management stays behind menu/settings rather than entering the main shell.

---

## Install guidance banner

| Option | Description | Selected |
|--------|-------------|----------|
| After auth or setup context is clear | Do not interrupt immediately on first paint; show it once the user has enough context. | ✓ |
| Immediately on first visit | Show the guidance right away as soon as the app loads in Safari. | |
| Only after successful sign-in | Hold the banner until the user is authenticated. | |
| Other | User-defined trigger. | |

**User's choice:** After auth or setup context is clear
**Notes:** The banner should not appear cold on first paint.

| Option | Description | Selected |
|--------|-------------|----------|
| After successful auth | Show it once the user is signed in, even if household setup is not finished yet. | ✓ |
| After household setup completes | Wait until the user has created or joined a household. | |
| After the first useful screen is visible | Show it once the user has reached a meaningful in-app screen, whether signed-in or not. | |
| Other | User-defined trigger point. | |

**User's choice:** After successful auth
**Notes:** Auth completion is enough context for the banner to make sense.

| Option | Description | Selected |
|--------|-------------|----------|
| Snooze and show again later | Hide it for a while, then allow it to reappear on a later Safari visit. | ✓ |
| Dismiss permanently in browser | Once closed in Safari, do not show it again on that browser/device. | |
| Hide only for this session | It can come back on the next visit right away. | |
| Other | User-defined dismissal behavior. | |

**User's choice:** Snooze and show again later
**Notes:** Dismissal should be patient, not permanent or overly aggressive.

| Option | Description | Selected |
|--------|-------------|----------|
| Next meaningful Safari visit | Bring it back on a later visit after some time has passed, not immediately on the next screen change. | ✓ |
| Next app open | Show it again the very next time the user opens the app in Safari. | |
| Only after repeated non-install use | Wait until the user has used the app several more times without installing. | |
| Other | User-defined reappearance rule. | |

**User's choice:** Next meaningful Safari visit
**Notes:** The banner should not bounce back too quickly.

| Option | Description | Selected |
|--------|-------------|----------|
| Non-blocking banner/card | Visible and clear, but does not interrupt use. | ✓ |
| Modal-style guidance | More forceful, requiring dismissal before continuing. | |
| Small inline tip | Keep it very light and easy to ignore. | |
| Other | User-defined presentation. | |

**User's choice:** Non-blocking banner/card
**Notes:** Installation guidance should remain supportive, not blocking.

| Option | Description | Selected |
|--------|-------------|----------|
| Direct install instruction | Focus on the concrete Safari path: `Tap Share, then Add to Home Screen`. | ✓ |
| Benefit-first message | Lead with why installing helps, then include the Safari instruction. | |
| Two-step balanced message | Show both the benefit and the exact install instruction with equal weight. | |
| Other | User-defined message approach. | |

**User's choice:** Direct install instruction
**Notes:** The banner should be practical and action-led.

| Option | Description | Selected |
|--------|-------------|----------|
| Never show there | Suppress the banner entirely once the app is opened from the Home Screen. | ✓ |
| Show fallback help only if needed | Normally hide it, but allow a rare fallback message in special cases. | |
| Keep showing in some form | Still surface install-related messaging even after install. | |
| Other | User-defined installed-app behavior. | |

**User's choice:** Never show there
**Notes:** Installed standalone usage should never see install guidance again.

## the agent's Discretion

- Exact visual hierarchy, typography, and component styling across auth, onboarding, and household-status screens remain open.
- RLS policy structure, schema naming, migration structure, and keep-alive cron implementation remain open as long as Phase 1 requirements are satisfied.

## Deferred Ideas

None.
