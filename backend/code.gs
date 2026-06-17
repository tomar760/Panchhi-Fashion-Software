/* ============================================================
   PANCHHI HR SOFTWARE — Google Apps Script Backend
   Code.gs v3.0 — Multi-user + OTP + Real-time Sync

   SETUP:
   1. Extensions → Apps Script → Paste this entire code
   2. Replace SHEET_ID below with your Sheet ID
   3. Replace ADMIN_EMAIL with Aditya's Gmail
   4. Run setupSheets() once manually
   5. Deploy → New Deployment → Web App
      Execute as: Me | Access: Anyone
   6. Copy Web App URL → paste in app.js
============================================================ */

const SHEET_ID    = '1p1vEDK9CG-u8JWLVgfzRC_o9O8du9cYtKT7E8-PAQjs'; // ← Your Sheet ID
const ADMIN_EMAIL = 'aditya@panchhi.com'; // ← Aditya's email
const APP_NAME    = 'House of Panchhi HR';

/* ── Sheet Names ── */
const SHEETS = {
  EMPLOYEES:  'Employees',
  ATTENDANCE: 'Attendance',
  GATE_PASS:  'Gate Pass',
  LEAVE:      'Leave Records',
  SALARY:     'Salary Register',
  ADVANCE:    'Advance & Loans',
  STORE:      'Store Entries',
  USERS:      'Users',
  ACTIVITY:   'Activity Log',
  OTP:        'OTP Store',
};

/* ════════════════════════════════════
   CORS HELPER
════════════════════════════════════ */
function cors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function doOptions(e) { return cors(ContentService.createTextOutput('')); }
function respond(data) {
  return cors(ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON));
}

/* ════════════════════════════════════
   MAIN POST HANDLER
════════════════════════════════════ */
function doPost(e) {
  try {
    let sheet, data, action, id, userId, token;

    if(e.postData && e.postData.type === 'application/x-www-form-urlencoded') {
      sheet  = e.parameter.sheet;
      data   = JSON.parse(e.parameter.data || '{}');
      action = e.parameter.action || 'INSERT';
      id     = e.parameter.id;
      userId = e.parameter.userId;
      token  = e.parameter.token;
    } else if(e.postData && e.postData.contents) {
      const p = JSON.parse(e.postData.contents);
      sheet=p.sheet; data=p.data; action=p.action||'INSERT';
      id=p.id; userId=p.userId; token=p.token;
    } else {
      sheet=e.parameter.sheet; data=JSON.parse(e.parameter.data||'{}');
      action=e.parameter.action||'INSERT'; id=e.parameter.id;
      userId=e.parameter.userId; token=e.parameter.token;
    }

    let result;
    switch(action) {
      /* ── Auth ── */
      case 'LOGIN':         result = handleLogin(data); break;
      case 'SEND_OTP':      result = handleSendOTP(data); break;
      case 'VERIFY_OTP':    result = handleVerifyOTP(data); break;
      case 'RESET_PASSWORD':result = handleResetPassword(data); break;
      case 'CREATE_USER':   result = handleCreateUser(data); break;
      case 'GET_USERS':     result = getUsers(); break;
      case 'UPDATE_USER':   result = handleUpdateUser(data); break;
      case 'DELETE_USER':   result = handleDeleteUser(id); break;

      /* ── Data ── */
      case 'INSERT':  result = insertData(sheet, data, userId); break;
      case 'UPDATE':  result = updateData(sheet, id, data, userId); break;
      case 'DELETE':  result = deleteData(sheet, id, userId); break;
      case 'READ':    result = readData(sheet); break;
      case 'BATCH':   result = batchInsert(sheet, data, userId); break;

      default: result = { success:false, msg:'Unknown action: '+action };
    }
    return respond(result);
  } catch(err) {
    return respond({ success:false, error:err.message, stack:err.stack });
  }
}

