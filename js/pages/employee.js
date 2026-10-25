// HCM — Employee Dashboard Controller
// Live clock, check-in hero card, month summary stats, attendance history, leave balance & leave application
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('employee');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: 'employee', active: 'employee' });

  const mainEl = U.byId('main');
  if (!mainEl) return;

  let currentMonthStr = Clock.todayStr().slice(0, 7); // "YYYY-MM"
  let clockInterval = null;

  function render() {
    const todayStr = Clock.todayStr();
    const comp = Company.get();
    const todayRecord = Attendance.today(user.id);
    const monthData = Attendance.monthSummary(user.id, currentMonthStr);
    const myLeaves = (typeof Leaves !== 'undefined') ? Leaves.forUser(user.id, user) : [];

    mainEl.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-group">' +
          '<h1>Today</h1>' +
          '<span class="page-subtitle">' + U.dateLabel(todayStr) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="grid-employee">' +
        // Main column (8 cols)
        '<div class="dashboard-main">' +
          // 1. Orange Check-in Hero Card
          renderHeroCard(comp, todayRecord, todayStr) +

          // 2. Month Stat 4-grid
          '<div class="stat-grid-4">' +
            '<div class="card">' +
              '<span class="stat-label">Present</span>' +
              '<span class="stat-value tabular-nums">' + monthData.present + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">Late</span>' +
              '<span class="stat-value tabular-nums" style="color:var(--accent);">' + monthData.late + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">Half Day</span>' +
              '<span class="stat-value tabular-nums">' + monthData.half + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">Absent</span>' +
              '<span class="stat-value tabular-nums" style="color:var(--danger);">' + monthData.absent + '</span>' +
            '</div>' +
          '</div>' +

          // 3. Attendance Month Records Table
          '<div class="card">' +
            '<div class="card-header">' +
              '<div>' +
                '<h2 class="card-title">My Attendance History</h2>' +
                '<span class="card-subtitle">' + U.monthLabel(currentMonthStr) + '</span>' +
              '</div>' +
              '<div>' +
                '<input type="month" id="emp-month-picker" class="form-control" value="' + currentMonthStr + '" max="' + Clock.todayStr().slice(0, 7) + '" style="height:36px; padding:0 var(--s-3);">' +
              '</div>' +
            '</div>' +
            renderAttendanceTable(monthData.days) +
          '</div>' +

          // 4. Month Calendar View
          '<div id="emp-calendar-mount"></div>' +

          // 5. Apply for Leave & My Requests (Phase 4)
          renderLeaveSection(comp, myLeaves) +
        '</div>' +

        // Rail (4 cols)
        '<div class="dashboard-rail">' +
          // Leave Balance Inverted Card
          renderLeaveBalanceCard(comp) +

          // Work Info Card
          '<div class="card">' +
            '<h2 class="card-title" style="margin-bottom:var(--s-3);">My Work Details</h2>' +
            '<div style="display:flex; flex-direction:column; gap:var(--s-3); font-size:0.875rem;">' +
              '<div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:var(--s-2);">' +
                '<span style="color:var(--text-2);">Department</span>' +
                '<span style="font-weight:600;">' + U.esc(user.department || 'Unassigned') + '</span>' +
              '</div>' +
              '<div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:var(--s-2);">' +
                '<span style="color:var(--text-2);">Joining Date</span>' +
                '<span style="font-weight:600;">' + U.dateLabel(user.joinedAt) + '</span>' +
              '</div>' +
              '<div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--line); padding-bottom:var(--s-2);">' +
                '<span style="color:var(--text-2);">Office Hours</span>' +
                '<span style="font-weight:600;">' + U.time12(comp.officeStart || '09:00') + ' (+' + (comp.graceMinutes || 15) + 'm grace)</span>' +
              '</div>' +
              '<div style="display:flex; justify-content:space-between;">' +
                '<span style="color:var(--text-2);">Monthly Base Salary</span>' +
                '<span class="font-mono" style="font-weight:600;">' + U.pkr(user.salary, 0) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Announcements Card (Read-only)
          renderEmployeeAnnouncementsCard() +

          // Helper Chat Container
          '<div id="employee-helper-mount"></div>' +
        '</div>' +
      '</div>';

    attachDashboardEvents();
    startLiveClock();
  }

  function renderHeroCard(comp, todayRecord, todayStr) {
    const isWork = U.isWorkingDay(todayStr, comp);
    const officeTime = U.time12(comp.officeStart || '09:00');
    const graceMin = comp.graceMinutes !== undefined ? comp.graceMinutes : 15;

    let statusSubtitle = 'Office starts at ' + officeTime + ' (Grace: ' + graceMin + ' mins)';
    if (!isWork) {
      statusSubtitle = 'Today is a weekly off day. Check-ins are marked as extra attendance.';
    }

    let actionButton = '';
    let recordNote = '';

    if (!todayRecord) {
      actionButton =
        '<button type="button" id="btn-hero-checkin" class="btn btn-hero-check">' +
          Icons.svg('log-in', { size: 20 }) +
          '<span>Check in</span>' +
        '</button>';
    } else if (!todayRecord.checkOut) {
      recordNote = '<div style="font-size:0.9375rem; margin-bottom:var(--s-3); opacity:0.9;">' +
        'Checked in at <strong>' + U.time12(todayRecord.checkIn) + '</strong> (' + (todayRecord.late ? 'Late' : 'On time') + ')' +
        '</div>';
      actionButton =
        '<button type="button" id="btn-hero-checkout" class="btn btn-hero-check">' +
          Icons.svg('log-out', { size: 20 }) +
          '<span>Check out</span>' +
        '</button>';
    } else {
      recordNote = '<div style="font-size:0.9375rem; margin-bottom:var(--s-3); opacity:0.9;">' +
        'Checked in: <strong>' + U.time12(todayRecord.checkIn) + '</strong> &bull; ' +
        'Checked out: <strong>' + U.time12(todayRecord.checkOut) + '</strong> &bull; ' +
        'Hours: <strong>' + todayRecord.hours + ' hrs</strong> (' + formatStatusLabel(todayRecord.status) + ')' +
        '</div>';
      actionButton =
        '<button type="button" class="btn btn-hero-check" disabled style="opacity:0.75; cursor:default;">' +
          Icons.svg('check', { size: 20 }) +
          '<span>Completed for today</span>' +
        '</button>';
    }

    const now = Clock.now();
    const timeFormatted = U.pad(now.getHours() % 12 || 12) + ':' + U.pad(now.getMinutes()) + ':' + U.pad(now.getSeconds()) + ' ' + (now.getHours() >= 12 ? 'PM' : 'AM');

    return (
      '<div class="card card-hero-accent">' +
        '<span class="stat-label">Current Time</span>' +
        '<div class="live-clock" id="live-clock-display">' + timeFormatted + '</div>' +
        '<p style="font-size:0.875rem; opacity:0.85; margin-bottom:var(--s-4);">' + statusSubtitle + '</p>' +
        recordNote +
        '<div>' + actionButton + '</div>' +
      '</div>'
    );
  }

  function formatStatusLabel(code) {
    if (code === 'present') return 'Present';
    if (code === 'late') return 'Late';
    if (code === 'half_day') return 'Half Day';
    if (code === 'on_leave') return 'On Leave';
    if (code === 'weekly_off') return 'Weekly Off';
    if (code === 'extra') return 'Weekly Off (Extra)';
    if (code === 'absent') return 'Absent';
    if (code === 'pending_today') return 'Not Checked In Yet';
    if (code === 'before_join') return 'Before Joining';
    return code;
  }

  function renderStatusChip(code) {
    if (code === 'present') return '<span class="chip chip-present">' + Icons.svg('check', { size: 12 }) + ' Present</span>';
    if (code === 'late') return '<span class="chip chip-late">' + Icons.svg('clock', { size: 12 }) + ' Late</span>';
    if (code === 'half_day') return '<span class="chip chip-half">' + Icons.svg('clock', { size: 12 }) + ' Half Day</span>';
    if (code === 'on_leave') return '<span class="chip chip-leave">' + Icons.svg('calendar', { size: 12 }) + ' On Leave</span>';
    if (code === 'weekly_off') return '<span class="chip chip-off">Weekly Off</span>';
    if (code === 'extra') return '<span class="chip chip-present">' + Icons.svg('plus', { size: 12 }) + ' Extra</span>';
    if (code === 'absent') return '<span class="chip chip-absent">' + Icons.svg('x', { size: 12 }) + ' Absent</span>';
    if (code === 'pending_today') return '<span class="chip chip-pending">Pending Check-in</span>';
    if (code === 'before_join') return '<span class="chip chip-absent" style="opacity:0.6;">Pre-joining</span>';
    return '<span class="chip">' + U.esc(code) + '</span>';
  }

  function renderAttendanceTable(days) {
    const todayStr = Clock.todayStr();
    const visibleDays = days.filter(d => d.date <= todayStr).reverse();

    if (visibleDays.length === 0) {
      return (
        '<div class="empty-state">' +
          '<h3 class="empty-state-title">No records for this month</h3>' +
          '<p class="empty-state-text">Attendance check-ins for this month will appear here.</p>' +
        '</div>'
      );
    }

    return (
      '<div class="table-wrapper">' +
        '<table class="data-table table-stacked-mobile" aria-label="Attendance history">' +
          '<thead>' +
            '<tr>' +
              '<th>Date</th>' +
              '<th>Status</th>' +
              '<th>Check In</th>' +
              '<th>Check Out</th>' +
              '<th class="text-right">Hours</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            visibleDays.map(d => {
              const rec = d.record;
              return (
                '<tr>' +
                  '<td data-label="Date" style="font-weight:600;">' + U.dateLabel(d.date) + '</td>' +
                  '<td data-label="Status">' + renderStatusChip(d.code) + '</td>' +
                  '<td data-label="Check In" class="font-mono">' + (rec && rec.checkIn ? U.time12(rec.checkIn) : '—') + '</td>' +
                  '<td data-label="Check Out" class="font-mono">' + (rec && rec.checkOut ? U.time12(rec.checkOut) : '—') + '</td>' +
                  '<td data-label="Hours" class="text-right tabular-nums font-mono">' + (rec && rec.hours !== null ? rec.hours + ' hrs' : '—') + '</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function renderLeaveBalanceCard(comp) {
    if (typeof Leaves === 'undefined') return '';
    const yearStr = Clock.todayStr().slice(0, 4);
    const bal = Leaves.balance(user.id, yearStr);

    return (
      '<div class="card card-inverted">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Leave Balance</h2>' +
            '<span class="card-subtitle">Calendar Year ' + yearStr + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:var(--s-3);">' +
          '<span style="font-size:0.875rem; color:var(--inv-text-2);">Available quota</span>' +
          '<span class="tabular-nums" style="font-family:var(--font-display); font-size:2rem; font-weight:600; color:var(--accent);">' +
            bal.remaining + '<span style="font-size:1rem; font-weight:normal; color:var(--inv-text-2);"> / ' + bal.quota + ' days</span>' +
          '</span>' +
        '</div>' +
        '<div style="display:flex; gap:var(--s-3); border-top:1px solid var(--inv-line); padding-top:var(--s-3); font-size:0.8125rem;">' +
          '<div>' +
            '<span style="color:var(--inv-text-2);">Approved: </span>' +
            '<strong style="color:var(--inv-text);">' + bal.approved + ' days</strong>' +
          '</div>' +
          '<div>' +
            '<span style="color:var(--inv-text-2);">Pending: </span>' +
            '<strong style="color:var(--peach);">' + bal.pending + ' days</strong>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderLeaveSection(comp, myLeaves) {
    return (
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Request Leave</h2>' +
            '<span class="card-subtitle">Apply for casual or sick leave and track your requests</span>' +
          '</div>' +
        '</div>' +

        // Application Form
        '<form id="form-apply-leave" style="margin-bottom:var(--s-5);" novalidate>' +
          '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--s-3);">' +
            '<div class="form-group">' +
              '<label class="form-label" for="leave-type">Leave type</label>' +
              '<select id="leave-type" class="form-control" required>' +
                '<option value="casual">Casual Leave</option>' +
                '<option value="sick">Sick Leave</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="leave-from">From date</label>' +
              '<input type="date" id="leave-from" class="form-control" required>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="leave-to">To date</label>' +
              '<input type="date" id="leave-to" class="form-control" required>' +
            '</div>' +
          '</div>' +

          // Live day count display
          '<div id="leave-live-calc" style="font-size:0.8125rem; color:var(--text-2); margin-bottom:var(--s-3); display:none; align-items:center; gap:var(--s-2); background:var(--surface-2); padding:var(--s-2) var(--s-3); border-radius:var(--r-sm);">' +
            Icons.svg('calendar', { size: 14 }) +
            '<span id="leave-live-calc-text"></span>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label" for="leave-reason">Reason</label>' +
            '<textarea id="leave-reason" class="form-control" placeholder="Brief explanation for leave request (3 to 200 characters)..." maxlength="200" required></textarea>' +
          '</div>' +

          '<div style="display:flex; justify-content:flex-end;">' +
            '<button type="submit" class="btn btn-primary" id="btn-submit-leave">Submit leave request</button>' +
          '</div>' +
        '</form>' +

        // My Requests Table
        '<h3 style="font-size:1rem; margin-bottom:var(--s-3); border-top:1px solid var(--line); padding-top:var(--s-4);">My Leave Requests</h3>' +
        (myLeaves.length === 0
          ? '<p class="form-hint" style="font-style:italic;">You have not submitted any leave requests yet.</p>'
          : '<div class="table-wrapper">' +
              '<table class="data-table table-stacked-mobile" aria-label="My leave requests">' +
                '<thead>' +
                  '<tr><th>Type</th><th>Dates</th><th class="text-right">Days</th><th>Reason</th><th>Status</th><th class="text-right">Action</th></tr>' +
                '</thead>' +
                '<tbody>' +
                  myLeaves.map(l => {
                    const typeLabel = l.type === 'sick' ? 'Sick' : 'Casual';
                    return (
                      '<tr>' +
                        '<td data-label="Type"><span class="chip" style="background:var(--surface-2); border:1px solid var(--line);">' + U.esc(typeLabel) + '</span></td>' +
                        '<td data-label="Dates" style="font-weight:600;">' + U.dateLabel(l.from) + ' &rarr; ' + U.dateLabel(l.to) + '</td>' +
                        '<td data-label="Days" class="text-right font-mono tabular-nums">' + l.days + ' d</td>' +
                        '<td data-label="Reason" style="max-width:200px; font-size:0.8125rem;">' +
                          '<div>' + U.esc(l.reason) + '</div>' +
                          (l.comment ? '<div style="font-size:0.75rem; color:var(--text-3); margin-top:2px;"><strong>Admin:</strong> ' + U.esc(l.comment) + '</div>' : '') +
                        '</td>' +
                        '<td data-label="Status">' +
                          (l.status === 'approved' ? '<span class="chip chip-approved">Approved</span>' :
                            (l.status === 'rejected' ? '<span class="chip chip-rejected">Rejected</span>' : '<span class="chip chip-pending">Pending</span>')) +
                        '</td>' +
                        '<td data-label="Action" class="text-right">' +
                          (l.status === 'pending'
                            ? '<button type="button" class="btn btn-ghost btn-sm btn-cancel-leave" data-id="' + U.esc(l.id) + '" style="color:var(--danger);">' +
                                Icons.svg('x', { size: 14 }) +
                                '<span>Cancel</span>' +
                              '</button>'
                            : '<span class="form-hint" style="font-size:0.75rem;">' + (l.status === 'approved' ? 'Active' : 'Closed') + '</span>') +
                        '</td>' +
                      '</tr>'
                    );
                  }).join('') +
                '</tbody>' +
              '</table>' +
            '</div>'
        ) +
      '</div>'
    );
  }

  function startLiveClock() {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const el = U.byId('live-clock-display');
      if (el) {
        const now = Clock.now();
        el.textContent = U.pad(now.getHours() % 12 || 12) + ':' + U.pad(now.getMinutes()) + ':' + U.pad(now.getSeconds()) + ' ' + (now.getHours() >= 12 ? 'PM' : 'AM');
      }
    }, 1000);
  }

  function attachDashboardEvents() {
    const btnCheckin = U.byId('btn-hero-checkin');
    if (btnCheckin) {
      btnCheckin.addEventListener('click', () => {
        btnCheckin.disabled = true;
        const res = Attendance.checkIn(user.id);
        if (!res.ok) {
          btnCheckin.disabled = false;
          U.toast(res.error, 'error');
        } else {
          U.toast('Checked in at ' + U.time12(res.record.checkIn) + (res.record.late ? ' (Late arrival)' : ' (On time)'), 'success');
          render();
        }
      });
    }

    const btnCheckout = U.byId('btn-hero-checkout');
    if (btnCheckout) {
      btnCheckout.addEventListener('click', () => {
        btnCheckout.disabled = true;
        const res = Attendance.checkOut(user.id);
        if (!res.ok) {
          btnCheckout.disabled = false;
          U.toast(res.error, 'error');
        } else {
          U.toast('Checked out at ' + U.time12(res.record.checkOut) + ' (' + res.record.hours + ' hrs)', 'success');
          render();
        }
      });
    }

    const monthPicker = U.byId('emp-month-picker');
    if (monthPicker) {
      monthPicker.addEventListener('change', () => {
        currentMonthStr = monthPicker.value;
        render();
      });
    }

    // Leave Apply Form Events
    const formApply = U.byId('form-apply-leave');
    if (formApply) {
      const typeSelect = U.byId('leave-type');
      const fromInput = U.byId('leave-from');
      const toInput = U.byId('leave-to');
      const reasonInput = U.byId('leave-reason');
      const liveCalc = U.byId('leave-live-calc');
      const liveCalcText = U.byId('leave-live-calc-text');
      const comp = Company.get();

      function updateLiveCount() {
        const f = fromInput.value;
        const t = toInput.value;
        if (f && t && f <= t && f.slice(0, 4) === t.slice(0, 4)) {
          const count = U.workingDaysBetween(f, t, comp);
          if (liveCalc && liveCalcText) {
            liveCalc.style.display = 'inline-flex';
            liveCalcText.textContent = 'This request covers ' + count + ' working day' + (count === 1 ? '' : 's') + '.';
          }
        } else if (liveCalc) {
          liveCalc.style.display = 'none';
        }
      }

      fromInput.addEventListener('change', () => {
        U.clearFieldError(fromInput);
        if (!toInput.value) toInput.value = fromInput.value;
        updateLiveCount();
      });

      toInput.addEventListener('change', () => {
        U.clearFieldError(toInput);
        updateLiveCount();
      });

      [typeSelect, reasonInput].forEach(inp => {
        if (inp) inp.addEventListener('input', () => U.clearFieldError(inp));
      });

      formApply.addEventListener('submit', (e) => {
        e.preventDefault();
        [typeSelect, fromInput, toInput, reasonInput].forEach(inp => U.clearFieldError(inp));

        const formData = {
          type: typeSelect.value,
          from: fromInput.value,
          to: toInput.value,
          reason: reasonInput.value
        };

        const res = Leaves.apply(user.id, formData);
        if (!res.ok) {
          if (res.errors.type) U.showFieldError(typeSelect, res.errors.type);
          if (res.errors.from) U.showFieldError(fromInput, res.errors.from);
          if (res.errors.to) U.showFieldError(toInput, res.errors.to);
          if (res.errors.reason) U.showFieldError(reasonInput, res.errors.reason);
          U.focusFirstError(formApply);
        } else {
          U.toast('Leave request submitted successfully.', 'success');
          render();
        }
      });
    }

    // Cancel Leave Buttons
    mainEl.querySelectorAll('.btn-cancel-leave').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('.btn-cancel-leave') || btn;
        const id = targetBtn.dataset.id;
        const confirmed = await U.confirm({
          title: 'Cancel leave request?',
          body: 'Are you sure you want to cancel this pending leave request?',
          confirmLabel: 'Cancel request',
          danger: true
        });

        if (!confirmed) return;

        const res = Leaves.cancel(id, user.id);
        if (!res.ok) {
          U.toast(res.error, 'error');
        } else {
          U.toast('Leave request cancelled.', 'info');
          render();
        }
      });
    });

    // Calendar Mount
    const calMount = U.byId('emp-calendar-mount');
    if (calMount && typeof Charts !== 'undefined') {
      const currentMonthStr = (U.byId('emp-month-picker') && U.byId('emp-month-picker').value) || Clock.todayStr().slice(0, 7);
      const summ = Attendance.monthSummary(user.id, currentMonthStr);
      Charts.calendar(calMount, summ, user);
    }

    // Helper Mount
    const helperMount = U.byId('employee-helper-mount');
    if (helperMount && typeof Helper !== 'undefined') {
      Helper.mount(helperMount, user);
    }
  }

  function renderEmployeeAnnouncementsCard() {
    const list = (typeof Announcements !== 'undefined') ? Announcements.list() : [];

    return (
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Announcements</h2>' +
            '<span class="card-subtitle">Company bulletins & updates</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:var(--s-3); max-height:260px; overflow-y:auto;">' +
          (list.length === 0
            ? '<p class="form-hint" style="font-style:italic;">No company announcements at this time.</p>'
            : list.map(item => {
                return (
                  '<div style="background:var(--surface-2); border-radius:var(--r-sm); border:1px solid var(--line); padding:var(--s-3); font-size:0.875rem;">' +
                    '<div style="font-weight:600; color:var(--text); margin-bottom:2px;">' + U.esc(item.title) + '</div>' +
                    '<p style="color:var(--text-2); font-size:0.8125rem; line-height:1.4;">' + U.esc(item.body) + '</p>' +
                    '<span class="form-hint" style="font-size:0.6875rem; display:block; margin-top:4px;">' + U.esc(item.createdAt) + '</span>' +
                  '</div>'
                );
              }).join('')
          ) +
        '</div>' +
      '</div>'
    );
  }

  // Initial render
  render();
})();
