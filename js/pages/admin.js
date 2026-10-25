// HCM — Admin Dashboard Controller
// Overview metrics, today attendance register with date picker, segmented bar & checked-in now
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('admin');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: 'admin', active: 'admin' });

  const mainEl = U.byId('main');
  if (!mainEl) return;

  let selectedRegisterDate = Clock.todayStr();

  function render() {
    const todayStr = Clock.todayStr();
    const overview = Attendance.todayOverview();
    const registerRows = Attendance.registerFor(selectedRegisterDate);
    const comp = Company.get();

    mainEl.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-group">' +
          '<h1>Overview</h1>' +
          '<span class="page-subtitle">' + U.dateLabel(todayStr) + '</span>' +
        '</div>' +
      '</div>' +

      '<div class="grid-dashboard">' +
        // Main column (9 cols)
        '<div class="dashboard-main">' +
          // 1. Stat cards 4-grid
          '<div class="stat-grid-4">' +
            '<div class="card card-hero-accent">' +
              '<span class="stat-label">Employees</span>' +
              '<span class="stat-value stat-value-hero tabular-nums">' + overview.total + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">Present</span>' +
              '<span class="stat-value tabular-nums">' + overview.present + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">Late</span>' +
              '<span class="stat-value tabular-nums" style="color:var(--accent);">' + overview.late + '</span>' +
            '</div>' +
            '<div class="card">' +
              '<span class="stat-label">On Leave</span>' +
              '<span class="stat-value tabular-nums">' + overview.onLeave + '</span>' +
            '</div>' +
          '</div>' +

          // 2. Today at a glance: Segmented bar
          '<div class="card">' +
            '<div class="card-header">' +
              '<div>' +
                '<h2 class="card-title">Today at a Glance</h2>' +
                '<span class="card-subtitle">' +
                  (overview.weeklyOff ? 'Weekly off today — attendance counts as extra' : 'Office starts ' + U.time12(comp.officeStart || '09:00') + ' (+' + (comp.graceMinutes || 15) + 'm grace)') +
                '</span>' +
              '</div>' +
            '</div>' +
            renderSegmentedBar(overview) +
          '</div>' +

          // 3. Attendance Register Card
          '<div class="card">' +
            '<div class="card-header">' +
              '<div>' +
                '<h2 class="card-title">Attendance Register</h2>' +
                '<span class="card-subtitle">Employee check-ins and records for selected date</span>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:var(--s-2); flex-wrap:wrap;">' +
                '<label for="admin-register-date" class="form-hint" style="font-weight:600; text-transform:uppercase;">Date:</label>' +
                '<input type="date" id="admin-register-date" class="form-control" value="' + selectedRegisterDate + '" style="height:36px; padding:0 var(--s-3);">' +
                '<button type="button" id="btn-export-csv" class="btn btn-secondary btn-sm" aria-label="Export monthly attendance as CSV">' +
                  Icons.svg('download', { size: 16 }) +
                  '<span>Export CSV</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
            renderRegisterTable(registerRows, selectedRegisterDate) +
          '</div>' +

          // 4. Check-in Timeline Mount
          '<div id="admin-timeline-mount"></div>' +

          // 5. Presence Heatmap Mount
          '<div id="admin-heatmap-mount"></div>' +

          // 6. Department Bar & 14-day Trend Charts
          '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:var(--s-4);">' +
            '<div class="card">' +
              '<div class="card-header">' +
                '<div>' +
                  '<h2 class="card-title">Department Presence</h2>' +
                  '<span class="card-subtitle">Today\'s breakdown</span>' +
                '</div>' +
              '</div>' +
              '<div style="position:relative; height:220px;"><canvas id="chart-dept-bar"></canvas></div>' +
            '</div>' +
            '<div class="card">' +
              '<div class="card-header">' +
                '<div>' +
                  '<h2 class="card-title">14-Day Trend</h2>' +
                  '<span class="card-subtitle">Present vs late arrivals</span>' +
                '</div>' +
              '</div>' +
              '<div style="position:relative; height:220px;"><canvas id="chart-trend-line"></canvas></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // Rail (3 cols)
        '<div class="dashboard-rail">' +
          // Pending Leaves Inverted Card
          '<div class="card card-inverted">' +
            '<div class="card-header">' +
              '<div>' +
                '<h2 class="card-title">Pending Leave Requests</h2>' +
                '<span class="card-subtitle">Awaiting approval</span>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:var(--s-3);">' +
              '<span class="stat-label" style="color:var(--inv-text-2);">Pending requests</span>' +
              '<span class="tabular-nums font-mono" style="font-size:2rem; font-weight:700; color:var(--accent);">' +
                overview.pendingLeavesCount +
              '</span>' +
            '</div>' +
            '<a href="leaves.html" class="btn btn-secondary btn-sm" style="border-color:var(--inv-line); color:var(--inv-text); justify-content:center;">' +
              '<span>Review leaves</span>' +
            '</a>' +
          '</div>' +

          // Checked in Now Card
          '<div class="card">' +
            '<div class="card-header">' +
              '<div>' +
                '<h2 class="card-title">Checked In Now</h2>' +
                '<span class="card-subtitle">Currently active in office</span>' +
              '</div>' +
            '</div>' +
            '<div style="font-family:var(--font-display); font-size:2.5rem; font-weight:600; color:var(--accent); line-height:1; margin-bottom:var(--s-2);">' +
              overview.checkedInNow +
            '</div>' +
            '<p style="font-size:0.8125rem; color:var(--text-3);">' +
              (overview.checkedInNow === 1 ? '1 employee is currently clocked in' : overview.checkedInNow + ' employees are currently clocked in') +
            '</p>' +
          '</div>' +

          // Announcements Card (Composer + List)
          renderAnnouncementsCard() +

          // Helper Chat Container
          '<div id="admin-helper-mount"></div>' +
        '</div>' +
      '</div>';

    attachDashboardEvents();
  }

  function renderSegmentedBar(overview) {
    const total = overview.total;
    if (total === 0) {
      return '<p class="form-hint" style="font-style:italic;">No employees in company yet.</p>';
    }

    const onTimePct = Math.round((overview.onTime / total) * 100);
    const latePct = Math.round((overview.late / total) * 100);
    const leavePct = Math.round((overview.onLeave / total) * 100);
    const notInPct = Math.max(0, 100 - (onTimePct + latePct + leavePct));

    return (
      '<div>' +
        '<div class="segmented-bar-track" role="progressbar" aria-label="Presence breakdown">' +
          (onTimePct > 0 ? '<div class="segmented-bar-part part-on-time" style="width:' + onTimePct + '%;" title="On time: ' + overview.onTime + '"></div>' : '') +
          (latePct > 0 ? '<div class="segmented-bar-part part-late" style="width:' + latePct + '%;" title="Late: ' + overview.late + '"></div>' : '') +
          (leavePct > 0 ? '<div class="segmented-bar-part part-leave" style="width:' + leavePct + '%;" title="On leave: ' + overview.onLeave + '"></div>' : '') +
          (notInPct > 0 ? '<div class="segmented-bar-part part-not-in" style="width:' + notInPct + '%;" title="Not checked in: ' + overview.notIn + '"></div>' : '') +
        '</div>' +
        '<div class="segmented-legend">' +
          '<div class="legend-item"><span class="legend-dot" style="background:var(--accent);"></span><span>On time (' + overview.onTime + ')</span></div>' +
          '<div class="legend-item"><span class="legend-dot" style="background:var(--rose);"></span><span>Late (' + overview.late + ')</span></div>' +
          '<div class="legend-item"><span class="legend-dot" style="background:var(--cream); border:1px solid var(--line);"></span><span>On leave (' + overview.onLeave + ')</span></div>' +
          '<div class="legend-item"><span class="legend-dot" style="background:var(--surface-3);"></span><span>Not in (' + overview.notIn + ')</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderRegisterTable(rows, dateStr) {
    if (rows.length === 0) {
      return (
        '<div class="empty-state">' +
          '<h3 class="empty-state-title">No employees</h3>' +
          '<p class="empty-state-text">Add employees to see daily attendance records.</p>' +
        '</div>'
      );
    }

    return (
      '<div class="table-wrapper">' +
        '<table class="data-table table-stacked-mobile" aria-label="Daily attendance register">' +
          '<thead>' +
            '<tr>' +
              '<th>Employee</th>' +
              '<th>Department</th>' +
              '<th>Status</th>' +
              '<th>Check In</th>' +
              '<th>Check Out</th>' +
              '<th class="text-right">Hours</th>' +
              '<th class="text-right">Action</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            rows.map(r => {
              const emp = r.user;
              const rec = r.record;
              const initials = U.initials(emp.name);
              return (
                '<tr data-id="' + U.esc(emp.id) + '">' +
                  '<td data-label="Employee">' +
                    '<div class="user-cell">' +
                      '<div class="user-avatar-sm">' + U.esc(initials) + '</div>' +
                      '<div>' +
                        '<div class="user-meta-name">' + U.esc(emp.name) + '</div>' +
                        '<div class="user-meta-email">' + U.esc(emp.email) + '</div>' +
                      '</div>' +
                    '</div>' +
                  '</td>' +
                  '<td data-label="Department">' +
                    '<span class="chip" style="background:var(--surface-2); border:1px solid var(--line);">' +
                      U.esc(emp.department || 'Unassigned') +
                    '</span>' +
                  '</td>' +
                  '<td data-label="Status">' + renderStatusChip(r.code) + '</td>' +
                  '<td data-label="Check In" class="font-mono">' + (rec && rec.checkIn ? U.time12(rec.checkIn) : '—') + '</td>' +
                  '<td data-label="Check Out" class="font-mono">' + (rec && rec.checkOut ? U.time12(rec.checkOut) : '—') + '</td>' +
                  '<td data-label="Hours" class="text-right tabular-nums font-mono">' + (rec && rec.hours !== null ? rec.hours + ' hrs' : '—') + '</td>' +
                  '<td data-label="Action" class="text-right">' +
                    '<button type="button" class="btn btn-ghost btn-sm btn-view-history" data-id="' + U.esc(emp.id) + '" aria-label="View history for ' + U.esc(emp.name) + '">' +
                      Icons.svg('clock', { size: 16 }) +
                      '<span>History</span>' +
                    '</button>' +
                  '</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function renderStatusChip(code) {
    if (code === 'present') return '<span class="chip chip-present">' + Icons.svg('check', { size: 12 }) + ' Present</span>';
    if (code === 'late') return '<span class="chip chip-late">' + Icons.svg('clock', { size: 12 }) + ' Late</span>';
    if (code === 'half_day') return '<span class="chip chip-half">' + Icons.svg('clock', { size: 12 }) + ' Half Day</span>';
    if (code === 'on_leave') return '<span class="chip chip-leave">' + Icons.svg('calendar', { size: 12 }) + ' On Leave</span>';
    if (code === 'weekly_off') return '<span class="chip chip-off">Weekly Off</span>';
    if (code === 'extra') return '<span class="chip chip-present">' + Icons.svg('plus', { size: 12 }) + ' Extra</span>';
    if (code === 'absent') return '<span class="chip chip-absent">' + Icons.svg('x', { size: 12 }) + ' Absent</span>';
    if (code === 'pending_today') return '<span class="chip chip-pending">Not Checked In</span>';
    if (code === 'before_join') return '<span class="chip chip-absent" style="opacity:0.6;">Pre-joining</span>';
    return '<span class="chip">' + U.esc(code) + '</span>';
  }

  function attachDashboardEvents() {
    const dateInput = U.byId('admin-register-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        selectedRegisterDate = dateInput.value;
        render();
      });
    }

    // View history modal
    mainEl.querySelectorAll('.btn-view-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-view-history') || btn;
        const id = targetBtn.dataset.id;
        const emp = Employees.get(id);
        if (emp) openEmployeeHistoryModal(emp);
      });
    });

    // Announcements Form Submit
    const formAnn = U.byId('form-post-ann');
    if (formAnn) {
      const titleInput = U.byId('ann-title');
      const bodyInput = U.byId('ann-body');

      [titleInput, bodyInput].forEach(inp => {
        if (inp) inp.addEventListener('input', () => U.clearFieldError(inp));
      });

      formAnn.addEventListener('submit', (e) => {
        e.preventDefault();
        U.clearFieldError(titleInput);
        U.clearFieldError(bodyInput);

        const res = Announcements.post({
          title: titleInput.value.trim(),
          body: bodyInput.value.trim()
        }, user.id);

        if (!res.ok) {
          if (res.errors.title) U.showFieldError(titleInput, res.errors.title);
          if (res.errors.body) U.showFieldError(bodyInput, res.errors.body);
          U.focusFirstError(formAnn);
        } else {
          U.toast('Announcement posted.', 'success');
          render();
        }
      });
    }

    // Delete Announcement Buttons
    mainEl.querySelectorAll('.btn-delete-ann').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('.btn-delete-ann') || btn;
        const id = targetBtn.dataset.id;
        const confirmed = await U.confirm({
          title: 'Delete announcement?',
          body: 'Remove this announcement for all employees?',
          confirmLabel: 'Delete announcement',
          danger: true
        });

        if (!confirmed) return;

        Announcements.remove(id);
        U.toast('Announcement removed.', 'info');
        render();
      });
    });

    // CSV Export
    const exportBtn = U.byId('btn-export-csv');
    if (exportBtn && typeof Export !== 'undefined') {
      exportBtn.addEventListener('click', () => {
        const m = selectedRegisterDate ? selectedRegisterDate.slice(0, 7) : Clock.todayStr().slice(0, 7);
        Export.attendanceCSV(m);
        U.toast('Attendance CSV downloaded.');
      });
    }

    // Timeline Mount
    const tlMount = U.byId('admin-timeline-mount');
    if (tlMount && typeof Charts !== 'undefined') {
      Charts.timeline(tlMount, selectedRegisterDate);
    }

    // Heatmap Mount
    const hmMount = U.byId('admin-heatmap-mount');
    if (hmMount && typeof Charts !== 'undefined') {
      Charts.heatmap(hmMount);
    }

    // Department Bar & 14-day Trend Line Charts
    const deptCanvas = U.byId('chart-dept-bar');
    if (deptCanvas && typeof Charts !== 'undefined') {
      Charts.deptBar(deptCanvas);
    }
    const trendCanvas = U.byId('chart-trend-line');
    if (trendCanvas && typeof Charts !== 'undefined') {
      Charts.trendLine(trendCanvas);
    }

    // Helper Mount
    const helperMount = U.byId('admin-helper-mount');
    if (helperMount && typeof Helper !== 'undefined') {
      Helper.mount(helperMount, user);
    }
  }

  function renderAnnouncementsCard() {
    const list = (typeof Announcements !== 'undefined') ? Announcements.list() : [];

    return (
      '<div class="card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Announcements</h2>' +
            '<span class="card-subtitle">Post company updates</span>' +
          '</div>' +
        '</div>' +
        '<form id="form-post-ann" style="margin-bottom:var(--s-4);" novalidate>' +
          '<div class="form-group" style="margin-bottom:var(--s-2);">' +
            '<input type="text" id="ann-title" class="form-control" placeholder="Announcement title (2 to 80 chars)" maxlength="80" required style="height:36px; font-size:0.875rem;">' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:var(--s-2);">' +
            '<textarea id="ann-body" class="form-control" placeholder="Message content (2 to 500 chars)..." maxlength="500" required style="min-height:60px; font-size:0.875rem;"></textarea>' +
          '</div>' +
          '<div style="display:flex; justify-content:flex-end;">' +
            '<button type="submit" class="btn btn-primary btn-sm">Post announcement</button>' +
          '</div>' +
        '</form>' +
        '<div style="display:flex; flex-direction:column; gap:var(--s-2); max-height:240px; overflow-y:auto;">' +
          (list.length === 0
            ? '<p class="form-hint" style="font-style:italic;">No announcements posted yet.</p>'
            : list.map(item => {
                return (
                  '<div style="background:var(--surface-2); border-radius:var(--r-sm); border:1px solid var(--line); padding:var(--s-2) var(--s-3); font-size:0.8125rem;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:var(--s-2);">' +
                      '<strong style="color:var(--text);">' + U.esc(item.title) + '</strong>' +
                      '<button type="button" class="btn btn-ghost btn-sm btn-delete-ann" data-id="' + U.esc(item.id) + '" aria-label="Delete ' + U.esc(item.title) + '" style="padding:0; height:auto; color:var(--text-3);">' +
                        Icons.svg('trash', { size: 14 }) +
                      '</button>' +
                    '</div>' +
                    '<p style="color:var(--text-2); margin-top:2px;">' + U.esc(item.body) + '</p>' +
                    '<span class="form-hint" style="font-size:0.6875rem; display:block; margin-top:4px;">' + U.esc(item.createdAt) + '</span>' +
                  '</div>'
                );
              }).join('')
          ) +
        '</div>' +
      '</div>'
    );
  }

  function openEmployeeHistoryModal(emp) {
    const monthStr = Clock.todayStr().slice(0, 7);
    const summary = Attendance.monthSummary(emp.id, monthStr);
    const todayStr = Clock.todayStr();
    const visibleDays = summary.days.filter(d => d.date <= todayStr).reverse();

    const body = document.createElement('div');
    body.innerHTML =
      '<div style="margin-bottom:var(--s-4); display:flex; justify-content:space-between; align-items:baseline;">' +
        '<div>' +
          '<div style="font-weight:600; font-size:1.125rem;">' + U.esc(emp.name) + '</div>' +
          '<div class="form-hint">' + U.esc(emp.department || 'Unassigned') + ' &bull; ' + U.esc(emp.email) + '</div>' +
        '</div>' +
        '<div class="chip" style="background:var(--surface-2); border:1px solid var(--line);">' +
          U.monthLabel(monthStr) +
        '</div>' +
      '</div>' +
      '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--s-2); margin-bottom:var(--s-4); text-align:center;">' +
        '<div style="background:var(--surface-2); padding:var(--s-2); border-radius:var(--r-sm);">' +
          '<span class="form-hint">Present</span>' +
          '<div class="tabular-nums" style="font-weight:700; font-size:1.25rem;">' + summary.present + '</div>' +
        '</div>' +
        '<div style="background:var(--surface-2); padding:var(--s-2); border-radius:var(--r-sm);">' +
          '<span class="form-hint">Late</span>' +
          '<div class="tabular-nums" style="font-weight:700; font-size:1.25rem; color:var(--accent);">' + summary.late + '</div>' +
        '</div>' +
        '<div style="background:var(--surface-2); padding:var(--s-2); border-radius:var(--r-sm);">' +
          '<span class="form-hint">Half Day</span>' +
          '<div class="tabular-nums" style="font-weight:700; font-size:1.25rem;">' + summary.half + '</div>' +
        '</div>' +
        '<div style="background:var(--surface-2); padding:var(--s-2); border-radius:var(--r-sm);">' +
          '<span class="form-hint">Absent</span>' +
          '<div class="tabular-nums" style="font-weight:700; font-size:1.25rem; color:var(--danger);">' + summary.absent + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrapper" style="max-height:300px; overflow-y:auto;">' +
        '<table class="data-table" style="font-size:0.8125rem;">' +
          '<thead>' +
            '<tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th class="text-right">Hours</th></tr>' +
          '</thead>' +
          '<tbody>' +
            (visibleDays.length === 0
              ? '<tr><td colspan="5" style="text-align:center; padding:var(--s-4);">No attendance records yet</td></tr>'
              : visibleDays.map(d => {
                  const rec = d.record;
                  return (
                    '<tr>' +
                      '<td style="font-weight:600;">' + U.dateLabel(d.date) + '</td>' +
                      '<td>' + renderStatusChip(d.code) + '</td>' +
                      '<td class="font-mono">' + (rec && rec.checkIn ? U.time12(rec.checkIn) : '—') + '</td>' +
                      '<td class="font-mono">' + (rec && rec.checkOut ? U.time12(rec.checkOut) : '—') + '</td>' +
                      '<td class="text-right font-mono">' + (rec && rec.hours !== null ? rec.hours + 'h' : '—') + '</td>' +
                    '</tr>'
                  );
                }).join('')
            ) +
          '</tbody>' +
        '</table>' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML = '<button type="button" class="btn btn-primary modal-close">Done</button>';

    const m = U.modal.open({
      title: 'Attendance history',
      body: body,
      actions: actions
    });

    actions.querySelector('.modal-close').addEventListener('click', () => m.close());
  }

  // Initial render
  render();
})();
