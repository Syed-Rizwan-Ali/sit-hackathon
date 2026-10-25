// HCM — Settings Page Controller
// Company settings, attendance rules, working calendar, departments & data reset
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  'use strict';

  const user = Auth.requireRole('admin');
  if (!user) return;

  Auth.watchSession();
  UI.mountShell({ role: 'admin', active: 'settings' });

  const container = U.byId('settings-view');
  if (!container) return;

  const DAY_NAMES = [
    { num: 1, label: 'Mon' },
    { num: 2, label: 'Tue' },
    { num: 3, label: 'Wed' },
    { num: 4, label: 'Thu' },
    { num: 5, label: 'Fri' },
    { num: 6, label: 'Sat' },
    { num: 0, label: 'Sun' }
  ];

  function render() {
    const comp = Company.get();
    const workingDays = comp.workingDays || [1, 2, 3, 4, 5, 6];
    const departments = comp.departments || [];

    container.innerHTML =
      // 1. Company Name Card
      '<div class="card settings-card" id="card-company">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Company Profile</h2>' +
            '<span class="card-subtitle">Organization display name and brand identity</span>' +
          '</div>' +
        '</div>' +
        '<form id="form-company" novalidate>' +
          '<div class="form-group">' +
            '<label class="form-label" for="comp-name">Company name</label>' +
            '<input type="text" id="comp-name" class="form-control" value="' + U.esc(comp.name) + '" required minlength="2" maxlength="60">' +
            '<span class="form-hint">Displayed on dashboards, nav header, and payslips</span>' +
          '</div>' +
          '<div class="settings-actions">' +
            '<button type="submit" class="btn btn-primary">' +
              Icons.svg('check', { size: 16 }) +
              '<span>Save company profile</span>' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      // 2. Attendance Rules Card
      '<div class="card settings-card" id="card-attendance">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Attendance Rules</h2>' +
            '<span class="card-subtitle">Working hours, office start time, and grace period</span>' +
          '</div>' +
        '</div>' +
        '<form id="form-attendance" novalidate>' +
          '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:var(--s-4);">' +
            '<div class="form-group">' +
              '<label class="form-label" for="comp-start">Office start time</label>' +
              '<input type="time" id="comp-start" class="form-control" value="' + U.esc(comp.officeStart || '09:00') + '" required>' +
              '<span class="form-hint">Check-ins after start + grace are marked late</span>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="comp-grace">Grace period (minutes)</label>' +
              '<input type="number" id="comp-grace" class="form-control" value="' + Number(comp.graceMinutes !== undefined ? comp.graceMinutes : 15) + '" min="0" max="120" required>' +
              '<span class="form-hint">0 to 120 minutes buffer</span>' +
            '</div>' +
          '</div>' +
          '<div class="settings-actions">' +
            '<button type="submit" class="btn btn-primary">' +
              Icons.svg('check', { size: 16 }) +
              '<span>Save attendance rules</span>' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      // 3. Leave Policy Card
      '<div class="card settings-card" id="card-leave">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Leave Policy</h2>' +
            '<span class="card-subtitle">Annual leave quota for employees</span>' +
          '</div>' +
        '</div>' +
        '<form id="form-leave" novalidate>' +
          '<div class="form-group">' +
            '<label class="form-label" for="comp-quota">Yearly leave quota (days)</label>' +
            '<input type="number" id="comp-quota" class="form-control" value="' + Number(comp.leaveQuota || 12) + '" min="1" max="365" required>' +
            '<span class="form-hint">Shared between casual and sick leave per calendar year</span>' +
          '</div>' +
          '<div class="settings-actions">' +
            '<button type="submit" class="btn btn-primary">' +
              Icons.svg('check', { size: 16 }) +
              '<span>Save leave quota</span>' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      // 4. Working Days Card
      '<div class="card settings-card" id="card-working-days">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Working Days</h2>' +
            '<span class="card-subtitle">Select days that count as official working days</span>' +
          '</div>' +
        '</div>' +
        '<form id="form-working-days" novalidate>' +
          '<div class="form-group">' +
            '<label class="form-label">Active working days</label>' +
            '<div class="day-pill-group" id="settings-day-pills" role="group" aria-label="Working days selection">' +
              DAY_NAMES.map(d => {
                const active = workingDays.includes(d.num) ? ' active' : '';
                const pressed = workingDays.includes(d.num) ? 'true' : 'false';
                return '<button type="button" class="day-pill' + active + '" data-day="' + d.num + '" aria-pressed="' + pressed + '">' +
                  U.esc(d.label) +
                '</button>';
              }).join('') +
            '</div>' +
            '<p class="field-error" id="working-days-error">' +
              Icons.svg('alert-circle', { size: 14 }) +
              '<span>Select at least one working day.</span>' +
            '</p>' +
            '<span class="form-hint" style="margin-top:var(--s-2);">Attendance on unselected days is recorded as weekly off / extra attendance.</span>' +
          '</div>' +
          '<div class="settings-actions">' +
            '<button type="submit" class="btn btn-primary">' +
              Icons.svg('check', { size: 16 }) +
              '<span>Save working days</span>' +
            '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +

      // 5. Departments Card
      '<div class="card settings-card" id="card-departments">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Departments</h2>' +
            '<span class="card-subtitle">Manage company teams and departments</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:var(--s-4);">' +
          '<form id="form-add-dept" style="display:flex; gap:var(--s-2); align-items:flex-start;" novalidate>' +
            '<div class="form-group" style="flex:1; margin-bottom:0;">' +
              '<input type="text" id="new-dept-name" class="form-control" placeholder="New department name..." maxlength="40" required>' +
            '</div>' +
            '<button type="submit" class="btn btn-primary" style="height:44px;">' +
              Icons.svg('plus', { size: 16 }) +
              '<span>Add department</span>' +
            '</button>' +
          '</form>' +
          '<div id="dept-list-wrapper">' +
            (departments.length === 0
              ? '<p class="form-hint" style="font-style:italic;">No departments created yet. Add your first department above.</p>'
              : '<div style="display:flex; flex-wrap:wrap; gap:var(--s-2);">' +
                  departments.map(dept => {
                    return '<span class="chip" style="background:var(--surface-2); border:1px solid var(--line); font-size:0.875rem; padding:6px 14px; gap:8px;">' +
                      '<span>' + U.esc(dept) + '</span>' +
                      '<button type="button" class="btn-remove-dept" data-name="' + U.esc(dept) + '" aria-label="Remove ' + U.esc(dept) + '" style="background:none; border:none; color:var(--text-3); cursor:pointer; display:inline-flex; align-items:center; padding:0; font-size:1rem; line-height:1;">' +
                        Icons.svg('x', { size: 14 }) +
                      '</button>' +
                    '</span>';
                  }).join('') +
                '</div>'
            ) +
          '</div>' +
        '</div>' +
      '</div>' +

      // 6. Danger Zone Card (Reset)
      '<div class="card settings-card" style="border-color:var(--danger); background:var(--surface);">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title" style="color:var(--danger);">Reset All Data</h2>' +
            '<span class="card-subtitle">Permanently delete all employees, attendance, and leave records</span>' +
          '</div>' +
        '</div>' +
        '<p style="font-size:0.875rem; color:var(--text-2); margin-bottom:var(--s-4); line-height:1.5;">' +
          'This will clear all stored company data for HCM on this browser, including your company settings and admin account. You will be redirected to the initial setup screen.' +
        '</p>' +
        '<div class="settings-actions" style="border-top-color:rgba(168, 40, 31, 0.2);">' +
          '<button type="button" id="btn-reset-data" class="btn btn-danger">' +
            Icons.svg('trash', { size: 16 }) +
            '<span>Reset all data</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    attachEventListeners();
  }

  function attachEventListeners() {
    // 1. Company Name Form
    const formCompany = U.byId('form-company');
    if (formCompany) {
      const nameInput = U.byId('comp-name');
      nameInput.addEventListener('input', () => U.clearFieldError(nameInput));

      formCompany.addEventListener('submit', (e) => {
        e.preventDefault();
        U.clearFieldError(nameInput);
        const nameVal = nameInput.value.trim();

        const res = Company.save({ name: nameVal });
        if (!res.ok && res.errors) {
          if (res.errors.name) U.showFieldError(nameInput, res.errors.name);
          U.focusFirstError(formCompany);
        } else {
          U.toast('Company name updated.', 'success');
        }
      });
    }

    // 2. Attendance Rules Form
    const formAttendance = U.byId('form-attendance');
    if (formAttendance) {
      const startInput = U.byId('comp-start');
      const graceInput = U.byId('comp-grace');

      startInput.addEventListener('input', () => U.clearFieldError(startInput));
      graceInput.addEventListener('input', () => U.clearFieldError(graceInput));

      formAttendance.addEventListener('submit', (e) => {
        e.preventDefault();
        U.clearFieldError(startInput);
        U.clearFieldError(graceInput);

        const res = Company.save({
          officeStart: startInput.value.trim(),
          graceMinutes: Number(graceInput.value)
        });

        if (!res.ok && res.errors) {
          if (res.errors.officeStart) U.showFieldError(startInput, res.errors.officeStart);
          if (res.errors.graceMinutes) U.showFieldError(graceInput, res.errors.graceMinutes);
          U.focusFirstError(formAttendance);
        } else {
          U.toast('Attendance rules updated.', 'success');
        }
      });
    }

    // 3. Leave Policy Form
    const formLeave = U.byId('form-leave');
    if (formLeave) {
      const quotaInput = U.byId('comp-quota');
      quotaInput.addEventListener('input', () => U.clearFieldError(quotaInput));

      formLeave.addEventListener('submit', (e) => {
        e.preventDefault();
        U.clearFieldError(quotaInput);

        const res = Company.save({
          leaveQuota: Number(quotaInput.value)
        });

        if (!res.ok && res.errors) {
          if (res.errors.leaveQuota) U.showFieldError(quotaInput, res.errors.leaveQuota);
          U.focusFirstError(formLeave);
        } else {
          U.toast('Leave quota updated.', 'success');
        }
      });
    }

    // 4. Working Days Form
    const formDays = U.byId('form-working-days');
    const dayPillsContainer = U.byId('settings-day-pills');
    const daysErrorEl = U.byId('working-days-error');

    if (dayPillsContainer) {
      dayPillsContainer.querySelectorAll('.day-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          const isAct = btn.classList.contains('active');
          btn.setAttribute('aria-pressed', isAct ? 'true' : 'false');
          if (daysErrorEl) daysErrorEl.classList.remove('active');
        });
      });
    }

    if (formDays) {
      formDays.addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = [];
        dayPillsContainer.querySelectorAll('.day-pill.active').forEach(btn => {
          selected.push(Number(btn.dataset.day));
        });

        if (selected.length === 0) {
          if (daysErrorEl) daysErrorEl.classList.add('active');
          return;
        }

        const res = Company.save({ workingDays: selected });
        if (!res.ok) {
          if (daysErrorEl) daysErrorEl.classList.add('active');
        } else {
          if (daysErrorEl) daysErrorEl.classList.remove('active');
          U.toast('Working days updated.', 'success');
        }
      });
    }

    // 5. Add Department Form
    const formDept = U.byId('form-add-dept');
    if (formDept) {
      const deptInput = U.byId('new-dept-name');
      deptInput.addEventListener('input', () => U.clearFieldError(deptInput));

      formDept.addEventListener('submit', (e) => {
        e.preventDefault();
        U.clearFieldError(deptInput);
        const nameVal = deptInput.value.trim();

        const res = Company.addDepartment(nameVal);
        if (!res.ok) {
          U.showFieldError(deptInput, res.error);
          deptInput.focus();
        } else {
          U.toast('Department added.', 'success');
          render();
        }
      });
    }

    // Remove Department Buttons
    container.querySelectorAll('.btn-remove-dept').forEach(btn => {
      btn.addEventListener('click', async () => {
        const deptName = btn.dataset.name;
        if (!deptName) return;

        const confirmed = await U.confirm({
          title: 'Remove department',
          body: 'Remove "' + deptName + '" from company departments?',
          confirmLabel: 'Remove department',
          danger: true
        });

        if (!confirmed) return;

        const res = Company.removeDepartment(deptName);
        if (!res.ok) {
          U.toast(res.error, 'error');
        } else {
          U.toast('Department removed.', 'success');
          render();
        }
      });
    });

    // 6. Reset All Data Button
    const btnReset = U.byId('btn-reset-data');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        openResetModal();
      });
    }
  }

  function openResetModal() {
    const body = document.createElement('div');
    body.innerHTML =
      '<p style="font-size:0.9375rem; color:var(--text); margin-bottom:var(--s-3);">' +
        'This action is irreversible. All employees, attendance records, leaves, and settings will be permanently erased.' +
      '</p>' +
      '<div class="form-group">' +
        '<label class="form-label" for="reset-confirm-input">Type <strong>RESET</strong> to confirm:</label>' +
        '<input type="text" id="reset-confirm-input" class="form-control" autocomplete="off" placeholder="RESET">' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML =
      '<button type="button" class="btn btn-secondary modal-cancel">Cancel</button>' +
      '<button type="button" id="modal-confirm-reset" class="btn btn-danger" disabled>Reset everything</button>';

    const m = U.modal.open({
      title: 'Reset all company data?',
      body: body,
      actions: actions
    });

    const input = body.querySelector('#reset-confirm-input');
    const confirmBtn = actions.querySelector('#modal-confirm-reset');
    const cancelBtn = actions.querySelector('.modal-cancel');

    cancelBtn.addEventListener('click', () => m.close());

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim() !== 'RESET';
    });

    confirmBtn.addEventListener('click', () => {
      if (input.value.trim() !== 'RESET') return;
      // Clear all HCM storage keys through Store
      Object.keys(Store.KEYS).forEach(k => {
        Store.remove(Store.KEYS[k]);
      });
      Store.remove('hcm_dev_now');
      m.close();
      window.location.href = '../index.html';
    });
  }

  // Initial render
  render();
})();
