import React, { useState, useEffect } from 'react';
import {
  UserX,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export default function NonWorkableView({ apiFetch, portfolios = [] }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadCases = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      params.set('status', 'non_workable');
      if (portfolioFilter !== 'ALL') params.set('portfolioId', portfolioFilter);
      if (search.trim()) params.set('search', search.trim());

      const data = await apiFetch(`/api/cases?${params.toString()}`);
      setCases(data.cases || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [portfolioFilter]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '10px', color: 'var(--danger-text)', fontSize: '13.5px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* Control Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search non-workable cases..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCases()}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <select
              className="input-field"
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="ALL">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button onClick={loadCases} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>Non-Workable Portfolio Cases</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Cases flagged as untraceable, door locked, wrong address, or customer refusal.
            </p>
          </div>
          <span className="badge badge-danger">{cases.length} Cases</span>
        </div>

        {/* Mobile Card Model (<= 768px) */}
        <div className="responsive-auto-cards" style={{ padding: '12px' }}>
          {cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading non-workable cases...' : 'No non-workable cases found.'}
            </div>
          ) : (
            cases.map((c) => (
              <div key={c._id} className="mobile-data-card">
                <div className="mobile-card-row">
                  <div>
                    <div className="mobile-card-title">{c.customerId?.name || 'Customer'}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      A/C: {c.loanAccountNo}
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-danger">Non-Workable</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '10px 0', padding: '8px 10px', background: 'var(--bg-subtle, #f9fafb)', borderRadius: '6px' }}>
                  <div>
                    <div className="mobile-card-label">Outstanding</div>
                    <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>
                      ₹{(c.outstandingAmount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="mobile-card-label">Portfolio</div>
                    <span className="badge badge-info" style={{ marginTop: '2px', display: 'inline-block' }}>
                      {c.portfolioId?.name || 'General'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '600' }}>Staff:</span>
                    <span>{c.assignedStaff?.name || 'Unassigned'}</span>
                  </div>
                  {c.customerId?.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontWeight: '600' }}>Address:</span>
                      <span style={{ flex: 1, wordBreak: 'break-word' }}>
                        {c.customerId?.address}
                        {(c.customerId?.area || c.customerId?.city) ? ` (${c.customerId?.area || c.customerId?.city})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {c.customerId?.phone && (
                  <div className="mobile-card-actions">
                    <a
                      href={`tel:${c.customerId.phone}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <Phone size={13} style={{ marginRight: '6px' }} /> Call {c.customerId.phone}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Laptop Page Model (> 768px) */}
        <div className="responsive-auto-table table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Loan Account</th>
                <th>Portfolio</th>
                <th>Phone</th>
                <th>Address & Area</th>
                <th>Outstanding (₹)</th>
                <th>Assigned Staff</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading non-workable cases...' : 'No non-workable cases found.'}
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                        {c.customerId?.name || 'Customer'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '12px' }}>
                        {c.loanAccountNo}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{c.portfolioId?.name || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} /> {c.customerId?.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.customerId?.address || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {c.customerId?.area || c.customerId?.city || ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                        ₹{(c.outstandingAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>
                        {c.assignedStaff?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-danger">Non-Workable</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
