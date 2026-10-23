import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  Download,
  AlertTriangle,
  CreditCard,
  Clock,
  Phone,
  MapPin,
  Briefcase,
  Layers,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function CasesView({ apiFetch, staffList = [], portfolios = [], onOpenImport }) {
  const [cases, setCases] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [portfolioFilter, setPortfolioFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selection & Bulk Reassignment
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [bulkStaffId, setBulkStaffId] = useState('');
  const [bulkReason, setBulkReason] = useState('Operational area rebalancing');
  const [reassigning, setReassigning] = useState(false);

  // Single Case View / Reassign Modal
  const [activeCaseDetails, setActiveCaseDetails] = useState(null);
  const [singleReassignCase, setSingleReassignCase] = useState(null);
  const [singleStaffId, setSingleStaffId] = useState('');
  const [singleReason, setSingleReason] = useState('');
  // View mode: 'auto' (Mobile Cards / Laptop Page Model), 'cards', or 'table'
  const [viewMode, setViewMode] = useState('auto');

  const loadCases = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (portfolioFilter !== 'ALL') params.set('portfolioId', portfolioFilter);
      if (batchFilter !== 'ALL') params.set('batchMonth', batchFilter);
      if (staffFilter !== 'ALL') params.set('assignedStaff', staffFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('limit', '200');

      const data = await apiFetch(`/api/cases?${params.toString()}`);
      setCases(data.cases || []);
      setTotalCases(data.total || (data.cases ? data.cases.length : 0));
      setSelectedCaseIds([]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [portfolioFilter, batchFilter, staffFilter, statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCaseIds(cases.map((c) => c._id));
    } else {
      setSelectedCaseIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkReassign = async () => {
    if (!bulkStaffId) {
      setErrorMsg('Please select a target Field Staff member for reassignment.');
      return;
    }
    if (selectedCaseIds.length === 0) {
      setErrorMsg('No cases selected.');
      return;
    }
    setReassigning(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/cases/reassign', {
        method: 'POST',
        body: JSON.stringify({
          caseIds: selectedCaseIds,
          targetStaffId: bulkStaffId,
          reason: bulkReason || 'Bulk administrative reassignment',
        }),
      });
      setSuccessMsg(res.message || `Successfully reassigned ${selectedCaseIds.length} cases.`);
      setSelectedCaseIds([]);
      setBulkStaffId('');
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setReassigning(false);
    }
  };

  const handleSingleReassign = async (e) => {
    e.preventDefault();
    if (!singleStaffId) {
      setErrorMsg('Please select a target Field Staff member.');
      return;
    }
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/cases/reassign', {
        method: 'POST',
        body: JSON.stringify({
          caseIds: [singleReassignCase._id],
          targetStaffId: singleStaffId,
          reason: singleReason || 'Staff reassignment',
        }),
      });
      setSuccessMsg(res.message || 'Case successfully reassigned.');
      setSingleReassignCase(null);
      setSingleStaffId('');
      setSingleReason('');
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const exportFilteredCasesCSV = () => {
    if (!cases.length) {
      setErrorMsg('No cases to export.');
      return;
    }
    const headers = [
      'Case ID',
      'Loan Account',
      'Customer Name',
      'Phone',
      'Alternate Phone',
      'Address',
      'Area',
      'Portfolio',
      'Monthly Batch',
      'Outstanding Amount',
      'Due Amount',
      'Status',
      'Assigned Staff',
    ];
    const rows = cases.map((c) => [
      `"${c.caseId || c._id}"`,
      `"${c.loanAccountNo || ''}"`,
      `"${c.customerId?.name || ''}"`,
      `"${c.customerId?.phone || ''}"`,
      `"${c.customerId?.alternatePhone || ''}"`,
      `"${(c.customerId?.address || '').replace(/"/g, '""')}"`,
      `"${c.customerId?.area || ''}"`,
      `"${c.portfolioId?.name || ''}"`,
      `"${c.batchMonth || ''}"`,
      c.outstandingAmount || 0,
      c.dueAmount || 0,
      `"${c.status || 'assigned'}"`,
      `"${c.assignedStaff?.name || 'Unassigned'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldFlow_Cases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="badge badge-success">Paid</span>;
      case 'visited':
        return <span className="badge badge-info">Visited</span>;
      case 'ptp':
        return <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>PTP</span>;
      case 'broken_ptp':
        return <span className="badge badge-danger">Broken PTP</span>;
      case 'payment_submitted':
        return <span className="badge badge-warning">Payment Submitted</span>;
      case 'non_workable':
        return <span className="badge badge-danger">Non-Workable</span>;
      case 'suspicious_visit':
        return <span className="badge badge-danger">Suspicious</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      default:
        return <span className="badge badge-info">Assigned</span>;
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Alert Messages */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: '10px', color: 'var(--success-text)', fontSize: '13.5px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-text)' }}>✕</button>
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '10px', color: 'var(--danger-text)', fontSize: '13.5px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)' }}>✕</button>
        </div>
      )}

      {/* Compact Sleek Filter Toolbar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: 1 }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '180px', maxWidth: '260px', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input-sm"
                placeholder="Search account, name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCases()}
              />
            </div>

            {/* Portfolio Selector */}
            <select
              className="filter-select-sm"
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              style={{ minWidth: '125px' }}
              title="Filter by Portfolio"
            >
              <option value="ALL">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Monthly Batch Filter */}
            <select
              className="filter-select-sm"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              style={{ minWidth: '105px' }}
              title="Filter by Batch Month"
            >
              <option value="ALL">All Batches</option>
              <option value="OCT-2026">OCT-2026</option>
              <option value="NOV-2026">NOV-2026</option>
              <option value="DEC-2026">DEC-2026</option>
            </select>

            {/* Staff Filter */}
            <select
              className="filter-select-sm"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ minWidth: '125px' }}
              title="Filter by Staff"
            >
              <option value="ALL">All Staff</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="filter-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '115px' }}
              title="Filter by Case Status"
            >
              <option value="ALL">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="pending">Pending</option>
              <option value="visited">Visited</option>
              <option value="ptp">PTP</option>
              <option value="broken_ptp">Broken PTP</option>
              <option value="payment_submitted">Submitted</option>
              <option value="paid">Paid</option>
              <option value="non_workable">Non-Workable</option>
              <option value="suspicious_visit">Suspicious</option>
            </select>

            <button onClick={loadCases} className="btn btn-secondary btn-sm" style={{ width: '28px', padding: 0 }} title="Refresh List">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={exportFilteredCasesCSV} className="btn btn-secondary btn-sm" style={{ gap: '5px' }}>
              <Download size={13} /> Export CSV
            </button>
            {onOpenImport && (
              <button onClick={onOpenImport} className="btn btn-primary btn-sm" style={{ gap: '5px' }}>
                <Layers size={13} /> Bulk Import
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar when items selected */}
        {selectedCaseIds.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: '700', color: 'var(--primary-dark)', fontSize: '13px' }}>
              ✓ {selectedCaseIds.length} case(s) selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                className="input-field"
                value={bulkStaffId}
                onChange={(e) => setBulkStaffId(e.target.value)}
                style={{ background: '#fff', fontSize: '12.5px', minWidth: '180px' }}
              >
                <option value="">Choose Staff to Reassign...</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.assignedArea || 'Field'})
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="input-field"
                placeholder="Reason..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                style={{ background: '#fff', fontSize: '12.5px', width: '160px' }}
              />
              <button
                onClick={handleBulkReassign}
                disabled={reassigning}
                className="btn btn-primary btn-sm"
              >
                {reassigning ? 'Reassigning...' : 'Reassign Selected'}
              </button>
              <button
                onClick={() => setSelectedCaseIds([])}
                className="btn btn-secondary btn-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cases Table & Mobile Cards */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Field Collection Cases</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Showing {cases.length} of {totalCases} cases matching active filters
            </p>
          </div>
        </div>

        {/* View Mode A: Mobile Full-Data Cards */}
        {(viewMode === 'cards' || viewMode === 'auto') && (
          <div className={viewMode === 'auto' ? 'responsive-auto-cards' : ''} style={{ padding: '12px' }}>
            {cases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {loading ? 'Loading cases...' : 'No cases match the selected filters.'}
              </div>
            ) : (
              cases.map((c) => {
                const isSelected = selectedCaseIds.includes(c._id);
                return (
                  <div key={c._id} className={`case-mobile-card ${isSelected ? 'selected' : ''}`}>
                    {/* Header: Checkbox + Loan Account + Status */}
                    <div className="case-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c._id)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-main)' }}>
                            {c.loanAccountNo}
                          </div>
                          {c.referenceNumber && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {c.referenceNumber}</div>
                          )}
                        </div>
                      </div>
                      <div>{getStatusBadge(c.status)}</div>
                    </div>

                    {/* Body: Customer Name, Phone, Address */}
                    <div className="case-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-main)' }}>
                          {c.customerId?.name || 'Customer'}
                        </div>
                        {c.customerId?.phone && (
                          <a
                            href={`tel:${c.customerId.phone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', textDecoration: 'none' }}
                          >
                            <Phone size={12} /> {c.customerId.phone}
                          </a>
                        )}
                      </div>

                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} color="var(--text-muted)" />
                        <span>{c.customerId?.address || c.customerId?.area || 'Address not captured'}</span>
                      </div>

                      {/* Amounts Strip: Outstanding & Due */}
                      <div className="case-amounts-row">
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Outstanding</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                            ₹{(c.outstandingAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Due Amount</div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#b45309' }}>
                            ₹{(c.dueAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Portfolio + Staff + Action Buttons */}
                    <div className="case-card-footer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                          {c.portfolioId?.name || 'General'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.batchMonth}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          • {c.assignedStaff?.name || 'Unassigned'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setActiveCaseDetails(c)}
                          className="btn btn-secondary btn-xs"
                          title="View Case Details & History"
                        >
                          <Eye size={12} /> Details
                        </button>
                        <button
                          onClick={() => {
                            setSingleReassignCase(c);
                            setSingleStaffId(c.assignedStaff?._id || '');
                            setSingleReason('');
                          }}
                          className="btn btn-secondary btn-xs"
                          title="Reassign Staff"
                        >
                          <UserCheck size={12} /> Reassign
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View Mode B: Horizontal Spreadsheet Table (Laptop Page Model) */}
        {(viewMode === 'table' || viewMode === 'auto') && (
          <div className={`table-responsive ${viewMode === 'auto' ? 'responsive-auto-table' : ''}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={cases.length > 0 && selectedCaseIds.length === cases.length}
                      onChange={handleSelectAll}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </th>
                  <th>Loan Account / Case ID</th>
                  <th>Customer</th>
                  <th>Portfolio & Batch</th>
                  <th>Address & Area</th>
                  <th>Outstanding (₹)</th>
                  <th>Due (₹)</th>
                  <th>Status</th>
                  <th>Assigned Staff</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading cases...' : 'No cases match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const isSelected = selectedCaseIds.includes(c._id);
                    return (
                      <tr key={c._id} style={{ background: isSelected ? 'var(--primary-light)' : 'transparent' }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(c._id)}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-main)' }}>
                            {c.loanAccountNo}
                          </div>
                          {c.referenceNumber && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Ref: {c.referenceNumber}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {c.caseId}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>
                            {c.customerId?.name || 'Customer'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} /> {c.customerId?.phone || '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: '700' }}>
                            {c.portfolioId?.name || 'General'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {c.batchMonth}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }} title={c.customerId?.address}>
                            {c.customerId?.address || '—'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={10} /> {c.customerId?.area || c.customerId?.city || '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                            ₹{(c.outstandingAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            ₹{(c.dueAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>{getStatusBadge(c.status)}</td>
                        <td>
                          {c.assignedStaff ? (
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)' }}>
                                {c.assignedStaff.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {c.assignedStaff.assignedArea || 'Field'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--danger-text)', fontSize: '12px', fontWeight: '600' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setActiveCaseDetails(c)}
                              className="btn btn-secondary btn-xs"
                              title="View Case Details & History"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => {
                                setSingleReassignCase(c);
                                setSingleStaffId(c.assignedStaff?._id || '');
                                setSingleReason('');
                              }}
                              className="btn btn-secondary btn-xs"
                              title="Reassign Staff"
                            >
                              <UserCheck size={12} /> Reassign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CASE DETAILS MODAL */}
      {activeCaseDetails && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setActiveCaseDetails(null); }}>
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Case Details: {activeCaseDetails.loanAccountNo}</h3>
              <button onClick={() => setActiveCaseDetails(null)} className="modal-close-btn">✕</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Header Box */}
              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Portfolio</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary)' }}>
                    {activeCaseDetails.portfolioId?.name} ({activeCaseDetails.portfolioId?.code})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Batch: {activeCaseDetails.batchMonth}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current Status</div>
                  <div>{getStatusBadge(activeCaseDetails.status)}</div>
                </div>
              </div>

              {/* Financials & Customer Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div style={{ padding: '14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.04em' }}>Customer Information</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{activeCaseDetails.customerId?.name}</div>
                  <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px', fontWeight: '500' }}>Phone: {activeCaseDetails.customerId?.phone}</div>
                  {activeCaseDetails.customerId?.alternatePhone && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Alt: {activeCaseDetails.customerId.alternatePhone}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Address: {activeCaseDetails.customerId?.address}, {activeCaseDetails.customerId?.area}
                  </div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.04em' }}>Loan Recovery Details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Outstanding:</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>₹{(activeCaseDetails.outstandingAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Due Amount:</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>₹{(activeCaseDetails.dueAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>Assigned Staff:</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0891b2' }}>
                      {activeCaseDetails.assignedStaff?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignment History */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>
                  Case Assignment & Audit History
                </div>
                {activeCaseDetails.assignmentHistory && activeCaseDetails.assignmentHistory.length > 0 ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="data-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Assigned To</th>
                          <th>Assigned By</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCaseDetails.assignmentHistory.map((h, idx) => (
                          <tr key={idx}>
                            <td>{new Date(h.timestamp).toLocaleString('en-IN')}</td>
                            <td>{h.staffId?.name || 'Staff'}</td>
                            <td>{h.assignedBy?.name || 'Admin'}</td>
                            <td>{h.reason || 'Standard assignment'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px', background: 'var(--bg-card-subtle)', borderRadius: '6px' }}>
                    Initial allocation from batch import. No reassignments recorded yet.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setActiveCaseDetails(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE REASSIGN MODAL */}
      {singleReassignCase && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSingleReassignCase(null); }}>
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reassign Case: {singleReassignCase.loanAccountNo}</h3>
              <button onClick={() => setSingleReassignCase(null)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleSingleReassign} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Target Field Staff <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input-field"
                  value={singleStaffId}
                  onChange={(e) => setSingleStaffId(e.target.value)}
                  required
                >
                  <option value="">Select Staff...</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.assignedArea || 'Field Operations'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Reassignment Reason
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Area workload transfer, customer follow-up"
                  value={singleReason}
                  onChange={(e) => setSingleReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSingleReassignCase(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
