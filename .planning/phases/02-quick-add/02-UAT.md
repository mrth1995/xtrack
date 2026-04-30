---
status: testing
phase: 02-quick-add
source:
  - .planning/phases/02-quick-add/02-01-SUMMARY.md
  - .planning/phases/02-quick-add/02-02-SUMMARY.md
  - .planning/phases/02-quick-add/02-03-SUMMARY.md
started: 2026-04-30T14:25:14Z
updated: 2026-04-30T14:30:19Z
---

## Current Test

number: 7
name: Full History Navigation And Grouping
expected: |
  Tapping View all history navigates to /expenses. The page shows non-deleted household expenses grouped by WIB date, newest first, and each row links to its edit page.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server, start the app from scratch, open http://localhost:5173/, and the app boots without server errors. Unauthenticated users redirect to /auth; authenticated users can reach the Quick Add home screen.
result: pass

### 2. Quick Add Home Is First Screen
expected: After login, / shows the Quick Add experience immediately: install guidance if eligible, gear icon, large 0 amount display, 12-key numpad, 7 category tiles, Today list, and View all history link. There is no intermediate household dashboard before the numpad.
result: pass

### 3. Numpad Formats IDR Amounts Without System Keyboard
expected: Tapping 5, 4, 0, 0, 0 on the custom numpad updates the amount display as 5, 54, 540, 5.400, 54.000, and no device system keyboard opens because the numpad uses buttons rather than a number input.
result: pass

### 4. Category Save Opens Note Sheet
expected: With a non-zero amount entered, tapping a category saves one expense, resets the amount to 0, adds the expense to Today's list, and slides up the note sheet showing the saved category and formatted amount.
result: pass

### 5. Debounce Prevents Duplicate Saves
expected: Rapidly tapping or double-tapping a category during save creates only one expense row in Today's list. The app does not show duplicate rows for the same save attempt.
result: pass

### 6. Note Sheet Save And Skip
expected: Saving a note updates the corresponding Today row with that note and closes the sheet. Skipping closes the sheet without adding a note, and reloading does not re-prompt for a skipped note.
result: pass

### 7. Full History Navigation And Grouping
expected: Tapping View all history navigates to /expenses. The page shows non-deleted household expenses grouped by WIB date, newest first, and each row links to its edit page.
result: [pending]

### 8. Edit Expense Fields Persist
expected: On /expenses/{id}/edit, the form shows editable amount, category, note, and date fields. Changing them and saving redirects back to /expenses, where the updated amount/category/note/date are visible.
result: [pending]

### 9. Delete Expense Is Soft And Hidden From Lists
expected: The edit page requires a two-step delete confirmation. After confirming delete, the app redirects to / and the expense disappears from both Today's list and /expenses history.
result: [pending]

### 10. Gear Menu Navigation And Logout
expected: The gear menu opens from the Quick Add home screen and contains Invite member, Household details, and Log out. Invite member opens /settings/invite, Household details opens /household, and Log out signs the user out.
result: [pending]

### 11. Edge Cases And Idempotency Checks
expected: Zero amount category taps do nothing, the amount display refuses values above 99.999.999, a current-time expense appears in Today using WIB boundaries, duplicate client_id recovery works without duplicate list rows, and note/edit/delete updates are guarded against stale or deleted expenses.
result: [pending]

## Summary

total: 11
passed: 6
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

[none yet]
