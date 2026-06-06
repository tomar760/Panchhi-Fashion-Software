/* ============================================================
   PANCHHI HR SOFTWARE — app.js
   Common utilities: navigation, clock, toast, modal, helpers
   ============================================================ */

/* ── App State ── */
const App = {
  currentPage: 'dashboard',
  currentUser: { name: 'Admin', role: 'Super Admin', initials: 'AD' },
  version: 'v1.0.0'
};

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
function handleLogin() {
  const user = document.getElementById('loginUser')?.value?.trim();
  const pass = document.getElementById('loginPass')?.value?.trim();
  const btn  = document.getElementById('loginBtn');

  if (!user || !pass) {
    showToast('error', 'Login Failed', 'Please enter username and password');
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner spin"></i>&nbsp; Authenticating...';
  btn.disabled = true;

  setTimeout(() => {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('appWrapper').classList.add('active');
    updateClock();
    if (typeof initDashboard === 'function') initDashboard();
    showToast('success', 'Welcome Back!', `Logged in as ${App.currentUser.name}`);
  }, 1400);
}

/* Allow Enter key on login */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('loginUser')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass')?.focus();
  });

  // Set today's date on all date inputs with class .today-date
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.today-date').forEach(el => { el.value = today; });

  // Start clock
  setInterval(updateClock, 1000);
  updateClock();
});

