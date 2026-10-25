// HCM — Data Visualisation & Charts
// Chart.js department bar, 14-day trend line, presence heatmap, check-in timeline, month calendar
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Charts = (() => {
  'use strict';

  const chartInstances = new Map();

  function getColor(varName, fallback) {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return val || fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Redraw charts when theme changes
  window.addEventListener('hcm:themechange', () => {
    chartInstances.forEach((chart, key) => {
      if (chart && typeof chart.update === 'function') {
        const accent = getColor('--accent', '#E85D0C');
        const text2 = getColor('--text-2', '#55534E');
        const line = getColor('--line', '#D3D3CF');
        const surface3 = getColor('--surface-3', '#DDDDD9');
        const rose = getColor('--rose', '#E3A1A9');

        if (chart.options && chart.options.scales) {
          if (chart.options.scales.x) {
            chart.options.scales.x.ticks.color = text2;
            chart.options.scales.x.grid.color = line;
          }
          if (chart.options.scales.y) {
            chart.options.scales.y.ticks.color = text2;
            chart.options.scales.y.grid.color = line;
          }
        }

        if (chart.data && chart.data.datasets) {
          if (key === 'deptBar') {
            if (chart.data.datasets[0]) chart.data.datasets[0].backgroundColor = accent;
            if (chart.data.datasets[1]) chart.data.datasets[1].backgroundColor = surface3;
          } else if (key === 'trendLine') {
            if (chart.data.datasets[0]) chart.data.datasets[0].borderColor = accent;
            if (chart.data.datasets[1]) chart.data.datasets[1].borderColor = rose;
          }
        }
        chart.update();
      }
    });
  });

  function deptBar(canvas, data) {
    if (!canvas) return;

    if (typeof window.Chart === 'undefined') {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state" style="padding:var(--s-4);"><p class="form-hint">Charts need an internet connection.</p></div>';
      }
      return;
    }

    const comp = Company.get();
    const depts = comp.departments || [];
    const allEmployees = Employees.list();
    const todayStr = Clock.todayStr();
    const records = Store.get(Store.KEYS.attendance, []);

    const labels = [];
    const presentCounts = [];
    const totalCounts = [];

    depts.forEach(deptName => {
      const deptEmps = allEmployees.filter(e => e.department === deptName);
      if (deptEmps.length > 0) {
        labels.push(deptName);
        totalCounts.push(deptEmps.length);
        let present = 0;
        deptEmps.forEach(emp => {
          const rec = records.find(r => String(r.userId) === String(emp.id) && r.date === todayStr && r.checkIn);
          if (rec) present++;
        });
        presentCounts.push(present);
      }
    });

    if (labels.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state" style="padding:var(--s-4);"><p class="empty-state-text">No departments with employees yet.</p></div>';
      }
      return;
    }

    if (chartInstances.has('deptBar')) {
      chartInstances.get('deptBar').destroy();
    }

    const accent = getColor('--accent', '#E85D0C');
    const surface3 = getColor('--surface-3', '#DDDDD9');
    const text2 = getColor('--text-2', '#55534E');
    const line = getColor('--line', '#D3D3CF');

    const chart = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Present today',
            data: presentCounts,
            backgroundColor: accent,
            borderRadius: 4
          },
          {
            label: 'Total employees',
            data: totalCounts,
            backgroundColor: surface3,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: text2, font: { family: 'Instrument Sans', size: 12 } }
          }
        },
        scales: {
          x: {
            ticks: { color: text2, font: { family: 'Instrument Sans', size: 11 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: text2, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: line }
          }
        }
      }
    });

    chartInstances.set('deptBar', chart);
  }

  function trendLine(canvas, data) {
    if (!canvas) return;

    if (typeof window.Chart === 'undefined') {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state" style="padding:var(--s-4);"><p class="form-hint">Charts need an internet connection.</p></div>';
      }
      return;
    }

    const trendData = data || Attendance.trend(14);
    if (!trendData || trendData.length === 0) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state" style="padding:var(--s-4);"><p class="empty-state-text">No attendance trend data available yet.</p></div>';
      }
      return;
    }

    if (chartInstances.has('trendLine')) {
      chartInstances.get('trendLine').destroy();
    }

    const accent = getColor('--accent', '#E85D0C');
    const rose = getColor('--rose', '#E3A1A9');
    const text2 = getColor('--text-2', '#55534E');
    const line = getColor('--line', '#D3D3CF');

    const labels = trendData.map(d => {
      const parsed = U.parseDate(d.date);
      return parsed.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parsed.getMonth()];
    });
    const presentData = trendData.map(d => d.present);
    const lateData = trendData.map(d => d.late);

    const chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Present',
            data: presentData,
            borderColor: accent,
            backgroundColor: accent,
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 3
          },
          {
            label: 'Late',
            data: lateData,
            borderColor: rose,
            backgroundColor: rose,
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: text2, font: { family: 'Instrument Sans', size: 12 } }
          }
        },
        scales: {
          x: {
            ticks: { color: text2, font: { family: 'JetBrains Mono', size: 10 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: text2, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: line }
          }
        }
      }
    });

    chartInstances.set('trendLine', chart);
  }

  function heatmap(containerEl, data) {
    if (!containerEl) return;

    data = data || Attendance.presenceByDeptDays(14);
    const comp = Company.get();
    const depts = comp.departments || [];

    if (depts.length === 0) {
      containerEl.innerHTML =
        '<div class="card heatmap-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h2 class="card-title">Presence Heatmap</h2>' +
              '<span class="card-subtitle">Last 14 working days by department</span>' +
            '</div>' +
          '</div>' +
          '<div class="empty-state">' +
            '<p class="empty-state-text">No departments yet. Add departments in Settings.</p>' +
            '<a href="settings.html" class="btn btn-secondary btn-sm" style="margin-top:var(--s-2);">' +
              '<span>Open settings</span>' +
            '</a>' +
          '</div>' +
        '</div>';
      return;
    }

    const days = data.days || [];
    const deptRows = data.depts || [];

    let tableHtml = '<div class="heatmap-scroll"><table class="heatmap-table" aria-label="Department presence heatmap"><thead><tr><th></th>';
    days.forEach(d => {
      const parsed = U.parseDate(d);
      const dayLabel = U.pad(parsed.getDate());
      tableHtml += '<th class="heatmap-th-date" title="' + U.dateLabel(d) + '">' + dayLabel + '</th>';
    });
    tableHtml += '</tr></thead><tbody>';

    deptRows.forEach(dr => {
      tableHtml += '<tr><td class="heatmap-td-dept" title="' + U.esc(dr.name) + '">' + U.esc(dr.name) + '</td>';
      dr.cells.forEach(c => {
        let rampClass = 'heat-0';
        let ratio = 0;
        if (c.total > 0) {
          ratio = c.present / c.total;
          if (ratio === 0) rampClass = 'heat-0';
          else if (ratio <= 0.25) rampClass = 'heat-1';
          else if (ratio <= 0.50) rampClass = 'heat-2';
          else if (ratio <= 0.75) rampClass = 'heat-3';
          else rampClass = 'heat-4';
        }

        const label = dr.name + ', ' + U.dateLabel(c.date) + ': ' + c.present + ' of ' + c.total + ' present';
        tableHtml += '<td><span class="heat-cell ' + rampClass + '" title="' + U.esc(label) + '" aria-label="' + U.esc(label) + '"></span></td>';
      });
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table></div>';

    containerEl.innerHTML =
      '<div class="card heatmap-card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Presence Heatmap</h2>' +
            '<span class="card-subtitle">Last 14 working days by department</span>' +
          '</div>' +
          '<div class="heatmap-legend">' +
            '<span>0%</span>' +
            '<div class="heatmap-ramp">' +
              '<span class="heat-cell heat-0"></span>' +
              '<span class="heat-cell heat-1"></span>' +
              '<span class="heat-cell heat-2"></span>' +
              '<span class="heat-cell heat-3"></span>' +
              '<span class="heat-cell heat-4"></span>' +
            '</div>' +
            '<span>100%</span>' +
          '</div>' +
        '</div>' +
        tableHtml +
      '</div>';
  }

  function timeline(containerEl, dateStr) {
    if (!containerEl) return;

    dateStr = dateStr || Clock.todayStr();
    const comp = Company.get();
    const records = Store.get(Store.KEYS.attendance, []).filter(r => r.date === dateStr && r.checkIn);
    const users = Employees.list();
    const userMap = new Map(users.map(u => [String(u.id), u]));

    if (records.length === 0) {
      containerEl.innerHTML =
        '<div class="card timeline-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h2 class="card-title">Check-in Timeline</h2>' +
              '<span class="card-subtitle">' + U.dateLabel(dateStr) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="empty-state" style="padding:var(--s-4);">' +
            '<p class="empty-state-text">Nobody has checked in yet today.</p>' +
          '</div>' +
        '</div>';
      return;
    }

    const officeStartMin = U.toMinutes(comp.officeStart || '09:00');
    const graceMin = comp.graceMinutes !== undefined ? comp.graceMinutes : 15;
    const graceEndMin = officeStartMin + graceMin;

    // Timeline axis range: from 60 mins before office start to max checkin + 60 mins (min 3 hours)
    let minMin = officeStartMin - 60;
    let maxMin = officeStartMin + 120;
    records.forEach(r => {
      const m = U.toMinutes(r.checkIn);
      if (m < minMin) minMin = Math.floor(m / 60) * 60;
      if (m > maxMin) maxMin = Math.ceil((m + 30) / 60) * 60;
    });
    if (maxMin - minMin < 180) {
      maxMin = minMin + 180;
    }
    const span = maxMin - minMin;

    // Bucket into 10-minute slots
    const buckets = new Map();
    records.forEach(r => {
      const m = U.toMinutes(r.checkIn);
      const bucketMin = Math.floor(m / 10) * 10;
      if (!buckets.has(bucketMin)) buckets.set(bucketMin, []);
      const emp = userMap.get(String(r.userId));
      buckets.get(bucketMin).push({
        record: r,
        name: emp ? emp.name : 'Employee #' + r.userId
      });
    });

    const officeStartPct = Math.max(0, Math.min(100, ((officeStartMin - minMin) / span) * 100));
    const graceBandWidthPct = Math.max(0, Math.min(100 - officeStartPct, (graceMin / span) * 100));

    let dotsHtml = '';
    buckets.forEach((items, bucketMin) => {
      const pct = Math.max(0, Math.min(100, ((bucketMin - minMin) / span) * 100));
      dotsHtml += '<div class="timeline-bucket" style="left:' + pct + '%;">';
      items.forEach(it => {
        const dotCls = it.record.late ? 'timeline-dot dot-late' : 'timeline-dot';
        const label = it.name + ' (' + U.time12(it.record.checkIn) + ')';
        dotsHtml += '<span class="' + dotCls + '" title="' + U.esc(label) + '" aria-label="' + U.esc(label) + '"></span>';
      });
      dotsHtml += '</div>';
    });

    // Axis labels every hour
    let labelsHtml = '';
    const firstHour = Math.ceil(minMin / 60);
    const lastHour = Math.floor(maxMin / 60);
    for (let h = firstHour; h <= lastHour; h++) {
      const m = h * 60;
      const pct = ((m - minMin) / span) * 100;
      const timeStr = U.time12(U.pad(h) + ':00');
      labelsHtml += '<span class="timeline-axis-label" style="left:' + pct + '%;">' + timeStr + '</span>';
    }

    containerEl.innerHTML =
      '<div class="card timeline-card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Check-in Timeline</h2>' +
            '<span class="card-subtitle">' + U.dateLabel(dateStr) + '</span>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:var(--s-3); font-size:0.75rem; color:var(--text-2);">' +
            '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="timeline-dot"></span> On time</span>' +
            '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="timeline-dot dot-late"></span> Late</span>' +
          '</div>' +
        '</div>' +
        '<div class="timeline-track-wrap">' +
          '<div class="timeline-track">' +
            '<div class="timeline-grace-band" style="left:' + officeStartPct + '%; width:' + graceBandWidthPct + '%;" title="Grace window (' + graceMin + ' mins)"></div>' +
            '<div class="timeline-office-pill" style="left:' + officeStartPct + '%;">Office starts ' + U.time12(comp.officeStart || '09:00') + '</div>' +
            dotsHtml +
            labelsHtml +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function calendar(containerEl, monthSummary, user) {
    if (!containerEl) return;

    const todayStr = Clock.todayStr();
    const currentMonth = todayStr.slice(0, 7);
    const summ = monthSummary || Attendance.monthSummary(user.id, currentMonth);
    const days = summ.days || [];
    if (days.length === 0) return;

    // Day of week headers: Mon to Sun
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // First day of month day-of-week index (0 = Sun, 1 = Mon, ..., 6 = Sat)
    const firstDayStr = days[0].date;
    const firstDate = U.parseDate(firstDayStr);
    let firstDayOfWeek = firstDate.getDay(); // 0 is Sun
    let leadEmpty = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1); // Monday is 0

    let gridHtml = '<div class="cal-grid">';
    dayHeaders.forEach(dh => {
      gridHtml += '<div class="cal-header-cell">' + dh + '</div>';
    });

    for (let i = 0; i < leadEmpty; i++) {
      gridHtml += '<div class="cal-day-cell day-empty"></div>';
    }

    days.forEach(d => {
      const parsed = U.parseDate(d.date);
      const dayNum = parsed.getDate();
      let badgeHtml = '';
      let cellCls = 'cal-day-cell';

      switch (d.code) {
        case 'present':
          badgeHtml = '<span class="cal-day-badge cal-badge-present">Present</span>';
          break;
        case 'late':
          badgeHtml = '<span class="cal-day-badge cal-badge-late">Late</span>';
          break;
        case 'half_day':
          badgeHtml = '<span class="cal-day-badge cal-badge-half">Half Day</span>';
          break;
        case 'on_leave':
          badgeHtml = '<span class="cal-day-badge cal-badge-leave">Leave</span>';
          break;
        case 'weekly_off':
          cellCls += ' day-weekly-off';
          break;
        case 'absent':
          badgeHtml = '<span class="cal-day-badge cal-badge-absent">Absent</span>';
          break;
        case 'extra':
          badgeHtml = '<span class="cal-day-badge cal-badge-extra">Extra</span>';
          break;
        default:
          break;
      }

      gridHtml +=
        '<div class="' + cellCls + '" title="' + U.dateLabel(d.date) + ': ' + d.code.replace('_', ' ') + '">' +
          '<span class="cal-day-num">' + dayNum + '</span>' +
          badgeHtml +
        '</div>';
    });

    gridHtml += '</div>';

    containerEl.innerHTML =
      '<div class="card calendar-card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h2 class="card-title">Attendance Calendar</h2>' +
            '<span class="card-subtitle">Month-to-date presence breakdown</span>' +
          '</div>' +
        '</div>' +
        gridHtml +
        '<div style="display:flex; flex-wrap:wrap; gap:var(--s-3); font-size:0.75rem; margin-top:var(--s-2); color:var(--text-2);">' +
          '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="cal-day-badge cal-badge-present">P</span> Present</span>' +
          '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="cal-day-badge cal-badge-late">L</span> Late</span>' +
          '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="cal-day-badge cal-badge-half">H</span> Half Day</span>' +
          '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="cal-day-badge cal-badge-leave">LV</span> Leave</span>' +
          '<span style="display:inline-flex; align-items:center; gap:4px;"><span class="cal-day-badge cal-badge-absent">A</span> Absent</span>' +
        '</div>' +
      '</div>';
  }

  return {
    deptBar,
    trendLine,
    heatmap,
    timeline,
    calendar
  };
})();