/* ════════════════════════════════════
   MAIN GET HANDLER
════════════════════════════════════ */
function doGet(e) {
  try {
    const sheet  = e.parameter.sheet;
    const action = e.parameter.action || 'READ';
    const filter = e.parameter.filter || '';
    const id     = e.parameter.id;

    let result;
    switch(action) {
      case 'READ':         result = readData(sheet, filter); break;
      case 'GET_ACTIVITY': result = getActivity(parseInt(e.parameter.limit)||50); break;
      case 'GET_USERS':    result = getUsers(); break;
      case 'PING':         result = { success:true, msg:'Server alive', time:new Date().toISOString() }; break;
      default:             result = readData(sheet, filter);
    }
    return respond(result);
  } catch(err) {
    return respond({ success:false, error:err.message });
  }
}

/* ════════════════════════════════════
   AUTH — LOGIN
════════════════════════════════════ */
function handleLogin(data) {
  const { email, password } = data;
  if(!email || !password) return { success:false, msg:'Email and password required' };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.USERS);
  if(sheet.getLastRow() < 2) return { success:false, msg:'No users found. Contact admin.' };

  const rows = sheet.getRange(2, 1, sheet.getLastRow()-1, 10).getValues();
  const user = rows.find(r => r[2]?.toString().toLowerCase().trim() === email.toLowerCase().trim());

  if(!user) return { success:false, msg:'Email not found' };
  if(user[6] === 'INACTIVE') return { success:false, msg:'Account deactivated. Contact admin.' };
  if(user[3]?.toString().trim() !== password?.toString().trim()) return { success:false, msg:'Wrong password' };

  logActivity(ss, 'LOGIN', user[0], user[1], 'User logged in', email);

  return {
    success: true,
    user: {
      id:          user[0],
      name:        user[1],
      email:       user[2],
      role:        user[4],
      permissions: user[5]?.toString().split(',').filter(Boolean) || [],
      status:      user[6],
    }
  };
}

/* ════════════════════════════════════
   AUTH — OTP
════════════════════════════════════ */
function handleSendOTP(data) {
  const { email } = data;
  if(!email) return { success:false, msg:'Email required' };

  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const users = getOrCreate(ss, SHEETS.USERS);
  const rows  = users.getLastRow() < 2 ? [] : users.getRange(2,1,users.getLastRow()-1,5).getValues();
  const user  = rows.find(r => r[2]?.toString().toLowerCase() === email.toLowerCase());

  if(!user) return { success:false, msg:'Email not registered' };

  const otp     = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry  = new Date(Date.now() + 10*60*1000).toISOString(); // 10 min

  /* Store OTP */
  const otpSheet = getOrCreate(ss, SHEETS.OTP);
  if(otpSheet.getLastRow() === 0) otpSheet.appendRow(['Email','OTP','Expiry','Used']);

  /* Remove old OTPs for this email */
  const otpRows = otpSheet.getLastRow() > 1
    ? otpSheet.getRange(2,1,otpSheet.getLastRow()-1,4).getValues() : [];
  otpRows.forEach((r,i) => { if(r[0]?.toString().toLowerCase()===email.toLowerCase()) otpSheet.getRange(i+2,4).setValue('USED'); });

  otpSheet.appendRow([email, otp, expiry, 'PENDING']);

  /* Send email */
  try {
    GmailApp.sendEmail(email,
      `${APP_NAME} — Password Reset OTP`,
      `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore.\n\n— ${APP_NAME} Team`
    );
    return { success:true, msg:'OTP sent to '+email };
  } catch(err) {
    return { success:false, msg:'Failed to send email: '+err.message };
  }
}

function handleVerifyOTP(data) {
  const { email, otp } = data;
  if(!email || !otp) return { success:false, msg:'Email and OTP required' };

  const ss       = SpreadsheetApp.openById(SHEET_ID);
  const otpSheet = getOrCreate(ss, SHEETS.OTP);
  if(otpSheet.getLastRow() < 2) return { success:false, msg:'No OTP found' };

  const rows  = otpSheet.getRange(2,1,otpSheet.getLastRow()-1,4).getValues();
  const found = rows.findIndex(r =>
    r[0]?.toString().toLowerCase()===email.toLowerCase() &&
    r[1]?.toString()===otp.toString() &&
    r[3]?.toString()==='PENDING' &&
    new Date(r[2]) > new Date()
  );

  if(found < 0) return { success:false, msg:'Invalid or expired OTP' };

  /* Mark as verified */
  otpSheet.getRange(found+2, 4).setValue('VERIFIED');
  return { success:true, msg:'OTP verified' };
}

