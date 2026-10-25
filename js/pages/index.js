// HCM — Page Controller: index.html
// Login & First-Run Setup form handling with inline validation
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

(function () {
  // If already authenticated, redirect to role home
  const user = Auth.current();
  if (user) {
    window.location.href = user.role === 'admin' ? 'pages/admin.html' : 'pages/employee.html';
    return;
  }

  Auth.watchSession();

  // Intro setup
  const introBrand = U.byId('intro-brand');
  if (introBrand && typeof Icons !== 'undefined') {
    introBrand.innerHTML = Icons.wordmark({ height: 32 });
  }

  const themeToggle = U.byId('intro-theme-toggle');
  if (themeToggle && typeof Icons !== 'undefined') {
    themeToggle.innerHTML = Icons.svg('sun', { size: 20 });
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      Store.set(Store.KEYS.theme, next);
      document.documentElement.setAttribute('data-theme', next);
    });
  }

  const container = U.byId('auth-container');
  if (!container) return;

  if (!Auth.setupDone()) {
    renderSetup();
  } else {
    renderLogin();
  }

  function renderSetup() {
    let workingDaysState = [1, 2, 3, 4, 5, 6]; // Mon to Sat

    container.innerHTML =
      '<div style="margin-bottom: var(--s-5);">' +
        '<h2 style="font-size: 1.75rem; margin-bottom: var(--s-2);">Set up your company</h2>' +
        '<p style="color: var(--text-2); font-size: 0.875rem;">Create your company profile and primary administrator account to begin.</p>' +
      '</div>' +
      '<form id="setup-form" novalidate>' +
        '<div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s-4); margin-bottom: var(--s-5);">' +
          '<h3 style="font-size: 1rem; margin-bottom: var(--s-3); color: var(--text);">1. Company Details</h3>' +
          '<div class="form-group">' +
            '<label class="form-label" for="setup-comp-name">Company name</label>' +
            '<input type="text" id="setup-comp-name" class="form-control" placeholder="Acme Logistics" required minlength="2" maxlength="60">' +
          '</div>' +
        '</div>' +

        '<div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s-4); margin-bottom: var(--s-5);">' +
          '<h3 style="font-size: 1rem; margin-bottom: var(--s-3); color: var(--text);">2. Administrator Account</h3>' +
          '<div class="form-group">' +
            '<label class="form-label" for="setup-admin-name">Admin name</label>' +
            '<input type="text" id="setup-admin-name" class="form-control" placeholder="Ahmad Khan" required minlength="2" maxlength="60">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label" for="setup-admin-email">Admin email</label>' +
            '<input type="email" id="setup-admin-email" class="form-control" placeholder="admin@company.com" required>' +
          '</div>' +
          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-3);">' +
            '<div class="form-group">' +
              '<label class="form-label" for="setup-admin-pwd">Password</label>' +
              '<input type="password" id="setup-admin-pwd" class="form-control" autocomplete="new-password" required minlength="6">' +
              '<span class="form-hint">At least 6 characters</span>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="setup-admin-confirm">Confirm password</label>' +
              '<input type="password" id="setup-admin-confirm" class="form-control" autocomplete="new-password" required>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--s-4); margin-bottom: var(--s-5);">' +
          '<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--s-3);">' +
            '<h3 style="font-size: 1rem; color: var(--text);">3. Attendance & Leave Rules</h3>' +
            '<span style="font-size: 0.75rem; color: var(--text-3);">You can change these later in Settings</span>' +
          '</div>' +
          '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3); margin-bottom: var(--s-4);">' +
            '<div class="form-group" style="margin-bottom:0;">' +
              '<label class="form-label" for="setup-start-time">Office start</label>' +
              '<input type="time" id="setup-start-time" class="form-control" value="09:00" required>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0;">' +
              '<label class="form-label" for="setup-grace">Grace (minutes)</label>' +
              '<input type="number" id="setup-grace" class="form-control" value="15" min="0" max="120" required>' +
            '</div>' +
            '<div class="form-group" style="margin-bottom:0;">' +
              '<label class="form-label" for="setup-quota">Yearly leave quota</label>' +
              '<input type="number" id="setup-quota" class="form-control" value="12" min="1" max="365" required>' +
            '</div>' +
          '</div>' +
          '<div class="form-group" style="margin-bottom:0;">' +
            '<label class="form-label">Working days</label>' +
            '<div class="day-pill-group" id="setup-days-group">' +
              '<button type="button" class="day-pill active" data-day="1">Mon</button>' +
              '<button type="button" class="day-pill active" data-day="2">Tue</button>' +
              '<button type="button" class="day-pill active" data-day="3">Wed</button>' +
              '<button type="button" class="day-pill active" data-day="4">Thu</button>' +
              '<button type="button" class="day-pill active" data-day="5">Fri</button>' +
              '<button type="button" class="day-pill active" data-day="6">Sat</button>' +
              '<button type="button" class="day-pill" data-day="0">Sun</button>' +
            '</div>' +
            '<p class="field-error" id="setup-days-error"></p>' +
          '</div>' +
        '</div>' +

        '<button type="submit" class="btn btn-primary" id="setup-submit-btn" style="width: 100%; height: 48px; font-size: 1rem;">' +
          'Create company & sign in' +
        '</button>' +
      '</form>';

    const form = U.byId('setup-form');
    const daysGroup = U.byId('setup-days-group');

    // Toggle working day pills
    daysGroup.querySelectorAll('.day-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = Number(btn.getAttribute('data-day'));
        if (workingDaysState.includes(d)) {
          if (workingDaysState.length === 1) {
            U.toast('Select at least one working day.', 'error');
            return;
          }
          workingDaysState = workingDaysState.filter(x => x !== d);
          btn.classList.remove('active');
        } else {
          workingDaysState.push(d);
          btn.classList.add('active');
        }
      });
    });

    // Clear error on input
    form.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => U.clearFieldError(inp));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const compName = U.byId('setup-comp-name');
      const adminName = U.byId('setup-admin-name');
      const adminEmail = U.byId('setup-admin-email');
      const adminPwd = U.byId('setup-admin-pwd');
      const adminConfirm = U.byId('setup-admin-confirm');
      const startTime = U.byId('setup-start-time');
      const grace = U.byId('setup-grace');
      const quota = U.byId('setup-quota');

      [compName, adminName, adminEmail, adminPwd, adminConfirm, startTime, grace, quota].forEach(i => U.clearFieldError(i));

      let hasError = false;

      if (!U.validators.required(compName.value) || compName.value.trim().length < 2 || compName.value.trim().length > 60) {
        U.showFieldError(compName, 'Enter a company name (2 to 60 characters).');
        hasError = true;
      }
      if (!U.validators.required(adminName.value) || adminName.value.trim().length < 2 || adminName.value.trim().length > 60) {
        U.showFieldError(adminName, 'Enter a name (2 to 60 characters).');
        hasError = true;
      }
      if (!U.validators.required(adminEmail.value)) {
        U.showFieldError(adminEmail, 'Enter an email.');
        hasError = true;
      } else if (!U.validators.email(adminEmail.value)) {
        U.showFieldError(adminEmail, 'Enter a valid email, like name@company.com.');
        hasError = true;
      }
      if (adminPwd.value.length < 6) {
        U.showFieldError(adminPwd, 'Use at least 6 characters.');
        hasError = true;
      }
      if (adminPwd.value !== adminConfirm.value) {
        U.showFieldError(adminConfirm, "Passwords don't match.");
        hasError = true;
      }
      if (!/^\d{2}:\d{2}$/.test(startTime.value)) {
        U.showFieldError(startTime, 'Enter a start time.');
        hasError = true;
      }
      const graceVal = Number(grace.value);
      if (!Number.isInteger(graceVal) || graceVal < 0 || graceVal > 120) {
        U.showFieldError(grace, 'Enter whole minutes between 0 and 120.');
        hasError = true;
      }
      const quotaVal = Number(quota.value);
      if (!Number.isInteger(quotaVal) || quotaVal < 1 || quotaVal > 365) {
        U.showFieldError(quota, 'Enter whole days between 1 and 365.');
        hasError = true;
      }
      if (workingDaysState.length === 0) {
        U.toast('Select at least one working day.', 'error');
        hasError = true;
      }

      if (hasError) {
        U.focusFirstError(form);
        return;
      }

      const submitBtn = U.byId('setup-submit-btn');
      submitBtn.disabled = true;

      const res = await Auth.setup({
        company: {
          name: compName.value,
          officeStart: startTime.value,
          graceMinutes: graceVal,
          leaveQuota: quotaVal,
          workingDays: workingDaysState
        },
        admin: {
          name: adminName.value,
          email: adminEmail.value,
          password: adminPwd.value,
          confirmPassword: adminConfirm.value
        }
      });

      if (!res.ok) {
        submitBtn.disabled = false;
        if (res.errors) {
          if (res.errors.companyName) U.showFieldError(compName, res.errors.companyName);
          if (res.errors.adminName) U.showFieldError(adminName, res.errors.adminName);
          if (res.errors.adminEmail) U.showFieldError(adminEmail, res.errors.adminEmail);
          if (res.errors.adminPassword) U.showFieldError(adminPwd, res.errors.adminPassword);
          if (res.errors.adminConfirm) U.showFieldError(adminConfirm, res.errors.adminConfirm);
        }
        U.focusFirstError(form);
      } else {
        U.toast('Company created.', 'success');
        setTimeout(() => {
          window.location.href = 'pages/admin.html';
        }, 300);
      }
    });
  }

  function renderLogin() {
    const comp = Company.get();
    const compName = (comp && comp.name) ? comp.name : 'HCM';

    container.innerHTML =
      '<div style="margin-bottom: var(--s-5);">' +
        '<span style="display:inline-block; font-size: 0.8125rem; font-weight: 600; color: var(--accent); margin-bottom: var(--s-2); text-transform: uppercase;">' + U.esc(compName) + '</span>' +
        '<h2 style="font-size: 1.75rem; margin-bottom: var(--s-2);">Sign in to your account</h2>' +
        '<p style="color: var(--text-2); font-size: 0.875rem;">Enter your email and password to access the portal.</p>' +
      '</div>' +
      '<form id="login-form" novalidate>' +
        '<div class="form-group">' +
          '<label class="form-label" for="login-email">Email address</label>' +
          '<input type="email" id="login-email" class="form-control" placeholder="name@company.com" autocomplete="username" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label" for="login-pwd">Password</label>' +
          '<input type="password" id="login-pwd" class="form-control" autocomplete="current-password" required>' +
        '</div>' +
        '<div id="login-global-error" class="field-error" style="margin-bottom: var(--s-3);"></div>' +
        '<button type="submit" class="btn btn-primary" id="login-submit-btn" style="width: 100%; height: 48px; font-size: 1rem;">' +
          'Sign in' +
        '</button>' +
      '</form>';

    const form = U.byId('login-form');
    const emailInput = U.byId('login-email');
    const pwdInput = U.byId('login-pwd');
    const globalErr = U.byId('login-global-error');

    emailInput.addEventListener('input', () => {
      U.clearFieldError(emailInput);
      globalErr.classList.remove('active');
    });
    pwdInput.addEventListener('input', () => {
      U.clearFieldError(pwdInput);
      globalErr.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      U.clearFieldError(emailInput);
      U.clearFieldError(pwdInput);
      globalErr.classList.remove('active');

      const email = emailInput.value.trim();
      const pwd = pwdInput.value;

      let hasError = false;
      if (!U.validators.required(email)) {
        U.showFieldError(emailInput, 'Enter an email.');
        hasError = true;
      }
      if (!U.validators.required(pwd)) {
        U.showFieldError(pwdInput, 'Enter your password.');
        hasError = true;
      }

      if (hasError) {
        U.focusFirstError(form);
        return;
      }

      const submitBtn = U.byId('login-submit-btn');
      submitBtn.disabled = true;

      const res = await Auth.login(email, pwd);
      if (!res.ok) {
        submitBtn.disabled = false;
        globalErr.innerHTML = (typeof Icons !== 'undefined' ? Icons.svg('alert-circle', { size: 14 }) : '') + '<span>' + U.esc(res.error) + '</span>';
        globalErr.classList.add('active');
        emailInput.setAttribute('aria-invalid', 'true');
        pwdInput.setAttribute('aria-invalid', 'true');
      } else {
        const dest = res.user.role === 'admin' ? 'pages/admin.html' : 'pages/employee.html';
        window.location.href = dest;
      }
    });
  }
})();
