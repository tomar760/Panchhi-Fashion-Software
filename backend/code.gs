/* ============================================================
   PANCHHI HR SOFTWARE — Google Apps Script Backend
   Code.gs — Paste this in Google Apps Script Editor
   
   SETUP STEPS:
   1. Open your Google Sheet
   2. Click Extensions → Apps Script
   3. Delete existing code, paste this entire file
   4. Click Save (💾)
   5. Click Deploy → New Deployment
   6. Type: Web App
   7. Execute as: Me
   8. Who has access: Anyone
   9. Click Deploy → Copy the Web App URL
   10. Paste that URL in your software Settings page
   ============================================================ */

// ── YOUR SHEET ID ──
// Replace this with your actual Google Sheet ID
// Found in URL: docs.google.com/spreadsheets/d/[THIS_PART]/edit
const SHEET_ID = '1p1vEDK9CG-u8JWLVgfzRC_o9O8du9cYtKT7E8-PAQjs';

// ── SHEET TAB NAMES ──
const SHEETS = {
  EMPLOYEES:        'Employees',
  ATTENDANCE:       'Attendance',
  GATE_PASS:        'Gate Pass',
  LEAVE:            'Leave Records',
  SALARY:           'Salary Register',
  ADVANCE:          'Advance & Loans',
  STORE:            'Store Entries',
  ACTIVITY:         'Activity Log',
};

/* ============================================================
   MAIN HANDLER — Receives all requests from software
============================================================ */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet   = payload.sheet;
    const data    = payload.data;
    const action  = payload.action || 'INSERT';

    let result;
    switch(sheet) {
      case 'Employees':       result = handleEmployees(data, action);   break;
      case 'Attendance':      result = handleAttendance(data, action);  break;
      case 'GatePass':        result = handleGatePass(data, action);    break;
      case 'GatePass_Return': result = handleGatePassReturn(data);      break;
      case 'LeaveRequests':   result = handleLeave(data, action);       break;
      case 'LeaveApproval':   result = handleLeaveApproval(data);       break;
      case 'Payroll':         result = handlePayroll(data, action);     break;
      case 'AdvanceLoan':     result = handleAdvance(data, action);     break;
      case 'Store':           result = handleStore(data, action);       break;
      case 'Store_Update':    result = handleStoreUpdate(data);         break;
      case 'Attendance_Absent': result = handleAbsentRemarks(data);     break;
      default:                result = { success: false, msg: 'Unknown sheet: ' + sheet };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet  = e.parameter.sheet;
    const action = e.parameter.action || 'READ';
    const filter = e.parameter.filter || '';

    let result;
    switch(sheet) {
      case 'Employees':   result = readSheet(SHEETS.EMPLOYEES, filter);   break;
      case 'Attendance':  result = readSheet(SHEETS.ATTENDANCE, filter);  break;
      case 'GatePass':    result = readSheet(SHEETS.GATE_PASS, filter);   break;
      case 'Leave':       result = readSheet(SHEETS.LEAVE, filter);       break;
      case 'Salary':      result = readSheet(SHEETS.SALARY, filter);      break;
      case 'Advance':     result = readSheet(SHEETS.ADVANCE, filter);     break;
      case 'Store':       result = readSheet(SHEETS.STORE, filter);       break;
      default:            result = { success: false, msg: 'Unknown sheet' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ============================================================
   EMPLOYEES
============================================================ */
function handleEmployees(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.EMPLOYEES);

  // Setup headers if empty
  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','E-Code','Old E-Code','Full Name','First Name','Father/Husband',
      'Last Name','DOB','Gender','Marital Status','Department','Designation',
      'Location','Joining Date','Confirmation Date','Shift','Status',
      'Senior Tag','Bonus Tag','Mobile','Alt Mobile','Email','Official Email',
      'Current Address','Current PIN','Permanent Address','Permanent PIN',
      'Emergency Name','Emergency Relation','Emergency Phone',
      'Aadhar','PAN','Fixed CTC','New CTC','Payment Mode',
      'Bank Name','Account Holder','Account No','IFSC','Branch',
      'PF Applicable','UAN','ESIC Applicable','ESIC No',
      'Advance','Remark','Added On'
    ]);
    formatHeaderRow(sheet);
  }

  if(action === 'INSERT' || action === 'UPDATE') {
    // Check if E-Code exists
    const existing = findRowByValue(sheet, 2, data.ecode); // col 2 = E-Code
    const rowData  = [
      data.id, data.ecode, data.oldcode||'', data.fullname, data.fname||'',
      data.fhname||'', data.lname||'', data.dob||'', data.gender||'',
      data.marital||'', data.department||'', data.designation||'',
      data.location||'', data.joining||'', data.confirm||'',
      data.shift||'', data.status||'ACTIVE',
      data.tagSenior?'YES':'NO', data.tagBonus?'YES':'NO',
      data.mobile||'', data.altmobile||'', data.email||'', data.offemail||'',
      data.curraddr||'', data.currpin||'', data.permaddr||'', data.permpin||'',
      data.emgname||'', data.emgrelation||'', data.emgphone||'',
      data.aadhar||'', data.pan||'',
      data.fixctc||0, data.newctc||0, data.paymode||'',
      data.bank||'', data.bankname||'', data.accno||'', data.ifsc||'', data.branch||'',
      data.pfapp||'NO', data.uan||'', data.esicapp||'NO', data.esicno||'',
      data.advance||0, data.remark||'', data.addedOn||new Date().toLocaleDateString('en-IN')
    ];

    if(existing > 0) {
      sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
      return { success: true, action: 'UPDATED', ecode: data.ecode };
    } else {
      sheet.appendRow(rowData);
      colorAlternateRows(sheet);
      return { success: true, action: 'INSERTED', ecode: data.ecode };
    }
  }

  return { success: false, msg: 'Unknown action' };
}

