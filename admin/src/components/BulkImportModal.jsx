import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Layers,
  Calendar,
  UserCheck,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from './ModernToast';
import { parseSpreadsheetWithAutoHeader, autoDetectColumns, cleanPhoneNumber } from '../utils/fileAutoDetector';

export default function BulkImportModal({
  isOpen,
  onClose,
  apiFetch,
  portfolios = [],
  staffList = [],
  initialPortfolioId = '',
  initialStaffId = '',
  onSuccess,
}) {
  if (!isOpen) return null;

  // Step 1: Portfolio & Batch configuration
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    initialPortfolioId || (portfolios[0]?._id || '')
  );
  const [selectedBatchMonth, setSelectedBatchMonth] = useState('OCT-2026');
  const [newBatchName, setNewBatchName] = useState('');
  const [showNewBatchInput, setShowNewBatchInput] = useState(false);
  const [defaultStaffId, setDefaultStaffId] = useState(initialStaffId || '');

  useEffect(() => {
    if (initialStaffId) {
      setDefaultStaffId(initialStaffId);
    }
  }, [initialStaffId]);

  // Step 2: File & Parsing
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [previewError, setPreviewError] = useState('');
  const [columnMappingSummary, setColumnMappingSummary] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [rawSheetRows, setRawSheetRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
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
  });
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3: Execution & Outcome Report
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Quick portfolio create inside modal
  const [showQuickPortfolio, setShowQuickPortfolio] = useState(false);
  const [quickPortName, setQuickPortName] = useState('');
  const [quickPortCode, setQuickPortCode] = useState('');

  const cleanPhone = (val) => {
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

  const recomputeRows = (rows, mapping, staffId = defaultStaffId) => {
    const processed = rows.map((r, idx) => {
      const loanAccountNo = String(r[mapping.loanAccountNo] || `ACC-${Date.now().toString().slice(-6)}-${idx + 1}`).trim();
      const customerName = String(r[mapping.name] || '').trim();
      const phone = cleanPhone(r[mapping.phone]);
      const altPhone = mapping.altPhone ? cleanPhone(r[mapping.altPhone]) : '';
      const address = String(r[mapping.address] || '').trim();
      const area = String(r[mapping.area] || 'Kozhikode Central').trim();
      const outstandingAmount = Number(String(r[mapping.outstandingAmount] || 0).replace(/[^0-9.-]/g, '')) || 0;
      const dueAmount = Number(String(r[mapping.dueAmount] || outstandingAmount).replace(/[^0-9.-]/g, '')) || 0;
      const referenceNumber = mapping.referenceNumber ? String(r[mapping.referenceNumber] || '').trim() : '';

      // Staff resolution
      let assignedStaffId = staffId || '';
      if (mapping.staff && r[mapping.staff]) {
        const staffVal = String(r[mapping.staff]).toLowerCase().trim();
        const matched = staffList.find(
          (s) =>
            s.name?.toLowerCase().includes(staffVal) ||
            s.phone?.includes(staffVal) ||
            s.employeeId?.toLowerCase() === staffVal
        );
        if (matched) assignedStaffId = matched._id;
      }

      // Row validation error flags
      const errors = [];
      if (!customerName) errors.push('Missing Name');
      if (!phone || phone.length < 10) errors.push('Invalid Phone');
      if (!loanAccountNo) errors.push('Missing Account ID');

      return {
        rowNum: idx + 2,
        loanAccountNo,
        name: customerName,
        phone,
        alternatePhone: altPhone,
        address: address || 'Address on file',
        area,
        city: 'Kozhikode',
        outstandingAmount,
        dueAmount,
        referenceNumber,
        assignedStaffId,
        errors,
        isValid: errors.length === 0,
      };
    });

    setParsedRows(processed);
  };

  const handleMappingChange = (field, newCol) => {
    const nextMapping = { ...columnMapping, [field]: newCol };
    setColumnMapping(nextMapping);
    setColumnMappingSummary({
      loanAccount: nextMapping.loanAccountNo || 'Auto-generated or Missing',
      name: nextMapping.name || 'Required',
      phone: nextMapping.phone || 'Required',
      address: nextMapping.address || 'Address',
      outstanding: nextMapping.outstandingAmount || 'Outstanding Amount',
      staff: nextMapping.staff || 'Staff Member',
    });
    if (rawSheetRows.length > 0) {
      recomputeRows(rawSheetRows, nextMapping, defaultStaffId);
    }
  };

  const handleQuickCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!quickPortName.trim() || !quickPortCode.trim()) return;
    try {
      const res = await apiFetch('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify({
          name: quickPortName.trim(),
          code: quickPortCode.trim().toUpperCase(),
        }),
      });
      if (res.portfolio) {
        portfolios.push(res.portfolio);
        setSelectedPortfolioId(res.portfolio._id);
        setShowQuickPortfolio(false);
        setQuickPortName('');
        setQuickPortCode('');
      }
    } catch (err) {
      setPreviewError(err.message);
    }
  };

  const handleFile = async (uploadedFile) => {
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setIsParsing(true);
    setPreviewError('');
    setParsedRows([]);
    setImportResult(null);

    const name = uploadedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setPreviewError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) spreadsheet file.');
      setIsParsing(false);
      return;
    }

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Auto-detect header row even if row 1 is a title or empty banner
      const { headerRowIndex, rows: nonEmptyRows } = parseSpreadsheetWithAutoHeader(worksheet);

      if (!nonEmptyRows || nonEmptyRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      // Collect all column keys from the auto-detected header row
      const allKeys = Array.from(new Set(nonEmptyRows.flatMap((r) => Object.keys(r))));
      setAvailableColumns(allKeys);
      setRawSheetRows(nonEmptyRows);

      // Intelligent multi-bank dictionary + content value auto-detection
      const { detectedMapping, confidence } = autoDetectColumns(allKeys, nonEmptyRows);

      setColumnMapping(detectedMapping);
      setColumnMappingSummary({
        loanAccount: detectedMapping.loanAccountNo || 'Auto-generated or Column Missing',
        name: detectedMapping.name || 'Required',
        phone: detectedMapping.phone || 'Required',
        address: detectedMapping.address || 'Address',
        outstanding: detectedMapping.outstandingAmount || 'Outstanding Amount',
        staff: detectedMapping.staff || 'Staff Member',
      });

      recomputeRows(nonEmptyRows, detectedMapping, defaultStaffId);
      
      const matchedCount = Object.keys(confidence).length;
      toast.success(
        `${nonEmptyRows.length} rows loaded. ${matchedCount} columns auto-detected accurately (Header on row ${headerRowIndex + 1})`,
        'Auto-Detect Success'
      );
    } catch (err) {
      setPreviewError(`Failed to parse file: ${err.message}`);
      toast.error(err.message, 'File Parsing Error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedPortfolioId) {
      setPreviewError('Please select a target Portfolio.');
      return;
    }
    const batchMonth = showNewBatchInput && newBatchName.trim() ? newBatchName.trim().toUpperCase() : selectedBatchMonth;
    if (!batchMonth) {
      setPreviewError('Please select or specify a Monthly Batch month label (e.g. OCT-2026).');
      return;
    }
    if (parsedRows.length === 0) {
      setPreviewError('No data rows to import.');
      return;
    }

    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setPreviewError('No valid rows found to import. Please check that Customer Name and valid 10-digit Phone numbers are properly mapped.');
      return;
    }

    setIsImporting(true);
    setPreviewError('');

    try {
      // Map to API format expected by /api/cases/import-bulk (valid rows only)
      const casesPayload = validRows.map((r) => ({
        loanAccountNo: r.loanAccountNo,
        referenceNumber: r.referenceNumber,
        name: r.name,
        phone: r.phone,
        alternatePhone: r.alternatePhone,
        address: r.address,
        area: r.area,
        city: r.city,
        outstandingAmount: r.outstandingAmount,
        dueAmount: r.dueAmount,
        assignedStaffId: r.assignedStaffId || defaultStaffId || undefined,
      }));

      const res = await apiFetch('/api/cases/import-bulk', {
        method: 'POST',
        body: JSON.stringify({
          portfolioId: selectedPortfolioId,
          batchMonth,
          defaultStaffId: defaultStaffId || undefined,
          cases: casesPayload,
        }),
      });

      setImportResult(res);
      toast.success(res.message || `Successfully imported ${res.createdCases ?? validRows.length} customer cases!`, 'Bulk Import Succeeded');
      if (onSuccess) onSuccess();
    } catch (err) {
      setPreviewError(err.message || 'Import operation failed.');
      toast.error(err.message || 'Import operation failed.', 'Import Failed');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors?.length) return;
    const ws = XLSX.utils.json_to_sheet(importResult.errors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import_Errors');
    XLSX.writeFile(wb, `FieldFlow_Import_Errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const targetPortfolio = portfolios.find((p) => p._id === selectedPortfolioId);
  const validRowCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '780px', width: '95%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="modal-title">Bulk Import Field Cases (Excel / CSV)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Import portfolio customer loans with duplicate detection and staff assignment.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn"><X size={18} /></button>
        </div>

        <div style={{ padding: '20px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Error Banner */}
          {previewError && (
            <div style={{ padding: '12px 14px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{previewError}</span>
            </div>
          )}

          {/* SUCCESS / OUTCOME REPORT OVERLAY */}
          {importResult ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                Batch Import Completed
              </h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                {importResult.message}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created Cases</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--success-text)' }}>
                    {importResult.createdCases ?? 0}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duplicates Skipped</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7' }}>
                    {importResult.skippedDuplicates ?? 0}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Updated / Retried</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {importResult.updatedCases ?? 0}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Failed Rows</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: importResult.failedCount > 0 ? 'var(--danger-text)' : 'var(--text-muted)' }}>
                    {importResult.failedCount ?? 0}
                  </div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger-text)' }}>
                      Row Errors Encountered ({importResult.errors.length})
                    </span>
                    <button onClick={downloadErrorReport} className="btn btn-secondary btn-xs" style={{ gap: '4px' }}>
                      <Download size={12} /> Download Error Report (.xlsx)
                    </button>
                  </div>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', fontSize: '12px', background: 'var(--bg-card-subtle)' }}>
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <div key={i} style={{ color: 'var(--danger-text)', marginBottom: '3px' }}>
                        Row {err.row}: {err.loanAccountNo} — {err.reason}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        ...and {importResult.errors.length - 10} more errors.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button onClick={onClose} className="btn btn-primary" style={{ minWidth: '140px' }}>
                Done
              </button>
            </div>
          ) : (
            <div>
              {/* STEP 1: PORTFOLIO & BATCH SELECTION */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Step 1: Lending Partner & Monthly Allocation
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                  {/* Portfolio Dropdown */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '600' }}>
                        Target Portfolio <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowQuickPortfolio(!showQuickPortfolio)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                      >
                        + Create New
                      </button>
                    </div>
                    <select
                      className="input-field"
                      value={selectedPortfolioId}
                      onChange={(e) => setSelectedPortfolioId(e.target.value)}
                      required
                    >
                      <option value="">Select Portfolio...</option>
                      {portfolios.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Monthly Batch Dropdown */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: '600' }}>
                        Monthly Batch <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewBatchInput(!showNewBatchInput)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                      >
                        {showNewBatchInput ? 'Choose Existing' : '+ Custom Month'}
                      </button>
                    </div>
                    {showNewBatchInput ? (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. NOV-2026"
                        value={newBatchName}
                        onChange={(e) => setNewBatchName(e.target.value.toUpperCase())}
                      />
                    ) : (
                      <select
                        className="input-field"
                        value={selectedBatchMonth}
                        onChange={(e) => setSelectedBatchMonth(e.target.value)}
                      >
                        <option value="OCT-2026">OCT-2026</option>
                        <option value="NOV-2026">NOV-2026</option>
                        <option value="DEC-2026">DEC-2026</option>
                        <option value="JAN-2027">JAN-2027</option>
                      </select>
                    )}
                  </div>

                  {/* Default Staff Allocation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '4px' }}>
                      Default Staff (If unassigned in file)
                    </label>
                    <select
                      className="input-field"
                      value={defaultStaffId}
                      onChange={(e) => setDefaultStaffId(e.target.value)}
                    >
                      <option value="">Leave Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.assignedArea || 'Field'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Portfolio Creator Inline Form */}
                {showQuickPortfolio && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary)' }}>
                      Quick Add Portfolio
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Portfolio Name (e.g. KreditBee)"
                        value={quickPortName}
                        onChange={(e) => setQuickPortName(e.target.value)}
                        style={{ flex: 1, minWidth: '150px' }}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Code (e.g. KBEE)"
                        value={quickPortCode}
                        onChange={(e) => setQuickPortCode(e.target.value.toUpperCase())}
                        style={{ width: '100px' }}
                      />
                      <button type="button" onClick={handleQuickCreatePortfolio} className="btn btn-primary btn-sm">
                        Save
                      </button>
                      <button type="button" onClick={() => setShowQuickPortfolio(false)} className="btn btn-secondary btn-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: FILE UPLOAD ZONE */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Step 2: Upload Spreadsheet (.xlsx, .xls, .csv)
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragActive ? 'var(--primary-light)' : 'var(--bg-page)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <UploadCloud size={24} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
                    {file ? file.name : 'Click to select or drag and drop spreadsheet here'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Supports Excel (.xlsx, .xls) and CSV (.csv) files
                  </div>
                </div>
              </div>

              {/* STEP 3: PREVIEW & COLUMN MAPPING */}
              {isParsing && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div>Parsing spreadsheet columns and validating rows...</div>
                </div>
              )}

              {parsedRows.length > 0 && !isParsing && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                      Preview: {parsedRows.length} Rows Detected
                      <span className="badge badge-success" style={{ marginLeft: '8px' }}>
                        {validRowCount} Ready
                      </span>
                      {invalidRowCount > 0 && (
                        <span className="badge badge-danger" style={{ marginLeft: '6px' }}>
                          {invalidRowCount} Errors
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowMappingEditor(!showMappingEditor)}
                        style={{
                          background: showMappingEditor ? 'var(--primary-light)' : 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {showMappingEditor ? 'Hide Column Mapping' : '⚙ Adjust Column Mapping'}
                      </button>
                      {targetPortfolio && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Linked to: <strong>{targetPortfolio.name}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AUTO-DETECTED COLUMNS STATUS STRIP */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                      border: '1px solid #A7F3D0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={15} color="#059669" /> Auto-Detected Spreadsheet Columns:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMappingEditor(!showMappingEditor)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #A7F3D0',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#065F46',
                          cursor: 'pointer',
                        }}
                      >
                        {showMappingEditor ? 'Hide Column Adjuster' : '⚙ Adjust Column Match'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span className="badge" style={{ background: columnMapping.loanAccountNo ? '#D1FAE5' : '#FEE2E2', color: columnMapping.loanAccountNo ? '#065F46' : '#991B1B', border: '1px solid', borderColor: columnMapping.loanAccountNo ? '#6EE7B7' : '#FCA5A5' }}>
                        Loan ID: <strong>{columnMapping.loanAccountNo || 'Missing'}</strong>
                      </span>
                      <span className="badge" style={{ background: columnMapping.name ? '#D1FAE5' : '#FEE2E2', color: columnMapping.name ? '#065F46' : '#991B1B', border: '1px solid', borderColor: columnMapping.name ? '#6EE7B7' : '#FCA5A5' }}>
                        Name: <strong>{columnMapping.name || 'Missing'}</strong>
                      </span>
                      <span className="badge" style={{ background: columnMapping.phone ? '#D1FAE5' : '#FEE2E2', color: columnMapping.phone ? '#065F46' : '#991B1B', border: '1px solid', borderColor: columnMapping.phone ? '#6EE7B7' : '#FCA5A5' }}>
                        Phone: <strong>{columnMapping.phone || 'Missing'}</strong>
                      </span>
                      {columnMapping.altPhone && (
                        <span className="badge" style={{ background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                          Alt Phone: <strong>{columnMapping.altPhone}</strong>
                        </span>
                      )}
                      <span className="badge" style={{ background: columnMapping.address ? '#D1FAE5' : '#F3F4F6', color: columnMapping.address ? '#065F46' : '#6B7280', border: '1px solid #E5E7EB' }}>
                        Address: <strong>{columnMapping.address || 'Address on file'}</strong>
                      </span>
                      <span className="badge" style={{ background: columnMapping.outstandingAmount ? '#D1FAE5' : '#F3F4F6', color: columnMapping.outstandingAmount ? '#065F46' : '#6B7280', border: '1px solid #E5E7EB' }}>
                        Outstanding: <strong>{columnMapping.outstandingAmount || 'Not Mapped'}</strong>
                      </span>
                      {columnMapping.dueAmount && (
                        <span className="badge" style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' }}>
                          Due/EMI: <strong>{columnMapping.dueAmount}</strong>
                        </span>
                      )}
                      {columnMapping.area && (
                        <span className="badge" style={{ background: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
                          Territory: <strong>{columnMapping.area}</strong>
                        </span>
                      )}
                      {columnMapping.staff && (
                        <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                          Staff: <strong>{columnMapping.staff}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column Mapping Summary / Editor */}
                  {showMappingEditor && availableColumns.length > 0 && (
                    <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>
                        Spreadsheet Column Mappings (Verify or Change):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Customer Name *
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.name}
                            onChange={(e) => handleMappingChange('name', e.target.value)}
                          >
                            <option value="">-- Missing / Not Mapped --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Phone Number *
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.phone}
                            onChange={(e) => handleMappingChange('phone', e.target.value)}
                          >
                            <option value="">-- Missing / Not Mapped --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Account / Loan ID *
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.loanAccountNo}
                            onChange={(e) => handleMappingChange('loanAccountNo', e.target.value)}
                          >
                            <option value="">-- Auto-generate IDs --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Address
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.address}
                            onChange={(e) => handleMappingChange('address', e.target.value)}
                          >
                            <option value="">-- Not Mapped --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Outstanding (TOS / POS)
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.outstandingAmount}
                            onChange={(e) => handleMappingChange('outstandingAmount', e.target.value)}
                          >
                            <option value="">-- Not Mapped (0) --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                            Staff / TC Name
                          </label>
                          <select
                            className="input-field"
                            style={{ fontSize: '12px', padding: '4px 6px' }}
                            value={columnMapping.staff}
                            onChange={(e) => handleMappingChange('staff', e.target.value)}
                          >
                            <option value="">-- Use Default Staff --</option>
                            {availableColumns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Table (First 5 rows) */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '20px' }}>
                    <div className="table-responsive" style={{ maxHeight: '200px' }}>
                      <table className="data-table" style={{ fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Account No</th>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Address / Area</th>
                            <th>Outstanding</th>
                            <th>Assigned Staff</th>
                            <th>Validation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedRows.slice(0, 5).map((r, i) => (
                            <tr key={i} style={{ background: r.isValid ? 'transparent' : 'var(--danger-light)' }}>
                              <td>{r.rowNum}</td>
                              <td style={{ fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{r.loanAccountNo}</td>
                              <td style={{ fontWeight: '600' }}>{r.name}</td>
                              <td>{r.phone}</td>
                              <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.address}
                              </td>
                              <td>₹{r.outstandingAmount.toLocaleString('en-IN')}</td>
                              <td>
                                {r.assignedStaffId ? (
                                  staffList.find((s) => s._id === r.assignedStaffId)?.name || 'Mapped'
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>Default</span>
                                )}
                              </td>
                              <td>
                                {r.isValid ? (
                                  <span style={{ color: 'var(--success-text)', fontWeight: '700' }}>✓ Valid</span>
                                ) : (
                                  <span style={{ color: 'var(--danger-text)', fontWeight: '700' }}>
                                    {r.errors.join(', ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 5 && (
                      <div style={{ padding: '6px 12px', background: 'var(--bg-card-subtle)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        ...plus {parsedRows.length - 5} more records ready for import.
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: '0 1 auto' }}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isImporting || validRowCount === 0}
                      onClick={handleExecuteImport}
                      className="btn btn-primary"
                      style={{ gap: '6px' }}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Importing Cases...
                        </>
                      ) : (
                        `Confirm & Import ${validRowCount} Cases`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
