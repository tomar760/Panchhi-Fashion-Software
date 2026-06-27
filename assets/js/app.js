/* ============================================================
   PANCHHI HR SOFTWARE — app.js v4.0
   Multi-user + GSheet Primary DB + Real-time Sync
============================================================ */

const App = {
  currentUser: null,
  version: 'v1.0.0',
  syncInterval: null,
};

/* ══════════════════════════════════════
   GOOGLE SHEET — PRIMARY DATABASE
══════════════════════════════════════ */
const GSheet = {
  URL: 'https://script.google.com/macros/s/AKfycbyGeFIezQQq_0rMhfHkuQv9brAVdjNV-SI4Fu-Hcdj7Z_RkcEUqxxdjzGZmY8mpjciG/exec',

  showStatus(type, msg) {
    ['sheetStatus','sheetStatus2'].forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      el.textContent = msg;
      el.className = 'sheet-status ' + type;
      if(type==='success') setTimeout(()=>{el.textContent='';el.className='sheet-status';}, 3500);
    });
  },

  async post(params) {
    try {
      const p = new URLSearchParams(params);
      await fetch(this.URL, { method:'POST', mode:'no-cors', body:p });
      return { success: true };
    } catch(e) {
      console.error('GSheet post error:', e);
      return { success: false, error: e.message };
    }
  },

  async get(params) {
    try {
      const url = this.URL + '?' + new URLSearchParams(params).toString();
      const res  = await fetch(url);
      return await res.json();
    } catch(e) {
      console.error('GSheet get error:', e);
      return { success: false, error: e.message };
    }
  },

  async send(sheet, data) {
    this.showStatus('loading', '⏳ Saving...');
    if(Array.isArray(data) && data.length > 50) {
      return await this.sendBatch(sheet, data);
    }
    const userId = App.currentUser?.id || 'SYSTEM';
    await this.post({ sheet, data: JSON.stringify(data), action:'INSERT', userId });
    this.showStatus('success', '✓ Saved to Google Sheet');
    return true;
  },

  async sendBatch(sheet, arr) {
    const BATCH = 50, total = arr.length;
    let done = 0;
    const userId = App.currentUser?.id || 'SYSTEM';
    for(let i=0; i<total; i+=BATCH) {
      const chunk = arr.slice(i, i+BATCH);
      await this.post({ sheet, data: JSON.stringify(chunk), action:'BATCH', userId });
      done += chunk.length;
      this.showStatus('loading', `⏳ Syncing... ${done}/${total}`);
      await new Promise(r => setTimeout(r, 700));
    }
    this.showStatus('success', `✓ All ${total} records saved`);
    return true;
  },

  async read(sheet) {
    const res = await this.get({ sheet, action:'READ' });
    if(res.success && res.data) {
      /* Normalize: GSheet returns {"E-Code":"..","Status":".."}
         but all frontend code uses lowercase keys {ecode, status}
         So we convert ALL keys to lowercase here once, permanently */
      const normalized = res.data.map(row => {
        const obj = {};
        Object.keys(row).forEach(k => {
          /* Convert "E-Code" -> "e-code", "Full Name" -> "full name"
             Then map to exact frontend field names */
          obj[k] = row[k]; // keep original too
          obj[k.toLowerCase().replace(/[^a-z0-9]/g,'_')] = row[k]; // snake_case
        });
        /* Map specific GSheet column names to frontend field names */
        const map = {
          'E-Code':'ecode','Full Name':'fullname','First Name':'fname',
          'Last Name':'lname','Father/Husband':'fhname','Status':'status',
          'Department':'department','Designation':'designation',
          'Mobile':'mobile','Alt Mobile':'altmobile','Email':'email',
          'Official Email':'offemail','Joining Date':'joining',
          'Confirmation Date':'confirm','Shift':'shift','DOB':'dob',
          'Gender':'gender','Marital Status':'marital','Location':'location',
          'Senior Tag':'tagSenior','Bonus Tag':'tagBonus',
          'Fixed CTC':'fixctc','New CTC':'newctc','Payment Mode':'paymode',
          'Bank':'bank','Account Holder':'bankname','Account No':'accno',
          'IFSC':'ifsc','Branch':'branch','Aadhar':'aadhar','PAN':'pan',
          'Current Address':'curraddr','PIN':'currpin',
          'Permanent Address':'permaddr','Permanent PIN':'permpin',
          'Emergency Name':'emgname','Emergency Relation':'emgrelation',
          'Emergency Phone':'emgphone','Old E-Code':'oldcode',
          'Remark':'remark','Added On':'addedOn','UAN':'uan',
          'PF':'pfapp','ESIC':'esicapp','ESIC No':'esicno',
          'Date':'date','In Time':'inTime','Late Min':'lateMin',
          'E-CODE':'ecode','Name':'empName','Out Time':'outTime',
          'Return Time':'returnTime','Purpose':'purpose',
          'Type':'type','From':'from','To':'to','Days':'days',
          'Reason':'reason','Approved On':'approvedOn',
          'Month':'month','Net Salary':'netSalary','Gross':'gross',
        };
        Object.keys(map).forEach(gk => {
          if(row[gk] !== undefined) obj[map[gk]] = row[gk];
        });
        /* Fix boolean-like fields from GSheet (YES/NO -> true/false) */
        if(obj.tagSenior !== undefined) obj.tagSenior = String(obj.tagSenior).toUpperCase()==='YES';
        if(obj.tagBonus  !== undefined) obj.tagBonus  = String(obj.tagBonus).toUpperCase()==='YES';
        /* Normalize status to uppercase */
        if(obj.status) obj.status = String(obj.status).toUpperCase().trim();
        return obj;
      });
      const key = sheetKey(sheet);
      if(key) Store.set(key, normalized);
      return normalized;
    }
    return Store.get(sheetKey(sheet)||'_tmp');
  },

  async login(email, password) {
    return await this.get({ action:'LOGIN', sheet:'Auth',
      data: JSON.stringify({email, password}) });
  },

  async sendOTP(email) {
    return await this.get({ action:'SEND_OTP', sheet:'Auth',
      data: JSON.stringify({email}) });
  },

  async verifyOTP(email, otp) {
    return await this.get({ action:'VERIFY_OTP', sheet:'Auth',
      data: JSON.stringify({email, otp}) });
  },

  async resetPassword(email, otp, newPassword) {
    return await this.get({ action:'RESET_PASSWORD', sheet:'Auth',
      data: JSON.stringify({email, otp, newPassword}) });
  },

  async createUser(data) {
    return await this.get({ action:'CREATE_USER', sheet:'Users',
      data: JSON.stringify(data) });
  },

  async getUsers() {
    return await this.get({ action:'GET_USERS', sheet:'Users' });
  },

  async updateUser(data) {
    return await this.get({ action:'UPDATE_USER', sheet:'Users',
      data: JSON.stringify(data) });
  },

  async deleteUser(id) {
    return await this.get({ action:'DELETE_USER', sheet:'Users', id });
  },

  async getActivity(limit=50) {
    return await this.get({ action:'GET_ACTIVITY', sheet:'Activity', limit });
  },
};

