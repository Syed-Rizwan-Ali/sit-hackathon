# ARCHITECTURE.md

Static site, no build step. Everything runs in the browser. Read `BUSINESS_RULES.md` for what the code must do; this file says where and how.

## 1. Files
```
/                         repo root = site root (GitHub Pages)
├── index.html            login + first-run setup
├── pages/
│   ├── admin.html        Admin dashboard
│   ├── employees.html    manage employees
│   ├── leaves.html       leave requests (Admin)
│   ├── settings.html     company settings
│   ├── employee.html     Employee dashboard
│   └── payslip.html      payslip (both roles, scoped) + month summary (Admin)
├── css/
│   ├── style.css         tokens, base, components, layouts, responsive (one file, sectioned)
│   └── print.css         payslip and month-summary print rules
├── js/
│   ├── theme-boot.js     sets data-theme before first paint (loaded in <head>, blocking)
│   ├── icons.js          Icons.svg(name, opts)
│   ├── storage.js        Store, Clock
│   ├── utils.js          U (dates, money, validation, DOM, toast, modal)
│   ├── company.js        Company (settings, departments)
│   ├── auth.js           Auth
│   ├── leave.js          Leaves
│   ├── attendance.js     Attendance
│   ├── employees.js      Employees
│   ├── announcements.js  Announcements
│   ├── payslip.js        Payslip
│   ├── helper.js         Helper (answer logic + chat widget)
│   ├── charts.js         Charts (Chart.js wrappers, heatmap, timeline, segmented bar)
│   ├── export.js         Export (CSV, month summary)
│   ├── ui.js             UI (shell, nav, theme toggle, avatar menu, password modal)
│   └── pages/            index.js admin.js employees.js leaves.js settings.js employee.js payslip.js
├── README.md  AGENTS.md  MASTER_PROMPT.md
├── docs/                 these specs
└── .agent/               Antigravity rules and workflows
```
Use `../` in `pages/*.html` for css and js. Never a leading `/`. Filenames are lower-case.

## 2. Page skeleton and script order
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HCM — Dashboard</title>
  <script src="../js/theme-boot.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="shell"></div>          <!-- UI.mountShell fills top bar / tab bar -->
  <main id="main"></main>
  <div id="toast-root" aria-live="polite"></div>
  <div id="modal-root"></div>
  <!-- scripts, in this order; omit ones the page does not need, never reorder -->
  <script src="../js/icons.js"></script>
  <script src="../js/storage.js"></script>
  <script src="../js/utils.js"></script>
  <script src="../js/company.js"></script>
  <script src="../js/auth.js"></script>
  <script src="../js/leave.js"></script>
  <script src="../js/attendance.js"></script>
  <script src="../js/employees.js"></script>
  <script src="../js/announcements.js"></script>
  <script src="../js/payslip.js"></script>
  <script src="../js/helper.js"></script>
  <!-- admin.html and employee.html only: Chart.js with a pinned version, then charts.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="../js/charts.js"></script>
  <script src="../js/export.js"></script>
  <script src="../js/ui.js"></script>
  <script src="../js/pages/admin.js"></script>
</body>
</html>
```
`index.html` lives at the root, so its paths have no `../` (`css/style.css`, `js/...`). Cross-module calls happen at run time, so only load order of top-level code matters; the order above is safe. Chart.js may fail to load (offline): `Charts` must check `window.Chart` and show a plain "Charts unavailable offline" message instead of throwing. Verify the fonts URL loads; keep the fallback stacks.

## 3. Modules and public API
Each file is an IIFE: `const Store = (() => { ...; return { ... }; })();`. Signatures below are the contract between files; keep them stable.

**storage.js**
```
KEYS = { company:'hcm_company', users:'hcm_users', attendance:'hcm_attendance',
         leaves:'hcm_leaves', session:'hcm_session',
         announcements:'hcm_announcements', theme:'hcm_theme' }
