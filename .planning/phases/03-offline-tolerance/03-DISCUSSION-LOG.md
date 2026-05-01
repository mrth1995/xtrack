# Phase 03: Offline Tolerance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-01
**Phase:** 03-offline-tolerance
**Areas discussed:** Offline Save Experience, Queued Item Editing, Sync Status Visibility, Failure and Retry Behavior, Local Queue Storage Detail, Conflict with Server State, Offline Testing Expectations, Network Detection Behavior

---

## Offline Save Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Same as normal save, with subtle queued status | Amount resets, expense appears immediately, row shows a small queued state until synced | yes |
| Show an offline banner before/after save | Save locally and show a visible offline message | |
| Stronger interruption | Keep amount on screen and confirm offline save before adding to list | |

**User's choice:** Same as normal save, with subtle queued status.
**Notes:** Note sheet remains available; notes are queued with the expense. No upfront offline warning when opening the app offline.

---

## Queued Item Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Editable and deletable while queued | Queued expenses behave like normal list items | yes |
| Editable, but delete waits until synced | Corrections allowed, deletion delayed | |
| Locked until synced | Queued rows cannot be opened for edit/delete until synced | |

**User's choice:** Editable and deletable while queued.
**Notes:** Lock edit/delete only during the short `syncing` state. Deleting a never-synced row removes it immediately. Date edits move the row to the correct list immediately.

---

## Sync Status Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Small per-row status only when not synced | Normal rows unchanged; unsynced rows show compact status | yes |
| Global sync indicator plus failed row labels | Page-level count plus row failure labels | |
| Hide queued/syncing unless failed | Only failed rows show visible state | |

**User's choice:** Small per-row status only when not synced.
**Notes:** Labels are `Waiting`, `Saving`, and `Couldn't sync`. Failed rows get warning/destructive styling. Today and full history use the same status pattern.

---

## Failure and Retry Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Mark it Couldn't sync and keep it editable/deletable | Preserve the local row and allow recovery | yes |
| Keep retrying quietly forever | Hide repeated failures from user | |
| Delete it after repeated failures | Avoid stuck rows but lose data | |

**User's choice:** Mark it `Couldn't sync` and keep it editable/deletable.
**Notes:** Failed rows retry automatically and expose a manual Retry action. Editing a failed row requeues it. Stuck `syncing` recovery quietly returns the row to `Waiting`.

---

## Local Queue Storage Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Current expense payload only | Store latest payload plus status/timestamps/retry metadata | yes |
| Expense plus local edit history | Keep every local change before sync | |
| Full audit-style queue log | Store create/edit/delete operations as events | |

**User's choice:** Current expense payload only.
**Notes:** Local records are keyed by `client_id` until Supabase returns an `id`.

---

## Conflict with Server State

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the row local as Couldn't sync and ask user to sign in/check household | Preserve data and surface recovery | yes |
| Keep retrying until auth/session recovers | Can loop forever for real authorization problems | |
| Move it to a separate blocked state | More precise but adds another status | |

**User's choice:** Keep the row local as `Couldn't sync`.
**Notes:** Pause automatic flush until a valid session exists. If household context no longer matches, do not sync into a different household.

---

## Offline Testing Expectations

| Option | Description | Selected |
|--------|-------------|----------|
| Unit/integration tests plus browser-level offline flow | Automated queue tests plus real Quick Add offline/online simulation | yes |
| Unit/integration tests only | Faster but weaker for browser/network events | |
| Manual UAT only | Good confidence but weak regression coverage | |

**User's choice:** Unit/integration tests plus browser-level offline flow.
**Notes:** Browser simulation is enough for Phase 03. Required flow: offline save -> visible `Waiting` row -> online flush -> status disappears without duplicate.

---

## Network Detection Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Try server when browser says online; queue on failure or offline | Use browser state plus request failures | yes |
| Always save locally first, then sync in background | More robust but changes normal save behavior | |
| Only queue when browser says offline | Simple but misses flaky connections | |

**User's choice:** Try server when browser says online; queue on failure or offline.
**Notes:** Flush on `online`, foreground resume, and app open/session-ready. On app start, queued items flush immediately after session and household are ready.

---

## the agent's Discretion

- IndexedDB wrapper/library shape, queue module boundaries, status placement, and conservative retry timing are implementation choices for research/planning.

## Deferred Ideas

None.