function sheetKey(sheet) {
  const m = {'Employees':'employees','Attendance':'attendance','GatePass':'gatepasses','LeaveRequests':'leaveRecords','Payroll':'salaryRecords','AdvanceLoan':'advanceLedger','Store':'storeEntries'};
  return m[sheet]||null;
}

/* ══════════════════════════════════════
   LOCAL STORAGE CACHE
══════════════════════════════════════ */
const Store = {
  get(key) { try{return JSON.parse(localStorage.getItem('phr_'+key))||[];}catch{return[];} },
  set(key,data) { try{localStorage.setItem('phr_'+key,JSON.stringify(data));return true;}catch{return false;} },
  getObj(key) { try{return JSON.parse(localStorage.getItem('phr_'+key))||{};}catch{return{};} },
  setObj(key,data) { try{localStorage.setItem('phr_'+key,JSON.stringify(data));return true;}catch{return false;} },
};

/* ══════════════════════════════════════
   AUTH — LOGIN / LOGOUT
══════════════════════════════════════ */
async function handleLogin() {
  const email = document.getElementById('loginUser')?.value?.trim();
  const pass  = document.getElementById('loginPass')?.value?.trim();
  const btn   = document.getElementById('loginBtn');
  const err   = document.getElementById('loginError');

  if(!email||!pass) { if(err){err.textContent='Enter email and password';err.style.display='block';} return; }

  if(btn) { btn.innerHTML='<i class="fas fa-spinner spin"></i> Signing in...'; btn.disabled=true; }
  if(err) err.style.display='none';

  try {
    const res = await GSheet.get({ action:'LOGIN', sheet:'Auth', data:JSON.stringify({email,password:pass}) });

    if(res.success && res.user) {
      App.currentUser = res.user;
      Store.setObj('currentUser', res.user);
      onLoginSuccess(res.user);
    } else {
      if(err) { err.textContent = res.msg||'Login failed'; err.style.display='block'; }
      if(btn) { btn.innerHTML='<i class="fas fa-arrow-right-to-bracket"></i> Sign In'; btn.disabled=false; }
    }
  } catch(e) {
    /* Offline fallback — check hardcoded super admin */
    const saved = Store.getObj('currentUser');
    if(saved && saved.email===email) {
      App.currentUser = saved;
      onLoginSuccess(saved);
    } else {
      if(err) { err.textContent='Connection error. Check internet.'; err.style.display='block'; }
      if(btn) { btn.innerHTML='<i class="fas fa-arrow-right-to-bracket"></i> Sign In'; btn.disabled=false; }
    }
  }
}

