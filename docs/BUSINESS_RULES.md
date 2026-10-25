# BUSINESS_RULES.md

Every rule has an ID. Tests and tasks cite these IDs. Where the PDF brief is silent, the choice made here is marked **(assumption)**.

## 0. Conventions
- **Date string**: local `YYYY-MM-DD`. **Time string**: local `HH:MM`, 24-hour. Compare times as minutes since midnight.
- **Weekday numbers**: 0 = Sunday ... 6 = Saturday. A **working day** is a date whose weekday is in `hcm_company.workingDays`. **Default working days: Mon to Sat (1 to 6)**, because the hackathon is on a Saturday; the Admin can change it in Settings.
- **Today** is always `Clock.todayStr()`. Rules read the Admin's *current* settings at the moment of the action.
- **Present** means the employee has an attendance record for that date (status present, late, or half_day).

## 1. Auth and setup (AUTH)
| ID | Rule |
|---|---|
| AUTH-1 | If `hcm_company` is missing or `hcm_users` has no admin, `index.html` shows **Setup**, not Login. After setup, the setup form is unreachable, even by editing the URL. |
| AUTH-2 | Setup collects company name, Admin name, Admin email, password, confirm password. It also shows the rule defaults (office start 09:00, grace 15, yearly quota 12, working days Mon to Sat), editable, with the note that they can be changed later in Settings. Departments start empty. Submitting creates `hcm_company`, creates the Admin in `hcm_users`, starts a session, and goes to `pages/admin.html`. |
| AUTH-3 | Login: email trimmed and case-insensitive; password compared by hash. Unknown email and wrong password give the same message: "Email or password is incorrect." On success write `hcm_session = { userId, role, loginAt }` and redirect by role (admin to `pages/admin.html`, employee to `pages/employee.html`). |
| AUTH-4 | Every page except `index.html` runs `Auth.requireRole(...)` before rendering. No session, or session user no longer exists: go to `index.html`. Wrong role: go to the user's own dashboard. Admin-only pages: admin, employees, leaves, settings. Employee-only: employee. Both roles (scoped): payslip. |
| AUTH-5 | Opening `index.html` while logged in redirects to the user's dashboard. |
| AUTH-6 | Logout removes `hcm_session` only. |
| AUTH-7 | Change password (avatar menu, every page): current password required and correct; new password at least 6 characters, different from current; confirmation matches. |
| AUTH-8 | A `storage` event on `hcm_session` or `hcm_users` re-runs the guard, so a stale tab cannot act as the wrong user. |
| AUTH-9 | Passwords are stored as SHA-256 of `salt + password` (Web Crypto), with a random 16-byte hex `salt` per user. The `password` field holds the hex hash. If `crypto.subtle` is unavailable, show a blocking message explaining that the page must be opened over HTTPS or localhost. **(assumption)** |
| AUTH-10 | Exactly one Admin exists (created in setup). The Admin cannot be deleted. |

## 2. Company settings (SET)
| ID | Rule |
|---|---|
| SET-1 | Fields: company name (2 to 60 chars), office start time (`HH:MM`), grace minutes (whole number 0 to 120), yearly leave quota (whole number 1 to 365), working days (at least one of 0 to 6). |
| SET-2 | Departments are a list in `hcm_company.departments`. Add: trimmed, 2 to 40 chars, unique case-insensitively. Remove: blocked, with a message, while any employee belongs to it. **(assumption)** |
| SET-3 | Changes apply from the next action. They never rewrite stored history: `late` is fixed at check-in, and a leave request keeps the `days` computed when it was filed. Working-day changes do change how absent days and payslips are *calculated*, because those are derived live. |
| SET-4 | Optional: "Reset all data" in Settings clears every `hcm_*` key after a typed confirmation (`RESET`), then returns to Setup. **(assumption)** |

