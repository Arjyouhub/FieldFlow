import * as XLSX from 'xlsx';

/**
 * Intelligent File Upload Auto-Detector for FieldFlow
 * Supports Excel (.xlsx, .xls) and CSV (.csv) files.
 * Handles:
 * 1. Sheet title offsets (auto-detects which row is the actual header row)
 * 2. Multi-bank / agency column synonyms & abbreviations
 * 3. Content-based value sniffing (detects phone numbers, amounts, addresses, names from actual row values)
 */

const cleanStr = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const HEADER_DICTIONARY = {
  loanAccountNo: {
    candidates: [
      'kbloanid', 'loanaccountno', 'loanaccount', 'accountno', 'accountnumber', 'acno', 'acctno',
      'loanid', 'caseid', 'account', 'lan', 'agreementno', 'agreement', 'contractno', 'contract',
      'prospectno', 'proposalno', 'appno', 'applicationno', 'dealid', 'custloanid', 'finacleacc',
      'loanacc', 'loanacct', 'loanno', 'accno', 'loan', 'id'
    ],
    excludes: ['loanamt', 'loanamount', 'amount', 'loandate', 'loantype', 'date', 'bankname']
  },
  name: {
    candidates: [
      'cxname', 'customername', 'borrowername', 'applicantname', 'partyname', 'clientname',
      'custname', 'accountholder', 'name', 'cx', 'borrower', 'customer', 'client', 'applicant', 'party'
    ],
    excludes: [
      'father', 'mother', 'spouse', 'tcname', 'officer', 'staff', 'agent', 'caller', 'fe',
      'fos', 'bank', 'branch', 'city', 'state'
    ]
  },
  phone: {
    candidates: [
      'phnno', 'phno', 'phnum', 'phoneno', 'mobileno', 'primarymobile', 'customermobile', 'cxmobile',
      'primaryphone', 'phone', 'mobile', 'contactno', 'contact', 'cellno', 'cell', 'telno', 'tel',
      'phn', 'mob', 'callingno', 'contact1', 'mob1', 'mobile1', 'phone1', 'ph'
    ],
    excludes: ['alternate', 'alt', 'secondary', 'residence', 'office', 'guarantor', 'ref', 'spouse', 'other']
  },
  altPhone: {
    candidates: [
      'altphone', 'altmobile', 'alternatemobile', 'alternatephone', 'secondphone', 'secondmobile',
      'otherphone', 'othermobile', 'residencephone', 'resphone', 'officephone', 'spousephone',
      'guarantorphone', 'refphone', 'alternate', 'altcontact', 'mob2', 'mobile2', 'phone2', 'contact2', 'alt'
    ],
    excludes: ['primaryphone', 'primarymobile']
  },
  address: {
    candidates: [
      'customeraddress', 'residentialaddress', 'communicationaddress', 'currentaddress',
      'permanentaddress', 'fulladdress', 'addressline1', 'addressline2', 'address', 'locationaddress',
      'housename', 'street', 'locality', 'addr', 'location', 'residence'
    ],
    excludes: ['email', 'ipaddress', 'macaddress']
  },
  area: {
    candidates: [
      'permanentcity', 'permanentpincode', 'residencecity', 'pincode', 'pin', 'postalcode',
      'city', 'area', 'locality', 'district', 'town', 'taluk', 'village', 'place', 'zone',
      'region', 'territory', 'branch'
    ],
    excludes: ['areacode', 'phone']
  },
  outstandingAmount: {
    candidates: [
      'tos', 'totaloutstanding', 'outstandingamount', 'outstandingbalance', 'principaloutstanding',
      'pos', 'totaldue', 'totalbalance', 'balanceamount', 'currentbalance', 'odamount', 'netdue',
      'grossdue', 'balance', 'outstanding', 'arrears', 'bompos', 'principal', 'loanamount', 'loanamt', 'amount'
    ],
    excludes: ['dueamount', 'emi', 'installment', 'currentdue', 'interest']
  },
  dueAmount: {
    candidates: [
      'emi', 'emiamount', 'dueamount', 'currentdue', 'overdueamount', 'overdueamt', 'overdue',
      'installment', 'installmentamount', 'instalment', 'demand', 'monthlydemand', 'pendingdue', 'mindue', 'due'
    ],
    excludes: ['duedate', 'emidate', 'lastpaid']
  },
  referenceNumber: {
    candidates: [
      'referenceno', 'referencenumber', 'reference', 'externalid', 'fileno', 'srno', 'slno',
      'ticketno', 'batchid', 'refid', 'ref'
    ],
    excludes: []
  },
  staff: {
    candidates: [
      'tcname', 'tc', 'staffname', 'staffid', 'staff', 'officername', 'fieldofficer', 'officer',
      'agentname', 'agent', 'executivename', 'executive', 'fename', 'fe', 'fosname', 'fos',
      'collector', 'caller', 'telecaller', 'assignedto', 'employee'
    ],
    excludes: []
  }
};

