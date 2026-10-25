// HCM — Payslip Page Controller
// Scoped payslip generator (Employee: own, Admin: all + month summary), print layout, unrounded deduction rates
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('any');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: user.role, active: 'payslip' });

  const mainEl = U.byId('main');
  if (!mainEl) return;

  const isAdmin = user.role === 'admin';
  const currentMonthStr = Clock.todayStr().slice(0, 7);

  let selectedMonth = currentMonthStr;
  let selectedEmpId = isAdmin ? (Employees.list()[0] ? Employees.list()[0].id : null) : user.id;
  let activeTab = 'slip'; // 'slip' | 'summary'

  function render() {
    const allEmployees = Employees.list();
    const currentEmp = isAdmin ? Employees.get(selectedEmpId) : user;

    mainEl.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-group">' +
          '<h1>' + (isAdmin && activeTab === 'summary' ? 'Payroll Month Summary' : 'Salary Payslip') + '</h1>' +
          '<span class="page-subtitle">' + U.monthLabel(selectedMonth) + '</span>' +
        '</div>' +
        '<div class="header-actions">' +
          '<button type="button" class="btn btn-secondary" id="btn-print-payslip">' +
            Icons.svg('printer', { size: 18 }) +
            '<span>Print</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // Controls Bar: Tabs (Admin only), Employee select (Admin only), Month Picker
      '<div style="background:var(--surface); border:1px solid var(--line); border-radius:var(--r-md); padding:var(--s-3) var(--s-4); margin-bottom:var(--s-5); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--s-3);">' +
        '<div style="display:flex; align-items:center; gap:var(--s-3); flex-wrap:wrap;">' +
          (isAdmin
            ? '<div class="tabs-pill" role="tablist">' +
                '<button type="button" class="tab-btn' + (activeTab === 'slip' ? ' active' : '') + '" data-tab="slip">Employee Slip</button>' +
                '<button type="button" class="tab-btn' + (activeTab === 'summary' ? ' active' : '') + '" data-tab="summary">Month Summary</button>' +
              '</div>'
            : '') +

          (isAdmin && activeTab === 'slip'
            ? '<div style="display:flex; align-items:center; gap:var(--s-2);">' +
                '<label for="payslip-emp-select" class="form-hint" style="font-weight:600; text-transform:uppercase;">Employee:</label>' +
                '<select id="payslip-emp-select" class="select-pill">' +
                  allEmployees.map(e => {
                    const sel = String(e.id) === String(selectedEmpId) ? ' selected' : '';
                    return '<option value="' + U.esc(e.id) + '"' + sel + '>' + U.esc(e.name) + ' (' + U.esc(e.department || 'Unassigned') + ')</option>';
                  }).join('') +
                '</select>' +
              '</div>'
            : '') +
        '</div>' +

        '<div style="display:flex; align-items:center; gap:var(--s-2);">' +
          '<label for="payslip-month-select" class="form-hint" style="font-weight:600; text-transform:uppercase;">Month:</label>' +
          '<input type="month" id="payslip-month-select" class="form-control" value="' + selectedMonth + '" max="' + currentMonthStr + '" style="height:36px; padding:0 var(--s-3); width:auto;">' +
        '</div>' +
      '</div>' +

      // Main content
      '<div id="payslip-view-area">' +
        (isAdmin && activeTab === 'summary'
          ? renderMonthSummary(selectedMonth)
          : renderSingleSlip(currentEmp, selectedMonth)) +
      '</div>';

    attachPageEvents(currentEmp);
  }

  function renderSingleSlip(emp, monthStr) {
    if (!emp) {
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            Icons.svg('wallet', { size: 48, className: 'empty-icon' }) +
            '<h2 class="empty-state-title">No employee selected</h2>' +
            '<p class="empty-state-text">Add employees to generate salary payslips.</p>' +
          '</div>' +
        '</div>'
      );
    }

    const slip = Payslip.build(emp.id, monthStr);
    if (!slip) {
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            '<h2 class="empty-state-title">Unable to generate payslip</h2>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="payslip-paper" id="printable-payslip">' +
        // Slip Header
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111111; padding-bottom:var(--s-4); margin-bottom:var(--s-4);">' +
          '<div>' +
            '<h2 style="font-size:1.5rem; font-weight:700; color:#111111; letter-spacing:-0.02em;">' + U.esc(slip.company.name || 'HCM') + '</h2>' +
            '<div style="font-size:0.875rem; color:#555555; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:2px;">Official Salary Slip</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div class="font-mono" style="font-size:1.125rem; font-weight:700; color:#111111;">' + U.monthLabel(slip.month) + '</div>' +
            (slip.isCurrentMonth
              ? '<span class="chip" style="background:#FFF3E0; color:#B8460A; border:1px solid #FFE0B2; font-weight:600; margin-top:4px;">Month to date, not final</span>'
              : '<span class="chip" style="background:#E8F5E9; color:#2E7D32; border:1px solid #C8E6C9; font-weight:600; margin-top:4px;">Final Payroll</span>') +
          '</div>' +
        '</div>' +

        // Employee Details (2-col grid)
        '<div class="payslip-grid" style="margin-top:0;">' +
          '<div>' +
            '<div class="payslip-row"><span>Employee Name:</span><strong>' + U.esc(emp.name) + '</strong></div>' +
            '<div class="payslip-row"><span>Employee ID:</span><span class="font-mono">' + U.esc(emp.id) + '</span></div>' +
            '<div class="payslip-row"><span>Department:</span><span>' + U.esc(emp.department || 'Unassigned') + '</span></div>' +
          '</div>' +
          '<div>' +
            '<div class="payslip-row"><span>Joining Date:</span><span>' + U.dateLabel(emp.joinedAt) + '</span></div>' +
            '<div class="payslip-row"><span>Working Days in Month:</span><strong class="font-mono">' + slip.workingDays + ' days</strong></div>' +
            '<div class="payslip-row"><span>Paid Approved Leaves:</span><span class="font-mono">' + slip.paidLeave + ' days</span></div>' +
          '</div>' +
        '</div>' +

        // Attendance Breakdown
        '<h3 style="font-size:1rem; font-weight:700; margin-top:var(--s-5); margin-bottom:var(--s-2); color:#111111; border-bottom:1px solid #DDDDDD; padding-bottom:var(--s-2);">Attendance Breakdown</h3>' +
        '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:var(--s-3); margin-bottom:var(--s-5); text-align:center;">' +
          '<div style="background:#F9F9F9; padding:var(--s-3); border-radius:var(--r-sm); border:1px solid #EEEEEE;">' +
            '<span style="font-size:0.75rem; color:#666666; text-transform:uppercase;">Present Days</span>' +
            '<div class="font-mono" style="font-size:1.25rem; font-weight:700; color:#111111;">' + slip.present + '</div>' +
          '</div>' +
          '<div style="background:#F9F9F9; padding:var(--s-3); border-radius:var(--r-sm); border:1px solid #EEEEEE;">' +
            '<span style="font-size:0.75rem; color:#666666; text-transform:uppercase;">Late Arrivals</span>' +
            '<div class="font-mono" style="font-size:1.25rem; font-weight:700; color:#111111;">' + slip.late + '</div>' +
            '<span style="font-size:0.6875rem; color:#888888;">(No deduction)</span>' +
          '</div>' +
          '<div style="background:#F9F9F9; padding:var(--s-3); border-radius:var(--r-sm); border:1px solid #EEEEEE;">' +
            '<span style="font-size:0.75rem; color:#666666; text-transform:uppercase;">Half Days (&lt;5h)</span>' +
            '<div class="font-mono" style="font-size:1.25rem; font-weight:700; color:#111111;">' + slip.half + '</div>' +
            '<span style="font-size:0.6875rem; color:#888888;">(0.5 day each)</span>' +
          '</div>' +
          '<div style="background:#F9F9F9; padding:var(--s-3); border-radius:var(--r-sm); border:1px solid #EEEEEE;">' +
            '<span style="font-size:0.75rem; color:#666666; text-transform:uppercase;">Absent Days</span>' +
            '<div class="font-mono" style="font-size:1.25rem; font-weight:700; color:#D32F2F;">' + slip.absent + '</div>' +
          '</div>' +
        '</div>' +

        // Earnings & Deductions Table
        '<table style="width:100%; border-collapse:collapse; margin-bottom:var(--s-4); font-size:0.9375rem;">' +
          '<thead>' +
            '<tr style="background:#F0F0F0; border-bottom:1px solid #DDDDDD;">' +
              '<th style="padding:var(--s-2) var(--s-3); text-align:left;">Description</th>' +
              '<th style="padding:var(--s-2) var(--s-3); text-align:right;">Rate / Units</th>' +
              '<th style="padding:var(--s-2) var(--s-3); text-align:right;">Amount (PKR)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr style="border-bottom:1px solid #EEEEEE;">' +
              '<td style="padding:var(--s-2) var(--s-3);">Base Monthly Salary</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right;" class="font-mono">Full Month</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right; font-weight:600;" class="font-mono">' + U.pkr(slip.salary, 2) + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #EEEEEE;">' +
              '<td style="padding:var(--s-2) var(--s-3);">Per-Day Working Rate (unrounded: ' + U.pkr(slip.perDayUnrounded, 4) + ')</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right;" class="font-mono">1 / ' + slip.workingDays + '</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right;" class="font-mono">' + U.pkr(slip.perDay, 2) + '</td>' +
            '</tr>' +
            '<tr style="border-bottom:1px solid #EEEEEE; color:#D32F2F;">' +
              '<td style="padding:var(--s-2) var(--s-3);">' +
                'Absence & Half-day Deductions' +
                '<div style="font-size:0.75rem; color:#666666;">(' + slip.absent + ' absent + 0.5 &times; ' + slip.half + ' half = ' + (slip.absent + 0.5 * slip.half) + ' days)</div>' +
              '</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right;" class="font-mono">' + (slip.absent + 0.5 * slip.half) + ' days</td>' +
              '<td style="padding:var(--s-2) var(--s-3); text-align:right; font-weight:600;" class="font-mono">-' + U.pkr(slip.deduction, 2) + '</td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +

        // Net Pay Box
        '<div class="payslip-net-box">' +
          '<div>' +
            '<div style="font-size:0.875rem; font-weight:700; text-transform:uppercase; color:#333333;">Net Payable Amount</div>' +
            '<div style="font-size:0.75rem; color:#777777;">Base Salary minus unapproved absence deductions</div>' +
          '</div>' +
          '<div class="payslip-net-amount font-mono">' +
            U.pkr(slip.net, 2) +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderMonthSummary(monthStr) {
    const summaryData = Payslip.monthSummary(monthStr);
    const rows = summaryData.rows;
    const totals = summaryData.totals;

    if (rows.length === 0) {
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            Icons.svg('wallet', { size: 48, className: 'empty-icon' }) +
            '<h2 class="empty-state-title">No employees found</h2>' +
            '<p class="empty-state-text">Add employees to see the company monthly payroll summary.</p>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="table-wrapper" id="printable-summary">' +
        '<table class="data-table" aria-label="Monthly payroll summary">' +
          '<thead>' +
            '<tr>' +
              '<th>Employee</th>' +
              '<th>Department</th>' +
              '<th class="text-right">Working Days</th>' +
              '<th class="text-right">Present</th>' +
              '<th class="text-right">Half Days</th>' +
              '<th class="text-right">Absent</th>' +
              '<th class="text-right">Salary (PKR)</th>' +
              '<th class="text-right">Deduction (PKR)</th>' +
              '<th class="text-right">Net Pay (PKR)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            rows.map(r => {
              const emp = r.employee;
              return (
                '<tr>' +
                  '<td>' +
                    '<div style="font-weight:600;">' + U.esc(emp.name) + '</div>' +
                    '<div class="form-hint" style="font-size:0.75rem;">' + U.esc(emp.email) + '</div>' +
                  '</td>' +
                  '<td>' + U.esc(emp.department || 'Unassigned') + '</td>' +
                  '<td class="text-right font-mono">' + r.workingDays + '</td>' +
                  '<td class="text-right font-mono">' + r.present + '</td>' +
                  '<td class="text-right font-mono">' + r.half + '</td>' +
                  '<td class="text-right font-mono" style="color:var(--danger);">' + r.absent + '</td>' +
                  '<td class="text-right font-mono">' + U.pkr(r.salary, 2) + '</td>' +
                  '<td class="text-right font-mono" style="color:var(--danger);">' + (r.deduction > 0 ? '-' + U.pkr(r.deduction, 2) : '0.00') + '</td>' +
                  '<td class="text-right font-mono" style="font-weight:700;">' + U.pkr(r.net, 2) + '</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="background:var(--surface-2); font-weight:700; border-top:2px solid var(--line);">' +
              '<td colspan="6">Company Totals (' + totals.totalEmployees + ' employees)</td>' +
              '<td class="text-right font-mono">' + U.pkr(totals.totalSalary, 2) + '</td>' +
              '<td class="text-right font-mono" style="color:var(--danger);">' + (totals.totalDeductions > 0 ? '-' + U.pkr(totals.totalDeductions, 2) : '0.00') + '</td>' +
              '<td class="text-right font-mono" style="font-weight:700; color:var(--accent);">' + U.pkr(totals.totalNet, 2) + '</td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
      '</div>'
    );
  }

  function attachPageEvents(currentEmp) {
    // Print Button (PAY-12)
    const btnPrint = U.byId('btn-print-payslip');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    // Month Selector
    const monthSelect = U.byId('payslip-month-select');
    if (monthSelect) {
      if (currentEmp && currentEmp.joinedAt) {
        monthSelect.min = currentEmp.joinedAt.slice(0, 7);
      }
      monthSelect.addEventListener('change', () => {
        selectedMonth = monthSelect.value;
        render();
      });
    }

    // Admin Tabs
    mainEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    // Employee Selector (Admin only)
    const empSelect = U.byId('payslip-emp-select');
    if (empSelect) {
      empSelect.addEventListener('change', () => {
        selectedEmpId = empSelect.value;
        const newEmp = Employees.get(selectedEmpId);
        if (newEmp && newEmp.joinedAt && selectedMonth < newEmp.joinedAt.slice(0, 7)) {
          selectedMonth = newEmp.joinedAt.slice(0, 7);
        }
        render();
      });
    }
  }

  // Initial render
  render();
})();
