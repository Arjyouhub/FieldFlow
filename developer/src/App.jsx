import React, { useState, useEffect } from 'react';
import {
  Activity,
  Terminal,
  Shield,
  Key,
  Database,
  Server,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  Cpu,
  Layers,
  Search,
  Filter,
  Check,
  Menu,
  X,
  Clock,
  HardDrive,
  FileText,
  Settings,
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('fieldflow_dev_token') || '');
  const [devUser, setDevUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fieldflow_dev_user') || 'null');
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Telemetry Data States
  const [overview, setOverview] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [securityEvents, setSecurityEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Login Form
  const [loginPhone, setLoginPhone] = useState('9876543212');
  const [loginPassword, setLoginPassword] = useState('password123');

  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    let res;
    try {
      res = await fetch(url, { ...options, headers });
    } catch (netErr) {
      throw new Error(`Cannot connect to FieldFlow backend server. Please verify backend is running on port 5000.`);
    }

    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.status === 504 || res.status === 502
            ? 'Backend server is not running on port 5000. Please start backend server (cd backend && npm run dev).'
            : `Server returned HTTP ${res.status}: ${text.slice(0, 100)}`
        );
      }
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneOrEmail: loginPhone, password: loginPassword, deviceType: 'Developer Portal' }),
      });

      if (data.user.role !== 'developer' && data.user.role !== 'super_admin') {
        throw new Error('Access denied. Only Developer or DevOps Lead role can access telemetry console.');
      }

      setToken(data.token);
      setDevUser(data.user);
      localStorage.setItem('fieldflow_dev_token', data.token);
      localStorage.setItem('fieldflow_dev_user', JSON.stringify(data.user));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToken('');
    setDevUser(null);
    localStorage.removeItem('fieldflow_dev_token');
    localStorage.removeItem('fieldflow_dev_user');
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeTab === 'overview') {
        const data = await apiFetch('/api/developer/overview');
        setOverview(data);
      } else if (activeTab === 'api-monitoring') {
        const data = await apiFetch('/api/developer/metrics');
        setApiMetrics(data);
      } else if (activeTab === 'logs') {
        const data = await apiFetch(
          `/api/developer/logs?level=${logFilter}${logSearch ? `&search=${encodeURIComponent(logSearch)}` : ''}`
        );
        setLogs(data.logs || []);
      } else if (activeTab === 'security') {
        const data = await apiFetch('/api/developer/security-events');
        setSecurityEvents(data.events || []);
      } else if (activeTab === 'sessions') {
        const data = await apiFetch('/api/developer/sessions');
        setSessions(data.sessions || []);
      } else if (activeTab === 'audits') {
        const data = await apiFetch('/api/developer/audits');
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, activeTab]);

  const handleRevokeSession = async (sessionId) => {
    try {
      await apiFetch(`/api/developer/sessions/${sessionId}/revoke`, { method: 'POST' });
      setSuccessMsg('Session token successfully revoked. User forced to re-authenticate.');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleResolveSecurityEvent = async (eventId) => {
    try {
      await apiFetch(`/api/developer/security-events/${eventId}/resolve`, { method: 'POST' });
      setSuccessMsg('Security event resolved.');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // LOGIN SCREEN
  if (!token || !devUser) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #0d1b2a 0%, #050811 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '32px', borderColor: 'var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div className="brand-icon-dev">
              <Terminal size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>FieldFlow Core</h1>
              <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>DEVELOPER TELEMETRY PORTAL</p>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Restricted diagnostic console for backend monitoring, security event review, and active session management.
          </p>

          {errorMsg && (
            <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12.5px', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Developer Phone / ID
              </label>
              <input
                type="text"
                className="input-dev"
                style={{ width: '100%' }}
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="Developer Phone (9876543212)"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                className="input-dev"
                style={{ width: '100%' }}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Developer Password"
                required
              />
            </div>

            <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '10px' }} disabled={loading}>
              {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Authenticate Developer Session'}
            </button>
          </form>

          <div style={{ marginTop: '16px', padding: '10px', background: '#090e1a', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            Demo Lead: 9876543212 / password123
          </div>
        </div>
      </div>
    );
  }

  // MAIN LOGGED-IN PORTAL
  return (
    <div className="dev-container">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`drawer-backdrop ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-row">
            <div className="brand-icon-dev">
              <Terminal size={18} />
            </div>
            <div>
              <div className="brand-title-dev">FieldFlow</div>
              <div className="brand-tag-dev">DEV TELEMETRY</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setMobileDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {[
            { id: 'overview', label: 'System Health', icon: Cpu },
            { id: 'api-monitoring', label: 'API Monitoring', icon: Activity },
            { id: 'logs', label: 'Application Logs', icon: Terminal },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'security', label: 'Security Events', icon: Shield },
            { id: 'sessions', label: 'Active Sessions', icon: Key },
            { id: 'jobs', label: 'Background Jobs', icon: Layers },
            { id: 'storage', label: 'Storage', icon: HardDrive },
            { id: 'deployments', label: 'Deployments', icon: Server },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileDrawerOpen(false);
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{devUser.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>ROLE: {devUser.role.toUpperCase()}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '5px 8px' }} title="Sign Out">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)}>
              <Menu size={18} />
            </button>
            <h2 className="page-title mono">
              {activeTab === 'overview' ? 'FieldFlow // System Health' :
               activeTab === 'api-monitoring' ? 'FieldFlow // API Monitoring' :
               activeTab === 'logs' ? 'FieldFlow // Application Logs' :
               activeTab === 'database' ? 'FieldFlow // Database & Connection Pool' :
               activeTab === 'security' ? 'FieldFlow // Security Events' :
               activeTab === 'sessions' ? 'FieldFlow // Active Sessions' :
               activeTab === 'jobs' ? 'FieldFlow // Background Jobs' :
               activeTab === 'storage' ? 'FieldFlow // Storage & File Uploads' :
               activeTab === 'deployments' ? 'FieldFlow // Deployments & Versions' : 'FieldFlow // Console Settings'}
            </h2>
            <button onClick={loadData} className="btn btn-outline" style={{ padding: '5px 9px' }} title="Refresh">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="topbar-right">
            <span className="badge badge-green">
              <Check size={11} /> API ONLINE
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              PORT 5000
            </div>
          </div>
        </header>

        <div className="content-body">
          {successMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#34d399', fontSize: '13px', marginBottom: '16px' }}>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 1: SYSTEM HEALTH (Reference Screen 18) */}
          {/* ================================================================ */}
          {activeTab === 'overview' && (
            <div>
              {/* 4 TOP METRIC CARDS (Reference Screen 18) */}
              <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
                {/* 1. API Status */}
                <div className="kpi-card">
                  <div className="kpi-label">API Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>Healthy</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Express Core Active</div>
                </div>

                {/* 2. Response Time */}
                <div className="kpi-card">
                  <div className="kpi-label">Response Time</div>
                  <div className="kpi-val" style={{ color: '#38BDF8', fontSize: '24px', fontWeight: 800 }}>120 ms</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>p95 Global Latency</div>
                </div>

                {/* 3. Database */}
                <div className="kpi-card">
                  <div className="kpi-label">Database</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>Connected</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>MongoDB Atlas 1ms Ping</div>
                </div>

                {/* 4. Uptime */}
                <div className="kpi-card">
                  <div className="kpi-label">Uptime</div>
                  <div className="kpi-val" style={{ color: '#A7F3D0', fontSize: '24px', fontWeight: 800 }}>99.9%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>SLA Target Exceeded</div>
                </div>
              </div>

              {/* MIDDLE SECTION: API REQUESTS (LAST 24 HOURS) SPLINE CHART (Screen 18) */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 className="card-title mono" style={{ fontSize: '15px' }}>API Requests (Last 24 Hours)</h3>
                    <p className="card-sub">Traffic throughput and anomaly monitoring</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Error Rate:</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#f87171' }}>0.5%</span>
                  </div>
                </div>

                {/* Spline Line Chart (Screen 18) */}
                <div style={{ height: '180px', width: '100%', position: 'relative' }}>
                  <svg viewBox="0 0 500 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    <line x1="20" y1="20" x2="490" y2="20" stroke="#172033" strokeDasharray="3 3" />
                    <line x1="20" y1="65" x2="490" y2="65" stroke="#172033" strokeDasharray="3 3" />
                    <line x1="20" y1="110" x2="490" y2="110" stroke="#172033" strokeDasharray="3 3" />
                    <line x1="20" y1="150" x2="490" y2="150" stroke="#1e293b" />

                    {/* Shaded Area under spline curve */}
                    <path
                      d="M 20 120 Q 70 135, 120 100 T 220 85 T 320 110 T 420 50 T 490 60 L 490 150 L 20 150 Z"
                      fill="url(#chartGradient)"
                    />

                    {/* Spline Stroke Line (Screen 18) */}
                    <path
                      d="M 20 120 Q 70 135, 120 100 T 220 85 T 320 110 T 420 50 T 490 60"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />

                    {/* Data Points */}
                    <circle cx="220" cy="85" r="4" fill="#06b6d4" stroke="#070b14" strokeWidth="2" />
                    <circle cx="420" cy="50" r="4" fill="#06b6d4" stroke="#070b14" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* BOTTOM SECTION: SERVER RESOURCES (Screen 18) */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 className="card-title mono" style={{ fontSize: '15px', marginBottom: '14px' }}>Server Resources</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {/* CPU: 32% */}
                  <div style={{ padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>CPU</span>
                      <strong style={{ fontSize: '14px', color: '#38BDF8' }}>32%</strong>
                    </div>
                    <div style={{ height: '8px', background: '#172033', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '32%', height: '100%', background: '#38BDF8', borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>4 Cores • 1.2 GHz Average</div>
                  </div>

                  {/* Memory: 56% */}
                  <div style={{ padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Memory</span>
                      <strong style={{ fontSize: '14px', color: '#10B981' }}>56%</strong>
                    </div>
                    <div style={{ height: '8px', background: '#172033', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '56%', height: '100%', background: '#10B981', borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>4.5 GB / 8.0 GB Used</div>
                  </div>

                  {/* Storage: 42% */}
                  <div style={{ padding: '16px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Storage</span>
                      <strong style={{ fontSize: '14px', color: '#F59E0B' }}>42%</strong>
                    </div>
                    <div style={{ height: '8px', background: '#172033', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '42%', height: '100%', background: '#F59E0B', borderRadius: '4px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>42 GB / 100 GB NVMe</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: API METRICS */}
          {/* ================================================================ */}
          {activeTab === 'api-monitoring' && apiMetrics && (
            <div>
              <div className="grid-kpi">
                <div className="kpi-card">
                  <div className="kpi-label">Tracked Requests</div>
                  <div className="kpi-val">{apiMetrics.totalRequestsTracked || 0}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Avg API Latency</div>
                  <div className="kpi-val" style={{ color: 'var(--accent)' }}>
                    {apiMetrics.averageResponseTimeMs || 14} ms
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Error Rate</div>
                  <div className="kpi-val" style={{ color: apiMetrics.errorRatePercentage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {apiMetrics.errorRatePercentage || 0}%
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">2xx Successes</div>
                  <div className="kpi-val" style={{ color: 'var(--success)' }}>
                    {apiMetrics.statusBreakdown?.['200'] || apiMetrics.totalRequestsTracked || 0}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="card-title mono" style={{ marginBottom: '16px' }}>Endpoints Telemetry & Response Latency</h3>
                <div className="table-box">
                  <table>
                    <thead>
                      <tr>
                        <th>HTTP Method</th>
                        <th>Endpoint Route</th>
                        <th>Invocations</th>
                        <th>Avg Latency</th>
                        <th>Last HTTP Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiMetrics.endpoints?.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No requests tracked since server boot.
                          </td>
                        </tr>
                      ) : (
                        apiMetrics.endpoints?.map((ep, i) => (
                          <tr key={i}>
                            <td>
                              <span className={`badge ${ep.method === 'GET' ? 'badge-cyan' : ep.method === 'POST' ? 'badge-green' : 'badge-amber'}`}>
                                {ep.method}
                              </span>
                            </td>
                            <td className="mono" style={{ fontSize: '12px' }}>{ep.path}</td>
                            <td>{ep.count}</td>
                            <td className="mono">{ep.avgResponseTimeMs} ms</td>
                            <td>
                              <span className={`badge ${ep.lastStatus < 400 ? 'badge-green' : 'badge-red'}`}>
                                {ep.lastStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: APPLICATION LOGS */}
          {/* ================================================================ */}
          {activeTab === 'logs' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 className="card-title mono">Structured Application Logs ({logs.length})</h3>
                  <p className="card-sub">Authoritative real-time console logs from Node.js backend</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="input-dev"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                  >
                    <option value="ALL">All Levels</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                  </select>

                  <input
                    type="text"
                    className="input-dev"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ background: '#050811', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', maxHeight: '520px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                    No logs recorded matching current criteria.
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`badge ${log.level === 'ERROR' ? 'badge-red' : log.level === 'WARN' ? 'badge-amber' : 'badge-cyan'}`} style={{ padding: '1px 5px', fontSize: '10px' }}>
                        {log.level}
                      </span>
                      <span style={{ color: log.level === 'ERROR' ? '#f87171' : 'var(--text-main)', flex: 1, wordBreak: 'break-all' }}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: SECURITY & GEOFENCE EVENTS */}
          {/* ================================================================ */}
          {activeTab === 'security' && (
            <div className="card">
              <h3 className="card-title mono" style={{ marginBottom: '16px' }}>
                Security & Geospatial Events ({securityEvents.length})
              </h3>

              <div className="table-box">
                <table>
                  <thead>
                    <tr>
                      <th>Event Type</th>
                      <th>Severity</th>
                      <th>Description</th>
                      <th>IP / Origin</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No active security anomalies reported.
                        </td>
                      </tr>
                    ) : (
                      securityEvents.map((ev) => (
                        <tr key={ev._id}>
                          <td>
                            <strong>{ev.type?.replace('_', ' ')}</strong>
                          </td>
                          <td>
                            <span className={`badge ${ev.severity === 'HIGH' ? 'badge-red' : ev.severity === 'MEDIUM' ? 'badge-amber' : 'badge-slate'}`}>
                              {ev.severity}
                            </span>
                          </td>
                          <td>{ev.description}</td>
                          <td className="mono">{ev.ipAddress || '127.0.0.1'}</td>
                          <td>
                            <span className={`badge ${ev.status === 'RESOLVED' ? 'badge-green' : 'badge-amber'}`}>
                              {ev.status}
                            </span>
                          </td>
                          <td>
                            {ev.status !== 'RESOLVED' ? (
                              <button
                                className="btn btn-cyan"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleResolveSecurityEvent(ev._id)}
                              >
                                Resolve
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: ACTIVE SESSIONS */}
          {/* ================================================================ */}
          {activeTab === 'sessions' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="card-title mono">Active Authenticated Sessions ({sessions.length})</h3>
                  <p className="card-sub">Active JWT tokens across mobile and web platforms</p>
                </div>
              </div>

              <div className="table-box">
                <table>
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>Role</th>
                      <th>Device Type</th>
                      <th>IP Address</th>
                      <th>Last Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess._id}>
                        <td>
                          <strong>{sess.userId?.name || 'Staff User'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sess.userId?.phone}</div>
                        </td>
                        <td>
                          <span className="badge badge-slate">{sess.userId?.role || 'staff'}</span>
                        </td>
                        <td>{sess.deviceType || 'Field Staff Android App'}</td>
                        <td className="mono">{sess.ipAddress || '127.0.0.1'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(sess.lastActiveAt || sess.createdAt).toLocaleTimeString()}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleRevokeSession(sess._id)}
                          >
                            Revoke Token
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: AUDIT TRAIL */}
          {/* ================================================================ */}
          {activeTab === 'audits' && (
            <div className="card">
              <h3 className="card-title mono" style={{ marginBottom: '16px' }}>Immutable Platform Audit Log ({auditLogs.length})</h3>

              <div className="table-box">
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Performed By</th>
                      <th>Target Entity</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No audit entries recorded.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td>
                            <strong>{log.action}</strong>
                          </td>
                          <td>{log.userId?.name || 'Administrator'}</td>
                          <td className="mono" style={{ fontSize: '12px' }}>{log.entityType}: {log.entityId}</td>
                          <td className="mono">{log.ipAddress || '127.0.0.1'}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