/* ============================================================
   ATTENDANCE
============================================================ */
function handleAttendance(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.ATTENDANCE);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Date','E-Code','Employee Name','Department','Shift','In Time','Late Min','Status','Remark','Saved At']);
    formatHeaderRow(sheet);
  }

  // data can be array of records or single
  const records = Array.isArray(data) ? data : [data];
  records.forEach(r => {
    const existing = findRowByMultiple(sheet, [
      {col:2, val: r.date},
      {col:3, val: r.ecode}
    ]);
    const rowData = [
      r.id||'', r.date||'', r.ecode||'', r.empName||'',
      r.department||'', r.shift||'', r.inTime||'',
      r.lateMin||0, r.status||'', r.remark||'',
      new Date().toLocaleString('en-IN')
    ];
    if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
  });

  colorAlternateRows(sheet);
  return { success: true, count: records.length };
}

function handleAbsentRemarks(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.ATTENDANCE);

  // Update remarks for absent records
  if(data.date) {
    const lastRow = sheet.getLastRow();
    for(let i = 2; i <= lastRow; i++) {
      const rowDate = sheet.getRange(i, 2).getValue();
      const status  = sheet.getRange(i, 9).getValue();
      if(rowDate === data.date && status === 'A') {
        // remarks col = 10
        const ecode   = sheet.getRange(i, 3).getValue();
        const matched = (data.remarks || []).find(r => r.ecode === ecode);
        if(matched) sheet.getRange(i, 10).setValue(matched.remarks || '');
      }
    }
  }
  return { success: true };
}

/* ============================================================
   GATE PASS
============================================================ */
function handleGatePass(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.GATE_PASS);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Date','E-Code','Employee Name','Department','Mobile',
      'Shift','Shift End','Out Time','Return Time','Expected Return',
      'Purpose','Early Minutes','Duration Minutes','Status','Created At'
    ]);
    formatHeaderRow(sheet);
  }

  const rowData = [
    data.id||'', data.date||'', data.ecode||'', data.empName||'',
    data.department||'', data.mobile||'', data.shift||'', data.shiftEnd||'',
    data.outTime||'', data.returnTime||'', data.expectedReturn||'',
    data.purpose||'', data.earlyMinutes||0, data.durationMinutes||0,
    data.status||'OUT', new Date().toLocaleString('en-IN')
  ];

  const existing = findRowByValue(sheet, 1, data.id);
  if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);

  colorAlternateRows(sheet);
  return { success: true };
}

