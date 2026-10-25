// HCM — Company Module
// Settings, rules, and department management
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Company = (() => {
  function exists() {
    const comp = Store.get(Store.KEYS.company, null);
    return !!(comp && comp.name);
  }

  function get() {
    return Store.get(Store.KEYS.company, {
      name: '',
      officeStart: '09:00',
      graceMinutes: 15,
      leaveQuota: 12,
      workingDays: [1, 2, 3, 4, 5, 6],
      departments: []
    });
  }

  function create(data) {
    data = data || {};
    const record = {
      name: String(data.name || '').trim(),
      officeStart: data.officeStart || '09:00',
      graceMinutes: Number.isInteger(Number(data.graceMinutes)) ? Number(data.graceMinutes) : 15,
      leaveQuota: Number.isInteger(Number(data.leaveQuota)) ? Number(data.leaveQuota) : 12,
      workingDays: Array.isArray(data.workingDays) && data.workingDays.length > 0 ? data.workingDays : [1, 2, 3, 4, 5, 6],
      departments: Array.isArray(data.departments) ? data.departments : [],
      createdAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes())
    };
    Store.set(Store.KEYS.company, record);
    return record;
  }

  function save(patch) {
    const errors = {};
    patch = patch || {};

    if (patch.name !== undefined) {
      const name = String(patch.name).trim();
      if (name.length < 2 || name.length > 60) {
        errors.name = 'Enter a company name (2 to 60 characters).';
      }
    }

    if (patch.officeStart !== undefined) {
      const time = String(patch.officeStart).trim();
      if (!/^\d{2}:\d{2}$/.test(time)) {
        errors.officeStart = 'Enter a start time.';
      }
    }

    if (patch.graceMinutes !== undefined) {
      const g = Number(patch.graceMinutes);
      if (!Number.isInteger(g) || g < 0 || g > 120) {
        errors.graceMinutes = 'Enter whole minutes between 0 and 120.';
      }
    }

    if (patch.leaveQuota !== undefined) {
      const q = Number(patch.leaveQuota);
      if (!Number.isInteger(q) || q < 1 || q > 365) {
        errors.leaveQuota = 'Enter whole days between 1 and 365.';
      }
    }

    if (patch.workingDays !== undefined) {
      if (!Array.isArray(patch.workingDays) || patch.workingDays.length === 0) {
        errors.workingDays = 'Select at least one working day.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    const current = get();
    const updated = Object.assign({}, current, patch);
    Store.set(Store.KEYS.company, updated);
    return { ok: true, company: updated };
  }

  function addDepartment(name) {
    const clean = String(name || '').trim();
    if (clean.length < 2 || clean.length > 40) {
      return { ok: false, error: 'Enter a department name (2 to 40 characters).' };
    }
    const current = get();
    const depts = current.departments || [];
    const lower = clean.toLowerCase();
    if (depts.some(d => d.toLowerCase() === lower)) {
      return { ok: false, error: 'That department already exists.' };
    }
    depts.push(clean);
    current.departments = depts;
    Store.set(Store.KEYS.company, current);
    return { ok: true, departments: depts };
  }

  function removeDepartment(name) {
    const clean = String(name || '').trim().toLowerCase();
    const users = Store.get(Store.KEYS.users, []);
    const inUse = users.some(u => u.role === 'employee' && String(u.department || '').trim().toLowerCase() === clean);
    if (inUse) {
      return { ok: false, error: 'Cannot remove department while employees belong to it.' };
    }

    const current = get();
    const depts = (current.departments || []).filter(d => d.toLowerCase() !== clean);
    current.departments = depts;
    Store.set(Store.KEYS.company, current);
    return { ok: true, departments: depts };
  }

  return {
    exists,
    get,
    create,
    save,
    addDepartment,
    removeDepartment
  };
})();
