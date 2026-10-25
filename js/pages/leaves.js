// HCM — Leaves Page Controller (Admin)
// Review leave requests, segmented tabs (pending/approved/rejected/all), approval and rejection with comments
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('admin');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: 'admin', active: 'leaves' });

  const mainEl = U.byId('main');
  if (!mainEl) return;

  let activeTab = 'pending'; // 'pending' | 'approved' | 'rejected' | 'all'

  function render() {
    const allLeaves = Leaves.getAll();
    const pendingList = Leaves.pending();
    const filtered = Leaves.all(activeTab);

    mainEl.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-group">' +
          '<h1>Leave Requests</h1>' +
          '<span class="page-subtitle">' +
            (pendingList.length === 1
              ? '1 request awaiting review'
              : pendingList.length + ' requests awaiting review') +
          '</span>' +
        '</div>' +
      '</div>' +

      // Segmented Tabs Pill
      '<div style="margin-bottom:var(--s-5); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--s-3);">' +
        '<div class="tabs-pill" role="tablist" aria-label="Leave request filters">' +
          '<button type="button" class="tab-btn' + (activeTab === 'pending' ? ' active' : '') + '" data-tab="pending" role="tab" aria-selected="' + (activeTab === 'pending') + '">' +
            '<span>Pending</span>' +
            (pendingList.length > 0 ? ' <span class="nav-badge" style="font-size:0.6875rem; min-width:16px; height:16px; margin-left:4px;">' + pendingList.length + '</span>' : '') +
          '</button>' +
          '<button type="button" class="tab-btn' + (activeTab === 'approved' ? ' active' : '') + '" data-tab="approved" role="tab" aria-selected="' + (activeTab === 'approved') + '">Approved</button>' +
          '<button type="button" class="tab-btn' + (activeTab === 'rejected' ? ' active' : '') + '" data-tab="rejected" role="tab" aria-selected="' + (activeTab === 'rejected') + '">Rejected</button>' +
          '<button type="button" class="tab-btn' + (activeTab === 'all' ? ' active' : '') + '" data-tab="all" role="tab" aria-selected="' + (activeTab === 'all') + '">All Requests</button>' +
        '</div>' +
      '</div>' +

      // Main content: table or empty state
      '<div id="leaves-content-area">' +
        renderLeavesTable(filtered) +
      '</div>';

    attachPageEvents();
  }

  function renderLeavesTable(list) {
    if (list.length === 0) {
      let emptyMsg = 'No leave requests waiting for review.';
      if (activeTab === 'approved') emptyMsg = 'No approved leave requests.';
      if (activeTab === 'rejected') emptyMsg = 'No rejected leave requests.';
      if (activeTab === 'all') emptyMsg = 'No leave requests submitted yet.';

      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            Icons.svg('calendar', { size: 48, className: 'empty-icon' }) +
            '<h2 class="empty-state-title">No requests found</h2>' +
            '<p class="empty-state-text">' + emptyMsg + '</p>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="table-wrapper">' +
        '<table class="data-table table-stacked-mobile" aria-label="Leave requests list">' +
          '<thead>' +
            '<tr>' +
              '<th>Employee</th>' +
              '<th>Type</th>' +
              '<th>Dates</th>' +
              '<th class="text-right">Days</th>' +
              '<th>Reason</th>' +
              '<th>Status</th>' +
              '<th class="text-right" style="min-width:180px;">Actions</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            list.map(l => {
              const emp = Employees.get(l.userId);
              const name = emp ? emp.name : 'Unknown Employee';
              const email = emp ? emp.email : '';
              const initials = U.initials(name);
              const typeLabel = l.type === 'sick' ? 'Sick Leave' : 'Casual Leave';

              return (
                '<tr data-id="' + U.esc(l.id) + '">' +
                  '<td data-label="Employee">' +
                    '<div class="user-cell">' +
                      '<div class="user-avatar-sm">' + U.esc(initials) + '</div>' +
                      '<div>' +
                        '<div class="user-meta-name">' + U.esc(name) + '</div>' +
                        '<div class="user-meta-email">' + U.esc(email) + '</div>' +
                      '</div>' +
                    '</div>' +
                  '</td>' +
                  '<td data-label="Type">' +
                    '<span class="chip" style="background:var(--surface-2); border:1px solid var(--line);">' +
                      U.esc(typeLabel) +
                    '</span>' +
                  '</td>' +
                  '<td data-label="Dates">' +
                    '<div style="font-weight:600;">' + U.dateLabel(l.from) + ' &rarr; ' + U.dateLabel(l.to) + '</div>' +
                  '</td>' +
                  '<td data-label="Days" class="text-right tabular-nums font-mono" style="font-weight:600;">' +
                    l.days + ' d' +
                  '</td>' +
                  '<td data-label="Reason" style="max-width:240px; font-size:0.8125rem;">' +
                    '<div>' + U.esc(l.reason) + '</div>' +
                    (l.comment ? '<div style="margin-top:4px; font-size:0.75rem; color:var(--text-3);"><strong>Note:</strong> ' + U.esc(l.comment) + '</div>' : '') +
                  '</td>' +
                  '<td data-label="Status">' +
                    renderStatusChip(l.status) +
                  '</td>' +
                  '<td data-label="Actions" class="text-right">' +
                    (l.status === 'pending'
                      ? '<div style="display:inline-flex; gap:var(--s-2);">' +
                          '<button type="button" class="btn btn-sm btn-primary btn-approve-leave" data-id="' + U.esc(l.id) + '">' +
                            Icons.svg('check', { size: 14 }) +
                            '<span>Approve</span>' +
                          '</button>' +
                          '<button type="button" class="btn btn-sm btn-danger btn-reject-leave" data-id="' + U.esc(l.id) + '">' +
                            Icons.svg('x', { size: 14 }) +
                            '<span>Reject</span>' +
                          '</button>' +
                        '</div>'
                      : '<span class="form-hint" style="font-size:0.75rem;">' +
                          (l.decidedAt ? 'Decided ' + l.decidedAt.slice(0, 10) : 'Completed') +
                        '</span>'
                    ) +
                  '</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function renderStatusChip(status) {
    if (status === 'approved') return '<span class="chip chip-approved">' + Icons.svg('check', { size: 12 }) + ' Approved</span>';
    if (status === 'rejected') return '<span class="chip chip-rejected">' + Icons.svg('x', { size: 12 }) + ' Rejected</span>';
    return '<span class="chip chip-pending">' + Icons.svg('clock', { size: 12 }) + ' Pending</span>';
  }

  function attachPageEvents() {
    // Tab switching
    mainEl.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    // Approve buttons
    mainEl.querySelectorAll('.btn-approve-leave').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-approve-leave') || btn;
        const id = targetBtn.dataset.id;
        const leaves = Leaves.getAll();
        const leave = leaves.find(l => String(l.id) === String(id));
        if (leave) openDecisionModal(leave, 'approved');
      });
    });

    // Reject buttons
    mainEl.querySelectorAll('.btn-reject-leave').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-reject-leave') || btn;
        const id = targetBtn.dataset.id;
        const leaves = Leaves.getAll();
        const leave = leaves.find(l => String(l.id) === String(id));
        if (leave) openDecisionModal(leave, 'rejected');
      });
    });
  }

  function openDecisionModal(leave, decision) {
    const isApprove = decision === 'approved';
    const emp = Employees.get(leave.userId);
    const empName = emp ? emp.name : 'Employee';
    const year = leave.from.slice(0, 4);
    const bal = Leaves.balance(leave.userId, year);

    const form = document.createElement('form');
    form.id = 'decision-modal-form';
    form.noValidate = true;

    form.innerHTML =
      '<div style="background:var(--surface-2); border:1px solid var(--line); border-radius:var(--r-md); padding:var(--s-3); margin-bottom:var(--s-4); font-size:0.875rem;">' +
        '<div style="font-weight:600; margin-bottom:var(--s-1);">' + U.esc(empName) + ' &bull; ' + (leave.type === 'sick' ? 'Sick Leave' : 'Casual Leave') + '</div>' +
        '<div style="color:var(--text-2); margin-bottom:var(--s-2);">' + U.dateLabel(leave.from) + ' to ' + U.dateLabel(leave.to) + ' (' + leave.days + ' working days)</div>' +
        '<div style="font-style:italic; color:var(--text);">&ldquo;' + U.esc(leave.reason) + '&rdquo;</div>' +
        '<div style="margin-top:var(--s-2); font-size:0.75rem; color:var(--text-3); border-top:1px solid var(--line); padding-top:var(--s-2);">' +
          'Employee balance: ' + bal.remaining + ' of ' + bal.quota + ' days remaining (Approved: ' + bal.approved + 'd, Pending: ' + bal.pending + 'd)' +
        '</div>' +
      '</div>' +

      '<div class="form-group">' +
        '<label class="form-label" for="decision-comment">' +
          (isApprove ? 'Optional comment for employee' : 'Reason for rejection <span style="color:var(--danger);">*</span>') +
        '</label>' +
        '<textarea id="decision-comment" class="form-control" placeholder="' +
          (isApprove ? 'e.g. Approved, enjoy your time off!' : 'e.g. Insufficient team coverage during this period.') +
        '" maxlength="300" ' + (isApprove ? '' : 'required minlength="3"') + '></textarea>' +
        (isApprove
          ? '<span class="form-hint">Optional note included in the employee dashboard view</span>'
          : '<span class="form-hint">At least 3 characters explaining why this request cannot be approved</span>') +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML =
      '<button type="button" class="btn btn-secondary modal-cancel">Cancel</button>' +
      '<button type="submit" form="decision-modal-form" class="btn ' + (isApprove ? 'btn-primary' : 'btn-danger') + '">' +
        (isApprove ? 'Approve request' : 'Reject request') +
      '</button>';

    const m = U.modal.open({
      title: isApprove ? 'Approve leave request' : 'Reject leave request',
      body: form,
      actions: actions
    });

    const commentInput = form.querySelector('#decision-comment');
    commentInput.addEventListener('input', () => U.clearFieldError(commentInput));

    actions.querySelector('.modal-cancel').addEventListener('click', () => m.close());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      U.clearFieldError(commentInput);
      const commentVal = commentInput.value.trim();

      const res = Leaves.decide(leave.id, decision, commentVal, user.id);
      if (!res.ok) {
        U.showFieldError(commentInput, res.error);
        commentInput.focus();
      } else {
        m.close();
        U.toast(isApprove ? 'Leave request approved.' : 'Leave request rejected.', isApprove ? 'success' : 'info');
        render();
        // Update nav badge in shell
        UI.mountShell({ role: 'admin', active: 'leaves' });
      }
    });
  }

  // Initial render
  render();
})();
