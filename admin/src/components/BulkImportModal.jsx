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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3: Execution & Outcome Report
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Quick portfolio create inside modal
  const [showQuickPortfolio, setShowQuickPortfolio] = useState(false);
  const [quickPortName, setQuickPortName] = useState('');
  const [quickPortCode, setQuickPortCode] = useState('');

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
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Identify mapped keys from first row headers
      const sample = rawRows[0];
      const keys = Object.keys(sample);

      const findKey = (candidates) =>
        keys.find((k) => candidates.some((cand) => clean(k).includes(clean(cand)))) || '';

      const colLoanAcc = findKey(['loanaccount', 'accountid', 'accountno', 'loanid', 'caseid', 'account']);
      const colName = findKey(['customername', 'borrowername', 'clientname', 'name']);
      const colPhone = findKey(['phone', 'mobile', 'primaryphone', 'contact']);
      const colAltPhone = findKey(['alternate', 'altphone', 'altmobile', 'secondphone']);
      const colAddress = findKey(['address', 'customeraddress', 'fulladdress', 'location']);
      const colArea = findKey(['area', 'city', 'locality', 'district', 'town']);
      const colOutstanding = findKey(['outstanding', 'totaldue', 'pos', 'balance', 'principal', 'amount']);
      const colDue = findKey(['dueamount', 'emi', 'currentdue', 'overdue', 'installment']);
      const colRef = findKey(['reference', 'referenceno', 'externalid']);
      const colStaff = findKey(['staff', 'officer', 'staffid', 'agent', 'employee']);

      setColumnMappingSummary({
        loanAccount: colLoanAcc || 'Auto-generated or Column Missing',
        name: colName || 'Required',
        phone: colPhone || 'Required',
        address: colAddress || 'Address',
        outstanding: colOutstanding || 'Outstanding Amount',
        staff: colStaff || 'Staff Member',
      });

      const processed = rawRows.map((r, idx) => {
        const loanAccountNo = String(r[colLoanAcc] || `ACC-${Date.now().toString().slice(-6)}-${idx + 1}`).trim();
        const customerName = String(r[colName] || '').trim();
        const phone = String(r[colPhone] || '').replace(/[^0-9]/g, '');
        const altPhone = colAltPhone ? String(r[colAltPhone] || '').replace(/[^0-9]/g, '') : '';
        const address = String(r[colAddress] || '').trim();
        const area = String(r[colArea] || 'Kozhikode Central').trim();
        const outstandingAmount = Number(r[colOutstanding] || 0) || 0;
        const dueAmount = Number(r[colDue] || outstandingAmount) || 0;
        const referenceNumber = colRef ? String(r[colRef] || '').trim() : '';

        // Staff resolution
        let assignedStaffId = defaultStaffId || '';
        if (colStaff && r[colStaff]) {
          const staffVal = String(r[colStaff]).toLowerCase().trim();
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
    } catch (err) {
      setPreviewError(`Failed to parse file: ${err.message}`);
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
      setPreviewError('No valid data rows to import.');
      return;
    }

    setIsImporting(true);
    setPreviewError('');

    try {
      // Map to API format expected by /api/cases/import-bulk
      const casesPayload = parsedRows.map((r) => ({
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
      if (onSuccess) onSuccess();
    } catch (err) {
      setPreviewError(err.message || 'Import operation failed.');
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
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
                    {columnMappingSummary && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Linked to: <strong>{targetPortfolio?.name || 'Selected Portfolio'}</strong>
                      </span>
                    )}
                  </div>

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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary">
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
