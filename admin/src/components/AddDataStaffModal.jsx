import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  UserCheck,
  UploadCloud,
  Plus,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Briefcase,
  Layers,
  MapPin,
  Phone,
  User,
  CreditCard,
  Building,
} from 'lucide-react';
import { toast } from './ModernToast';
import { parseSpreadsheetWithAutoHeader, autoDetectColumns, cleanPhoneNumber } from '../utils/fileAutoDetector';

export default function AddDataStaffModal({
  isOpen,
  onClose,
  staff,
  portfolios = [],
  apiFetch,
  onSuccess,
  onOpenAdvancedImport,
}) {
  if (!isOpen || !staff) return null;

  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'file'
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ----------------------------------------------------
  // SINGLE CASE FORM STATE
  // ----------------------------------------------------
  const [singlePortfolioId, setSinglePortfolioId] = useState(
    portfolios[0]?._id || ''
  );
  const [singleBatchMonth, setSingleBatchMonth] = useState('OCT-2026');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [loanAccountNo, setLoanAccountNo] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(staff.assignedArea || 'Kozhikode Central');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // ----------------------------------------------------
  // FILE UPLOAD FORM STATE
  // ----------------------------------------------------
  const [filePortfolioId, setFilePortfolioId] = useState(
    portfolios[0]?._id || ''
  );
  const [fileBatchMonth, setFileBatchMonth] = useState('OCT-2026');
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [fileImportStats, setFileImportStats] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state on modal open
  const resetSingleForm = () => {
    setCustomerName('');
    setPhone('');
    setAlternatePhone('');
    setLoanAccountNo('');
    setReferenceNumber('');
    setAddress('');
    setArea(staff.assignedArea || 'Kozhikode Central');
    setOutstandingAmount('');
    setDueAmount('');
    setErrorMsg('');
  };

  // ----------------------------------------------------
  // HANDLE SINGLE CASE SUBMIT
  // ----------------------------------------------------
  const handleSingleCaseSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Borrower/Customer name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Customer primary phone number is required.');
      return;
    }

    setIsSubmittingSingle(true);
    try {
      const res = await apiFetch('/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          portfolioId: singlePortfolioId || (portfolios[0]?._id || undefined),
          batchMonth: singleBatchMonth,
          assignedStaff: staff._id,
          customerName: customerName.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim(),
          loanAccountNo: loanAccountNo.trim() || undefined,
          referenceNumber: referenceNumber.trim() || undefined,
          address: address.trim() || 'Address on file',
          area: area.trim(),
          city: 'Kozhikode',
          outstandingAmount: Number(outstandingAmount) || 0,
          dueAmount: Number(dueAmount || outstandingAmount) || 0,
        }),
      });

      setSuccessMsg(
        `✓ Case created successfully and assigned to ${staff.name}! It is now visible on their mobile app.`
      );
      toast.success(`Case created and assigned to ${staff.name}!`, 'Case Added Successfully');
      resetSingleForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create case');
      toast.error(err.message || 'Failed to create case', 'Failed to Add Case');
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // ----------------------------------------------------
  // HANDLE FILE SELECTION & PARSING
  // ----------------------------------------------------
  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsParsing(true);
    setErrorMsg('');
    setParsedRows([]);
    setFileImportStats(null);

    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setErrorMsg('Please upload an Excel (.xlsx, .xls) or CSV spreadsheet file.');
      setIsParsing(false);
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const { headerRowIndex, rows: nonEmptyRows } = parseSpreadsheetWithAutoHeader(worksheet);

      if (!nonEmptyRows || nonEmptyRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      const allKeys = Array.from(new Set(nonEmptyRows.flatMap((r) => Object.keys(r))));
      const { detectedMapping, confidence } = autoDetectColumns(allKeys, nonEmptyRows);

      const colLoanAcc = detectedMapping.loanAccountNo;
      const colName = detectedMapping.name;
      const colPhone = detectedMapping.phone;
      const colAltPhone = detectedMapping.altPhone;
      const colAddress = detectedMapping.address;
      const colArea = detectedMapping.area;
      const colOutstanding = detectedMapping.outstandingAmount;
      const colDue = detectedMapping.dueAmount;
      const colRef = detectedMapping.referenceNumber;

      const processed = nonEmptyRows.map((r, idx) => {
        const loanAcc = String(r[colLoanAcc] || `ACC-${Date.now().toString().slice(-6)}-${idx + 1}`).trim();
        const cName = String(r[colName] || '').trim();
        const ph = cleanPhoneNumber(r[colPhone]);
        const alt = colAltPhone ? cleanPhoneNumber(r[colAltPhone]) : '';
        const addr = String(r[colAddress] || '').trim();
        const ar = String(r[colArea] || staff.assignedArea || 'Kozhikode Central').trim();
        const out = Number(String(r[colOutstanding] || 0).replace(/[^0-9.-]/g, '')) || 0;
        const due = Number(String(r[colDue] || out).replace(/[^0-9.-]/g, '')) || 0;
        const ref = colRef ? String(r[colRef] || '').trim() : '';

        return {
          loanAccountNo: loanAcc,
          name: cName,
          phone: ph,
          alternatePhone: alt,
          address: addr || 'Address on file',
          area: ar,
          city: 'Kozhikode',
          outstandingAmount: out,
          dueAmount: due,
          referenceNumber: ref,
          assignedStaffId: staff._id, // DIRECTLY ASSIGNED TO THIS STAFF OFFICER
          isValid: Boolean(cName && ph && ph.length >= 10),
        };
      });

      setParsedRows(processed);
      const validC = processed.filter((r) => r.isValid).length;
      toast.success(
        `${validC} valid cases auto-detected and mapped for ${staff.name} (Header on row ${headerRowIndex + 1})`,
        'Auto-Detect Complete'
      );
      toast.success(`${validC} valid cases ready for ${staff.name}`, 'Spreadsheet Loaded');
    } catch (err) {
      setErrorMsg(`Failed to parse file: ${err.message}`);
      toast.error(err.message, 'File Parsing Error');
    } finally {
      setIsParsing(false);
    }
  };

  // ----------------------------------------------------
  // EXECUTE FILE IMPORT & ASSIGNMENT
  // ----------------------------------------------------
  const handleExecuteFileImport = async () => {
    if (!filePortfolioId) {
      setErrorMsg('Please select a Target Portfolio.');
      return;
    }
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found in file. Ensure rows have Name and 10-digit Phone.');
      return;
    }

    setIsImportingFile(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/cases/import-bulk', {
        method: 'POST',
        body: JSON.stringify({
          portfolioId: filePortfolioId,
          batchMonth: fileBatchMonth,
          defaultStaffId: staff._id, // DIRECTLY ASSIGNED TO THIS STAFF
          cases: validRows,
        }),
      });

      setFileImportStats(res.stats || res);
      const importedCount = res.stats?.successCount || validRows.length;
      setSuccessMsg(
        `✓ Successfully imported and assigned cases directly to ${staff.name}! (${importedCount} cases)`
      );
      toast.success(`Imported ${importedCount} cases directly to ${staff.name}!`, 'Data Import Complete');
      if (onSuccess) onSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'File import failed.');
      toast.error(err.message || 'File import failed.', 'Import Failed');
    } finally {
      setIsImportingFile(false);
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD SAMPLE TEMPLATE
  // ----------------------------------------------------
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Loan Account': 'LON-2026-901',
        'Customer Name': 'Anil Kumar',
        'Mobile Number': '9876543210',
        'Alternate Phone': '9876543211',
        'Address': 'Door 4B, Emerald Heights, Wayanad Road',
        'Area': staff.assignedArea || 'Kozhikode Central',
        'Outstanding Amount': 35000,
        'Due Amount': 4500,
        'Reference No': 'REF-1001',
      },
      {
        'Loan Account': 'LON-2026-902',
        'Customer Name': 'Sunita Menon',
        'Mobile Number': '9845123456',
        'Alternate Phone': '',
        'Address': 'House 12, Mavoor Bypass, Near Bus Stand',
        'Area': staff.assignedArea || 'Mavoor & Bypass',
        'Outstanding Amount': 18500,
        'Due Amount': 2800,
        'Reference No': 'REF-1002',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_Cases');
    XLSX.writeFile(wb, `FieldFlow_Cases_Template_${staff.name?.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 10000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                  Add Cases Data
                </h3>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  {staff.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Assigned Staff: <strong style={{ color: 'var(--text-main)' }}>{staff.name}</strong> ({staff.employeeId || 'STF-101'}) • Area: {staff.assignedArea || 'Kozhikode Central'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '10px 20px 0 20px',
            background: 'var(--bg-card-subtle)',
            borderBottom: '1px solid var(--border)',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('single');
              setErrorMsg('');
            }}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: activeTab === 'single' ? '700' : '600',
              border: 'none',
              borderBottom: activeTab === 'single' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              background: 'transparent',
              color: activeTab === 'single' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} /> Add Single Case (One Case)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              setErrorMsg('');
            }}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: activeTab === 'file' ? '700' : '600',
              border: 'none',
              borderBottom: activeTab === 'file' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              background: 'transparent',
              color: activeTab === 'file' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileSpreadsheet size={15} /> Upload Cases File (Excel / CSV)
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Messages */}
          {errorMsg && (
            <div
              style={{
                padding: '11px 14px',
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                borderRadius: '8px',
                color: 'var(--danger-text)',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 14px',
                background: '#ECFDF5',
                border: '1px solid #10B981',
                borderRadius: '8px',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: ADD SINGLE CASE FORM                              */}
          {/* ======================================================== */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleCaseSubmit}>
              <div
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--primary)',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  Cases added here will be <strong>directly assigned to {staff.name}</strong> and immediately synced to their mobile phone for field recovery.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Portfolio / Bank Partner <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={singlePortfolioId}
                    onChange={(e) => setSinglePortfolioId(e.target.value)}
                    required
                  >
                    {portfolios.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Batch Month Label
                  </label>
                  <select
                    className="input-field"
                    value={singleBatchMonth}
                    onChange={(e) => setSingleBatchMonth(e.target.value)}
                  >
                    <option value="OCT-2026">OCT-2026</option>
                    <option value="NOV-2026">NOV-2026</option>
                    <option value="DEC-2026">DEC-2026</option>
                    <option value="JAN-2027">JAN-2027</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Customer / Borrower Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Muhammed Rashid"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Primary Mobile Phone <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Alternate Mobile (Optional)
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="e.g. 9845012345"
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Loan Account Number / Case ID
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. LON-HDFC-9921 (auto-generated if blank)"
                    value={loanAccountNo}
                    onChange={(e) => setLoanAccountNo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                  Borrower Residence / Work Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Street address, building, landmarks for field visit..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Territory / Area
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Kozhikode Central"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Outstanding Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 25000"
                    value={outstandingAmount}
                    onChange={(e) => setOutstandingAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Current Due / EMI (₹)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 4500"
                    value={dueAmount}
                    onChange={(e) => setDueAmount(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingSingle}
                  style={{ gap: '6px', minWidth: '160px', justifyContent: 'center' }}
                >
                  {isSubmittingSingle ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving Case...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Create & Assign Case
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: BULK FILE UPLOAD FORM                             */}
          {/* ======================================================== */}
          {activeTab === 'file' && (
            <div>
              <div
                style={{
                  background: 'var(--primary-light)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: 'var(--primary)',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Spreadsheet cases will automatically be <strong>allocated to {staff.name}</strong> upon upload.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="btn btn-secondary btn-xs"
                  style={{ gap: '4px', whiteSpace: 'nowrap' }}
                >
                  <Download size={11} /> Sample File
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Target Portfolio <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    value={filePortfolioId}
                    onChange={(e) => setFilePortfolioId(e.target.value)}
                  >
                    {portfolios.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
                    Batch Month
                  </label>
                  <select
                    className="input-field"
                    value={fileBatchMonth}
                    onChange={(e) => setFileBatchMonth(e.target.value)}
                  >
                    <option value="OCT-2026">OCT-2026</option>
                    <option value="NOV-2026">NOV-2026</option>
                    <option value="DEC-2026">DEC-2026</option>
                    <option value="JAN-2027">JAN-2027</option>
                  </select>
                </div>
              </div>

              {/* Drag & Drop File Box */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--bg-card-subtle)',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                {file ? (
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {(file.size / 1024).toFixed(1)} KB • Click to choose a different spreadsheet
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
                      Click to browse or drop Excel / CSV here
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports .xlsx, .xls, and .csv files
                    </div>
                  </div>
                )}
              </div>

              {/* Parsing status / summary */}
              {isParsing && (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--primary)', fontSize: '13px' }}>
                  <RefreshCw size={16} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Analyzing spreadsheet columns and rows...
                </div>
              )}

              {parsedRows.length > 0 && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#166534', marginBottom: '4px' }}>
                    Spreadsheet Parsed: {parsedRows.length} total rows detected
                  </div>
                  <div style={{ color: '#15803D' }}>
                    • {parsedRows.filter((r) => r.isValid).length} ready for allocation to {staff.name}
                    {parsedRows.filter((r) => !r.isValid).length > 0 && (
                      <span style={{ color: 'var(--danger-text)', marginLeft: '6px' }}>
                        ({parsedRows.filter((r) => !r.isValid).length} rows missing required name or phone)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Outcome report if imported */}
              {fileImportStats && (
                <div
                  style={{
                    padding: '14px',
                    background: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontWeight: '700', color: '#065F46', marginBottom: '4px', fontSize: '13px' }}>
                    Import Results Summary:
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#047857' }}>
                    • {fileImportStats.successCount ?? fileImportStats.createdCases ?? 0} cases added & assigned to {staff.name}
                    <br />
                    • {fileImportStats.duplicateCount ?? fileImportStats.skippedDuplicates ?? 0} existing cases updated to {staff.name}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                {onOpenAdvancedImport ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      onClose();
                      onOpenAdvancedImport(staff._id);
                    }}
                    style={{ gap: '5px' }}
                  >
                    <Layers size={13} /> Open Advanced Importer
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isImportingFile || parsedRows.length === 0}
                    onClick={handleExecuteFileImport}
                    style={{ gap: '6px', minWidth: '180px', justifyContent: 'center' }}
                  >
                    {isImportingFile ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Uploading & Assigning...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} /> Upload & Assign Cases
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
