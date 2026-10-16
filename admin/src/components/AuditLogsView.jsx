import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';

export default function AuditLogsView({ apiFetch }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const loadAuditLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const url = actionFilter !== 'ALL'
        ? `/api/admin/audit-logs?action=${actionFilter}&limit=100`
        : '/api/admin/audit-logs?limit=100';
      const data = await apiFetch(url);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '10px', color: 'var(--danger-text)', fontSize: '13.5px', marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* Control Bar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="input-field"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '200px' }}
            >
              <option value="ALL">All Audit Actions</option>
              <option value="IMPORT_MONTHLY_CASES">IMPORT_MONTHLY_CASES</option>
              <option value="REASSIGN_CASES">REASSIGN_CASES</option>
              <option value="VERIFY_PAYMENT">VERIFY_PAYMENT</option>
              <option value="REVIEW_SUSPICIOUS_VISIT">REVIEW_SUSPICIOUS_VISIT</option>
              <option value="ADMIN_RECORD_STAFF_VISIT">ADMIN_RECORD_STAFF_VISIT</option>
              <option value="CREATE_PORTFOLIO">CREATE_PORTFOLIO</option>
              <option value="UPDATE_PORTFOLIO">UPDATE_PORTFOLIO</option>
            </select>
            <button onClick={loadAuditLogs} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <span className="badge badge-info">{total} Total Events Logged</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>System & Administrative Audit Trail</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Immutable record of sensitive operations, payment reviews, GPS decisions, and assignments.
          </p>
        </div>

        {/* Mobile Card Model (<= 768px) */}
        <div className="responsive-auto-cards" style={{ padding: '12px' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              {loading ? 'Loading audit records...' : 'No audit records logged yet.'}
            </div>
          ) : (
            logs.map((l) => (
              <div key={l._id} className="mobile-data-card">
                <div className="mobile-card-row">
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '700', color: 'var(--primary-dark)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px' }}>
                      {l.action}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(l.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Actor:</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{l.actorName}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span className="badge badge-info">{l.actorRole?.toUpperCase()}</span>
                    {l.entityType && <span className="badge">{l.entityType}</span>}
                  </div>
                </div>

                {l.details && (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-subtle, #f9fafb)', padding: '8px', borderRadius: '6px', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}>
                    {typeof l.details === 'object' ? JSON.stringify(l.details, null, 1) : String(l.details)}
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
                <th>Timestamp</th>
                <th>Actor Name</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading audit records...' : 'No audit records logged yet.'}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(l.createdAt).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{l.actorName}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{l.actorRole?.toUpperCase()}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                        {l.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{l.entityType}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '—')}
                      </div>
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
