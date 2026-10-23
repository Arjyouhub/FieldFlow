import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  User,
  Phone,
  MapPin,
  ExternalLink,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Briefcase,
  Shield,
  Eye,
  RefreshCw,
} from 'lucide-react';

/**
 * Staff Details Verification Modal
 * Displays full officer selfie, registered mobile, territory, GPS tag, and review actions.
 */
export function StaffDetailsModal({
  isOpen,
  onClose,
  staff,
  onApprove,
  onDecline,
  onOpenEdit,
  getPhotoUrl,
}) {
  if (!isOpen || !staff) return null;

  const photoUrl = staff.selfiePhoto || staff.profilePhoto || '';
  const resolvedPhoto = photoUrl && getPhotoUrl ? getPhotoUrl(photoUrl) : photoUrl;

  const lat = staff.registrationLocation?.lat;
  const lng = staff.registrationLocation?.lng;
  const address = staff.registrationLocation?.address;

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 10000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '17px' }}>
                Field Staff Verification Details
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                ID: {staff.employeeId || 'STF-AUTO'} • Role: {staff.role || 'staff'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          {/* Top Profile Card: Photo + Basic Info */}
          <div
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
              padding: '16px',
              background: 'var(--bg-card-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '18px',
            }}
          >
            {/* Selfie Photo */}
            <div style={{ position: 'relative' }}>
              {resolvedPhoto ? (
                <img
                  src={resolvedPhoto}
                  alt={staff.name}
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '14px',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: '24px',
                    fontWeight: '700',
                  }}
                >
                  {staff.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                </div>
              )}
              {resolvedPhoto && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: '#10B981',
                    color: '#fff',
                    borderRadius: '50%',
                    padding: '3px',
                    fontSize: '10px',
                    display: 'flex',
                  }}
                  title="Photo Attached"
                >
                  ✓
                </span>
              )}
            </div>

            {/* Officer Meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {staff.name}
                </h4>
                <span
                  className={`badge ${
                    staff.status === 'active'
                      ? 'badge-success'
                      : staff.status === 'pending_approval'
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                >
                  {staff.status === 'pending_approval' ? 'PENDING APPROVAL' : staff.status?.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <Phone size={14} color="var(--primary)" />
                <strong style={{ color: 'var(--text-main)' }}>+91 {staff.phone}</strong>
                <span style={{ color: 'var(--text-muted)' }}>(Login Username)</span>
              </div>

              <div style={{ marginTop: '4px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Assigned Territory: <strong style={{ color: 'var(--primary-dark)' }}>{staff.assignedArea || 'Kozhikode Central'}</strong>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div style={{ padding: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Employee / Agent ID
              </span>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {staff.employeeId || 'STF-AUTO'}
              </div>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Operational Team
              </span>
              <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>
                {staff.team || 'Field Operations'}
              </div>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Registered Date
              </span>
              <div style={{ fontSize: '13px', marginTop: '2px', color: 'var(--text-main)' }}>
                {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
              </div>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Approval Status
              </span>
              <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px', color: staff.status === 'active' ? '#059669' : '#D97706' }}>
                {staff.status === 'active' ? '✓ Authorized for Mobile Access' : '⏳ Awaiting Admin Approval'}
              </div>
            </div>
          </div>

          {/* GPS Coordinates & Registration Tag */}
          <div
            style={{
              padding: '14px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> GPS Location Tagged at Sign-Up
              </strong>
              {lat && lng && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#059669',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View on Google Maps <ExternalLink size={11} />
                </a>
              )}
            </div>
            {lat && lng ? (
              <div>
                <div style={{ fontSize: '12px', color: '#15803D', fontFamily: 'var(--font-mono)' }}>
                  Latitude: {lat} • Longitude: {lng}
                </div>
                {address && (
                  <div style={{ fontSize: '12.5px', color: '#166534', marginTop: '3px', fontWeight: '500' }}>
                    📍 {address}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#65A30D' }}>
                No GPS coordinates were tagged during sign-up.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 20px',
            background: 'var(--bg-card-subtle)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              onClose();
              if (onOpenEdit) onOpenEdit(staff);
            }}
            style={{ gap: '6px' }}
          >
            <Edit2 size={13} /> Edit Staff Details
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {staff.status === 'pending_approval' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)', gap: '4px' }}
                  onClick={() => {
                    const reason = window.prompt(`Decline registration for ${staff.name}:`, 'Details not verified');
                    if (reason !== null) {
                      onDecline(staff._id, reason);
                      onClose();
                    }
                  }}
                >
                  <XCircle size={14} /> Decline
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                  onClick={() => {
                    onApprove(staff._id, staff.assignedArea);
                    onClose();
                  }}
                >
                  <CheckCircle size={14} /> Approve & Grant Access
                </button>
              </>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Edit Staff Details Modal
 * Allows Admin to modify Name, Mobile Number, Assigned Area, Employee ID, Status, or Reset Password.
 */
export function EditStaffModal({ isOpen, onClose, staff, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    assignedArea: '',
    employeeId: '',
    team: 'Field Operations',
    status: 'active',
    password: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        phone: staff.phone || '',
        assignedArea: staff.assignedArea || '',
        employeeId: staff.employeeId || '',
        team: staff.team || 'Field Operations',
        status: staff.status || 'active',
        password: '',
      });
      setErrorMsg('');
    }
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Login mobile number is required.');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      assignedArea: formData.assignedArea.trim(),
      employeeId: formData.employeeId.trim(),
      team: formData.team.trim(),
      status: formData.status,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    onSave(staff._id, payload);
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 10001 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: '500px', width: '92%' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 size={18} color="var(--primary)" />
            <h3 className="modal-title" style={{ margin: 0, fontSize: '17px' }}>
              Edit Staff Details: {staff.name}
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" disabled={isSaving}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#DC2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field: Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}>
                Full Officer Name *
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Field: Login Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}>
                Login Mobile Number (Username) *
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px' }}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={10}
                required
              />
            </div>

            {/* Field: Assigned Operational Area */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}>
                Assigned Operational Area / Territory
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px' }}
                placeholder="e.g. Kozhikode Central, Vadakara"
                value={formData.assignedArea}
                onChange={(e) => setFormData({ ...formData, assignedArea: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Field: Employee ID */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}>
                  Employee / Agent ID
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px' }}
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
              </div>

              {/* Field: Account Status */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '5px' }}>
                  Account Status
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 10px' }}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active (Can Login)</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="inactive">Inactive (Blocked)</option>
                </select>
              </div>
            </div>

            {/* Field: Reset Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700' }}>
                  Reset Password (Optional)
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Leave blank to keep current</span>
              </div>
              <input
                type="password"
                className="input-field"
                style={{ width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px' }}
                placeholder="Enter new password (min. 6 chars)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '14px 20px',
              background: 'var(--bg-card-subtle)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ gap: '6px' }}>
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {isSaving ? 'Saving Changes...' : 'Save Staff Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