/* ══════════════════════════════════════
   CLOCK & GREETING
══════════════════════════════════════ */
function updateClock() {
  const now = new Date();

  // Clock
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  const clockEl = document.getElementById('liveClock');
  if (clockEl) clockEl.textContent = timeStr;

  // Greeting
  const h = now.getHours();
  let greeting = 'Good Morning';
  if (h >= 12 && h < 17) greeting = 'Good Afternoon';
  else if (h >= 17 && h < 21) greeting = 'Good Evening';
  else if (h >= 21) greeting = 'Good Night';

  const greetEl = document.getElementById('greetingText');
  if (greetEl) greetEl.textContent = `${greeting}, ${App.currentUser.name}! 👋`;

  const dateEl = document.getElementById('greetingDate');
  if (dateEl) {
    const dateStr = now.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    dateEl.textContent = dateStr;
  }
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function navigateTo(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate all nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  // Close all sub-navs
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.nav-link.has-sub').forEach(l => l.classList.remove('open'));

  // Activate page
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  // Activate nav link
  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (link) {
    link.classList.add('active');
    // Open parent sub-nav if any
    const parentSub = link.closest('.nav-sub');
    if (parentSub) {
      parentSub.classList.add('open');
      parentSub.previousElementSibling?.classList.add('active', 'open');
    }
  }

  App.currentPage = pageId;

  // Update header title
  updatePageTitle(pageId);

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();

  // Page-specific init
  if (typeof window[`init_${pageId}`] === 'function') window[`init_${pageId}`]();
}

function updatePageTitle(pageId) {
  const titles = {
    dashboard:  { title: 'Dashboard',            sub: 'Overview & quick actions' },
    employees:  { title: 'Employee Directory',   sub: 'Manage all employee records' },
    attendance: { title: 'Attendance',           sub: 'Daily attendance & follow-up' },
    gatepass:   { title: 'Gate Pass',            sub: 'Track employee exits & returns' },
    leave:      { title: 'Leave Management',     sub: 'PL / SL / LWP tracking' },
    store:      { title: 'Store & Inventory',    sub: 'Assets, stock & PO tracking' },
    salary:     { title: 'Salary / Payroll',     sub: 'Calculate & process salaries' },
    settings:   { title: 'Settings',            sub: 'Configure system rules' },
    profile:    { title: 'My Profile',           sub: 'Account settings' },
  };
  const t = titles[pageId] || { title: pageId, sub: '' };
  const titleEl = document.getElementById('pageTitle');
  const subEl   = document.getElementById('pageSubtitle');
  if (titleEl) titleEl.textContent = t.title;
  if (subEl)   subEl.textContent   = t.sub;
}

/* ── Sub-nav toggle ── */
function toggleSubNav(parentLink) {
  const sub = parentLink.nextElementSibling;
  if (!sub || !sub.classList.contains('nav-sub')) return;
  const isOpen = sub.classList.contains('open');
  // Close all first
  document.querySelectorAll('.nav-sub').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.nav-link.has-sub').forEach(l => l.classList.remove('open'));
  if (!isOpen) {
    sub.classList.add('open');
    parentLink.classList.add('open');
  }
}

/* ── Sidebar ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ══════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════ */
const TOAST_ICONS = {
  success: 'fas fa-check-circle',
  error:   'fas fa-times-circle',
  warning: 'fas fa-exclamation-triangle',
  info:    'fas fa-info-circle',
};

function showToast(type = 'info', title = '', message = '', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="${TOAST_ICONS[type] || 'fas fa-bell'}"></i></div>
    <div class="toast-body">
      <h4>${title}</h4>
      ${message ? `<p>${message}</p>` : ''}
    </div>
  `;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════
   MODALS
══════════════════════════════════════ */
function showModal(id) {
  const m = document.getElementById('modal-' + id);
  if (m) m.classList.add('show');
}
function closeModal(id) {
  const m = document.getElementById('modal-' + id);
  if (m) m.classList.remove('show');
}

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show')
      .forEach(m => m.classList.remove('show'));
  }
});

/* ══════════════════════════════════════
   BUTTON LOADING STATE
══════════════════════════════════════ */
function btnLoading(btn, loadingText = 'Processing...') {
  const orig = btn.innerHTML;
  btn.innerHTML = `<i class="fas fa-spinner spin"></i>&nbsp; ${loadingText}`;
  btn.disabled = true;
  return function done(successText, successFn) {
    setTimeout(() => {
      btn.innerHTML = `<i class="fas fa-check"></i>&nbsp; ${successText || 'Done'}`;
      btn.style.background = 'linear-gradient(135deg,#10b981,#34d399)';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
        btn.style.background = '';
        if (successFn) successFn();
      }, 900);
    }, 1400);
  };
}

/* ══════════════════════════════════════
   TABLE SEARCH / FILTER
══════════════════════════════════════ */
function filterTable(inputId, tableId) {
  const q = document.getElementById(inputId)?.value?.toLowerCase() || '';
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
  // Show empty state
  const visible = [...tbody.querySelectorAll('tr')].filter(r => r.style.display !== 'none');
  const emptyRow = tbody.querySelector('.empty-row');
  if (emptyRow) emptyRow.remove();
  if (visible.length === 0 && q) {
    const tr = document.createElement('tr');
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="20" class="table-empty">
      <i class="fas fa-search"></i>
      <p>No results for "${q}"</p>
      <span>Try a different search term</span>
    </td>`;
    tbody.appendChild(tr);
  }
}

/* ══════════════════════════════════════
   DATE & TIME HELPERS
══════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function nowTimeStr() {
  const now = new Date();
  return now.toTimeString().slice(0,5);
}
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function timeDiffMinutes(t1, t2) {
  // t1, t2 = "HH:MM" strings
  if (!t1 || !t2) return 0;
  const [h1,m1] = t1.split(':').map(Number);
  const [h2,m2] = t2.split(':').map(Number);
  return (h2*60+m2) - (h1*60+m1);
}
function minutesToHHMM(minutes) {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/* ══════════════════════════════════════
   LOCAL STORAGE HELPERS
   (Temporary until Google Sheets connected)
══════════════════════════════════════ */
const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('phr_' + key)) || []; }
    catch { return []; }
  },
  set(key, data) {
    try { localStorage.setItem('phr_' + key, JSON.stringify(data)); return true; }
    catch { return false; }
  },
  push(key, item) {
    const arr = this.get(key);
    arr.push(item);
    return this.set(key, arr);
  },
  update(key, id, updates) {
    const arr = this.get(key);
    const idx = arr.findIndex(i => i.id === id);
    if (idx > -1) { arr[idx] = { ...arr[idx], ...updates }; this.set(key, arr); }
  },
  delete(key, id) {
    const arr = this.get(key).filter(i => i.id !== id);
    return this.set(key, arr);
  }
};