function handleResetPassword(data) {
  const { email, otp, newPassword } = data;
  if(!email || !otp || !newPassword) return { success:false, msg:'All fields required' };

  /* Verify OTP first */
  const ss       = SpreadsheetApp.openById(SHEET_ID);
  const otpSheet = getOrCreate(ss, SHEETS.OTP);
  const otpRows  = otpSheet.getLastRow() < 2 ? [] : otpSheet.getRange(2,1,otpSheet.getLastRow()-1,4).getValues();
  const validOTP = otpRows.some(r =>
    r[0]?.toString().toLowerCase()===email.toLowerCase() &&
    r[1]?.toString()===otp.toString() &&
    (r[3]==='PENDING'||r[3]==='VERIFIED') &&
    new Date(r[2]) > new Date()
  );
  if(!validOTP) return { success:false, msg:'Invalid or expired OTP' };

  /* Update password */
  const users = getOrCreate(ss, SHEETS.USERS);
  if(users.getLastRow() < 2) return { success:false, msg:'User not found' };
  const userRows = users.getRange(2,1,users.getLastRow()-1,10).getValues();
  const idx = userRows.findIndex(r => r[2]?.toString().toLowerCase()===email.toLowerCase());
  if(idx < 0) return { success:false, msg:'User not found' };

  users.getRange(idx+2, 4).setValue(newPassword);
  logActivity(ss, 'PASSWORD_RESET', userRows[idx][0], userRows[idx][1], 'Password reset', email);

  return { success:true, msg:'Password updated successfully' };
}

/* ════════════════════════════════════
   USER MANAGEMENT
════════════════════════════════════ */
function handleCreateUser(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.USERS);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Name','Email','Password','Role','Permissions','Status','Created At']);
    styleHeader(sheet);
  }

  /* Max 10 users */
  const count = sheet.getLastRow() - 1;
  if(count >= 10) return { success:false, msg:'Max 10 users allowed' };

  /* Check email exists */
  if(sheet.getLastRow() > 1) {
    const emails = sheet.getRange(2,3,sheet.getLastRow()-1,1).getValues().flat();
    if(emails.some(e => e?.toString().toLowerCase() === data.email?.toLowerCase())) {
      return { success:false, msg:'Email already exists' };
    }
  }

  const id = 'USR' + Date.now().toString(36).toUpperCase();
  const row = [
    id, data.name||'', data.email||'', data.password||'changeme123',
    data.role||'STAFF', (data.permissions||[]).join(','),
    'ACTIVE', new Date().toLocaleString('en-IN')
  ];
  sheet.appendRow(row);
  alternateRows(sheet);

  /* Send welcome email */
  try {
    GmailApp.sendEmail(data.email,
      `Welcome to ${APP_NAME}`,
      `Hello ${data.name},\n\nYour account has been created.\n\nEmail: ${data.email}\nPassword: ${data.password||'changeme123'}\n\nPlease login and change your password.\n\nURL: https://tomar760.github.io/Panchhi-Fashion-Software/\n\n— ${APP_NAME} Team`
    );
  } catch(err) { console.log('Email error:', err.message); }

  logActivity(ss, 'CREATE_USER', 'ADMIN', 'Admin', 'Created user: '+data.name, data.email);
  return { success:true, id, msg:'User created and email sent' };
}

function getUsers() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.USERS);
  if(!sheet || sheet.getLastRow() < 2) return { success:true, data:[] };

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const rows    = sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
  const data    = rows.filter(r=>r[0]).map(r => {
    const obj = {};
    headers.forEach((h,i) => obj[h]=r[i]);
    /* Never expose password in list */
    delete obj['Password'];
    return obj;
  });
  return { success:true, data };
}