Store.get(key, fallback)          // JSON.parse in try/catch
Store.set(key, value)             // JSON.stringify; catches quota errors; returns boolean
Store.update(key, fn, fallback)   // read, fn(value) returns new value, write
Store.remove(key)
Store.nextId(list)                // Date.now(), +1 until no list item has that id
Clock.now()                       // Date; honours localStorage.hcm_dev_now (ISO local, no Z)
Clock.todayStr()                  // "YYYY-MM-DD" from local parts
Clock.nowMinutes()                // minutes since local midnight
```
**utils.js (`U`)**
```
U.pad(n)  U.toDateStr(date)  U.parseDate("YYYY-MM-DD") -> local Date (never new Date(str))
U.addDays(dateStr, n)  U.eachDate(from, to)  U.weekday(dateStr)
U.isWorkingDay(dateStr, company)  U.workingDaysBetween(from, to, company)
U.workingDaysInMonth(year, month1to12, company)  U.daysInMonth(year, month1to12)
U.weekRange(dateStr) -> { from, to }   // Monday to Sunday
U.toMinutes("HH:MM")  U.minutesToTime(min)  U.time12("HH:MM") -> "09:12 AM"
U.dateLabel("2026-10-24") -> "Sat 24 Oct 2026"  U.monthLabel("2026-10") -> "October 2026"
U.pkr(n, decimals=0) -> "PKR 54,444.44" style via Intl.NumberFormat("en-PK")
U.esc(str)  U.initials(name)  U.byId(id)  U.h(tag, attrs, ...children)   // tiny DOM builder
U.validators: required, email, minLen, maxLen, intRange, positiveNumber
U.showFieldError(inputEl, message)  U.clearFieldError(inputEl)  U.focusFirstError(formEl)
U.toast(message, kind="info"|"success"|"error")
U.modal.open({ title, body, actions, onClose })  U.modal.close()  U.confirm({ title, body, confirmLabel, danger }) -> Promise<boolean>
```
**company.js (`Company`)**
```
Company.exists()  Company.get()  Company.create({ name, officeStart, graceMinutes, leaveQuota, workingDays })
Company.save(patch) -> { ok, errors }       // validates SET-1
Company.addDepartment(name) -> { ok, error }  Company.removeDepartment(name) -> { ok, error }
```
**auth.js (`Auth`)**
```
Auth.setupDone()  Auth.setup({ company, admin }) -> Promise<{ ok, errors }>
Auth.login(email, password) -> Promise<{ ok, error, user }>   Auth.logout()
Auth.current() -> user | null      Auth.requireRole('admin'|'employee'|'any')   // redirects; returns user
Auth.changePassword(userId, current, next) -> Promise<{ ok, errors }>
Auth.hash(password, salt) -> Promise<hex>   Auth.homeFor(role)   Auth.watchSession()  // storage event
```
**leave.js (`Leaves`)**
```
Leaves.validateApply(userId, form) -> { ok, errors, days }
Leaves.apply(userId, form) -> { ok, errors, leave }      Leaves.cancel(leaveId, userId)
Leaves.decide(leaveId, 'approved'|'rejected', comment, adminId) -> { ok, error }
Leaves.balance(userId, year) -> { quota, approved, pending, remaining }
Leaves.coversDate(userId, dateStr, { status:'approved' }) -> leave | null
Leaves.onLeaveOn(dateStr) -> [{ user, leave }]        Leaves.pending() -> leaves[]
Leaves.forUser(userId) -> leaves[]    Leaves.all(filter)   // Admin only
```
**attendance.js (`Attendance`)**
```
Attendance.checkIn(userId) -> { ok, error, record }    Attendance.checkOut(userId) -> { ok, error, record }
Attendance.today(userId) -> record | null              Attendance.forUser(userId, from, to) -> records[]
Attendance.dayStatus(userId, dateStr) -> { code, record, leave }
   // code: before_join | extra | present | late | half_day | weekly_off | on_leave | upcoming | pending_today | absent
Attendance.monthSummary(userId, 'YYYY-MM') -> { workingDays, present, late, half, absent, paidLeave, extra, days:[{date, code}] }
Attendance.todayOverview() -> { total, present, late, onTime, onLeave, notIn, checkedInNow, weeklyOff, byDept:[...], rows:[{user, code, record}] }
Attendance.registerFor(dateStr) -> rows (Admin register)
Attendance.presenceByDeptDays(n=14) -> { days:[dateStr], depts:[{ name, cells:[{date, present, total}] }] }
Attendance.trend(n=14) -> [{ date, present, late }]
Attendance.hoursThisWeek(userId) -> { hours, openRecords }
```
**employees.js (`Employees`)** — `list()`, `get(id)`, `validate(form, editingId)`, `add(form) -> Promise<{ok, errors, user, plainPassword}>`, `update(id, form)`, `remove(id)`, `search(query, department)`, `counts()`.
**announcements.js** — `Announcements.list()`, `post({title, body}, adminId)`, `remove(id)`, `unreadCount(user)`, `markSeen(user)`.
**payslip.js** — `Payslip.build(userId, 'YYYY-MM') -> { employee, month, workingDays, present, late, half, absent, paidLeave, perDay, deduction, net, isCurrentMonth }`, `Payslip.monthSummary('YYYY-MM') -> { rows, totals }` (Admin).
**helper.js** — `Helper.answer(text, user) -> { text, items? }` (pure, testable in console) and `Helper.mount(el, user)`.
**charts.js** — `Charts.deptBar(canvas, data)`, `Charts.trendLine(canvas, data)`, `Charts.heatmap(el, data)`, `Charts.segmented(el, parts)`, `Charts.timeline(el, data)`, `Charts.calendar(el, monthSummary)`. Chart.js colours are read from CSS variables at draw time and redrawn on theme change (`hcm:themechange` event).
**export.js** — `Export.attendanceCSV('YYYY-MM')` downloads `hcm-attendance-2026-10.csv` (UTF-8 BOM so Excel opens it; cells starting with `=`, `+`, `-`, `@` are prefixed with `'` to prevent formula injection).
**ui.js** — `UI.mountShell({ role, active })`, `UI.setTheme(theme)`, `UI.openPasswordModal()`, `UI.openBell()`.