function onLoginSuccess(user) {
  document.getElementById('loginOverlay')?.classList.add('hidden');
  document.getElementById('appWrapper')?.classList.add('active');
  updateUserUI(user);
  updateClock();
  startAutoSync();
  if(typeof initDashboard==='function') initDashboard();
  showToast('success', `Welcome, ${user.name}!`, `Logged in as ${user.role}`);
}

function handleLogout() {
  App.currentUser = null;
  Store.setObj('currentUser', null);
  stopAutoSync();
  document.getElementById('loginOverlay')?.classList.remove('hidden');
  document.getElementById('appWrapper')?.classList.remove('active');
  if(document.getElementById('loginUser')) document.getElementById('loginUser').value='';
  if(document.getElementById('loginPass')) document.getElementById('loginPass').value='';
}

function updateUserUI(user) {
  if(!user) return;
  const name = user.name || 'User';
  const av   = initials(name);
  document.querySelectorAll('.user-avatar, #sidebarAvatar, #headerAvatar').forEach(el => {
    if(!el.querySelector('img')) el.textContent = av;
  });
  document.querySelectorAll('#sidebarName').forEach(el => el.textContent = name);

  /* Apply permissions — hide restricted nav links */
  if(user.role !== 'SUPER_ADMIN' && user.role !== 'DIRECTOR') {
    const perms = user.permissions || [];
    document.querySelectorAll('.nav-link[data-module]').forEach(link => {
      const mod = link.getAttribute('data-module');
      if(mod && !perms.includes(mod) && !perms.includes('ALL')) {
        link.style.display = 'none';
      }
    });
  }
}

/* ══════════════════════════════════════
   AUTO SYNC — every 5 min
══════════════════════════════════════ */
function startAutoSync() {
  stopAutoSync();
  App.syncInterval = setInterval(async () => {
    await refreshFromSheet();
  }, 5 * 60 * 1000);
}
function stopAutoSync() {
  if(App.syncInterval) { clearInterval(App.syncInterval); App.syncInterval=null; }
}
async function refreshFromSheet() {
  try {
    await GSheet.read('Employees');
    await GSheet.read('Attendance');
    console.log('Auto-synced from GSheet', new Date().toLocaleTimeString());
  } catch(e) {}
}

