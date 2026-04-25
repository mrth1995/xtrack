---
status: complete
completed_at: 2026-04-25T16:25:58.827Z
---

# Quick Task 260425-wjn Follow-up Summary

## Outcome

Hardened the household resolution path in `hooks.server.ts` by switching from a direct `household_members` table read to the `current_household_id()` SQL helper. This makes the post-onboarding redirect depend on the same server-side helper the schema already defines, instead of on a direct RLS-scoped membership query.

## Files Changed

- `src/hooks.server.ts`
- `tests/auth/hooks.server.test.ts`

## Verification

- `npm run test:unit -- hooks.server`
- `npm run check`

## Notes

- This follow-up builds on the prior redirect-control-flow fix. The symptom persisted because the household lookup path itself still depended on a direct membership query.