## 4. Data shapes (localStorage, JSON)
| Key | Shape |
|---|---|
| `hcm_company` | `{ name, createdAt, officeStart:"09:00", graceMinutes:15, leaveQuota:12, workingDays:[1,2,3,4,5,6], departments:["..."] }` |
| `hcm_users` | `[{ id, name, email, password, salt, role:"admin"\|"employee", department, salary, joinedAt:"YYYY-MM-DD", createdAt, annSeenAt }]`. Admin has `department:""`, `salary:0`. `email` stored lower-case. `password` holds the SHA-256 hex hash. |
| `hcm_attendance` | `[{ id, userId, date, checkIn:"HH:MM", checkOut:"HH:MM"\|null, hours:number\|null, status:"present"\|"late"\|"half_day", late:boolean, offDay:boolean }]` |
| `hcm_leaves` | `[{ id, userId, type:"casual"\|"sick", from, to, days, reason, status:"pending"\|"approved"\|"rejected", comment, appliedAt, decidedAt, decidedBy }]` |
| `hcm_session` | `{ userId, role, loginAt }` |
| `hcm_announcements` | `[{ id, title, body, createdAt, authorId }]` newest first |
| `hcm_theme` | `"light"` or `"dark"`; absent means follow the system |
| `hcm_dev_now` | dev only: `"2026-10-26T09:16:00"` |

`absent`, `on_leave`, and `weekly_off` are never stored; they are derived (BR ATT-10).

## 5. Guards and session
- `Auth.requireRole(role)` runs first in every page controller. It reads `hcm_session`, loads the user, redirects if missing or the role is wrong, and returns the user.
- `Auth.watchSession()` listens to `window` `storage` events for `hcm_session` and `hcm_users` and re-runs the guard.
- **Demo trap**: all tabs in one browser share `hcm_session`. Logging in as an employee in a second tab logs the Admin out of the first. To show both roles at once, use a normal window and a private window. Say this in the README.
- Data functions that return user data take the viewer: `Attendance.forUser(userId, from, to, viewer)`; if `viewer.role === 'employee'` and `viewer.id !== userId`, return an empty result. Same for `Leaves`, `Payslip`, `Helper`.

## 6. Theme
`theme-boot.js` (blocking, in `<head>`):
```js
(function () {
  try {
    var saved = localStorage.getItem('hcm_theme');
    var theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
})();
```
`UI.setTheme` writes `hcm_theme`, updates the attribute, and dispatches `hcm:themechange`.

## 7. Rendering approach
- Pages render with `template` strings built from escaped values, then `main.innerHTML = ...`, then attach listeners with event delegation on stable containers (`data-action="approve"`).
- One `render()` function per view; after any mutation, call it again. No partial DOM patching.
- Long lists (employees table, register) render at most 200 rows; show "Showing first 200" if more.

## 8. Edge cases to handle
- Corrupt or missing JSON in any key: treated as empty; app does not crash.
- Quota exceeded on write: toast "Couldn't save. Storage is full." and the action is not applied.
- Employee deleted while logged in: next guard sends them to `index.html`.
- Admin changes working days while leave requests exist: stored `days` stay.
- Check-in after midnight on a different date: new day, new record; yesterday's open record stays open (ATT-7).
- Two tabs: guard re-runs on `storage`; each action re-reads from storage before writing.
- A half day is decided in minutes: `workedMinutes < 300`, not on the rounded hours value.
- Double-click on Check in: the button disables on first click, and `Attendance.checkIn` also rejects a second record.

## 9. Security notes (be honest in the README)
Everything is client-side. Hashing the password stops casual reading of localStorage but is not real security: anyone with access to the browser can edit the data. Escape user text to prevent script injection. Never store API keys in the repo.
