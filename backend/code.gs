/* ============================================================
   PANCHHI HR SOFTWARE — Google Apps Script Backend
   Code.gs v2.0 — Fixed CORS + URLSearchParams support

   SETUP:
   1. Extensions → Apps Script → Paste this code
   2. Replace SHEET_ID below with your Sheet ID
   3. Run setupSheets() once
   4. Deploy → New Deployment → Web App
      Execute as: Me | Access: Anyone
   5. Copy Web App URL → paste in software Settings
============================================================ */

const SHEET_ID = '1p1vEDK9CG-u8JWLVgfzRC_o9O8du9cYtKT7E8-PAQjs'; // ← Apna Sheet ID yahan daalo

const SHEETS = {
  EMPLOYEES: 'Employees',
  ATTENDANCE: 'Attendance',
  GATE_PASS: 'Gate Pass',
  LEAVE: 'Leave Records',
  SALARY: 'Salary Register',
  ADVANCE: 'Advance & Loans',
  STORE: 'Store Entries',
};

/* ── CORS Headers ── */
function setCORSHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/* ── OPTIONS handler (preflight) ── */
function doOptions(e) {
  return setCORSHeaders(
    ContentService.createTextOutput('')
  );
}

/* ── POST handler ── */
function doPost(e) {
  try {
    let sheet, data, action;

    // Handle both JSON body and URLSearchParams
    if (e.postData && e.postData.type === 'application/x-www-form-urlencoded') {
      // URLSearchParams format
      sheet  = e.parameter.sheet;
      data   = JSON.parse(e.parameter.data || '{}');
      action = e.parameter.action || 'INSERT';
    } else if (e.postData && e.postData.contents) {
      // JSON format
      const payload = JSON.parse(e.postData.contents);
      sheet  = payload.sheet;
      data   = payload.data;
      action = payload.action || 'INSERT';
    } else {
      // Query params fallback
      sheet  = e.parameter.sheet;
      data   = JSON.parse(e.parameter.data || '{}');
      action = e.parameter.action || 'INSERT';
    }

    let result = processSheet(sheet, data, action);

    return setCORSHeaders(
      ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
    );

  } catch(err) {
    return setCORSHeaders(
      ContentService
        .createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON)
    );
  }
}

/* ── GET handler ── */
function doGet(e) {
  try {
    const sheet  = e.parameter.sheet;
    const filter = e.parameter.filter || '';
    const result = readSheetData(sheet, filter);
    return setCORSHeaders(
      ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
    );
  } catch(err) {
    return setCORSHeaders(
      ContentService
        .createTextOutput(JSON.stringify({ success: false, error: err.message }))
        .setMimeType(ContentService.MimeType.JSON)
    );
  }
}

/* ── Main processor ── */
function processSheet(sheet, data, action) {
  switch(sheet) {
    case 'Employees':         return saveEmployees(data);
    case 'Employees_Bulk':    return saveEmployeesBulk(data);
    case 'Attendance':        return saveAttendance(data);
    case 'GatePass':          return saveGatePass(data);
    case 'GatePass_Return':   return updateGatePassReturn(data);
    case 'LeaveRequests':     return saveLeave(data);
    case 'LeaveApproval':     return updateLeaveStatus(data);
    case 'Payroll':           return savePayroll(data);
    case 'AdvanceLoan':       return saveAdvance(data);
    case 'Store':             return saveStore(data);
    case 'Store_Update':      return updateStorePO(data);
    case 'Attendance_Absent': return updateAbsentRemarks(data);
    default: return { success: false, msg: 'Unknown: ' + sheet };
  }
}

