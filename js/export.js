// HCM — Export Module
// Attendance CSV export with UTF-8 BOM and formula-injection neutralization
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Export = (() => {
  'use strict';

  function sanitizeCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // Neutralize formula injection in Excel/Calc:
    // Any cell starting with =, +, -, @ gets prefixed with a single quote '
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }

    // Escape internal double-quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return '"' + escaped + '"';
  }

  function attendanceCSV(monthStr) {
    const todayStr = Clock.todayStr();
    monthStr = monthStr || todayStr.slice(0, 7);

    const employees = Employees.list();
    const days = U.daysInMonth(monthStr);

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Date',
      'Status',
      'Check In',
      'Check Out',
      'Hours'
    ];

    const lines = [];
    lines.push(headers.map(sanitizeCell).join(','));

    employees.forEach(emp => {
      days.forEach(dayStr => {
        const st = Attendance.dayStatus(emp.id, dayStr);
        // Only include if past or present (not future pending if beyond today)
        if (dayStr > todayStr && st.code === 'pending_today') return;

        const rec = st.record;
        const checkIn = rec && rec.checkIn ? rec.checkIn : '';
        const checkOut = rec && rec.checkOut ? rec.checkOut : '';
        const hours = rec && rec.hours !== null && rec.hours !== undefined ? rec.hours : '';

        const row = [
          emp.id,
          emp.name,
          emp.department || '',
          dayStr,
          st.code,
          checkIn,
          checkOut,
          hours
        ];

        lines.push(row.map(sanitizeCell).join(','));
      });
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hcm-attendance-' + monthStr + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    sanitizeCell,
    attendanceCSV
  };
})();