function handleUpdateUser(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.USERS);
  const row   = findRow(sheet, 1, data.id);
  if(row < 0) return { success:false, msg:'User not found' };

  if(data.name)        sheet.getRange(row,2).setValue(data.name);
  if(data.role)        sheet.getRange(row,5).setValue(data.role);
  if(data.permissions) sheet.getRange(row,6).setValue(data.permissions.join(','));
  if(data.status)      sheet.getRange(row,7).setValue(data.status);
  if(data.password)    sheet.getRange(row,4).setValue(data.password);

  logActivity(ss, 'UPDATE_USER', 'ADMIN', 'Admin', 'Updated user: '+data.name, data.id);
  return { success:true, msg:'User updated' };
}

function handleDeleteUser(id) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.USERS);
  const row   = findRow(sheet, 1, id);
  if(row < 0) return { success:false, msg:'User not found' };
  sheet.deleteRow(row);
  return { success:true, msg:'User deleted' };
}

/* ════════════════════════════════════
   DATA OPERATIONS
════════════════════════════════════ */
function insertData(sheetName, data, userId) {
  const ss      = SpreadsheetApp.openById(SHEET_ID);
  const mapped  = getSheetConfig(sheetName);
  if(!mapped)   return { success:false, msg:'Unknown sheet: '+sheetName };

  const sheet   = getOrCreate(ss, mapped.name);
  if(sheet.getLastRow() === 0) { sheet.appendRow(mapped.headers); styleHeader(sheet); }

  /* Check if exists → update */
  if(data.id) {
    const existRow = findRow(sheet, 1, data.id);
    if(existRow > 0) {
      const row = mapped.toRow(data);
      sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
      alternateRows(sheet);
      logActivity(ss, 'UPDATE', userId||'SYSTEM', '', 'Updated in '+sheetName, data.id);
      return { success:true, action:'UPDATED' };
    }
  }

  sheet.appendRow(mapped.toRow(data));
  alternateRows(sheet);
  logActivity(ss, 'INSERT', userId||'SYSTEM', '', 'Added to '+sheetName, data.id||'');
  return { success:true, action:'INSERTED' };
}

function batchInsert(sheetName, dataArr, userId) {
  if(!Array.isArray(dataArr)) return insertData(sheetName, dataArr, userId);
  let count = 0;
  dataArr.forEach(d => { try { insertData(sheetName, d, userId); count++; } catch(e){} });
  return { success:true, count };
}

function updateData(sheetName, id, data, userId) {
  return insertData(sheetName, { ...data, id }, userId);
}

function deleteData(sheetName, id, userId) {
  const ss     = SpreadsheetApp.openById(SHEET_ID);
  const mapped = getSheetConfig(sheetName);
  if(!mapped)  return { success:false, msg:'Unknown sheet' };
  const sheet  = ss.getSheetByName(mapped.name);
  if(!sheet)   return { success:false, msg:'Sheet not found' };
  const row    = findRow(sheet, 1, id);
  if(row < 0)  return { success:false, msg:'Record not found' };
  sheet.deleteRow(row);
  logActivity(ss, 'DELETE', userId||'SYSTEM', '', 'Deleted from '+sheetName, id);
  return { success:true };
}

function readData(sheetName, filter) {
  const ss     = SpreadsheetApp.openById(SHEET_ID);
  const mapped = getSheetConfig(sheetName);
  const sName  = mapped ? mapped.name : sheetName;
  const sheet  = ss.getSheetByName(sName);
  if(!sheet || sheet.getLastRow() < 2) return { success:true, data:[] };

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const rows    = sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
  const data    = rows
    .filter(r => r.some(v => v !== ''))
    .map(r => { const o={}; headers.forEach((h,i)=>o[h]=r[i]); return o; });

  return { success:true, data, count:data.length };
}

/* ════════════════════════════════════
   ACTIVITY LOG
════════════════════════════════════ */
function logActivity(ss, action, userId, userName, description, reference) {
  try {
    const sheet = getOrCreate(ss, SHEETS.ACTIVITY);
    if(sheet.getLastRow()===0) {
      sheet.appendRow(['Timestamp','Action','User ID','User Name','Description','Reference']);
      styleHeader(sheet);
    }
    sheet.appendRow([
      new Date().toLocaleString('en-IN'),
      action, userId||'', userName||'', description||'', reference||''
    ]);
    /* Keep only last 1000 logs */
    if(sheet.getLastRow() > 1001) sheet.deleteRow(2);
  } catch(e) {}
}

