# DESIGN.md

## 1. Brief and direction
**Subject**: HCM, a small HR app. Two audiences: an Admin who scans numbers and approves things quickly, and an Employee who checks in once a day and occasionally applies for leave. **Primary job**: make today's attendance and pending decisions readable in two seconds.

**Direction (from the user's reference images, dark and light)**: a dense, calm HR dashboard. Near-black and warm-grey surfaces, one orange accent with peach, cream and dusty-rose supports, a floating pill navigation, large light numerals with small labels, a heatmap grid, a segmented progress bar, a timeline with an orange pill, and one inverted (dark in light mode) card as a counterweight. The brief's words win: orange accent, dark mode and light mode, "like these images, not a copy".

**What we take**: palette family, pill nav, large numerals, big radii on cards, tonal layering, heatmap, segmented bar, timeline pill, inverted card, light/dark parity.
**What we change**: no glossy photo-textured hero card (flat orange instead), no glass overlay, no fake delta chips or invented metrics, our own wordmark, our own copy. Do not use the name "Dalworka", its logo, or its imagery.

**The one bold move**: the flat orange hero card with an oversized numeral (Admin: total employees; Employee: the check-in card). Everything else stays quiet.

## 2. Banned list (anti-slop)
Any item below fails design review.
1. Purple, indigo, or blue-violet gradients; gradient text; decorative gradient washes; mesh gradients.
2. Glassmorphism, backdrop blur panels, glow shadows, blob/orb backgrounds, floating decorative shapes.
3. Emoji anywhere in the interface (headings, empty states, toasts, helper replies, nav). No sparkle icon for the helper.
4. Greeting and hype copy: "Welcome back", "Let's get started", "Oops", "Awesome", "Amazing", any exclamation mark, "Powered by AI".
5. Fake data: delta chips ("+12.5%"), invented sparklines, placeholder people, lorem ipsum, stock illustrations. Empty means a designed empty state.
6. A grid of identical rounded cards with identical soft shadows. Cards have no shadow. Hierarchy comes from size, tone, and role.
7. Template chrome: tracked-out ALL-CAPS eyebrow labels above headings; meta strings joined with middle dots; "→" appended to buttons and links; spaced em-dash labels ("WORD — fragment"); numbered markers (01, 02) on non-sequences; one word in a heading accented by colour or italics; small monospace data labels.
8. Hover-lift on every card, scroll-triggered fade-up on every section, shimmer skeletons, looping decorative animation.
9. A centered card on a gradient for login (use the split layout in §6).
10. Status by colour alone. Every status has a text label and an icon or pattern.
11. Inter, Roboto, Poppins, Space Grotesk, or system-ui as the visible typeface.
12. One border-radius for everything. Radii follow the scale in §4.
13. White text on the orange fill (contrast about 3.5:1). Use `--on-accent`.
14. Hard-coded hex values outside the token block.

## 3. Reference analysis (what the images contain)
| Element in reference | HCM version |
|---|---|
| Top pill nav, logo left, search/bell/avatar right | Same structure. Items per role. Search icon only if it works (omit otherwise). Bell opens announcements. Avatar opens menu. |
| Orange gradient hero stat with glossy texture | Flat `--accent` hero card, oversized numeral. |
| Two plain stat cards with 3 tiny dashes | Plain stat cards with number and label. No dashes, no deltas. |
| Work-activity heatmap, rows by time, orange / rose / empty cells | Presence heatmap: rows = departments, columns = last 14 working days. Employee month calendar uses the status palette. |
| Onboarding card: stacked segments 30% / 25% / 5% above an inverted checklist | "Today at a glance" segmented bar (on time, late, on leave, not in yet) and the inverted "Pending leave requests" card with approve/reject controls. |
| Timeline with an orange "Team Meeting" pill | Today's check-in timeline with an orange "Office starts 09:00 AM" pill and a shaded grace window. |
| "Weekly" select pill | Month / date select pill. |
| Light mode: grey page, off-white cards; inverted card stays black | Same. |

## 4. Tokens
All colours, radii, spacing, and type live in one `:root` block in `css/style.css`. Light is default; `:root[data-theme="dark"]` overrides. Text contrast target 4.5:1, graphics 3:1; adjust a value if a check fails.

```css
:root {
  color-scheme: light;
  /* surfaces */
  --bg: #E6E6E3;        --surface: #F3F3F1;   --surface-2: #EAEAE7;
  --surface-3: #DDDDD9; --line: #D3D3CF;
  /* text */
  --text: #151515;      --text-2: #55534E;    --text-3: #6B6862;
  /* accent family */
  --accent: #E85D0C;    --on-accent: #160B04; --accent-text: #B8460A;
  --peach: #F6B38E;     --cream: #FBE5C6;     --rose: #E3A1A9;
  /* status */
  --st-present: var(--accent); --st-late: var(--rose); --st-half: var(--peach);
  --st-leave: var(--cream);    --st-absent-line: var(--text-3);
  --ok: #2F6B2C;  --ok-bg: #DCE9D6;  --danger: #A8281F;  --danger-bg: #F3D9D6;
  /* inverted card */
  --inv-bg: #161616; --inv-text: #F2F0EC; --inv-text-2: #A9A49C; --inv-line: #2E2E2E;
  /* heat ramp */
  --heat-0: #DCDCD8; --heat-1: #FBE5C6; --heat-2: #F6B38E; --heat-3: #E85D0C; --heat-4: #A83C06;
  /* shape */
  --r-sm: 8px; --r-md: 14px; --r-lg: 22px; --r-pill: 999px;
  --shadow-float: 0 12px 32px rgb(20 20 20 / .14);
  /* space (4px base) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px;
  /* type */
  --font-display: "Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Instrument Sans", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
  /* motion */
  --ease: cubic-bezier(.2,.7,.2,1); --t-fast: 120ms; --t-med: 220ms;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101010;        --surface: #1A1A1A;   --surface-2: #232323;
  --surface-3: #2C2C2C; --line: #2E2E2E;
  --text: #F2F0EC;      --text-2: #B4AFA7;    --text-3: #8A857E;
  --accent: #EC6410;    --accent-text: #FF8A4C;
  --ok: #8FD08A;  --ok-bg: #22341F;  --danger: #FF8F86;  --danger-bg: #3A1F1C;
  --inv-bg: #0A0A0A; --inv-text: #F2F0EC; --inv-text-2: #A9A49C; --inv-line: #2E2E2E;
  --heat-0: #1F1F1F; --heat-4: #FF8A4C;
  --shadow-float: 0 12px 32px rgb(0 0 0 / .5);
}
```
Radius roles: pills and buttons `--r-pill`; cards `--r-lg`; nested tiles and table wrappers `--r-md`; inputs, chips, heat cells `--r-sm`. Cards separate from the page by tone (`--surface` on `--bg`), with a 1px `--line` border only where tone alone is too faint.

## 5. Typography
- **Display**: Bricolage Grotesque, weights 500 to 600, `font-optical-sizing: auto`, tracking -0.02em on numerals. Used for page titles, card titles, big numerals, the clock.
- **Body**: Instrument Sans, 400/500/600. Used for everything else. Enable `font-variant-numeric: tabular-nums` on tables, times, and stats.
- **Mono**: JetBrains Mono 400/500, used only for payslip figures.
- Scale (px): 12.5 caption, 14 secondary, 16 body, 20 card title, 28 stat numeral, 40 hero numeral, 64 clock. Line-height 1.45 body, 1.1 display. Max line length 70 characters.
- Sentence case everywhere. No uppercase transforms. Labels sit below or beside numbers, in `--text-2`.
- Hero and stat numerals use weight 500 (the reference reads light and tidy, not bold).

## 6. Layout
12-column grid, container max-width 1320px, outer padding 24px (16px on mobile), gap 14px. Breakpoints: 1100 (rail drops below main), 720 (bottom tab bar, tables become card lists), 480 (single-column forms).

**Shell**: a floating pill nav, centered at the top (`--surface` pill, 1px `--line`, active item = orange text on `--cream` in light and `--surface-3` in dark). Left: wordmark. Right: bell, theme toggle, avatar button. At 720px and below the pill is replaced by a fixed bottom tab bar (icon + label, 56px high) and the top bar keeps only wordmark and avatar.
- Admin items: Dashboard, Employees, Leaves (with a pending count badge), Payslips, Settings.
- Employee items: Dashboard, Payslip.

**Wordmark**: an orange quarter-circle glyph beside "HCM" in Bricolage Grotesque 600. Original shape; draw it as inline SVG.

**Admin dashboard (1440px)**
```
 Overview   [Sat 24 Oct 2026]                      [Export CSV] [October 2026 v]
 ┌────────────┬──────────┬──────────┬──────────┐ ┌───────────────────────────┐
 │ ORANGE HERO│ Present  │ Late     │ On leave │ │ Pending leave requests    │
 │ Employees  │   n      │   n      │   n      │ │ (inverted card)           │
 │   n        │          │          │          │ │ name, dates, [x] [check]  │
 ├────────────┴──────────┴──────────┴──────────┤ │                           │
 │ Today at a glance: segmented bar + legend   │ ├───────────────────────────┤
 ├───────────────────────────────┬─────────────┤ │ Checked in now        n   │
 │ Presence heatmap (dept x days)│ Check-in    │ ├───────────────────────────┤
 │                               │ timeline    │ │ Announcements             │
 ├───────────────────────────────┴─────────────┤ │ composer + list           │
 │ Attendance register (date picker, table)    │ ├───────────────────────────┤
 ├──────────────────────┬──────────────────────┤ │ Helper chat               │
 │ Dept bar (Chart.js)  │ 14-day trend (Chart) │ └───────────────────────────┘
 └──────────────────────┴──────────────────────┘
```
Main column spans 9 of 12, right rail 3. Left-aligned content. Each block has a different footprint so the page does not read as a card grid.

**Employee dashboard**
```
 Today   [Sat 24 Oct 2026]
 ┌──────────────────────────────┐ ┌─────────────────────────────┐
 │ ORANGE CHECK-IN CARD         │ │ Leave balance (inverted)    │
 │ 09:12 AM (64px clock)        │ │ segmented: approved/pending │
 │ Office starts 09:00, grace 15│ │ /remaining                  │
 │ [ Check in ]                 │ ├─────────────────────────────┤
 ├───────┬───────┬───────┬──────┤ │ Announcements (read-only)   │
 │Present│ Late  │ Half  │Absent│ ├─────────────────────────────┤
 ├───────┴───────┴───────┴──────┤ │ Helper chat                 │
 │ My attendance: month calendar│ └─────────────────────────────┘
 │ + records table, month select│
 ├──────────────────────────────┤
 │ Apply for leave (form) + my  │
 │ requests with status/comment │
 └──────────────────────────────┘
```
**Employees page**: title row (title, "N of M employees", "Add employee" button), toolbar (search input, department select pill), table (name with initials avatar and email, department, salary, joined, today's status, actions). Add/Edit open a modal. Delete opens a confirm modal. At 720px the table becomes stacked rows.
**Leaves page**: segmented tabs (Pending, Approved, Rejected, All), list rows with employee, type, dates, days, reason, status chip, Admin comment, and Approve/Reject buttons for pending rows. Decision opens a modal with the comment field.
**Settings page**: left-aligned single column, sections as headings (Company, Attendance rules, Leave, Working days, Departments, Reset data). Working days are seven toggle pills (Mon to Sun). Each section has its own "Save" button.
**Payslip page**: header controls (employee select for Admin, month select, Print button, Admin tabs "Slip" and "Month summary"). The slip is a white paper-like panel in both themes (it prints as-is), with a two-column key/value layout and a bold net-pay row, figures in mono.
**Login and setup (`index.html`)**: split layout, not a centered card. Left 5 columns: wordmark, one plain sentence ("HR for a small team: attendance, leave, and payslips in one place."), and a quiet list of what each role can do. Right 7 columns: the form on `--surface`. First-run title: "Set up your company". Login title: "Sign in". Setup has three groups: Company, Admin account, Attendance rules (prefilled, "You can change these later in Settings").

## 7. Components
- **Buttons** (pill, 44px tall on mobile, 40px desktop): primary = `--accent` fill with `--on-accent` text; secondary = 1px `--line` outline; ghost = text only; danger = `--danger` text on `--danger-bg`. Verbs only ("Add employee", "Save changes", "Approve", "Reject", "Check in", "Check out", "Apply", "Print").
- **Inputs**: 44px tall, `--surface-2` fill, 1px `--line`, `--r-sm`. Label above (14px, 600). Hint below in `--text-3`. Focus: 2px `--accent` outline with 2px offset. Error: message under the field with an alert icon, `--danger` text, `--danger` border.
- **Select pill** (like the reference's "Weekly"): `--surface-2`, pill, chevron icon.
- **Status chips** (pill, 12.5px, icon + label): On time, Late, Half day, On leave, Absent, Not checked in, Weekly off; Pending, Approved, Rejected. Colours from the status tokens with text colours chosen for contrast.
- **Stat card**: label (14px, `--text-2`) above, numeral (Display 28px) below, nothing else. The hero card is 40px numeral on `--accent` with `--on-accent` text.
- **Inverted card**: `--inv-bg` with `--inv-text`. One per screen (Admin: pending leaves; Employee: leave balance).
- **Table**: no zebra stripes, 1px `--line` row dividers, 56px rows, sticky header inside its scroll container, numeric columns right-aligned and tabular.
- **Modal**: centered, `--surface`, `--r-lg`, `--shadow-float`, max-width 520px, backdrop `rgb(0 0 0 / .5)` without blur. On mobile it becomes a bottom sheet.
- **Toast**: bottom-center (above the tab bar on mobile), `--inv-bg` pill with icon and one line of text, auto-dismiss in 4 seconds, `aria-live="polite"`.
- **Avatar**: circle with initials on `--surface-3` (no photos, no generated art).
- **Helper chat**: card with header "Ask HCM" and caption "Answers come from your HCM data". Message list (user right, helper left, helper bubbles on `--surface-2`), suggestion chips above the input, input with a Send button. No typing animation. The "AI" mark from the PDF cover is optional as a small neutral chip; never purple.
- **Empty state**: one sentence about what is missing, one sentence about what to do, one button. No illustration.

## 8. Data visualisation
All built from tokens. Each chart has a text alternative (table or `aria-label`) and a legend with words.
- **Status palette (shared everywhere)**: present = orange; late = rose; half day = peach; on leave = cream with a 1px line; absent = empty cell with a diagonal hatch; weekly off = empty cell with a dotted outline.
- **Segmented bar** ("Today at a glance"): one row, segments sized by share of total employees (on time, late, on leave, not in yet), percentage labels above each segment, minimum visible width 4px for non-zero segments, legend below. Zero employees: empty track and the empty-state sentence.
- **Presence heatmap**: rows = departments (scrolls if more than 8), columns = last 14 working days, cell = share of that department present, 5-step ramp `--heat-0` to `--heat-4`. Cell 28px square on desktop, `--r-sm`, with `title` and `aria-label` ("Sales, 21 Oct: 3 of 4 present"). Legend shows the ramp with "0%" and "100%". No departments: empty state.
- **Check-in timeline**: horizontal axis from 60 minutes before office start to the latest check-in (minimum 3 hours wide). Each check-in is a dot stacked in 10-minute buckets. A shaded band marks the grace window. An orange pill labelled "Office starts 09:00 AM" sits on the axis (like the reference). Late dots use `--rose`. Tooltip: name and time.
- **Month calendar (Employee)**: Monday-first 7-column grid; each day cell shows the date and a status colour with a label on hover/focus; legend below.
- **Chart.js**: department bar (present vs total today) and 14-day trend line (present and late). Colours read from CSS variables at draw time; redraw on `hcm:themechange`. No gradient fills, no animation beyond the default 300ms draw. If `window.Chart` is missing, show "Charts need an internet connection." in place.

## 9. Motion
One orchestrated moment: on dashboard load, the segmented bar widens from 0 and the heatmap cells fade in over 400ms total. Action feedback is welcome (modal open/close 160ms, button press, toast slide 200ms, theme switch colour transition 150ms). Nothing else moves. All motion is disabled under `prefers-reduced-motion`.

## 10. Icons
Hand-written inline SVG in `js/icons.js`: 24px grid, 1.75 stroke, `stroke-linecap: round`, `stroke-linejoin: round`, `fill: none` except tiny dots, `currentColor`, `aria-hidden="true"`, rendered at 20px (24px in the tab bar). Needed set: dashboard, users, user, calendar, calendar-off, clock, log-in, log-out, check, x, plus, pencil, trash, search, bell, sun, moon, chevron-down, chevron-left, chevron-right, download, printer, building, wallet, file-text, megaphone, chat, send, sliders, alert-circle, info, lock, copy. Draw a throwaway preview page while building and delete it afterwards.

## 11. Copy
Plain verbs, sentence case, no filler, no exclamation marks. The same action keeps the same name from button to toast ("Add employee" then "Employee added"). Errors state what to fix and never apologise.

| Place | Copy |
|---|---|
| Admin empty (no employees) | "No employees yet. Add your first employee to start tracking attendance." Button: Add employee. |
| Admin no pending leaves | "No pending requests." |
| Heatmap with no departments | "No departments yet. Add departments in Settings." Button: Open settings. |
| Timeline, nobody in | "Nobody has checked in yet today." |
| Employee, before check-in | "You haven't checked in yet." Button: Check in. |
| Employee, after check-in | "Checked in at 09:12 AM." Button: Check out. |
| Employee, after check-out | "Checked out at 05:30 PM. 8.3 hours worked." |
| Weekly off | "Today is a weekly off. Attendance you record now counts as extra." |
| Leave list empty | "No leave requests yet." |
| Payslip, no employees | "No employees yet. Add an employee to see payslips." |
| Setup done | Toast: "Company created." |
| Employee added | Toast: "Employee added." Panel: "Share these login details now. The password can't be shown again." |
| Leave decided | Toast: "Leave approved." / "Leave rejected." |
| Logout | no toast |
| Storage full | Toast (error): "Couldn't save. Storage is full." |
| Login failure | Under the form: "Email or password is incorrect." |

Dates look like "Sat 24 Oct 2026", times like "09:12 AM", money like "PKR 54,444.44" (payslip, two decimals) or "PKR 60,000" (lists, no decimals).

## 12. Accessibility and responsive floor
Landmarks (`header`, `nav`, `main`), skip link, one `h1` per page, labelled inputs, `aria-live` for toasts and helper replies, modal focus trap, visible focus ring, keyboard-operable everything, 44px touch targets on mobile, no horizontal scroll at 360px, reduced motion respected, colour never the only signal, `lang="en"`.

## 13. Self-review checklist (run before finishing any screen)
- [ ] View at 1440px and 390px, light and dark, empty and populated.
- [ ] Nothing from §2 appears.
- [ ] Only one bold element per screen.
- [ ] Every colour comes from a token. Every radius follows the role scale.
- [ ] No fake numbers. Every number traces to stored data.
- [ ] Copy follows §11. Empty states offer one action.
- [ ] Remove one decorative element.