/* ══════════════════════════════════════
   ID GENERATOR
══════════════════════════════════════ */
function genId(prefix = '') {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
}

/* ══════════════════════════════════════
   AVATAR COLOR GENERATOR
══════════════════════════════════════ */
const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#ef4444,#f87171)',
  'linear-gradient(135deg,#ec4899,#f472b6)',
  'linear-gradient(135deg,#8b5cf6,#a78bfa)',
  'linear-gradient(135deg,#06b6d4,#22d3ee)',
];
function avatarColor(name = '') {
  let hash = 0;
  for (let c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

/* ══════════════════════════════════════
   EXPORT HELPERS (CSV)
══════════════════════════════════════ */
function downloadCSV(filename, rows, headers) {
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g,'""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Downloaded', `${filename} saved successfully`);
}

/* ══════════════════════════════════════
   DEPARTMENT & DESIGNATION MASTER DATA
   (From MIS analysis)
══════════════════════════════════════ */
const DEPARTMENTS = [
  'ADMIN', 'SALES', 'ONLINE SALES', 'ONLINE DISPATCH',
  'DESIGN', 'DISPATCH', 'QC', 'STICHING', 'EMBROIDERY',
  'MENDING', 'PRODUCTION PLANNING', 'PURCHASE', 'STORE', 'VALUE ADDITION'
];

const DESIGNATIONS = {
  'ADMIN':               ['HR MANAGER','HR EXECUTIVE','SR. ACCOUNTANT','JR. ACCOUNTANT','ERP EXECUTIVE','SECURITY','HOUSE KEEPER'],
  'SALES':               ['SALES MANAGER','SALES COORDINATOR','SALES EXECUTIVE','SALES ASSOCIATE','SHOP ASSISTANT','COLLECTION EXECUTIVE'],
  'ONLINE SALES':        ['ONLINE HOD','GRAPHICS DESIGNER','SOCIAL MEDIA EXECUTIVE','D2C EXECUTIVE','ECOMMERCE EXECUTIVE','VIDEO EDITOR'],
  'ONLINE DISPATCH':     ['ONLINE DISPATCH SUPERVISOR','ONLINE PACKER','ONLINE DISPATCH EXECUTIVE','QUALITY CHECK'],
  'DESIGN':              ['DESIGN HEAD','FASHION DESIGNER','SR.COM.DESIGNER','JR. COM.DESIGNER','SKETCHER','STITCHING MASTER','STITCHING EXECUTIVE','MOCKING EXECUTIVE'],
  'DISPATCH':            ['SUPERVISOR','PACKER','HELPER','DRIVER','BILLING EXECUTIVE'],
  'QC':                  ['SUPERVISOR','CHECKER','HELPER - STONE'],
  'STICHING':            ['SUPERVISOR','SR. MASTER','STITCHING EXECUTIVE','HELPER'],
  'EMBROIDERY':          ['SUPERVISOR','OPERATOR','PATTA STITCHING','HELPER'],
  'MENDING':             ['SUPERVISOR','CHECKER','ALTER EXECUTIVE','MENDOR','FOLDING CHECKER'],
  'PRODUCTION PLANNING': ['PRODUCTION EXECUTIVE'],
  'PURCHASE':            ['HOD','PURCHASE EXECUTIVE','FABRIC CHECKER'],
  'STORE':               ['STORE MANAGER','STORE KEEPER','HELPER'],
  'VALUE ADDITION':      ['HOD','HELPER','ALTER EXECUTIVE','FOLDING - HELPER'],
};

const SHIFTS = [
  { label: '9:00 AM – 6:00 PM',  start: '09:00', end: '18:00' },
  { label: '10:00 AM – 7:00 PM', start: '10:00', end: '19:00' },
  { label: '8:00 AM – 5:00 PM',  start: '08:00', end: '17:00' },
  { label: '11:00 AM – 8:00 PM', start: '11:00', end: '20:00' },
];

/* Populate department dropdown */
function populateDeptDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Department...</option>';
  DEPARTMENTS.forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* Populate designation based on dept */
function populateDesigDropdown(deptVal, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const desigs = DESIGNATIONS[deptVal] || [];
  sel.innerHTML = '<option value="">Select Designation...</option>';
  desigs.forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* Populate shift dropdown */
function populateShiftDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Shift...</option>';
  SHIFTS.forEach(s => {
    sel.innerHTML += `<option value="${s.start}-${s.end}">${s.label}</option>`;
  });
}

/* ══════════════════════════════════════
   GOOGLE SHEETS INTEGRATION
   (Placeholder — to be enabled in Phase 2)
══════════════════════════════════════ */
const GSheet = {
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyGeFIezQQq_0rMhfHkuQv9brAVdjNV-SI4Fu-Hcdj7Z_RkcEUqxxdjzGZmY8mpjciG/exec',

  showStatus(type, msg) {
    ['sheetStatus','sheetStatus2'].forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      el.textContent = msg;
      el.className   = 'sheet-status ' + type;
      if(type === 'success') setTimeout(() => { el.textContent=''; el.className='sheet-status'; }, 4000);
    });
  },

  async send(sheet, data) {
    this.showStatus('loading', '⏳ Syncing...');
    try {
      // Use URL params method — works with Google Apps Script CORS
      const params = new URLSearchParams();
      params.append('sheet', sheet);
      params.append('data', JSON.stringify(data));
      params.append('action', 'INSERT');

      const res = await fetch(this.WEB_APP_URL, {
        method: 'POST',
        mode:   'no-cors',
        body:   params,
      });
      this.showStatus('success', '✓ Google Sheet updated');
      return true;
    } catch(e) {
      this.showStatus('error', '✗ Sync failed');
      console.error('GSheet error:', e);
      return false;
    }
  },

  async read(sheet, filter) {
    try {
      const url = this.WEB_APP_URL + '?sheet=' + sheet + (filter ? '&filter='+filter : '');
      const res  = await fetch(url);
      const json = await res.json();
      return json.data || [];
    } catch(e) {
      console.error('GSheet read error:', e);
      return [];
    }
  }
};

