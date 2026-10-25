// HCM — Attendance Module
// Check-in, check-out, late grace rules, half-day calculation, day status derived states & month summary
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Attendance = (() => {
  'use strict';

  function getAllRecords() {
    return Store.get(Store.KEYS.attendance, []);
  }

  function saveAllRecords(records) {
    Store.set(Store.KEYS.attendance, records);
  }

  function getApprovedLeave(userId, dateStr) {
    const leaves = Store.get(Store.KEYS.leaves, []);
    return leaves.find(l =>
      String(l.userId) === String(userId) &&
      l.status === 'approved' &&
      l.from <= dateStr &&
      dateStr <= l.to
    ) || null;
  }

  function today(userId) {
    const records = getAllRecords();
    const todayStr = Clock.todayStr();
    return records.find(r => String(r.userId) === String(userId) && r.date === todayStr) || null;
  }

  function checkIn(userId) {
    const todayRecord = today(userId);
    if (todayRecord) {
      return {
        ok: false,
        error: 'You already checked in today at ' + U.time12(todayRecord.checkIn) + '.'
      };
    }

    const todayStr = Clock.todayStr();
    const approvedLeave = getApprovedLeave(userId, todayStr);
    if (approvedLeave) {
      return {
        ok: false,
        error: "You're on approved leave today."
      };
    }

    const comp = Company.get();
    const isWorkingDay = U.isWorkingDay(todayStr, comp);
    const nowTime = U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes());
    const nowMinutes = U.toMinutes(nowTime);

    const officeStartMin = U.toMinutes(comp.officeStart || '09:00');
    const graceMin = Number.isInteger(Number(comp.graceMinutes)) ? Number(comp.graceMinutes) : 15;
    const lateThreshold = officeStartMin + graceMin;

    let isLate = false;
    let isOffDay = false;
    let initialStatus = 'present';

    if (!isWorkingDay) {
      isOffDay = true;
      isLate = false;
      initialStatus = 'present';
    } else {
      isLate = nowMinutes > lateThreshold;
      initialStatus = isLate ? 'late' : 'present';
    }

    const records = getAllRecords();
    const newRecord = {
      id: Store.nextId(records),
      userId: userId,
      date: todayStr,
      checkIn: nowTime,
      checkOut: null,
      hours: null,
      status: initialStatus,
      late: isLate,
      offDay: isOffDay
    };

    records.push(newRecord);
    saveAllRecords(records);

    return {
      ok: true,
      record: newRecord
    };
  }

  function checkOut(userId) {
    const todayRecord = today(userId);
    if (!todayRecord || !todayRecord.checkIn) {
      return {
        ok: false,
        error: 'Check in first.'
      };
    }

    if (todayRecord.checkOut) {
      return {
        ok: false,
        error: 'You already checked out at ' + U.time12(todayRecord.checkOut) + '.'
      };
    }

    const nowTime = U.pad(Clock.now().getHours()) + ':' + U.pad(Clock.now().getMinutes());
    const checkInMin = U.toMinutes(todayRecord.checkIn);
    const checkOutMin = U.toMinutes(nowTime);

    if (checkOutMin < checkInMin) {
      return {
        ok: false,
        error: "Check-out can't be earlier than check-in."
      };
    }

    const totalHours = Math.round(((checkOutMin - checkInMin) / 60) * 100) / 100;
    todayRecord.checkOut = nowTime;
    todayRecord.hours = totalHours;

    // ATT-6: Half day if hours < 5.00 on a working day
    if (!todayRecord.offDay && totalHours < 5.0) {
      todayRecord.status = 'half_day';
    }

    const records = getAllRecords();
    const idx = records.findIndex(r => r.id === todayRecord.id);
    if (idx !== -1) {
      records[idx] = todayRecord;
      saveAllRecords(records);
    }

    return {
      ok: true,
      record: todayRecord
    };
  }

  function forUser(userId, from, to, viewer) {
    // Security check: Employee can only see own records
    if (viewer && viewer.role === 'employee' && String(viewer.id) !== String(userId)) {
      return [];
    }

    const records = getAllRecords();
    return records.filter(r => {
      if (String(r.userId) !== String(userId)) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function dayStatus(userId, dateStr) {
    const user = Employees.get(userId);
    const records = getAllRecords();
    const record = records.find(r => String(r.userId) === String(userId) && r.date === dateStr) || null;
    const comp = Company.get();
    const todayStr = Clock.todayStr();

    // Priority 1: Before joining
    if (user && user.joinedAt && dateStr < user.joinedAt) {
      return { code: 'before_join', record: null, leave: null };
    }

    // Priority 2: Has attendance record
    if (record) {
      if (record.offDay) {
        return { code: 'extra', record: record, leave: null };
      }
      return { code: record.status, record: record, leave: null };
    }

    // Priority 3: Weekly off (non-working day)
    const isWorking = U.isWorkingDay(dateStr, comp);
    if (!isWorking) {
      return { code: 'weekly_off', record: null, leave: null };
    }

    // Priority 4: On approved leave
    const leave = getApprovedLeave(userId, dateStr);
    if (leave) {
      return { code: 'on_leave', record: null, leave: leave };
    }

    // Priority 5: Upcoming (after today)
    if (dateStr > todayStr) {
      return { code: 'upcoming', record: null, leave: null };
    }

    // Priority 6: Today pending check-in
    if (dateStr === todayStr) {
      return { code: 'pending_today', record: null, leave: null };
    }

    // Priority 7: Absent (working day, joined, past date, no record, no leave)
    return { code: 'absent', record: null, leave: null };
  }

  function monthSummary(userId, monthStr) {
    // monthStr e.g. "2026-10"
    const comp = Company.get();
    const parts = monthStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const totalDaysInMonth = U.daysInMonth(year, month);
    const todayStr = Clock.todayStr();

    const days = [];
    let workingDays = 0;
    let presentCount = 0;
    let lateCount = 0;
    let halfCount = 0;
    let absentCount = 0;
    let paidLeaveCount = 0;
    let extraCount = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = year + '-' + U.pad(month) + '-' + U.pad(day);
      const status = dayStatus(userId, dateStr);
      const isWork = U.isWorkingDay(dateStr, comp);

      if (isWork) {
        workingDays++;
      }

      switch (status.code) {
        case 'present':
          presentCount++;
          break;
        case 'late':
          lateCount++;
          break;
        case 'half_day':
          halfCount++;
          break;
        case 'absent':
          // ATT-8: Only days before today count as absent
          if (dateStr < todayStr) {
            absentCount++;
          }
          break;
        case 'on_leave':
          if (isWork) paidLeaveCount++;
          break;
        case 'extra':
          extraCount++;
          break;
        default:
          break;
      }

      days.push({
        date: dateStr,
        code: status.code,
        record: status.record,
        leave: status.leave
      });
    }

    return {
      workingDays,
      present: presentCount,
      late: lateCount,
      half: halfCount,
      absent: absentCount,
      paidLeave: paidLeaveCount,
      extra: extraCount,
      days
    };
  }

  function todayOverview() {
    const comp = Company.get();
    const allEmployees = Employees.list();
    const todayStr = Clock.todayStr();
    const isWorkingToday = U.isWorkingDay(todayStr, comp);

    let present = 0;
    let late = 0;
    let onTime = 0;
    let onLeave = 0;
    let notIn = 0;
    let checkedInNow = 0;
    const rows = [];

    allEmployees.forEach(emp => {
      const status = dayStatus(emp.id, todayStr);
      rows.push({
        user: emp,
        code: status.code,
        record: status.record,
        leave: status.leave
      });

      if (status.record) {
        present++;
        if (status.record.late) {
          late++;
        } else {
          onTime++;
        }
        if (!status.record.checkOut) {
          checkedInNow++;
        }
      } else if (status.code === 'on_leave') {
        onLeave++;
      } else if (status.code === 'pending_today' && isWorkingToday) {
        notIn++;
      }
    });

    const pendingLeaves = Store.get(Store.KEYS.leaves, []).filter(l => l.status === 'pending');

    return {
      total: allEmployees.length,
      present,
      late,
      onTime,
      onLeave,
      notIn: isWorkingToday ? notIn : 0,
      checkedInNow,
      weeklyOff: !isWorkingToday,
      pendingLeavesCount: pendingLeaves.length,
      rows
    };
  }

  function registerFor(dateStr) {
    const allEmployees = Employees.list();
    return allEmployees.map(emp => {
      const status = dayStatus(emp.id, dateStr);
      return {
        user: emp,
        code: status.code,
        record: status.record,
        leave: status.leave
      };
    });
  }

  function hoursThisWeek(userId) {
    const todayStr = Clock.todayStr();
    const range = U.weekRange(todayStr);
    const records = forUser(userId, range.from, range.to);

    let totalHours = 0;
    let openRecords = 0;

    records.forEach(r => {
      if (r.hours !== null && r.hours !== undefined) {
        totalHours += Number(r.hours);
      } else if (!r.checkOut) {
        openRecords++;
      }
    });

    return {
      hours: Math.round(totalHours * 100) / 100,
      openRecords
    };
  }

  function getRecentWorkingDays(n) {
    const comp = Company.get();
    const days = [];
    const todayStr = Clock.todayStr();
    let count = 0;
    for (let i = 0; i < 60 && count < n; i++) {
      const dStr = U.addDays(todayStr, -i);
      if (U.isWorkingDay(dStr, comp)) {
        days.unshift(dStr);
        count++;
      }
    }
    return days;
  }

  function presenceByDeptDays(n) {
    n = n || 14;
    const comp = Company.get();
    const depts = comp.departments || [];
    const days = getRecentWorkingDays(n);
    const allEmployees = Employees.list();
    const records = getAllRecords();

    const deptResults = depts.map(deptName => {
      const deptEmps = allEmployees.filter(e => e.department === deptName);
      const total = deptEmps.length;
      const cells = days.map(dayStr => {
        if (total === 0) {
          return { date: dayStr, present: 0, total: 0 };
        }
        let presentCount = 0;
        deptEmps.forEach(emp => {
          const hasRec = records.some(r => String(r.userId) === String(emp.id) && r.date === dayStr && r.checkIn);
          if (hasRec) presentCount++;
        });
        return { date: dayStr, present: presentCount, total };
      });
      return { name: deptName, cells };
    });

    return { days, depts: deptResults };
  }

  function trend(n) {
    n = n || 14;
    const days = getRecentWorkingDays(n);
    const records = getAllRecords();

    return days.map(dayStr => {
      const dayRecs = records.filter(r => r.date === dayStr && r.checkIn);
      const present = dayRecs.length;
      const late = dayRecs.filter(r => r.late).length;
      return { date: dayStr, present, late };
    });
  }

  return {
    today,
    checkIn,
    checkOut,
    forUser,
    dayStatus,
    monthSummary,
    todayOverview,
    registerFor,
    hoursThisWeek,
    presenceByDeptDays,
    trend
  };
})();
