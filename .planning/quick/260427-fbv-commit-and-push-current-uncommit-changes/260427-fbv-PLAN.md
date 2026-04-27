---
phase: quick-260427-fbv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/(auth)/auth/+page.svelte
  - .planning/phases/01-foundation/01-UAT.md
  - .planning/phases/01-foundation/01-VERIFICATION.md
autonomous: true
requirements:
  - QUICK-260427-fbv
must_haves:
  truths:
    - "The auth show/hide-password fix is committed under a fix() commit message"
    - "Phase 01 UAT and VERIFICATION sign-off updates are committed under a docs() commit message"
    - "All commits are pushed to origin/main and working tree is clean"
  artifacts:
    - path: "src/routes/(auth)/auth/+page.svelte"
      provides: "Bug fix preserving email value across show/hide password toggle"
      contains: "bind:value={emailValue}"
    - path: ".planning/phases/01-foundation/01-UAT.md"
      provides: "Phase 01 UAT closed as complete (11/11 pass)"
    - path: ".planning/phases/01-foundation/01-VERIFICATION.md"
      provides: "Phase 01 verification fully confirmed (9/9 truths)"
  key_links:
    - from: "local main"
      to: "origin/main"
      via: "git push"
      pattern: "Your branch is up to date with 'origin/main'"
---

<objective>
Commit the three uncommitted working-tree changes as two semantically-grouped commits and push to origin/main.

Purpose: Persist the Phase 01 closeout (UAT + VERIFICATION sign-off) and the auth-page email-preservation bug fix so the working tree is clean and `origin/main` reflects current local state.

Output: Two new commits on `main` pushed to `origin/main`; `git status` reports a clean tree.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Current uncommitted changes (verified via git status at plan time):
#   modified:   .planning/phases/01-foundation/01-UAT.md
#   modified:   .planning/phases/01-foundation/01-VERIFICATION.md
#   modified:   src/routes/(auth)/auth/+page.svelte
#
# Recent commit-message style (from `git log --oneline -5`):
#   fix(rls+auth): fix RLS recursion and plumb supabase client through locals
#   docs(quick-260427-dz6): commit and push the current uncommitted changes ...
#   docs(260427-dz6): pre-dispatch plan for commit and push the current uncommitted changes
#   docs(phase-01): evolve PROJECT.md after phase completion
#   docs(phase-01): complete phase execution
#
# Convention: type(scope): subject — scope uses short identifier (e.g. "phase-01", "rls+auth", "quick-260427-xxx")
</context>

<tasks>

<task type="auto">
  <name>Task 1: Commit the auth email-preservation bug fix</name>
  <files>src/routes/(auth)/auth/+page.svelte</files>
  <action>
Stage ONLY `src/routes/(auth)/auth/+page.svelte` (do NOT use `git add -A` or `git add .` — the planning markdown changes belong to a separate commit).

Run:
```
git add src/routes/\(auth\)/auth/+page.svelte
git commit -m "$(cat <<'EOF'
fix(auth): preserve email value when toggling show/hide password

Replaces `value={prefillEmail}` with `bind:value={emailValue}` plus an
`$effect` to sync from `prefillEmail`, so the email field no longer
clears when the user toggles the show/hide-password control.
EOF
)"
```

Do NOT amend. Do NOT use `--no-verify`. If a pre-commit hook fails, diagnose and fix the underlying issue, then re-stage and create a NEW commit (do not amend).
  </action>
  <verify>
    <automated>git log -1 --name-only --pretty=format:'%s' | grep -E '^fix\(auth\):' && git log -1 --name-only --pretty=format:'' | grep -F 'src/routes/(auth)/auth/+page.svelte'</automated>
  </verify>
  <done>HEAD commit subject starts with `fix(auth):`, touches exactly `src/routes/(auth)/auth/+page.svelte`, and the two planning markdown files remain unstaged/modified.</done>
</task>

<task type="auto">
  <name>Task 2: Commit the Phase 01 UAT + VERIFICATION sign-off</name>
  <files>.planning/phases/01-foundation/01-UAT.md, .planning/phases/01-foundation/01-VERIFICATION.md</files>
  <action>
Stage ONLY the two Phase 01 planning markdown files.

Run:
```
git add .planning/phases/01-foundation/01-UAT.md .planning/phases/01-foundation/01-VERIFICATION.md
git commit -m "$(cat <<'EOF'
docs(phase-01): close UAT and VERIFICATION sign-off

UAT: 11/11 pass — all 5 diagnosed issues marked resolved.
VERIFICATION: 9/9 truths confirmed; all 3 human verification items
confirmed on 2026-04-27.
EOF
)"
```

Do NOT amend. Do NOT use `--no-verify`. If the pre-commit hook fails, fix the issue and create a NEW commit.
  </action>
  <verify>
    <automated>git log -1 --name-only --pretty=format:'%s' | grep -E '^docs\(phase-01\):' && git log -1 --name-only --pretty=format:'' | grep -F '.planning/phases/01-foundation/01-UAT.md' && git log -1 --name-only --pretty=format:'' | grep -F '.planning/phases/01-foundation/01-VERIFICATION.md'</automated>
  </verify>
  <done>HEAD commit subject starts with `docs(phase-01):` and touches exactly the two Phase 01 planning markdown files. `git status` reports working tree clean.</done>
</task>

<task type="auto">
  <name>Task 3: Push both commits to origin/main</name>
  <files>(no working-tree files; updates remote ref origin/main)</files>
  <action>
Push the two new local commits to `origin/main`. This is a fast-forward push to `main` — DO NOT use `--force` or `--force-with-lease`.

Run:
```
git push origin main
```

If the push is rejected because the remote has advanced, STOP and surface the conflict to the user (do NOT force-push to main per Git Safety Protocol). Otherwise confirm success with `git status`.
  </action>
  <verify>
    <automated>git fetch origin main --quiet && test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" && git status --porcelain | wc -l | tr -d ' ' | grep -E '^0$'</automated>
  </verify>
  <done>`HEAD` equals `origin/main`, working tree is clean (no porcelain output), and both new commits (`fix(auth): ...` and `docs(phase-01): ...`) are visible in `git log origin/main`.</done>
</task>

</tasks>

<verification>
End-of-plan checks (run all):

1. `git status` → reports "nothing to commit, working tree clean".
2. `git log --oneline -3` → top two entries are the new `fix(auth): ...` and `docs(phase-01): ...` commits in either order, both authored locally.
3. `git rev-parse HEAD` == `git rev-parse origin/main` → local main matches remote.
4. `git show HEAD~1 --stat` and `git show HEAD --stat` → between them, exactly the three originally-modified files appear, each in the correct semantic commit (auth fix file in `fix(auth)`, two markdown files in `docs(phase-01)`).
</verification>

<success_criteria>
- Two new commits exist on local `main`: one `fix(auth): preserve email value when toggling show/hide password`, one `docs(phase-01): close UAT and VERIFICATION sign-off`.
- `git status` is clean.
- `origin/main` has been updated via fast-forward push and matches local `HEAD`.
- No use of `--amend`, `--force`, `--force-with-lease`, or `--no-verify`.
- The auth bug-fix file and the planning markdown files were never co-mingled in a single commit.
</success_criteria>

<output>
After completion, create `.planning/quick/260427-fbv-commit-and-push-current-uncommit-changes/260427-fbv-SUMMARY.md` recording: the two commit SHAs, the push result, and confirmation that the working tree is clean.
</output>