export const cleanPhoneNumber = (val) => {
  if (!val) return '';
  let s = String(val).trim();
  if (s.endsWith('.0')) s = s.slice(0, -2);
  let digits = s.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

/**
 * Checks if a sample value looks like a 10-digit Indian phone number
 */
const isLikelyPhone = (val) => {
  const digits = cleanPhoneNumber(val);
  return digits.length === 10 && /^[6-9]/.test(digits);
};

/**
 * Checks if a sample value looks like a monetary amount
 */
const isLikelyAmount = (val) => {
  if (val === undefined || val === null || val === '') return false;
  const s = String(val).trim();
  if (/^[6-9]\d{9}$/.test(s)) return false; // Don't mistake phone number for amount
  const cleaned = s.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return !isNaN(num) && num > 0 && num < 100000000;
};

/**
 * Checks if a sample value looks like an address
 */
const isLikelyAddress = (val) => {
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  if (s.length > 25 && s.includes(',')) return true;
  const addressKeywords = [
    'house', 'villa', 'road', 'street', 'near', 'post', 'po', 'opp', 'junction',
    'nagar', 'colony', 'bldg', 'flat', 'door', 'floor', 'dist', 'calicut', 'kozhikode',
    'kerala', 'koyilandy', 'vadakara', 'feroke', 'beypore', 'mavoor', 'kallai'
  ];
  return addressKeywords.some((kw) => s.includes(kw));
};

/**
 * Parse worksheet and auto-detect header row
 */
export function parseSpreadsheetWithAutoHeader(worksheet) {
  // Read first 15 rows as arrays to locate the header row
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Spreadsheet has no data.');
  }

  // Scan first 12 rows to find which row has the most header keywords
  let bestHeaderRowIndex = 0;
  let maxKeywordScore = -1;

  const headerTokens = [
    'name', 'cx', 'borrower', 'customer', 'party', 'client',
    'phone', 'mobile', 'contact', 'cell', 'ph',
    'loan', 'account', 'lan', 'agreement', 'kbloanid',
    'address', 'addr', 'city', 'area', 'pincode',
    'amount', 'outstanding', 'due', 'tos', 'pos', 'emi', 'balance',
    'staff', 'officer', 'tc', 'agent', 'executive'
  ];

  const rowsToScan = Math.min(rawRows.length, 12);
  for (let rIdx = 0; rIdx < rowsToScan; rIdx++) {
    const row = rawRows[rIdx];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    const nonEmptyCells = row.filter((c) => String(c).trim().length > 0);
    if (nonEmptyCells.length < 2) continue; // Skip title banners with only 1 string

    for (const cell of row) {
      const cStr = cleanStr(cell);
      if (headerTokens.some((tok) => cStr.includes(tok))) {
        score += 2;
      }
    }

    if (score > maxKeywordScore) {
      maxKeywordScore = score;
      bestHeaderRowIndex = rIdx;
    }
  }

  // Read entire sheet starting from the detected header row
  const dataRows = XLSX.utils.sheet_to_json(worksheet, {
    range: bestHeaderRowIndex,
    defval: '',
    raw: false,
  });

  // Filter out truly empty rows
  const nonEmptyDataRows = dataRows.filter((r) =>
    Object.values(r).some((v) => String(v).trim().length > 0)
  );

  return {
    headerRowIndex: bestHeaderRowIndex,
    rows: nonEmptyDataRows,
  };
}

/**
 * Comprehensive Column Auto-Detector
 */
