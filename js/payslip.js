// HCM — Payslip Module
// Monthly payroll calculation, unrounded per-day deduction formula, slip generation & summary table
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const Payslip = (() => {
  'use strict';

  function round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  }

  function build(userId, monthStr) {
    // monthStr format: "YYYY-MM"
    const emp = Employees.get(userId);
    if (!emp) return null;

    const comp = Company.get();
    const parts = monthStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];

    const todayStr = Clock.todayStr();
    const currentMonthStr = todayStr.slice(0, 7);
    const isCurrentMonth = monthStr === currentMonthStr;

    // PAY-2: workingDaysInMonth = dates whose weekday is in company.workingDays
    const workingDaysInMonth = U.workingDaysInMonth(year, month, comp);

    // Month summary from Attendance
    const summary = Attendance.monthSummary(userId, monthStr);

    const salary = Number(emp.salary || 0);

    // PAY-3: perDay = salary / workingDaysInMonth (unrounded)
    const perDayUnrounded = workingDaysInMonth > 0 ? (salary / workingDaysInMonth) : 0;
    const perDayDisplay = round2(perDayUnrounded);

    // PAY-4 & PAY-5: absent days and half days
    const absentDays = summary.absent;
    const halfDays = summary.half;

    // PAY-6: deduction = round2(perDayUnrounded * (absentDays + 0.5 * halfDays))
    const totalDeductionUnits = absentDays + (0.5 * halfDays);
    const deduction = round2(perDayUnrounded * totalDeductionUnits);

    // net = round2(salary - deduction)
    const net = round2(salary - deduction);

    return {
      employee: emp,
      company: comp,
      month: monthStr,
      workingDays: workingDaysInMonth,
      present: summary.present,
      late: summary.late,
      half: halfDays,
      absent: absentDays,
      paidLeave: summary.paidLeave,
      extra: summary.extra,
      salary: salary,
      perDay: perDayDisplay,
      perDayUnrounded: perDayUnrounded,
      deduction: deduction,
      net: net,
      isCurrentMonth: isCurrentMonth
    };
  }

  function monthSummary(monthStr) {
    const allEmployees = Employees.list();
    const rows = [];

    let totalSalary = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    allEmployees.forEach(emp => {
      const slip = build(emp.id, monthStr);
      if (slip) {
        rows.push({
          employee: emp,
          workingDays: slip.workingDays,
          present: slip.present,
          half: slip.half,
          absent: slip.absent,
          salary: slip.salary,
          deduction: slip.deduction,
          net: slip.net
        });

        totalSalary += slip.salary;
        totalDeductions += slip.deduction;
        totalNet += slip.net;
      }
    });

    return {
      month: monthStr,
      rows: rows,
      totals: {
        totalEmployees: allEmployees.length,
        totalSalary: round2(totalSalary),
        totalDeductions: round2(totalDeductions),
        totalNet: round2(totalNet)
      }
    };
  }

  return {
    round2,
    build,
    monthSummary
  };
})();
