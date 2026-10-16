import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Eye,
} from 'lucide-react';

export default function BatchesView({ apiFetch, portfolios = [], onSelectBatchForUpload }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('ALL');

  // New Batch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    portfolioId: '',
    batchMonth: 'NOV-2026',
    year: 2026,
    notes: '',
  });

  const loadBatches = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = portfolioFilter !== 'ALL'
        ? `/api/portfolios/batches?portfolioId=${portfolioFilter}`
        : '/api/portfolios/batches';
      const data = await apiFetch(url);
      setBatches(data.batches || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [portfolioFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.portfolioId) {
      setErrorMsg('Please select a target Portfolio.');
      return;
    }
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/portfolios/batches', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSuccessMsg(res.message || 'Monthly batch created successfully!');
      setShowCreateModal(false);
      setFormData({ portfolioId: '', batchMonth: 'NOV-2026', year: 2026, notes: '' });
      loadBatches();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
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

      {/* Control Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <select
              className="input-field"
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="ALL">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <button onClick={loadBatches} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <button
            onClick={() => {
              setFormData({ portfolioId: portfolios[0]?._id || '', batchMonth: 'NOV-2026', year: 2026, notes: '' });
              setShowCreateModal(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
          >
            <Plus size={15} /> Create Monthly Cases
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Monthly Cases & Cycles</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Manage cases organized by allocation month, preventing cross-cycle data collisions.
            </p>
          </div>
          <span className="badge badge-info">{batches.length} Monthly Cycles</span>
        </div>

        {/* Mobile Batch Card Model */}
        <div className="responsive-auto-cards" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading monthly cases...' : 'No monthly cases found.'}
            </div>
          ) : (
            batches.map((b) => (
              <div key={b._id} className="case-mobile-card">
                <div className="case-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '3px 8px', borderRadius: '4px' }}>
                      {b.batchMonth}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                      {b.portfolioId?.name || 'General Portfolio'}
                    </span>
                  </div>
                  <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-info'}`}>
                    {b.status}
                  </span>
                </div>

                {/* 2x2 Financial & Operational Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', margin: '10px 0' }}>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Accounts</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>{b.totalCases || 0}</div>
                  </div>
                  <div style={{ background: '#ECFDF5', padding: '8px 10px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                    <div style={{ fontSize: '10.5px', color: '#065F46', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
                      ₹{(b.totalOutstanding || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div style={{ background: '#EFF6FF', padding: '8px 10px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '10.5px', color: '#1E40AF', textTransform: 'uppercase', fontWeight: 700 }}>Visited Cases</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1D4ED8', marginTop: '2px' }}>{b.visitedCases || 0}</div>
                  </div>
                  <div style={{ background: '#F0FDF4', padding: '8px 10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontSize: '10.5px', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Verified Recovery</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#15803D', marginTop: '2px' }}>
                      ₹{(b.totalCollected || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                  <span>Created: {new Date(b.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>{b.notes ? `Note: ${b.notes}` : 'Active Portfolio Cycle'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Laptop Spreadsheet Table Model */}
        <div className="table-responsive responsive-auto-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch Month</th>
                <th>Portfolio</th>
                <th>Status</th>
                <th>Total Cases</th>
                <th>Total Outstanding (₹)</th>
                <th>Visited Cases</th>
                <th>Paid Cases</th>
                <th>Verified Recovery (₹)</th>
                <th>Created Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading monthly cases...' : 'No monthly cases found.'}
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '3px 8px', borderRadius: '4px' }}>
                        {b.batchMonth}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>
                        {b.portfolioId?.name || 'General'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.portfolioId?.code}</div>
                    </td>
                    <td>
                      <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-info'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{b.totalCases || 0}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600' }}>
                        ₹{(b.totalOutstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--info-text)', fontWeight: '600' }}>{b.visitedCases || 0}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--success-text)', fontWeight: '700' }}>{b.paidCases || 0}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--success-text)' }}>
                        ₹{(b.totalCollected || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.notes || '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BATCH MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Monthly Cases</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Target Portfolio <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input-field"
                  value={formData.portfolioId}
                  onChange={(e) => setFormData({ ...formData, portfolioId: e.target.value })}
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Batch Month Label <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. NOV-2026, DEC-2026"
                  value={formData.batchMonth}
                  onChange={(e) => setFormData({ ...formData, batchMonth: e.target.value.toUpperCase() })}
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
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Batch Notes (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. November 2026 Regular Flow"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
