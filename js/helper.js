// HCM — Smart Helper (Rule-based NLP)
// Rule-based keyword matching answering queries from actual HCM data
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Helper = (() => {
  'use strict';

  function normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatNames(names) {
    if (!names || names.length === 0) return '';
    if (names.length <= 10) return names.join(', ');
    return names.slice(0, 10).join(', ') + ' and ' + (names.length - 10) + ' more';
  }

  function getMonthYearStr(dateStr) {
    const d = U.parseDate(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function answer(rawText, user) {
    const norm = normalize(rawText);
    const isAdmin = user && user.role === 'admin';

    if (isAdmin) {
      return answerAdmin(norm, user);
    } else {
      return answerEmployee(norm, user);
    }
  }

  function answerAdmin(norm, user) {
    const comp = Company.get();
    const todayStr = Clock.todayStr();

    // A1: pending
    if (norm.includes('pending')) {
      const leaves = Store.get(Store.KEYS.leaves, []).filter(l => l.status === 'pending');
      leaves.sort((a, b) => (a.appliedAt || a.from).localeCompare(b.appliedAt || b.from));

      if (leaves.length === 0) {
        return { text: '0 leave requests waiting for approval.' };
      }

      const users = Employees.list();
      const userMap = new Map(users.map(u => [String(u.id), u]));
      const oldest3 = leaves.slice(0, 3).map(l => {
        const emp = userMap.get(String(l.userId));
        const name = emp ? emp.name : 'Employee #' + l.userId;
        return name + ' (' + l.from + ' to ' + l.to + ', ' + l.days + 'd ' + l.type + ')';
      });

      return {
        text: leaves.length + (leaves.length === 1 ? ' leave request' : ' leave requests') + ' waiting for approval.',
        items: oldest3
      };
    }

    // A2: leave and one of (today, now, who, how many)
    if (norm.includes('leave') && (norm.includes('today') || norm.includes('now') || norm.includes('who') || norm.includes('how many') || norm.includes('many'))) {
      const leaves = Store.get(Store.KEYS.leaves, []).filter(l =>
        l.status === 'approved' && l.from <= todayStr && todayStr <= l.to
      );

      if (leaves.length === 0) {
        return { text: 'Nobody is on leave today.' };
      }

      let casual = 0;
      let sick = 0;
      const names = [];
      const users = Employees.list();
      const userMap = new Map(users.map(u => [String(u.id), u]));

      leaves.forEach(l => {
        if (l.type === 'sick') sick++;
        else casual++;
        const emp = userMap.get(String(l.userId));
        if (emp) names.push(emp.name);
      });

      const total = leaves.length;
      return {
        text: total + (total === 1 ? ' employee' : ' employee(s)') + ' on leave today: ' + casual + ' casual, ' + sick + ' sick. (' + formatNames(names) + ')'
      };
    }

    // A3: late
    if (norm.includes('late')) {
      const overview = Attendance.todayOverview();
      const lateRows = overview.rows.filter(r => r.record && r.record.late);

      if (lateRows.length === 0) {
        return { text: 'Nobody was late today.' };
      }

      const namesWithTimes = lateRows.map(r => r.user.name + ' (' + U.time12(r.record.checkIn) + ')');
      return {
        text: lateRows.length + (lateRows.length === 1 ? ' employee was' : ' employee(s) were') + ' late today:',
        items: namesWithTimes
      };
    }

    // A4: absent, not in, not checked, missing
    if (norm.includes('absent') || norm.includes('not in') || norm.includes('not checked') || norm.includes('missing')) {
      const overview = Attendance.todayOverview();
      const notInRows = overview.rows.filter(r => r.code === 'pending_today');

      if (notInRows.length === 0) {
        return { text: 'All employees have checked in today.' };
      }

      const names = notInRows.map(r => r.user.name);
      return {
        text: notInRows.length + (notInRows.length === 1 ? ' employee has' : ' employee(s) haven\'t') + ' checked in yet:',
        items: names
      };
    }

    // A5: present, checked in, in office, attendance
    if (norm.includes('present') || norm.includes('checked in') || norm.includes('in office') || norm.includes('attendance')) {
      const overview = Attendance.todayOverview();
      return {
        text: overview.present + ' present today (' + overview.late + ' late), ' + overview.onLeave + ' on leave.'
      };
    }

    // A6: department or a department name
    const depts = comp.departments || [];
    const matchedDept = depts.find(d => norm.includes(normalize(d)));
    if (matchedDept) {
      const empsInDept = Employees.list().filter(e => e.department && normalize(e.department) === normalize(matchedDept));
      const names = empsInDept.map(e => e.name);
      return {
        text: matchedDept + ' has ' + empsInDept.length + (empsInDept.length === 1 ? ' employee' : ' employees') + (names.length > 0 ? ': ' + formatNames(names) : '.')
      };
    }
    if (norm.includes('department')) {
      const counts = Employees.counts();
      const parts = Object.keys(counts.byDept).map(d => d + ' (' + counts.byDept[d] + ')');
      return {
        text: parts.length > 0 ? 'Headcount by department: ' + parts.join(', ') : 'No departments configured yet.'
      };
    }

    // A7: how many with (employee, staff, people, headcount, team)
    if (norm.includes('how many') && (norm.includes('employee') || norm.includes('staff') || norm.includes('people') || norm.includes('headcount') || norm.includes('team'))) {
      const emps = Employees.list();
      const deptSet = new Set(emps.map(e => e.department).filter(Boolean));
      return {
        text: 'You have ' + emps.length + (emps.length === 1 ? ' employee' : ' employees') + ' in ' + deptSet.size + (deptSet.size === 1 ? ' department.' : ' departments.')
      };
    }

    // A8: office, start, grace, quota, working days, hours
    if (norm.includes('office') || norm.includes('start') || norm.includes('grace') || norm.includes('quota') || norm.includes('working days') || norm.includes('hours')) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const workDayStrs = (comp.workingDays || [1,2,3,4,5,6]).map(d => dayNames[d]).join(', ');
      return {
        text: 'Office starts at ' + U.time12(comp.officeStart || '09:00') + ' with ' + (comp.graceMinutes !== undefined ? comp.graceMinutes : 15) + ' mins grace. Working days: ' + workDayStrs + '. Annual leave quota: ' + (comp.leaveQuota || 12) + ' days.'
      };
    }

    // A9: help, hi, hello, what can you
    if (norm.includes('help') || norm.includes('hi') || norm.includes('hello') || norm.includes('what can you')) {
      return {
        text: 'I can answer questions about today\'s attendance, who is late or on leave, pending requests, department headcounts, and company settings.'
      };
    }

    // Fallback
    return {
      text: "I can't answer that yet. Try one of these:"
    };
  }

  function answerEmployee(norm, user) {
    const comp = Company.get();
    const todayStr = Clock.todayStr();
    const currentYear = Clock.now().getFullYear();
    const currentMonth = todayStr.slice(0, 7);

    // E0: Privacy guard
    // Check if employee is asking about others:
    // employees, everyone, colleagues, team, staff, another user's name, or "who" without "i" or "my"
    const allEmps = Employees.list();
    const otherEmps = allEmps.filter(e => String(e.id) !== String(user.id));
    const asksAboutOtherName = otherEmps.some(e => {
      const nameParts = normalize(e.name).split(' ').filter(p => p.length >= 3);
      return nameParts.some(part => norm.includes(part));
    });

    const isAskingAboutOthers =
      norm.includes('employees') ||
      norm.includes('everyone') ||
      norm.includes('colleagues') ||
      norm.includes('team') ||
      norm.includes('staff') ||
      asksAboutOtherName ||
      (norm.includes('who') && !norm.includes('i') && !norm.includes('my'));

    if (isAskingAboutOthers) {
      return {
        text: 'I can only answer questions about your own attendance and leave.'
      };
    }

    // E1: leave with (left, remaining, balance, quota, many, available)
    if (norm.includes('leave') && (norm.includes('left') || norm.includes('remaining') || norm.includes('balance') || norm.includes('quota') || norm.includes('many') || norm.includes('available'))) {
      const bal = Leaves.balance(user.id, currentYear);
      return {
        text: 'You have ' + bal.remaining + (bal.remaining === 1 ? ' leave day' : ' leave days') + ' left this year (quota ' + bal.quota + ', approved ' + bal.approved + ', pending ' + bal.pending + ').'
      };
    }

    // E2: (leave or request) with (status, approved, rejected, pending, last, latest)
    if ((norm.includes('leave') || norm.includes('request')) && (norm.includes('status') || norm.includes('approved') || norm.includes('rejected') || norm.includes('pending') || norm.includes('last') || norm.includes('latest'))) {
      const myLeaves = Leaves.forUser(user.id);
      if (myLeaves.length === 0) {
        return { text: "You haven't requested any leave." };
      }
      const latest = myLeaves[0]; // newest first
      let ans = 'Your latest request (' + latest.type + ', ' + latest.from + ' to ' + latest.to + ') is ' + latest.status + '.';
      if (latest.comment) {
        ans += ' Admin comment: ' + latest.comment;
      }
      return { text: ans };
    }

    // E3: late
    if (norm.includes('late')) {
      const rec = Attendance.today(user.id);
      if (!rec || !rec.checkIn) {
        return { text: "You haven't checked in yet today." };
      }

      if (rec.late) {
        const officeStartMin = U.toMinutes(comp.officeStart || '09:00');
        const graceMin = comp.graceMinutes !== undefined ? comp.graceMinutes : 15;
        const threshold = officeStartMin + graceMin;
        const checkInMin = U.toMinutes(rec.checkIn);
        const minsLate = Math.max(1, checkInMin - threshold);
        const graceEndHours = Math.floor(threshold / 60);
        const graceEndMins = threshold % 60;
        const graceEndStr = U.time12(U.pad(graceEndHours) + ':' + U.pad(graceEndMins));

        return {
          text: 'Yes, you checked in at ' + U.time12(rec.checkIn) + ', ' + minsLate + ' minutes after the grace period ended (' + graceEndStr + ').'
        };
      } else {
        return {
          text: 'No, you checked in on time at ' + U.time12(rec.checkIn) + '.'
        };
      }
    }

    // E4: hours with week
    if (norm.includes('hours') && norm.includes('week')) {
      const hw = Attendance.hoursThisWeek(user.id);
      let text = 'You worked ' + hw.hours + ' hours this week (Monday to today).';
      if (hw.openRecords > 0) {
        text += ' (excluding currently open record)';
      }
      return { text: text };
    }

    // E5: hours with today, or check in, check out, when did i
    if ((norm.includes('hours') && norm.includes('today')) || norm.includes('check in') || norm.includes('check out') || norm.includes('when did i')) {
      const rec = Attendance.today(user.id);
      if (!rec || !rec.checkIn) {
        return { text: "You haven't checked in yet today." };
      }
      if (!rec.checkOut) {
        return {
          text: 'Today you checked in at ' + U.time12(rec.checkIn) + '. You haven\'t checked out yet.'
        };
      }
      return {
        text: 'Today you checked in at ' + U.time12(rec.checkIn) + ', checked out at ' + U.time12(rec.checkOut) + ', and worked ' + rec.hours + ' hours.'
      };
    }

    // E6: attendance, absent, present, half
    if (norm.includes('attendance') || norm.includes('absent') || norm.includes('present') || norm.includes('half')) {
      const summ = Attendance.monthSummary(user.id, currentMonth);
      return {
        text: 'This month: ' + summ.present + ' present (including ' + summ.late + ' late), ' + summ.half + ' half day(s), ' + summ.absent + ' absent.'
      };
    }

    // E7: salary, payslip, net, deduction, pay
    if (norm.includes('salary') || norm.includes('payslip') || norm.includes('net') || norm.includes('deduction') || norm.includes('pay')) {
      const slip = Payslip.build(user.id, currentMonth);
      const mLabel = getMonthYearStr(todayStr);
      return {
        text: 'For ' + mLabel + ', estimated net salary is ' + U.pkr(slip.net, 0) + ' with ' + U.pkr(slip.deduction, 0) + ' deductions (' + slip.absent + ' absent, ' + slip.half + ' half day).'
      };
    }

    // E8: help, hi, hello
    if (norm.includes('help') || norm.includes('hi') || norm.includes('hello')) {
      return {
        text: 'I can answer questions about your attendance, remaining leave balance, leave request status, work hours this week, and estimated payslip.'
      };
    }

    // Fallback
    return {
      text: "I can't answer that yet. Try one of these:"
    };
  }

  function mount(mountEl, user) {
    if (!mountEl) return;

    const isAdmin = user && user.role === 'admin';
    const chips = isAdmin ? [
      'Who is on leave today?',
      'Who was late today?',
      'Pending leave requests',
      'Who hasn\'t checked in yet?',
      'Department headcount',
      'Company settings'
    ] : [
      'How many leaves do I have left?',
      'Was I late today?',
      'How many hours did I work this week?',
      'Status of my latest leave request',
      'My attendance this month',
      'My estimated payslip'
    ];

    mountEl.innerHTML =
      '<div class="card helper-card">' +
        '<div class="card-header" style="margin-bottom:0;">' +
          '<div>' +
            '<h2 class="card-title">Ask HCM</h2>' +
            '<p class="helper-caption">Answers come from your HCM data.</p>' +
          '</div>' +
        '</div>' +
        '<div class="helper-log" id="helper-log" role="log" aria-live="polite">' +
          '<div class="helper-msg msg-assistant">' +
            'Hello! Ask a question or click a suggestion below.' +
          '</div>' +
        '</div>' +
        '<div class="helper-chips">' +
          chips.map(c => '<button type="button" class="helper-chip-btn" data-query="' + U.esc(c) + '">' + U.esc(c) + '</button>').join('') +
        '</div>' +
        '<form class="helper-form" id="helper-form">' +
          '<input type="text" id="helper-input" class="helper-input" placeholder="Ask a question..." aria-label="Ask HCM helper">' +
          '<button type="submit" class="btn btn-primary helper-send-btn" aria-label="Send question">' +
            Icons.svg('send', { size: 16 }) +
          '</button>' +
        '</form>' +
      '</div>';

    const logEl = mountEl.querySelector('#helper-log');
    const formEl = mountEl.querySelector('#helper-form');
    const inputEl = mountEl.querySelector('#helper-input');

    function sendQuery(text) {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();

      // Append user msg
      const userBubble = document.createElement('div');
      userBubble.className = 'helper-msg msg-user';
      userBubble.textContent = cleanText;
      logEl.appendChild(userBubble);

      // Compute answer
      const res = answer(cleanText, user);

      // Append assistant msg
      const asstBubble = document.createElement('div');
      asstBubble.className = 'helper-msg msg-assistant';
      asstBubble.textContent = res.text;

      if (res.items && res.items.length > 0) {
        const itemsList = document.createElement('div');
        itemsList.className = 'helper-msg-items';
        res.items.forEach(it => {
          const itemEl = document.createElement('div');
          itemEl.textContent = '• ' + it;
          itemsList.appendChild(itemEl);
        });
        asstBubble.appendChild(itemsList);
      }

      logEl.appendChild(asstBubble);
      logEl.scrollTop = logEl.scrollHeight;

      inputEl.value = '';
      inputEl.focus();
    }

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      sendQuery(inputEl.value);
    });

    mountEl.querySelectorAll('.helper-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sendQuery(btn.dataset.query);
      });
    });
  }

  return {
    normalize,
    answer,
    mount
  };
})();