/* ════════════════════════════════════
   EMPLOYEES
════════════════════════════════════ */
function saveEmployees(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.EMPLOYEES);

  if (sheet.getLastRow() === 0) {
    const headers = [
      'ID','E-Code','Old E-Code','Full Name','First Name','Father/Husband',
      'Last Name','DOB','Gender','Marital Status','Department','Designation',
      'Location','Joining Date','Confirmation Date','Shift','Status',
      'Senior Tag','Bonus Tag','Mobile','Alt Mobile','Email','Official Email',
      'Current Address','PIN','Permanent Address','Permanent PIN',
      'Emergency Name','Emergency Relation','Emergency Phone',
      'Aadhar','PAN','Fixed CTC','New CTC','Payment Mode',
      'Bank','Account Holder','Account No','IFSC','Branch',
      'PF','UAN','ESIC','ESIC No','Remark','Added On'
    ];
    sheet.appendRow(headers);
    styleHeader(sheet);
  }

  const row = [
    data.id||'', data.ecode||'', data.oldcode||'', data.fullname||'',
    data.fname||'', data.fhname||'', data.lname||'', data.dob||'',
    data.gender||'', data.marital||'', data.department||'', data.designation||'',
    data.location||'', data.joining||'', data.confirm||'', data.shift||'',
    data.status||'ACTIVE', data.tagSenior?'YES':'NO', data.tagBonus?'YES':'NO',
    data.mobile||'', data.altmobile||'', data.email||'', data.offemail||'',
    data.curraddr||'', data.currpin||'', data.permaddr||'', data.permpin||'',
    data.emgname||'', data.emgrelation||'', data.emgphone||'',
    data.aadhar||'', data.pan||'', data.fixctc||0, data.newctc||0,
    data.paymode||'', data.bank||'', data.bankname||'', data.accno||'',
    data.ifsc||'', data.branch||'', data.pfapp||'NO', data.uan||'',
    data.esicapp||'NO', data.esicno||'', data.remark||'',
    data.addedOn || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy')
  ];

  const existRow = findRow(sheet, 2, data.ecode);
  if (existRow > 0) {
    sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  alternateRows(sheet);
  return { success: true, ecode: data.ecode };
}

/* ════════════════════════════════════
   ATTENDANCE
════════════════════════════════════ */
function saveAttendance(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.ATTENDANCE);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Date','E-Code','Name','Department','Shift','In Time','Late Min','Status','Remark','Saved At']);
    styleHeader(sheet);
  }

  const records = Array.isArray(data) ? data : [data];
  records.forEach(r => {
    const row = [
      r.id||'', r.date||'', r.ecode||'', r.empName||'',
      r.department||'', r.shift||'', r.inTime||'',
      r.lateMin||0, r.status||'', r.remark||'',
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm')
    ];
    const existRow = findRowMulti(sheet, [{col:2,val:r.date},{col:3,val:r.ecode}]);
    if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
  });
  alternateRows(sheet);
  return { success: true };
}

function updateAbsentRemarks(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.ATTENDANCE);
  const last  = sheet.getLastRow();
  if (last < 2) return { success: true };
  for (let i = 2; i <= last; i++) {
    const rowDate = sheet.getRange(i, 2).getValue()?.toString();
    if (rowDate === data.date) {
      const ecode = sheet.getRange(i, 3).getValue()?.toString();
      const match = (data.remarks||[]).find(r => r.ecode === ecode);
      if (match) sheet.getRange(i, 10).setValue(match.remarks||'');
    }
  }
  return { success: true };
}

/* ════════════════════════════════════
   GATE PASS
════════════════════════════════════ */
function saveGatePass(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.GATE_PASS);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Date','E-Code','Name','Department','Mobile','Shift','Shift End','Out Time','Return Time','Expected Return','Purpose','Early Min','Duration Min','Status','Created At']);
    styleHeader(sheet);
  }

  const row = [
    data.id||'', data.date||'', data.ecode||'', data.empName||'',
    data.department||'', data.mobile||'', data.shift||'', data.shiftEnd||'',
    data.outTime||'', data.returnTime||'', data.expectedReturn||'',
    data.purpose||'', data.earlyMinutes||0, data.durationMinutes||0,
    data.status||'OUT',
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm')
  ];

  const existRow = findRow(sheet, 1, data.id);
  if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  alternateRows(sheet);
  return { success: true };
}

