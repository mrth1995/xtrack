# Feature Landscape: xtrack

**Domain:** Mobile expense tracker — Indonesian household, iOS-first PWA
**Researched:** 2026-04-25
**Overall confidence:** HIGH for UX patterns, MEDIUM for IDR-specific conventions, MEDIUM for receipt OCR accuracy

---

## Feature Categories

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| Manual quick-add (numpad → category → save) | Table stakes | Low | The core interaction; 2–3 taps is achievable and expected by users of apps like Monefy |
| Fixed preset categories | Table stakes | Low | Removes setup friction; 7 presets is a solid default |
| IDR currency formatting | Table stakes | Low | Period as thousands separator; "k" and "jt" shortforms for readability |
| Edit and delete logged expenses | Table stakes | Low | Without this, any input mistake causes trust erosion |
| Optional free-text note per expense | Table stakes | Low | Tapping a "Add note" field after save is the standard pattern |
| Category breakdown report (pie/donut) | Table stakes | Medium | Expected in any tracker claiming "see where money goes"; donut preferred on mobile for center-label total |
| Cloud auth + data sync | Table stakes | Medium | Shared household requires a single source of truth; local-only is a dealbreaker for the use case |
| Payday cycle (fixed day of month) | Differentiator | Medium | Standard apps default to calendar month; payday-aligned view is a genuine UX differentiator for salary earners |
| Shared household (invite via link/code) | Differentiator | Medium | SpendingSpace and Shareroo prove demand; separate identities in one household view is the right model |
| Receipt scan (photo → amount + category) | Differentiator | High | Secondary input method; differentiator because most free apps don't offer it |
| Saved expense templates | Differentiator | Low | One-tap re-add of known recurring items; simpler than auto-fire but still feels "smart" |
| PWA installability (iOS Safari "Add to Home Screen") | Table stakes | Low | Without it, the app feels like a website; icon on home screen changes perceived quality |
| Offline-tolerant input | Table stakes | Medium | At a warung (street stall), connection is unreliable; losing a just-entered expense is a critical trust failure |

---

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Voice input | Socially awkward in public; Indonesian ASR quality is inconsistent; adds a third input path that competes with the first two | Receipt scan covers the "hands-full" scenario acceptably |
| Budgets / spending limits / alerts | Turns a tracker into a nag; for v1, "see what happened" is more useful than "you're over budget" | Keep the report read-only; let the user draw their own conclusions |
| Auto-firing recurring expenses | Requires a scheduler/worker and timezone-aware background jobs; introduces phantom entries if the app is offline | Saved templates with one-tap re-add covers 95% of the value |
| Multi-currency | Adds FX rates, symbol display logic, and data model branching for a household that exclusively uses IDR | IDR-only; mention it explicitly so no one wastes time requesting it |
| Trend comparison / timeline / per-person breakdown | Expands the report surface before the core report is validated | Pie/donut for current cycle only; additional views are a later milestone |
| Custom categories / category editing | Adds a settings screen and a database schema concern before categories are even validated | Lock the 7 presets in v1; if "Others" is overused that's validation signal |
| CSV / JSON export | Zero immediate household value; adds a surface to maintain | Log the request; ship in v2 if the user base justifies it |
| Social sharing / public lists | Privacy risk; not relevant for a household tool | Out of scope |

---

## UX Patterns for iOS Fast-Add Flow

### Primary Add Flow (2–3 taps)

The Monefy pattern is the proven benchmark: open app → numpad is the first screen → tap category tile → entry is saved. xtrack should replicate this flow.

**Recommended sequence:**
1. App opens to the Quick Add screen directly (numpad visible, no home/dashboard intermediary)
2. User taps digit keys to build the amount (display formats in real-time with IDR separators)
3. A horizontal scrollable row of category tiles sits below the numpad (icons + labels)
4. Tapping a category tile saves the expense immediately and shows a brief success state (haptic feedback + animation)
5. A small "Add note" link appears in the success state for the minority of expenses that need annotation

**Key principles:**
- The numpad must occupy the majority of screen height; category tiles should be reachable with a thumb without scrolling the numpad off-screen
- Haptic feedback on save is expected on iOS; use `navigator.vibrate()` as progressive enhancement (iOS Safari supports this in PWA context as of iOS 13+)
- Immediate visual confirmation (amount appears in the transaction list below, or a toast) closes the interaction loop and builds trust
- No "Save" button separate from the category tap; the category tap IS the save action (reduces taps and removes ambiguity)

### Amount Entry — Numpad Design

