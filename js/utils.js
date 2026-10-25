// HCM — Utilities (U)
// Date helpers, working-day logic, currency, DOM helpers, inline errors, modal, and toast
// Part of HCM (Beginner Track, Saylani Hackathon 2026)

const U = (() => {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toDateStr(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return y + '-' + m + '-' + d;
  }

  function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return null;
    }
    // Constructs local Date avoiding UTC midnight parsing issues
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }

  function addDays(dateStr, n) {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  }

  function eachDate(fromStr, toStr) {
    const list = [];
    if (!fromStr || !toStr || fromStr > toStr) return list;
    let curr = fromStr;
    while (curr <= toStr) {
      list.push(curr);
      curr = addDays(curr, 1);
    }
    return list;
  }

  function weekday(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.getDay() : 0; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  }

  function isWorkingDay(dateStr, company) {
    const days = (company && Array.isArray(company.workingDays)) ? company.workingDays : [1, 2, 3, 4, 5, 6];
    const wd = weekday(dateStr);
    return days.includes(wd);
  }

  function workingDaysBetween(fromStr, toStr, company) {
    if (!fromStr || !toStr || fromStr > toStr) return 0;
    let count = 0;
    const dates = eachDate(fromStr, toStr);
    for (let i = 0; i < dates.length; i++) {
      if (isWorkingDay(dates[i], company)) {
        count++;
      }
    }
    return count;
  }

  function daysInMonth(year, month1to12) {
    // day 0 of month+1 gives last day of month
    return new Date(year, month1to12, 0).getDate();
  }

  function workingDaysInMonth(year, month1to12, company) {
    const totalDays = daysInMonth(year, month1to12);
    let count = 0;
    for (let d = 1; d <= totalDays; d++) {
      const dStr = year + '-' + pad(month1to12) + '-' + pad(d);
      if (isWorkingDay(dStr, company)) {
        count++;
      }
    }
    return count;
  }

  function weekRange(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return { from: dateStr, to: dateStr };
    // Week starts Monday (1) and ends Sunday (0 or 7)
    const day = d.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return {
      from: toDateStr(mon),
      to: toDateStr(sun)
    };
  }

  function toMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function minutesToTime(totalMin) {
    const m = Math.max(0, Math.floor(totalMin));
    const hours = Math.floor(m / 60) % 24;
    const mins = m % 60;
    return pad(hours) + ':' + pad(mins);
  }

  function time12(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return pad(h12) + ':' + pad(m) + ' ' + ampm;
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function dateLabel(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return dateStr || '';
    const dayName = DAY_SHORT[d.getDay()];
    const dayNum = d.getDate();
    const mName = MONTH_SHORT[d.getMonth()];
    const y = d.getFullYear();
    return dayName + ' ' + dayNum + ' ' + mName + ' ' + y;
  }

  function monthLabel(monthStr) {
    // e.g. "2026-10"
    if (!monthStr) return '';
    const parts = monthStr.split('-').map(Number);
    if (parts.length < 2) return monthStr;
    const mIndex = parts[1] - 1;
    return (MONTH_NAMES[mIndex] || '') + ' ' + parts[0];
  }

  function pkr(n, decimals) {
    if (decimals === undefined) decimals = 0;
    const num = Number(n) || 0;
    const formatted = num.toLocaleString('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return 'PKR ' + formatted;
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    if (!name) return '??';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') {
          el.className = v;
        } else if (k.startsWith('on') && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v !== null && v !== undefined && v !== false) {
          el.setAttribute(k, v === true ? '' : v);
        }
      }
    }
    for (const child of children.flat()) {
      if (child !== null && child !== undefined) {
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      }
    }
    return el;
  }

  // Validators
  const validators = {
    required(val) {
      return val !== null && val !== undefined && String(val).trim().length > 0;
    },
    email(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(val).trim());
    },
    minLen(val, n) {
      return String(val || '').trim().length >= n;
    },
    maxLen(val, n) {
      return String(val || '').trim().length <= n;
    },
    intRange(val, min, max) {
      const num = Number(val);
      return Number.isInteger(num) && num >= min && num <= max;
    },
    positiveNumber(val, max) {
      const num = Number(val);
      const limit = max !== undefined ? max : 10000000;
      return !isNaN(num) && num > 0 && num <= limit;
    }
  };

  function showFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.setAttribute('aria-invalid', 'true');
    const fieldId = inputEl.id || inputEl.name;
    const errorId = fieldId ? fieldId + '-error' : null;
    let errEl = errorId ? byId(errorId) : null;
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'field-error';
      if (errorId) errEl.id = errorId;
      inputEl.parentNode.appendChild(errEl);
    }
    errEl.innerHTML = (typeof Icons !== 'undefined' ? Icons.svg('alert-circle', { size: 14 }) : '') + '<span>' + esc(message) + '</span>';
    errEl.classList.add('active');
    if (errorId) {
      inputEl.setAttribute('aria-describedby', errorId);
    }
  }

  function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.removeAttribute('aria-invalid');
    const fieldId = inputEl.id || inputEl.name;
    const errorId = fieldId ? fieldId + '-error' : null;
    const errEl = errorId ? byId(errorId) : inputEl.parentNode.querySelector('.field-error');
    if (errEl) {
      errEl.classList.remove('active');
      errEl.innerHTML = '';
    }
    inputEl.removeAttribute('aria-describedby');
  }

  function focusFirstError(formEl) {
    if (!formEl) return;
    const invalid = formEl.querySelector('[aria-invalid="true"]');
    if (invalid) {
      invalid.focus();
    }
  }

  // Toast component
  let toastTimer = null;
  function toast(message, kind) {
    kind = kind || 'info';
    let root = byId('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    root.innerHTML = '';
    const iconName = kind === 'error' ? 'alert-circle' : (kind === 'success' ? 'check' : 'info');
    const t = document.createElement('div');
    t.className = 'toast toast-' + kind;
    t.innerHTML = (typeof Icons !== 'undefined' ? Icons.svg(iconName, { size: 18 }) : '') + '<span>' + esc(message) + '</span>';
    root.appendChild(t);

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (t.parentNode) {
        t.remove();
      }
    }, 4000);
  }

  // Modal component
  const modal = {
    open({ title, body, actions, onClose }) {
      let root = byId('modal-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
      }
      root.innerHTML = '';

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';

      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'modal-title');

      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = '<h2 id="modal-title" class="card-title">' + esc(title) + '</h2>' +
        '<button type="button" class="icon-btn modal-close-btn" aria-label="Close modal">' +
        (typeof Icons !== 'undefined' ? Icons.svg('x', { size: 20 }) : 'X') +
        '</button>';

      const bodyEl = document.createElement('div');
      bodyEl.className = 'modal-body';
      if (typeof body === 'string') {
        bodyEl.innerHTML = body;
      } else if (body instanceof Node) {
        bodyEl.appendChild(body);
      }

      dialog.appendChild(header);
      dialog.appendChild(bodyEl);

      if (actions) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'modal-actions';
        if (typeof actions === 'string') {
          actionsEl.innerHTML = actions;
        } else if (actions instanceof Node) {
          actionsEl.appendChild(actions);
        }
        dialog.appendChild(actionsEl);
      }

      backdrop.appendChild(dialog);
      root.appendChild(backdrop);

      function close() {
        backdrop.remove();
        document.removeEventListener('keydown', onKeyDown);
        if (typeof onClose === 'function') onClose();
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          close();
        }
      }

      document.addEventListener('keydown', onKeyDown);
      header.querySelector('.modal-close-btn').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });

      // Trap focus
      setTimeout(() => {
        const bodyInput = bodyEl.querySelector('input:not([type="hidden"]), select, textarea');
        if (bodyInput) {
          bodyInput.focus();
        } else {
          const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 50);

      return { close, dialog, backdrop };
    },

    close() {
      const root = byId('modal-root');
      if (root) root.innerHTML = '';
    }
  };

  // Promise-based confirm dialog (replacement for window.confirm)
  function confirmDialog({ title, body, confirmLabel, danger }) {
    return new Promise((resolve) => {
      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
      confirmBtn.textContent = confirmLabel || 'Confirm';

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);

      const m = modal.open({
        title: title || 'Please confirm',
        body: '<p style="color:var(--text-2);font-size:0.9375rem;">' + esc(body) + '</p>',
        actions: actions,
        onClose: () => resolve(false)
      });

      cancelBtn.addEventListener('click', () => {
        m.close();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        m.close();
        resolve(true);
      });
    });
  }

  return {
    pad,
    toDateStr,
    parseDate,
    addDays,
    eachDate,
    weekday,
    isWorkingDay,
    workingDaysBetween,
    daysInMonth,
    workingDaysInMonth,
    weekRange,
    toMinutes,
    minutesToTime,
    time12,
    dateLabel,
    monthLabel,
    pkr,
    esc,
    initials,
    byId,
    h,
    validators,
    showFieldError,
    clearFieldError,
    focusFirstError,
    toast,
    modal,
    confirm: confirmDialog
  };
})();