function handleGatePassReturn(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.GATE_PASS);
  const row   = findRowByValue(sheet, 1, data.id);
  if(row > 0) {
    sheet.getRange(row, 10).setValue(data.returnTime || '');
    sheet.getRange(row, 14).setValue(data.durationMinutes || 0);
    sheet.getRange(row, 15).setValue('RETURNED');
  }
  return { success: true };
}

/* ============================================================
   LEAVE
============================================================ */
function handleLeave(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.LEAVE);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Applied On','E-Code','Employee Name','Department',
      'Leave Type','From','To','Days','Reason',
      'Med Cert','Med Verified','Status','Approved On'
    ]);
    formatHeaderRow(sheet);
  }

  const rowData = [
    data.id||'', data.appliedOn||'', data.ecode||'', data.empName||'',
    data.department||'', data.type||'', data.from||'', data.to||'',
    data.days||0, data.reason||'',
    data.medCert||'', data.medVerified?'YES':'NO',
    data.status||'PENDING', data.approvedOn||''
  ];

  const existing = findRowByValue(sheet, 1, data.id);
  if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);

  colorAlternateRows(sheet);
  return { success: true };
}

function handleLeaveApproval(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.LEAVE);
  const row   = findRowByValue(sheet, 1, data.id);
  if(row > 0) {
    sheet.getRange(row, 13).setValue(data.status || '');
    sheet.getRange(row, 14).setValue(data.approvedOn || '');
    // Color row based on status
    const color = data.status === 'APPROVED' ? '#d1fae5' : '#fee2e2';
    sheet.getRange(row, 1, 1, 14).setBackground(color);
  }
  return { success: true };
}

/* ============================================================
   SALARY / PAYROLL
============================================================ */
function handlePayroll(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.SALARY);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Month','E-Code','Employee Name','Department','Bank Account',
      'Gross CTC','Working Days','Present Days','Payable Days','Bonus Days',
      'Gross Earned','Advance Deduction','Loan EMI','LWP Deduction',
      'Total Deductions','Net Salary','Senior Tag','Bonus Tag','Calculated At'
    ]);
    formatHeaderRow(sheet);
  }

  // data can be array (bulk payroll) or single
  const records = Array.isArray(data) ? data : [data];
  records.forEach(r => {
    const existing = findRowByMultiple(sheet, [
      {col:2, val: r.month},
      {col:3, val: r.ecode}
    ]);
    const rowData = [
      r.id||'', r.month||'', r.ecode||'', r.empName||'', r.department||'',
      r.bankAcc||'', r.gross||0, r.workingDays||0, r.presentDays||0,
      r.payableDays||0, r.bonusDays||0, r.grossEarned||0,
      r.advanceDeduction||0, r.loanEMI||0, r.lwpDeduction||0,
      r.totalDeductions||0, r.netSalary||0,
      r.tagSenior?'YES':'NO', r.tagBonus?'YES':'NO',
      new Date().toLocaleString('en-IN')
    ];
    if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
  });

  colorAlternateRows(sheet);
  return { success: true, count: records.length };
}

/* ============================================================
   ADVANCE / LOAN
============================================================ */
function handleAdvance(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.ADVANCE);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Given On','E-Code','Employee Name','Department',
      'Type','Amount','EMI','Balance','Deduct Month',
      'EMI Start Month','Remark','Status'
    ]);
    formatHeaderRow(sheet);
  }

  const rowData = [
    data.id||'', data.givenOn||'', data.ecode||'', data.empName||'',
    data.department||'', data.type||'', data.amount||0, data.emi||0,
    data.balance||0, data.deductMonth||'', data.emiStartMonth||'',
    data.remark||'', data.status||'ACTIVE'
  ];

  const existing = findRowByValue(sheet, 1, data.id);
  if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);

  colorAlternateRows(sheet);
  return { success: true };
}