/* ══════════════════════════════════════
   CLOCK & GREETING
══════════════════════════════════════ */
function updateClock() {
  const now  = new Date();
  const time = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
  const el   = document.getElementById('liveClock');
  if(el) el.textContent = time;

  const h = now.getHours();
  const greeting = h<12?'Good Morning':h<17?'Good Afternoon':h<21?'Good Evening':'Good Night';
  /* Read name from phr_session (saved by login.html) with fallbacks */
  const _session = (() => { try { return JSON.parse(localStorage.getItem('phr_session')||'{}'); } catch(e) { return {}; } })();
  const name = App.currentUser?.name || _session.name || Store.getObj('currentUser')?.name || localStorage.getItem('phr_profileName') || 'there';

  const gEl = document.getElementById('greetingText');
  if(gEl) gEl.textContent = `${greeting}, ${name}! 👋`;
  const dEl = document.getElementById('greetingDate');
  if(dEl) dEl.textContent = now.toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  const page = document.getElementById('page-'+pageId);
  if(page) page.classList.add('active');
  const link = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if(link) link.classList.add('active');
  if(window.innerWidth<=768) closeSidebar();
  const titles = {dashboard:{t:'Dashboard',s:'Overview & quick actions'},settings:{t:'Settings',s:'System configuration'},profile:{t:'My Profile',s:'Account settings'},users:{t:'User Management',s:'Manage accounts & permissions'}};
  const ti = titles[pageId];
  if(ti) {
    const tEl=document.getElementById('pageTitle');const sEl=document.getElementById('pageSubtitle');
    if(tEl)tEl.textContent=ti.t;if(sEl)sEl.textContent=ti.s;
  }
  /* Call page-specific init function whenever a tab is navigated to */
  const initFn = window['init_'+pageId] || (pageId==='dashboard' ? window.initDashboard : null);
  if(typeof initFn === 'function') initFn();
}

function toggleSubNav(el) {
  const sub=el.nextElementSibling;
  if(!sub?.classList.contains('nav-sub'))return;
  const open=sub.classList.contains('open');
  document.querySelectorAll('.nav-sub').forEach(s=>s.classList.remove('open'));
  document.querySelectorAll('.nav-link.has-sub').forEach(l=>l.classList.remove('open'));
  if(!open){sub.classList.add('open');el.classList.add('open');}
}
function toggleSidebar(){document.getElementById('sidebar')?.classList.toggle('open');document.getElementById('sidebarOverlay')?.classList.toggle('show');}
function closeSidebar(){document.getElementById('sidebar')?.classList.remove('open');document.getElementById('sidebarOverlay')?.classList.remove('show');}

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function showToast(type='info',title='',message='',duration=3500) {
  let c=document.getElementById('toastContainer');
  if(!c){c=document.createElement('div');c.id='toastContainer';c.className='toast-container';document.body.appendChild(c);}
  const icons={success:'fas fa-check-circle',error:'fas fa-times-circle',warning:'fas fa-exclamation-triangle',info:'fas fa-info-circle'};
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<div class="toast-icon"><i class="${icons[type]||icons.info}"></i></div><div class="toast-body"><h4>${title}</h4>${message?`<p>${message}</p>`:''}</div>`;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(100px)';t.style.transition='all .3s';setTimeout(()=>t.remove(),300);},duration);
}

/* ══════════════════════════════════════
   MODALS
══════════════════════════════════════ */
function showModal(id){document.getElementById('modal-'+id)?.classList.add('show');}
function closeModal(id){document.getElementById('modal-'+id)?.classList.remove('show');}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.classList.remove('show');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-overlay.show').forEach(m=>m.classList.remove('show'));});

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function todayStr(){return new Date().toISOString().split('T')[0];}
function nowTimeStr(){const n=new Date();return n.toTimeString().slice(0,5);}
function formatDate(d){if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return d;return dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function formatTime(t){if(!t)return'—';const[h,m]=t.split(':').map(Number);const ap=h>=12?'PM':'AM';return`${h%12||12}:${String(m).padStart(2,'0')} ${ap}`;}
function timeDiffMinutes(t1,t2){if(!t1||!t2)return 0;const[h1,m1]=t1.split(':').map(Number);const[h2,m2]=t2.split(':').map(Number);return(h2*60+m2)-(h1*60+m1);}
function minutesToHHMM(min){if(!min||min<=0)return'0 min';const h=Math.floor(Math.abs(min)/60),m=Math.abs(min)%60;if(h===0)return`${m} min`;if(m===0)return`${h} hr`;return`${h} hr ${m} min`;}
function formatINR(n){if(!n&&n!==0)return'—';return'₹'+Number(n).toLocaleString('en-IN');}
function genId(p=''){return p+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase();}
function initials(name=''){const p=name.trim().split(' ').filter(Boolean);if(!p.length)return'?';if(p.length===1)return p[0].slice(0,2).toUpperCase();return(p[0][0]+p[p.length-1][0]).toUpperCase();}
const AVATAR_COLORS=['linear-gradient(135deg,#7c3aed,#a855f7)','linear-gradient(135deg,#10b981,#34d399)','linear-gradient(135deg,#3b82f6,#60a5fa)','linear-gradient(135deg,#f59e0b,#fbbf24)','linear-gradient(135deg,#ef4444,#f87171)','linear-gradient(135deg,#ec4899,#f472b6)','linear-gradient(135deg,#8b5cf6,#a78bfa)','linear-gradient(135deg,#06b6d4,#22d3ee)'];
function avatarColor(name=''){let h=0;for(let c of name)h=c.charCodeAt(0)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];}
function btnLoading(btn,text='Processing...'){const orig=btn.innerHTML;btn.innerHTML=`<i class="fas fa-spinner spin"></i>&nbsp;${text}`;btn.disabled=true;return function done(st){setTimeout(()=>{btn.innerHTML=`<i class="fas fa-check"></i>&nbsp;${st||'Done'}`;btn.style.background='linear-gradient(135deg,#10b981,#34d399)';setTimeout(()=>{btn.innerHTML=orig;btn.disabled=false;btn.style.background='';},900);},1400);};}
function downloadCSV(filename,rows,headers){const csv=[headers.join(','),...rows.map(r=>headers.map(h=>`"${(r[h]??'').toString().replace(/"/g,'""')}"`).join(','))].join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);showToast('success','Downloaded',filename);}

