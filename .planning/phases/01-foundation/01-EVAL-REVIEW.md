# EVAL-REVIEW — Phase 1: Foundation

**Audit Date:** 2026-04-26
**AI-SPEC Present:** No
**Overall Score:** 46/100
**Verdict:** SIGNIFICANT GAPS

## Caveat

No `AI-SPEC.md` exists for Phase 1, and Phase 1 is a conventional SvelteKit/Supabase foundation phase rather than an implemented AI system. This audit therefore uses the general evaluation framework from `ai-evals.md` and adapts it to Phase 1's actual scope: deterministic product checks, auth/session behavior, household authorization, invite safety, operational monitoring, and deployment-time regression gates.

Because there is no planned AI eval strategy, no AI-specific rubrics, LLM judges, reference dataset, prompt eval tooling, or tracing requirements could be audited against a phase contract.

## Dimension Coverage

| Dimension | Status | Measurement | Finding |
|-----------|--------|-------------|---------|
| Deterministic regression coverage | COVERED | Code | Vitest is configured and `npm run test:unit` passes with 103 tests passed and 10 skipped. Coverage includes smoke rendering, auth/session helpers, auth server actions, hooks, onboarding services/routes, shared shell, and database structural checks. |
| Auth and session task completion | COVERED | Code | Auth validators, login/signup/logout contracts, standalone session restoration, request guard behavior, and unauthenticated redirects are covered by `tests/auth/auth-session.test.ts`, `tests/auth/hooks.server.test.ts`, and `tests/auth/auth-page.server.test.ts`. |
| Household onboarding and invite UX behavior | COVERED | Code | Create/join validation, invite lookup, expired/used/revoked error paths, active invite reuse, route redirects, and install guidance gates are covered by household and shared-shell test files. |
| Database authorization and RLS safety | PARTIAL | Code | Migration contains RLS enablement, policies, invite TTL constraints, `FOR UPDATE` locking, and idempotency constraints. However, the live Supabase verification path is skipped when `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is absent, and Plan 01-02 explicitly did not run `supabase db push`. |
| Operational reliability monitoring | PARTIAL | Code / Human | Supabase keep-alive workflow and runbook exist, and the script exits non-zero on failures. This monitors one infrastructure risk only; there is no broader app health check, deployment verification, or sampled production quality loop. |
| CI/CD regression execution | MISSING | Code | The only GitHub Actions workflow is Supabase keep-alive. No CI workflow runs `npm run check`, `npm run test:unit`, or database/RLS verification on pull requests or pushes. |

**Coverage Score:** 3/6 (50%)

## Infrastructure Audit

| Component | Status | Finding |
|-----------|--------|---------|
| Eval tooling (Vitest) | Configured | Vitest is installed, configured, and actually called by `npm run test:unit`. No AI eval tooling such as Promptfoo, Braintrust, RAGAS, LangSmith, Langfuse, or Phoenix is present, which is acceptable only because this phase has no AI-SPEC or AI subsystem. |
| Reference dataset | Partial | `supabase/seed.sql` and test fixtures provide a small reference set for household/RLS/invite behavior, but there is no AI eval dataset and the DB fixtures are not exercised unless live Supabase credentials are available. |
| CI/CD integration | Missing | `.github/workflows/supabase-keepalive.yml` exists, but no workflow runs typecheck, unit tests, or integration/RLS tests. |
| Online guardrails | Partial | Auth route guards, server-side validation, SQL RPC helpers, RLS policies, invite TTL, and single-use invite logic are implemented in request/database paths. Coverage remains partial because live RLS verification and schema application were not completed. |
| Tracing (none) | Not configured | No AI tracing or observability tool is configured. For this non-AI phase, this is not an implementation defect, but it would be mandatory before any future AI call path ships. |

**Infrastructure Score:** 40/100

## Critical Gaps

- **CRITICAL: No CI/CD regression gate.** Phase 1 has meaningful tests, but they are not enforced by GitHub Actions or another CI runner. Regressions can merge without `npm run check` or `npm run test:unit`.
- **CRITICAL: Live database/RLS verification is unresolved.** The highest-risk security behavior depends on Supabase RLS and SQL functions, but `supabase db push` was blocked and the live RLS tests are skipped without credentials.
- **CRITICAL: No AI-SPEC / eval contract for future AI work.** This phase itself is not AI, but the requested audit is an AI eval audit. Future AI phases need explicit rubrics, reference dataset requirements, guardrails, and monitoring/tracing decisions before implementation.

## Remediation Plan

### Must fix before production:

1. Add a CI workflow that runs `npm ci`, `npm run check`, and `npm run test:unit` on pull requests and pushes.
2. Unblock Supabase verification by installing/linking Supabase CLI, applying `supabase db push`, seeding test data, and running `npm run test:unit -- phase1-rls` with `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` configured in a secure environment.
3. Add a protected CI job or documented release gate for RLS verification so skipped integration tests cannot be mistaken for production-ready database security.

### Should fix soon:

1. Split fast unit tests and live integration tests into explicit commands such as `test:unit` and `test:db`, so skipped RLS coverage is visible in developer and CI output.
2. Extend operational monitoring beyond keep-alive with a post-deploy smoke check for auth reachability and the protected app shell.
3. Add a short `docs/ops/release-checklist.md` covering required env vars, Supabase migration state, seed/test strategy, and expected verification commands.

### Nice to have:

1. Add coverage reporting for the auth, household, and server-action layers.
2. Add Playwright smoke coverage for the main auth/onboarding path once the UI stabilizes.
3. When an AI phase is planned, create `AI-SPEC.md` before execution with dimensions, rubrics, 10-20 labeled examples, tooling, tracing, guardrails, and monitoring plan.

## Files Found

Eval/test files discovered:
- `tests/smoke/AppShell.test.svelte`
- `tests/smoke/app-shell.test.ts`
- `tests/auth/auth-session.test.ts`
- `tests/auth/hooks.server.test.ts`
- `tests/auth/auth-page.server.test.ts`
- `tests/households/shared-shell.test.ts`
- `tests/households/onboarding-routes.test.ts`
- `tests/households/onboarding.test.ts`
- `tests/db/phase1-rls.test.ts`

Tracing/observability scan:
- No project Langfuse, LangSmith, Arize, Phoenix, Braintrust, or Promptfoo setup found.
- Grep matched `node_modules/@cloudflare/workers-types/.../index.ts` false positives only.

Eval library imports:
- No project RAGAS, LangSmith, or Braintrust imports found.

Guardrail/security-related files reviewed:
- `src/hooks.server.ts`
- `src/lib/server/households/service.ts`
- `supabase/migrations/2026042501_phase1_foundation.sql`
- `tests/db/phase1-rls.test.ts`

Eval config files and reference datasets:
- No `promptfoo.yaml`, `eval.config.*`, `*.jsonl`, or `evals*.json` files found.
- `supabase/seed.sql` exists as a product/integration fixture, not an AI eval dataset.

Verification run during audit:
- `npm run test:unit`: 8 test files passed, 103 tests passed, 10 skipped.
- `npm run check`: 0 errors, 0 warnings.