- Show a custom full-screen numeric keypad (do not rely on native iOS keyboard input type="number"; it shows system keyboard which may autocorrect, suggest passwords, or show decimal/comma in unexpected places)
- Display the running amount in a large font (min 36pt) at the top of the numpad area
- Format the display value in real-time as digits are entered: entering "15000" shows "15.000" (with Indonesian dot-separator)
- Include a backspace key (not just "clear") so users can fix the last digit without restarting
- Include a "000" quick-entry key — Indonesian amounts are almost always round thousands (Rp 15.000, Rp 50.000, Rp 150.000); "000" saves 2 taps on every entry
- Do NOT include a decimal key; IDR has no sub-rupiah amounts in daily use, and adding a comma/decimal key introduces error-prone inputs
- Short-form display in the amount preview: once the amount is confirmed (after category tap), display as "15k" or "1,5jt" in the transaction list, but during numpad entry show the full unabbreviated number so users can verify exactly what they typed

### Category Tile Row

- 7 fixed tiles in a single horizontal row, scrollable if needed (but ideally all 7 visible at once or with 6.5 visible to hint scrollability)
- Each tile: icon (emoji or simple SVG) + short label (≤8 chars) + distinct color per category
- Tile tap area: minimum 48×48pt per Apple HIG guidelines
- Tile row is persistent below the numpad — no modal, no bottom sheet, no navigation
- Visual highlight on the last-used category (defaults to "Food" as the most common Indonesian daily spend)

### Transaction List

- Chronological descending list below the Quick Add area (or on a separate screen accessed via bottom nav)
- Each row: amount (short-form IDR) + category icon + relative time ("2 min ago", "Yesterday 12:30") + optional note truncated to 1 line
- Swipe-left to delete; tap to edit (industry standard on iOS lists)
- Edit opens the same numpad with the existing values pre-filled; category tile row shows the current category highlighted

---

## IDR Formatting Notes

### Display Format Rules

| Context | Format | Example |
|---------|--------|---------|
| Numpad input (in-progress) | Full digits, dot thousands separator, no symbol | 15.000 |
| Transaction list (saved) | Short-form with "k" or "jt" suffix | 15k, 1,5jt, 250k |
| Report totals | Full digits with "Rp" prefix, dot thousands | Rp 2.450.000 |
| Category tile total in report | Short-form | 1,2jt |

### Short-Form Conversion Logic

- < 1.000: show as-is ("750")
- 1.000 – 999.999: divide by 1000, strip trailing zeros, append "k" ("15.000" → "15k", "12.500" → "12,5k")
- ≥ 1.000.000: divide by 1.000.000, one decimal max, append "jt" ("1.500.000" → "1,5jt", "2.000.000" → "2jt")

### Indonesian Locale Conventions

- Thousands separator: period (`.`) — NOT comma. "1.000" not "1,000"
- Decimal separator: comma (`,`) — relevant only for jt short-form display
- Currency symbol: "Rp" (not "IDR" or "Rp.") — placed before the number, no space in formal contexts but a space is acceptable in UI labels

### "000" Key Rationale

Indonesian everyday prices cluster at round thousands: Rp 5.000 (gojek ride), Rp 15.000 (nasi goreng), Rp 50.000 (grab), Rp 150.000 (utility). The "000" key lets users type "15" + "000" instead of "1–5–0–0–0". This saves 3 key taps on the most common amounts and is a standard feature in Indonesian-market calculator and payment apps.

---

## Receipt Scan UX

### Capture-to-Categorization Flow

1. User taps a "Scan receipt" button (secondary — not the default entry path)
2. Camera view opens in-app (use `<input type="file" accept="image/*" capture="environment">` for PWA compatibility on iOS Safari)
3. User photographs the receipt
4. Loading state shown while free-tier LLM/OCR processes (expect 2–5 seconds)
5. Result shown in a pre-filled numpad + highlighted category tile

### Confidence Threshold and Fallback

- **High confidence (amount clearly parsed):** Pre-fill numpad with extracted amount; highlight the inferred category tile; user confirms with one tap (the category tile tap = save)
- **Low confidence / parse failure:** Open the normal manual numpad with a visible banner "Couldn't read receipt clearly — enter amount manually"; this avoids silent failures and maintains the 2–3 tap path
- **Confidence signal to use:** Any amount extracted successfully = proceed; no amount found or amount is clearly implausible (e.g., > Rp 100.000.000 for a food receipt) = fall back to manual with the banner

### Indonesian Receipt Specifics

