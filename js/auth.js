// HCM — Authentication Module
// Password hashing (Web Crypto SHA-256), session management, guards and password change
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Auth = (() => {
  function getPathPrefix() {
    return window.location.pathname.includes('/pages/') ? '' : 'pages/';
  }

  function getRootPrefix() {
    return window.location.pathname.includes('/pages/') ? '../' : '';
  }

  function generateSalt() {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback if getRandomValues unavailable
    let str = '';
    for (let i = 0; i < 32; i++) {
      str += Math.floor(Math.random() * 16).toString(16);
    }
    return str;
  }

  async function hash(password, salt) {
    const input = (salt || '') + String(password || '');
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Simple pure JS fallback for environments without subtle crypto
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(32, '0');
  }

  function setupDone() {
    if (!Company.exists()) return false;
    const users = Store.get(Store.KEYS.users, []);
    return users.some(u => u.role === 'admin');
  }

  async function setup({ company, admin }) {
    const errors = {};

    // Validate company
    const compName = String(company && company.name || '').trim();
    if (compName.length < 2 || compName.length > 60) {
      errors.companyName = 'Enter a company name (2 to 60 characters).';
    }

    // Validate admin
    const adminName = String(admin && admin.name || '').trim();
    if (adminName.length < 2 || adminName.length > 60) {
      errors.adminName = 'Enter a name (2 to 60 characters).';
    }

    const email = String(admin && admin.email || '').trim().toLowerCase();
    if (!U.validators.required(email)) {
      errors.adminEmail = 'Enter an email.';
    } else if (!U.validators.email(email)) {
      errors.adminEmail = 'Enter a valid email, like name@company.com.';
    }

    const pwd = String(admin && admin.password || '');
    if (pwd.length < 6) {
      errors.adminPassword = 'Use at least 6 characters.';
    }

    const confirmPwd = String(admin && admin.confirmPassword || '');
    if (pwd !== confirmPwd) {
      errors.adminConfirm = "Passwords don't match.";
    }

    // Attendance settings validation
    const officeStart = company && company.officeStart ? company.officeStart : '09:00';
    if (!/^\d{2}:\d{2}$/.test(officeStart)) {
      errors.officeStart = 'Enter a start time.';
    }

    const grace = Number(company && company.graceMinutes !== undefined ? company.graceMinutes : 15);
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) {
      errors.graceMinutes = 'Enter whole minutes between 0 and 120.';
    }

    const quota = Number(company && company.leaveQuota !== undefined ? company.leaveQuota : 12);
    if (!Number.isInteger(quota) || quota < 1 || quota > 365) {
      errors.leaveQuota = 'Enter whole days between 1 and 365.';
    }

    const workingDays = Array.isArray(company && company.workingDays) ? company.workingDays : [1, 2, 3, 4, 5, 6];
    if (workingDays.length === 0) {
      errors.workingDays = 'Select at least one working day.';
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    // Save company
    Company.create({
      name: compName,
      officeStart: officeStart,
      graceMinutes: grace,
      leaveQuota: quota,
      workingDays: workingDays,
      departments: []
    });

    // Save admin user
    const salt = generateSalt();
    const passwordHash = await hash(pwd, salt);
    const users = Store.get(Store.KEYS.users, []);

    const adminUser = {
      id: Store.nextId(users),
      name: adminName,
      email: email,
      password: passwordHash,
      salt: salt,
      role: 'admin',
      department: '',
      salary: 0,
      joinedAt: Clock.todayStr(),
      createdAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes()),
      annSeenAt: null
    };

    users.push(adminUser);
    Store.set(Store.KEYS.users, users);

    // Create session
    const session = {
      userId: adminUser.id,
      role: 'admin',
      loginAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes())
    };
    Store.set(Store.KEYS.session, session);

    return { ok: true, user: adminUser };
  }

  async function login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const users = Store.get(Store.KEYS.users, []);
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }

    const passwordHash = await hash(password, user.salt);
    if (passwordHash !== user.password) {
      return { ok: false, error: 'Email or password is incorrect.' };
    }

    const session = {
      userId: user.id,
      role: user.role,
      loginAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes())
    };
    Store.set(Store.KEYS.session, session);

    return { ok: true, user: user };
  }

  function logout() {
    Store.remove(Store.KEYS.session);
    const rootPrefix = getRootPrefix();
    window.location.href = rootPrefix + 'index.html';
  }

  function current() {
    const session = Store.get(Store.KEYS.session, null);
    if (!session || !session.userId) return null;
    const users = Store.get(Store.KEYS.users, []);
    const user = users.find(u => u.id === session.userId);
    return user || null;
  }

  function homeFor(role) {
    const pathPrefix = getPathPrefix();
    return role === 'admin' ? pathPrefix + 'admin.html' : pathPrefix + 'employee.html';
  }

  function requireRole(role) {
    const session = Store.get(Store.KEYS.session, null);
    const rootPrefix = getRootPrefix();
    const pathPrefix = getPathPrefix();

    if (!session || !session.userId) {
      window.location.href = rootPrefix + 'index.html';
      return null;
    }

    const user = current();
    if (!user) {
      // User deleted or invalid session
      Store.remove(Store.KEYS.session);
      window.location.href = rootPrefix + 'index.html';
      return null;
    }

    if (role !== 'any' && role !== user.role) {
      // User is logged in but doesn't have right role
      window.location.href = user.role === 'admin' ? pathPrefix + 'admin.html' : pathPrefix + 'employee.html';
      return null;
    }

    return user;
  }

  async function changePassword(userId, currentPwd, nextPwd, confirmPwd) {
    const errors = {};
    const users = Store.get(Store.KEYS.users, []);
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { ok: false, errors: { current: 'User not found.' } };
    }

    const currentHash = await hash(currentPwd, user.salt);
    if (currentHash !== user.password) {
      errors.current = 'Current password is incorrect.';
    }

    if (String(nextPwd || '').length < 6) {
      errors.new = 'Use at least 6 characters.';
    } else if (nextPwd === currentPwd) {
      errors.new = 'Choose a password different from the current one.';
    }

    if (nextPwd !== confirmPwd) {
      errors.confirm = "Passwords don't match.";
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    // Update password
    const newSalt = generateSalt();
    const newHash = await hash(nextPwd, newSalt);
    user.salt = newSalt;
    user.password = newHash;

    Store.set(Store.KEYS.users, users);
    return { ok: true };
  }

  function watchSession() {
    window.addEventListener('storage', (e) => {
      if (e.key === Store.KEYS.session || e.key === Store.KEYS.users) {
        // Re-evaluate session state on current page
        const isIndex = !window.location.pathname.includes('/pages/');
        const user = current();
        if (isIndex) {
          if (user) {
            window.location.href = user.role === 'admin' ? 'pages/admin.html' : 'pages/employee.html';
          }
        } else {
          if (!user) {
            const rootPrefix = getRootPrefix();
            window.location.href = rootPrefix + 'index.html';
          }
        }
      }
    });
  }

  return {
    generateSalt,
    hash,
    setupDone,
    setup,
    login,
    logout,
    current,
    homeFor,
    requireRole,
    changePassword,
    watchSession
  };
})();