function getActivity(limit) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.ACTIVITY);
  if(!sheet || sheet.getLastRow() < 2) return { success:true, data:[] };

  const last    = sheet.getLastRow();
  const start   = Math.max(2, last - limit + 1);
  const rows    = sheet.getRange(start,1,last-start+1,6).getValues();
  const headers = ['Timestamp','Action','UserID','UserName','Description','Reference'];
  const data    = rows.reverse().map(r => {
    const o={}; headers.forEach((h,i)=>o[h]=r[i]); return o;
  });
  return { success:true, data };
}

/* ════════════════════════════════════
   SHEET CONFIG — Maps frontend names to sheet structure
════════════════════════════════════ */
function getSheetConfig(name) {
  const configs = {
    'Employees': {
      name: SHEETS.EMPLOYEES,
      headers: ['ID','E-Code','Old E-Code','Full Name','First Name','Father/Husband','Last Name','DOB','Gender','Marital Status','Department','Designation','Location','Joining Date','Confirmation Date','Shift','Status','Senior Tag','Bonus Tag','Mobile','Alt Mobile','Email','Official Email','Current Address','PIN','Permanent Address','Permanent PIN','Emergency Name','Emergency Relation','Emergency Phone','Aadhar','PAN','Fixed CTC','New CTC','Payment Mode','Bank','Account Holder','Account No','IFSC','Branch','Remark','Added On'],
      toRow: d => [d.id||'',d.ecode||'',d.oldcode||'',d.fullname||'',d.fname||'',d.fhname||'',d.lname||'',d.dob||'',d.gender||'',d.marital||'',d.department||'',d.designation||'',d.location||'',d.joining||'',d.confirm||'',d.shift||'',d.status||'ACTIVE',d.tagSenior?'YES':'NO',d.tagBonus?'YES':'NO',d.mobile||'',d.altmobile||'',d.email||'',d.offemail||'',d.curraddr||'',d.currpin||'',d.permaddr||'',d.permpin||'',d.emgname||'',d.emgrelation||'',d.emgphone||'',d.aadhar||'',d.pan||'',d.fixctc||0,d.newctc||0,d.paymode||'',d.bank||'',d.bankname||'',d.accno||'',d.ifsc||'',d.branch||'',d.remark||'',d.addedOn||now()]
    },
    'Employees_Bulk': {
      name: SHEETS.EMPLOYEES,
      headers: null, // same as Employees
      toRow: d => getSheetConfig('Employees').toRow(d)
    },
    'Attendance': {
      name: SHEETS.ATTENDANCE,
      headers: ['ID','Date','E-Code','Name','Department','Shift','In Time','Late Min','Status','Remark','Saved At'],
      toRow: d => [d.id||'',d.date||'',d.ecode||'',d.empName||'',d.department||'',d.shift||'',d.inTime||'',d.lateMin||0,d.status||'',d.remark||'',now()]
    },
    'GatePass': {
      name: SHEETS.GATE_PASS,
      headers: ['ID','Date','E-Code','Name','Department','Mobile','Shift','Shift End','Out Time','Return Time','Expected Return','Purpose','Early Min','Duration Min','Status','Created At'],
      toRow: d => [d.id||'',d.date||'',d.ecode||'',d.empName||'',d.department||'',d.mobile||'',d.shift||'',d.shiftEnd||'',d.outTime||'',d.returnTime||'',d.expectedReturn||'',d.purpose||'',d.earlyMinutes||0,d.durationMinutes||0,d.status||'OUT',now()]
    },
    'LeaveRequests': {
      name: SHEETS.LEAVE,
      headers: ['ID','Applied On','E-Code','Name','Department','Type','From','To','Days','Reason','Med Cert','Verified','Status','Approved On'],
      toRow: d => [d.id||'',d.appliedOn||'',d.ecode||'',d.empName||'',d.department||'',d.type||'',d.from||'',d.to||'',d.days||0,d.reason||'',d.medCert||'',d.medVerified?'YES':'NO',d.status||'PENDING',d.approvedOn||'']
    },
    'LeaveApproval': {
      name: SHEETS.LEAVE,
      headers: null,
      toRow: d => [] // handled separately
    },
    'Payroll': {
      name: SHEETS.SALARY,
      headers: ['ID','Month','E-Code','Name','Department','Bank A/C','Gross','Working Days','Present Days','Payable Days','Bonus Days','Gross Earned','Advance Ded.','Loan EMI','LWP Ded.','Total Ded.','Net Salary','Senior','Bonus Tag','Calculated At'],
      toRow: d => [d.id||'',d.month||'',d.ecode||'',d.empName||'',d.department||'',d.bankAcc||'',d.gross||0,d.workingDays||0,d.presentDays||0,d.payableDays||0,d.bonusDays||0,d.grossEarned||0,d.advanceDeduction||0,d.loanEMI||0,d.lwpDeduction||0,d.totalDeductions||0,d.netSalary||0,d.tagSenior?'YES':'NO',d.tagBonus?'YES':'NO',now()]
    },
    'AdvanceLoan': {
      name: SHEETS.ADVANCE,
      headers: ['ID','Given On','E-Code','Name','Department','Type','Amount','EMI','Balance','Deduct Month','EMI Start','Remark','Status'],
      toRow: d => [d.id||'',d.givenOn||'',d.ecode||'',d.empName||'',d.department||'',d.type||'',d.amount||0,d.emi||0,d.balance||0,d.deductMonth||'',d.emiStartMonth||'',d.remark||'',d.status||'ACTIVE']
    },
    'Store': {
      name: SHEETS.STORE,
      headers: ['ID','Date','Item','Category','Condition','Qty','Unit','Rate','Total','Vendor','PO No','PR No','Bill No','Attachment','PO Status','Remark','Added At'],
      toRow: d => [d.id||'',d.date||'',d.itemName||'',d.category||'',d.condition||'',d.qty||0,d.unit||'',d.rate||0,d.total||0,d.vendor||'',d.po||'',d.pr||'',d.bill||'',d.attachment?d.attachment.name:'',d.poStatus||'PENDING',d.remark||'',now()]
    },
  };
  return configs[name] || null;
}