## 3. Employees (EMP)
| ID | Rule |
|---|---|
| EMP-1 | Add form fields: name, email, department (from the list, with an inline "add department" shortcut), monthly salary (PKR), joining date (default today, not in the future), initial password (with a "Generate" button). |
| EMP-2 | Adding an employee creates the login in the same action: one `hcm_users` record with `role: "employee"`. |
| EMP-3 | After adding, show the email and the plain password **once** in a confirmation panel with a copy button. It cannot be shown again because only the hash is stored. |
| EMP-4 | Edit: all fields except role. Email uniqueness excludes the employee being edited. A "new password" field is optional and resets the login if filled. |
| EMP-5 | Delete: confirmation modal states how many attendance and leave records will be removed; confirming removes the user and cascades to `hcm_attendance` and `hcm_leaves`. If that user is logged in elsewhere, the next guard check logs them out. |
| EMP-6 | List: search by name or email (trimmed, case-insensitive substring) AND department filter ("All departments"). Show "N of M employees". Two distinct empty states: no employees at all, and no matches. |
| EMP-7 | `joinedAt` is stored on every user (not in the brief; needed so a mid-month hire is not marked absent for earlier days). **(assumption)** |

## 4. Attendance (ATT)
| ID | Rule |
|---|---|
| ATT-1 | One record per employee per date: `{ id, userId, date, checkIn, checkOut, hours, status, late, offDay }`. |
| ATT-2 | **Check-in**: blocked if a record already exists today ("You already checked in today at 09:12 AM."). Blocked if approved leave covers today ("You're on approved leave today."). Allowed on a non-working day: stored with `offDay: true`, `late: false`, `status: "present"`, shown as "Weekly off, extra attendance", and ignored by payslip rules. **(assumption)** |
| ATT-3 | **Late**: `checkInMinutes > officeStartMinutes + graceMinutes`. Exactly start + grace is on time. `status = late ? "late" : "present"`; `late` is also stored as a boolean. |
| ATT-4 | **Check-out**: requires today's record with a check-in and no check-out. Otherwise "Check in first." or "You already checked out at 05:30 PM." Only once per day. |
| ATT-5 | `hours = (checkOutMinutes - checkInMinutes) / 60`, rounded to 2 decimals. If check-out is earlier than check-in (clock changed), block: "Check-out can't be earlier than check-in." |
| ATT-6 | **Half day**: `hours < 5` sets `status = "half_day"` (the `late` flag is kept). `hours >= 5` leaves status as present or late. Exactly 5.00 hours is a full day. |
| ATT-7 | A record with no check-out on a past date counts as present (or late) with hours shown as an em dash. It is not a half day and is not auto-closed. |
| ATT-8 | **Absent**: date is a working day, `joinedAt <= date < today`, no record, and no approved leave covering it. **Today is never absent**; show "Not checked in yet". |
| ATT-9 | **On leave**: an approved leave covers the date, the date is a working day, and there is no attendance record. |
| ATT-10 | Day status priority (`Attendance.dayStatus`): before joining, then has record (`extra` if offDay, else its status), then weekly off, then on leave, then upcoming (after today), then pending today, else absent. |
| ATT-11 | **Admin dashboard counts** (today): *Total employees* = users with role employee. *Present* = employees with a record today. *Late* = records today with `late: true`. *On leave* = approved leave covering today, no record. *Not in yet* = working today, joined, no record, not on leave. *Checked in now* = record today with no check-out. *Pending leaves* = status pending. On a non-working day, *Not in yet* is 0 and the dashboard says "Weekly off". |
| ATT-12 | **Week** = Monday to Sunday containing today. Hours this week = sum of `hours` for records in that week; records still open are excluded and the answer says so. |
| ATT-13 | **Access**: Admin sees all records. An employee reads only `Attendance.forUser(session.userId)`; data functions take a `viewerId` and refuse other users' data for employees. |