/* ============================================================
   STORE
============================================================ */
function handleStore(data, action) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.STORE);

  if(sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID','Date','Item Name','Category','Condition','Qty','Unit',
      'Rate','Total','Vendor','PO Number','PR Number','Bill Number',
      'Attachment','PO Status','Remark','Added At'
    ]);
    formatHeaderRow(sheet);
  }

  const rowData = [
    data.id||'', data.date||'', data.itemName||'', data.category||'',
    data.condition||'', data.qty||0, data.unit||'',
    data.rate||0, data.total||0, data.vendor||'',
    data.po||'', data.pr||'', data.bill||'',
    data.attachment?data.attachment.name:'',
    data.poStatus||'PENDING', data.remark||'',
    new Date().toLocaleString('en-IN')
  ];

  const existing = findRowByValue(sheet, 1, data.id);
  if(existing > 0) sheet.getRange(existing, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);

  colorAlternateRows(sheet);
  return { success: true };
}

function handleStoreUpdate(data) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, SHEETS.STORE);
  const row   = findRowByValue(sheet, 1, data.id);
  if(row > 0) {
    sheet.getRange(row, 11).setValue(data.po   || ''); // PO
    sheet.getRange(row, 12).setValue(data.pr   || ''); // PR
    sheet.getRange(row, 13).setValue(data.bill || ''); // Bill
    sheet.getRange(row, 15).setValue(data.po && data.pr ? 'COMPLETE' : 'PENDING');
    // Highlight green if complete
    if(data.po && data.pr) sheet.getRange(row, 1, 1, 17).setBackground('#d1fae5');
  }
  return { success: true };
}

/* ============================================================
   READ SHEET DATA
============================================================ */
function readSheet(sheetName, filter) {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if(!sheet) return { success: false, msg: 'Sheet not found: ' + sheetName };

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if(lastRow < 2) return { success: true, data: [], headers: [] };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows    = sheet.getRange(2, 1, lastRow-1, lastCol).getValues();

  const data = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== ''));

  return { success: true, data, headers };
}

/* ============================================================
   HELPER FUNCTIONS
============================================================ */
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if(!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function findRowByValue(sheet, col, value) {
  const lastRow = sheet.getLastRow();
  if(lastRow < 2) return -1;
  const data = sheet.getRange(2, col, lastRow-1, 1).getValues();
  for(let i = 0; i < data.length; i++) {
    if(data[i][0]?.toString() === value?.toString()) return i + 2;
  }
  return -1;
}

function findRowByMultiple(sheet, conditions) {
  const lastRow = sheet.getLastRow();
  if(lastRow < 2) return -1;
  const maxCol = Math.max(...conditions.map(c => c.col));
  const data   = sheet.getRange(2, 1, lastRow-1, maxCol).getValues();
  for(let i = 0; i < data.length; i++) {
    const match = conditions.every(c => data[i][c.col-1]?.toString() === c.val?.toString());
    if(match) return i + 2;
  }
  return -1;
}

function formatHeaderRow(sheet) {
  const lastCol = sheet.getLastColumn();
  if(lastCol === 0) return;
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground('#1a0533');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);
  // Auto-resize columns
  for(let i = 1; i <= lastCol; i++) sheet.autoResizeColumn(i);
}

function colorAlternateRows(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if(lastRow < 2 || lastCol === 0) return;
  for(let i = 2; i <= lastRow; i++) {
    const color = i % 2 === 0 ? '#f8f7ff' : '#ffffff';
    sheet.getRange(i, 1, 1, lastCol).setBackground(color);
  }
}

/* ============================================================
   INITIAL SETUP — Run this once manually
   Go to Apps Script → Run → setupSheets
============================================================ */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  // Create all sheets
  Object.values(SHEETS).forEach(name => {
    if(!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log('Created sheet: ' + name);
    }
  });

  // Remove default Sheet1 if exists
  const defaultSheet = ss.getSheetByName('Sheet1');
  if(defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  Logger.log('✅ All sheets created successfully!');
  Logger.log('Now run: Deploy → New Deployment → Web App');
}