function updateGatePassReturn(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.GATE_PASS);
  const row   = findRow(sheet, 1, data.id);
  if (row > 0) {
    sheet.getRange(row, 10).setValue(data.returnTime||'');
    sheet.getRange(row, 14).setValue(data.durationMinutes||0);
    sheet.getRange(row, 15).setValue('RETURNED');
  }
  return { success: true };
}

/* ════════════════════════════════════
   LEAVE
════════════════════════════════════ */
function saveLeave(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.LEAVE);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Applied On','E-Code','Name','Department','Type','From','To','Days','Reason','Med Cert','Verified','Status','Approved On']);
    styleHeader(sheet);
  }

  const row = [
    data.id||'', data.appliedOn||'', data.ecode||'', data.empName||'',
    data.department||'', data.type||'', data.from||'', data.to||'',
    data.days||0, data.reason||'', data.medCert||'',
    data.medVerified?'YES':'NO', data.status||'PENDING', data.approvedOn||''
  ];

  const existRow = findRow(sheet, 1, data.id);
  if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  alternateRows(sheet);
  return { success: true };
}

function updateLeaveStatus(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.LEAVE);
  const row   = findRow(sheet, 1, data.id);
  if (row > 0) {
    sheet.getRange(row, 13).setValue(data.status||'');
    sheet.getRange(row, 14).setValue(data.approvedOn||'');
    const bg = data.status === 'APPROVED' ? '#d1fae5' : '#fee2e2';
    sheet.getRange(row, 1, 1, 14).setBackground(bg);
  }
  return { success: true };
}

/* ════════════════════════════════════
   SALARY
════════════════════════════════════ */
function savePayroll(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.SALARY);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Month','E-Code','Name','Department','Bank A/C','Gross','Working Days','Present Days','Payable Days','Bonus Days','Gross Earned','Advance Ded.','Loan EMI','LWP Ded.','Total Ded.','Net Salary','Senior','Bonus Tag','Calculated At']);
    styleHeader(sheet);
  }

  const records = Array.isArray(data) ? data : [data];
  records.forEach(r => {
    const row = [
      r.id||'', r.month||'', r.ecode||'', r.empName||'', r.department||'',
      r.bankAcc||'', r.gross||0, r.workingDays||0, r.presentDays||0,
      r.payableDays||0, r.bonusDays||0, r.grossEarned||0,
      r.advanceDeduction||0, r.loanEMI||0, r.lwpDeduction||0,
      r.totalDeductions||0, r.netSalary||0,
      r.tagSenior?'YES':'NO', r.tagBonus?'YES':'NO',
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm')
    ];
    const existRow = findRowMulti(sheet, [{col:2,val:r.month},{col:3,val:r.ecode}]);
    if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
  });
  alternateRows(sheet);
  return { success: true };
}

/* ════════════════════════════════════
   ADVANCE / LOAN
════════════════════════════════════ */
function saveAdvance(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.ADVANCE);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Given On','E-Code','Name','Department','Type','Amount','EMI','Balance','Deduct Month','EMI Start','Remark','Status']);
    styleHeader(sheet);
  }

  const row = [
    data.id||'', data.givenOn||'', data.ecode||'', data.empName||'',
    data.department||'', data.type||'', data.amount||0, data.emi||0,
    data.balance||0, data.deductMonth||'', data.emiStartMonth||'',
    data.remark||'', data.status||'ACTIVE'
  ];

  const existRow = findRow(sheet, 1, data.id);
  if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  alternateRows(sheet);
  return { success: true };
}

