import React from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  UserX,
  Users,
  Search,
  Grid,
  List,
  Eye,
  MapPin,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  Plus,
  Edit3,
  Phone,
  Mail,
  XCircle,
} from 'lucide-react';

export default function StaffApprovalsView({
  staffList = [],
  approvalsFilter = 'pending',
  setApprovalsFilter,
  approvalsSearch = '',
  setApprovalsSearch,
  approvalsViewMode = 'cards',
  setApprovalsViewMode,
  staffAreaOverrides = {},
  setStaffAreaOverrides,
  handleReviewStaff,
  handleUpdateStaffStatus,
  setSelectedPhoto,
  setSelectedStaffDetails,
  setEditingStaff,
  setStaffRejectionModal,
  loadData,
  loading = false,
  setShowCreateStaffModal,
  getPhotoUrl,
  brokenImages = {},
  setBrokenImages,
}) {
  const pendingStaff = staffList.filter((s) => s.status === 'pending_approval');
  const approvedStaff = staffList.filter((s) => s.status === 'active');
  const inactiveStaff = staffList.filter((s) => s.status !== 'pending_approval' && s.status !== 'active');

  // Filtered staff based on approvalsFilter & search
  const filteredStaff = staffList.filter((stf) => {
    if (approvalsFilter === 'pending' && stf.status !== 'pending_approval') return false;
    if (approvalsFilter === 'approved' && stf.status !== 'active') return false;
    if (approvalsFilter === 'rejected' && (stf.status === 'pending_approval' || stf.status === 'active')) return false;

    if (approvalsSearch.trim()) {
      const q = approvalsSearch.toLowerCase();
      const matchName = (stf.name || '').toLowerCase().includes(q);
      const matchPhone = (stf.phone || '').includes(q);
      const matchEmpId = (stf.employeeId || '').toLowerCase().includes(q);
      const matchArea = (stf.assignedArea || '').toLowerCase().includes(q);
      const matchEmail = (stf.email || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmpId || matchArea || matchEmail;
    }
    return true;
  });

  const resolvePhoto = (rawPhoto) => {
    if (!rawPhoto) return '';
    return getPhotoUrl ? getPhotoUrl(rawPhoto) : rawPhoto;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. PORTAL HEADER & KPI STRIP */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
        <div className="card-header-row" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                Field Staff Approval Portal
                {pendingStaff.length > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    {pendingStaff.length} Awaiting Verification
                  </span>
                )}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Verify staff verification selfies, GPS sign-up coordinates, assign operating territories, and approve mobile app credentials.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {loadData && (
              <button
                onClick={loadData}
                className="btn btn-secondary btn-sm"
                title="Refresh Staff Roster"
                style={{ gap: '6px' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Roster
              </button>
            )}
            {setShowCreateStaffModal && (
              <button
                onClick={() => setShowCreateStaffModal(true)}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px' }}
              >
                <Plus size={14} /> Add Staff Manually
              </button>
            )}
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))',
            gap: '12px',
            marginTop: '16px',
          }}
        >
          <div
            className="approval-kpi-card"
            style={{
              borderLeft: '4px solid #F59E0B',
              background: approvalsFilter === 'pending' ? '#FFFBEB' : 'var(--bg-card)',
              cursor: 'pointer',
            }}
            onClick={() => setApprovalsFilter('pending')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Pending Review
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', lineHeight: 1.2 }}>
                {pendingStaff.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Awaiting approval</div>
            </div>
          </div>

          <div
            className="approval-kpi-card"
            style={{
              borderLeft: '4px solid #10B981',
              background: approvalsFilter === 'approved' ? '#ECFDF5' : 'var(--bg-card)',
              cursor: 'pointer',
            }}
            onClick={() => setApprovalsFilter('approved')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Approved & Active
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669', lineHeight: 1.2 }}>
                {approvedStaff.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Authorized field staff</div>
            </div>
          </div>

          <div
            className="approval-kpi-card"
            style={{
              borderLeft: '4px solid #EF4444',
              background: approvalsFilter === 'rejected' ? '#FEF2F2' : 'var(--bg-card)',
              cursor: 'pointer',
            }}
            onClick={() => setApprovalsFilter('rejected')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserX size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Declined / Inactive
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', lineHeight: 1.2 }}>
                {inactiveStaff.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Access denied / suspended</div>
            </div>
          </div>

          <div
            className="approval-kpi-card"
            style={{
              borderLeft: '4px solid var(--primary)',
              background: approvalsFilter === 'all' ? 'var(--primary-light)' : 'var(--bg-card)',
              cursor: 'pointer',
            }}
            onClick={() => setApprovalsFilter('all')}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--bg-card-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Field Force
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {staffList.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All registered records</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & CONTROLS STRIP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          background: 'var(--bg-card)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: 'pending', label: 'Awaiting Approval', count: pendingStaff.length, color: 'badge-warning' },
            { key: 'approved', label: 'Approved & Active', count: approvedStaff.length, color: 'badge-success' },
            { key: 'rejected', label: 'Declined / Inactive', count: inactiveStaff.length, color: 'badge-danger' },
            { key: 'all', label: 'All Staff', count: staffList.length, color: 'badge-info' },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setApprovalsFilter(pill.key)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                border: approvalsFilter === pill.key ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: approvalsFilter === pill.key ? 'var(--primary-light)' : 'var(--bg-card)',
                color: approvalsFilter === pill.key ? 'var(--primary-dark)' : 'var(--text-secondary)',
                fontWeight: approvalsFilter === pill.key ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{pill.label}</span>
              <span className={`badge ${pill.color}`} style={{ fontSize: '11px', padding: '1px 6px' }}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, phone, STF ID, territory..."
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
              value={approvalsSearch}
              onChange={(e) => setApprovalsSearch(e.target.value)}
            />
            {approvalsSearch && (
              <button
                onClick={() => setApprovalsSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              onClick={() => setApprovalsViewMode('cards')}
              style={{
                padding: '8px 12px',
                background: approvalsViewMode === 'cards' ? 'var(--primary)' : 'var(--bg-card)',
                color: approvalsViewMode === 'cards' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
              title="Cards View"
            >
              <Grid size={15} /> Cards
            </button>
            <button
              onClick={() => setApprovalsViewMode('table')}
              style={{
                padding: '8px 12px',
                background: approvalsViewMode === 'table' ? 'var(--primary)' : 'var(--bg-card)',
                color: approvalsViewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
              title="Table View"
            >
              <List size={15} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: CARDS VIEW OR TABLE VIEW */}
      {filteredStaff.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            {approvalsFilter === 'pending'
              ? 'No Pending Staff Registrations'
              : 'No Staff Found'}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
            {approvalsFilter === 'pending'
              ? 'All field staff registration requests have been thoroughly reviewed and processed.'
              : 'No field staff records matched your search query or filter selection.'}
          </p>
          {approvalsFilter !== 'all' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setApprovalsFilter('all');
                setApprovalsSearch('');
              }}
            >
              View All Staff
            </button>
          )}
        </div>
      ) : approvalsViewMode === 'cards' ? (
        /* RESPONSIVE CARDS GRID */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '18px',
          }}
        >
          {filteredStaff.map((stf) => {
            const isPending = stf.status === 'pending_approval';
            const isActive = stf.status === 'active';
            const currentArea = staffAreaOverrides[stf._id] !== undefined ? staffAreaOverrides[stf._id] : (stf.assignedArea || 'Kozhikode Central');
            const rawPhoto = stf.profilePhoto || stf.selfiePhoto;
            const fullPhotoUrl = resolvePhoto(rawPhoto);
            const isBroken = (brokenImages && brokenImages[stf._id]) || !rawPhoto;

            return (
              <div
                key={stf._id}
                className="approval-staff-card"
                style={{
                  borderTop: isPending
                    ? '4px solid #F59E0B'
                    : isActive
                    ? '4px solid #10B981'
                    : '4px solid #EF4444',
                }}
              >
                {/* Top Row: Officer Avatar, Name, Status Badge */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    className="officer-selfie-container"
                    onClick={() => (!isBroken && fullPhotoUrl) ? setSelectedPhoto(fullPhotoUrl) : null}
                    title={!isBroken && fullPhotoUrl ? 'Click to inspect verification selfie' : ''}
                    style={{
                      cursor: (!isBroken && fullPhotoUrl) ? 'pointer' : 'default',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      width: '68px',
                      height: '68px',
                      flexShrink: 0,
                    }}
                  >
                    {!isBroken && fullPhotoUrl ? (
                      <img
                        src={fullPhotoUrl}
                        alt=""
                        className="officer-selfie-img"
                        onError={() => {
                          if (setBrokenImages) {
                            setBrokenImages((prev) => ({ ...prev, [stf._id]: true }));
                          }
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                          border: '2.5px solid #10B981',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
                        }}
                      >
                        <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>
                          {(stf.name || 'O').trim().charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {!isBroken && fullPhotoUrl && (
                      <span className="selfie-zoom-badge">
                        <Eye size={12} />
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stf.name}
                      </h4>
                      <span
                        className={`badge ${
                          isPending
                            ? 'badge-warning'
                            : isActive
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}
                        style={{ fontSize: '11px', textTransform: 'uppercase', flexShrink: 0 }}
                      >
                        {isPending ? 'Pending' : isActive ? 'Active' : 'Declined'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', background: 'var(--bg-card-subtle)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        {stf.employeeId || 'ID-TBD'}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Team: {stf.team || 'Field Operations'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <Phone size={13} color="var(--primary)" />
                      <a
                        href={`tel:${stf.phone}`}
                        style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        +91 {stf.phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email & Date Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', whiteSpace: 'nowrap' }}>
                      {stf.email || `${stf.phone}@fieldflow.local`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    <span>{stf.createdAt ? new Date(stf.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}</span>
                  </div>
                </div>

                {/* Territory Assignment Selector */}
                <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Operating Territory / Hub:
                  </label>
                  {isPending ? (
                    <div style={{ display: 'flex', width: '100%' }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ height: '36px', fontSize: '13px', padding: '6px 12px', width: '100%' }}
                        value={currentArea}
                        placeholder="e.g. Kozhikode Central, Palakkad"
                        onChange={(e) => {
                          if (setStaffAreaOverrides) {
                            setStaffAreaOverrides({
                              ...staffAreaOverrides,
                              [stf._id]: e.target.value,
                            });
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{stf.assignedArea || 'Kozhikode Central'}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned</span>
                    </div>
                  )}
                </div>

                {/* GPS Registration Location Info */}
                <div className="gps-info-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <MapPin size={13} color="var(--primary)" /> GPS Location at Registration
                    </span>
                    {stf.registrationLocation?.lat && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${stf.registrationLocation.lat},${stf.registrationLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700 }}
                      >
                        Google Maps <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {stf.registrationLocation?.lat ? (
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Coords: {stf.registrationLocation.lat.toFixed(5)}, {stf.registrationLocation.lng.toFixed(5)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>
                        {stf.registrationLocation.address || 'Address Tagged at Registration'}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Coordinates not recorded during registration
                    </span>
                  )}
                </div>

                {/* Rejection reason notice if inactive */}
                {!isPending && !isActive && stf.rejectionReason && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '12px', color: '#991B1B' }}>
                    <strong>Decline Reason:</strong> {stf.rejectionReason}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                      onClick={() => setSelectedStaffDetails && setSelectedStaffDetails(stf)}
                      title="Inspect verification selfie, location and staff details"
                    >
                      <Eye size={13} /> Check Details
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                      onClick={() => setEditingStaff && setEditingStaff(stf)}
                      title="Edit staff profile and operational territory"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>

                  {isPending ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ flex: '1 1 140px', justifyContent: 'center' }}
                        onClick={() => handleReviewStaff && handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                      >
                        <CheckCircle size={15} /> Approve & Activate
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)', justifyContent: 'center' }}
                        onClick={() => setStaffRejectionModal && setStaffRejectionModal({ staffId: stf._id, name: stf.name, phone: stf.phone })}
                      >
                        <XCircle size={15} /> Decline
                      </button>
                    </div>
                  ) : isActive ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ flex: 1, justifyContent: 'center', fontSize: '12px', color: 'var(--danger-text)' }}
                        onClick={() => handleUpdateStaffStatus && handleUpdateStaffStatus(stf._id, 'inactive')}
                      >
                        <UserX size={13} /> Deactivate Staff
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleReviewStaff && handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                      >
                        <CheckCircle size={15} /> Re-evaluate & Authorize
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* RESPONSIVE TABLE VIEW */
        <div className="card" style={{ padding: '0' }}>
          <div className="table-wrapper" style={{ margin: '0', border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Contact</th>
                  <th>Territory</th>
                  <th>Registration GPS</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((stf) => {
                  const isPending = stf.status === 'pending_approval';
                  const isActive = stf.status === 'active';
                  const currentArea = staffAreaOverrides[stf._id] !== undefined ? staffAreaOverrides[stf._id] : (stf.assignedArea || 'Kozhikode Central');
                  const rawPhoto = stf.selfiePhoto || stf.profilePhoto;
                  const fullPhotoUrl = resolvePhoto(rawPhoto);

                  return (
                    <tr key={stf._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: fullPhotoUrl ? 'pointer' : 'default' }}
                            onClick={() => fullPhotoUrl ? setSelectedPhoto(fullPhotoUrl) : null}
                          >
                            {fullPhotoUrl ? (
                              <img src={fullPhotoUrl} alt={stf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {(stf.name || 'O').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <strong style={{ fontSize: '13.5px' }}>{stf.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {stf.employeeId || 'ID-TBD'} • {stf.team || 'Field'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>+91 {stf.phone}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{stf.email || `${stf.phone}@fieldflow.local`}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-dark)' }}>
                          {stf.assignedArea || 'Kozhikode Central'}
                        </span>
                      </td>
                      <td>
                        {stf.registrationLocation?.lat ? (
                          <div style={{ fontSize: '11.5px' }}>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${stf.registrationLocation.lat},${stf.registrationLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <MapPin size={11} /> {stf.registrationLocation.lat.toFixed(4)}, {stf.registrationLocation.lng.toFixed(4)}
                            </a>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{stf.registrationLocation.address || 'Tagged'}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Not recorded</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {stf.createdAt ? new Date(stf.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isPending
                              ? 'badge-warning'
                              : isActive
                              ? 'badge-success'
                              : 'badge-danger'
                          }`}
                        >
                          {isPending ? 'Pending' : isActive ? 'Active' : 'Declined'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedStaffDetails && setSelectedStaffDetails(stf)}
                            title="Check Details & Verification"
                            style={{ gap: '4px' }}
                          >
                            <Eye size={12} /> Check Details
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingStaff && setEditingStaff(stf)}
                            title="Edit Staff Details"
                            style={{ gap: '4px' }}
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          {isPending ? (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleReviewStaff && handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                                title="Approve staff"
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ color: 'var(--danger-text)' }}
                                onClick={() => setStaffRejectionModal && setStaffRejectionModal({ staffId: stf._id, name: stf.name, phone: stf.phone })}
                                title="Decline registration"
                              >
                                <X size={12} /> Decline
                              </button>
                            </>
                          ) : isActive ? (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ color: 'var(--danger-text)', fontSize: '11.5px' }}
                              onClick={() => handleUpdateStaffStatus && handleUpdateStaffStatus(stf._id, 'inactive')}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleReviewStaff && handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                            >
                              Re-activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