## 5. Leave (LV)
| ID | Rule |
|---|---|
| LV-1 | Types: `casual` and `sick`, sharing one yearly quota. **(assumption)** |
| LV-2 | Apply fields: type, from, to, reason (3 to 200 chars). New requests are `pending`. |
| LV-3 | `from <= to`. Error under the To field. |
| LV-4 | `from` and `to` are in the same calendar year. **(assumption)** |
| LV-5 | `days` = count of working days between from and to inclusive. If 0, error "This range has no working days." The count is shown live while the employee fills the form. |
| LV-6 | No overlap: the inclusive date range must not intersect the same employee's pending or approved requests. Rejected requests are ignored. The error names the conflicting range. |
| LV-7 | **Quota**: `approvedDays(year) + pendingDays(year) + requestedDays <= leaveQuota`. Otherwise "You have N day(s) left this year; this request needs M." |
| LV-8 | **Decision**: Admin approves or rejects with a comment. Comment is required on reject (at least 3 chars) and optional on approve. Stores `status`, `comment`, `decidedAt`, `decidedBy`. Decisions are final. |
| LV-9 | On approve, re-check the quota against approved days only (`approved + days <= quota`); if it fails (quota was lowered), block approval with a message. Reject is always allowed. |
| LV-10 | **Balance** = `quota - approvedDays(year)`. Also show pending days. Approving reduces the balance; rejecting releases the pending reservation. |
| LV-11 | An employee may cancel their own request while it is pending (the record is removed). **(assumption)** |
| LV-12 | **Access**: Admin sees all requests; an employee sees only their own. Admin list filters: Pending (default), Approved, Rejected, All. |

