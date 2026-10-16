import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Calendar,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  Clock,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

export default function PortfoliosView({ apiFetch, onSelectPortfolioForUpload }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [batchModalPortfolio, setBatchModalPortfolio] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    defaultRadiusMetres: 100,
  });

  const [batchFormData, setBatchFormData] = useState({
    batchMonth: 'NOV-2026',
    year: 2026,
    notes: '',
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
      setFormData({ name: '', code: '', description: '', defaultRadiusMetres: 100 });
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
          description: editingPortfolio.description,
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

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchModalPortfolio) return;
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/portfolios/batches', {
        method: 'POST',
        body: JSON.stringify({
          portfolioId: batchModalPortfolio._id,
          batchMonth: batchFormData.batchMonth,
          year: batchFormData.year,
          notes: batchFormData.notes,
        }),
      });
      setSuccessMsg(res.message || `Monthly batch ${batchFormData.batchMonth} created!`);
      setBatchModalPortfolio(null);
      loadPortfolios();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const filteredPortfolios = portfolios.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input-sm"
                placeholder="Search portfolios by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Each portfolio maintains independent customer cases, monthly cycles, and verification rules.</p>
          </div>
          <span className="badge badge-info">{filteredPortfolios.length} Portfolios</span>
        </div>

        {/* Mobile Card Model (<= 768px) */}
        <div className="responsive-auto-cards" style={{ padding: '12px' }}>
          {filteredPortfolios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading portfolios...' : 'No portfolios found. Click "Create Portfolio" to add your first partner.'}
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

                  {p.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '8px 0' }}>
                      {p.description}
                    </div>
                  )}

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

                  <div className="mobile-card-actions">
                    <button
                      onClick={() => setEditingPortfolio(p)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Edit2 size={13} style={{ marginRight: '4px' }} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setBatchModalPortfolio(p);
                        setBatchFormData({ batchMonth: 'NOV-2026', year: 2026, notes: '' });
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <Calendar size={13} style={{ marginRight: '4px' }} /> Batch
                    </button>
                    {onSelectPortfolioForUpload && (
                      <button
                        onClick={() => onSelectPortfolioForUpload(p._id)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <FolderPlus size={13} style={{ marginRight: '4px' }} /> Import
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Laptop Page Model (> 768px) */}
        <div className="responsive-auto-table table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th>Code</th>
                <th>Status</th>
                <th>Geofence Radius</th>
                <th>Total Cases</th>
                <th>Visited</th>
                <th>Paid Cases</th>
                <th>PTP / Broken</th>
                <th>Suspicious</th>
                <th>Collections (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPortfolios.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading portfolios...' : 'No portfolios found. Click "Create Portfolio" to add your first partner.'}
                  </td>
                </tr>
              ) : (
                filteredPortfolios.map((p) => {
                  const s = p.stats || {};
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}>
                            {p.name.substring(0, 1)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13.5px' }}>{p.name}</div>
                            {p.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '700', background: 'var(--bg-card-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                          {p.code}
                        </span>
                      </td>
                      <td>
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
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.defaultRadiusMetres || 100}m
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{s.totalCases || 0}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--info-text)', fontWeight: '600' }}>{s.visitedCases || 0}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--success-text)', fontWeight: '700' }}>{s.paidCases || 0}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px' }}>
                          <span style={{ color: '#0284c7', fontWeight: '600' }}>{s.ptpCases || 0}</span> /{' '}
                          <span style={{ color: 'var(--danger-text)', fontWeight: '600' }}>{s.brokenPtpCases || 0}</span>
                        </span>
                      </td>
                      <td>
                        {s.suspiciousVisits > 0 ? (
                          <span className="badge badge-danger">{s.suspiciousVisits}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>0</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', color: 'var(--success-text)' }}>
                          ₹{(s.verifiedCollectionsTotal || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setEditingPortfolio(p)}
                            className="btn btn-secondary btn-xs"
                            title="Edit Portfolio Settings"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setBatchModalPortfolio(p);
                              setBatchFormData({ batchMonth: 'NOV-2026', year: 2026, notes: '' });
                            }}
                            className="btn btn-secondary btn-xs"
                            title="Add Monthly Batch"
                          >
                            <Calendar size={12} /> Batch
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
          <div className="modal-card" style={{ maxWidth: '480px' }}>
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Description (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Lending partner terms, region, or branch notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
          <div className="modal-card" style={{ maxWidth: '480px' }}>
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
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={editingPortfolio.description || ''}
                  onChange={(e) => setEditingPortfolio({ ...editingPortfolio, description: e.target.value })}
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

      {/* CREATE BATCH MODAL */}
      {batchModalPortfolio && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setBatchModalPortfolio(null); }}>
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">New Batch: {batchModalPortfolio.name}</h3>
              <button onClick={() => setBatchModalPortfolio(null)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreateBatch} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Batch Month Label <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. NOV-2026, DEC-2026"
                  value={batchFormData.batchMonth}
                  onChange={(e) => setBatchFormData({ ...batchFormData, batchMonth: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Year
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={batchFormData.year}
                  onChange={(e) => setBatchFormData({ ...batchFormData, year: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Q4 Priority Recovery Batch"
                  value={batchFormData.notes}
                  onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setBatchModalPortfolio(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Monthly Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
