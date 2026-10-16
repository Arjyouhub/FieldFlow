import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Phone,
  Layers,
  FileText,
} from 'lucide-react';

export default function SuspiciousVisitsView({
  apiFetch,
  portfolios = [],
  staffList = [],
  onInspectPhoto,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [portfolioFilter, setPortfolioFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Review Dialog State
  const [activeReviewEvent, setActiveReviewEvent] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (portfolioFilter !== 'ALL') params.set('portfolioId', portfolioFilter);
      if (staffFilter !== 'ALL') params.set('staffId', staffFilter);
      if (statusFilter !== 'ALL') params.set('reviewStatus', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const data = await apiFetch(`/api/visits/suspicious?${params.toString()}`);
      setEvents(data.suspiciousEvents || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [portfolioFilter, staffFilter, statusFilter]);

  const handleExecuteReview = async (decision) => {
    if (!activeReviewEvent) return;
    setSubmittingReview(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`/api/visits/suspicious/${activeReviewEvent._id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          reviewStatus: decision,
          reviewNotes: reviewNotes || `Decision: ${decision}`,
        }),
      });
      setSuccessMsg(res.message || 'Suspicious visit review successfully recorded.');
      setActiveReviewEvent(null);
      setReviewNotes('');
      setReviewDecision('');
      loadEvents();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRM_MISMATCH':
        return <span className="badge badge-danger">Mismatch Confirmed</span>;
      case 'APPROVE_ALTERNATE':
        return <span className="badge badge-success">Alternate Approved</span>;
      case 'REQUEST_EVIDENCE':
        return <span className="badge badge-warning">More Evidence Requested</span>;
      case 'FALSE_ALERT':
        return <span className="badge badge-info">False Alert</span>;
      case 'PENDING_REVIEW':
      default:
        return <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>Pending Review</span>;
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ev.customerId?.name?.toLowerCase().includes(q) ||
      ev.customerId?.loanAccountNo?.toLowerCase().includes(q) ||
      ev.staffId?.name?.toLowerCase().includes(q) ||
      ev.reason?.toLowerCase().includes(q)
    );
  });

  const pendingCount = events.filter((e) => e.reviewStatus === 'PENDING_REVIEW').length;

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

      {/* Control & Filter Toolbar */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search customer, account, or staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <select
              className="input-field"
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="ALL">All Portfolios</option>
              {portfolios.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="ALL">All Field Staff</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="ALL">All Review Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CONFIRM_MISMATCH">Mismatch Confirmed</option>
              <option value="APPROVE_ALTERNATE">Alternate Approved</option>
              <option value="REQUEST_EVIDENCE">Evidence Requested</option>
              <option value="FALSE_ALERT">False Alert</option>
            </select>

            <button onClick={loadEvents} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <span className="badge badge-danger">
            {pendingCount} Awaiting Review
          </span>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>No Suspicious Geofence Events</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            All field visits in the queue comply with the 100-metre geofence tolerance.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredEvents.map((ev) => {
            const isPending = ev.reviewStatus === 'PENDING_REVIEW';
            const radius = ev.portfolioId?.defaultRadiusMetres || 100;
            const dist = Math.round(ev.distanceMetres || 0);

            return (
              <div
                key={ev._id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    isPending
                      ? '#f59e0b'
                      : ev.reviewStatus === 'CONFIRM_MISMATCH'
                      ? 'var(--danger)'
                      : 'var(--success)'
                  }`,
                  padding: '20px',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusBadge(ev.reviewStatus)}
                      <span className="badge badge-info">{ev.portfolioId?.name || 'General'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(ev.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px', color: 'var(--text-main)' }}>
                      {ev.customerId?.name || 'Customer'} (A/C: {ev.customerId?.loanAccountNo})
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Officer: <strong>{ev.staffId?.name}</strong> (+91 {ev.staffId?.phone}) • Territory: {ev.staffId?.assignedArea || 'Field'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', color: 'var(--danger-text)', fontWeight: '800' }}>
                      {dist} metres away
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Configured Geofence Radius: {radius}m
                    </div>
                  </div>
                </div>

                {/* GPS Comparison Matrix */}
                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Actual Staff GPS Reading</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                      {ev.actualCoordinates?.lat?.toFixed(5)}, {ev.actualCoordinates?.lng?.toFixed(5)}
                    </div>
                    {ev.actualCoordinates?.lat && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${ev.actualCoordinates.lat},${ev.actualCoordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', fontWeight: '600' }}
                      >
                        View Map <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Nearest Verified Location</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>
                      {ev.nearestLocationCoordinates?.lat ? `${ev.nearestLocationCoordinates.lat.toFixed(5)}, ${ev.nearestLocationCoordinates.lng.toFixed(5)}` : 'On Customer Record'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Tolerance: {radius}m | Measured: {dist}m
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>GPS Signal Accuracy</div>
                    <div style={{ fontWeight: '700', color: ev.accuracy <= 25 ? 'var(--success-text)' : 'var(--warning-text)' }}>
                      ±{Math.round(ev.accuracy || 10)} metres
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {ev.accuracy > 50 ? 'Weak GPS Signal (Review with caution)' : 'High Accuracy Reading'}
                    </div>
                  </div>
                </div>

                {/* Reason & Staff Notes */}
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12.5px', color: '#991b1b' }}>
                  <strong>Trigger Reason:</strong> {ev.reason || 'Staff submitted visit beyond 100 metres from nearest verified customer location.'}
                  {ev.visitId?.notes && (
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#7f1d1d' }}>
                      Staff Officer Notes: "{ev.visitId.notes}"
                    </div>
                  )}
                </div>

                {/* Photo Evidence */}
                {ev.visitId?.photoUrl && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onInspectPhoto && onInspectPhoto(ev.visitId.photoUrl)}
                      style={{ gap: '6px' }}
                    >
                      <Eye size={13} /> View Visit Evidence Photo
                    </button>
                  </div>
                )}

                {/* Review History if already reviewed */}
                {ev.reviewedBy && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: 'var(--bg-card-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                    <strong>Reviewed By:</strong> {ev.reviewedBy.name || 'Admin'} on {new Date(ev.reviewedAt).toLocaleString('en-IN')}
                    {ev.reviewNotes && <div><strong>Review Remarks:</strong> {ev.reviewNotes}</div>}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setActiveReviewEvent(ev);
                      setReviewDecision('CONFIRM_MISMATCH');
                      setReviewNotes('Location mismatch confirmed. Violation issued to staff officer.');
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Confirm Mismatch
                  </button>
                  <button
                    onClick={() => {
                      setActiveReviewEvent(ev);
                      setReviewDecision('APPROVE_ALTERNATE');
                      setReviewNotes('Approved legitimate alternate customer site (new verified location created).');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Approve Alternate Location
                  </button>
                  <button
                    onClick={() => {
                      setActiveReviewEvent(ev);
                      setReviewDecision('REQUEST_EVIDENCE');
                      setReviewNotes('Additional proof of customer presence required.');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Request More Evidence
                  </button>
                  <button
                    onClick={() => {
                      setActiveReviewEvent(ev);
                      setReviewDecision('FALSE_ALERT');
                      setReviewNotes('False alert verified due to GPS drift/dense urban conditions.');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Mark False Alert
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM REVIEW MODAL */}
      {activeReviewEvent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Review Decision</h3>
              <button onClick={() => setActiveReviewEvent(null)} className="modal-close-btn">✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Selected Action:</span>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary)' }}>
                  {reviewDecision}
                </div>
              </div>

              {reviewDecision === 'APPROVE_ALTERNATE' && (
                <div style={{ padding: '10px 12px', background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--success-text)', marginBottom: '14px' }}>
                  ✓ Approving this site will automatically add and verify these coordinates as an approved customer location for future visits.
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', marginBottom: '6px' }}>
                  Supervisor Review Notes / Rationale
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="State the technical or field operational reason for this determination..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setActiveReviewEvent(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleExecuteReview(reviewDecision)}
                  className="btn btn-primary"
                >
                  {submittingReview ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
