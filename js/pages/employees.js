// HCM — Employees Page Controller
// Employee directory, search & department filter, add/edit modal with credentials panel, cascaded deletion
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('admin');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: 'admin', active: 'employees' });

  const mainEl = U.byId('main');
  if (!mainEl) return;

  let searchQuery = '';
  let selectedDepartment = 'All departments';

  function render() {
    const allEmployees = Employees.list();
    const departments = Company.get().departments || [];
    const filtered = Employees.search(searchQuery, selectedDepartment);

    mainEl.innerHTML =
      '<div class="page-header">' +
        '<div class="page-title-group">' +
          '<h1>Employees</h1>' +
          '<span class="page-subtitle" id="emp-count-label">' +
            (allEmployees.length === 0
              ? 'No employees'
              : (filtered.length === allEmployees.length
                  ? allEmployees.length + ' employee' + (allEmployees.length === 1 ? '' : 's')
                  : 'Showing ' + filtered.length + ' of ' + allEmployees.length + ' employees')) +
          '</span>' +
        '</div>' +
        '<div class="header-actions">' +
          '<button type="button" class="btn btn-primary" id="btn-open-add">' +
            Icons.svg('plus', { size: 18 }) +
            '<span>Add employee</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      // Toolbar: Search and Filter
      (allEmployees.length > 0
        ? '<div style="display:flex; justify-content:space-between; align-items:center; gap:var(--s-4); margin-bottom:var(--s-5); flex-wrap:wrap;">' +
            '<div style="position:relative; flex:1; min-width:260px; max-width:440px;">' +
              '<input type="text" id="emp-search" class="form-control search-pill" placeholder="Search by name or email..." value="' + U.esc(searchQuery) + '">' +
              '<span style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:var(--text-3); pointer-events:none; display:flex;">' +
                Icons.svg('search', { size: 16 }) +
              '</span>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:var(--s-2);">' +
              '<label for="emp-dept-filter" class="form-hint" style="font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Department:</label>' +
              '<select id="emp-dept-filter" class="select-pill" aria-label="Filter by department" style="height:40px;">' +
                '<option value="All departments"' + (selectedDepartment === 'All departments' ? ' selected' : '') + '>All departments</option>' +
                departments.map(d => {
                  return '<option value="' + U.esc(d) + '"' + (selectedDepartment === d ? ' selected' : '') + '>' + U.esc(d) + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
          '</div>'
        : '') +

      // Main content: Empty state vs Table
      '<div id="emp-content-area">' +
        renderContent(allEmployees, filtered) +
      '</div>';

    attachPageEvents();
  }

  function renderContent(allEmployees, filtered) {
    if (allEmployees.length === 0) {
      // Empty state 1: No employees at all
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            Icons.svg('users', { size: 48, className: 'empty-icon' }) +
            '<h2 class="empty-state-title">No employees added yet</h2>' +
            '<p class="empty-state-text">Add your team members to manage directory records, track attendance, and process monthly payslips.</p>' +
            '<button type="button" class="btn btn-primary" id="btn-empty-add">' +
              Icons.svg('plus', { size: 18 }) +
              '<span>Add first employee</span>' +
            '</button>' +
          '</div>' +
        '</div>'
      );
    }

    if (filtered.length === 0) {
      // Empty state 2: Search or filter returned 0
      return (
        '<div class="card">' +
          '<div class="empty-state">' +
            Icons.svg('search', { size: 48, className: 'empty-icon' }) +
            '<h2 class="empty-state-title">No matching employees</h2>' +
            '<p class="empty-state-text">No employees matched your current search and department filters.</p>' +
            '<button type="button" class="btn btn-secondary" id="btn-clear-filter">Clear filters</button>' +
          '</div>' +
        '</div>'
      );
    }

    const displayRows = filtered.slice(0, 200);

    return (
      '<div class="table-wrapper">' +
        '<table class="data-table table-stacked-mobile" aria-label="Employees table">' +
          '<thead>' +
            '<tr>' +
              '<th>Employee</th>' +
              '<th>Department</th>' +
              '<th class="text-right">Salary (PKR)</th>' +
              '<th>Joined</th>' +
              '<th class="text-right" style="width:110px;">Actions</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            displayRows.map(emp => {
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
                  '<td data-label="Salary (PKR)" class="text-right tabular-nums font-mono">' +
                    U.pkr(emp.salary, 0) +
                  '</td>' +
                  '<td data-label="Joined">' +
                    U.dateLabel(emp.joinedAt) +
                  '</td>' +
                  '<td data-label="Actions" class="text-right">' +
                    '<div style="display:inline-flex; align-items:center; gap:var(--s-1);">' +
                      '<button type="button" class="btn btn-ghost btn-sm btn-hist-emp" data-id="' + U.esc(emp.id) + '" aria-label="Attendance history for ' + U.esc(emp.name) + '" title="Attendance history">' +
                        Icons.svg('clock', { size: 16 }) +
                      '</button>' +
                      '<button type="button" class="btn btn-ghost btn-sm btn-edit-emp" data-id="' + U.esc(emp.id) + '" aria-label="Edit ' + U.esc(emp.name) + '" title="Edit">' +
                        Icons.svg('edit', { size: 16 }) +
                      '</button>' +
                      '<button type="button" class="btn btn-ghost btn-sm btn-delete-emp" data-id="' + U.esc(emp.id) + '" aria-label="Delete ' + U.esc(emp.name) + '" title="Delete" style="color:var(--danger);">' +
                        Icons.svg('trash', { size: 16 }) +
                      '</button>' +
                    '</div>' +
                  '</td>' +
                '</tr>'
              );
            }).join('') +
          '</tbody>' +
        '</table>' +
        (filtered.length > 200
          ? '<div style="padding:var(--s-3); text-align:center; font-size:0.8125rem; color:var(--text-3); border-top:1px solid var(--line);">' +
              'Showing first 200 of ' + filtered.length + ' employees' +
            '</div>'
          : '') +
      '</div>'
    );
  }

  function attachPageEvents() {
    // Add employee buttons
    const btnOpenAdd = U.byId('btn-open-add');
    if (btnOpenAdd) btnOpenAdd.addEventListener('click', () => openEmployeeModal(null));

    const btnEmptyAdd = U.byId('btn-empty-add');
    if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', () => openEmployeeModal(null));

    // Clear filters button
    const btnClear = U.byId('btn-clear-filter');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        searchQuery = '';
        selectedDepartment = 'All departments';
        render();
      });
    }

    // Search input
    const searchInput = U.byId('emp-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        const filtered = Employees.search(searchQuery, selectedDepartment);
        const allEmployees = Employees.list();
        const area = U.byId('emp-content-area');
        if (area) area.innerHTML = renderContent(allEmployees, filtered);

        const countLabel = U.byId('emp-count-label');
        if (countLabel) {
          countLabel.textContent = filtered.length === allEmployees.length
            ? allEmployees.length + ' employee' + (allEmployees.length === 1 ? '' : 's')
            : 'Showing ' + filtered.length + ' of ' + allEmployees.length + ' employees';
        }

        attachTableEvents();
      });
    }

    // Department filter select
    const deptSelect = U.byId('emp-dept-filter');
    if (deptSelect) {
      deptSelect.addEventListener('change', () => {
        selectedDepartment = deptSelect.value;
        render();
      });
    }

    attachTableEvents();
  }

  function attachTableEvents() {
    // Edit buttons
    mainEl.querySelectorAll('.btn-edit-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-edit-emp') || btn;
        const id = targetBtn.dataset.id;
        const emp = Employees.get(id);
        if (emp) openEmployeeModal(emp);
      });
    });

    // History buttons (Attendance)
    mainEl.querySelectorAll('.btn-hist-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-hist-emp') || btn;
        const id = targetBtn.dataset.id;
        const emp = Employees.get(id);
        if (emp) openEmployeeHistoryModal(emp);
      });
    });

    // Delete buttons
    mainEl.querySelectorAll('.btn-delete-emp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-delete-emp') || btn;
        const id = targetBtn.dataset.id;
        const emp = Employees.get(id);
        if (emp) openDeleteConfirmModal(emp);
      });
    });
  }

  function openEmployeeHistoryModal(emp) {
    if (typeof Attendance === 'undefined') return;
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
          '<thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th class="text-right">Hours</th></tr></thead>' +
          '<tbody>' +
            (visibleDays.length === 0
              ? '<tr><td colspan="5" style="text-align:center; padding:var(--s-4);">No attendance records yet</td></tr>'
              : visibleDays.map(d => {
                  const rec = d.record;
                  return '<tr>' +
                    '<td style="font-weight:600;">' + U.dateLabel(d.date) + '</td>' +
                    '<td><span class="chip">' + U.esc(d.code) + '</span></td>' +
                    '<td class="font-mono">' + (rec && rec.checkIn ? U.time12(rec.checkIn) : '—') + '</td>' +
                    '<td class="font-mono">' + (rec && rec.checkOut ? U.time12(rec.checkOut) : '—') + '</td>' +
                    '<td class="text-right font-mono">' + (rec && rec.hours !== null ? rec.hours + 'h' : '—') + '</td>' +
                  '</tr>';
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

  function openEmployeeModal(editingEmp) {
    const isEdit = !!editingEmp;
    const departments = Company.get().departments || [];
    const initialPwd = isEdit ? '' : Employees.generatePassword(8);

    const form = document.createElement('form');
    form.id = 'emp-modal-form';
    form.noValidate = true;
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = 'var(--s-3)';

    form.innerHTML =
      // Name
      '<div class="form-group">' +
        '<label class="form-label" for="emp-name">Full name</label>' +
        '<input type="text" id="emp-name" class="form-control" value="' + U.esc(isEdit ? editingEmp.name : '') + '" placeholder="e.g. Tariq Khan" required maxlength="60">' +
      '</div>' +

      // Email
      '<div class="form-group">' +
        '<label class="form-label" for="emp-email">Work email</label>' +
        '<input type="email" id="emp-email" class="form-control" value="' + U.esc(isEdit ? editingEmp.email : '') + '" placeholder="name@company.com" required>' +
      '</div>' +

      // Department with inline Add Department (Task 2.4)
      '<div class="form-group">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--s-1);">' +
          '<label class="form-label" for="emp-dept" style="margin-bottom:0;">Department</label>' +
          '<button type="button" id="btn-inline-add-dept" class="btn btn-ghost btn-sm" style="padding:0 var(--s-1); font-size:0.75rem; color:var(--accent);">' +
            Icons.svg('plus', { size: 14 }) +
            '<span>New department</span>' +
          '</button>' +
        '</div>' +
        '<select id="emp-dept" class="form-control" required>' +
          '<option value="">Select department...</option>' +
          departments.map(d => {
            const sel = (isEdit && editingEmp.department === d) ? ' selected' : '';
            return '<option value="' + U.esc(d) + '"' + sel + '>' + U.esc(d) + '</option>';
          }).join('') +
        '</select>' +
        '<div id="inline-dept-box" style="display:none; margin-top:var(--s-2); padding:var(--s-3); background:var(--surface-2); border-radius:var(--r-sm); border:1px solid var(--line);">' +
          '<label class="form-label" for="inline-dept-input" style="font-size:0.75rem;">Add department:</label>' +
          '<div style="display:flex; gap:var(--s-2); margin-top:var(--s-1);">' +
            '<input type="text" id="inline-dept-input" class="form-control" style="height:36px; font-size:0.875rem;" placeholder="Department name">' +
            '<button type="button" id="btn-save-inline-dept" class="btn btn-primary btn-sm">Add</button>' +
            '<button type="button" id="btn-cancel-inline-dept" class="btn btn-secondary btn-sm">Cancel</button>' +
          '</div>' +
          '<p class="field-error" id="inline-dept-error"></p>' +
        '</div>' +
      '</div>' +

      // Monthly Salary
      '<div class="form-group">' +
        '<label class="form-label" for="emp-salary">Monthly salary (PKR)</label>' +
        '<input type="number" id="emp-salary" class="form-control font-mono" value="' + (isEdit ? Number(editingEmp.salary) : '') + '" placeholder="e.g. 60000" min="1" max="10000000" required>' +
        '<span class="form-hint">Used to calculate per-day rate and unapproved deductions on payslips</span>' +
      '</div>' +

      // Joining Date
      '<div class="form-group">' +
        '<label class="form-label" for="emp-joined">Joining date</label>' +
        '<input type="date" id="emp-joined" class="form-control" value="' + (isEdit ? editingEmp.joinedAt : Clock.todayStr()) + '" max="' + Clock.todayStr() + '" required>' +
        '<span class="form-hint">Days before joining date are never marked as absent</span>' +
      '</div>' +

      // Password (generated / edit optional)
      (isEdit
        ? '<div class="form-group">' +
            '<label class="form-label" for="emp-pwd">Reset password <span style="font-weight:normal; color:var(--text-3);">(optional)</span></label>' +
            '<input type="password" id="emp-pwd" class="form-control" placeholder="Leave blank to keep existing" minlength="6">' +
          '</div>'
        : '<div class="form-group">' +
            '<label class="form-label" for="emp-pwd">Initial password</label>' +
            '<div style="display:flex; gap:var(--s-2);">' +
              '<input type="text" id="emp-pwd" class="form-control font-mono" value="' + U.esc(initialPwd) + '" required minlength="6">' +
              '<button type="button" id="btn-regen-pwd" class="btn btn-secondary btn-sm" style="flex-shrink:0;">' +
                Icons.svg('refresh', { size: 14 }) +
                '<span>Generate</span>' +
              '</button>' +
            '</div>' +
            '<span class="form-hint">Shown once after creation. Passwords are saved as SHA-256 hashes.</span>' +
          '</div>'
      );

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML =
      '<button type="button" class="btn btn-secondary modal-cancel">Cancel</button>' +
      '<button type="submit" form="emp-modal-form" class="btn btn-primary modal-save">' + (isEdit ? 'Save changes' : 'Add employee') + '</button>';

    const m = U.modal.open({
      title: isEdit ? 'Edit employee' : 'Add employee',
      body: form,
      actions: actions
    });

    actions.querySelector('.modal-cancel').addEventListener('click', () => m.close());
    actions.querySelector('.modal-save').addEventListener('click', () => form.requestSubmit());

    // Inline Department handler (Task 2.4)
    const btnInlineDept = form.querySelector('#btn-inline-add-dept');
    const inlineBox = form.querySelector('#inline-dept-box');
    const inlineInput = form.querySelector('#inline-dept-input');
    const inlineSaveBtn = form.querySelector('#btn-save-inline-dept');
    const inlineCancelBtn = form.querySelector('#btn-cancel-inline-dept');
    const inlineErrEl = form.querySelector('#inline-dept-error');
    const deptDropdown = form.querySelector('#emp-dept');

    if (btnInlineDept && inlineBox) {
      btnInlineDept.addEventListener('click', () => {
        inlineBox.style.display = 'block';
        inlineInput.focus();
      });

      inlineCancelBtn.addEventListener('click', () => {
        inlineBox.style.display = 'none';
        inlineInput.value = '';
        if (inlineErrEl) inlineErrEl.classList.remove('active');
      });

      inlineSaveBtn.addEventListener('click', () => {
        const val = inlineInput.value.trim();
        if (inlineErrEl) inlineErrEl.classList.remove('active');

        const addRes = Company.addDepartment(val);
        if (!addRes.ok) {
          if (inlineErrEl) {
            inlineErrEl.innerHTML = Icons.svg('alert-circle', { size: 14 }) + '<span>' + U.esc(addRes.error) + '</span>';
            inlineErrEl.classList.add('active');
          }
          inlineInput.focus();
        } else {
          // Re-populate dropdown
          const newDepts = Company.get().departments || [];
          deptDropdown.innerHTML =
            '<option value="">Select department...</option>' +
            newDepts.map(d => {
              const sel = (d.toLowerCase() === val.toLowerCase()) ? ' selected' : '';
              return '<option value="' + U.esc(d) + '"' + sel + '>' + U.esc(d) + '</option>';
            }).join('');
          inlineBox.style.display = 'none';
          inlineInput.value = '';
          U.clearFieldError(deptDropdown);
          U.toast('Department added.', 'success');
        }
      });
    }

    // Password regenerate button
    const btnRegen = form.querySelector('#btn-regen-pwd');
    if (btnRegen) {
      btnRegen.addEventListener('click', () => {
        const pwdInput = form.querySelector('#emp-pwd');
        if (pwdInput) {
          pwdInput.value = Employees.generatePassword(8);
          U.clearFieldError(pwdInput);
        }
      });
    }

    // Live validation clearing
    const nameInput = form.querySelector('#emp-name');
    const emailInput = form.querySelector('#emp-email');
    const salaryInput = form.querySelector('#emp-salary');
    const joinedInput = form.querySelector('#emp-joined');
    const pwdInput = form.querySelector('#emp-pwd');

    [nameInput, emailInput, deptDropdown, salaryInput, joinedInput, pwdInput].forEach(inp => {
      if (inp) inp.addEventListener('input', () => U.clearFieldError(inp));
    });

    let submittedOnce = false;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submittedOnce = true;

      // Clear previous field errors
      [nameInput, emailInput, deptDropdown, salaryInput, joinedInput, pwdInput].forEach(inp => {
        if (inp) U.clearFieldError(inp);
      });

      const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        department: deptDropdown.value.trim(),
        salary: salaryInput.value.trim(),
        joinedAt: joinedInput.value.trim(),
        password: pwdInput ? pwdInput.value.trim() : ''
      };

      const submitBtn = actions.querySelector('.modal-save');
      submitBtn.disabled = true;

      try {
        if (isEdit) {
          const res = await Employees.update(editingEmp.id, formData);
          if (!res.ok) {
            submitBtn.disabled = false;
            applyFormErrors(form, res.errors);
            U.focusFirstError(form);
          } else {
            m.close();
            U.toast('Employee updated.', 'success');
            render();
          }
        } else {
          const res = await Employees.add(formData);
          if (!res.ok) {
            submitBtn.disabled = false;
            applyFormErrors(form, res.errors);
            U.focusFirstError(form);
          } else {
            m.close();
            // Show credentials panel once (EMP-3)
            openCredentialsPanel(res.user, res.plainPassword);
            render();
          }
        }
      } catch (err) {
        submitBtn.disabled = false;
        U.toast('An error occurred while saving.', 'error');
      }
    });
  }

  function applyFormErrors(form, errors) {
    if (!errors) return;
    if (errors.name) U.showFieldError(form.querySelector('#emp-name'), errors.name);
    if (errors.email) U.showFieldError(form.querySelector('#emp-email'), errors.email);
    if (errors.department) U.showFieldError(form.querySelector('#emp-dept'), errors.department);
    if (errors.salary) U.showFieldError(form.querySelector('#emp-salary'), errors.salary);
    if (errors.joinedAt) U.showFieldError(form.querySelector('#emp-joined'), errors.joinedAt);
    if (errors.password) U.showFieldError(form.querySelector('#emp-pwd'), errors.password);
  }

  // Credentials Panel Modal (EMP-3)
  function openCredentialsPanel(newEmp, plainPassword) {
    const body = document.createElement('div');
    body.innerHTML =
      '<p style="font-size:0.9375rem; color:var(--text); margin-bottom:var(--s-4);">' +
        'Account for <strong>' + U.esc(newEmp.name) + '</strong> has been created. Copy these login details now. The plain password cannot be retrieved again because it is stored as an encrypted SHA-256 hash.' +
      '</p>' +
      '<div style="background:var(--surface-2); border:1px solid var(--line); border-radius:var(--r-md); padding:var(--s-4); display:flex; flex-direction:column; gap:var(--s-3); margin-bottom:var(--s-4);">' +
        '<div>' +
          '<span class="form-hint" style="font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Email (login username):</span>' +
          '<div class="font-mono" style="font-size:1rem; font-weight:600; color:var(--text); margin-top:2px;">' + U.esc(newEmp.email) + '</div>' +
        '</div>' +
        '<div>' +
          '<span class="form-hint" style="font-weight:600; text-transform:uppercase; letter-spacing:0.04em;">Password:</span>' +
          '<div class="font-mono" style="font-size:1.125rem; font-weight:700; color:var(--accent); margin-top:2px; letter-spacing:0.05em;">' + U.esc(plainPassword) + '</div>' +
        '</div>' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML =
      '<button type="button" id="btn-copy-creds" class="btn btn-secondary">' +
        Icons.svg('copy', { size: 16 }) +
        '<span>Copy credentials</span>' +
      '</button>' +
      '<button type="button" class="btn btn-primary modal-done">Done</button>';

    const m = U.modal.open({
      title: 'Employee account created',
      body: body,
      actions: actions
    });

    const copyBtn = actions.querySelector('#btn-copy-creds');
    const doneBtn = actions.querySelector('.modal-done');

    doneBtn.addEventListener('click', () => m.close());

    copyBtn.addEventListener('click', async () => {
      const text = 'HCM Login Credentials:\nEmail: ' + newEmp.email + '\nPassword: ' + plainPassword;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        U.toast('Credentials copied to clipboard.', 'success');
      } catch (e) {
        U.toast('Failed to copy. Please write down the password.', 'info');
      }
    });
  }

  // Delete Confirm Modal (EMP-5)
  async function openDeleteConfirmModal(emp) {
    const attendance = Store.get(Store.KEYS.attendance, []);
    const leaves = Store.get(Store.KEYS.leaves, []);

    const attCount = attendance.filter(a => a.userId === emp.id).length;
    const leaveCount = leaves.filter(l => l.userId === emp.id).length;

    const bodyText =
      'Are you sure you want to delete <strong>' + U.esc(emp.name) + '</strong>?<br><br>' +
      'This will permanently remove their user account, along with <strong>' + attCount + '</strong> attendance record' + (attCount === 1 ? '' : 's') + ' ' +
      'and <strong>' + leaveCount + '</strong> leave request' + (leaveCount === 1 ? '' : 's') + '. This cannot be undone.';

    const confirmed = await U.confirm({
      title: 'Delete ' + emp.name + '?',
      body: bodyText,
      confirmLabel: 'Delete employee',
      danger: true
    });

    if (!confirmed) return;

    const res = Employees.remove(emp.id);
    if (!res.ok) {
      U.toast(res.error, 'error');
    } else {
      U.toast('Employee deleted.', 'info');
      render();
    }
  }

  // Initial render
  render();
})();