/* ════════════════════════════════════
   STORE
════════════════════════════════════ */
function saveStore(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.STORE);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Date','Item','Category','Condition','Qty','Unit','Rate','Total','Vendor','PO No','PR No','Bill No','Attachment','PO Status','Remark','Added At']);
    styleHeader(sheet);
  }

  const row = [
    data.id||'', data.date||'', data.itemName||'', data.category||'',
    data.condition||'', data.qty||0, data.unit||'', data.rate||0, data.total||0,
    data.vendor||'', data.po||'', data.pr||'', data.bill||'',
    data.attachment ? data.attachment.name : '',
    data.poStatus||'PENDING', data.remark||'',
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm')
  ];

  const existRow = findRow(sheet, 1, data.id);
  if (existRow > 0) sheet.getRange(existRow, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  alternateRows(sheet);
  return { success: true };
}

function updateStorePO(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreate(ss, SHEETS.STORE);
  const row   = findRow(sheet, 1, data.id);
  if (row > 0) {
    sheet.getRange(row, 11).setValue(data.po  ||'');
    sheet.getRange(row, 12).setValue(data.pr  ||'');
    sheet.getRange(row, 13).setValue(data.bill||'');
    sheet.getRange(row, 15).setValue(data.po && data.pr ? 'COMPLETE' : 'PENDING');
    if (data.po && data.pr) sheet.getRange(row, 1, 1, 17).setBackground('#d1fae5');
  }
  return { success: true };
}

/* ════════════════════════════════════
   EMPLOYEES BULK
════════════════════════════════════ */
function saveEmployeesBulk(data) {
  if (!Array.isArray(data)) return saveEmployees(data);
  data.forEach(emp => saveEmployees(emp));
  return { success: true, count: data.length };
}

/* ════════════════════════════════════
   READ DATA
════════════════════════════════════ */
function readSheetData(sheetName, filter) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetMap = {
    'Employees': SHEETS.EMPLOYEES,
    'Attendance': SHEETS.ATTENDANCE,
    'GatePass': SHEETS.GATE_PASS,
    'Leave': SHEETS.LEAVE,
    'Salary': SHEETS.SALARY,
    'Advance': SHEETS.ADVANCE,
    'Store': SHEETS.STORE,
  };
  const name  = sheetMap[sheetName] || sheetName;
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { success: false, msg: 'Sheet not found: ' + name };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { success: true, data: [] };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows    = sheet.getRange(2, 1, lastRow-1, lastCol).getValues();
  const data    = rows
    .filter(row => row.some(v => v !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

  return { success: true, data };
}

/* ════════════════════════════════════
   HELPERS
════════════════════════════════════ */
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function findRow(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const vals = sheet.getRange(2, col, last-1, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][0]?.toString().trim() === value?.toString().trim()) return i + 2;
  }
  return -1;
}

function findRowMulti(sheet, conditions) {
  const last   = sheet.getLastRow();
  if (last < 2) return -1;
  const maxCol = Math.max(...conditions.map(c => c.col));
  const vals   = sheet.getRange(2, 1, last-1, maxCol).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (conditions.every(c => vals[i][c.col-1]?.toString().trim() === c.val?.toString().trim())) return i + 2;
  }
  return -1;
}

function styleHeader(sheet) {
  const last = sheet.getLastColumn();
  if (last === 0) return;
  const range = sheet.getRange(1, 1, 1, last);
  range.setBackground('#1a0533');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);
  for (let i = 1; i <= last; i++) {
    try { sheet.setColumnWidth(i, 120); } catch(e) {}
  }
}

function alternateRows(sheet) {
  const last    = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (last < 2 || lastCol === 0) return;
  for (let i = 2; i <= last; i++) {
    sheet.getRange(i, 1, 1, lastCol).setBackground(i % 2 === 0 ? '#f5f3ff' : '#ffffff');
  }
}

/* ════════════════════════════════════
   SETUP — Run once manually
════════════════════════════════════ */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.values(SHEETS).forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log('Created: ' + name);
    }
  });
  // Remove default Sheet1
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  Logger.log('✅ Setup complete! Now deploy as Web App.');
}
