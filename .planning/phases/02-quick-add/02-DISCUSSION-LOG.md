# Phase 2: Quick Add - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-quick-add
**Areas discussed:** Screen structure, Note entry timing, Category tile style, Nav shell

---

## Screen structure

| Option | Description | Selected |
|--------|-------------|----------|
| One scrollable page | Numpad at top, list below — extends existing +page.svelte pattern | ✓ |
| Tab bar (Quick Add \| History) | Two tabs; clean separation but adds routing complexity | |
| Separate route /expenses | Quick Add is /, list is /expenses — most routing overhead | |

**User's choice:** One scrollable page

---

| Option | Description | Selected |
|--------|-------------|----------|
| All expenses, most recent first | Full history, no cutoff | |
| Last 20 only | Paginated list | |
| Current day only | Today's expenses only | ✓ |

**User's choice:** Today's expenses only on home page

---

| Option | Description | Selected |
|--------|-------------|----------|
| No separate history route in Phase 2 | Edit/delete for today only | |
| Add /expenses route for full history | Dedicated history page for older entries | ✓ |
| You decide | Leave to implementer | |

**User's choice:** Add /expenses route for full history (edit/delete reachable from there)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reset immediately to 0 | Instant clear, next entry ready | ✓ |
| Brief confirmation flash then reset | ~400ms visual feedback before clearing | |
| Scroll to show saved item | Animate to new entry, then scroll back | |

**User's choice:** Reset immediately to 0

---

| Option | Description | Selected |
|--------|-------------|----------|
| Flat, most recent first | Simple descending order | ✓ |
| Grouped by time block | Morning/Afternoon/Evening sections | |
| Flat, most recent last | Chronological ascending | |

**User's choice:** Flat, most recent first

**Notes (clarification):** User asked whether numpad uses device keyboard or custom. Clarified: custom-crafted HTML button grid — required by INPUT-02 (000 key, no decimal). Device keyboard never opens.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tap expense item → /expenses/:id/edit | Direct navigation from any expense row | ✓ |
| Long-press for context menu | Poor discoverability on mobile | |
| Swipe left to reveal actions | iOS-familiar but non-trivial in SvelteKit | |
| You decide | Leave to implementer | |

**User's choice:** Tap expense item navigates to /expenses/:id/edit

---

## Note entry timing

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-up note field immediately after save | Bottom sheet slides up post-save, stays until user acts | ✓ |
| Only via edit screen (tap expense in list) | No immediate prompt; note only in edit form | |
| Both: slide-up + editable in edit form | Maximum surface | |

**User's choice:** Slide-up bottom sheet immediately after save

---

| Option | Description | Selected |
|--------|-------------|----------|
| No auto-dismiss — stays until user acts | Stays until Skip or Save note | ✓ |
| Auto-dismiss after ~4 seconds | Fade out if no interaction | |
| You decide | Leave to implementer | |

**User's choice:** No auto-dismiss — stays until user acts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — note field always in edit form | Note editable at any time via edit | ✓ |
| No — note only at save time via slide-up | Once skipped, note is locked | |

**User's choice:** Note field always present in edit form

---

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom sheet over the numpad | Sheet covers numpad area, shows saved expense summary | ✓ |
| Inline below category tiles | Page shifts down, note appears inline | |
| You decide | Leave to implementer | |

**User's choice:** Bottom sheet over the numpad

---

| Option | Description | Selected |
|--------|-------------|----------|
| No — skip is permanent for this expense | No re-prompt; note accessible via edit | ✓ |
| Re-prompt on next app open if empty | Reminder on next launch | |

**User's choice:** Skip is permanent — no re-prompt

---

## Category tile style

| Option | Description | Selected |
|--------|-------------|----------|
| Emoji + text label | Emoji above category name; no icon design needed | ✓ |
| Text label only | Clean pill buttons, harder to scan one-handed | |
| Color-coded tiles with emoji | Distinct background per category | |

**User's choice:** Emoji + text label

---

| Option | Description | Selected |
|--------|-------------|----------|
| 4 columns (4-3 layout) | Wider tiles, good thumb reach | |
| 3 columns (3-3-1 layout) | Bigger tiles, more vertical space | ✓ |
| Horizontal scroll row | All 7 in a scrollable row | |

**User's choice:** 3 columns (3-3-1 layout)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Use defaults | 🍜 Food, 🚗 Transport, 🎬 Entertainment, 💡 Utilities, 🛍️ Shopping, ❤️ Health, ✅ Others | ✓ |
| Customize emojis | User picks different emojis | |
| You decide | Leave to implementer | |

**User's choice:** Use default emojis

---

| Option | Description | Selected |
|--------|-------------|----------|
| Brief press highlight (Recommended) | Tile flashes darker/bordered during 500ms debounce | ✓ |
| No visual state change | Only feedback is numpad reset | |
| You decide | Leave to implementer | |

**User's choice:** Brief press highlight on tile tap

---

## Nav shell

| Option | Description | Selected |
|--------|-------------|----------|
| Gear icon in header opens menu | ⚙️ in top-right; menu: Invite member, Household details, Log out | ✓ |
| Bottom tab bar (Quick Add \| History \| Settings) | Persistent nav, adds layout height | |
| Links below the today list | Plain links at bottom of page | |

**User's choice:** Gear icon in header opens a simple menu

---

| Option | Description | Selected |
|--------|-------------|----------|
| Link at bottom of today list (Recommended) | "View all history →" below today's expenses | ✓ |
| Link in gear menu | History in settings menu | |
| Both: bottom link + gear menu item | Maximum discoverability | |

**User's choice:** "View all history →" link at bottom of today list

---

| Option | Description | Selected |
|--------|-------------|----------|
| Invite member, Household details, Log out | Same links as Phase 1 shell | ✓ |
| Household details, Log out only | Invite stays on household page | |
| You decide | Leave to implementer | |

**User's choice:** Gear menu contains: Invite member, Household details, Log out

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full page /expenses/:id/edit | Dedicated edit route, clean back navigation | ✓ |
| Bottom sheet over the list | Sheet slides up, no route change | |
| Inline expand in the list | Editable fields expand in place | |

**User's choice:** Full page /expenses/:id/edit

---

## Claude's Discretion

- Gear menu animation style (dropdown vs slide-in) and positioning
- Amount display visual styling above the numpad (font size, placeholder)
- Empty state for the today list (no expenses logged yet)
- Edit screen layout and form field order, as long as all 4 fields (amount, category, note, date) are present

## Deferred Ideas

None — discussion stayed within phase scope.
