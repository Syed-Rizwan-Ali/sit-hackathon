// HCM — Employees Module
// Employee directory, validation, cascaded deletion, search & credentials generation
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Employees = (() => {
  function list() {
    const users = Store.get(Store.KEYS.users, []);
    return users.filter(u => u.role === 'employee');
  }

  function get(id) {
    const users = Store.get(Store.KEYS.users, []);
    return users.find(u => String(u.id) === String(id) && u.role === 'employee') || null;
  }

  function counts() {
    const employees = list();
    const depts = {};
    employees.forEach(e => {
      const d = e.department || 'Unassigned';
      depts[d] = (depts[d] || 0) + 1;
    });
    return {
      total: employees.length,
      byDept: depts
    };
  }

  function validate(form, editingId) {
    const errors = {};
    form = form || {};

    // Name
    const name = String(form.name || '').trim();
    if (name.length < 2 || name.length > 60) {
      errors.name = 'Enter a name (2 to 60 characters).';
    }

    // Email
    const email = String(form.email || '').trim().toLowerCase();
    if (!U.validators.required(email)) {
      errors.email = 'Enter an email.';
    } else if (!U.validators.email(email)) {
      errors.email = 'Enter a valid email, like name@company.com.';
    } else {
      const allUsers = Store.get(Store.KEYS.users, []);
      const taken = allUsers.some(u => u.email.toLowerCase() === email && String(u.id) !== String(editingId));
      if (taken) {
        errors.email = 'This email is already used by another account.';
      }
    }

    // Department
    const dept = String(form.department || '').trim();
    if (!U.validators.required(dept)) {
      errors.department = 'Choose a department.';
    }

    // Salary
    const salary = Number(form.salary);
    if (!U.validators.positiveNumber(salary, 10000000)) {
      errors.salary = 'Enter a salary greater than 0.';
    }

    // Joining Date
    const today = Clock.todayStr();
    const joinedAt = String(form.joinedAt || '').trim();
    if (!U.validators.required(joinedAt)) {
      errors.joinedAt = 'Enter a joining date.';
    } else if (joinedAt > today) {
      errors.joinedAt = "Joining date can't be in the future.";
    }

    // Optional new password for editing
    if (editingId && form.password) {
      if (String(form.password).length < 6) {
        errors.password = 'Use at least 6 characters.';
      }
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors
    };
  }

  function generatePassword(len) {
    len = len || 8;
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
    let pwd = '';
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(len);
      window.crypto.getRandomValues(bytes);
      for (let i = 0; i < len; i++) {
        pwd += chars[bytes[i] % chars.length];
      }
    } else {
      for (let i = 0; i < len; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return pwd;
  }

  async function add(form) {
    const v = validate(form, null);
    if (!v.ok) {
      return { ok: false, errors: v.errors };
    }

    const plainPassword = form.password && String(form.password).length >= 6 ? form.password : generatePassword(8);
    const salt = Auth.generateSalt();
    const passwordHash = await Auth.hash(plainPassword, salt);

    const users = Store.get(Store.KEYS.users, []);
    const newEmp = {
      id: Store.nextId(users),
      name: String(form.name).trim(),
      email: String(form.email).trim().toLowerCase(),
      password: passwordHash,
      salt: salt,
      role: 'employee',
      department: String(form.department).trim(),
      salary: Number(form.salary),
      joinedAt: form.joinedAt || Clock.todayStr(),
      createdAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes()),
      annSeenAt: null
    };

    users.push(newEmp);
    Store.set(Store.KEYS.users, users);

    return {
      ok: true,
      user: newEmp,
      plainPassword: plainPassword
    };
  }

  async function update(id, form) {
    const v = validate(form, id);
    if (!v.ok) {
      return { ok: false, errors: v.errors };
    }

    const users = Store.get(Store.KEYS.users, []);
    const idx = users.findIndex(u => String(u.id) === String(id) && u.role === 'employee');
    if (idx === -1) {
      return { ok: false, errors: { general: 'Employee not found.' } };
    }

    const emp = users[idx];
    emp.name = String(form.name).trim();
    emp.email = String(form.email).trim().toLowerCase();
    emp.department = String(form.department).trim();
    emp.salary = Number(form.salary);
    emp.joinedAt = form.joinedAt;

    if (form.password && String(form.password).length >= 6) {
      const salt = Auth.generateSalt();
      emp.salt = salt;
      emp.password = await Auth.hash(form.password, salt);
    }

    users[idx] = emp;
    Store.set(Store.KEYS.users, users);

    return { ok: true, user: emp };
  }

  function remove(id) {
    const users = Store.get(Store.KEYS.users, []);
    const emp = users.find(u => String(u.id) === String(id));
    if (!emp || emp.role !== 'employee') {
      return { ok: false, error: 'Employee not found.' };
    }

    // Cascade remove attendance
    const attendance = Store.get(Store.KEYS.attendance, []);
    const remainingAttendance = attendance.filter(a => String(a.userId) !== String(id));
    const deletedAttendanceCount = attendance.length - remainingAttendance.length;
    Store.set(Store.KEYS.attendance, remainingAttendance);

    // Cascade remove leaves
    const leaves = Store.get(Store.KEYS.leaves, []);
    const remainingLeaves = leaves.filter(l => String(l.userId) !== String(id));
    const deletedLeavesCount = leaves.length - remainingLeaves.length;
    Store.set(Store.KEYS.leaves, remainingLeaves);

    // Remove user
    const remainingUsers = users.filter(u => String(u.id) !== String(id));
    Store.set(Store.KEYS.users, remainingUsers);

    return {
      ok: true,
      deletedAttendanceCount,
      deletedLeavesCount
    };
  }

  function search(query, department) {
    let listArr = list();
    query = String(query || '').trim().toLowerCase();
    department = String(department || '').trim();

    if (query) {
      listArr = listArr.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    if (department && department !== 'All departments' && department !== 'all') {
      listArr = listArr.filter(u =>
        u.department.toLowerCase() === department.toLowerCase()
      );
    }

    return listArr;
  }

  return {
    list,
    get,
    counts,
    validate,
    generatePassword,
    add,
    update,
    remove,
    search
  };
})();
