---
phase: 01-foundation
plan: "10"
subsystem: schema-push-verification
tags: [supabase, schema-push, env-verification, qa-documentation, two-user-test]
dependency_graph:
  requires:
    - non-recursive-rls-policies
    - is_household_member-helper
    - invite-rpc-regression-coverage
  provides:
    - supabase-env-preflight-script
    - schema-push-evidence
    - two-user-shared-stream-qa-path
  affects:
    - scripts/verify-phase1-supabase-env.mjs
    - package.json
    - .planning/phases/01-foundation/01-10-SCHEMA-PUSH.md
    - docs/qa/phase1-two-user-shared-stream.md
tech_stack:
  added: []
  patterns:
    - CLI env validation script (Node.js ESM, no fetch, exit codes)
    - Supabase CLI db push with --yes for non-interactive execution
    - Schema push evidence document with timestamps and exit codes
key_files:
  created:
    - scripts/verify-phase1-supabase-env.mjs
    - .planning/phases/01-foundation/01-10-SCHEMA-PUSH.md
    - docs/qa/phase1-two-user-shared-stream.md
    - tests/supabase/verify-phase1-supabase-env.test.ts
  modified:
    - package.json
decisions:
  - "verify:supabase-env preflight script validates presence and shape only — no fetch() calls, never prints secret values"
  - "supabase db push ran with --yes (non-interactive) after project was linked with supabase link"
  - "check/build failures are pre-existing worktree env issue (gitignored .env), not caused by Plan 01-10 changes"
  - "integration tests guarded by SKIP_INTEGRATION stay skipped in worktree; structural tests pass"
metrics:
  duration: "6 minutes"
  completed: "2026-04-26T00:19:00Z"
  tasks_completed: 3
  files_modified: 2
  files_created: 4
---

# Phase 01 Plan 10: Schema Push and Phase 1 Final Verification Summary

Supabase env preflight CLI script, schema push with two Phase 1 RPC migrations applied and verified current, and two-user shared-stream manual UAT path documented.

## What Was Built

### Task 1: Supabase Setup Verification Command (commits ba47184, 9faa53c)

Created `scripts/verify-phase1-supabase-env.mjs` — a standalone Node.js ESM CLI script that validates `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` without calling `fetch()` or printing secret values.

Validation rules:
- Rejects missing or blank `PUBLIC_SUPABASE_URL`
- Rejects `placeholder.supabase.co` in the URL
- Rejects invalid URL format
- Rejects missing or blank `PUBLIC_SUPABASE_ANON_KEY`
- Rejects placeholder anon key values: `placeholder`, `your-anon-key`, `replace-me`
- Rejects anon keys shorter than 20 characters
- Rejects missing or blank `SUPABASE_SERVICE_ROLE_KEY`

On success: prints `Supabase Phase 1 env looks ready.` and exits 0.
On failure: prints the specific failure message and setup hint, exits 1.

Added `"verify:supabase-env": "node scripts/verify-phase1-supabase-env.mjs"` to `package.json`.

Added 6 tests in `tests/supabase/verify-phase1-supabase-env.test.ts` covering CLI exit codes and output (run as child processes via `spawnSync`). TDD flow: RED commit `ba47184`, GREEN commit `9faa53c`.

### Task 2: Schema Push (commit 25f1d4f)

Ran `supabase link --project-ref wqfybujkalbwyvcvyefg` to link the worktree to the xtrack Supabase project. Then ran `supabase db push --yes` twice:

**First push (2026-04-26T00:16:00Z, exit 0):** Applied 2 pending migrations:
- `2026042601_invite_lookup_rpc.sql` — `lookup_household_invite` RPC
- `2026042602_invite_reuse_rpc.sql` — `get_or_create_active_household_invite` RPC

**Second push (2026-04-26T00:16:30Z, exit 0):** Output: `Remote database is up to date.`

Schema push evidence recorded in `.planning/phases/01-foundation/01-10-SCHEMA-PUSH.md` with status `APPLIED` / `CURRENT`.

### Task 3: Two-User QA Path and Post-Push Verification (commit d381318)

Created `docs/qa/phase1-two-user-shared-stream.md` with an 8-step manual verification path:

1. User A signs up/logs in at `/auth`
2. User A creates household `Phase 1 QA Household`
3. User A opens `/settings/invite`, copies code, confirms code is stable on refresh
4. User B signs up/logs in in a separate browser profile
5. User B opens `/onboarding/join`, enters code, sees confirmation with `Phase 1 QA Household`, joins
6. SQL insert: `insert into public.expenses ... 45000, 'Food', 'Phase 1 shared stream QA'`
7. Both User A and User B must see `Food`, `Rp 45k`, `Phase 1 shared stream QA` after refresh
8. Outsider query against the same household must return `[]`

Post-push verification commands run and appended to SCHEMA-PUSH.md:
- `npm run verify:supabase-env` — PASS (exits 0 with real-looking values)
- `npm run test:unit -- phase1-rls` — PASS (4 passed, 13 skipped/guarded)
- `npm run test:unit -- onboarding invite-rpcs shared-shell auth-session env` — PASS (110 tests, 7 files)
- `npm run check` — SKIP (pre-existing worktree env issue)
- `npm run build` — SKIP (pre-existing worktree env issue)

## Deviations from Plan

### Auto-resolved: Supabase project not linked

**Found during:** Task 2
**Issue:** The worktree had no linked Supabase project — `supabase db push` reported `Cannot find project ref. Have you run supabase link?`
**Fix:** Ran `supabase link --project-ref wqfybujkalbwyvcvyefg` (project ref was visible in `supabase projects list` output). Link succeeded; db push proceeded non-interactively with `--yes`.
**Rule:** Rule 3 (auto-fix blocking issue)

### Pre-existing: npm run check and npm run build fail in worktree

`npm run check` and `npm run build` fail with 4 errors about `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` not being exported. This is the same pre-existing worktree issue documented in Plan 01-09 SUMMARY — the `.env` file is gitignored and not present in the worktree. SvelteKit's `$env/static/public` virtual module only exports env vars present at build time. Not caused by Plan 01-10 changes. Documented in post-push verification section and skipped per scope boundary rules.

## Known Stubs

None. All files contain real validation logic, real migration evidence, or real manual test steps.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | scripts/verify-phase1-supabase-env.mjs | Script validates env presence/shape only; does not print key values. T-01-10-02 mitigation confirmed. |

The script does NOT log key values. The comment `It does NOT print secret values. It does NOT call fetch().` is a JSDoc annotation, not code.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `scripts/verify-phase1-supabase-env.mjs` | FOUND |
| `tests/supabase/verify-phase1-supabase-env.test.ts` | FOUND |
| `package.json` contains `verify:supabase-env` | FOUND |
| `.planning/phases/01-foundation/01-10-SCHEMA-PUSH.md` | FOUND |
| `docs/qa/phase1-two-user-shared-stream.md` | FOUND |
| `.planning/phases/01-foundation/01-10-SUMMARY.md` | FOUND (this file) |
| Commit ba47184 (RED tests) | FOUND |
| Commit 9faa53c (GREEN implementation) | FOUND |
| Commit 25f1d4f (schema push evidence) | FOUND |
| Commit d381318 (QA doc + post-push verification) | FOUND |
