# Phase 03 Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Out-of-scope verification blocker | `npm run check` fails in `src/routes/(app)/+page.svelte` because `SavedExpense` lacks required `client_id` when prepending into `todayExpenses`; this appears to be from prior 03-02 work and was not modified in 03-03 per execution constraints. | Open | 03-03 |