/* Sheet status styles (injected dynamically) */
(function injectSheetStatusStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .sheet-status { font-size:11.5px; font-weight:600; padding:4px 10px; border-radius:6px; transition:all 0.3s; }
    .sheet-status.success { background:#d1fae5; color:#065f46; }
    .sheet-status.warning { background:#fef3c7; color:#92400e; }
    .sheet-status.error   { background:#fee2e2; color:#b91c1c; }
  `;
  document.head.appendChild(style);
})();

/* ══════════════════════════════════════
   NUMBER FORMAT
══════════════════════════════════════ */
function formatINR(amount) {
  if (!amount && amount !== 0) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/* ══════════════════════════════════════
   CONFIRM DIALOG
══════════════════════════════════════ */
function confirmAction(message, onConfirm, type = 'danger') {
  const icons = { danger: 'fas fa-trash-alt', warning: 'fas fa-exclamation-triangle', info: 'fas fa-question-circle' };
  const modal = document.getElementById('modal-confirm');
  if (!modal) return;
  modal.querySelector('.modal-confirm-icon').className = `modal-confirm-icon ${type}`;
  modal.querySelector('.modal-confirm-icon i').className = icons[type] || icons.danger;
  modal.querySelector('.modal-confirm p').textContent = message;
  modal.querySelector('.btn-confirm-ok').onclick = () => {
    closeModal('confirm');
    onConfirm();
  };
  showModal('confirm');
}

console.log('%c🪶 Panchhi HR Software loaded', 'color:#6c47ff;font-weight:bold;font-size:14px;');