function now() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
}

/* ════════════════════════════════════
   HELPERS
════════════════════════════════════ */
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function findRow(sheet, col, value) {
  const last = sheet.getLastRow();
  if(last < 2) return -1;
  const vals = sheet.getRange(2, col, last-1, 1).getValues();
  for(let i=0; i<vals.length; i++) {
    if(vals[i][0]?.toString().trim() === value?.toString().trim()) return i+2;
  }
  return -1;
}

function styleHeader(sheet) {
  const last = sheet.getLastColumn();
  if(last===0) return;
  const r = sheet.getRange(1,1,1,last);
  r.setBackground('#1a0533');
  r.setFontColor('#ffffff');
  r.setFontWeight('bold');
  r.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);
}

function alternateRows(sheet) {
  const last    = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if(last<2||lastCol===0) return;
  for(let i=2; i<=last; i++) {
    sheet.getRange(i,1,1,lastCol).setBackground(i%2===0?'#f5f3ff':'#ffffff');
  }
}

/* ════════════════════════════════════
   SETUP — Run once manually
════════════════════════════════════ */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  Object.values(SHEETS).forEach(name => {
    if(!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log('Created: '+name);
    }
  });

  /* Setup default Super Admin */
  const users = getOrCreate(ss, SHEETS.USERS);
  if(users.getLastRow() === 0) {
    users.appendRow(['ID','Name','Email','Password','Role','Permissions','Status','Created At']);
    styleHeader(users);
    users.appendRow(['USR001','Aditya Tomar',ADMIN_EMAIL,'Admin@123','SUPER_ADMIN','ALL','ACTIVE',now()]);
    users.appendRow(['USR002','Director','director@panchhi.com','Director@123','DIRECTOR','ALL','ACTIVE',now()]);
    Logger.log('Default users created!');
  }

  const def = ss.getSheetByName('Sheet1');
  if(def && ss.getSheets().length > 1) ss.deleteSheet(def);

  Logger.log('✅ Setup complete!');
  Logger.log('Admin: '+ADMIN_EMAIL+' | Password: Admin@123');
  Logger.log('Please deploy as Web App and update app.js');
}
