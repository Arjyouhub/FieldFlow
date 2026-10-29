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
  Trash2,
  RotateCcw,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Check,
  FileText,
  Calendar,
  DollarSign,
  X,
  ChevronRight,
  Info,
  Map,
} from 'lucide-react';
import { toast } from './ModernToast';

export default function CasesView({ apiFetch, staffList = [], portfolios = [], onOpenImport }) {
  const [cases, setCases] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (successMsg) toast.success(successMsg);
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) toast.error(errorMsg);
  }, [errorMsg]);

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
  const [caseFullData, setCaseFullData] = useState({ visits: [], locations: [], calls: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'last_visit' | 'visits' | 'ptp' | 'locations' | 'audit'
  const [singleReassignCase, setSingleReassignCase] = useState(null);
  const [singleStaffId, setSingleStaffId] = useState('');
  const [singleReason, setSingleReason] = useState('');
  // View mode: 'auto' (Mobile Cards / Laptop Page Model), 'cards', or 'table'
  const [viewMode, setViewMode] = useState('auto');

  const handleOpenCaseDetails = async (caseItem) => {
    setActiveCaseDetails(caseItem);
    setDetailTab('overview');
    setLoadingDetails(true);
    setCaseFullData({ visits: [], locations: [], calls: [] });
    try {
      const data = await apiFetch(`/api/cases/${caseItem._id}`);
      if (data && data.success) {
        if (data.case) {
          setActiveCaseDetails(data.case);
        }
        setCaseFullData({
          visits: data.visits || [],
          locations: data.locations || [],
          calls: data.calls || [],
        });
      }
    } catch (err) {
      console.warn('Could not load rich case details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Delete / Trash & Recovery state
  const [isTrashView, setIsTrashView] = useState(false);
  const [deleteConfirmCase, setDeleteConfirmCase] = useState(null);
  const [caseDeleteReason, setCaseDeleteReason] = useState('Duplicate or invalid account');
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);

  const loadCases = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (isTrashView) {
        params.set('isDeleted', 'true');
      } else {
        params.set('isDeleted', 'false');
      }
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
  }, [portfolioFilter, batchFilter, staffFilter, statusFilter, isTrashView]);

  const handleDeleteCase = async () => {
    if (!deleteConfirmCase) return;
    setIsDeletingCase(true);
    try {
      const res = await apiFetch(`/api/cases/${deleteConfirmCase._id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: caseDeleteReason }),
      });
      setSuccessMsg(res.message || 'Case moved to Trash.');
      setDeleteConfirmCase(null);
      setCaseDeleteReason('Duplicate or invalid account');
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsDeletingCase(false);
    }
  };

  const handleRestoreCase = async (c) => {
    try {
      const res = await apiFetch(`/api/cases/${c._id}/restore`, {
        method: 'POST',
      });
      setSuccessMsg(res.message || 'Case restored successfully.');
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCaseIds.length) return;
    if (!window.confirm(`Move ${selectedCaseIds.length} selected case(s) to Trash?`)) return;
    setBulkDeleting(true);
    try {
      const res = await apiFetch('/api/cases/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ caseIds: selectedCaseIds, reason: bulkReason || 'Bulk deletion' }),
      });
      setSuccessMsg(res.message || 'Selected cases moved to Trash.');
      setSelectedCaseIds([]);
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkRestore = async () => {
    if (!selectedCaseIds.length) return;
    setBulkRestoring(true);
    try {
      const res = await apiFetch('/api/cases/bulk-restore', {
        method: 'POST',
        body: JSON.stringify({ caseIds: selectedCaseIds }),
      });
      setSuccessMsg(res.message || 'Selected cases restored successfully.');
      setSelectedCaseIds([]);
      loadCases();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBulkRestoring(false);
    }
  };

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

      {/* Sub-tab: Active Cases vs Deleted / Trash */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${!isTrashView ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setIsTrashView(false);
            setSelectedCaseIds([]);
          }}
          style={{ gap: '6px' }}
        >
          <Briefcase size={14} /> Active Cases
        </button>
        <button
          type="button"
          className={`btn btn-sm ${isTrashView ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setIsTrashView(true);
            setSelectedCaseIds([]);
          }}
          style={{
            gap: '6px',
            background: isTrashView ? 'var(--danger-text)' : undefined,
            borderColor: isTrashView ? 'var(--danger-text)' : undefined,
            color: isTrashView ? '#fff' : undefined,
          }}
        >
          <Trash2 size={14} /> Deleted / Trash Cases
        </button>
        {isTrashView && (
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginLeft: '6px' }}>
            ⚠️ Cases in Trash are removed from staff phones and active analytics. You can restore them anytime.
          </span>
        )}
      </div>

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
              background: isTrashView ? 'var(--danger-light)' : 'var(--primary-light)',
              border: `1px solid ${isTrashView ? 'var(--danger-border)' : 'var(--primary-border)'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: '700', color: isTrashView ? 'var(--danger-text)' : 'var(--primary-dark)', fontSize: '13px' }}>
              ✓ {selectedCaseIds.length} case(s) selected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isTrashView ? (
                <>
                  <button
                    onClick={handleBulkRestore}
                    disabled={bulkRestoring}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#16a34a', borderColor: '#16a34a', color: '#fff', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <RotateCcw size={13} style={{ flexShrink: 0 }} /> {bulkRestoring ? 'Restoring...' : 'Restore Selected Cases'}
                  </button>
                  <button
                    onClick={() => setSelectedCaseIds([])}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Clear
                  </button>
                </>
              ) : (
                <>
                  <select
                    className="input-field"
                    value={bulkStaffId}
                    onChange={(e) => setBulkStaffId(e.target.value)}
                    style={{ background: '#fff', fontSize: '12.5px', minWidth: '180px', flexShrink: 0 }}
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
                    style={{ background: '#fff', fontSize: '12.5px', width: '160px', flexShrink: 0 }}
                  />
                  <button
                    onClick={handleBulkReassign}
                    disabled={reassigning}
                    className="btn btn-primary btn-sm"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {reassigning ? 'Reassigning...' : 'Reassign Selected'}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="btn btn-danger btn-sm"
                    style={{ gap: '6px', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
                    title="Move selected cases to Trash"
                  >
                    <Trash2 size={13} style={{ flexShrink: 0 }} />
                    <span>{bulkDeleting ? 'Deleting...' : 'Move to Trash'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedCaseIds([])}
                    className="btn btn-secondary btn-sm"
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Clear
                  </button>
                </>
              )}
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

                      {/* Amounts Strip: POS, TOS, Due, DPD */}
                      <div className="case-amounts-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#0284c7', textTransform: 'uppercase', fontWeight: '800' }}>POS</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                            ₹{(c.pos || c.customerId?.pos || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#059669', textTransform: 'uppercase', fontWeight: '800' }}>TOS</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857' }}>
                            ₹{(c.tos || c.outstandingAmount || c.customerId?.tos || c.customerId?.outstandingAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#b45309', textTransform: 'uppercase', fontWeight: '800' }}>Due</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#b45309' }}>
                            ₹{(c.dueAmount || c.customerId?.emiAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>DPD</div>
                          <div>
                            <span style={{
                              display: 'inline-block',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              background: (c.dpd || c.customerId?.dpd || 0) > 90 ? '#fee2e2' : (c.dpd || c.customerId?.dpd || 0) > 30 ? '#fef3c7' : '#e0f2fe',
                              color: (c.dpd || c.customerId?.dpd || 0) > 90 ? '#991b1b' : (c.dpd || c.customerId?.dpd || 0) > 30 ? '#92400e' : '#0369a1',
                            }}>
                              {c.dpd || c.customerId?.dpd || 0} DPD
                            </span>
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
                        {isTrashView ? (
                          <button
                            onClick={() => handleRestoreCase(c)}
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', gap: '4px', fontSize: '11.5px', padding: '4px 10px' }}
                            title="Restore this case to active list"
                          >
                            <RotateCcw size={12} /> Restore Case
                          </button>
                        ) : (
                          <>
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
                            <button
                              onClick={() => {
                                setDeleteConfirmCase(c);
                                setCaseDeleteReason('Duplicate or invalid account');
                              }}
                              className="btn btn-secondary btn-xs"
                              title="Move Case to Trash"
                              style={{ color: 'var(--danger-text)' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )}
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
                  <th>Address & Location</th>
                  <th>POS (₹)</th>
                  <th>TOS (₹)</th>
                  <th>DPD</th>
                  <th>Due (₹)</th>
                  <th>Status</th>
                  <th>{isTrashView ? 'Deletion Info' : 'Assigned Staff'}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {loading ? 'Loading cases...' : isTrashView ? 'Trash is empty. No deleted cases found.' : 'No cases match the selected filters.'}
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
                        <td onClick={() => handleOpenCaseDetails(c)} style={{ cursor: 'pointer' }} title="Click to view Customer Details, Last Visit, PTP & Locations">
                          <div style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--primary)' }}>
                            {c.loanAccountNo}
                          </div>
                          {c.referenceNumber && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Ref: {c.referenceNumber}
                            </div>
                          )}
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {c.caseId}</div>
                        </td>
                        <td onClick={() => handleOpenCaseDetails(c)} style={{ cursor: 'pointer' }} title="Click to view Customer Details, Last Visit, PTP & Locations">
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>{c.customerId?.name || 'Customer'}</span>
                            <Eye size={12} color="var(--primary)" />
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
                          <div style={{ fontWeight: '700', color: '#0284c7', fontSize: '12.5px' }}>
                            ₹{(c.pos || c.customerId?.pos || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#047857', fontSize: '12.5px' }}>
                            ₹{(c.tos || c.outstandingAmount || c.customerId?.tos || c.customerId?.outstandingAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                            background: (c.dpd || c.customerId?.dpd || 0) > 90 ? '#fee2e2' : (c.dpd || c.customerId?.dpd || 0) > 30 ? '#fef3c7' : '#e0f2fe',
                            color: (c.dpd || c.customerId?.dpd || 0) > 90 ? '#991b1b' : (c.dpd || c.customerId?.dpd || 0) > 30 ? '#92400e' : '#0369a1',
                          }}>
                            {c.dpd || c.customerId?.dpd || 0} DPD
                          </span>
                        </td>
                        <td>
                          <div style={{ color: '#b45309', fontWeight: '600', fontSize: '12px' }}>
                            ₹{(c.dueAmount || c.customerId?.emiAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td>{getStatusBadge(c.status)}</td>
                        <td>
                          {isTrashView ? (
                            <div>
                              <div style={{ fontSize: '12px', color: 'var(--danger-text)', fontWeight: '600' }}>
                                {c.deleteReason || 'Moved to Trash'}
                              </div>
                              {c.deletedAt && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {new Date(c.deletedAt).toLocaleDateString('en-IN')}
                                </div>
                              )}
                            </div>
                          ) : c.assignedStaff ? (
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
                            {isTrashView ? (
                              <button
                                onClick={() => handleRestoreCase(c)}
                                className="btn btn-sm"
                                style={{ background: '#16a34a', color: '#fff', gap: '4px', fontSize: '11.5px', padding: '3px 8px' }}
                                title="Restore this case to active list"
                              >
                                <RotateCcw size={12} /> Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenCaseDetails(c)}
                                  className="btn btn-secondary btn-xs"
                                  title="View Customer Details, Last Visit, PTP & Locations"
                                  style={{ gap: '4px', color: 'var(--primary)', fontWeight: '600' }}
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
                                <button
                                  onClick={() => {
                                    setDeleteConfirmCase(c);
                                    setCaseDeleteReason('Duplicate or invalid account');
                                  }}
                                  className="btn btn-secondary btn-xs"
                                  title="Move to Trash"
                                  style={{ color: 'var(--danger-text)' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
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

      {/* RICH CUSTOMER & RECOVERY DETAILS MODAL */}
      {activeCaseDetails && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveCaseDetails(null);
          }}
          style={{ zIndex: 9999 }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '820px',
              width: '95%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff',
              }}
            >
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
                    flexShrink: 0,
                  }}
                >
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                      {activeCaseDetails.customerId?.name || 'Customer Details'}
                    </h3>
                    {getStatusBadge(activeCaseDetails.status)}
                    {caseFullData.visits?.length > 0 && (
                      <span className="badge badge-success" style={{ fontSize: '11px', gap: '4px' }}>
                        <CheckCircle size={11} /> {caseFullData.visits.length} Visit{caseFullData.visits.length > 1 ? 's' : ''} Logged
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>Loan A/C: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{activeCaseDetails.loanAccountNo}</strong></span>
                    {activeCaseDetails.referenceNumber && <span>• Ref: {activeCaseDetails.referenceNumber}</span>}
                    <span>• Portfolio: <strong style={{ color: 'var(--primary)' }}>{activeCaseDetails.portfolioId?.name || 'General'}</strong></span>
                    <span>• Batch: {activeCaseDetails.batchMonth}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loadingDetails && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--primary)' }}>
                    <RefreshCw size={13} className="animate-spin" /> Loading data...
                  </div>
                )}
                <button
                  onClick={() => setActiveCaseDetails(null)}
                  className="modal-close-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '6px',
                    borderRadius: '6px',
                  }}
                  title="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sticky Financial & Contact Quick Banner */}
            <div
              style={{
                padding: '10px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '12.5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>POS: </span>
                  <strong style={{ color: '#0284c7', fontSize: '13.5px' }}>
                    ₹{(activeCaseDetails.pos || activeCaseDetails.customerId?.pos || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>TOS: </span>
                  <strong style={{ color: '#047857', fontSize: '13.5px' }}>
                    ₹{(activeCaseDetails.tos || activeCaseDetails.outstandingAmount || activeCaseDetails.customerId?.tos || activeCaseDetails.customerId?.outstandingAmount || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>DPD: </span>
                  <strong style={{ color: (activeCaseDetails.dpd || activeCaseDetails.customerId?.dpd || 0) > 90 ? '#dc2626' : '#d97706', fontSize: '13.5px' }}>
                    {activeCaseDetails.dpd || activeCaseDetails.customerId?.dpd || 0} DPD
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Due Amount: </span>
                  <strong style={{ color: '#b45309', fontSize: '13.5px' }}>
                    ₹{(activeCaseDetails.dueAmount || activeCaseDetails.customerId?.emiAmount || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                {activeCaseDetails.customerId?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Phone: </span>
                    <a
                      href={`tel:${activeCaseDetails.customerId.phone}`}
                      style={{
                        color: 'var(--primary)',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Phone size={12} /> {activeCaseDetails.customerId.phone}
                    </a>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Staff: </span>
                  <strong style={{ color: activeCaseDetails.assignedStaff ? '#0284c7' : '#dc2626' }}>
                    {activeCaseDetails.assignedStaff?.name || 'Unassigned'}
                  </strong>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => {
                    setSingleReassignCase(activeCaseDetails);
                    setSingleStaffId(activeCaseDetails.assignedStaff?._id || '');
                    setSingleReason('');
                  }}
                  style={{ gap: '4px' }}
                >
                  <UserCheck size={12} /> Reassign Staff
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            {(() => {
              const lastVisit = caseFullData.visits && caseFullData.visits.length > 0 ? caseFullData.visits[0] : null;
              const ptpVisits = (caseFullData.visits || []).filter(
                (v) => (v.ptpAmount && v.ptpAmount > 0) || (v.outcome && (v.outcome.includes('PTP') || v.outcome.includes('Promise')))
              );
              const locationsCount = (caseFullData.locations || []).length;
              const visitsCount = (caseFullData.visits || []).length;

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      padding: '8px 20px 0',
                      borderBottom: '1px solid var(--border)',
                      background: '#ffffff',
                      overflowX: 'auto',
                    }}
                  >
                    {[
                      { id: 'overview', label: 'Overview & Profile', icon: Users },
                      {
                        id: 'last_visit',
                        label: 'Last Visit Report',
                        icon: ShieldCheck,
                        badge: lastVisit ? 'Available' : null,
                        badgeColor: 'success',
                      },
                      {
                        id: 'visits',
                        label: `Visit History (${visitsCount})`,
                        icon: Clock,
                      },
                      {
                        id: 'ptp',
                        label: `PTP Commitments (${ptpVisits.length})`,
                        icon: CreditCard,
                        badge: ptpVisits.length > 0 ? `${ptpVisits.length}` : null,
                        badgeColor: 'warning',
                      },
                      {
                        id: 'locations',
                        label: `GPS & Locations (${locationsCount})`,
                        icon: MapPin,
                      },
                      {
                        id: 'audit',
                        label: 'Assignment History',
                        icon: Briefcase,
                      },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = detailTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDetailTab(tab.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: isActive ? '700' : '500',
                            color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                            borderBottom: isActive ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Icon size={14} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                          <span>{tab.label}</span>
                          {tab.badge && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: tab.badgeColor === 'success' ? '#dcfce7' : '#fef3c7',
                                color: tab.badgeColor === 'success' ? '#15803d' : '#b45309',
                                fontWeight: '700',
                              }}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Modal Scrollable Content */}
                  <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                    {/* TAB 1: OVERVIEW */}
                    {detailTab === 'overview' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Last Visit Spotlight Banner */}
                        {lastVisit ? (
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #86efac',
                              borderRadius: '12px',
                              padding: '16px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '6px', color: '#16a34a' }}>
                                  <ShieldCheck size={18} />
                                </div>
                                <div>
                                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>Latest Field Visit Report</strong>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Conducted on {new Date(lastVisit.createdAt || lastVisit.serverTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className={`badge ${lastVisit.collectedAmount > 0 ? 'badge-success' : lastVisit.outcome?.includes('PTP') ? 'badge-warning' : 'badge-info'}`}>
                                  {lastVisit.outcome || 'Field Visit'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDetailTab('last_visit')}
                                  className="btn btn-secondary btn-xs"
                                  style={{ gap: '4px', fontSize: '11px', color: 'var(--primary)' }}
                                >
                                  View Full Report <ArrowRight size={11} />
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px', marginTop: '10px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div>
                                <span style={{ color: '#64748b' }}>Visited by: </span>
                                <strong>{lastVisit.staffName}</strong>
                              </div>
                              {lastVisit.collectedAmount > 0 && (
                                <div>
                                  <span style={{ color: '#64748b' }}>Collected: </span>
                                  <strong style={{ color: '#16a34a', fontSize: '13px' }}>₹{lastVisit.collectedAmount.toLocaleString('en-IN')}</strong> ({lastVisit.paymentMethod || 'Cash'})
                                </div>
                              )}
                              {lastVisit.ptpAmount > 0 && (
                                <div>
                                  <span style={{ color: '#64748b' }}>PTP Promised: </span>
                                  <strong style={{ color: '#d97706', fontSize: '13px' }}>₹{lastVisit.ptpAmount.toLocaleString('en-IN')}</strong> ({lastVisit.ptpDate ? new Date(lastVisit.ptpDate).toLocaleDateString('en-IN') : 'N/A'})
                                </div>
                              )}
                              <div>
                                <span style={{ color: '#64748b' }}>GPS Status: </span>
                                <strong style={{ color: lastVisit.verificationStatus === 'LOCATION_MATCHED' ? '#16a34a' : '#d97706' }}>
                                  {lastVisit.verificationStatus === 'LOCATION_MATCHED' ? '✓ Verified on-site' : lastVisit.verificationStatus || 'Tagged'}
                                </strong>
                              </div>
                            </div>

                            {lastVisit.notes && (
                              <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569', fontStyle: 'italic', background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                "{lastVisit.notes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Info size={18} color="var(--primary)" />
                              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                No field visits recorded for this customer yet. When field staff completes a visit, the report, GPS pin, and outcome will appear here.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Customer Profile & Financials Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                          {/* Customer Card */}
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Users size={14} color="var(--primary)" /> Customer Information
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                              {activeCaseDetails.customerId?.name || 'Customer'}
                            </div>

                            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Primary Phone:</span>
                                {activeCaseDetails.customerId?.phone ? (
                                  <a href={`tel:${activeCaseDetails.customerId.phone}`} style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={12} /> {activeCaseDetails.customerId.phone}
                                  </a>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                              {activeCaseDetails.customerId?.alternatePhone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>Alt Phone:</span>
                                  <a href={`tel:${activeCaseDetails.customerId.alternatePhone}`} style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                                    {activeCaseDetails.customerId.alternatePhone}
                                  </a>
                                </div>
                              )}
                              <div style={{ marginTop: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                                <div style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>Registered Address:</div>
                                <div style={{ color: '#1e293b', marginTop: '2px', lineHeight: '1.4' }}>
                                  {activeCaseDetails.customerId?.address || 'Address not captured'}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={11} /> {activeCaseDetails.customerId?.area || activeCaseDetails.customerId?.city || 'Territory area'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Loan Recovery Financials Card */}
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CreditCard size={14} color="var(--primary)" /> Loan Recovery Details
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                                <span style={{ color: '#065f46', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Outstanding Balance:</span>
                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#047857' }}>
                                  ₹{(activeCaseDetails.outstandingAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                <span style={{ color: '#92400e', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Due Amount:</span>
                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#b45309' }}>
                                  ₹{(activeCaseDetails.dueAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ color: '#64748b' }}>Portfolio:</span>
                                <strong style={{ color: '#0f172a' }}>{activeCaseDetails.portfolioId?.name} ({activeCaseDetails.portfolioId?.code})</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Batch Month:</span>
                                <strong style={{ color: '#0f172a' }}>{activeCaseDetails.batchMonth}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Recovery Status:</span>
                                <div>{getStatusBadge(activeCaseDetails.status)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Location Quick Strip */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '8px', color: '#0284c7' }}>
                              <MapPin size={20} />
                            </div>
                            <div>
                              <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                                {locationsCount > 0 ? `${locationsCount} Verified GPS Location(s) Registered` : 'Registered Address Location'}
                              </strong>
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                {activeCaseDetails.customerId?.address || activeCaseDetails.customerId?.area || 'Location captured'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setDetailTab('locations')}
                              className="btn btn-secondary btn-sm"
                              style={{ gap: '4px', fontSize: '11.5px' }}
                            >
                              <MapPin size={12} color="#0284c7" /> View All GPS Pins
                            </button>
                            {activeCaseDetails.customerId?.address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeCaseDetails.customerId.address + ', ' + (activeCaseDetails.customerId.area || ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ gap: '4px', fontSize: '11.5px' }}
                              >
                                <ExternalLink size={12} color="#0284c7" /> Search Maps
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: LAST VISIT REPORT */}
                    {detailTab === 'last_visit' && (
                      <div>
                        {lastVisit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Header card with Outcome & Date */}
                            <div style={{ background: '#ffffff', border: '1.5px solid #86efac', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    LATEST VISIT REPORT
                                  </div>
                                  <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`badge ${lastVisit.collectedAmount > 0 ? 'badge-success' : lastVisit.outcome?.includes('PTP') ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '13px', padding: '4px 10px' }}>
                                      {lastVisit.outcome || 'Field Visit'}
                                    </span>
                                  </h4>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>Date & Time</div>
                                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                                    {new Date(lastVisit.createdAt || lastVisit.serverTimestamp).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                                  </strong>
                                </div>
                              </div>

                              {/* Executive, Outcome & GPS status grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Visited By Field Executive</div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                    {lastVisit.staffName}
                                  </div>
                                  {lastVisit.staffPhone && (
                                    <a href={`tel:${lastVisit.staffPhone}`} style={{ fontSize: '12px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px', textDecoration: 'none', fontWeight: '600' }}>
                                      <Phone size={11} /> {lastVisit.staffPhone}
                                    </a>
                                  )}
                                  {lastVisit.staffEmployeeId && (
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                      Emp ID: {lastVisit.staffEmployeeId}
                                    </div>
                                  )}
                                </div>

                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Recovery / Financial Result</div>
                                  {lastVisit.collectedAmount > 0 ? (
                                    <div style={{ marginTop: '4px' }}>
                                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d' }}>
                                        ₹{lastVisit.collectedAmount.toLocaleString('en-IN')}
                                      </div>
                                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                        Method: <strong>{lastVisit.paymentMethod || 'Cash'}</strong> {lastVisit.paymentReference ? `• Ref: ${lastVisit.paymentReference}` : ''}
                                      </div>
                                    </div>
                                  ) : lastVisit.ptpAmount > 0 ? (
                                    <div style={{ marginTop: '4px' }}>
                                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#b45309' }}>
                                        ₹{lastVisit.ptpAmount.toLocaleString('en-IN')}
                                      </div>
                                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                        Promise Date: <strong>{lastVisit.ptpDate ? new Date(lastVisit.ptpDate).toLocaleDateString('en-IN') : 'N/A'}</strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#64748b' }}>
                                      No payment received ({lastVisit.outcome})
                                    </div>
                                  )}
                                </div>

                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ fontSize: '10.5px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>GPS Verification</div>
                                  <div style={{ marginTop: '4px' }}>
                                    <span className={`badge ${lastVisit.verificationStatus === 'LOCATION_MATCHED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11.5px' }}>
                                      {lastVisit.verificationStatus === 'LOCATION_MATCHED' ? '✓ Verified on-site' : lastVisit.verificationStatus || 'Tagged'}
                                    </span>
                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                                      Accuracy: ±{Math.round(lastVisit.accuracy || 0)}m
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* GPS Coordinates & Google Maps Actions */}
                              {lastVisit.coordinates?.lat && (
                                <div style={{ marginTop: '14px', padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <MapPin size={14} /> GPS Coordinates Captured:
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: '#1e293b', marginTop: '2px' }}>
                                      {lastVisit.coordinates.lat.toFixed(6)}, {lastVisit.coordinates.lng.toFixed(6)}
                                    </div>
                                    {lastVisit.locationAddress && (
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        {lastVisit.locationAddress}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${lastVisit.coordinates.lat},${lastVisit.coordinates.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{ gap: '5px', fontSize: '11.5px', background: '#fff' }}
                                    >
                                      <MapPin size={12} color="#0284c7" /> Open Google Maps
                                    </a>
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${lastVisit.coordinates.lat},${lastVisit.coordinates.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{ gap: '5px', fontSize: '11.5px', background: '#fff' }}
                                    >
                                      <Navigation size={12} color="#16a34a" /> Directions
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div style={{ marginTop: '14px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
                                  Staff Remarks & Feedback:
                                </div>
                                <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', lineHeight: '1.5' }}>
                                  {lastVisit.notes || 'No remarks entered by field executive.'}
                                </div>
                              </div>

                              {/* Photo if any */}
                              {lastVisit.photoUrl && (
                                <div style={{ marginTop: '14px' }}>
                                  <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                                    Captured Visit Photo:
                                  </div>
                                  <a href={lastVisit.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                    <img
                                      src={lastVisit.photoUrl}
                                      alt="Visit Proof"
                                      style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Info size={32} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>No Field Visits Recorded</h4>
                            <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '420px', margin: '6px auto 0' }}>
                              This customer case has not been visited yet. Once field executive completes an on-site visit and submits the report, all details will appear here.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: COMPLETE VISIT HISTORY */}
                    {detailTab === 'visits' && (
                      <div>
                        {caseFullData.visits?.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>No Visit History</h4>
                            <p style={{ fontSize: '12px', color: '#64748b' }}>No past visits or collection attempts have been logged for this customer.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {caseFullData.visits.map((v, idx) => (
                              <div
                                key={v._id || idx}
                                style={{
                                  background: '#ffffff',
                                  border: idx === 0 ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                  borderRadius: '10px',
                                  padding: '14px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`badge ${v.collectedAmount > 0 ? 'badge-success' : v.outcome?.includes('PTP') ? 'badge-warning' : 'badge-info'}`}>
                                      {v.outcome || 'Field Visit'}
                                    </span>
                                    {idx === 0 && <span className="badge badge-success" style={{ fontSize: '10px' }}>LATEST</span>}
                                    {v.collectedAmount > 0 && (
                                      <strong style={{ color: '#16a34a', fontSize: '13px' }}>
                                        ₹{v.collectedAmount.toLocaleString('en-IN')} ({v.paymentMethod || 'Cash'})
                                      </strong>
                                    )}
                                    {v.ptpAmount > 0 && (
                                      <strong style={{ color: '#b45309', fontSize: '13px' }}>
                                        PTP: ₹{v.ptpAmount.toLocaleString('en-IN')} ({v.ptpDate ? new Date(v.ptpDate).toLocaleDateString('en-IN') : 'N/A'})
                                      </strong>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    {new Date(v.createdAt || v.serverTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                </div>

                                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                  👤 <strong>Staff:</strong> {v.staffName}
                                  {v.coordinates?.lat && (
                                    <span style={{ marginLeft: '12px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                                      📍 {v.coordinates.lat.toFixed(5)}, {v.coordinates.lng.toFixed(5)} ({v.verificationStatus === 'LOCATION_MATCHED' ? 'Verified' : v.verificationStatus || 'Tagged'})
                                    </span>
                                  )}
                                </div>

                                {v.notes && (
                                  <div style={{ fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9', fontStyle: 'italic' }}>
                                    "{v.notes}"
                                  </div>
                                )}

                                {v.coordinates?.lat && (
                                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${v.coordinates.lat},${v.coordinates.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-xs"
                                      style={{ gap: '4px', fontSize: '11px' }}
                                    >
                                      <MapPin size={11} color="#0284c7" /> Open Maps
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: PTP COMMITMENTS */}
                    {detailTab === 'ptp' && (
                      <div>
                        {ptpVisits.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <CreditCard size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>No PTP Commitments</h4>
                            <p style={{ fontSize: '12px', color: '#64748b' }}>No Promise to Pay (PTP) commitments have been recorded for this customer yet.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* PTP Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '700', textTransform: 'uppercase' }}>Active / Latest PTP</div>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
                                  ₹{(ptpVisits[0]?.ptpAmount || 0).toLocaleString('en-IN')}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#78350f', marginTop: '2px' }}>
                                  Due: {ptpVisits[0]?.ptpDate ? new Date(ptpVisits[0].ptpDate).toLocaleDateString('en-IN') : 'N/A'}
                                </div>
                              </div>

                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Commitments Logged</div>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                                  {ptpVisits.length}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                  Recorded by field team
                                </div>
                              </div>
                            </div>

                            {/* Detailed List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {ptpVisits.map((v, idx) => (
                                <div key={v._id || idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span className="badge badge-warning" style={{ fontSize: '12px', fontWeight: '700' }}>
                                        Promise to Pay: ₹{(v.ptpAmount || 0).toLocaleString('en-IN')}
                                      </span>
                                      {idx === 0 && <span className="badge badge-info" style={{ fontSize: '10px' }}>LATEST</span>}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                                      Promised Date: {v.ptpDate ? new Date(v.ptpDate).toLocaleDateString('en-IN') : 'N/A'}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    👤 Logged by: <strong>{v.staffName}</strong> on {new Date(v.createdAt).toLocaleDateString('en-IN')}
                                  </div>

                                  {v.notes && (
                                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                      Remarks: "{v.notes}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 5: LOCATIONS & GPS */}
                    {detailTab === 'locations' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Section 1: Customer Registered Address */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={16} color="var(--primary)" /> Registered Customer Address
                            </strong>
                            {activeCaseDetails.customerId?.address && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeCaseDetails.customerId.address + ', ' + (activeCaseDetails.customerId.area || ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ gap: '4px', fontSize: '11px' }}
                              >
                                <ExternalLink size={12} color="#0284c7" /> Search Maps
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                            {activeCaseDetails.customerId?.address || 'No registered street address available'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Area: <strong>{activeCaseDetails.customerId?.area || '—'}</strong></span>
                            <span>•</span>
                            <span>City: <strong>{activeCaseDetails.customerId?.city || '—'}</strong></span>
                          </div>
                        </div>

                        {/* Section 2: Verified Device GPS Locations */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={16} color="#16a34a" /> Verified Device GPS Coordinates ({locationsCount})
                            </strong>
                          </div>

                          {locationsCount === 0 ? (
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>
                              No GPS coordinates saved by field devices yet. When an agent visits this customer and records on-site coordinates, they are permanently stored and verified here.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {caseFullData.locations.map((loc, idx) => (
                                <div
                                  key={loc._id || idx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{loc.label || 'Saved Location'}</strong>
                                      {loc.isDefault && <span className="badge badge-info" style={{ fontSize: '10px' }}>DEFAULT</span>}
                                      <span className="badge badge-success" style={{ fontSize: '10px' }}>{loc.status || 'VERIFIED'}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                      📍 {loc.coordinates?.lat?.toFixed(6)}, {loc.coordinates?.lng?.toFixed(6)} • Accuracy: ±{Math.round(loc.accuracy || 0)}m
                                    </div>
                                    {loc.remarks && (
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        {loc.remarks}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${loc.coordinates?.lat},${loc.coordinates?.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{ gap: '4px', fontSize: '11px' }}
                                    >
                                      <MapPin size={12} color="#0284c7" /> Open Maps
                                    </a>
                                    <a
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.coordinates?.lat},${loc.coordinates?.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      style={{ gap: '4px', fontSize: '11px' }}
                                    >
                                      <Navigation size={12} color="#16a34a" /> Directions
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 6: ASSIGNMENT HISTORY */}
                    {detailTab === 'audit' && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-main)' }}>
                          Case Assignment & Allocation Audit History
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
                                    <td><strong>{h.staffId?.name || 'Staff'}</strong></td>
                                    <td>{h.assignedBy?.name || 'Admin'}</td>
                                    <td>{h.reason || 'Standard assignment'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '8px', textAlign: 'center' }}>
                            Initial allocation from batch import. No reassignments recorded yet.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                FieldFlow Recovery System • Case #{activeCaseDetails.caseId || activeCaseDetails.loanAccountNo}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveCaseDetails(null)}
                >
                  Close Details
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmCase && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !isDeletingCase) setDeleteConfirmCase(null); }}>
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger-text)' }}>
                Move Case to Trash
              </h3>
              <button
                onClick={() => !isDeletingCase && setDeleteConfirmCase(null)}
                className="modal-close-btn"
                disabled={isDeletingCase}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13.5px', color: 'var(--text-main)', marginBottom: '10px' }}>
                Are you sure you want to move case <strong>{deleteConfirmCase.loanAccountNo}</strong> ({deleteConfirmCase.customerId?.name || 'Customer'}) to Trash?
              </p>
              <div style={{ padding: '10px 12px', background: 'var(--bg-card-subtle)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                ℹ️ This case will be removed from field staff mobile applications and daily operational metrics. You can restore it anytime from <strong>Deleted / Trash Cases</strong>.
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Reason for Deletion
                </label>
                <select
                  className="input-field"
                  value={caseDeleteReason}
                  onChange={(e) => setCaseDeleteReason(e.target.value)}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="Duplicate or invalid account">Duplicate or invalid account</option>
                  <option value="Customer loan closed / settled">Customer loan closed / settled</option>
                  <option value="Uploaded under wrong batch or portfolio">Uploaded under wrong batch or portfolio</option>
                  <option value="Legal dispute or hold">Legal dispute or hold</option>
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Other">Other reason</option>
                </select>
                {caseDeleteReason === 'Other' && (
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter specific reason..."
                    onChange={(e) => setCaseDeleteReason(e.target.value)}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCase(null)}
                  disabled={isDeletingCase}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCase}
                  disabled={isDeletingCase}
                  className="btn btn-danger"
                >
                  {isDeletingCase ? 'Moving to Trash...' : 'Yes, Move to Trash'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
