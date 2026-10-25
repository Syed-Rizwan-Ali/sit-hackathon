// HCM — Storage and Clock
// Safe localStorage wrapper and dev-overridable clock
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Store = (() => {
  const KEYS = {
    company: 'hcm_company',
    users: 'hcm_users',
    attendance: 'hcm_attendance',
    leaves: 'hcm_leaves',
    session: 'hcm_session',
    announcements: 'hcm_announcements',
    theme: 'hcm_theme'
  };

  function get(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return fallback;
      return JSON.parse(item);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (typeof U !== 'undefined' && U.toast) {
        U.toast("Couldn't save. Storage is full.", 'error');
      }
      return false;
    }
  }

  function update(key, fn, fallback) {
    const current = get(key, fallback);
    const updated = fn(current);
    const ok = set(key, updated);
    return { ok, value: updated };
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  function nextId(list) {
    list = list || [];
    let id = Date.now();
    const existing = new Set(list.map(item => item && item.id));
    while (existing.has(id)) {
      id++;
    }
    return id;
  }

  return {
    KEYS,
    get,
    set,
    update,
    remove,
    nextId
  };
})();

const Clock = (() => {
  function now() {
    try {
      const dev = localStorage.getItem('hcm_dev_now');
      if (dev) {
        // Expected format "YYYY-MM-DDTHH:MM:SS" (local time, no Z)
        const parts = dev.split('T');
        if (parts.length === 2) {
          const dParts = parts[0].split('-').map(Number);
          const tParts = parts[1].split(':').map(Number);
          if (dParts.length === 3) {
            return new Date(dParts[0], dParts[1] - 1, dParts[2], tParts[0] || 0, tParts[1] || 0, tParts[2] || 0);
          }
        }
      }
    } catch (e) {}
    return new Date();
  }

  function todayStr() {
    const d = now();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function nowMinutes() {
    const d = now();
    return d.getHours() * 60 + d.getMinutes();
  }

  return {
    now,
    todayStr,
    nowMinutes
  };
})();