/* ══════════════════════════════════════
   MASTER DATA
══════════════════════════════════════ */
const DEPARTMENTS=['ADMIN','SALES','ONLINE SALES','ONLINE DISPATCH','DESIGN','DISPATCH','QC','STICHING','EMBROIDERY','MENDING','PRODUCTION PLANNING','PURCHASE','STORE','VALUE ADDITION'];
const DESIGNATIONS={'ADMIN':['HR MANAGER','HR EXECUTIVE','SR. ACCOUNTANT','JR. ACCOUNTANT','ERP EXECUTIVE','SECURITY','HOUSE KEEPER'],'SALES':['SALES MANAGER','SALES COORDINATOR','SALES EXECUTIVE','SALES ASSOCIATE','SHOP ASSISTANT','COLLECTION EXECUTIVE'],'ONLINE SALES':['ONLINE HOD','GRAPHICS DESIGNER','SOCIAL MEDIA EXECUTIVE','D2C EXECUTIVE','ECOMMERCE EXECUTIVE','VIDEO EDITOR'],'ONLINE DISPATCH':['ONLINE DISPATCH SUPERVISOR','ONLINE PACKER','ONLINE DISPATCH EXECUTIVE','QUALITY CHECK'],'DESIGN':['DESIGN HEAD','FASHION DESIGNER','SR.COM.DESIGNER','JR. COM.DESIGNER','SKETCHER','STITCHING MASTER','STITCHING EXECUTIVE','MOCKING EXECUTIVE'],'DISPATCH':['SUPERVISOR','PACKER','HELPER','DRIVER','BILLING EXECUTIVE'],'QC':['SUPERVISOR','CHECKER','HELPER - STONE'],'STICHING':['SUPERVISOR','SR. MASTER','STITCHING EXECUTIVE','HELPER'],'EMBROIDERY':['SUPERVISOR','OPERATOR','PATTA STITCHING','HELPER'],'MENDING':['SUPERVISOR','CHECKER','ALTER EXECUTIVE','MENDOR','FOLDING CHECKER'],'PRODUCTION PLANNING':['PRODUCTION EXECUTIVE'],'PURCHASE':['HOD','PURCHASE EXECUTIVE','FABRIC CHECKER'],'STORE':['STORE MANAGER','STORE KEEPER','HELPER'],'VALUE ADDITION':['HOD','HELPER','ALTER EXECUTIVE','FOLDING - HELPER']};
const DEPT_CODE_MAP={'ac':'ACCOUNTS','adm':'ADMIN','des':'DESIGN','dsp':'DISPATCH','emb':'EMBROIDERY','hr':'HR','mnd':'MENDING','on':'ONLINE','pp':'PRODUCTION','pur':'PURCHASE','qc':'QC','sal':'SALES','stc':'STITCHING','str':'STORE','va':'VALUE ADDITION'};
const ALL_MODULES=['employees','attendance','gatepass','leave','salary','store','analytics','teams'];

