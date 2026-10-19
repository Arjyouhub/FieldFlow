import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  RefreshCw,
  FolderPlus,
  Trash2,
  Filter,
} from 'lucide-react';

export default function PortfoliosView({ apiFetch, onSelectPortfolioForUpload }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [deleteConfirmPortfolio, setDeleteConfirmPortfolio] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    defaultRadiusMetres: 100,
  });

  const loadPortfolios = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/portfolios');
      setPortfolios(data.portfolios || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setErrorMsg('Portfolio Name and Code are mandatory.');
      return;
    }
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccessMsg(res.message || 'Portfolio created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', code: '', defaultRadiusMetres: 100 });
      loadPortfolios();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPortfolio) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/portfolios/${editingPortfolio._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingPortfolio.name,
          defaultRadiusMetres: editingPortfolio.defaultRadiusMetres,
          isActive: editingPortfolio.isActive,
        }),
      });
      setSuccessMsg(res.message || 'Portfolio updated successfully!');
      setEditingPortfolio(null);
      loadPortfolios();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      await apiFetch(`/api/portfolios/${p._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      loadPortfolios();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!deleteConfirmPortfolio) return;
    setIsDeleting(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/portfolios/${deleteConfirmPortfolio._id}?force=true`, {
        method: 'DELETE',
      });
      setSuccessMsg(res.message || `Portfolio "${deleteConfirmPortfolio.name}" deleted successfully.`);
      setDeleteConfirmPortfolio(null);
      loadPortfolios();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPortfolios = portfolios.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.isActive) ||
      (statusFilter === 'INACTIVE' && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalCasesAll = portfolios.reduce((acc, p) => acc + (p.stats?.totalCases || 0), 0);
  const totalCollectionsAll = portfolios.reduce((acc, p) => acc + (p.stats?.verifiedCollectionsTotal || 0), 0);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Alert Banners */}
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

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Finance Portfolios</span>
            <div className="stat-card-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div className="stat-card-value">{portfolios.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {portfolios.filter((p) => p.isActive).length} Active | {portfolios.filter((p) => !p.isActive).length} Inactive
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Portfolio Cases</span>
            <div className="stat-card-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-card-value">{totalCasesAll}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across all lending partners
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Verified Collections</span>
            <div className="stat-card-icon" style={{ background: 'var(--success-light)', color: 'var(--success-text)' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="stat-card-value">₹{totalCollectionsAll.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Direct approved field recovery
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input-sm"
                placeholder="Search portfolios by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', height: '34px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({portfolios.length})</option>
              <option value="ACTIVE">Active ({portfolios.filter(p => p.isActive).length})</option>
              <option value="INACTIVE">Inactive ({portfolios.filter(p => !p.isActive).length})</option>
            </select>
            <button onClick={loadPortfolios} className="btn btn-secondary btn-sm" style={{ width: '34px', padding: 0 }} title="Refresh">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '5px' }}
            >
              <Plus size={14} /> Create Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Portfolios Table */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Configured Portfolios</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Each portfolio maintains independent customer cases and verification rules.</p>
          </div>
          <span className="badge badge-info">{filteredPortfolios.length} of {portfolios.length} Portfolios</span>
        </div>

        {/* Mobile Card Model (<= 768px) */}
        <div className="responsive-auto-cards" style={{ padding: '12px' }}>
          {filteredPortfolios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading portfolios...' : 'No portfolios match your filters.'}
            </div>
          ) : (
            filteredPortfolios.map((p) => {
              const s = p.stats || {};
              return (
                <div key={p._id} className="mobile-data-card">
                  <div className="mobile-card-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px' }}>
                        {p.name.substring(0, 1)}
                      </div>
                      <div>
                        <div className="mobile-card-title">{p.name}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', background: 'var(--bg-card-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.code}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {p.defaultRadiusMetres || 100}m radius
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleToggleActive(p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Click to toggle status"
                      >
                        <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', margin: '10px 0', padding: '10px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px' }}>
                    <div>
                      <div className="mobile-card-label">Total Cases</div>
                      <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{s.totalCases || 0}</div>
                    </div>
                    <div>
                      <div className="mobile-card-label">Visited</div>
                      <div style={{ fontWeight: '700', color: 'var(--info-text)', fontSize: '14px' }}>{s.visitedCases || 0}</div>
                    </div>
                    <div>
                      <div className="mobile-card-label">Paid Cases</div>
                      <div style={{ fontWeight: '700', color: 'var(--success-text)', fontSize: '14px' }}>{s.paidCases || 0}</div>
                    </div>
                    <div>
                      <div className="mobile-card-label">Collections (₹)</div>
                      <div style={{ fontWeight: '800', color: 'var(--success-text)', fontSize: '14px' }}>
                        ₹{(s.verifiedCollectionsTotal || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      onClick={() => setEditingPortfolio(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: '1 1 30%', justifyContent: 'center' }}
                    >
                      <Edit2 size={13} style={{ marginRight: '4px' }} /> Edit
                    </button>
                    {onSelectPortfolioForUpload && (
                      <button
                        onClick={() => onSelectPortfolioForUpload(p._id)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: '1 1 30%', justifyContent: 'center' }}
                      >
                        <FolderPlus size={13} style={{ marginRight: '4px' }} /> Import
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirmPortfolio(p)}
                      className="btn btn-danger btn-sm"
                      style={{ flex: '1 1 30%', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} style={{ marginRight: '4px' }} /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Laptop Page Model (> 768px) */}
        <div className="responsive-auto-table table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ minWidth: '1050px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }}>Portfolio</th>
                <th style={{ minWidth: '95px', whiteSpace: 'nowrap' }}>Code</th>
                <th style={{ minWidth: '90px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Geofence Radius</th>
                <th style={{ minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>Total Cases</th>
                <th style={{ minWidth: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>Visited</th>
                <th style={{ minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>Paid Cases</th>
                <th style={{ minWidth: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>PTP / Broken</th>
                <th style={{ minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>Suspicious</th>
                <th style={{ minWidth: '120px', textAlign: 'right', whiteSpace: 'nowrap' }}>Collections (₹)</th>
                <th style={{ minWidth: '180px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPortfolios.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading portfolios...' : 'No portfolios match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredPortfolios.map((p) => {
                  const s = p.stats || {};
                  return (
                    <tr key={p._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '30px', height: '30px', minWidth: '30px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>
                            {p.name.substring(0, 1)}
                          </div>
                          <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '700', background: 'var(--bg-card-subtle)', padding: '2px 8px', borderRadius: '4px' }}>
                          {p.code}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleToggleActive(p)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          title="Click to toggle status"
                        >
                          <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`} style={{ cursor: 'pointer' }}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                          {p.defaultRadiusMetres || 100}m
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{s.totalCases || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--info-text)', fontWeight: '600' }}>{s.visitedCases || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--success-text)', fontWeight: '700' }}>{s.paidCases || 0}</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px' }}>
                          <span style={{ color: '#0284c7', fontWeight: '600' }}>{s.ptpCases || 0}</span> /{' '}
                          <span style={{ color: 'var(--danger-text)', fontWeight: '600' }}>{s.brokenPtpCases || 0}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {s.suspiciousVisits > 0 ? (
                          <span className="badge badge-danger">{s.suspiciousVisits}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '700', color: 'var(--success-text)' }}>
                          ₹{(s.verifiedCollectionsTotal || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => setEditingPortfolio(p)}
                            className="btn btn-secondary btn-xs"
                            title="Edit Portfolio Settings"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          {onSelectPortfolioForUpload && (
                            <button
                              onClick={() => onSelectPortfolioForUpload(p._id)}
                              className="btn btn-primary btn-xs"
                              title="Bulk Import Excel into Portfolio"
                            >
                              <FolderPlus size={12} /> Import
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirmPortfolio(p)}
                            className="btn btn-danger btn-xs"
                            title="Delete Portfolio"
                          >
                            <Trash2 size={12} /> Delete
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
      </div>

      {/* CREATE PORTFOLIO MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Finance Portfolio</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Portfolio Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. KreditBee, Money Smart, SmartCoin"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Unique Portfolio Code <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. KBEE, MSMART, SCOIN"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Default Verification Radius (Metres)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={20}
                  max={1000}
                  value={formData.defaultRadiusMetres}
                  onChange={(e) => setFormData({ ...formData, defaultRadiusMetres: Number(e.target.value) })}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Standard threshold is 100 metres for field visit verification.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PORTFOLIO MODAL */}
      {editingPortfolio && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setEditingPortfolio(null); }}>
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Portfolio: {editingPortfolio.name}</h3>
              <button onClick={() => setEditingPortfolio(null)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Portfolio Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingPortfolio.name}
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Verification Radius (Metres)
                </label>
                <input
                  type="number"
                  className="input-field"
                  min={20}
                  max={1000}
                  value={editingPortfolio.defaultRadiusMetres || 100}
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, defaultRadiusMetres: Number(e.target.value) })}
                />
              </div>

              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingPortfolio.isActive}
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="editIsActive" style={{ fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Portfolio Active in System
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditingPortfolio(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmPortfolio && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) setDeleteConfirmPortfolio(null); }}>
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-text)' }}>
                <AlertTriangle size={18} />
                <h3 className="modal-title" style={{ color: 'var(--danger-text)' }}>Delete Portfolio</h3>
              </div>
              <button onClick={() => !isDeleting && setDeleteConfirmPortfolio(null)} className="modal-close-btn" disabled={isDeleting}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '12px', lineHeight: '1.5' }}>
                Are you sure you want to permanently delete <strong>{deleteConfirmPortfolio.name}</strong> ({deleteConfirmPortfolio.code})?
              </p>
              {deleteConfirmPortfolio.stats?.totalCases > 0 ? (
                <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '12.5px', marginBottom: '16px', lineHeight: '1.4' }}>
                  ⚠️ <strong>Warning:</strong> This portfolio currently contains <strong>{deleteConfirmPortfolio.stats.totalCases} cases</strong>. Deleting it will permanently remove the portfolio and its associated cases.
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: 'var(--bg-card-subtle)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '16px' }}>
                  This portfolio has 0 cases and will be cleanly removed.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPortfolio(null)}
                  className="btn btn-secondary"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePortfolio}
                  className="btn btn-danger"
                  disabled={isDeleting}
                  style={{ gap: '6px' }}
                >
                  {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Portfolio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
