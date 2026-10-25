// HCM — Leave Management Module
// Application validation, balance, quota checks, overlap prevention & Admin decisions
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Leaves = (() => {
  'use strict';

  function getAll() {
    return Store.get(Store.KEYS.leaves, []);
  }

  function saveAll(leaves) {
    Store.set(Store.KEYS.leaves, leaves);
  }

  function forUser(userId, viewer) {
    if (viewer && viewer.role === 'employee' && String(viewer.id) !== String(userId)) {
      return [];
    }
    const all = getAll();
    return all.filter(l => String(l.userId) === String(userId))
      .sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
  }

  function all(filter) {
    const list = getAll();
    let result = list.slice();

    if (filter && filter !== 'all' && filter !== 'All') {
      result = result.filter(l => l.status === filter.toLowerCase());
    }

    return result.sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
  }

  function pending() {
    return getAll().filter(l => l.status === 'pending');
  }

  function balance(userId, year) {
    const comp = Company.get();
    const quota = comp.leaveQuota !== undefined ? Number(comp.leaveQuota) : 12;
    year = String(year || Clock.todayStr().slice(0, 4));

    const userLeaves = getAll().filter(l => String(l.userId) === String(userId));
    let approved = 0;
    let pendingDays = 0;

    userLeaves.forEach(l => {
      if (l.from && l.from.slice(0, 4) === year) {
        if (l.status === 'approved') approved += Number(l.days || 0);
        if (l.status === 'pending') pendingDays += Number(l.days || 0);
      }
    });

    const remaining = Math.max(0, quota - approved);

    return {
      quota,
      approved,
      pending: pendingDays,
      remaining
    };
  }

  function coversDate(userId, dateStr, opts) {
    opts = opts || {};
    const statusMatch = opts.status || 'approved';
    const list = getAll();
    return list.find(l => {
      if (String(l.userId) !== String(userId)) return false;
      if (statusMatch !== 'any' && l.status !== statusMatch) return false;
      return l.from <= dateStr && dateStr <= l.to;
    }) || null;
  }

  function onLeaveOn(dateStr) {
    const comp = Company.get();
    if (!U.isWorkingDay(dateStr, comp)) return [];

    const list = getAll();
    const activeLeaves = list.filter(l => l.status === 'approved' && l.from <= dateStr && dateStr <= l.to);

    return activeLeaves.map(l => {
      const u = Employees.get(l.userId);
      return { user: u, leave: l };
    }).filter(item => item.user !== null);
  }

  function validateApply(userId, form) {
    const errors = {};
    form = form || {};

    const type = String(form.type || '').trim().toLowerCase();
    if (type !== 'casual' && type !== 'sick') {
      errors.type = 'Choose a leave type.';
    }

    const from = String(form.from || '').trim();
    if (!U.validators.required(from)) {
      errors.from = 'Choose a start date.';
    }

    const to = String(form.to || '').trim();
    if (!U.validators.required(to)) {
      errors.to = 'Choose an end date.';
    }

    const reason = String(form.reason || '').trim();
    if (reason.length < 3 || reason.length > 200) {
      errors.reason = 'Enter a reason (3 to 200 characters).';
    }

    if (errors.from || errors.to) {
      return { ok: false, errors, days: 0 };
    }

    // LV-3: from <= to
    if (from > to) {
      errors.to = 'End date must be on or after the start date.';
      return { ok: false, errors, days: 0 };
    }

    // LV-4: same calendar year
    const yearFrom = from.slice(0, 4);
    const yearTo = to.slice(0, 4);
    if (yearFrom !== yearTo) {
      errors.to = "A request can't span two calendar years. Split it into two requests.";
      return { ok: false, errors, days: 0 };
    }

    // LV-5: working days count
    const comp = Company.get();
    const workingDays = U.workingDaysBetween(from, to, comp);
    if (workingDays === 0) {
      errors.to = 'This range has no working days.';
      return { ok: false, errors, days: 0 };
    }

    // LV-6: No overlap with existing pending or approved requests
    const userLeaves = getAll().filter(l => String(l.userId) === String(userId) && (l.status === 'pending' || l.status === 'approved'));
    for (let i = 0; i < userLeaves.length; i++) {
      const ex = userLeaves[i];
      // Overlap condition: max(from1, from2) <= min(to1, to2)
      if (from <= ex.to && to >= ex.from) {
        errors.from = 'Overlaps your ' + ex.status + ' leave from ' + ex.from + ' to ' + ex.to + '.';
        return { ok: false, errors, days: workingDays };
      }
    }

    // LV-7: Quota check
    const bal = balance(userId, yearFrom);
    const availableQuotaForRequest = bal.quota - (bal.approved + bal.pending);
    if (workingDays > availableQuotaForRequest) {
      const leftDays = Math.max(0, availableQuotaForRequest);
      errors.to = 'You have ' + leftDays + ' day(s) left this year; this request needs ' + workingDays + '.';
      return { ok: false, errors, days: workingDays };
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors,
      days: workingDays
    };
  }

  function apply(userId, form) {
    const v = validateApply(userId, form);
    if (!v.ok) {
      return { ok: false, errors: v.errors, days: v.days };
    }

    const list = getAll();
    const newLeave = {
      id: Store.nextId(list),
      userId: userId,
      type: form.type.trim().toLowerCase(),
      from: form.from.trim(),
      to: form.to.trim(),
      days: v.days,
      reason: form.reason.trim(),
      status: 'pending',
      comment: null,
      appliedAt: Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes()),
      decidedAt: null,
      decidedBy: null
    };

    list.push(newLeave);
    saveAll(list);

    return {
      ok: true,
      leave: newLeave
    };
  }

  function cancel(leaveId, userId) {
    const list = getAll();
    const idx = list.findIndex(l => String(l.id) === String(leaveId));
    if (idx === -1) {
      return { ok: false, error: 'Leave request not found.' };
    }

    const item = list[idx];
    if (String(item.userId) !== String(userId)) {
      return { ok: false, error: 'Not authorized to cancel this request.' };
    }

    if (item.status !== 'pending') {
      return { ok: false, error: 'Only pending leave requests can be cancelled.' };
    }

    list.splice(idx, 1);
    saveAll(list);

    return { ok: true };
  }

  function decide(leaveId, decision, comment, adminId) {
    if (decision !== 'approved' && decision !== 'rejected') {
      return { ok: false, error: 'Invalid decision.' };
    }

    const cleanComment = String(comment || '').trim();
    if (decision === 'rejected') {
      if (cleanComment.length < 3) {
        return { ok: false, error: 'Add a comment explaining the rejection.' };
      }
    }

    const list = getAll();
    const idx = list.findIndex(l => String(l.id) === String(leaveId));
    if (idx === -1) {
      return { ok: false, error: 'Leave request not found.' };
    }

    const item = list[idx];
    if (item.status !== 'pending') {
      return { ok: false, error: 'This request has already been decided.' };
    }

    // LV-9: On approve, re-check quota against approved days
    if (decision === 'approved') {
      const year = item.from.slice(0, 4);
      const bal = balance(item.userId, year);
      if (bal.approved + item.days > bal.quota) {
        return { ok: false, error: 'Cannot approve: employee quota has been exceeded or lowered.' };
      }
    }

    item.status = decision;
    item.comment = cleanComment || null;
    item.decidedAt = Clock.todayStr() + ' ' + U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes());
    item.decidedBy = adminId;

    list[idx] = item;
    saveAll(list);

    return { ok: true, leave: item };
  }

  return {
    getAll,
    forUser,
    all,
    pending,
    balance,
    coversDate,
    onLeaveOn,
    validateApply,
    apply,
    cancel,
    decide
  };
})();
