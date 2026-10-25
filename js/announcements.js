// HCM — Announcements Module
// Company-wide announcements post, delete, list, unread tracking & bell notifications
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Announcements = (() => {
  'use strict';

  function getAll() {
    return Store.get(Store.KEYS.announcements, []);
  }

  function saveAll(items) {
    Store.set(Store.KEYS.announcements, items);
  }

  function list() {
    const items = getAll();
    return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function post({ title, body }, adminId) {
    const errors = {};
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();

    if (cleanTitle.length < 2 || cleanTitle.length > 80) {
      errors.title = 'Enter a title (2 to 80 characters).';
    }

    if (cleanBody.length < 2 || cleanBody.length > 500) {
      errors.body = 'Enter a message (2 to 500 characters).';
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    const items = getAll();
    const nowStr = Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes());

    const item = {
      id: Store.nextId(items),
      title: cleanTitle,
      body: cleanBody,
      createdAt: nowStr,
      authorId: adminId
    };

    items.unshift(item);
    saveAll(items);

    return {
      ok: true,
      announcement: item
    };
  }

  function remove(id) {
    const items = getAll();
    const filtered = items.filter(a => String(a.id) !== String(id));
    if (filtered.length === items.length) {
      return { ok: false, error: 'Announcement not found.' };
    }
    saveAll(filtered);
    return { ok: true };
  }

  function unreadCount(user) {
    if (!user) return 0;
    const items = getAll();
    if (items.length === 0) return 0;
    if (!user.annSeenAt) return items.length;

    return items.filter(a => a.createdAt > user.annSeenAt).length;
  }

  function markSeen(user) {
    if (!user) return;
    const nowStr = Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes());
    const users = Store.get(Store.KEYS.users, []);
    const idx = users.findIndex(u => String(u.id) === String(user.id));
    if (idx !== -1) {
      users[idx].annSeenAt = nowStr;
      Store.set(Store.KEYS.users, users);
      user.annSeenAt = nowStr;
    }
  }

  return {
    list,
    post,
    remove,
    unreadCount,
    markSeen
  };
})();