function getDeptFromEcode(ecode){if(!ecode)return'—';const p=ecode.split('/');return p.length>=2?(DEPT_CODE_MAP[p[1].toLowerCase()]||p[1].toUpperCase()):'—';}
function populateDeptDropdown(selectId){const sel=document.getElementById(selectId);if(!sel)return;const cur=sel.value;sel.innerHTML='<option value="">Select Department...</option>';DEPARTMENTS.forEach(d=>sel.innerHTML+=`<option value="${d}">${d}</option>`);if(cur)sel.value=cur;}
function populateDesigDropdown(deptVal,selectId){const sel=document.getElementById(selectId);if(!sel)return;const desigs=DESIGNATIONS[deptVal]||[];sel.innerHTML='<option value="">Select Designation...</option>';desigs.forEach(d=>sel.innerHTML+=`<option value="${d}">${d}</option>`);}
function populateDeptDropdownFull(selectId){const sel=document.getElementById(selectId);if(!sel)return;const cur=sel.value;sel.innerHTML='<option value="">All Departments</option>';DEPARTMENTS.forEach(d=>sel.innerHTML+=`<option value="${d}">${d}</option>`);if(cur)sel.value=cur;}
function getShiftLabel(shift){const m={'09:00-18:00':'9:00 AM–6:00 PM','10:00-19:00':'10:00 AM–7:00 PM','08:00-17:00':'8:00 AM–5:00 PM','11:00-20:00':'11:00 AM–8:00 PM'};return m[shift]||shift||'—';}

/* ══════════════════════════════════════
   PERMISSION CHECK
══════════════════════════════════════ */
function hasPermission(module) {
  const user = App.currentUser || Store.getObj('currentUser');
  if(!user) return false;
  if(user.role==='SUPER_ADMIN'||user.role==='DIRECTOR') return true;
  const perms = user.permissions||[];
  return perms.includes('ALL') || perms.includes(module);
}

function checkAccess(module) {
  if(!hasPermission(module)) {
    showToast('error','Access Denied',`You don't have permission for this module`);
    return false;
  }
  return true;
}

/* ══════════════════════════════════════
   SHEET STATUS CSS
══════════════════════════════════════ */
(function(){
  const s=document.createElement('style');
  s.textContent=`.sheet-status{font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:6px;transition:all .3s;display:inline-block;}.sheet-status.success{background:#d1fae5;color:#065f46;}.sheet-status.loading{background:#dbeafe;color:#1d4ed8;}.sheet-status.error{background:#fee2e2;color:#b91c1c;}`;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  setInterval(updateClock,1000);
  updateClock();

  /* Deep-link support: other module pages link here as
     index.html#settings or index.html#profile — on load,
     open that specific tab instead of always landing on dashboard. */
  const hashPage = window.location.hash.replace('#','');
  if(hashPage && document.getElementById('page-'+hashPage)) {
    navigateTo(hashPage);
  }

  /* Check if already logged in */
  const saved = Store.getObj('currentUser');
  if(saved && saved.id) {
    App.currentUser = saved;
    document.getElementById('loginOverlay')?.classList.add('hidden');
    document.getElementById('appWrapper')?.classList.add('active');
    updateUserUI(saved);
    startAutoSync();
    if(typeof initDashboard==='function') initDashboard();
  }

  /* Login enter key */
  document.getElementById('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter')handleLogin();});
  document.getElementById('loginUser')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('loginPass')?.focus();});
});

console.log('%c🪶 House of Panchhi HR v1.0 — Multi-user Edition','color:#6c47ff;font-weight:bold;font-size:14px');
