# MASTER PROMPT: Build HCM (Saylani Hackathon, Beginner Track)

Paste this whole file into Antigravity (Planning mode) at the root of an empty project folder that already contains `AGENTS.md`, `.agent/`, and `docs/`. If the files are not there yet, create them first from the kit.

## 1. Your role and how to work
You are a senior front-end engineer and product designer building **HCM** (the hackathon calls it "HCM Lite") for a student hackathon. The result is judged on features, business rules, a smart helper, UI quality, clean code, and demo plus README. Build something that works end to end and looks like it was designed by a person with taste.

Process:
1. Read `AGENTS.md`, this file, then every file in `docs/` (`PLAN.md`, `DESIGN.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `TASKS.md`, `TEST_CHECKLIST.md`, `REQUIREMENTS_TRACE.md`). Where this file and a doc disagree, the order is: this file, then `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DESIGN.md`, `PLAN.md`.
2. Produce an implementation plan that follows the phases in `docs/TASKS.md`. Do not invent extra phases, pages, or libraries.
3. Build phase by phase (`/build-phase`). After each phase, verify it in the browser against `docs/TEST_CHECKLIST.md`, tick `docs/TASKS.md`, and give a summary of at most 10 lines. Continue automatically unless blocked.
4. Ask the user a question only when a decision is truly missing from the docs. Otherwise choose the simplest reading and record it under "Assumptions" in `docs/PLAN.md`.
5. Finish with `/verify-rules`, `/design-review`, and `/pre-submit`.

## 2. The challenge (from the brief)
Build **HCM Lite**, a small HR web app, using only **HTML, CSS and JavaScript**. There is no framework and no backend: all data is saved in the browser with **localStorage**. The app **starts empty**; the Admin sets up the company and adds employees, and every number comes from what people do in the app. No dummy data.

| For | Date and venue | Tools | Data | Submit |
|---|---|---|---|---|
| Students who know basic HTML, CSS and JavaScript | 24 Oct 2026, Zaitoon Ashraf IT Park | HTML, CSS, JavaScript, localStorage (Chart.js optional) | Starts empty; no dummy data | Repo + hosted link on lms.saylaniit.com |

## 3. You must build
- **Two roles**: Admin (runs the company and HR work) and Employee (self-service).
- **Employees**: Admin adds an employee, which also creates that employee's login.
- **Attendance**: Employee checks in and out; the app marks present, late or half day using the Admin's rules.
- **Leave**: Employee applies; Admin approves or rejects; balance updates.
- **Dashboard and payslip**: simple numbers and a monthly salary slip.
- **Smart helper**: a small chat box that answers questions from the app's data.
- A **responsive** design that works on a phone, and a **live hosted link**.

## 4. Pages (exactly seven)
| File | Page | Purpose |
|---|---|---|
| `index.html` | Login + first-run setup | Creates the company and the Admin account the first time |
| `pages/admin.html` | Admin dashboard | Totals, today's attendance, pending leaves, smart helper |
| `pages/employees.html` | Manage employees | Add (creates login), edit, delete, search, filter |
| `pages/leaves.html` | Leave requests | Approve or reject with a comment |
| `pages/settings.html` | Company settings | Office start time, grace minutes, leave quota |
| `pages/employee.html` | Employee dashboard | Check in / out, my attendance, apply leave, helper |
| `pages/payslip.html` | Payslip | Monthly salary slip, print or save as PDF |

Suggested structure (follow `docs/ARCHITECTURE.md` §1): `index.html`, `pages/*.html`, `css/style.css`, `js/storage.js`, `auth.js`, `employees.js`, `attendance.js`, `leave.js`, `helper.js`, plus the extra modules listed there.

## 5. Who can do what
Each page first checks who is logged in. If an Employee opens an Admin page, send them back to their own dashboard.

| # | Functionality | Admin | Employee |
|---|---|---|---|
| 01 | First-run setup: company name and the Admin account | Manage | none |
| 02 | Login, logout, change password | Own | Own |
| 03 | Company settings: office start time, grace minutes, yearly leave quota, working days | Manage | none |
| 04 | Add employee (creates login), edit, delete | Manage | none |
| 05 | Employee list with search and department filter | All | none |
| 06 | Check in and check out | none | Own |
| 07 | Attendance records | All | Own |
| 08 | Apply for leave; see status and balance | none | Own |
| 09 | Approve or reject leave with a comment | Manage | none |
| 10 | Dashboard | Company totals | Personal |
| 11 | Monthly payslip (print / save as PDF) | All | Own |
| 12 | Smart helper chat | All data | Own data |
| 13 | Announcements | Post | Read |

Manage = create and change. All = every record. Own = only their own records. none = no access.

## 6. Business rules (the Admin decides them)
| Area | Rule |
|---|---|
| Attendance | Late if check-in is after office start + grace minutes (e.g. 09:00 + 15). One check-in per day; check-out only after check-in. Work hours = out - in; under 5 hours = half day. No record on a working day = absent. |
| Leave | From date must be on or before To date. Count working days only (skip weekends). Cannot overlap another leave. Cannot go over the yearly quota set by Admin. |
| Payslip | Per day = monthly salary / working days in the month. Deduction = per day x (absent days + 0.5 x half days). Net = salary - deduction. |
| Forms | Required fields, valid email, email not already used, salary greater than 0. Show the error next to the field. |

`docs/BUSINESS_RULES.md` turns each row into precise, testable rules (IDs, edge cases, exact messages, 30 test vectors). Key clarifications already decided there:
- Default working days are **Mon to Sat**, because 24 Oct 2026 is a Saturday; the Admin can change them. Check-in on a non-working day is allowed and recorded as extra attendance that payslips ignore.
- Late boundary: exactly start + grace is on time. Half-day boundary: 5.00 hours is a full day (compare in minutes, under 300 is a half day).
- A half day keeps its late flag. Today is never "absent"; it shows "Not checked in yet".
- Leave quota check = approved + pending + requested must fit the quota. Balance shown = quota minus approved. Casual and sick share one quota. A request stays within one calendar year. Reject needs a comment.
- Approved leave is paid. Salary is not prorated for mid-month joiners. Users have a `joinedAt` date so earlier days are never counted absent.

## 7. Saving data with localStorage
| Key | What it stores |
|---|---|
| `hcm_company` | Company name and settings (start time, grace minutes, leave quota), plus working days and the departments list |
| `hcm_users` | Admin and employees: id, name, email, password, role, department, salary (plus `salt`, `joinedAt`) |
| `hcm_attendance` | One entry per employee per day: date, check-in, check-out, status (plus `hours`, `late`, `offDay`) |
| `hcm_leaves` | Leave requests: employee id, type, from, to, days, reason, status, comment |
| `hcm_session` | Who is logged in right now |
| `hcm_announcements` (addition) | Admin posts, newest first |
| `hcm_theme` (addition) | `light` or `dark` |

The brief's example, for reference:
```js
const users = JSON.parse(localStorage.getItem("hcm_users")) || [];
users.push({ id: Date.now(), name, email, password, role: "employee", department, salary });
localStorage.setItem("hcm_users", JSON.stringify(users));
```
Keep the read/write helpers in `js/storage.js` and reuse them on every page. localStorage lives in one browser only, which is fine for learning; real apps use a server and a database. Passwords are stored hashed (SHA-256 + salt) in the `password` field. Full shapes: `docs/ARCHITECTURE.md` §4.

Data flow: Admin setup (company and rules) -> add employee (login is created) -> employee logs in (own dashboard opens) -> check-in and leave (saved in localStorage) -> Admin approves (status updates) -> dashboard and payslip show results.

## 8. Smart helper (AI touch)
Add a small chat box on **both dashboards**. The user types a question and the helper answers from the app's own data.

| Question | Who | Answer comes from |
|---|---|---|
| How many employees do we have? | Admin | Count of `hcm_users` with role employee |
| Who is on leave today? / Who was late today? | Admin | Approved leaves covering today / today's late records |
| How many leaves do I have left? | Employee | Quota minus own approved leave days |
| Was I late today? / How many hours did I work this week? | Employee | Own attendance records |

- **Required**: match keywords in the question with JavaScript (for example `text.includes("leave")`) and reply with real numbers. Employees only get their own data.
- **Optional bonus**: connect the helper to a free LLM API with `fetch()`: send the question plus a short summary of the data. Use a demo key only and never commit it to GitHub. This is a stretch item (S1 in `docs/TASKS.md`), off by default; if built, the key is typed at runtime and held in memory only, and Employees' summaries contain only their own data.
- The full intent list with priorities, answer templates, and the privacy reply is in `docs/BUSINESS_RULES.md` §8. The helper never claims to be a language model unless the LLM stretch is built.

## 9. Bonus ideas (+10 points)
- **Planned**: charts with Chart.js (CDN), dark mode, export attendance to CSV, a printable monthly report.
- **Stretch only, off by default**: camera check-in (open the camera with `getUserMedia()`, check the location with `navigator.geolocation`, detect a face with face-api.js from a CDN) is the riskiest item (needs HTTPS, model files, permission handling); build it only after everything else passes (S2 in `docs/TASKS.md`).

## 10. Design brief
Full spec: `docs/DESIGN.md`. Summary:
- **Look**: the user's reference images (a dark and a light HR dashboard with an orange accent, a floating pill nav, large light numerals, a work-activity heatmap, a segmented progress bar, a timeline with an orange pill, one inverted card). Take the mood and structure; do not copy it, and do not use its name, logo, or glossy photo texture.
- **Palette**: tokens for light and dark in one `:root` block (orange `#E85D0C` family, peach, cream, dusty rose, warm greys). Dark ink on orange fills.
- **Type**: Bricolage Grotesque (display), Instrument Sans (body), JetBrains Mono for payslip figures only.
- **Icons**: hand-written inline SVG in `js/icons.js`, simple rounded style like the reference.
- **Navigation**: floating pill nav at the top for both roles; bottom tab bar at 720px and below.
- **Dark mode**: yes, built from the same tokens, toggle persisted, default follows the system.
- **No AI-template look**. Banned: purple/indigo gradients, gradient text, glassmorphism, blobs, glow shadows, emoji anywhere, "Welcome back" style greetings, exclamation marks, fake delta chips and invented numbers, a grid of identical shadowed cards, ALL-CAPS eyebrow labels, middle-dot meta strings, "→" on buttons, numbered markers on non-sequences, hover-lift and fade-up on everything, a centered login card on a gradient, status shown by colour alone, Inter/Roboto/Poppins/Space Grotesk.
- **One bold move per screen**: the flat orange hero card with a large numeral. Everything else quiet.
- **Empty states are designed**: the app starts empty, so every block needs a sentence, an action, and no fake zeros.

## 11. Decisions already made (do not ask again)
App name HCM; orange reference direction; Google Fonts pairing above; inline SVG icons; pill nav; dark mode yes; Chart.js, dark mode, CSV, and printable report as the planned bonus; helper by keywords; working days Mon to Sat; Casual + Sick sharing one quota; approved leave paid; SHA-256 passwords; Admin-managed departments; announcements posted on `admin.html` and read on `employee.html`; PKR, 12-hour display, dates like "24 Oct 2026"; English only; classic scripts (no ES modules); light "why" comments; GitHub Pages hosting with relative paths. The two additions to the PDF's localStorage keys are `hcm_announcements` and `hcm_theme`.

## 12. Page-by-page spec
**`index.html`**: if no company or no Admin exists, show Setup (company name, Admin name, email, password, confirm, and the editable rule defaults: office start 09:00, grace 15 minutes, yearly leave quota 12, working days Mon to Sat). Otherwise show Login. After setup, setup is unreachable. A logged-in visitor is redirected to their dashboard. Layout is split (statement left, form right), not a centered card.

**`pages/admin.html`** (Admin only): Total employees (hero), Present, Late, On leave; "Today at a glance" segmented bar (on time, late, on leave, not in yet); pending leave requests as the inverted card with Approve/Reject; Checked in now; announcements composer and list; attendance register with a date picker showing every employee's status, check-in, check-out, hours; presence heatmap (departments x last 14 working days); check-in timeline; department bar chart and 14-day trend; helper chat; Export CSV for the chosen month.

**`pages/employees.html`** (Admin only): list with search (name or email) and department filter, "N of M employees", add and edit in a modal (name, email, department, salary, joining date, password with Generate), credentials shown once after adding, delete with a confirmation that states how many records go with it, per-employee attendance history, designed empty states.

**`pages/leaves.html`** (Admin only): tabs Pending (default), Approved, Rejected, All; each row shows employee, type, dates, days, reason, status, and comment; pending rows have Approve and Reject, opening a modal with the comment field (required on reject).

**`pages/settings.html`** (Admin only): company name, office start time, grace minutes, yearly leave quota, working-day pills, departments list (add; remove blocked while in use), optional Reset all data with typed confirmation. Each section validates and saves on its own.

**`pages/employee.html`** (Employee only): orange check-in card with a live clock, the rule line ("Office starts 09:00 AM, grace until 09:15 AM"), Check in / Check out; stat cards (present, late, half days, absent this month); month calendar and records table with a month select; leave balance (inverted card); apply-for-leave form with a live working-day count; my requests with status and Admin comment, and cancel for pending ones; announcements (read-only); helper chat.

**`pages/payslip.html`** (both roles): Employee sees their own. Admin has an employee select, plus a "Month summary" tab (all employees, totals, printable). Month select from the joining month to the current month. Slip shows company, employee, id, department, month, working days, present, late, half days, absent, paid leave days, per-day rate, deduction, net, in PKR with two decimals. Current month is labelled "Month to date, not final". Print button and A4 print CSS.

**Everywhere**: avatar menu with Change password and Log out, theme toggle, bell (announcements), forms with inline errors, escaped user text, relative paths, keyboard operable, 44px touch targets on mobile.

## 13. Scoring and submission
| Criteria | Pts | What judges look at |
|---|---|---|
| Features work | 35 | Setup, add employee, login per role, check-in, leave approval, payslip |
| Business rules | 20 | Late, half day, leave limits and payslip follow the Admin's settings |
| Smart helper | 15 | Correct answers from real data; Employees only see their own |
| UI and responsive | 15 | Clean layout, clear forms and errors, works on a phone |
| Clean code | 10 | Organized files, reusable functions, readable names |
| Demo and README | 5 | Clear demo; README explains how to use the app |

Bonus ideas add up to +10 points. Submit on the Saylani LMS (https://lms.saylaniit.com/): every student shares the **GitHub repo link** and the **hosted link** (GitHub Pages, Netlify or Vercel, all free). Start with login and employees, then attendance and leave. Small steps, working code.

## 14. Deliverables
A working static site in the structure from `docs/ARCHITECTURE.md`; `README.md` finished (links, screenshots in light and dark, how to use, demo steps); all boxes in `docs/TASKS.md` and `docs/TEST_CHECKLIST.md` ticked; `docs/PLAN.md` assumptions updated; a GitHub Pages deployment tested in a private window from an empty state.

## 15. Double-check before you say "done"
- [ ] All 7 pages exist, each guarded, each reachable from the nav of the right role.
- [ ] All 13 permission rows work for the right role and are blocked for the other.
- [ ] Setup runs once. Add employee creates a login that works.
- [ ] Late, half day, absent, one check-in per day, check-out only after check-in.
- [ ] Leave: date order, working days only, overlap, quota; approve and reject with a comment; balance updates.
- [ ] Payslip uses the exact formula; print works.
- [ ] Forms: required, email format, email unique, salary above 0, error beside the field.
- [ ] Helper answers every question in section 8 with real numbers; Employees get only their own data.
- [ ] The five brief keys are used exactly as named; the app starts empty.
- [ ] Responsive at 360px; dark and light complete; no banned design pattern.
- [ ] No secrets, no leftover logs, relative paths, README complete, repo and hosted links ready.
- [ ] `docs/REQUIREMENTS_TRACE.md` has no unbuilt rows.
