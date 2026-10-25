// HCM — UI Shell & Global Components
// Floating pill nav, mobile tab bar, theme toggle, avatar menu, notifications and password modal
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const UI = (() => {
  function getPathPrefix() {
    // Check if we are inside pages/ directory
    return window.location.pathname.includes('/pages/') ? '' : 'pages/';
  }

  function getRootPrefix() {
    return window.location.pathname.includes('/pages/') ? '../' : '';
  }

  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') theme = 'light';
    Store.set(Store.KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.dispatchEvent(new CustomEvent('hcm:themechange', { detail: { theme } }));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  function openPasswordModal() {
    const user = Auth.current();
    if (!user) return;

    const form = document.createElement('form');
    form.noValidate = true;
    form.innerHTML =
      '<div class="form-group">' +
        '<label class="form-label" for="pwd-current">Current password</label>' +
        '<input type="password" id="pwd-current" class="form-control" autocomplete="current-password" required>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="pwd-new">New password</label>' +
        '<input type="password" id="pwd-new" class="form-control" autocomplete="new-password" required minlength="6">' +
        '<span class="form-hint">At least 6 characters, different from current</span>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="pwd-confirm">Confirm new password</label>' +
        '<input type="password" id="pwd-confirm" class="form-control" autocomplete="new-password" required>' +
      '</div>';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.innerHTML =
      '<button type="button" class="btn btn-secondary modal-cancel">Cancel</button>' +
      '<button type="submit" class="btn btn-primary modal-save">Update password</button>';

    const m = U.modal.open({
      title: 'Change password',
      body: form,
      actions: actions
    });

    actions.querySelector('.modal-cancel').addEventListener('click', () => m.close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currInput = form.querySelector('#pwd-current');
      const newInput = form.querySelector('#pwd-new');
      const confInput = form.querySelector('#pwd-confirm');

      U.clearFieldError(currInput);
      U.clearFieldError(newInput);
      U.clearFieldError(confInput);

      const res = await Auth.changePassword(user.id, currInput.value, newInput.value, confInput.value);
      if (!res.ok) {
        if (res.errors.current) U.showFieldError(currInput, res.errors.current);
        if (res.errors.new) U.showFieldError(newInput, res.errors.new);
        if (res.errors.confirm) U.showFieldError(confInput, res.errors.confirm);
        U.focusFirstError(form);
      } else {
        m.close();
        U.toast('Password updated.', 'success');
      }
    });

    // Also link submit button outside form
    actions.querySelector('.modal-save').addEventListener('click', () => {
      form.requestSubmit();
    });
  }

  function openBell() {
    const user = Auth.current();
    if (!user) return;

    if (typeof Announcements !== 'undefined') {
      Announcements.markSeen(user);
    }
    updateBellBadge();

    const list = typeof Announcements !== 'undefined' ? Announcements.list() : [];

    const body = document.createElement('div');
    if (list.length === 0) {
      body.innerHTML =
        '<div class="empty-state" style="padding:var(--s-4) 0;">' +
          '<p class="empty-state-title">No announcements</p>' +
          '<p class="empty-state-text">Company announcements will appear here.</p>' +
        '</div>';
    } else {
      const itemsHtml = list.map(a =>
        '<div style="padding:var(--s-3) 0; border-bottom:1px solid var(--line);">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">' +
            '<strong style="font-size:0.9375rem; color:var(--text);">' + U.esc(a.title) + '</strong>' +
            '<span style="font-size:0.75rem; color:var(--text-3);">' + U.dateLabel(a.createdAt ? a.createdAt.slice(0, 10) : '') + '</span>' +
          '</div>' +
          '<p style="font-size:0.875rem; color:var(--text-2); line-height:1.4;">' + U.esc(a.body) + '</p>' +
        '</div>'
      ).join('');
      body.innerHTML = '<div style="max-height:360px; overflow-y:auto;">' + itemsHtml + '</div>';
    }

    U.modal.open({
      title: 'Announcements',
      body: body,
      actions: '<button type="button" class="btn btn-secondary" id="bell-close-btn">Close</button>'
    });

    const closeBtn = U.byId('bell-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => U.modal.close());
    }
  }

  function updateBellBadge() {
    const user = Auth.current();
    const bellBtn = document.querySelector('.bell-btn');
    if (!bellBtn || !user) return;

    const unread = typeof Announcements !== 'undefined' ? Announcements.unreadCount(user) : 0;
    let dot = bellBtn.querySelector('.icon-badge-dot');
    if (unread > 0) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'icon-badge-dot';
        bellBtn.appendChild(dot);
      }
    } else if (dot) {
      dot.remove();
    }
  }

  function mountShell(opts) {
    opts = opts || {};
    const role = opts.role || 'employee';
    const active = opts.active || '';
    const shellEl = U.byId('shell');
    if (!shellEl) return;

    const user = Auth.current();
    const pathPrefix = getPathPrefix();
    const rootPrefix = getRootPrefix();

    // Check pending leave count for Admin
    let pendingLeavesCount = 0;
    if (role === 'admin' && typeof Leaves !== 'undefined') {
      pendingLeavesCount = Leaves.pending().length;
    }

    // Build nav items per role
    let desktopLinks = '';
    let mobileTabs = '';

    if (role === 'admin') {
      const items = [
        { id: 'admin', label: 'Dashboard', href: pathPrefix + 'admin.html', icon: 'dashboard' },
        { id: 'employees', label: 'Employees', href: pathPrefix + 'employees.html', icon: 'users' },
        { id: 'leaves', label: 'Leaves', href: pathPrefix + 'leaves.html', icon: 'calendar', badge: pendingLeavesCount },
        { id: 'payslip', label: 'Payslips', href: pathPrefix + 'payslip.html', icon: 'wallet' },
        { id: 'settings', label: 'Settings', href: pathPrefix + 'settings.html', icon: 'sliders' }
      ];

      desktopLinks = items.map(item => {
        const isActive = active === item.id ? ' active' : '';
        const badgeHtml = (item.badge && item.badge > 0) ? '<span class="nav-badge">' + item.badge + '</span>' : '';
        return '<li><a href="' + item.href + '" class="nav-link' + isActive + '">' + U.esc(item.label) + badgeHtml + '</a></li>';
      }).join('');

      mobileTabs = items.map(item => {
        const isActive = active === item.id ? ' active' : '';
        return '<a href="' + item.href + '" class="tab-link' + isActive + '">' +
          Icons.svg(item.icon, { size: 22 }) +
          '<span>' + U.esc(item.label) + '</span>' +
          '</a>';
      }).join('');
    } else {
      const items = [
        { id: 'employee', label: 'Dashboard', href: pathPrefix + 'employee.html', icon: 'dashboard' },
        { id: 'payslip', label: 'Payslip', href: pathPrefix + 'payslip.html', icon: 'wallet' }
      ];

      desktopLinks = items.map(item => {
        const isActive = active === item.id ? ' active' : '';
        return '<li><a href="' + item.href + '" class="nav-link' + isActive + '">' + U.esc(item.label) + '</a></li>';
      }).join('');

      mobileTabs = items.map(item => {
        const isActive = active === item.id ? ' active' : '';
        return '<a href="' + item.href + '" class="tab-link' + isActive + '">' +
          Icons.svg(item.icon, { size: 22 }) +
          '<span>' + U.esc(item.label) + '</span>' +
          '</a>';
      }).join('');
    }

    const homeUrl = role === 'admin' ? pathPrefix + 'admin.html' : pathPrefix + 'employee.html';
    const userInitials = user ? U.initials(user.name) : 'U';

    shellEl.innerHTML =
      '<header class="shell-header">' +
        '<nav class="nav-pill" aria-label="Main navigation">' +
          '<a href="' + homeUrl + '" class="brand" aria-label="HCM Home">' +
            Icons.wordmark({ height: 24 }) +
          '</a>' +
          '<ul class="nav-links">' +
            desktopLinks +
          '</ul>' +
          '<div class="nav-actions">' +
            '<button type="button" class="icon-btn bell-btn" aria-label="Announcements">' +
              Icons.svg('bell', { size: 18 }) +
            '</button>' +
            '<button type="button" class="icon-btn theme-toggle-btn" aria-label="Toggle theme">' +
              Icons.svg('sun', { size: 18, className: 'theme-icon-sun' }) +
            '</button>' +
            '<div style="position:relative;">' +
              '<button type="button" class="avatar-btn" aria-haspopup="true" aria-expanded="false" aria-label="User menu">' +
                U.esc(userInitials) +
              '</button>' +
              '<div class="menu-dropdown" role="menu">' +
                '<div class="menu-header">' +
                  '<div class="menu-header-name">' + U.esc(user ? user.name : '') + '</div>' +
                  '<div>' + U.esc(user ? user.email : '') + '</div>' +
                  '<div style="text-transform:capitalize; margin-top:2px;">Role: ' + U.esc(user ? user.role : '') + '</div>' +
                '</div>' +
                '<div class="menu-divider"></div>' +
                '<button type="button" class="menu-item menu-pwd-btn" role="menuitem">' +
                  Icons.svg('lock', { size: 16 }) +
                  '<span>Change password</span>' +
                '</button>' +
                '<button type="button" class="menu-item menu-logout-btn" role="menuitem" style="color:var(--danger);">' +
                  Icons.svg('log-out', { size: 16 }) +
                  '<span>Sign out</span>' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</nav>' +
      '</header>' +
      '<nav class="bottom-tab-bar" aria-label="Mobile navigation">' +
        mobileTabs +
      '</nav>';

    // Attach shell listeners
    const themeBtn = shellEl.querySelector('.theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }

    const bellBtn = shellEl.querySelector('.bell-btn');
    if (bellBtn) {
      bellBtn.addEventListener('click', openBell);
    }
    updateBellBadge();

    const avatarBtn = shellEl.querySelector('.avatar-btn');
    const dropdown = shellEl.querySelector('.menu-dropdown');
    if (avatarBtn && dropdown) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open', !isOpen);
        avatarBtn.setAttribute('aria-expanded', String(!isOpen));
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn) {
          dropdown.classList.remove('open');
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const pwdBtn = shellEl.querySelector('.menu-pwd-btn');
    if (pwdBtn) {
      pwdBtn.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('open');
        openPasswordModal();
      });
    }

    const logoutBtn = shellEl.querySelector('.menu-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.logout();
      });
    }
  }

  return {
    mountShell,
    setTheme,
    toggleTheme,
    openPasswordModal,
    openBell,
    updateBellBadge
  };
})();