export function autoDetectColumns(availableColumns = [], sampleRows = []) {
  const detected = {
    loanAccountNo: '',
    name: '',
    phone: '',
    altPhone: '',
    address: '',
    area: '',
    outstandingAmount: '',
    dueAmount: '',
    referenceNumber: '',
    staff: '',
  };

  const confidence = {};
  const usedColumns = new Set();

  const findKey = (fieldKey) => {
    const { candidates, excludes } = HEADER_DICTIONARY[fieldKey];

    // Pass 1: Exact clean match
    for (const col of availableColumns) {
      if (usedColumns.has(col)) continue;
      const cCol = cleanStr(col);
      if (excludes.some((ex) => cCol.includes(cleanStr(ex)))) continue;
      for (const cand of candidates) {
        if (cCol === cleanStr(cand)) {
          return { col, match: 'exact' };
        }
      }
    }

    // Pass 2: Starts with candidate
    for (const col of availableColumns) {
      if (usedColumns.has(col)) continue;
      const cCol = cleanStr(col);
      if (excludes.some((ex) => cCol.includes(cleanStr(ex)))) continue;
      for (const cand of candidates) {
        if (cCol.startsWith(cleanStr(cand))) {
          return { col, match: 'prefix' };
        }
      }
    }

    // Pass 3: Contains candidate as substring
    for (const col of availableColumns) {
      if (usedColumns.has(col)) continue;
      const cCol = cleanStr(col);
      if (excludes.some((ex) => cCol.includes(cleanStr(ex)))) continue;
      for (const cand of candidates) {
        const cCand = cleanStr(cand);
        if (cCol.includes(cCand) || (cCand.length >= 4 && cCand.includes(cCol))) {
          return { col, match: 'fuzzy' };
        }
      }
    }

    return null;
  };

  // Primary dictionary matching order (Phone, Name, Account, Amount first)
  const fieldsInOrder = [
    'phone',
    'altPhone',
    'name',
    'loanAccountNo',
    'outstandingAmount',
    'dueAmount',
    'address',
    'area',
    'staff',
    'referenceNumber',
  ];

  for (const field of fieldsInOrder) {
    const result = findKey(field);
    if (result) {
      detected[field] = result.col;
      usedColumns.add(result.col);
      confidence[field] = result.match === 'exact' ? 100 : result.match === 'prefix' ? 90 : 75;
    }
  }

  // Value-sniffing fallback for critical missing fields
  if (sampleRows.length > 0) {
    const samples = sampleRows.slice(0, 15);

    // 1. If phone is still missing, scan columns for 10-digit mobile numbers
    if (!detected.phone) {
      for (const col of availableColumns) {
        if (usedColumns.has(col)) continue;
        const validPhones = samples.filter((r) => isLikelyPhone(r[col])).length;
        if (validPhones >= Math.max(1, Math.floor(samples.length * 0.4))) {
          detected.phone = col;
          usedColumns.add(col);
          confidence.phone = 95;
          break;
        }
      }
    }

    // 2. If address is still missing, scan for address markers
    if (!detected.address) {
      for (const col of availableColumns) {
        if (usedColumns.has(col)) continue;
        const validAddresses = samples.filter((r) => isLikelyAddress(r[col])).length;
        if (validAddresses >= Math.max(1, Math.floor(samples.length * 0.3))) {
          detected.address = col;
          usedColumns.add(col);
          confidence.address = 85;
          break;
        }
      }
    }

    // 3. If outstanding amount is still missing, scan for numbers
    if (!detected.outstandingAmount) {
      for (const col of availableColumns) {
        if (usedColumns.has(col)) continue;
        const validAmounts = samples.filter((r) => isLikelyAmount(r[col])).length;
        if (validAmounts >= Math.max(1, Math.floor(samples.length * 0.5))) {
          detected.outstandingAmount = col;
          usedColumns.add(col);
          confidence.outstandingAmount = 80;
          break;
        }
      }
    }

    // 4. If name is still missing, scan for 2-3 word alphabetic strings
    if (!detected.name) {
      for (const col of availableColumns) {
        if (usedColumns.has(col)) continue;
        const validNames = samples.filter((r) => {
          const s = String(r[col] || '').trim();
          return /^[a-zA-Z\s.]{3,35}$/.test(s) && s.split(/\s+/).length >= 1;
        }).length;
        if (validNames >= Math.max(1, Math.floor(samples.length * 0.5))) {
          detected.name = col;
          usedColumns.add(col);
          confidence.name = 75;
          break;
        }
      }
    }
  }

  return { detectedMapping: detected, confidence };
}
