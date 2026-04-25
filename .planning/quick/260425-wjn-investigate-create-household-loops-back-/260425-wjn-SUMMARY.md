---
status: complete
completed_at: 2026-04-25T16:25:58.827Z
---

# Quick Task 260425-wjn Summary

## Outcome

Fixed the onboarding loop caused by server handlers calling `redirect(...)` without `throw`. After successful household creation, SvelteKit now actually exits the action and navigates to `/`, instead of leaving the user in the onboarding flow.

## Files Changed

- `src/routes/(app)/onboarding/+page.server.ts`
- `src/routes/(app)/onboarding/create/+page.server.ts`
- `src/routes/(app)/onboarding/join/+page.server.ts`
- `src/routes/(app)/settings/invite/+page.server.ts`
- `tests/households/onboarding-routes.test.ts`

## Verification

- `npm run test:unit -- onboarding-routes`
- `npm run check`

## Notes

- The root bug was framework-level control flow, not the household RPC itself.
- Existing unrelated worktree changes were preserved.

