import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Smartphone,
  Monitor,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  Clock,
  Globe,
  LogOut,
  CheckCircle,
  XCircle,
  Power,
  Users,
  ShieldAlert,
} from 'lucide-react';

export default function LoginSessionsView({ apiFetch }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    mobileCount: 0,
    webCount: 0,
    revokedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'revoked'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'staff' | 'admin' | 'super_admin'

  // Modal / Confirm state for Revoking
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'single', // 'single' | 'all_user'
    sessionId: null,
    userId: null,
    userName: '',
    deviceType: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '150');

      const data = await apiFetch(`/api/admin/sessions?${params.toString()}`);
      if (data.success) {
        setSessions(data.sessions || []);
        setStats({
          activeCount: data.activeCount || 0,
          mobileCount: data.mobileCount || 0,
          webCount: data.webCount || 0,
          revokedCount: data.revokedCount || 0,
          totalCount: data.totalCount || (data.sessions || []).length,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load active login sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [statusFilter, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleConfirmRevoke = async () => {
    setActionLoading(true);
    setActionSuccessMsg('');
    try {
      if (confirmModal.type === 'single') {
        const res = await apiFetch(`/api/admin/sessions/${confirmModal.sessionId}/revoke`, {
          method: 'POST',
        });
        setActionSuccessMsg(res.message || 'Session successfully terminated.');
      } else if (confirmModal.type === 'all_user') {
        const res = await apiFetch(`/api/admin/sessions/user/${confirmModal.userId}/terminate-all`, {
          method: 'POST',
        });
        setActionSuccessMsg(res.message || 'All user sessions terminated.');
      }
      setConfirmModal({ isOpen: false, type: 'single', sessionId: null, userId: null, userName: '', deviceType: '' });
      await fetchSessions();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatExactDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="login-sessions-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #0D5D37 60%, #047857 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              flexShrink: 0,
            }}
          >
            <Shield size={28} color="#A7F3D0" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              Active Login Sessions
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', maxWidth: '600px' }}>
              Real-time monitoring of authenticated field staff and admin sessions. Review active devices and terminate unauthorized logins.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="btn"
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
          <span>{loading ? 'Refreshing...' : 'Refresh Sessions'}</span>
        </button>
      </div>

      {/* Action Success / Error Notifications */}
      {actionSuccessMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#059669" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg('')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
          }}
        >
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Active Sessions */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#E8F6ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #B4E3C9',
              color: '#0D5D37',
              flexShrink: 0,
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Sessions
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
                {stats.activeCount}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#10B981',
                  color: '#ffffff',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '12px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#ffffff',
                  }}
                />
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Mobile App Sessions */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #BFDBFE',
              color: '#2563EB',
              flexShrink: 0,
            }}
          >
            <Smartphone size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Mobile App Logins
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              {stats.mobileCount}
            </div>
          </div>
        </div>

        {/* Card 3: Admin Web Sessions */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#F5F3FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #DDD6FE',
              color: '#7C3AED',
              flexShrink: 0,
            }}
          >
            <Monitor size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Web Portal Logins
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              {stats.webCount}
            </div>
          </div>
        </div>

        {/* Card 4: Revoked Sessions */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #E2E8F0',
              color: '#64748B',
              flexShrink: 0,
            }}
          >
            <LogOut size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Revoked / Inactive
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginTop: '2px' }}>
              {stats.revokedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder="Search by name, phone, employee ID, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', height: '38px', borderRadius: '8px', fontSize: '13px' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '38px', padding: '0 14px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ height: '38px', padding: '0 10px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="active">Active Only</option>
              <option value="all">All Sessions</option>
              <option value="revoked">Terminated / Revoked</option>
            </select>
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-control"
              style={{ height: '38px', padding: '0 10px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="all">All Roles</option>
              <option value="staff">Field Staff</option>
              <option value="admin">Administrator</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List Table */}
      <div
        className="card"
        style={{
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--table-header-bg, #F8FAFC)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  USER ACCOUNT
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  DEVICE / PLATFORM
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  IP ADDRESS
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  LOGGED IN AT
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  LAST ACTIVE
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  STATUS
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 10px', color: '#0D5D37' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>Loading active sessions...</div>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <ShieldAlert size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                      No matching login sessions found
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Try adjusting the filter criteria or search query.
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const user = session.userId || {};
                  const isMobile =
                    (session.deviceType && /android|app|mobile/i.test(session.deviceType)) ||
                    (session.userAgent && /okhttp|expo/i.test(session.userAgent));
                  const isStaff = user.role === 'staff';
                  const isActive = session.isValid;

                  return (
                    <tr
                      key={session._id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: !isActive ? '#F8FAFC' : 'transparent',
                        opacity: !isActive ? 0.75 : 1,
                      }}
                    >
                      {/* User Account */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: isStaff ? '#E8F6ED' : '#EFF6FF',
                              color: isStaff ? '#0D5D37' : '#1D4ED8',
                              fontWeight: 700,
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isStaff ? '1px solid #B4E3C9' : '1px solid #BFDBFE',
                              flexShrink: 0,
                            }}
                          >
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                                {user.name || 'Unknown User'}
                              </span>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  background: isStaff ? '#E8F6ED' : '#F5F3FF',
                                  color: isStaff ? '#0D5D37' : '#7C3AED',
                                  border: isStaff ? '1px solid #B4E3C9' : '1px solid #DDD6FE',
                                }}
                              >
                                {user.role === 'staff' ? 'Field Staff' : user.role || 'Admin'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              📱 {user.phone || 'N/A'} {user.employeeId ? `• ID: ${user.employeeId}` : ''}
                            </div>
                            {user.assignedArea && (
                              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '1px' }}>
                                📍 {user.assignedArea}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Device / Platform */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isMobile ? (
                            <Smartphone size={18} color="#2563EB" />
                          ) : (
                            <Monitor size={18} color="#7C3AED" />
                          )}
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {session.deviceType || (isMobile ? 'Android App' : 'Web Browser')}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                maxWidth: '200px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={session.userAgent}
                            >
                              {session.userAgent || 'Standard Client'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={14} color="#64748B" />
                          <code
                            style={{
                              background: '#F1F5F9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#334155',
                              fontWeight: 600,
                            }}
                          >
                            {session.ipAddress || '127.0.0.1'}
                          </code>
                        </div>
                      </td>

                      {/* Logged in Date */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: 'var(--text-main)' }}>
                        <div title={formatExactDate(session.createdAt)}>
                          {new Date(session.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(session.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Last Active */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="#64748B" />
                          <span
                            style={{ fontWeight: 600, color: isActive ? '#059669' : '#64748B' }}
                            title={formatExactDate(session.lastActiveAt)}
                          >
                            {formatRelativeTime(session.lastActiveAt)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #86EFAC',
                              borderRadius: '20px',
                              padding: '3px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#16A34A',
                              }}
                            />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                              borderRadius: '20px',
                              padding: '3px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                            }}
                          >
                            Terminated
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {isActive ? (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'single',
                                  sessionId: session._id,
                                  userId: user._id,
                                  userName: user.name || 'User',
                                  deviceType: session.deviceType || 'App/Web',
                                })
                              }
                              className="btn btn-sm"
                              style={{
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                              title="Terminate this login session"
                            >
                              <Power size={13} /> Terminate
                            </button>

                            <button
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'all_user',
                                  sessionId: null,
                                  userId: user._id,
                                  userName: user.name || 'User',
                                  deviceType: 'all devices',
                                })
                              }
                              className="btn btn-sm"
                              style={{
                                background: '#F8FAFC',
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Terminate all active sessions for this user"
                            >
                              All Devices
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmModal({ ...confirmModal, isOpen: false });
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <Power size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  {confirmModal.type === 'single'
                    ? 'Terminate Login Session?'
                    : `Terminate All Sessions for ${confirmModal.userName}?`}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: '1.45' }}>
                  {confirmModal.type === 'single'
                    ? `Are you sure you want to log out ${confirmModal.userName} from "${confirmModal.deviceType}"? The client will immediately lose access and be forced to authenticate again.`
                    : `This will invalidate every active login session across all phones and browsers for ${confirmModal.userName}.`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="btn btn-secondary"
                disabled={actionLoading}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={actionLoading}
                className="btn btn-danger"
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#DC2626',
                  color: '#ffffff',
                }}
              >
                {actionLoading ? <RefreshCw size={14} className="spin-anim" /> : <Power size={14} />}
                <span>{actionLoading ? 'Terminating...' : 'Confirm Terminate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