## 6. Payslip (PAY)
| ID | Rule |
|---|---|
| PAY-1 | Month picker: from the employee's joining month to the current month. Future months are disabled. |
| PAY-2 | `workingDaysInMonth` = dates in that calendar month whose weekday is a working day (full month, even for mid-month joiners). |
| PAY-3 | `perDay = salary / workingDaysInMonth`. |
| PAY-4 | `absentDays` = absent days (ATT-8) in the month. For the current month only dates before today count. |
| PAY-5 | `halfDays` = records in the month with `status = "half_day"` on working days. |
| PAY-6 | `deduction = round2(perDay * (absentDays + 0.5 * halfDays))`. `net = round2(salary - deduction)`. Compute from the unrounded `perDay`; display `perDay` to 2 decimals. |
| PAY-7 | Approved-leave working days in the month are **paid** and listed for information. Late arrivals have no pay effect. Records on non-working days are ignored. **(assumption)** |
| PAY-8 | Days before the joining date are not counted as absent and salary is not prorated for mid-month joiners (the brief's formula has no proration). State this in the README. **(assumption)** |
| PAY-9 | The current month is labelled "Month to date, not final". |
| PAY-10 | Slip contents: company name, employee name, id, department, month, working days, present, late, half days, absent, paid leave days, per-day rate, deduction, net. PKR with 2 decimals. |
| PAY-11 | Employee sees only their own slip. Admin picks any employee. |
| PAY-12 | Print button calls `window.print()`; `css/print.css` makes an A4 black-on-white page without navigation, in either theme. "Save as PDF" is the browser's print dialog. |
| PAY-13 | Admin-only "Month summary" tab on `payslip.html`: one row per employee (working days, present, half, absent, deduction, net) with totals; printable. This is the printable monthly report (bonus). |

## 7. Forms (FRM)
| ID | Rule |
|---|---|
| FRM-1 | Required fields are trimmed and non-empty. |
| FRM-2 | Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`. |
| FRM-3 | Email must be unique across all users (Admin included), case-insensitive. |
| FRM-4 | Salary is a finite number greater than 0 and at most 10,000,000. |
| FRM-5 | Each error is a `<p class="field-error" id="{field}-error">` directly under its field, with `aria-invalid="true"` and `aria-describedby` on the input, an icon, and text. Focus the first invalid field. Errors clear when the user edits the field. No `alert()`. |
| FRM-6 | Validate on submit; after the first failed submit, also validate on blur. Disable the submit button while saving. |

Messages (use exactly, so tests can match):
| Case | Message |
|---|---|
| Company name | Enter a company name (2 to 60 characters). |
| Person name | Enter a name (2 to 60 characters). |
| Email empty / invalid | Enter an email. / Enter a valid email, like name@company.com. |
| Email taken | This email is already used by another account. |
| Password short | Use at least 6 characters. |
| Confirm mismatch | Passwords don't match. |
| Wrong current password | Current password is incorrect. |
| Same new password | Choose a password different from the current one. |
| Department | Choose a department. |
| Salary | Enter a salary greater than 0. |
| Joining date | Joining date can't be in the future. |
| Start time | Enter a start time. |
| Grace | Enter whole minutes between 0 and 120. |
| Quota | Enter whole days between 1 and 365. |
| Working days | Select at least one working day. |
| Department name | Enter a department name (2 to 40 characters). / That department already exists. |
| Leave type / dates | Choose a leave type. / Choose a start date. / Choose an end date. |
| To before From | End date must be on or after the start date. |
| Cross-year | A request can't span two calendar years. Split it into two requests. |
| No working days | This range has no working days. |
| Overlap | Overlaps your {status} leave from {from} to {to}. |
| Over quota | You have {n} day(s) left this year; this request needs {m}. |
| Reason | Enter a reason (3 to 200 characters). |
| Reject comment | Add a comment explaining the rejection. |
| Announcement | Enter a title (2 to 80 characters). / Enter a message (2 to 500 characters). |

## 8. Smart helper (HLP)
| ID | Rule |
|---|---|
| HLP-1 | Rule-based keyword matching in `js/helper.js`. No network, instant answers, no typing animation. The UI never claims to be a language model; the label reads "Answers come from your HCM data." |
| HLP-2 | Normalise input: lower-case, trim, strip punctuation, collapse spaces. Match with `includes` and small regexes. Check intents in the listed order; first match wins. |
| HLP-3 | Answers contain real numbers computed by `Attendance`, `Leaves`, `Employees`, `Company`, `Payslip`. The helper never re-implements a rule. |
| HLP-4 | Admin: all data. Employee: own data only; the helper is constructed with the session user and can only call own-data functions. |
| HLP-5 | Zero results are stated plainly ("Nobody is on leave today."). Name lists show at most 10, then "and N more". |
| HLP-6 | Fallback: "I can't answer that yet. Try one of these:" plus role-specific suggestion chips. Chips are also shown under the input at all times. |

**Admin intents (priority order)**
| # | Trigger | Answer |
|---|---|---|
| A1 | `pending` | "N leave request(s) waiting for approval." plus up to 3 oldest (name, dates). |
| A2 | `leave` and one of `today`, `now`, `who`, `how many` | "N employee(s) on leave today: X casual, Y sick." plus names. Zero: "Nobody is on leave today." |
| A3 | `late` | "N employee(s) were late today:" names with check-in times. |
| A4 | `absent`, `not in`, `not checked`, `missing` | "N employee(s) haven't checked in yet:" names. |
| A5 | `present`, `checked in`, `in office`, `attendance` | "N present today (K late), M on leave." |
| A6 | `department` or a department name | Headcount per department, or that department's count. |
| A7 | `how many` with `employee`, `staff`, `people`, `headcount`, `team` | "You have N employees in D department(s)." |
| A8 | `office`, `start`, `grace`, `quota`, `working days`, `hours` | Current settings in a sentence. |
| A9 | `help`, `hi`, `hello`, `what can you` | What the helper can answer. |

**Employee intents (priority order)**
| # | Trigger | Answer |
|---|---|---|
| E0 | `employees`, `everyone`, `colleagues`, `team`, `staff`, another user's name, or `who` without `i`/`my` | "I can only answer questions about your own attendance and leave." |
| E1 | `leave` with `left`, `remaining`, `balance`, `quota`, `many`, `available` | "You have X leave day(s) left this year (quota Q, approved A, pending P)." |
| E2 | `leave` or `request` with `status`, `approved`, `rejected`, `pending`, `last`, `latest` | Latest request: dates, status, Admin comment. None: "You haven't requested any leave." |
| E3 | `late` | "Yes, you checked in at 09:31 AM, 16 minutes after the grace period ended (09:15 AM)." / "No, you checked in on time at 08:58 AM." / "You haven't checked in yet today." |
| E4 | `hours` with `week` | "You worked H hours this week (Monday to today)." with the open-record note if needed. |
| E5 | `hours` with `today`, or `check in`, `check out`, `when did i` | Today's check-in, check-out, and hours so far. |
| E6 | `attendance`, `absent`, `present`, `half` | This month: present, late, half days, absent. |
| E7 | `salary`, `payslip`, `net`, `deduction`, `pay` | Month-to-date net and deduction with the reason. |
| E8 | `help`, `hi`, `hello` | What the helper can answer. |

## 9. Test vectors
Setup for all vectors: office start 09:00, grace 15, quota 12, working days Mon to Fri unless stated. Dates are in 2026. 24 Oct 2026 is a Saturday.

| ID | Case | Expected |
|---|---|---|
| V-01 | Check-in 09:15 | status present, late false |
| V-02 | Check-in 09:16 | status late, late true |
| V-03 | Check-in 08:00 | present, late false |
| V-04 | Check-in 09:00, check-out 13:59 | hours 4.98, status half_day |
| V-05 | Check-in 09:00, check-out 14:00 | hours 5.00, status present |
| V-06 | Check-in 09:30 (late), check-out 13:00 | half_day, late true |
| V-07 | Second check-in same day | blocked with message |
| V-08 | Check-out with no check-in | blocked: "Check in first." |
| V-09 | Second check-out same day | blocked |
| V-10 | Check-in on Saturday (Mon to Fri setting) | allowed, offDay true, not late |
| V-11 | Leave Mon 19 Oct to Wed 21 Oct | days = 3 |
| V-12 | Leave Fri 23 Oct to Mon 26 Oct, Mon to Fri | days = 2 |
| V-13 | Same range, Mon to Sat | days = 3 |
| V-14 | Leave Sat 24 Oct to Sun 25 Oct, Mon to Fri | error: no working days |
| V-15 | From 21 Oct, To 19 Oct | error under To field |
| V-16 | 30 Dec 2026 to 4 Jan 2027 | cross-year error |
| V-17 | Second request overlapping a pending or approved one | overlap error naming the range |
| V-18 | Quota 12, approved 10, request 3 | over-quota error ("2 day(s) left") |
| V-19 | Quota 12, approved 8, pending 2, request 3 | over-quota error ("2 day(s) left") |
| V-20 | Reject without comment | blocked; with comment: status rejected, pending released |
| V-21 | Approve 3-day request | balance drops by 3 |
| V-22 | Payslip: salary 60,000, Oct 2026, Mon to Fri (22 working days), 2 absent, 1 half day | perDay 2,727.27; deduction 6,818.18; net 53,181.82 |
| V-23 | Same data with Mon to Sat (27 working days) | perDay 2,222.22; deduction 5,555.56; net 54,444.44 |
| V-24 | Employee joined today, payslip for this month | no absent days from before joining; net = salary |
| V-25 | Add employee with an email already used (different case) | email error beside the field |
| V-26 | Salary 0 or -5 or empty | salary error beside the field |
| V-27 | Employee opens `pages/admin.html` by URL | redirected to `pages/employee.html` |
| V-28 | Logged-out visitor opens any inner page | redirected to `index.html` |
| V-29 | Employee asks the helper "how many employees do we have?" | privacy reply, no number |
| V-30 | Admin asks "who is on leave today?" with 3 casual + 2 sick approved | "5 employee(s) on leave today: 3 casual, 2 sick." plus names |