- GrabFood / GoFood receipts: The total line is typically labelled "Total Tagihan" or "Grand Total"; amounts are in Rupiah with no decimal
- QRIS confirmations (screenshots): Amount is typically shown as "Rp XX.XXX" in a prominent position; image quality is usually high, making these the best candidates for accurate parsing
- Printed receipts (Indomaret, Alfamart): Multi-line, small font; OCR accuracy drops; the fallback UX matters most here
- The free-tier LLM prompt should instruct the model to return a JSON like `{"amount": 15000, "category": "food", "confidence": "high"|"low"}` and treat any non-JSON or error response as "low confidence"

---

## Payday Cycle Logic — Edge Cases

### Core Definition

A "cycle" starts on the user's configured payday day-of-month and runs until the day before the next cycle starts.

Example: payday = 25th → Cycle = 25 Mar → 24 Apr (inclusive)

### Edge Cases to Handle

| Scenario | Problem | Recommended Resolution |
|----------|---------|----------------------|
| Payday = 29, 30, or 31 | February has fewer days; some months have 30 days | Use the last day of the month as the effective payday when the configured day doesn't exist (payday=31 in June → cycle starts June 30) |
| User sets payday on the 1st | Cycle coincides with calendar month — no special handling needed, but UI should reflect "this is also calendar month" | No special case; works naturally |
| User registers mid-cycle | First visible cycle starts from their configured payday in the current or previous month depending on today's date relative to the payday | If today >= payday this month: current cycle started on payday this month. If today < payday this month: current cycle started on payday last month |
| User changes payday day | Existing historical expenses already belong to previous cycles; changing payday should only affect future cycles | Prompt user: "New cycle day applies from next payday. Historical data stays as-is." Store a payday_changes history table if needed |
| Expenses logged on the exact payday day | Should they belong to the ending cycle or the new one? | Convention: payday day belongs to the NEW cycle (it's the first day, not the last) |
| No expenses in current cycle | Report screen should show an empty state with the cycle date range, not an error | Always show the cycle header even with zero data |

### Cycle Display Label

Show the cycle as a date range in the report header: "25 Mar – 24 Apr" (not "March budget"). This is more honest and matches how salary earners actually think.

---

## Feature Dependencies

```
Cloud auth
  └── Shared household (invite requires accounts)
        └── Household ID on every expense (required for shared stream)
              └── Edit/delete (scoped to household)

Manual quick-add (numpad + categories)
  └── Saved templates (re-use of amount + category pairs)
  └── Receipt scan (populates the same numpad; same save flow)

Payday cycle config (user sets day of month)
  └── Category breakdown report (always scoped to current cycle)

IDR formatting utility
  └── Used by: numpad display, transaction list, report totals, templates
```

---

## MVP Prioritization

### Must-ship (v1 launch)
1. Manual quick-add — the entire value proposition lives here
2. IDR numpad with "000" key and real-time formatting
3. Fixed 7 categories with icon + color tiles
4. Transaction list with edit/delete and optional note
5. Payday cycle config + current cycle scope
6. Category breakdown pie/donut report
7. Cloud auth + shared household invite
8. PWA manifest + offline-tolerant input queue

### Ship after core validation
9. Saved expense templates (useful but not blocking day-1 value)
10. Receipt scan (secondary path; useful but adds OCR dependency)

### Defer to v2
- Custom categories
- Trend comparisons
- Export
- Per-person breakdown in report

---

## Sources

- Monefy UX review: https://dmad.com/monefy-review/
- IDR formatting: https://dev.to/choiruladamm/format-indonesian-rupiah-like-a-pro-with-formatrupiah-3ak0
- Indonesian number conventions: https://www.quora.com/Why-is-0-5-written-as-0-5-and-1-000-written-as-1-000-in-Indonesian
- Receipt OCR benchmark: https://research.aimultiple.com/receipt-ocr/
- Open-source receipt extraction with LLMs: https://maximechampoux.medium.com/open-source-invoice-receipt-extraction-with-llms-bccefbd17a1d
- Mobile UX design best practices 2025: https://www.webstacks.com/blog/mobile-ux-design
- Finance app UX best practices: https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps
- Shared household expense apps: https://productivityparents.com/best-apps-for-tracking-shared-household-expenses/
- PWA install patterns: https://goulet.dev/posts/qr-code-pwa-link-with-token/
- YNAB payday budgeting: https://support.ynab.com/en_us/how-to-budget-your-income-on-any-pay-cycle-HkpGZdW1o
- Lunch Money custom periods: https://lunchmoney.app/blog/how-to-set-custom-budgeting-periods
