import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  Users,
  MapPin,
  AlertTriangle,
  UserCheck,
  UploadCloud,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Phone,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Menu,
  X,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  Check,
  FileSpreadsheet,
  File,
  Paperclip,
  Trash2,
  FolderUp,
  FileCheck,
  Layers,
  Upload,
  Calendar,
  Printer,
  Briefcase,
  UserX,
  ShieldCheck,
  Grid,
  List,
  Mail,
  BarChart2,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  Image,
  Camera,
} from 'lucide-react';

import PortfoliosView from './components/PortfoliosView';
import CasesView from './components/CasesView';
import BulkImportModal from './components/BulkImportModal';
import AddDataStaffModal from './components/AddDataStaffModal';
import AdminAccountsView from './components/AdminAccountsView';
import PtpView from './components/PtpView';
import NonWorkableView from './components/NonWorkableView';
import AuditLogsView from './components/AuditLogsView';
import SuspiciousVisitsView from './components/SuspiciousVisitsView';
import WhatsAppShareModal from './components/WhatsAppShareModal';
import { StaffDetailsModal, EditStaffModal } from './components/StaffModals';
import {
  generateCollectionModelImage,
  generateCollectionLedgerImage,
  generateVisitModelImage,
  generateVisitSummaryImage,
  generateStaffPerformanceImage,
  generateStaffVisitImage,
} from './utils/reportImageGenerator';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('fieldflow_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('fieldflow_admin_user') || 'null');
      if (u && (u.name === 'System Super Admin' || !u.name)) {
        u.name = 'System Admin';
      }
      return u;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customerViewMode, setCustomerViewMode] = useState('auto');
  const [collectionsViewMode, setCollectionsViewMode] = useState('auto');
  const [staffViewMode, setStaffViewMode] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Portfolios & Global Filter
  const [portfolios, setPortfolios] = useState([]);
  const [selectedGlobalPortfolio, setSelectedGlobalPortfolio] = useState('ALL');
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportInitialPortfolio, setBulkImportInitialPortfolio] = useState('');
  const [bulkImportInitialStaffId, setBulkImportInitialStaffId] = useState('');
  const [addDataStaffTarget, setAddDataStaffTarget] = useState(null);
  const [statusConfirmStaff, setStatusConfirmStaff] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState('admins'); // 'admins' | 'policies'

  // Dashboard Data
  const [stats, setStats] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suspiciousEvents, setSuspiciousEvents] = useState([]);
  const [collections, setCollections] = useState([]);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerStaffFilter, setCustomerStaffFilter] = useState('ALL');

  // Modals state
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSuspicious, setSelectedSuspicious] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [reassignModal, setReassignModal] = useState(null);

  // Field Staff Approvals State
  const [approvalsFilter, setApprovalsFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [approvalsSearch, setApprovalsSearch] = useState('');
  const [approvalsViewMode, setApprovalsViewMode] = useState('cards'); // 'cards' | 'table'
  const [staffAreaOverrides, setStaffAreaOverrides] = useState({});
  const [staffRejectionModal, setStaffRejectionModal] = useState(null); // { staffId, name, phone, reason }
  const [customRejectReason, setCustomRejectReason] = useState('');

  // WhatsApp Photo Share Modal State
  const [whatsAppModal, setWhatsAppModal] = useState({
    isOpen: false,
    imageData: null,
    title: '',
    recipientName: '',
    phone: '',
  });

  // Staff Approvals & Details / Edit Modal states
  const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);

  // File Upload & Batch Import states
  const [importModalTab, setImportModalTab] = useState('file'); // 'file' | 'single'
  const [importFile, setImportFile] = useState(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [parsedCases, setParsedCases] = useState([]);
  const [parseError, setParseError] = useState('');
  const [documentNote, setDocumentNote] = useState('');
  const [importBatchMonth, setImportBatchMonth] = useState('OCT-2026');
  const [importDefaultStaff, setImportDefaultStaff] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Single customer form & document attachments
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    loanAccountNo: '',
    address: '',
    area: '',
    city: 'Kozhikode',
    outstandingAmount: '',
    emiAmount: '',
    assignedStaff: '',
    batchMonth: 'OCT-2026',
    documents: [],
  });
  const [uploadingSingleDoc, setUploadingSingleDoc] = useState(false);
  const singleDocInputRef = useRef(null);

  // Existing customer document & photo attachment modal
  const [selectedCustomerForDoc, setSelectedCustomerForDoc] = useState(null);
  const [uploadingDocModal, setUploadingDocModal] = useState(false);
  const docModalInputRef = useRef(null);
  const [docFile, setDocFile] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('Customer Photo');
  const [docNotes, setDocNotes] = useState('');

  // Forms
  const [staffForm, setStaffForm] = useState({ name: '', phone: '', employeeId: '', team: 'Field Operations', assignedArea: 'Kozhikode Central' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [importJsonText, setImportJsonText] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    geofenceRadiusMetres: 100,
    maxCashCollectionLimit: 50000,
    otpExpiryMinutes: 10,
    requirePhotoEvidence: true,
  });

  // Reports & Analytics State
  const [reportType, setReportType] = useState('collections'); // 'collections' | 'visits'
  const [reportDateRange, setReportDateRange] = useState('today'); // 'today' | 'yesterday' | '7days' | 'thisMonth' | 'custom'
  const [reportStartDate, setReportStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportStaffFilter, setReportStaffFilter] = useState('ALL');
  const [reportOutcomeFilter, setReportOutcomeFilter] = useState('ALL');
  const [reportPaymentStatusFilter, setReportPaymentStatusFilter] = useState('ALL');
  const [reportPaymentMethodFilter, setReportPaymentMethodFilter] = useState('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [reportVisits, setReportVisits] = useState([]);
  const [reportCollections, setReportCollections] = useState([]);
  const [reportVisitsSummary, setReportVisitsSummary] = useState(null);
  const [reportCollectionsSummary, setReportCollectionsSummary] = useState(null);
  const [reportPerformanceMatrix, setReportPerformanceMatrix] = useState([]);
  const [reportPerformanceGrandTotal, setReportPerformanceGrandTotal] = useState(null);
  const [reportTimeSlotMatrix, setReportTimeSlotMatrix] = useState([]);
  const [reportColumnTotals, setReportColumnTotals] = useState({});
  const [reportGrandTotalVisits, setReportGrandTotalVisits] = useState(0);
  const [collectionSubView, setCollectionSubView] = useState('model'); // 'model' | 'ledger'
  const [visitSubView, setVisitSubView] = useState('model'); // 'model' | 'logs'
  const [loadingReport, setLoadingReport] = useState(false);

  // Manual Navi Visit Counts States (for separate Navi App)
  const [isEditingNavi, setIsEditingNavi] = useState(false);
  const [naviEditData, setNaviEditData] = useState({});
  const [savingNavi, setSavingNavi] = useState(false);
  const [showNaviModal, setShowNaviModal] = useState(false);
  const [naviModalForm, setNaviModalForm] = useState({
    staffId: '',
    slots: { '9-11': 0, '11-1': 0, '1-3': 0, '3-5': 0, '5-6': 0 },
    notes: '',
  });

  // Manual Data Entry for Field Staff Modal State
  const [showRecordStaffModal, setShowRecordStaffModal] = useState(false);
  const [recordingStaffData, setRecordingStaffData] = useState(false);
  const [recordStaffForm, setRecordStaffForm] = useState({
    staffId: '',
    customerId: '',
    outcome: 'Payment Collected',
    collectedAmount: '',
    paymentMethod: 'Cash',
    paymentReference: '',
    paymentStatus: 'APPROVED',
    ptpAmount: '',
    ptpDate: '',
    notes: '',
    visitDate: new Date().toISOString().slice(0, 16),
  });

  // Auth Form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Base URL configuration for production vs local dev
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  // Track broken / unreachable photo URLs to fallback cleanly to styled initials
  const [brokenImages, setBrokenImages] = useState({});

  // Helper to ensure photo paths (/uploads/...) resolve against backend
  const getPhotoUrl = (photoPath) => {
    if (!photoPath || typeof photoPath !== 'string') return '';
    if (photoPath.startsWith('data:image') || photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    const base = API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://fieldflow-bmg2.onrender.com');
    return `${base}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  // Helper fetch with auth & safe JSON parsing
  const apiFetch = async (url, options = {}) => {
    const activeToken = token || localStorage.getItem('fieldflow_admin_token') || '';
    const headers = {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      ...options.headers,
    };
    let res;
    const finalUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      res = await fetch(finalUrl, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (netErr) {
      if (netErr.name === 'AbortError') {
        throw new Error('Server request timed out. If Render cloud instance is waking up, please allow 30 seconds and refresh.');
      }
      throw new Error(`Cannot connect to FieldFlow backend (${finalUrl}). Please verify backend is running.`);
    }

    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (res.status === 404) {
          throw new Error(`Endpoint not found (HTTP 404): The requested resource "${url}" is not available on the server. If this is a new feature, cloud deployment may still be synchronizing.`);
        }
        if (res.status === 504 || res.status === 502) {
          throw new Error('Backend server is starting up or unreachable. Please retry in a few moments.');
        }
        const cleanedText = text.replace(/<[^>]*>?/gm, '').trim();
        throw new Error(`Server returned HTTP ${res.status}${cleanedText ? `: ${cleanedText.slice(0, 100)}` : ''}`);
      }
    }

    // Auto-logout when token is invalid or expired
    if (res.status === 401) {
      localStorage.removeItem('fieldflow_admin_token');
      localStorage.removeItem('fieldflow_admin_user');
      setToken('');
      setAdminUser(null);
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  };

  // Perform Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneOrEmail: loginPhone, password: loginPassword, deviceType: 'Admin Web Portal' }),
      });

      if (data.user.role !== 'admin' && data.user.role !== 'super_admin') {
        throw new Error('Access denied. Only authorized Administrators can access this portal.');
      }

      setToken(data.token);
      setAdminUser(data.user);
      localStorage.setItem('fieldflow_admin_token', data.token);
      localStorage.setItem('fieldflow_admin_user', JSON.stringify(data.user));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('fieldflow_admin_token');
    localStorage.removeItem('fieldflow_admin_user');
  };

  // Load Tab Data
  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // Keep portfolios refreshed
      apiFetch('/api/portfolios')
        .then((d) => setPortfolios(d.portfolios || []))
        .catch(() => {});

      if (activeTab === 'dashboard') {
        const url = selectedGlobalPortfolio !== 'ALL'
          ? `/api/admin/dashboard-stats?portfolioId=${selectedGlobalPortfolio}`
          : '/api/admin/dashboard-stats';
        const data = await apiFetch(url);
        setStats(data.stats);
        setRecentVisits(data.recentVisits || []);
      } else if (activeTab === 'customers') {
        const data = await apiFetch(`/api/admin/customers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
        setCustomers(data.customers || []);
        if (!staffList.length) {
          apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
        }
      } else if (activeTab === 'staff' || activeTab === 'approvals') {
        const data = await apiFetch('/api/admin/staff');
        setStaffList(data.staff || []);
        apiFetch('/api/admin/dashboard-stats').then((d) => setStats(d.stats)).catch(() => {});
      } else if (activeTab === 'locations') {
        const data = await apiFetch('/api/admin/locations');
        setLocations(data.locations || []);
      } else if (activeTab === 'suspicious') {
        const data = await apiFetch('/api/visits/suspicious');
        setSuspiciousEvents(data.suspiciousEvents || []);
      } else if (activeTab === 'collections') {
        const data = await apiFetch('/api/admin/collections');
        setCollections(data.collections || []);
      } else if (activeTab === 'reports') {
        // Ensure staff and customer dropdowns are populated
        if (!staffList.length) {
          apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
        }
        if (!customers.length) {
          apiFetch('/api/admin/customers').then((d) => setCustomers(d.customers || [])).catch(() => {});
        }
        fetchReports();
      } else if (activeTab === 'settings') {
        const data = await apiFetch('/api/admin/settings');
        if (data.settings) {
          setSettings(data.settings);
          setSettingsForm({
            geofenceRadiusMetres: data.settings.geofenceRadiusMetres || 100,
            maxCashCollectionLimit: data.settings.maxCashCollectionLimit || 50000,
            otpExpiryMinutes: data.settings.otpExpiryMinutes || 10,
            requirePhotoEvidence: data.settings.requirePhotoEvidence ?? true,
          });
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, activeTab, selectedGlobalPortfolio]);

  // Handle report date preset changes
  const handleDatePresetChange = (preset) => {
    setReportDateRange(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (preset === 'today') {
      setReportStartDate(todayStr);
      setReportEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setReportStartDate(yStr);
      setReportEndDate(yStr);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setReportStartDate(past.toISOString().slice(0, 10));
      setReportEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setReportStartDate(firstDay);
      setReportEndDate(todayStr);
    }
  };

  // Fetch reports data from backend
  const fetchReports = async () => {
    if (!token) return;
    setLoadingReport(true);
    try {
      if (reportType === 'collections') {
        const params = new URLSearchParams({
          startDate: reportStartDate || '',
          endDate: reportEndDate || '',
          staffId: reportStaffFilter,
          paymentMethod: reportPaymentMethodFilter,
          paymentStatus: reportPaymentStatusFilter,
          search: reportSearch || '',
        });
        const data = await apiFetch(`/api/admin/reports/collections?${params.toString()}`);
        setReportCollections(data.collections || []);
        setReportCollectionsSummary(data.summary || null);
        setReportPerformanceMatrix(data.performanceMatrix || []);
        setReportPerformanceGrandTotal(data.performanceGrandTotal || null);
      } else {
        const params = new URLSearchParams({
          startDate: reportStartDate || '',
          endDate: reportEndDate || '',
          staffId: reportStaffFilter,
          outcome: reportOutcomeFilter,
          search: reportSearch || '',
        });
        const data = await apiFetch(`/api/admin/reports/daily-visits?${params.toString()}`);
        setReportVisits(data.visits || []);
        setReportVisitsSummary(data.summary || null);
        setReportTimeSlotMatrix(data.timeSlotMatrix || []);
        setReportColumnTotals(data.columnTotals || {});
        setReportGrandTotalVisits(data.grandTotalVisits || 0);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Reload report when filter changes
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [
    activeTab,
    reportType,
    reportStartDate,
    reportEndDate,
    reportStaffFilter,
    reportOutcomeFilter,
    reportPaymentStatusFilter,
    reportPaymentMethodFilter,
  ]);

  // Download Collection Report as Excel (.xlsx)
  const downloadCollectionsExcel = () => {
    if (!reportCollections || reportCollections.length === 0) {
      setErrorMsg('No collection records match the current filter to export.');
      return;
    }
    const rows = reportCollections.map((c, i) => ({
      'Sl No': i + 1,
      'Collection Date & Time': new Date(c.createdAt || c.serverTimestamp).toLocaleString('en-IN'),
      'Customer Name': c.customerId?.name || 'N/A',
      'Loan Account No': c.customerId?.loanAccountNo || 'N/A',
      'Phone': c.customerId?.phone || 'N/A',
      'Address': c.customerId?.address || 'N/A',
      'Area / City': `${c.customerId?.city || ''} ${c.customerId?.area ? `(${c.customerId?.area})` : ''}`,
      'Collected Amount (₹)': c.collectedAmount || 0,
      'Payment Mode': c.paymentMethod || 'Cash',
      'Reference / UTR': c.paymentReference || 'N/A',
      'Verification Status': c.paymentStatus || 'APPROVED',
      'Field Staff Name': c.staffId?.name || 'Unassigned',
      'Staff Contact': c.staffId?.phone || 'N/A',
      'Staff Assigned Area': c.staffId?.assignedArea || 'N/A',
      'Notes': c.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collections');
    XLSX.writeFile(wb, `FieldFlow_Collections_Report_${reportStartDate}_to_${reportEndDate}.xlsx`);
  };

  // Download Daily Visits Report as Excel (.xlsx)
  const downloadDailyVisitsExcel = () => {
    if (!reportVisits || reportVisits.length === 0) {
      setErrorMsg('No visit records match the current filter to export.');
      return;
    }
    const rows = reportVisits.map((v, i) => ({
      'Sl No': i + 1,
      'Visit Date & Time': new Date(v.createdAt || v.serverTimestamp).toLocaleString('en-IN'),
      'Customer Name': v.customerId?.name || 'N/A',
      'Loan Account No': v.customerId?.loanAccountNo || 'N/A',
      'Phone': v.customerId?.phone || 'N/A',
      'Address': v.customerId?.address || 'N/A',
      'Area / City': `${v.customerId?.city || ''} ${v.customerId?.area ? `(${v.customerId?.area})` : ''}`,
      'Visit Outcome': v.outcome || 'N/A',
      'Collected Amount (₹)': v.collectedAmount || 0,
      'Payment Mode': v.collectedAmount > 0 ? v.paymentMethod : '—',
      'PTP Amount (₹)': v.ptpAmount || 0,
      'Promised PTP Date': v.ptpDate ? new Date(v.ptpDate).toLocaleDateString('en-IN') : '—',
      'Field Staff': v.staffId?.name || 'Unassigned',
      'Staff Contact': v.staffId?.phone || 'N/A',
      'Staff Area': v.staffId?.assignedArea || 'N/A',
      'GPS Verification Status': v.verificationStatus || 'N/A',
      'Distance (m)': v.distanceMetres ? `${Math.round(v.distanceMetres)}m` : '—',
      'Notes': v.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Visits');
    XLSX.writeFile(wb, `FieldFlow_Daily_Visits_Report_${reportStartDate}_to_${reportEndDate}.xlsx`);
  };

  // Download Collection Performance Model as formatted Excel (.xlsx)
  const downloadCollectionModelExcel = () => {
    if (!reportPerformanceMatrix || reportPerformanceMatrix.length === 0) {
      setErrorMsg('No staff collection performance data available for current selection.');
      return;
    }

    const headers = [
      'FS NAME',
      'Sum of POS',
      'Count of POS',
      'Sum of COLLECTION',
      'TARGET',
      'DRR',
      'YET TO GO',
      'ACH%',
    ];

    const rows = reportPerformanceMatrix.map((r) => [
      r.fsName || 'Staff Member',
      r.sumOfPos || 0,
      r.countOfPos || 0,
      r.sumOfCollection || 0,
      r.target || 0,
      r.drr || 0,
      r.yetToGo || 0,
      `${r.achPercent || 0}%`,
    ]);

    const total = reportPerformanceGrandTotal || {
      sumOfPos: 0,
      countOfPos: 0,
      sumOfCollection: 0,
      target: 0,
      drr: 0,
      yetToGo: 0,
      achPercent: 0,
    };

    const totalRow = [
      'Grand Total',
      total.sumOfPos,
      total.countOfPos,
      total.sumOfCollection,
      total.target,
      total.drr,
      total.yetToGo,
      `${total.achPercent}%`,
    ];

    const aoa = [headers, ...rows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!cols'] = [
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collection Report');
    XLSX.writeFile(wb, `FieldFlow_Collection_Report_Model_${reportStartDate}_to_${reportEndDate}.xlsx`);
  };

  // Export Collection Performance Model as CSV
  const exportCollectionModelCSV = () => {
    if (!reportPerformanceMatrix || reportPerformanceMatrix.length === 0) {
      setErrorMsg('No staff collection performance data available for current selection.');
      return;
    }
    const headers = ['FS NAME', 'Sum of POS', 'Count of POS', 'Sum of COLLECTION', 'TARGET', 'DRR', 'YET TO GO', 'ACH%'];
    const rows = reportPerformanceMatrix.map((r) => [
      `"${r.fsName || 'Staff'}"`,
      r.sumOfPos || 0,
      r.countOfPos || 0,
      r.sumOfCollection || 0,
      r.target || 0,
      r.drr || 0,
      r.yetToGo || 0,
      `"${r.achPercent || 0}%"`,
    ]);
    const total = reportPerformanceGrandTotal || { sumOfPos: 0, countOfPos: 0, sumOfCollection: 0, target: 0, drr: 0, yetToGo: 0, achPercent: 0 };
    const totalRow = [
      '"Grand Total"',
      total.sumOfPos,
      total.countOfPos,
      total.sumOfCollection,
      total.target,
      total.drr,
      total.yetToGo,
      `"${total.achPercent}%"`,
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(',')), totalRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldFlow_Collection_Report_Model_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Daily Visit Time-Slot Matrix as 2-tier formatted Excel (.xlsx)
  const downloadDailyVisitModelExcel = () => {
    if (!reportTimeSlotMatrix || reportTimeSlotMatrix.length === 0) {
      setErrorMsg('No daily visit slot matrix data available for current selection.');
      return;
    }

    const slots = ['9-11', '11-1', '1-3', '3-5', '5-6'];
    const pCols = ['KB', 'SC', 'NAVI', 'MV'];

    const headerRow1 = [
      'FE NAME',
      '9-11', '', '', '',
      '11-1', '', '', '',
      '1-3', '', '', '',
      '3-5', '', '', '',
      '5-6', '', '', '',
      'TOTAL',
    ];

    const headerRow2 = [
      '',
      ...slots.flatMap(() => pCols),
      '',
    ];

    const dataRows = reportTimeSlotMatrix.map((r) => [
      r.feName || 'Staff Member',
      ...slots.flatMap((s) => pCols.map((p) => r.slots[s]?.[p] ?? (r.isAbsent ? 'AB' : 0))),
      r.totalVisits || 0,
    ]);

    const totalRow = [
      'TOTAL',
      ...slots.flatMap((s) => pCols.map((p) => reportColumnTotals[s]?.[p] ?? 0)),
      reportGrandTotalVisits || 0,
    ];

    const aoa = [headerRow1, headerRow2, ...dataRows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },
      { s: { r: 0, c: 9 }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } },
      { s: { r: 0, c: 17 }, e: { r: 0, c: 20 } },
      { s: { r: 0, c: 21 }, e: { r: 1, c: 21 } },
    ];

    ws['!cols'] = [
      { wch: 18 },
      ...Array(20).fill({ wch: 6 }),
      { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Visits Matrix');
    XLSX.writeFile(wb, `FieldFlow_Daily_Visit_Report_Model_${reportStartDate}.xlsx`);
  };

  // Export Daily Visit Time-Slot Matrix as CSV
  const exportDailyVisitModelCSV = () => {
    if (!reportTimeSlotMatrix || reportTimeSlotMatrix.length === 0) {
      setErrorMsg('No daily visit slot matrix data available for current selection.');
      return;
    }
    const slots = ['9-11', '11-1', '1-3', '3-5', '5-6'];
    const pCols = ['KB', 'SC', 'NAVI', 'MV'];

    const headerRow1 = [
      'FE NAME',
      '9-11', '', '', '',
      '11-1', '', '', '',
      '1-3', '', '', '',
      '3-5', '', '', '',
      '5-6', '', '', '',
      'TOTAL',
    ];
    const headerRow2 = [
      '',
      ...slots.flatMap(() => pCols),
      '',
    ];
    const dataRows = reportTimeSlotMatrix.map((r) => [
      `"${r.feName || 'Staff'}"`,
      ...slots.flatMap((s) => pCols.map((p) => {
        const val = r.slots[s]?.[p];
        return val !== undefined ? val : (r.isAbsent ? 'AB' : 0);
      })),
      r.totalVisits || 0,
    ]);
    const totalRow = [
      '"TOTAL"',
      ...slots.flatMap((s) => pCols.map((p) => reportColumnTotals[s]?.[p] ?? 0)),
      reportGrandTotalVisits || 0,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow1.join(','), headerRow2.join(','), ...dataRows.map((e) => e.join(',')), totalRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldFlow_Daily_Visit_Report_Model_${reportStartDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle processing & sharing canvas image to WhatsApp
  const processImageForWhatsApp = async (imageData, { title, recipientName, phone }) => {
    if (!imageData) return;

    // 1. Automatically copy high-res PNG photo to clipboard
    try {
      if (imageData?.blob && window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageData.blob }),
        ]);
      }
    } catch (err) {
      console.warn('Clipboard image auto-copy:', err);
    }

    // 2. Open WhatsApp Photo Share Modal with preview
    setWhatsAppModal({
      isOpen: true,
      imageData,
      title,
      recipientName,
      phone,
    });
  };

  // Share active report formatted summary via WhatsApp as a Photo Card
  const shareReportViaWhatsApp = async () => {
    const dateLabel = reportDateRange === 'today' ? 'Today' : reportDateRange === 'yesterday' ? 'Yesterday' : reportDateRange === 'this_month' ? 'This Month' : `${reportStartDate} to ${reportEndDate}`;

    let imageData = null;
    let title = 'FieldFlow Report';

    if (reportType === 'collections') {
      if (collectionSubView === 'model') {
        title = `Collection Report (${dateLabel})`;
        imageData = await generateCollectionModelImage({
          period: dateLabel,
          total: reportPerformanceGrandTotal || {},
          rows: reportPerformanceMatrix || [],
        });
      } else {
        const totalAmount = reportCollections.reduce((sum, c) => sum + (c.amount || 0), 0);
        const verifiedCount = reportCollections.filter((c) => c.status === 'approved' || c.status === 'verified').length;
        title = `Collection Ledger Report (${dateLabel})`;
        imageData = await generateCollectionLedgerImage({
          period: dateLabel,
          totalAmount,
          totalCount: reportCollections.length,
          verifiedCount,
          rows: reportCollections,
        });
      }
    } else {
      if (visitSubView === 'model') {
        title = `Daily Visit Update (${reportStartDate})`;
        imageData = await generateVisitModelImage({
          date: reportStartDate,
          totalVisits: reportGrandTotalVisits || 0,
          rows: reportTimeSlotMatrix || [],
          columnTotals: reportColumnTotals || {},
          grandTotalVisits: reportGrandTotalVisits || 0,
        });
      } else {
        title = `Daily Visits Summary (${dateLabel})`;
        imageData = await generateVisitSummaryImage({
          period: dateLabel,
          totalVisits: reportVisits.length,
          rows: reportVisits,
        });
      }
    }

    if (imageData) {
      await processImageForWhatsApp(imageData, {
        title,
        recipientName: 'Field Team Report',
        phone: '',
      });
    }
  };

  // Share individual officer performance directly to officer on WhatsApp as a Photo Card
  const shareStaffPerformanceWhatsApp = async (row) => {
    const staffObj = staffList.find((s) => s._id === row.staffId || s.name === row.fsName || s.name === row.feName);
    const phone = row.phone || staffObj?.phone || '';
    const imageData = await generateStaffPerformanceImage(row);
    if (imageData) {
      await processImageForWhatsApp(imageData, {
        title: `Performance Update: ${row.fsName}`,
        recipientName: row.fsName,
        phone,
      });
    }
  };

  // Share individual officer daily visit counts on WhatsApp as a Photo Card
  const shareStaffVisitWhatsApp = async (row) => {
    const staffObj = staffList.find((s) => s._id === row.staffId || s.name === row.fsName || s.name === row.feName);
    const phone = row.phone || staffObj?.phone || '';
    const imageData = await generateStaffVisitImage(row, reportStartDate);
    if (imageData) {
      await processImageForWhatsApp(imageData, {
        title: `Daily Visits: ${row.feName}`,
        recipientName: row.feName,
        phone,
      });
    }
  };

  // Toggle inline Navi edit mode
  const handleToggleNaviEditMode = () => {
    if (!isEditingNavi) {
      const initial = {};
      reportTimeSlotMatrix.forEach((r) => {
        initial[r.staffId] = {
          '9-11': r.slots?.['9-11']?.['NAVI'] === 'AB' ? 0 : Number(r.slots?.['9-11']?.['NAVI']) || 0,
          '11-1': r.slots?.['11-1']?.['NAVI'] === 'AB' ? 0 : Number(r.slots?.['11-1']?.['NAVI']) || 0,
          '1-3': r.slots?.['1-3']?.['NAVI'] === 'AB' ? 0 : Number(r.slots?.['1-3']?.['NAVI']) || 0,
          '3-5': r.slots?.['3-5']?.['NAVI'] === 'AB' ? 0 : Number(r.slots?.['3-5']?.['NAVI']) || 0,
          '5-6': r.slots?.['5-6']?.['NAVI'] === 'AB' ? 0 : Number(r.slots?.['5-6']?.['NAVI']) || 0,
        };
      });
      setNaviEditData(initial);
      setIsEditingNavi(true);
    } else {
      setIsEditingNavi(false);
    }
  };

  // Handle cell edit for Navi counts
  const handleNaviCellChange = (staffId, slot, value) => {
    const parsed = Math.max(0, parseInt(value || 0, 10));
    setNaviEditData((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { '9-11': 0, '11-1': 0, '1-3': 0, '3-5': 0, '5-6': 0 }),
        [slot]: isNaN(parsed) ? 0 : parsed,
      },
    }));
  };

  // Save all inline Navi counts in bulk
  const handleSaveAllNaviCounts = async () => {
    setSavingNavi(true);
    try {
      const entries = Object.entries(naviEditData).map(([staffId, slots]) => ({
        staffId,
        slots,
      }));
      await apiFetch('/api/admin/reports/external-visits/bulk', {
        method: 'POST',
        body: JSON.stringify({
          date: reportStartDate,
          portfolioCode: 'NAVI',
          entries,
        }),
      });
      setIsEditingNavi(false);
      await fetchReports();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingNavi(false);
    }
  };

  // Save single staff Navi count modal
  const handleSaveSingleNaviModal = async (e) => {
    if (e) e.preventDefault();
    if (!naviModalForm.staffId) {
      setErrorMsg('Please select a Field Staff member.');
      return;
    }
    setSavingNavi(true);
    try {
      await apiFetch('/api/admin/reports/external-visits', {
        method: 'POST',
        body: JSON.stringify({
          date: reportStartDate,
          staffId: naviModalForm.staffId,
          portfolioCode: 'NAVI',
          slots: naviModalForm.slots,
          notes: naviModalForm.notes,
        }),
      });
      setShowNaviModal(false);
      await fetchReports();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingNavi(false);
    }
  };

  // Save manual visit/collection entry for field staff
  const handleSaveStaffRecord = async (e) => {
    if (e) e.preventDefault();
    if (!recordStaffForm.staffId) {
      setErrorMsg('Please select a Field Staff member.');
      return;
    }
    if (!recordStaffForm.customerId) {
      setErrorMsg('Please select a Customer case.');
      return;
    }
    setRecordingStaffData(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/admin/visits/record', {
        method: 'POST',
        body: JSON.stringify(recordStaffForm),
      });
      setSuccessMsg(data.message || 'Record successfully added for field staff!');
      setShowRecordStaffModal(false);
      setRecordStaffForm({
        staffId: '',
        customerId: '',
        outcome: 'Payment Collected',
        collectedAmount: '',
        paymentMethod: 'Cash',
        paymentReference: '',
        paymentStatus: 'APPROVED',
        ptpAmount: '',
        ptpDate: '',
        notes: '',
        visitDate: new Date().toISOString().slice(0, 16),
      });
      if (activeTab === 'reports') fetchReports();
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRecordingStaffData(false);
    }
  };

  // Actions
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setSuccessMsg('Staff member successfully registered!');
      setShowCreateStaffModal(false);
      setStaffForm({ name: '', phone: '', employeeId: '', team: 'Field Operations', assignedArea: 'Kozhikode Central' });
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Upload document file to backend /api/upload/document
  const uploadDocumentFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const finalUrl = `${API_BASE_URL}/api/upload/document`;
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'File upload failed');
    }
    return data;
  };

  // Parse uploaded spreadsheet (.xlsx, .xls, .csv) or document (.doc, .docx, .pdf, .txt)
  const handleFileSelected = async (file) => {
    if (!file) return;
    setImportFile(file);
    setParsingFile(true);
    setParseError('');
    setDocumentNote('');
    setParsedCases([]);

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('No data rows found in spreadsheet.');
        }

        const clean = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanNum = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };

        const mapped = rawRows.map((row, idx) => {
          const keys = Object.keys(row);

          const findVal = (patterns, excludePatterns = []) => {
            // Pass 1: Exact match with clean pattern
            for (const p of patterns) {
              const cleanP = clean(p);
              for (const key of keys) {
                const ck = clean(key);
                if (excludePatterns.some((ep) => ck.includes(clean(ep)))) continue;
                if (ck === cleanP) {
                  const val = row[key];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }

            // Pass 2: Starts with pattern
            for (const p of patterns) {
              const cleanP = clean(p);
              for (const key of keys) {
                const ck = clean(key);
                if (excludePatterns.some((ep) => ck.includes(clean(ep)))) continue;
                if (ck.startsWith(cleanP)) {
                  const val = row[key];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }

            // Pass 3: Substring match
            for (const p of patterns) {
              const cleanP = clean(p);
              for (const key of keys) {
                const ck = clean(key);
                if (excludePatterns.some((ep) => ck.includes(clean(ep)))) continue;
                if (ck.includes(cleanP)) {
                  const val = row[key];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }
            return '';
          };

          // 1. Loan Account / Loan ID (kbloanid, loanid, loanaccountno, etc.)
          const loanAccountNo =
            findVal(
              ['kbloanid', 'loanid', 'loanaccountno', 'loanaccno', 'loanaccount', 'accountno', 'loanacct', 'loanac', 'accountnumber', 'acno', 'acctno', 'lan', 'caseid', 'account', 'loan'],
              ['loanam', 'loanamt', 'loanamount', 'amount', 'amt', 'due', 'emi', 'tos', 'pos']
            ) || `LON-${Date.now().toString().slice(-4)}-${idx + 1}`;

          // 2. Customer Name (cx name, cx_name, customername, client, borrower, name)
          const name =
            findVal(
              ['cxname', 'cx_name', 'customername', 'custname', 'borrowername', 'clientname', 'partyname', 'cx', 'borrower', 'client', 'customer', 'cust', 'name'],
              ['father', 'mother', 'spouse', 'branch', 'bank']
            ) || `Customer ${idx + 1}`;

          // 3. Phone Number (PHN NO, phnno, phno, phone, mobile, contact, cell)
          let rawPhone = findVal(['phnno', 'phno', 'phnum', 'phnumber', 'phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'cell', 'cellno', 'phn', 'mob']);
          let phone = String(rawPhone || '').trim();
          if (phone.endsWith('.0')) phone = phone.slice(0, -2);
          phone = phone.replace(/[^\d+]/g, '');

          // 4. Outstanding Amount (TOS, totaloutstanding, outstanding, balance, pos, dueamount, amount)
          const rawOutstanding = findVal(['tos', 'totaloutstanding', 'outstandingamount', 'outstanding', 'totaldue', 'pos', 'principaloutstanding', 'balanceamount', 'balance', 'dueamount', 'overdueamount', 'amount']);
          const outstandingAmount = cleanNum(rawOutstanding);

          // 5. Principal Outstanding (POS)
          const rawPos = findVal(['pos', 'principaloutstanding', 'principaldue', 'principal']);
          const pos = cleanNum(rawPos);

          // 6. Loan Sanctioned / Disbursed Amount (loan_am, loanam, loanamount)
          const rawLoanAmount = findVal(['loanam', 'loanamt', 'loanamount', 'disbursedamount', 'sanctionedamount', 'loanvalue'], ['loanaccount', 'loanid', 'kbloanid']);
          const loanAmount = cleanNum(rawLoanAmount);

          // 7. EMI Amount (emi, emiamount, installment)
          const rawEmi = findVal(['emiamount', 'emi', 'monthlyemi', 'installment', 'installmentamount']);
          const emiAmount = cleanNum(rawEmi);

          // 8. DPD (Days Past Due) (DPD, dayspastdue, overduedays, bucket)
          const rawDpd = findVal(['dpd', 'dayspastdue', 'overduedays', 'bucket', 'agedays']);
          const dpd = cleanNum(rawDpd);

          // 9. Pincode (permane, permanentpincode, pincode, postalcode, pin, zip)
          const rawPincode = findVal(['permane', 'permanentpincode', 'pincode', 'postalcode', 'pin', 'zip', 'zipcode']);
          const pincode = String(rawPincode || '').trim();

          // 10. City / District (permanent_, permanentcity, permanentdistrict, city, district, town)
          const rawCity = findVal(['permanent_', 'permanentcity', 'permanentdistrict', 'city', 'district', 'town', 'permanent']);
          const city = rawCity || 'Kozhikode';

          // 11. Address (ADDRESS, customeraddress, residence, addr)
          let address = findVal(['address', 'customeraddress', 'fulladdress', 'residenceaddress', 'residence', 'addr']) || 'Address on record';
          if (pincode && !address.includes(pincode)) {
            address = `${address}, PIN: ${pincode}`;
          }

          // 12. Area (area, locality, location, region) or auto-extract from address
          let area = findVal(['area', 'locality', 'location', 'region']);
          if (!area && address.toLowerCase().includes('vadakara')) area = 'Vadakara';
          else if (!area && address.toLowerCase().includes('koyilandy')) area = 'Koyilandy';
          else if (!area && address.toLowerCase().includes('kozhikode')) area = 'Kozhikode';
          else if (!area && pincode) area = `PIN ${pincode}`;

          return {
            name,
            phone,
            loanAccountNo,
            address,
            area,
            city,
            pincode,
            outstandingAmount: outstandingAmount || (pos || loanAmount || 0),
            emiAmount,
            dpd,
            pos,
            loanAmount,
          };
        });

        setParsedCases(mapped);
      } catch (err) {
        setParseError(err.message || 'Failed to parse spreadsheet file.');
      } finally {
        setParsingFile(false);
      }
    } else if (fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx') || fileName.endsWith('.txt')) {
      try {
        if (fileName.endsWith('.txt')) {
          const text = await file.text();
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const detected = [];
          for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].includes('\t') ? lines[i].split('\t') : lines[i].split(',');
            if (parts.length >= 3) {
              detected.push({
                name: parts[0]?.trim() || `Customer ${i + 1}`,
                phone: parts[1]?.trim() || '',
                loanAccountNo: parts[2]?.trim() || `LON-${i + 1}`,
                address: parts[3]?.trim() || 'Address on record',
                area: parts[4]?.trim() || '',
                city: 'Kozhikode',
                outstandingAmount: Number(parts[5]?.trim() || 0),
                emiAmount: Number(parts[6]?.trim() || 0),
              });
            }
          }
          if (detected.length > 0) {
            setParsedCases(detected);
          } else {
            setDocumentNote(`File "${file.name}" uploaded. Document will be attached to case records.`);
          }
        } else {
          setDocumentNote(`Document file "${file.name}" ready to upload and attach to case records.`);
        }
      } catch (err) {
        setParseError('Error processing document: ' + err.message);
      } finally {
        setParsingFile(false);
      }
    } else {
      setParseError('Unsupported format. Please select an Excel file (.xlsx, .xls), CSV (.csv), Word (.doc, .docx) or PDF (.pdf).');
      setParsingFile(false);
    }
  };

  // Confirm Batch File Import
  const handleConfirmBatchImport = async (e) => {
    if (e) e.preventDefault();
    if (parsedCases.length === 0 && !importFile) return;
    setImporting(true);
    setErrorMsg('');
    try {
      let uploadedDocMeta = null;
      if (importFile) {
        try {
          uploadedDocMeta = await uploadDocumentFile(importFile);
        } catch (uploadErr) {
          console.warn('Document upload warning:', uploadErr);
        }
      }

      if (parsedCases.length > 0) {
        const casesWithDoc = parsedCases.map((c) => ({
          ...c,
          batchMonth: importBatchMonth,
          assignedStaffId: importDefaultStaff || undefined,
          documents: uploadedDocMeta
            ? [
                {
                  name: uploadedDocMeta.originalName,
                  url: uploadedDocMeta.fileUrl,
                  fileType: uploadedDocMeta.fileType,
                  size: uploadedDocMeta.size,
                },
              ]
            : [],
        }));

        const data = await apiFetch('/api/admin/cases/import', {
          method: 'POST',
          body: JSON.stringify({
            cases: casesWithDoc,
            batchMonth: importBatchMonth,
            defaultStaffId: importDefaultStaff || undefined,
          }),
        });

        setSuccessMsg(data.message || `Successfully imported ${parsedCases.length} customer cases!`);
      } else if (uploadedDocMeta) {
        setSuccessMsg(`Document "${uploadedDocMeta.originalName}" uploaded successfully to server.`);
      }

      setShowImportModal(false);
      setImportFile(null);
      setParsedCases([]);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Download Excel Sample Template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'Customer Name': 'Mohammed Shafi',
        'Phone Number': '9847123456',
        'Loan Account No': 'LON-2026-901',
        'Address': 'Shafi Manzil, Near Beach Road, Kozhikode',
        'Area': 'Beach Road',
        'City': 'Kozhikode',
        'Outstanding Amount': 24500,
        'EMI Amount': 3500,
      },
      {
        'Customer Name': 'Anjali Menon',
        'Phone Number': '9447654321',
        'Loan Account No': 'LON-2026-902',
        'Address': 'Menon Villa, Mavoor Road, Kozhikode',
        'Area': 'Mavoor Road',
        'City': 'Kozhikode',
        'Outstanding Amount': 18000,
        'EMI Amount': 2800,
      },
      {
        'Customer Name': 'Pradeep Kumar',
        'Phone Number': '9745112233',
        'Loan Account No': 'LON-2026-903',
        'Address': 'Devi Nilayam, Thondayad Bypass, Kozhikode',
        'Area': 'Thondayad',
        'City': 'Kozhikode',
        'Outstanding Amount': 42000,
        'EMI Amount': 6000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases');
    XLSX.writeFile(wb, 'FieldFlow_Customer_Cases_Template.xlsx');
  };

  // Upload document for single customer form
  const handleSingleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSingleDoc(true);
    try {
      const data = await uploadDocumentFile(file);
      setCustomerForm((prev) => ({
        ...prev,
        documents: [
          ...(prev.documents || []),
          {
            name: data.originalName,
            url: data.fileUrl,
            fileType: data.fileType,
            size: data.size,
          },
        ],
      }));
      setSuccessMsg(`Document "${data.originalName}" attached!`);
    } catch (err) {
      setErrorMsg('Failed to upload document: ' + err.message);
    } finally {
      setUploadingSingleDoc(false);
      e.target.value = '';
    }
  };

  const handleRemoveSingleDoc = (idx) => {
    setCustomerForm((prev) => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== idx),
    }));
  };

  // Create Single Customer Case
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(customerForm),
      });
      setSuccessMsg('Customer case created successfully!');
      setShowCreateCustomerModal(false);
      setShowImportModal(false);
      setCustomerForm({
        name: '',
        phone: '',
        loanAccountNo: '',
        address: '',
        area: '',
        city: 'Kozhikode',
        outstandingAmount: '',
        emiAmount: '',
        assignedStaff: '',
        batchMonth: 'OCT-2026',
        documents: [],
      });
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Customer File & Photo Handlers for Modal
  const handleSelectDocFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    // Populate default title from filename
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setDocTitle(baseName);

    if (file.type?.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setDocPreviewUrl(preview);
      setDocCategory('Customer Photo');
    } else {
      setDocPreviewUrl('');
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setDocCategory('Loan Agreement');
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)) {
        setDocCategory('Other Document');
      }
    }
  };

  const handleClearSelectedDoc = () => {
    setDocFile(null);
    setDocPreviewUrl('');
    setDocTitle('');
    setDocNotes('');
    setDocCategory('Customer Photo');
    if (docModalInputRef.current) docModalInputRef.current.value = '';
  };

  const handleSubmitCustomerDoc = async (e) => {
    if (e) e.preventDefault();
    if (!docFile || !selectedCustomerForDoc) {
      setErrorMsg('Please select a photo or document file to upload.');
      return;
    }
    setUploadingDocModal(true);
    try {
      const uploaded = await uploadDocumentFile(docFile);
      const titleToSave = docTitle.trim() || uploaded.originalName;
      const res = await apiFetch(`/api/admin/customers/${selectedCustomerForDoc._id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          name: titleToSave,
          url: uploaded.fileUrl,
          fileType: uploaded.fileType,
          size: uploaded.size,
          category: docCategory,
          notes: docNotes.trim(),
        }),
      });
      const newDoc = res.document || {
        name: titleToSave,
        url: uploaded.fileUrl,
        fileType: uploaded.fileType,
        size: uploaded.size,
        category: docCategory,
        notes: docNotes.trim(),
        uploadedAt: new Date(),
      };
      setSuccessMsg(`"${titleToSave}" attached to ${selectedCustomerForDoc.name}!`);
      setSelectedCustomerForDoc((prev) => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc],
      }));
      handleClearSelectedDoc();
      loadData();
    } catch (err) {
      setErrorMsg('Failed to attach document: ' + err.message);
    } finally {
      setUploadingDocModal(false);
    }
  };

  const handleDeleteCustomerDoc = async (docId) => {
    if (!selectedCustomerForDoc) return;
    if (!window.confirm('Are you sure you want to remove this file/photo record?')) return;
    try {
      await apiFetch(`/api/admin/customers/${selectedCustomerForDoc._id}/documents/${docId}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Record removed successfully.');
      setSelectedCustomerForDoc((prev) => ({
        ...prev,
        documents: (prev.documents || []).filter((d) => d._id !== docId && d.url !== docId),
      }));
      loadData();
    } catch (err) {
      setErrorMsg('Failed to remove record: ' + err.message);
    }
  };

  // Raw JSON import fallback
  const handleImportCases = async (e) => {
    e.preventDefault();
    try {
      let parsed;
      try {
        parsed = JSON.parse(importJsonText);
      } catch {
        throw new Error('Please input valid JSON array format for batch customer import.');
      }
      const data = await apiFetch('/api/admin/cases/import', {
        method: 'POST',
        body: JSON.stringify({ cases: parsed, batchMonth: 'OCT-2026' }),
      });
      setSuccessMsg(data.message);
      setShowImportModal(false);
      setImportJsonText('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReviewSuspicious = async (status) => {
    if (!selectedSuspicious) return;
    try {
      await apiFetch(`/api/visits/suspicious/${selectedSuspicious._id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewStatus: status, reviewNotes }),
      });
      setSuccessMsg(`Suspicious visit review recorded (${status}).`);
      setSelectedSuspicious(null);
      setReviewNotes('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleVerifyPayment = async (action) => {
    if (!selectedPayment) return;
    try {
      await apiFetch(`/api/admin/collections/${selectedPayment._id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ action, rejectionReason: rejectReason }),
      });
      setSuccessMsg(`Payment ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      setSelectedPayment(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReassignStaff = async (staffId) => {
    if (!reassignModal) return;
    try {
      await apiFetch('/api/admin/staff/reassign', {
        method: 'POST',
        body: JSON.stringify({ customerIds: [reassignModal._id], targetStaffId: staffId }),
      });
      setSuccessMsg('Case successfully reassigned.');
      setReassignModal(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setIsTogglingStatus(true);
    try {
      await apiFetch(`/api/admin/staff/${staffId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessMsg(`Staff status successfully updated to ${newStatus}.`);
      loadData();
      apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
      setStatusConfirmStaff(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleReviewStaff = async (staffId, action, assignedArea = '', rejectionReason = '') => {
    try {
      const data = await apiFetch(`/api/admin/staff/${staffId}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          action,
          assignedArea: assignedArea || undefined,
          rejectionReason: rejectionReason || undefined,
        }),
      });
      setSuccessMsg(data.message || `Staff registration ${action === 'APPROVE' ? 'approved' : 'declined'}.`);
      loadData();
      apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateStaffDetails = async (staffId, payload) => {
    setIsUpdatingStaff(true);
    try {
      const data = await apiFetch(`/api/admin/staff/${staffId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setSuccessMsg(data.message || 'Staff details updated successfully.');
      setEditingStaff(null);
      loadData();
      apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsUpdatingStaff(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      setSuccessMsg('Settings updated successfully!');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // CSV Export Generators
  const exportCasesCSV = () => {
    if (!customers.length) return;
    const headers = ['Name', 'Loan Account', 'Phone', 'Address', 'Area', 'Outstanding Amount', 'EMI Amount', 'Status', 'Batch Month'];
    const rows = customers.map(c => [
      `"${c.name}"`,
      `"${c.loanAccountNo}"`,
      `"${c.phone}"`,
      `"${c.address?.replace(/"/g, '""')}"`,
      `"${c.area || ''}"`,
      c.outstandingAmount || 0,
      c.emiAmount || 0,
      c.status,
      c.batchMonth || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldFlow_Cases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCollectionsCSV = () => {
    if (!collections.length) return;
    const headers = ['Customer', 'Loan Account', 'Collected Amount', 'Payment Method', 'Reference', 'Status', 'Staff Agent', 'Date'];
    const rows = collections.map(col => [
      `"${col.customerId?.name || 'Customer'}"`,
      `"${col.customerId?.loanAccountNo || ''}"`,
      col.collectedAmount || 0,
      col.paymentMethod,
      `"${col.paymentReference || ''}"`,
      col.paymentStatus,
      `"${col.staffId?.name || ''}"`,
      new Date(col.createdAt).toLocaleDateString(),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FieldFlow_Collections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    if (customerStaffFilter !== 'ALL') {
      if (customerStaffFilter === 'UNASSIGNED') {
        result = result.filter(c => !c.assignedStaff || (!c.assignedStaff._id && !c.assignedStaff.name));
      } else {
        result = result.filter(c => {
          const sId = c.assignedStaff?._id || c.assignedStaff;
          return String(sId) === String(customerStaffFilter);
        });
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.loanAccountNo?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.assignedStaff?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [customers, statusFilter, customerStaffFilter, searchQuery]);

  // LOGIN SCREEN
  if (!token || !adminUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, rgba(14, 165, 233, 0.15) 0%, #0f172a 75%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.12) 0%, transparent 70%)',
          top: '-150px',
          pointerEvents: 'none'
        }} />

        <div className="card login-card" style={{
          maxWidth: '440px',
          width: '100%',
          padding: '36px 32px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
              color: '#fff',
              borderRadius: '14px',
              padding: '12px',
              display: 'flex',
              boxShadow: '0 8px 16px -4px rgba(13, 148, 136, 0.35)'
            }}>
              <LayoutDashboard size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.4px', margin: 0 }}>FieldFlow</h1>
                <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 7px', background: '#ecfeff', color: '#0891b2', borderRadius: '12px', border: '1px solid #cffafe', textTransform: 'uppercase' }}>Admin</span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>Operations & Recovery Portal</p>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Field: Mobile Number */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#1e293b', letterSpacing: '0.2px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
                  <Phone size={17} />
                </span>
                <input
                  type="text"
                  id="adminLoginPhone"
                  name="adminLoginPhone"
                  className="input-field"
                  style={{ width: '100%', height: '46px', paddingLeft: '38px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="Enter administrator mobile number"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b', letterSpacing: '0.2px' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}>
                  <Lock size={17} />
                </span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  id="adminLoginPassword"
                  name="adminLoginPassword"
                  className="input-field"
                  style={{ width: '100%', height: '46px', paddingLeft: '38px', paddingRight: '40px', borderRadius: '10px', fontSize: '14px', border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', display: 'flex' }}
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                fontSize: '14.5px',
                fontWeight: '700',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                borderColor: '#0d9488',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN LOGGED-IN APPLICATION LAYOUT
  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`drawer-backdrop ${mobileDrawerOpen ? 'drawer-open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileDrawerOpen ? 'drawer-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-badge">
            <div className="brand-icon-box">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <div className="brand-title">FieldFlow</div>
              <div className="brand-sub">Operations</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-collapse-desktop-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar collapse"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="sidebar-close-btn" onClick={() => setMobileDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'portfolios', label: 'Portfolios', icon: Layers, badge: portfolios?.length, badgeColor: 'info' },
            { id: 'cases', label: 'Cases & Recovery', icon: Briefcase, badge: stats?.pendingCases },
            { id: 'customers', label: 'Customer Details', icon: Users },
            { id: 'locations', label: 'Customer Locations', icon: MapPin },
            { id: 'suspicious', label: 'Suspicious Visits', icon: AlertTriangle, badge: stats?.suspiciousCount, badgeColor: 'danger' },
            { id: 'collections', label: 'Payment Verification', icon: CreditCard, badge: stats?.pendingPaymentVerifications, badgeColor: 'warning' },
            { id: 'ptp', label: 'PTP Commitments', icon: Clock, badge: stats?.ptpCases },
            { id: 'nonworkable', label: 'Non-Workable Cases', icon: UserX, badge: stats?.nonWorkableCases },
            { id: 'approvals', label: 'Staff Approvals', icon: UserCheck, badge: stats?.pendingStaffApprovals, badgeColor: 'warning' },
            { id: 'staff', label: 'Staff Directory', icon: Briefcase },
            { id: 'reports', label: 'Reports & Export', icon: FileText },
            { id: 'audit', label: 'Audit Logs', icon: FileCheck },
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
                <div className="nav-item-left">
                  <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className={`badge ${item.badgeColor === 'danger' ? 'badge-danger' : item.badgeColor === 'warning' ? 'badge-warning' : 'badge-info'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="sidebar-user">
          <div className="user-card-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-avatar-circle">
                {((adminUser.name === 'System Super Admin' ? 'System Admin' : adminUser.name) || 'S').substring(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>
                  {adminUser.name === 'System Super Admin' ? 'System Admin' : (adminUser.name || 'System Admin')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Role: {adminUser.role.toUpperCase()}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sign Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sticky Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setMobileDrawerOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="page-title">
              {activeTab === 'dashboard' ? 'Operations Dashboard' :
               activeTab === 'portfolios' ? 'Portfolios' :
               activeTab === 'cases' ? 'Cases & Recovery' :
               activeTab === 'approvals' ? 'Staff Approvals' :
               activeTab === 'customers' ? 'Customer Details' :
               activeTab === 'locations' ? 'Customer Locations' :
               activeTab === 'suspicious' ? 'Suspicious Visits' :
               activeTab === 'staff' ? 'Staff Directory' :
               activeTab === 'collections' ? 'Collections' :
               activeTab === 'ptp' ? 'PTP Commitments' :
               activeTab === 'nonworkable' ? 'Non-Workable' :
               activeTab === 'reports' ? 'Reports & Export' :
               activeTab === 'audit' ? 'Audit Trail' : 'Settings'}
            </h2>
            <button onClick={loadData} className="btn btn-secondary btn-sm" title="Refresh Data">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="topbar-right">
            {/* Global Portfolio Filter */}
            <div className="topbar-portfolio-box">
              <Layers size={14} color="var(--primary)" />
              <select
                value={selectedGlobalPortfolio}
                onChange={(e) => setSelectedGlobalPortfolio(e.target.value)}
                className="topbar-portfolio-select"
                title="Filter operational views by Portfolio"
              >
                <option value="ALL">All Portfolios</option>
                {portfolios.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-secondary btn-sm topbar-action-btn"
              onClick={() => {
                setBulkImportInitialPortfolio(selectedGlobalPortfolio !== 'ALL' ? selectedGlobalPortfolio : '');
                setShowBulkImportModal(true);
              }}
              title="Bulk import cases via Excel or CSV spreadsheet"
            >
              <UploadCloud size={14} /> <span className="topbar-btn-text">Import</span>
            </button>
            <span className="badge badge-success topbar-status-badge">
              <CheckCircle size={12} /> <span className="topbar-status-text">Online</span>
            </span>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          {successMsg && (
            <div style={{ padding: '12px 16px', background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: '10px', color: 'var(--success-text)', fontSize: '13.5px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success-text)' }}>✕</button>
            </div>
          )}
          {errorMsg && (
            <div style={{ padding: '12px 16px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '10px', color: 'var(--danger-text)', fontSize: '13.5px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)' }}>✕</button>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 1: DASHBOARD */}
          {/* ================================================================ */}
          {activeTab === 'dashboard' && stats && (
            <div>
              {/* PENDING FIELD STAFF REGISTRATION BANNER */}
              {stats.pendingStaffApprovals > 0 && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                    border: '1px solid #FCD34D',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: '#F59E0B',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#92400E' }}>
                        {stats.pendingStaffApprovals} Field Staff Registration{stats.pendingStaffApprovals > 1 ? 's' : ''} Awaiting Review
                      </div>
                      <div style={{ fontSize: '13px', color: '#B45309', marginTop: '2px' }}>
                        Field staff members have submitted verification selfies and GPS coordinates. Authorize accounts to grant mobile app access.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('approvals');
                      setApprovalsFilter('pending');
                    }}
                    className="btn btn-sm btn-primary"
                    style={{
                      background: '#D97706',
                      borderColor: '#B45309',
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Review & Approve Staff <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* 4 PRIMARY KPI CARDS (Responsive Grid) */}
              <div className="kpi-grid" style={{ marginBottom: '24px' }}>
                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Total Customers</span>
                    <div className="kpi-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="kpi-value">{stats.totalCustomers || 1248}</div>
                  <div className="kpi-footer">Mapped accounts portfolio</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Assigned Cases</span>
                    <div className="kpi-icon-wrapper" style={{ background: '#FFFBEB', color: '#D97706' }}>
                      <Briefcase size={18} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: '#D97706' }}>{stats.pendingCases + stats.visitedCases || 842}</div>
                  <div className="kpi-footer">Active recovery workflows</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">Collected (This Month)</span>
                    <div className="kpi-icon-wrapper" style={{ background: '#ECFDF5', color: '#047857' }}>
                      <DollarSign size={18} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: '#047857' }}>
                    ₹{(stats.approvedCollectionAmount || 845200).toLocaleString('en-IN')}
                  </div>
                  <div className="kpi-footer">Reconciled bank collections</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-label">PTP Cases</span>
                    <div className="kpi-icon-wrapper" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: '#7C3AED' }}>{stats.ptpCases || 126}</div>
                  <div className="kpi-footer">Customer commitment promises</div>
                </div>
              </div>

              {/* SECONDARY OPERATIONAL METRIC ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Field Staff</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>{stats.activeStaff} / {stats.totalStaff} Active</div>
                  </div>
                  <span className={`badge ${stats.pendingStaffApprovals > 0 ? 'badge-warning' : 'badge-success'}`}>
                    {stats.pendingStaffApprovals > 0 ? `${stats.pendingStaffApprovals} Pending Approval` : 'All Approved'}
                  </span>
                </div>

                <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Geofence Audits</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: stats.suspiciousCount > 0 ? 'var(--danger-text)' : 'var(--success-text)' }}>
                      {stats.suspiciousCount} Flagged
                    </div>
                  </div>
                  <span className="badge badge-info">100m Precision</span>
                </div>

                <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Verifications</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: 'var(--warning-text)' }}>
                      ₹{stats.pendingCollectionAmount?.toLocaleString('en-IN') || '45,000'}
                    </div>
                  </div>
                  <span className="badge badge-warning">{stats.pendingPaymentVerifications || 3} Receipts</span>
                </div>
              </div>

              {/* TWO MAIN VISUAL CHARTS (Reference Screen 15) */}
              <div className="grid-2" style={{ marginBottom: '24px' }}>
                {/* 1. Collection Trend Bar Chart (Screen 15) */}
                <div className="chart-box">
                  <div className="card-header-row">
                    <div>
                      <h3 className="card-title">Collection Trend</h3>
                      <p className="card-subtitle">Monthly recovery volume (Jan - Jun)</p>
                    </div>
                    <span className="badge badge-success">₹8.45L Run Rate</span>
                  </div>

                  {/* SVG Bar Chart with Emerald Green Bars */}
                  <div style={{ marginTop: '20px', padding: '10px 0' }}>
                    <svg viewBox="0 0 460 200" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="450" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="40" y1="65" x2="450" y2="65" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="40" y1="110" x2="450" y2="110" stroke="#f1f5f9" strokeDasharray="4 4" />
                      <line x1="40" y1="155" x2="450" y2="155" stroke="#e2e8f0" />

                      {/* Y-axis labels */}
                      <text x="32" y="24" textAnchor="end" fontSize="10" fill="#94a3b8">₹10L</text>
                      <text x="32" y="69" textAnchor="end" fontSize="10" fill="#94a3b8">₹7.5L</text>
                      <text x="32" y="114" textAnchor="end" fontSize="10" fill="#94a3b8">₹5L</text>
                      <text x="32" y="159" textAnchor="end" fontSize="10" fill="#94a3b8">₹0</text>

                      {/* Monthly Bars Jan - Jun (Emerald Green #10B981) */}
                      {[
                        { month: 'Jan', val: 55, h: 75, amt: '₹5.2L' },
                        { month: 'Feb', val: 68, h: 92, amt: '₹6.4L' },
                        { month: 'Mar', val: 82, h: 110, amt: '₹7.6L' },
                        { month: 'Apr', val: 74, h: 98, amt: '₹6.8L' },
                        { month: 'May', val: 95, h: 128, amt: '₹8.9L' },
                        { month: 'Jun', val: 90, h: 120, amt: '₹8.45L' },
                      ].map((bar, i) => {
                        const x = 70 + i * 62;
                        const y = 155 - bar.h;
                        return (
                          <g key={bar.month}>
                            <rect
                              x={x}
                              y={y}
                              width="32"
                              height={bar.h}
                              rx="6"
                              fill="#00A86B"
                              style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                            />
                            <text x={x + 16} y="174" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
                              {bar.month}
                            </text>
                            <text x={x + 16} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#047857">
                              {bar.amt}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* 2. Case Status Donut Chart (Screen 15) */}
                <div className="chart-box">
                  <div className="card-header-row">
                    <div>
                      <h3 className="card-title">Case Status Breakdown</h3>
                      <p className="card-subtitle">Resolution distribution across assigned accounts</p>
                    </div>
                    <span className="badge badge-info">{stats.totalCustomers || 842} Cases</span>
                  </div>

                  {/* SVG Donut Ring Chart with Center Text & Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginTop: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                      <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        {/* Segment 1: Visited (Blue #0284c7, 38%) */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#0284c7" strokeWidth="14" strokeDasharray="90 150" strokeDashoffset="0" />
                        {/* Segment 2: Pending (Orange #f59e0b, 25%) */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="14" strokeDasharray="60 180" strokeDashoffset="-90" />
                        {/* Segment 3: Collected (Emerald #00A86B, 21%) */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#00A86B" strokeWidth="14" strokeDasharray="50 190" strokeDashoffset="-150" />
                        {/* Segment 4: PTP (Purple #7c3aed, 10%) */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#7c3aed" strokeWidth="14" strokeDasharray="25 215" strokeDashoffset="-200" />
                        {/* Segment 5: Broken (Red #ef4444, 6%) */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="14" strokeDasharray="15 225" strokeDashoffset="-225" />
                      </svg>
                      {/* Center Total Count (Screen 15) */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <strong style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>
                          {stats.totalCustomers || 842}
                        </strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
                          Total Cases
                        </span>
                      </div>
                    </div>

                    {/* Legend (Screen 15) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#0284c7' }} />
                          Visited
                        </span>
                        <strong>{stats.visitedCases || 320}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }} />
                          Pending
                        </span>
                        <strong>{stats.pendingCases || 210}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
                          Collected
                        </span>
                        <strong>{stats.collectedCases || 180}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#7c3aed' }} />
                          PTP
                        </span>
                        <strong>{stats.ptpCases || 86}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ef4444' }} />
                          Broken PTP
                        </span>
                        <strong>46</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Visits Live Table */}
              <div className="card">
                <div className="card-header-row">
                  <div>
                    <h3 className="card-title">Recent Field Visits Live Stream</h3>
                    <p className="card-subtitle">Real-time submissions from agent mobile devices</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={loadData}>
                    <RefreshCw size={13} /> Refresh Feed
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Staff Agent</th>
                        <th>Outcome</th>
                        <th>Amount</th>
                        <th>GPS Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentVisits.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No recent visits recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        recentVisits.map((v) => (
                          <tr key={v._id}>
                            <td>
                              <strong>{v.customerId?.name || 'Customer'}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.customerId?.loanAccountNo}</div>
                            </td>
                            <td>
                              <div>{v.staffId?.name || 'Staff'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.staffId?.assignedArea}</div>
                            </td>
                            <td>
                              <span className="badge badge-neutral">{v.outcome}</span>
                            </td>
                            <td>
                              {v.collectedAmount > 0 ? (
                                <strong style={{ color: 'var(--success-text)' }}>₹{v.collectedAmount.toLocaleString('en-IN')}</strong>
                              ) : v.ptpAmount > 0 ? (
                                <span style={{ color: 'var(--warning-text)' }}>PTP: ₹{v.ptpAmount.toLocaleString('en-IN')}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${v.verificationStatus === 'LOCATION_MATCHED' ? 'badge-success' : 'badge-danger'}`}>
                                {v.verificationStatus?.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          {/* TAB 2: CUSTOMERS & CASES */}
          {/* ================================================================ */}
          {activeTab === 'customers' && (
            <div>
              <div className="card-header-row" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap', maxWidth: '720px' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="search-input-sm"
                      placeholder="Search customer, account, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="filter-select-sm"
                    style={{ minWidth: '120px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="visited">Visited</option>
                    <option value="collected">Collected</option>
                    <option value="ptp">PTP</option>
                    <option value="broken_ptp">Broken PTP</option>
                  </select>
                  <select
                    className="filter-select-sm"
                    style={{ minWidth: '150px' }}
                    value={customerStaffFilter}
                    onChange={(e) => setCustomerStaffFilter(e.target.value)}
                    title="Filter customers by assigned field staff"
                  >
                    <option value="ALL">All Field Staff ({staffList.length})</option>
                    <option value="UNASSIGNED">Unassigned Cases</option>
                    {staffList.map((stf) => (
                      <option key={stf._id} value={stf._id}>
                        {stf.name} {stf.employeeId ? `(${stf.employeeId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setImportModalTab('file');
                      setShowImportModal(true);
                    }}
                    style={{ gap: '5px' }}
                  >
                    <UploadCloud size={14} /> Import File
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setImportModalTab('single');
                      setShowImportModal(true);
                    }}
                    style={{ gap: '5px' }}
                  >
                    <Plus size={14} /> Add Single Case
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadSampleTemplate}
                    title="Download Excel sample template (.xlsx)"
                    style={{ gap: '5px' }}
                  >
                    <Download size={14} /> Template
                  </button>
                </div>
              </div>

              {(customerViewMode === 'cards' || customerViewMode === 'auto') && (
                /* Mobile Stacked Card View */
                <div className={customerViewMode === 'auto' ? 'responsive-auto-cards' : ''} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredCustomers.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No customer cases match the current filter.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div key={c._id} className="case-mobile-card">
                        <div className="case-card-top">
                          <div>
                            <div className="case-card-name">{c.name}</div>
                            <div className="case-card-loan">A/C: {c.loanAccountNo}</div>
                          </div>
                          <span className={`badge ${c.status === 'collected' ? 'badge-success' : c.status === 'visited' ? 'badge-info' : c.status === 'ptp' ? 'badge-warning' : 'badge-neutral'}`}>
                            {c.status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="case-card-row" style={{ marginTop: '6px' }}>
                          <span className="case-card-label">Phone:</span>
                          <a href={`tel:${c.phone}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {c.phone}
                          </a>
                        </div>

                        <div className="case-card-row">
                          <span className="case-card-label">Address:</span>
                          <span className="case-card-val" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.address} {c.area ? `(${c.area})` : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                            <span style={{ color: '#065F46', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Total Balance: </span>
                            <strong style={{ color: '#047857' }}>₹{c.outstandingAmount?.toLocaleString('en-IN')}</strong>
                          </div>
                          {c.emiAmount > 0 && (
                            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
                              <span style={{ color: '#64748B', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 700 }}>Due EMI: </span>
                              <strong style={{ color: '#334155' }}>₹{c.emiAmount?.toLocaleString('en-IN')}</strong>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '12px', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            Staff: <strong>{c.assignedStaff?.name || 'Unassigned'}</strong>
                          </div>
                          <div>
                            {c.documents && c.documents.length > 0 && (
                              <span className="badge badge-success" style={{ fontSize: '10.5px', gap: '3px' }}>
                                <Image size={11} /> {c.documents.length} File{c.documents.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="case-card-actions" style={{ marginTop: '10px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '4px' }}
                            onClick={() => {
                              handleClearSelectedDoc();
                              setSelectedCustomerForDoc(c);
                            }}
                          >
                            <Image size={13} /> Files & Photos {c.documents?.length > 0 ? `(${c.documents.length})` : ''}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setReassignModal(c)}
                          >
                            Reassign Staff
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {(customerViewMode === 'table' || customerViewMode === 'auto') && (
                /* Desktop / Tablet Table */
                <div className={`table-wrapper table-responsive ${customerViewMode === 'auto' ? 'responsive-auto-table' : ''}`} style={{ marginTop: '16px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Customer & Loan A/C</th>
                        <th>Phone & Contact</th>
                        <th>Address & Area</th>
                        <th>Outstanding Balance</th>
                        <th>Due EMI</th>
                        <th>Status</th>
                        <th>Assigned Staff</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No customer cases match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((c) => (
                          <tr key={c._id}>
                            <td>
                              <strong>{c.name}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.loanAccountNo}</div>
                            </td>
                            <td>
                              <div>{c.phone}</div>
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.address}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.area || c.city}</div>
                            </td>
                            <td>
                              <strong>₹{c.outstandingAmount?.toLocaleString('en-IN')}</strong>
                            </td>
                            <td>
                              {c.emiAmount ? `₹${c.emiAmount?.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td>
                              <span className={`badge ${c.status === 'collected' ? 'badge-success' : c.status === 'visited' ? 'badge-info' : c.status === 'ptp' ? 'badge-warning' : 'badge-neutral'}`}>
                                {c.status?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '13px' }}>{c.assignedStaff?.name || 'Unassigned'}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    handleClearSelectedDoc();
                                    setSelectedCustomerForDoc(c);
                                  }}
                                  title="Upload & View Customer Files and Photos"
                                  style={{ gap: '4px' }}
                                >
                                  <Image size={13} /> Files & Photos
                                  {c.documents && c.documents.length > 0 && (
                                    <span style={{ background: '#DCFCE7', color: '#166534', fontSize: '10px', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                                      {c.documents.length}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setReassignModal(c)}
                                >
                                  Reassign
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: CUSTOMER LOCATIONS */}
          {/* ================================================================ */}
          {activeTab === 'locations' && (
            <div className="card">
              <div className="card-header-row">
                <div>
                  <h3 className="card-title">Registered Customer GPS Locations ({locations.length})</h3>
                  <p className="card-subtitle">Verified satellite anchoring points for 100-metre geofence validation</p>
                </div>
              </div>

              {/* Mobile Locations Card Model */}
              <div className="responsive-auto-cards" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {locations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No customer locations registered yet.
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div key={loc._id} className="case-mobile-card">
                      <div className="case-card-top">
                        <div>
                          <div className="case-card-name">{loc.customerId?.name || 'Customer'}</div>
                          <div className="case-card-loan">A/C: {loc.customerId?.loanAccountNo}</div>
                        </div>
                        <span className={`badge ${loc.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                          {loc.status}
                        </span>
                      </div>

                      <div className="case-card-row" style={{ marginTop: '8px' }}>
                        <span className="case-card-label">Type & Tag:</span>
                        <span className="case-card-val" style={{ fontWeight: 600 }}>
                          {loc.isDefault ? '⭐ ' : '📍 '} {loc.label || loc.type || 'Primary Site'}
                        </span>
                      </div>

                      <div className="case-card-row">
                        <span className="case-card-label">Coordinates:</span>
                        <span className="case-card-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                          {loc.coordinates?.lat?.toFixed(5)}, {loc.coordinates?.lng?.toFixed(5)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', fontSize: '12px' }}>
                        <span className="badge badge-info">±{Math.round(loc.accuracy || 0)}m Accuracy</span>
                        {loc.coordinates?.lat && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${loc.coordinates.lat},${loc.coordinates.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            Open Map <ExternalLink size={11} />
                          </a>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Registered By: {loc.capturedBy?.name || 'Staff Agent'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Laptop Page / Table Model */}
              <div className="table-wrapper table-responsive responsive-auto-table">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Label & Type</th>
                      <th>Coordinates</th>
                      <th>Accuracy</th>
                      <th>Status</th>
                      <th>Registered By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No customer locations registered yet.
                        </td>
                      </tr>
                    ) : (
                      locations.map((loc) => (
                        <tr key={loc._id}>
                          <td>
                            <strong>{loc.customerId?.name || 'Customer'}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{loc.customerId?.loanAccountNo}</div>
                          </td>
                          <td>
                            {loc.isDefault ? '⭐ ' : '📍 '}
                            {loc.label || loc.type}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            {loc.coordinates?.lat?.toFixed(5)}, {loc.coordinates?.lng?.toFixed(5)}
                          </td>
                          <td>±{Math.round(loc.accuracy || 0)}m</td>
                          <td>
                            <span className={`badge ${loc.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                              {loc.status}
                            </span>
                          </td>
                          <td>{loc.capturedBy?.name || 'Staff Agent'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: SUSPICIOUS VISITS INVESTIGATION (4-Action Supervisor Workflow) */}
          {/* ================================================================ */}
          {activeTab === 'suspicious' && (
            <SuspiciousVisitsView
              apiFetch={apiFetch}
              portfolios={portfolios}
              staffList={staffList}
              onInspectPhoto={(url) => setSelectedPhoto(url)}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: LENDING PORTFOLIOS MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'portfolios' && (
            <PortfoliosView
              apiFetch={apiFetch}
              onSelectPortfolioForUpload={(pId) => {
                setBulkImportInitialPortfolio(pId);
                setShowBulkImportModal(true);
              }}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: CASES & MULTI-PORTFOLIO ASSIGNMENT */}
          {/* ================================================================ */}
          {activeTab === 'cases' && (
            <CasesView
              apiFetch={apiFetch}
              staffList={staffList}
              portfolios={portfolios}
              onOpenImport={() => {
                setBulkImportInitialPortfolio(selectedGlobalPortfolio !== 'ALL' ? selectedGlobalPortfolio : '');
                setShowBulkImportModal(true);
              }}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: PROMISE TO PAY (PTP & BROKEN PTP) */}
          {/* ================================================================ */}
          {activeTab === 'ptp' && (
            <PtpView
              apiFetch={apiFetch}
              portfolios={portfolios}
              staffList={staffList}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: NON-WORKABLE CASES */}
          {/* ================================================================ */}
          {activeTab === 'nonworkable' && (
            <NonWorkableView
              apiFetch={apiFetch}
              portfolios={portfolios}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: AUDIT LOGS & COMPLIANCE */}
          {/* ================================================================ */}
          {activeTab === 'audit' && (
            <AuditLogsView
              apiFetch={apiFetch}
            />
          )}

          {/* ================================================================ */}
          {/* TAB: FIELD STAFF APPROVAL */}
          {/* ================================================================ */}
          {activeTab === 'approvals' && (() => {
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
                      <button
                        onClick={loadData}
                        className="btn btn-secondary btn-sm"
                        title="Refresh Staff Roster"
                        style={{ gap: '6px' }}
                      >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Roster
                      </button>
                      <button
                        onClick={() => setShowCreateStaffModal(true)}
                        className="btn btn-primary btn-sm"
                        style={{ gap: '6px' }}
                      >
                        <Plus size={14} /> Add Staff Manually
                      </button>
                    </div>
                  </div>

                  {/* 4 SUMMARY STAT CARDS */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
                      gap: '18px',
                    }}
                  >
                    {filteredStaff.map((stf) => {
                      const isPending = stf.status === 'pending_approval';
                      const isActive = stf.status === 'active';
                      const currentArea = staffAreaOverrides[stf._id] !== undefined ? staffAreaOverrides[stf._id] : (stf.assignedArea || 'Kozhikode Central');

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
                            {(() => {
                              const rawPhoto = stf.profilePhoto || stf.selfiePhoto;
                              const fullPhotoUrl = getPhotoUrl(rawPhoto);
                              const isBroken = brokenImages[stf._id] || !rawPhoto;

                              return (
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
                                        setBrokenImages((prev) => ({ ...prev, [stf._id]: true }));
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
                              );
                            })()}

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
                                    setStaffAreaOverrides({
                                      ...staffAreaOverrides,
                                      [stf._id]: e.target.value,
                                    });
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
                                onClick={() => setSelectedStaffDetails(stf)}
                                title="Inspect verification selfie, location and staff details"
                              >
                                <Eye size={13} /> Check Details
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                                onClick={() => setEditingStaff(stf)}
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
                                  onClick={() => handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                                >
                                  <CheckCircle size={15} /> Approve & Activate
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)', justifyContent: 'center' }}
                                  onClick={() => setStaffRejectionModal({ staffId: stf._id, name: stf.name, phone: stf.phone })}
                                >
                                  <XCircle size={15} /> Decline
                                </button>
                              </div>
                            ) : isActive ? (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px', color: 'var(--danger-text)' }}
                                  onClick={() => handleUpdateStaffStatus(stf._id, 'inactive')}
                                >
                                  <UserX size={13} /> Deactivate Staff
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-sm btn-primary"
                                  style={{ flex: 1, justifyContent: 'center' }}
                                  onClick={() => handleReviewStaff(stf._id, 'APPROVE', currentArea)}
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

                            return (
                              <tr key={stf._id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, cursor: stf.selfiePhoto || stf.profilePhoto ? 'pointer' : 'default' }}
                                      onClick={() => stf.selfiePhoto || stf.profilePhoto ? setSelectedPhoto(stf.selfiePhoto || stf.profilePhoto) : null}
                                    >
                                      {stf.selfiePhoto || stf.profilePhoto ? (
                                        <img src={stf.selfiePhoto || stf.profilePhoto} alt={stf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                      onClick={() => setSelectedStaffDetails(stf)}
                                      title="Check Details & Verification"
                                      style={{ gap: '4px' }}
                                    >
                                      <Eye size={12} /> Check Details
                                    </button>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => setEditingStaff(stf)}
                                      title="Edit Staff Details"
                                      style={{ gap: '4px' }}
                                    >
                                      <Edit3 size={12} /> Edit
                                    </button>
                                    {isPending ? (
                                      <>
                                        <button
                                          className="btn btn-sm btn-primary"
                                          onClick={() => handleReviewStaff(stf._id, 'APPROVE', currentArea)}
                                          title="Approve staff"
                                        >
                                          <Check size={12} /> Approve
                                        </button>
                                        <button
                                          className="btn btn-sm btn-secondary"
                                          style={{ color: 'var(--danger-text)' }}
                                          onClick={() => setStaffRejectionModal({ staffId: stf._id, name: stf.name, phone: stf.phone })}
                                          title="Decline registration"
                                        >
                                          <X size={12} /> Decline
                                        </button>
                                      </>
                                    ) : isActive ? (
                                      <button
                                        className="btn btn-sm btn-secondary"
                                        style={{ color: 'var(--danger-text)', fontSize: '11.5px' }}
                                        onClick={() => handleUpdateStaffStatus(stf._id, 'inactive')}
                                      >
                                        Deactivate
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleReviewStaff(stf._id, 'APPROVE', currentArea)}
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
          })()}

          {/* ================================================================ */}
          {/* TAB 5: STAFF MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'staff' && (() => {
            const pendingStaff = staffList.filter((s) => s.status === 'pending_approval');
            const approvedStaff = staffList.filter((s) => s.status !== 'pending_approval');

            return (
              <div>
                {/* PENDING STAFF APPROVALS BANNER / CARDS */}
                {pendingStaff.length > 0 && (
                  <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--warning-border)', background: 'linear-gradient(180deg, #fffdf8 0%, #ffffff 100%)' }}>
                    <div className="card-header-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--warning-light)', color: 'var(--warning-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={22} />
                        </div>
                        <div>
                          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            Field Staff Registration Requests
                            <span className="badge badge-warning">{pendingStaff.length} Awaiting Approval</span>
                          </h3>
                          <p className="card-subtitle">
                            Verify staff selfie photo, territory, and GPS tag before authorizing mobile app access
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '16px', marginTop: '16px' }}>
                      {pendingStaff.map((stf) => (
                        <div
                          key={stf._id}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px',
                            background: 'var(--bg-card)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            {/* Officer Selfie Thumbnail */}
                            <div
                              style={{ position: 'relative', cursor: stf.selfiePhoto ? 'pointer' : 'default' }}
                              onClick={() => stf.selfiePhoto && setSelectedPhoto(stf.selfiePhoto)}
                              title={stf.selfiePhoto ? 'Click to inspect verification selfie' : ''}
                            >
                              {stf.selfiePhoto ? (
                                <img
                                  src={stf.selfiePhoto}
                                  alt={stf.name}
                                  style={{
                                    width: '68px',
                                    height: '68px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--primary)',
                                    boxShadow: 'var(--shadow-xs)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '68px',
                                    height: '68px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-card-subtle)',
                                    border: '2px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  <UserCheck size={28} />
                                </div>
                              )}
                              {stf.selfiePhoto && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    borderRadius: '50%',
                                    padding: '3px',
                                    display: 'flex',
                                  }}
                                >
                                  <Eye size={10} />
                                </span>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '15px' }}>{stf.name}</strong>
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                  ({stf.employeeId || 'ID Auto-Gen'})
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                <Phone size={13} />
                                <span>+91 {stf.phone}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 600, marginTop: '2px' }}>
                                Territory: {stf.assignedArea || 'Kozhikode Central'}
                              </div>
                            </div>
                          </div>

                          {/* Registration Location Box */}
                          <div
                            style={{
                              background: 'var(--bg-card-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: '10px 12px',
                              fontSize: '12px',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} color="var(--primary)" /> GPS Location at Sign-Up
                              </span>
                              {stf.registrationLocation?.lat && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${stf.registrationLocation.lat},${stf.registrationLocation.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--info-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600 }}
                                >
                                  View Map <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                            {stf.registrationLocation?.lat ? (
                              <div>
                                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                                  Lat: {stf.registrationLocation.lat}, Lng: {stf.registrationLocation.lng}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {stf.registrationLocation.address || 'Location Tagged'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Coordinates not tagged</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                                onClick={() => setSelectedStaffDetails(stf)}
                                title="Check registration selfie & details"
                              >
                                <Eye size={13} /> Check Details
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                                onClick={() => setEditingStaff(stf)}
                                title="Edit staff details"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => handleReviewStaff(stf._id, 'APPROVE', stf.assignedArea)}
                              >
                                <CheckCircle size={14} /> Approve Staff Account
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)', justifyContent: 'center' }}
                                onClick={() => {
                                  const reason = window.prompt(`Decline registration for ${stf.name}:`, 'Selfie or territory details not verified');
                                  if (reason !== null) {
                                    handleReviewStaff(stf._id, 'REJECT', '', reason);
                                  }
                                }}
                              >
                                <XCircle size={14} /> Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FULL STAFF DIRECTORY TABLE & MOBILE CARDS */}
                <div className="card">
                  <div className="card-header-row">
                    <div>
                      <h3 className="card-title">Field Staff Directory ({staffList.length})</h3>
                      <p className="card-subtitle">Manage field collection staff, territories, and status</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn btn-primary" onClick={() => setShowCreateStaffModal(true)}>
                        <Plus size={16} /> Register Staff
                      </button>
                    </div>
                  </div>

                  {/* Mobile Staff Card Model */}
                  {(staffViewMode === 'cards' || staffViewMode === 'auto') && (
                    <div className={staffViewMode === 'auto' ? 'responsive-auto-cards' : ''} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {staffList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No staff registered.
                        </div>
                      ) : (
                        staffList.map((stf) => (
                          <div key={stf._id} className="case-mobile-card">
                            <div className="case-card-top">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {stf.selfiePhoto ? (
                                  <img
                                    src={stf.selfiePhoto}
                                    alt={stf.name}
                                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)', cursor: 'pointer' }}
                                    onClick={() => setSelectedPhoto(stf.selfiePhoto)}
                                    title="Click to view selfie"
                                  />
                                ) : (
                                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-card-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '700' }}>
                                    {stf.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                                  </div>
                                )}
                                <div>
                                  <div className="case-card-name">{stf.name}</div>
                                  <div className="case-card-loan">ID: {stf.employeeId || 'STF-101'} • Role: {stf.role}</div>
                                </div>
                              </div>
                              <span className={`badge ${stf.status === 'active' ? 'badge-success' : stf.status === 'pending_approval' ? 'badge-warning' : 'badge-danger'}`}>
                                {stf.status === 'pending_approval' ? 'PENDING' : stf.status?.toUpperCase()}
                              </span>
                            </div>

                            <div className="case-card-row" style={{ marginTop: '8px' }}>
                              <span className="case-card-label">Contact:</span>
                              <a href={`tel:${stf.phone}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> +91 {stf.phone}
                              </a>
                            </div>

                            <div className="case-card-row">
                              <span className="case-card-label">Territory:</span>
                              <span className="case-card-val" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {stf.assignedArea || 'Kozhikode Central'}
                              </span>
                            </div>

                            <div className="case-card-actions" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, justifyContent: 'center' }}
                                  onClick={() => setSelectedStaffDetails(stf)}
                                  title="Check details"
                                >
                                  <Eye size={13} /> Check Details
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ flex: 1, justifyContent: 'center' }}
                                  onClick={() => setEditingStaff(stf)}
                                  title="Edit staff"
                                >
                                  <Edit3 size={13} /> Edit
                                </button>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {stf.status === 'pending_approval' ? (
                                  <button
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => handleReviewStaff(stf._id, 'APPROVE', stf.assignedArea)}
                                  >
                                    <Check size={13} /> Approve Staff
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      style={{ flex: 1, justifyContent: 'center' }}
                                      onClick={() => setAddDataStaffTarget(stf)}
                                      title="Add cases data for this field staff"
                                    >
                                      <Plus size={13} /> Add Data
                                    </button>
                                    <button
                                      className={`btn btn-sm ${stf.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                                      style={{ flex: 1, justifyContent: 'center' }}
                                      onClick={() =>
                                        setStatusConfirmStaff({
                                          staffId: stf._id,
                                          name: stf.name,
                                          employeeId: stf.employeeId,
                                          currentStatus: stf.status,
                                          targetStatus: stf.status === 'active' ? 'inactive' : 'active',
                                        })
                                      }
                                    >
                                      {stf.status === 'active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Laptop / Desktop Table Model */}
                  {(staffViewMode === 'table' || staffViewMode === 'auto') && (
                    <div className={`table-wrapper table-responsive ${staffViewMode === 'auto' ? 'responsive-auto-table' : ''}`}>
                      <table>
                        <thead>
                          <tr>
                            <th>Staff</th>
                            <th>Employee ID</th>
                            <th>Phone</th>
                            <th>Territory / Area</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffList.map((stf) => (
                            <tr key={stf._id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {stf.selfiePhoto ? (
                                    <img
                                      src={stf.selfiePhoto}
                                      alt={stf.name}
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '1.5px solid var(--primary)',
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => setSelectedPhoto(stf.selfiePhoto)}
                                      title="Click to view selfie"
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'var(--bg-card-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                      }}
                                    >
                                      {stf.name?.slice(0, 2)?.toUpperCase() || 'ST'}
                                    </div>
                                  )}
                                  <div>
                                    <strong>{stf.name}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Role: {stf.role}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{stf.employeeId || 'STF-101'}</td>
                              <td>{stf.phone}</td>
                              <td>{stf.assignedArea || 'Kozhikode Central'}</td>
                              <td>
                                {stf.status === 'pending_approval' ? (
                                  <span className="badge badge-warning">
                                    PENDING APPROVAL
                                  </span>
                                ) : (
                                  <span className={`badge ${stf.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                    {stf.status?.toUpperCase()}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setSelectedStaffDetails(stf)}
                                    title="Check Staff Details & Verification"
                                    style={{ gap: '4px' }}
                                  >
                                    <Eye size={12} /> Check Details
                                  </button>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setEditingStaff(stf)}
                                    title="Edit Staff Profile"
                                    style={{ gap: '4px' }}
                                  >
                                    <Edit3 size={12} /> Edit
                                  </button>
                                  {stf.status === 'pending_approval' ? (
                                    <>
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleReviewStaff(stf._id, 'APPROVE', stf.assignedArea)}
                                        title="Approve staff"
                                      >
                                        <Check size={12} /> Approve
                                      </button>
                                      <button
                                        className="btn btn-sm btn-secondary"
                                        style={{ color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                                        onClick={() => {
                                          const reason = window.prompt(`Decline registration for ${stf.name}:`, 'Details not verified');
                                          if (reason !== null) {
                                            handleReviewStaff(stf._id, 'REJECT', '', reason);
                                          }
                                        }}
                                        title="Decline registration"
                                      >
                                        <X size={12} /> Decline
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => setAddDataStaffTarget(stf)}
                                        title="Add cases data (Upload file or single case) for this field staff"
                                      >
                                        <Plus size={12} /> Add Data
                                      </button>
                                      <button
                                        className={`btn btn-sm ${stf.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={() =>
                                          setStatusConfirmStaff({
                                            staffId: stf._id,
                                            name: stf.name,
                                            employeeId: stf.employeeId,
                                            currentStatus: stf.status,
                                            targetStatus: stf.status === 'active' ? 'inactive' : 'active',
                                          })
                                        }
                                      >
                                        {stf.status === 'active' ? 'Deactivate' : 'Activate'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================================================================ */}
          {/* TAB 6: COLLECTIONS VERIFICATION */}
          {/* ================================================================ */}
          {activeTab === 'collections' && (
            <div className="card">
              <div className="card-header-row">
                <div>
                  <h3 className="card-title">Collections Audit & Verification ({collections.length})</h3>
                  <p className="card-subtitle">Validate UPI, cash, and bank collections submitted by field staff</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={exportCollectionsCSV}>
                    <Download size={14} /> Export Collections CSV
                  </button>
                </div>
              </div>

              {(collectionsViewMode === 'cards' || collectionsViewMode === 'auto') && (
                <div className={collectionsViewMode === 'auto' ? 'responsive-auto-cards' : ''} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {collections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No payment collections recorded yet.
                    </div>
                  ) : (
                    collections.map((col) => (
                      <div key={col._id} className="case-mobile-card">
                        <div className="case-card-top">
                          <div>
                            <div className="case-card-name">{col.customerId?.name || 'Customer'}</div>
                            <div className="case-card-loan">A/C: {col.customerId?.loanAccountNo}</div>
                          </div>
                          <span className={`badge ${col.paymentStatus === 'APPROVED' ? 'badge-success' : col.paymentStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                            {col.paymentStatus}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', padding: '10px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#065F46', textTransform: 'uppercase', fontWeight: 700 }}>Collected Amount</div>
                            <strong style={{ fontSize: '18px', color: '#047857' }}>₹{col.collectedAmount?.toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{col.paymentMethod}</div>
                            {col.paymentReference && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Ref: {col.paymentReference}</div>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Field Staff: <strong>{col.staffId?.name || 'Staff Agent'}</strong>
                        </div>

                        {col.paymentStatus === 'PENDING_VERIFICATION' ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                              onClick={() => {
                                setSelectedPayment(col);
                                handleVerifyPayment('APPROVE');
                              }}
                            >
                              ✓ Approve Payment
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                              onClick={() => setSelectedPayment(col)}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', fontStyle: 'italic' }}>
                            Reconciled & Verified
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {(collectionsViewMode === 'table' || collectionsViewMode === 'auto') && (
                <div className={`table-wrapper table-responsive ${collectionsViewMode === 'auto' ? 'responsive-auto-table' : ''}`} style={{ marginTop: '16px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Customer Case</th>
                        <th>Staff Agent</th>
                        <th>Amount Collected</th>
                        <th>Method & UTR</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collections.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No payment collections recorded yet.
                          </td>
                        </tr>
                      ) : (
                        collections.map((col) => (
                          <tr key={col._id}>
                            <td>
                              <strong>{col.customerId?.name || 'Customer'}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{col.customerId?.loanAccountNo}</div>
                            </td>
                            <td>{col.staffId?.name}</td>
                            <td>
                              <strong style={{ fontSize: '15px', color: 'var(--success-text)' }}>
                                ₹{col.collectedAmount?.toLocaleString('en-IN')}
                              </strong>
                            </td>
                            <td>
                              <div>{col.paymentMethod}</div>
                              {col.paymentReference && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  Ref: {col.paymentReference}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${col.paymentStatus === 'APPROVED' ? 'badge-success' : col.paymentStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                                {col.paymentStatus}
                              </span>
                            </td>
                            <td>
                              {col.paymentStatus === 'PENDING_VERIFICATION' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                      setSelectedPayment(col);
                                      handleVerifyPayment('APPROVE');
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => setSelectedPayment(col)}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verified</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 7: REPORTS & EXPORT */}
          {/* ================================================================ */}
          {activeTab === 'reports' && (
            <div>
              {/* Reports Top Action Banner */}
              <div className="report-header-banner">
                <div>
                  <h3 className="card-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--primary)" />
                    Field Intelligence & Operational Reports
                  </h3>
                  <p className="card-subtitle" style={{ marginTop: '4px' }}>
                    Real-time collection audit ledger, daily agent visit logs, and official Excel/PDF exports.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (reportType === 'collections') {
                        if (collectionSubView === 'model') downloadCollectionModelExcel();
                        else downloadCollectionsExcel();
                      } else {
                        if (visitSubView === 'model') downloadDailyVisitModelExcel();
                        else downloadDailyVisitsExcel();
                      }
                    }}
                    title="Export formatted Excel (.xlsx) file"
                  >
                    <FileSpreadsheet size={15} color="#16a34a" /> Download Excel (.xlsx)
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      if (reportType === 'collections') {
                        if (collectionSubView === 'model') exportCollectionModelCSV();
                        else exportCollectionsCSV();
                      } else {
                        if (visitSubView === 'model') exportDailyVisitModelCSV();
                        else exportCasesCSV();
                      }
                    }}
                    title="Download CSV raw file"
                  >
                    <Download size={15} /> Download CSV
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => window.print()}
                    title="Print report or save as PDF"
                  >
                    <Printer size={15} /> Print / PDF
                  </button>

                  <button
                    className="btn"
                    style={{
                      background: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37, 211, 102, 0.25)',
                    }}
                    onClick={shareReportViaWhatsApp}
                    title="Share active report summary directly on WhatsApp"
                  >
                    <MessageCircle size={16} /> Share via WhatsApp
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Collection Report vs Daily Visit Report */}
              <div className="modal-tab-nav" style={{ marginBottom: '16px' }}>
                <button
                  type="button"
                  className={`modal-tab-btn ${reportType === 'collections' ? 'active' : ''}`}
                  onClick={() => setReportType('collections')}
                >
                  <CreditCard size={17} /> Collection Report ({reportCollections.length})
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${reportType === 'visits' ? 'active' : ''}`}
                  onClick={() => setReportType('visits')}
                >
                  <MapPin size={17} /> Daily Visit Report ({reportVisits.length})
                </button>
              </div>

              {/* Comprehensive Filter Bar */}
              <div className="report-filter-bar">
                {/* Row 1: Date Range Presets */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div className="report-preset-group">
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Date Period:
                    </span>
                    <button
                      type="button"
                      className={`preset-pill-btn ${reportDateRange === 'today' ? 'active' : ''}`}
                      onClick={() => handleDatePresetChange('today')}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${reportDateRange === 'yesterday' ? 'active' : ''}`}
                      onClick={() => handleDatePresetChange('yesterday')}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${reportDateRange === '7days' ? 'active' : ''}`}
                      onClick={() => handleDatePresetChange('7days')}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${reportDateRange === 'thisMonth' ? 'active' : ''}`}
                      onClick={() => handleDatePresetChange('thisMonth')}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${reportDateRange === 'custom' ? 'active' : ''}`}
                      onClick={() => setReportDateRange('custom')}
                    >
                      Custom Dates
                    </button>
                  </div>

                  {/* Active filter date indicator */}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} />
                    <span>
                      {reportStartDate === reportEndDate
                        ? `Date: ${reportStartDate}`
                        : `${reportStartDate} to ${reportEndDate}`}
                    </span>
                  </div>
                </div>

                {/* Row 2: Controls & Dropdown Filters */}
                <div className="report-controls-row">
                  {/* From & To Date Pickers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      value={reportStartDate}
                      onChange={(e) => {
                        setReportDateRange('custom');
                        setReportStartDate(e.target.value);
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      value={reportEndDate}
                      onChange={(e) => {
                        setReportDateRange('custom');
                        setReportEndDate(e.target.value);
                      }}
                    />
                  </div>

                  {/* Field Staff Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '200px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Staff:</label>
                    <select
                      className="input-field"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      value={reportStaffFilter}
                      onChange={(e) => setReportStaffFilter(e.target.value)}
                    >
                      <option value="ALL">All Field Staff ({staffList.length})</option>
                      {staffList.map((stf) => (
                        <option key={stf._id} value={stf._id}>
                          {stf.name} ({stf.assignedArea || 'Field Staff'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contextual Filters: Collections or Visits */}
                  {reportType === 'collections' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Mode:</label>
                        <select
                          className="input-field"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          value={reportPaymentMethodFilter}
                          onChange={(e) => setReportPaymentMethodFilter(e.target.value)}
                        >
                          <option value="ALL">All Modes</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</label>
                        <select
                          className="input-field"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          value={reportPaymentStatusFilter}
                          onChange={(e) => setReportPaymentStatusFilter(e.target.value)}
                        >
                          <option value="ALL">All Status</option>
                          <option value="APPROVED">Approved</option>
                          <option value="PENDING_VERIFICATION">Pending Review</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Outcome:</label>
                      <select
                        className="input-field"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={reportOutcomeFilter}
                        onChange={(e) => setReportOutcomeFilter(e.target.value)}
                      >
                        <option value="ALL">All Outcomes</option>
                        <option value="Payment Collected">Payment Collected</option>
                        <option value="Promise to Pay (PTP)">Promise to Pay (PTP)</option>
                        <option value="House Locked">House Locked</option>
                        <option value="Customer Unavailable">Customer Unavailable</option>
                        <option value="Refused to Pay">Refused to Pay</option>
                        <option value="Wrong Address">Wrong Address</option>
                      </select>
                    </div>
                  )}

                  {/* Search query box */}
                  <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-field"
                      style={{ paddingLeft: '32px', paddingRight: '10px', fontSize: '12px' }}
                      placeholder="Search customer, loan a/c, staff..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
                    />
                  </div>

                  <button className="btn btn-secondary btn-sm" onClick={fetchReports} title="Filter">
                    <Filter size={13} /> Apply
                  </button>
                </div>
              </div>

              {/* Aggregated KPI Summary Ribbon */}
              {reportType === 'collections' && reportCollectionsSummary && (
                <div className="kpi-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <div className="kpi-card">
                    <span className="kpi-label">Total Collections</span>
                    <div className="kpi-value" style={{ color: 'var(--success-text)' }}>
                      ₹{reportCollectionsSummary.totalAmount?.toLocaleString('en-IN')}
                    </div>
                    <span className="kpi-subtext">{reportCollectionsSummary.count} transactions in selected period</span>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-label">Cash Collected</span>
                    <div className="kpi-value">
                      ₹{reportCollectionsSummary.cashTotal?.toLocaleString('en-IN')}
                    </div>
                    <span className="kpi-subtext">Physical currency collected</span>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-label">Digital (UPI & Bank)</span>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                      ₹{(reportCollectionsSummary.upiTotal + reportCollectionsSummary.bankTransferTotal)?.toLocaleString('en-IN')}
                    </div>
                    <span className="kpi-subtext">Verified electronic deposits</span>
                  </div>
                </div>
              )}

              {reportType === 'visits' && reportVisitsSummary && (
                <div className="kpi-grid" style={{ marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <span className="kpi-label">Total Field Visits</span>
                    <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                      {reportVisitsSummary.totalVisits}
                    </div>
                    <span className="kpi-subtext">In selected time frame</span>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-label">Payment Recoveries</span>
                    <div className="kpi-value" style={{ color: 'var(--success-text)' }}>
                      {reportVisitsSummary.paymentsCount}
                    </div>
                    <span className="kpi-subtext">
                      Total recovered: ₹{reportVisitsSummary.totalCollectedAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-label">Promise to Pay (PTP)</span>
                    <div className="kpi-value" style={{ color: 'var(--warning-text)' }}>
                      {reportVisitsSummary.ptpCount}
                    </div>
                    <span className="kpi-subtext">
                      Promised amount: ₹{reportVisitsSummary.totalPtpAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-label">Non-Contacted (Locked/Unavail)</span>
                    <div className="kpi-value" style={{ color: 'var(--text-muted)' }}>
                      {(reportVisitsSummary.houseLockedCount || 0) + (reportVisitsSummary.customerUnavailableCount || 0)}
                    </div>
                    <span className="kpi-subtext">
                      {reportVisitsSummary.houseLockedCount} locked, {reportVisitsSummary.customerUnavailableCount} unavailable
                    </span>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {loadingReport && (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--primary)' }}>
                  <RefreshCw size={24} className="animate-spin" />
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>Generating filtered operational report...</div>
                </div>
              )}

              {/* REPORT 1: COLLECTION LEDGER & PERFORMANCE MODEL */}
              {reportType === 'collections' && !loadingReport && (
                <div>
                  {/* Sub-view toggle (Model vs Ledger) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div className="report-subview-toggle">
                      <button
                        type="button"
                        className={`report-subview-btn ${collectionSubView === 'model' ? 'active' : ''}`}
                        onClick={() => setCollectionSubView('model')}
                      >
                        <BarChart2 size={15} /> Staff Performance Model ({reportPerformanceMatrix.length})
                      </button>
                      <button
                        type="button"
                        className={`report-subview-btn ${collectionSubView === 'ledger' ? 'active' : ''}`}
                        onClick={() => setCollectionSubView('ledger')}
                      >
                        <CreditCard size={15} /> Transaction Ledger ({reportCollections.length})
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={collectionSubView === 'model' ? downloadCollectionModelExcel : downloadCollectionsExcel}
                        title="Export current view to Excel"
                      >
                        <FileSpreadsheet size={13} color="#16a34a" /> Download Excel (.xlsx)
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={collectionSubView === 'model' ? exportCollectionModelCSV : exportCollectionsCSV}
                        title="Export current view to CSV"
                      >
                        <Download size={13} /> Export CSV
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={shareReportViaWhatsApp}
                        title="Share this collection report on WhatsApp"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                    </div>
                  </div>

                  {collectionSubView === 'model' ? (
                    <div className="card table-card">
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <strong style={{ fontSize: '16px' }}>Collection Report</strong>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="table-matrix">
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th className="fe-name-col" style={{ width: '180px' }}>FS NAME</th>
                              <th style={{ width: '130px' }}>Sum of POS</th>
                              <th style={{ width: '100px' }}>Count of POS</th>
                              <th style={{ width: '140px' }}>Sum of COLLECTION</th>
                              <th style={{ width: '120px' }}>TARGET</th>
                              <th style={{ width: '100px' }}>DRR</th>
                              <th style={{ width: '120px' }}>YET TO GO</th>
                              <th style={{ width: '90px' }}>ACH%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportPerformanceMatrix.length === 0 ? (
                              <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                  No staff performance records available for this period.
                                </td>
                              </tr>
                            ) : (
                              reportPerformanceMatrix.map((row) => {
                                const achClass = row.achPercent >= 40 ? 'ach-high' : row.achPercent >= 10 ? 'ach-mid' : 'ach-low';
                                return (
                                  <tr key={row.staffId}>
                                    <td className="fe-name-col">
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                        <span>{row.fsName}</span>
                                        <button
                                          type="button"
                                          onClick={() => shareStaffPerformanceWhatsApp(row)}
                                          style={{ background: '#25D366', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700 }}
                                          title={`Send target & collection to ${row.fsName} on WhatsApp`}
                                        >
                                          <MessageCircle size={11} /> Share
                                        </button>
                                      </div>
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                                      {row.sumOfPos?.toLocaleString('en-IN') || 0}
                                    </td>
                                    <td className="cell-count-pos">
                                      {row.countOfPos || 0}
                                    </td>
                                    <td style={{ background: row.sumOfCollection > 0 ? '#fef08a' : '#fecaca', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                      {row.sumOfCollection > 0 ? row.sumOfCollection?.toLocaleString('en-IN') : (row.sumOfPos > 0 ? '0' : '—')}
                                    </td>
                                    <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                                      {row.target?.toLocaleString('en-IN') || 0}
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                                      {row.drr?.toLocaleString('en-IN') || 0}
                                    </td>
                                    <td style={{ background: row.yetToGo > 0 && row.achPercent < 10 ? '#fef08a' : '#bbf7d0', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                      {row.yetToGo?.toLocaleString('en-IN') || 0}
                                    </td>
                                    <td className={achClass}>
                                      {row.achPercent}%
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {reportPerformanceGrandTotal && reportPerformanceMatrix.length > 0 && (
                            <tfoot>
                              <tr style={{ background: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #94a3b8' }}>
                                <td className="fe-name-col" style={{ fontWeight: 900, color: '#0f172a' }}>
                                  Grand Total
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                  {reportPerformanceGrandTotal.sumOfPos?.toLocaleString('en-IN')}
                                </td>
                                <td style={{ fontWeight: 900 }}>
                                  {reportPerformanceGrandTotal.countOfPos}
                                </td>
                                <td style={{ background: '#86efac', color: '#14532d', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                                  {reportPerformanceGrandTotal.sumOfCollection?.toLocaleString('en-IN')}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                  {reportPerformanceGrandTotal.target?.toLocaleString('en-IN')}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                  {reportPerformanceGrandTotal.drr?.toLocaleString('en-IN')}
                                </td>
                                <td style={{ background: '#fca5a5', color: '#7f1d1d', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                                  {reportPerformanceGrandTotal.yetToGo?.toLocaleString('en-IN')}
                                </td>
                                <td className={reportPerformanceGrandTotal.achPercent >= 40 ? 'ach-high' : reportPerformanceGrandTotal.achPercent >= 10 ? 'ach-mid' : 'ach-low'}>
                                  {reportPerformanceGrandTotal.achPercent}%
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="card table-card">
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>Collection Transaction Records ({reportCollections.length})</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            All individual recoveries logged by field agents and administrative staff
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={downloadCollectionsExcel}>
                            <FileSpreadsheet size={13} color="#16a34a" /> Excel
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Customer Details</th>
                              <th>Phone</th>
                              <th>Collected Amount</th>
                              <th>Payment Mode & Ref</th>
                              <th>Status</th>
                              <th>Field Staff</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportCollections.length === 0 ? (
                              <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                  No collection records found for the selected date range and filter criteria.
                                </td>
                              </tr>
                            ) : (
                              reportCollections.map((col) => (
                                <tr key={col._id}>
                                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {new Date(col.createdAt || col.serverTimestamp).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {new Date(col.createdAt || col.serverTimestamp).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </td>
                                  <td>
                                    <strong>{col.customerId?.name || 'Customer'}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      {col.customerId?.loanAccountNo}
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '13px' }}>
                                    {col.customerId?.phone || '—'}
                                  </td>
                                  <td>
                                    <strong style={{ fontSize: '14px', color: 'var(--success-text)' }}>
                                      ₹{col.collectedAmount?.toLocaleString('en-IN')}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className={`badge ${col.paymentMethod === 'UPI' ? 'badge-info' : col.paymentMethod === 'Cash' ? 'badge-neutral' : 'badge-warning'}`}>
                                      {col.paymentMethod}
                                    </span>
                                    {col.paymentReference ? (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                        Ref: {col.paymentReference}
                                      </div>
                                    ) : null}
                                  </td>
                                  <td>
                                    <span className={`badge ${col.paymentStatus === 'APPROVED' ? 'badge-success' : col.paymentStatus === 'PENDING_VERIFICATION' ? 'badge-warning' : 'badge-danger'}`}>
                                      {col.paymentStatus === 'APPROVED' ? 'VERIFIED' : col.paymentStatus === 'PENDING_VERIFICATION' ? 'PENDING' : 'REJECTED'}
                                    </span>
                                  </td>
                                  <td>
                                    <strong>{col.staffId?.name || 'Unassigned'}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {col.staffId?.assignedArea || 'Field Staff'}
                                    </div>
                                  </td>
                                  <td style={{ maxWidth: '180px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.notes}>
                                      {col.notes || '—'}
                                    </div>
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
              )}

              {/* REPORT 2: DAILY VISIT REPORT & TIME-SLOT MATRIX */}
              {reportType === 'visits' && !loadingReport && (
                <div>
                  {/* Sub-view toggle (Time-Slot Matrix vs Logs) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div className="report-subview-toggle">
                      <button
                        type="button"
                        className={`report-subview-btn ${visitSubView === 'model' ? 'active' : ''}`}
                        onClick={() => setVisitSubView('model')}
                      >
                        <Clock size={15} /> Hourly Time-Slot Matrix ({reportTimeSlotMatrix.length})
                      </button>
                      <button
                        type="button"
                        className={`report-subview-btn ${visitSubView === 'logs' ? 'active' : ''}`}
                        onClick={() => setVisitSubView('logs')}
                      >
                        <MapPin size={15} /> Customer Visit Logs ({reportVisits.length})
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn ${isEditingNavi ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={isEditingNavi ? { background: '#0891b2', borderColor: '#0891b2' } : {}}
                        onClick={handleToggleNaviEditMode}
                        title="Directly type and edit Navi App visit counts in table"
                      >
                        {isEditingNavi ? <Save size={13} /> : <Edit3 size={13} color="#0891b2" />}
                        {isEditingNavi ? 'Exit Edit Mode' : 'Type Navi Counts'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (!staffList.length) {
                            apiFetch('/api/admin/staff').then((d) => setStaffList(d.staff || [])).catch(() => {});
                          }
                          setShowNaviModal(true);
                        }}
                        title="Enter Navi counts for an individual staff member via popup"
                      >
                        <Plus size={13} color="#0891b2" /> Navi Popup Entry
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={visitSubView === 'model' ? downloadDailyVisitModelExcel : downloadDailyVisitsExcel}
                        title="Export current view to Excel"
                      >
                        <FileSpreadsheet size={13} color="#16a34a" /> Download Excel (.xlsx)
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={visitSubView === 'model' ? exportDailyVisitModelCSV : exportCasesCSV}
                        title="Export current view to CSV"
                      >
                        <Download size={13} /> Export CSV
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={shareReportViaWhatsApp}
                        title="Share this daily visit report on WhatsApp"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Navi Edit Active Notice Banner */}
                  {isEditingNavi && (
                    <div className="navi-edit-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0e7490' }}>
                        <Edit3 size={16} color="#0891b2" />
                        <div>
                          <strong>Navi App Visit Counts Edit Mode:</strong> Type the visit counts completed in the official Navi App directly into the cyan NAVI input cells below.
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ background: '#0891b2', borderColor: '#0891b2' }}
                          disabled={savingNavi}
                          onClick={handleSaveAllNaviCounts}
                        >
                          {savingNavi ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                          {savingNavi ? 'Saving...' : 'Save All Navi Counts'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setIsEditingNavi(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {visitSubView === 'model' ? (
                    <div className="card table-card">
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <strong style={{ fontSize: '16px' }}>Daily Visit Update</strong>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table className="table-matrix">
                          <thead>
                            {/* Tier 1 Header */}
                            <tr>
                              <th rowSpan={2} className="fe-name-col" style={{ width: '160px', background: '#3b82f6', color: '#fff' }}>
                                FE NAME
                              </th>
                              <th colSpan={4} className="slot-hdr-9-11">9-11</th>
                              <th colSpan={4} className="slot-hdr-11-1">11-1</th>
                              <th colSpan={4} className="slot-hdr-1-3">1-3</th>
                              <th colSpan={4} className="slot-hdr-3-5">3-5</th>
                              <th colSpan={4} className="slot-hdr-5-6">5-6</th>
                              <th rowSpan={2} className="slot-hdr-total" style={{ width: '80px' }}>TOTAL</th>
                            </tr>
                            {/* Tier 2 Header */}
                            <tr style={{ background: '#f8fafc' }}>
                              {['9-11', '11-1', '1-3', '3-5', '5-6'].map((slot) => (
                                <React.Fragment key={slot}>
                                  <th className="slot-subhdr" style={{ width: '38px' }}>KB</th>
                                  <th className="slot-subhdr" style={{ width: '38px' }}>SC</th>
                                  <th
                                    className="slot-subhdr"
                                    style={{
                                      width: '42px',
                                      background: '#cffafe',
                                      color: '#0891b2',
                                      fontWeight: 800,
                                      borderLeft: '1.5px solid #0891b2',
                                      borderRight: '1.5px solid #0891b2',
                                    }}
                                    title="Navi has separate app - editable manually"
                                  >
                                    NAVI
                                  </th>
                                  <th className="slot-subhdr" style={{ width: '38px' }}>MV</th>
                                </React.Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {reportTimeSlotMatrix.length === 0 ? (
                              <tr>
                                <td colSpan={22} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                  No field staff visit matrix records available for this date.
                                </td>
                              </tr>
                            ) : (
                              reportTimeSlotMatrix.map((row) => (
                                <tr key={row.staffId}>
                                  <td className="fe-name-col">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                      <span>{row.feName}</span>
                                      <button
                                        type="button"
                                        onClick={() => shareStaffVisitWhatsApp(row)}
                                        style={{ background: '#25D366', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700 }}
                                        title={`Send daily visit summary to ${row.feName} on WhatsApp`}
                                      >
                                        <MessageCircle size={11} /> Share
                                      </button>
                                    </div>
                                  </td>
                                  {['9-11', '11-1', '1-3', '3-5', '5-6'].map((slot) =>
                                    ['KB', 'SC', 'NAVI', 'MV'].map((p) => {
                                      const val = row.slots[slot]?.[p];
                                      const isAb = val === 'AB' || (row.isAbsent && val === 0);

                                      if (p === 'NAVI' && isEditingNavi) {
                                        const currentVal = naviEditData[row.staffId]?.[slot] ?? (typeof val === 'number' ? val : 0);
                                        return (
                                          <td key={`${slot}-${p}`} style={{ background: '#ecfeff', padding: '3px 2px' }}>
                                            <input
                                              type="number"
                                              min="0"
                                              className="input-matrix-navi"
                                              value={currentVal}
                                              onChange={(e) => handleNaviCellChange(row.staffId, slot, e.target.value)}
                                            />
                                          </td>
                                        );
                                      }

                                      return (
                                        <td
                                          key={`${slot}-${p}`}
                                          className={isAb ? 'cell-ab' : ''}
                                          style={{
                                            fontWeight: typeof val === 'number' && val > 0 ? 800 : 500,
                                            color: typeof val === 'number' && val > 0 ? '#0f172a' : undefined,
                                            background: p === 'NAVI' && typeof val === 'number' && val > 0 ? '#ecfeff' : undefined,
                                          }}
                                        >
                                          {isAb ? 'AB' : val ?? 0}
                                        </td>
                                      );
                                    })
                                  )}
                                  <td style={{ fontWeight: 900, background: row.totalVisits > 0 ? '#bbf7d0' : '#fee2e2', color: row.totalVisits > 0 ? '#14532d' : '#991b1b' }}>
                                    {row.totalVisits}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {reportTimeSlotMatrix.length > 0 && (
                            <tfoot>
                              <tr style={{ background: '#e2e8f0', fontWeight: 800, borderTop: '2px solid #94a3b8' }}>
                                <td className="fe-name-col" style={{ fontWeight: 900 }}>
                                  TOTAL
                                </td>
                                {['9-11', '11-1', '1-3', '3-5', '5-6'].map((slot) =>
                                  ['KB', 'SC', 'NAVI', 'MV'].map((p) => (
                                    <td key={`tot-${slot}-${p}`} style={{ fontWeight: 900, background: p === 'NAVI' ? '#cffafe' : undefined, color: p === 'NAVI' ? '#0891b2' : undefined }}>
                                      {reportColumnTotals[slot]?.[p] || 0}
                                    </td>
                                  ))
                                )}
                                <td style={{ background: '#3b82f6', color: '#fff', fontWeight: 900, fontSize: '13px' }}>
                                  {reportGrandTotalVisits}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="card table-card">
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>Daily Agent Visits Log ({reportVisits.length})</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Detailed field movements, contact outcomes, and GPS verification status
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={downloadDailyVisitsExcel}>
                            <FileSpreadsheet size={13} color="#16a34a" /> Excel
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                            <Printer size={13} /> Print
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={shareReportViaWhatsApp}
                            title="Share daily visits on WhatsApp"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </button>
                        </div>
                      </div>

                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Visit Date & Time</th>
                              <th>Customer Details</th>
                              <th>Field Staff</th>
                              <th>Outcome Status</th>
                              <th>Collected / PTP Amount</th>
                              <th>GPS Status</th>
                              <th>Notes & Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportVisits.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                  No visit logs recorded for the selected date range and filter criteria.
                                </td>
                              </tr>
                            ) : (
                              reportVisits.map((v) => (
                                <tr key={v._id}>
                                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {new Date(v.createdAt || v.serverTimestamp).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {new Date(v.createdAt || v.serverTimestamp).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </td>
                                  <td>
                                    <strong>{v.customerId?.name || 'Customer'}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      {v.customerId?.loanAccountNo}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      📍 {v.customerId?.area || v.customerId?.city}
                                    </div>
                                  </td>
                                  <td>
                                    <strong>{v.staffId?.name || 'Unassigned'}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {v.staffId?.phone || v.staffId?.assignedArea}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        v.outcome === 'Payment Collected'
                                          ? 'badge-success'
                                          : v.outcome === 'Promise to Pay (PTP)'
                                          ? 'badge-warning'
                                          : v.outcome === 'House Locked'
                                          ? 'badge-neutral'
                                          : 'badge-danger'
                                      }`}
                                    >
                                      {v.outcome}
                                    </span>
                                  </td>
                                  <td>
                                    {v.collectedAmount > 0 ? (
                                      <div>
                                        <strong style={{ color: 'var(--success-text)' }}>
                                          ₹{v.collectedAmount?.toLocaleString('en-IN')}
                                        </strong>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                          via {v.paymentMethod}
                                        </div>
                                      </div>
                                    ) : v.ptpAmount > 0 ? (
                                      <div>
                                        <strong style={{ color: 'var(--warning-text)' }}>
                                          ₹{v.ptpAmount?.toLocaleString('en-IN')} PTP
                                        </strong>
                                        {v.ptpDate && (
                                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Due: {new Date(v.ptpDate).toLocaleDateString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        v.verificationStatus === 'LOCATION_MATCHED'
                                          ? 'badge-success'
                                          : v.verificationStatus === 'OUTSIDE_RADIUS'
                                          ? 'badge-danger'
                                          : 'badge-neutral'
                                      }`}
                                      style={{ fontSize: '10.5px' }}
                                    >
                                      {v.verificationStatus === 'LOCATION_MATCHED'
                                        ? 'VERIFIED'
                                        : v.verificationStatus === 'OUTSIDE_RADIUS'
                                        ? 'OFF-SITE'
                                        : 'UNCHECKED'}
                                    </span>
                                    {v.distanceMetres !== undefined && v.distanceMetres > 0 && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {Math.round(v.distanceMetres)}m away
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ maxWidth: '200px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.notes}>
                                      {v.notes || '—'}
                                    </div>
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
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 8: SETTINGS & ADMIN MANAGEMENT */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <div>
              {/* Settings Sub-Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('admins')}
                  className={`btn btn-sm ${settingsSubTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '6px' }}
                >
                  <Users size={14} /> System Administrators
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('policies')}
                  className={`btn btn-sm ${settingsSubTab === 'policies' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '6px' }}
                >
                  <Settings size={14} /> Operational Policies & Geofence
                </button>
              </div>

              {/* Sub-Tab 1: Administrators Management */}
              {settingsSubTab === 'admins' && (
                <AdminAccountsView
                  apiFetch={apiFetch}
                  adminUser={adminUser}
                  currentAdminId={adminUser?.id || adminUser?._id}
                />
              )}

              {/* Sub-Tab 2: Operational Policies */}
              {settingsSubTab === 'policies' && (
                <div className="card" style={{ maxWidth: '680px', padding: '24px' }}>
                  <h3 className="card-title">Settings & Operational Policies</h3>
                  <p className="card-subtitle" style={{ marginBottom: '20px' }}>
                    Tune geospatial thresholds and operational limits for field agents.
                  </p>

                  <form onSubmit={handleSaveSettings}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                        Geofence Radius Threshold (Metres)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={settingsForm.geofenceRadiusMetres}
                        onChange={(e) => setSettingsForm({ ...settingsForm, geofenceRadiusMetres: Number(e.target.value) })}
                        required
                      />
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Visits initiated beyond this radius from registered customer coordinates are flagged as suspicious.
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                        Maximum Cash Limit per Visit (₹)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={settingsForm.maxCashCollectionLimit}
                        onChange={(e) => setSettingsForm({ ...settingsForm, maxCashCollectionLimit: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                        OTP Expiry Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={settingsForm.otpExpiryMinutes}
                        onChange={(e) => setSettingsForm({ ...settingsForm, otpExpiryMinutes: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary">
                      Save Policy Configuration
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODALS */}
      {/* ================================================================ */}

      {/* CREATE STAFF MODAL */}
      {showCreateStaffModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="card-title">Register Field Staff</h3>
              <button onClick={() => setShowCreateStaffModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className="modal-body">
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Full Name *</label>
                  <input type="text" className="input-field" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Mobile Phone *</label>
                  <input type="text" className="input-field" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Employee ID</label>
                  <input type="text" className="input-field" value={staffForm.employeeId} onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })} placeholder="STF-102" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Assigned Area / Territory</label>
                  <input type="text" className="input-field" value={staffForm.assignedArea} onChange={(e) => setStaffForm({ ...staffForm, assignedArea: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIFIED CUSTOMER CASE MANAGER MODAL (FILE UPLOAD + SINGLE CASE ENTRY) */}
      {(showImportModal || showCreateCustomerModal) && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="card-title">Add & Import Customer Cases</h3>
                  <p className="card-subtitle" style={{ fontSize: '12px' }}>
                    Upload spreadsheet/document files or enter customer cases individually
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setShowCreateCustomerModal(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div style={{ padding: '0 24px' }}>
              <div className="modal-tab-nav">
                <button
                  type="button"
                  className={`modal-tab-btn ${importModalTab === 'file' ? 'active' : ''}`}
                  onClick={() => setImportModalTab('file')}
                >
                  <FileSpreadsheet size={16} /> Upload File (XLSX, DOC, PDF)
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${importModalTab === 'single' ? 'active' : ''}`}
                  onClick={() => setImportModalTab('single')}
                >
                  <Plus size={16} /> Add Single Case
                </button>
              </div>
            </div>

            {/* TAB 1: FILE UPLOAD (XLSX, XLS, CSV, DOC, DOCX, PDF) */}
            {importModalTab === 'file' && (
              <div>
                <div className="modal-body">
                  {/* Supported Format Pills */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span className="file-pill badge-file-xlsx">
                      <FileSpreadsheet size={14} /> Excel (.xlsx, .xls, .csv)
                    </span>
                    <span className="file-pill badge-file-pdf">
                      <File size={14} /> PDF Document (.pdf)
                    </span>
                    <span className="file-pill badge-file-doc">
                      <FileText size={14} /> Word Document (.docx, .doc)
                    </span>
                  </div>

                  {/* Drag & Drop File Zone */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />

                  <div
                    className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                        Choose a file or drag & drop here
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Supports Microsoft Excel (.xlsx), CSV, Word (.docx) & PDF files up to 25MB
                      </span>
                    </div>
                  </div>

                  {/* File Status & Preview */}
                  {parsingFile && (
                    <div style={{ marginTop: '16px', textAlign: 'center', padding: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Reading and analyzing file contents...</span>
                    </div>
                  )}

                  {parseError && (
                    <div style={{ marginTop: '14px', padding: '12px', background: 'var(--danger-light)', border: '1px solid var(--danger-border)', borderRadius: '8px', color: 'var(--danger-text)', fontSize: '13px' }}>
                      {parseError}
                    </div>
                  )}

                  {importFile && !parsingFile && (
                    <div style={{ marginTop: '16px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {importFile.name.endsWith('.pdf') ? (
                            <File size={22} color="#dc2626" />
                          ) : importFile.name.endsWith('.xlsx') || importFile.name.endsWith('.xls') || importFile.name.endsWith('.csv') ? (
                            <FileSpreadsheet size={22} color="#16a34a" />
                          ) : (
                            <FileText size={22} color="#0284c7" />
                          )}
                          <div>
                            <strong>{importFile.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {(importFile.size / 1024).toFixed(1)} KB • {importFile.type || 'Document'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setImportFile(null);
                            setParsedCases([]);
                            setDocumentNote('');
                          }}
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>

                      {documentNote && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--info-text)', background: 'var(--info-light)', padding: '8px 12px', borderRadius: '6px' }}>
                          ℹ️ {documentNote}
                        </div>
                      )}

                      {/* Spreadsheet Parsed Rows Preview */}
                      {parsedCases.length > 0 && (
                        <div style={{ marginTop: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success-text)' }}>
                              ✓ {parsedCases.length} recovery cases detected
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Showing preview of first {Math.min(5, parsedCases.length)} cases
                            </span>
                          </div>

                          <div className="table-preview-compact">
                            <table>
                              <thead>
                                <tr>
                                  <th>Customer Name</th>
                                  <th>Loan A/C</th>
                                  <th>Phone</th>
                                  <th>Outstanding (TOS)</th>
                                  <th>POS / Loan Amt</th>
                                  <th>DPD</th>
                                  <th>Address & City</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedCases.slice(0, 5).map((row, i) => (
                                  <tr key={i}>
                                    <td><strong>{row.name}</strong></td>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.loanAccountNo}</td>
                                    <td><span style={{ fontWeight: '600', color: 'var(--primary)' }}>{row.phone}</span></td>
                                    <td><strong>₹{row.outstandingAmount?.toLocaleString('en-IN')}</strong></td>
                                    <td style={{ fontSize: '12px' }}>
                                      {row.pos ? (
                                        <div>POS: ₹{row.pos.toLocaleString('en-IN')}</div>
                                      ) : null}
                                      {row.loanAmount ? (
                                        <div style={{ color: 'var(--text-muted)' }}>Loan: ₹{row.loanAmount.toLocaleString('en-IN')}</div>
                                      ) : null}
                                      {!row.pos && !row.loanAmount && row.emiAmount ? (
                                        <div>EMI: ₹{row.emiAmount.toLocaleString('en-IN')}</div>
                                      ) : null}
                                      {!row.pos && !row.loanAmount && !row.emiAmount ? '—' : null}
                                    </td>
                                    <td>
                                      {row.dpd ? (
                                        <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                          {row.dpd} DPD
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </td>
                                    <td style={{ maxWidth: '220px', fontSize: '12px' }}>
                                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.address}
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {row.city || 'Kozhikode'}{row.pincode ? ` • ${row.pincode}` : ''}{row.area && row.area !== row.city ? ` (${row.area})` : ''}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Assignment & Batch Options */}
                          <div className="grid-2" style={{ marginTop: '14px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                Assign all cases to Field Staff:
                              </label>
                              <select
                                className="input-field"
                                value={importDefaultStaff}
                                onChange={(e) => setImportDefaultStaff(e.target.value)}
                              >
                                <option value="">Auto / Leave Unassigned</option>
                                {staffList.map((stf) => (
                                  <option key={stf._id} value={stf._id}>
                                    {stf.name} ({stf.assignedArea || 'Field Staff'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                Recovery Batch Month:
                              </label>
                              <input
                                type="text"
                                className="input-field"
                                value={importBatchMonth}
                                onChange={(e) => setImportBatchMonth(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDownloadSampleTemplate}
                    style={{ marginRight: 'auto' }}
                  >
                    <Download size={14} /> Download Sample Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowImportModal(false);
                      setShowCreateCustomerModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={importing || (!importFile && parsedCases.length === 0)}
                    onClick={handleConfirmBatchImport}
                  >
                    {importing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Import {parsedCases.length > 0 ? `${parsedCases.length} Cases` : 'File'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SINGLE CASE ENTRY FORM */}
            {importModalTab === 'single' && (
              <form onSubmit={handleCreateCustomer}>
                <div className="modal-body">
                  <div style={{ marginBottom: '14px', background: 'var(--primary-light)', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', color: 'var(--primary-dark)' }}>
                    Add an individual customer case with loan details and optional document attachments (PDF, DOC, XLSX).
                  </div>

                  <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Customer Full Name *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        placeholder="e.g. Rahul Nambiar"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        className="input-field"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        placeholder="e.g. 9847123456"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Loan Account Number *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerForm.loanAccountNo}
                        onChange={(e) => setCustomerForm({ ...customerForm, loanAccountNo: e.target.value })}
                        placeholder="e.g. LON-2026-880"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Area / Locality
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerForm.area}
                        onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
                        placeholder="e.g. Beach Road, Mavoor"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                      Residential Address *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      placeholder="e.g. House No 12, Kallai Road, Kozhikode"
                      required
                    />
                  </div>

                  <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Outstanding Amount (₹) *
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={customerForm.outstandingAmount}
                        onChange={(e) => setCustomerForm({ ...customerForm, outstandingAmount: e.target.value })}
                        placeholder="e.g. 35000"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Due EMI Amount (₹)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        value={customerForm.emiAmount}
                        onChange={(e) => setCustomerForm({ ...customerForm, emiAmount: e.target.value })}
                        placeholder="e.g. 4500"
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Assign Field Staff
                      </label>
                      <select
                        className="input-field"
                        value={customerForm.assignedStaff}
                        onChange={(e) => setCustomerForm({ ...customerForm, assignedStaff: e.target.value })}
                      >
                        <option value="">Leave Unassigned</option>
                        {staffList.map((stf) => (
                          <option key={stf._id} value={stf._id}>
                            {stf.name} ({stf.assignedArea || 'Field Staff'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        Batch Month
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={customerForm.batchMonth}
                        onChange={(e) => setCustomerForm({ ...customerForm, batchMonth: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* DOCUMENT ATTACHMENT SECTION (XLSX, DOC, PDF) */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700' }}>
                          Attach Case Documents (Optional)
                        </label>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Upload loan agreements, notices, or statements (PDF, DOC, DOCX, XLSX)
                        </span>
                      </div>

                      <input
                        ref={singleDocInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={handleSingleDocUpload}
                      />

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => singleDocInputRef.current?.click()}
                        disabled={uploadingSingleDoc}
                      >
                        <Paperclip size={13} /> {uploadingSingleDoc ? 'Uploading...' : 'Attach File'}
                      </button>
                    </div>

                    {/* Attached Document Pills */}
                    {customerForm.documents && customerForm.documents.length > 0 ? (
                      <div className="file-badge-group">
                        {customerForm.documents.map((doc, idx) => (
                          <div key={idx} className="file-pill">
                            {doc.fileType === 'pdf' ? (
                              <File size={14} color="#dc2626" />
                            ) : doc.fileType?.includes('xls') || doc.fileType === 'csv' ? (
                              <FileSpreadsheet size={14} color="#16a34a" />
                            ) : (
                              <FileText size={14} color="#0284c7" />
                            )}
                            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.name}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              ({(doc.size / 1024).toFixed(0)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSingleDoc(idx)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                        No files attached yet. Click "Attach File" to add PDF, DOC, or XLSX files for this case.
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowImportModal(false);
                      setShowCreateCustomerModal(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={15} /> Save Customer Case
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CUSTOMER FILES & PHOTO RECORDS MODAL */}
      {selectedCustomerForDoc && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ECFDF5', padding: '8px', borderRadius: '8px', color: '#047857' }}>
                  <Image size={22} />
                </div>
                <div>
                  <h3 className="card-title">Customer Files & Photo Records</h3>
                  <p className="card-subtitle" style={{ fontSize: '12px' }}>
                    {selectedCustomerForDoc.name} • A/C: <strong>{selectedCustomerForDoc.loanAccountNo}</strong> • Phone: {selectedCustomerForDoc.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleClearSelectedDoc();
                  setSelectedCustomerForDoc(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              {/* Customer Quick Stats Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                <div><strong>Outstanding:</strong> <span style={{ color: '#047857', fontWeight: 700 }}>₹{selectedCustomerForDoc.outstandingAmount?.toLocaleString('en-IN')}</span></div>
                <div>•</div>
                <div><strong>Area:</strong> {selectedCustomerForDoc.area || selectedCustomerForDoc.city || 'Kozhikode'}</div>
                <div>•</div>
                <div><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedCustomerForDoc.status}</span></div>
                <div>•</div>
                <div><strong>Staff:</strong> {selectedCustomerForDoc.assignedStaff?.name || 'Unassigned'}</div>
              </div>

              {/* SECTION 1: UPLOAD NEW FILE / PHOTO FORM */}
              <div style={{ background: '#FFFFFF', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ fontSize: '13.5px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} color="var(--primary)" /> Attach New File or Photo
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    JPG, PNG, WEBP, PDF, DOCX, XLSX
                  </span>
                </div>

                {/* File picker drop box */}
                <input
                  ref={docModalInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,.png,.jpg,.jpeg,.webp"
                  style={{ display: 'none' }}
                  onChange={handleSelectDocFile}
                />

                {!docFile ? (
                  <div
                    onClick={() => docModalInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--primary)',
                      borderRadius: '10px',
                      padding: '18px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--primary-light)',
                      marginBottom: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'inline-flex', padding: '8px', background: '#FFFFFF', borderRadius: '50%', color: 'var(--primary)', marginBottom: '6px' }}>
                      <Camera size={22} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-dark)' }}>
                      Click to choose photo or document
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      Upload customer portrait, identity proof, loan contract, or house photo
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {docPreviewUrl ? (
                          <img
                            src={docPreviewUrl}
                            alt="Preview"
                            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1.5px solid #047857' }}
                          />
                        ) : (
                          <div style={{ width: '48px', height: '48px', background: '#E0F2FE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                            <FileText size={24} />
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: '13px', display: 'block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {docFile.name}
                          </strong>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {(docFile.size / 1024).toFixed(1)} KB • {docFile.type || 'Document'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelectedDoc}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--danger)' }}
                      >
                        <X size={12} /> Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Metadata Fields: Title, Category, Notes */}
                <div className="grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                      Document / Photo Title *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      style={{ fontSize: '13px', padding: '7px 10px' }}
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. Customer Photo, Aadhaar Card, Loan Agreement"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                      Category / Type *
                    </label>
                    <select
                      className="input-field"
                      style={{ fontSize: '13px', padding: '7px 10px' }}
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                    >
                      <option value="Customer Photo">Customer Photo / Portrait</option>
                      <option value="ID Proof / KYC">ID Proof / KYC (Aadhaar, PAN, Voter)</option>
                      <option value="Loan Agreement">Loan Agreement / Sanction Letter</option>
                      <option value="House / Property Photo">House / Property Photo</option>
                      <option value="Bank Document">Bank Passbook / Cheque</option>
                      <option value="Legal Notice">Legal Notice / Demand Letter</option>
                      <option value="Other Document">Other Document</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                    Remarks / Details (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '13px', padding: '7px 10px' }}
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="e.g. Captured during field verification, original verified"
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                  onClick={handleSubmitCustomerDoc}
                  disabled={uploadingDocModal || !docFile}
                >
                  {uploadingDocModal ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Uploading & Saving Record...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} /> Upload File & Save Record
                    </>
                  )}
                </button>
              </div>

              {/* SECTION 2: ATTACHED FILES & PHOTOS LIST */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px', color: '#1E293B' }}>
                    Customer Files & Photos ({selectedCustomerForDoc.documents?.length || 0})
                  </strong>
                </div>

                {(!selectedCustomerForDoc.documents || selectedCustomerForDoc.documents.length === 0) ? (
                  <div style={{ padding: '24px', background: '#F8FAFC', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', border: '1px solid #E2E8F0' }}>
                    <Image size={28} color="#94A3B8" style={{ marginBottom: '6px' }} />
                    <div>No files or photos uploaded for this customer yet.</div>
                    <div style={{ fontSize: '11.5px', marginTop: '2px' }}>Use the form above to attach customer photos or documents.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedCustomerForDoc.documents.map((doc, idx) => {
                      const isImg = doc.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(doc.name || '') || /\.(jpg|jpeg|png|webp)$/i.test(doc.url || '');
                      return (
                        <div
                          key={doc._id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            background: '#FFFFFF',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            {isImg ? (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Click to view full photo">
                                <img
                                  src={doc.url}
                                  alt={doc.name}
                                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                />
                              </a>
                            ) : (
                              <div style={{ width: '44px', height: '44px', background: doc.fileType === 'pdf' ? '#FEE2E2' : '#DCFCE7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {doc.fileType === 'pdf' ? (
                                  <File size={22} color="#DC2626" />
                                ) : doc.fileType?.includes('xls') || doc.fileType === 'csv' ? (
                                  <FileSpreadsheet size={22} color="#16A34A" />
                                ) : (
                                  <FileText size={22} color="#0284C7" />
                                )}
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                <strong style={{ fontSize: '13px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                                  {doc.name}
                                </strong>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  background: doc.category === 'Customer Photo' ? '#DCFCE7' : doc.category?.includes('ID') ? '#E0F2FE' : '#FEF3C7',
                                  color: doc.category === 'Customer Photo' ? '#166534' : doc.category?.includes('ID') ? '#0369A1' : '#B45309',
                                }}>
                                  {doc.category || 'General'}
                                </span>
                              </div>
                              {doc.notes && (
                                <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '2px', fontStyle: 'italic' }}>
                                  "{doc.notes}"
                                </div>
                              )}
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {doc.size ? `${(doc.size / 1024).toFixed(1)} KB • ` : ''}
                                Uploaded {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ textDecoration: 'none', gap: '4px', fontSize: '12px' }}
                              title="Open file / photo in new tab"
                            >
                              <ExternalLink size={12} /> View
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomerDoc(doc._id || doc.url)}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)', padding: '5px 8px' }}
                              title="Delete this file"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', padding: '12px 20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  handleClearSelectedDoc();
                  setSelectedCustomerForDoc(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGN STAFF MODAL */}
      {reassignModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="card-title">Reassign Case: {reassignModal.name}</h3>
              <button onClick={() => setReassignModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Select a field staff member to assign this customer recovery case:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {staffList.map((stf) => (
                  <button
                    key={stf._id}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'space-between', padding: '10px 14px' }}
                    onClick={() => handleReassignStaff(stf._id)}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <strong>{stf.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stf.assignedArea}</div>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUSPICIOUS VISIT MODAL REVIEW */}
      {selectedSuspicious && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="card-title">Review Geofence Flag</h3>
              <button onClick={() => setSelectedSuspicious(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Enter supervisory audit notes for this visit review:
              </p>
              <textarea
                className="input-field"
                style={{ height: '90px' }}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedSuspicious(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => handleReviewSuspicious('CONFIRMED_VIOLATION')}>Confirm Violation</button>
              <button type="button" className="btn btn-primary" onClick={() => handleReviewSuspicious('EXCUSED')}>Approve & Excuse</button>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-card" style={{ maxWidth: '600px', padding: '16px', textAlign: 'center' }}>
            <img src={selectedPhoto} alt="Evidence photo" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} />
            <div style={{ marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedPhoto(null)}>Close Lightbox</button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD VISIT / COLLECTION FOR FIELD STAFF MODAL */}
      {showRecordStaffModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="card-title">Record Data for Field Staff</h3>
                  <p className="card-subtitle" style={{ fontSize: '12px' }}>
                    Log an on-field customer visit or payment collection for any staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordStaffModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStaffRecord}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* 1. Field Staff Selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Select Field Staff *
                  </label>
                  <select
                    className="input-field"
                    value={recordStaffForm.staffId}
                    onChange={(e) => setRecordStaffForm({ ...recordStaffForm, staffId: e.target.value })}
                    required
                  >
                    <option value="">— Choose Field Staff Member —</option>
                    {staffList.map((stf) => (
                      <option key={stf._id} value={stf._id}>
                        {stf.name} • {stf.assignedArea || 'Field Operations'} ({stf.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Customer Case Selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Select Customer Case *
                  </label>
                  <select
                    className="input-field"
                    value={recordStaffForm.customerId}
                    onChange={(e) => setRecordStaffForm({ ...recordStaffForm, customerId: e.target.value })}
                    required
                  >
                    <option value="">— Choose Customer / Loan A/C —</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (A/C: {c.loanAccountNo}) • Due: ₹{c.outstandingAmount?.toLocaleString('en-IN')} • {c.area || c.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Outcome Selection */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Visit Outcome *
                  </label>
                  <select
                    className="input-field"
                    value={recordStaffForm.outcome}
                    onChange={(e) => setRecordStaffForm({ ...recordStaffForm, outcome: e.target.value })}
                    required
                  >
                    <option value="Payment Collected">💰 Payment Collected</option>
                    <option value="Promise to Pay (PTP)">🤝 Promise to Pay (PTP)</option>
                    <option value="House Locked">🚪 House Locked</option>
                    <option value="Customer Unavailable">👤 Customer Unavailable</option>
                    <option value="Refused to Pay">🚫 Refused to Pay</option>
                    <option value="Wrong Address">❓ Wrong Address / Untraceable</option>
                    <option value="Other Feedback">📝 Other Feedback</option>
                  </select>
                </div>

                {/* 4. Payment Fields (if Payment Collected) */}
                {recordStaffForm.outcome === 'Payment Collected' && (
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success-text)', marginBottom: '10px' }}>
                      Collection Details
                    </div>

                    <div className="grid-2">
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Collected Amount (₹) *
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="e.g. 5000"
                          value={recordStaffForm.collectedAmount}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, collectedAmount: e.target.value })}
                          required
                          min="1"
                        />
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Payment Method
                        </label>
                        <select
                          className="input-field"
                          value={recordStaffForm.paymentMethod}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, paymentMethod: e.target.value })}
                        >
                          <option value="Cash">Cash Currency</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="Bank Transfer">Bank Transfer / IMPS</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Reference / UTR / Receipt No
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. UTR-98234190"
                          value={recordStaffForm.paymentReference}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, paymentReference: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Verification Approval
                        </label>
                        <select
                          className="input-field"
                          value={recordStaffForm.paymentStatus}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, paymentStatus: e.target.value })}
                        >
                          <option value="APPROVED">Auto-Approve (Deduct Balance)</option>
                          <option value="PENDING_VERIFICATION">Hold for Verification</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. PTP Fields (if Promise to Pay) */}
                {recordStaffForm.outcome === 'Promise to Pay (PTP)' && (
                  <div style={{ background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning-text)', marginBottom: '10px' }}>
                      PTP Commitment Details
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Promised Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="e.g. 10000"
                          value={recordStaffForm.ptpAmount}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, ptpAmount: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          Promised Payment Date
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={recordStaffForm.ptpDate}
                          onChange={(e) => setRecordStaffForm({ ...recordStaffForm, ptpDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Date & Notes */}
                <div className="grid-2" style={{ marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                      Visit Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      className="input-field"
                      value={recordStaffForm.visitDate}
                      onChange={(e) => setRecordStaffForm({ ...recordStaffForm, visitDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                      Staff Notes / Remarks
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Customer promised settlement by Monday"
                      value={recordStaffForm.notes}
                      onChange={(e) => setRecordStaffForm({ ...recordStaffForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRecordStaffModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={recordingStaffData}
                >
                  {recordingStaffData ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving Entry...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Save Staff Record
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIELD STAFF REGISTRATION DECLINE MODAL */}
      {staffRejectionModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '8px' }}>
                  <UserX size={20} />
                </div>
                <div>
                  <h3 className="card-title" style={{ color: '#991B1B' }}>Decline Staff Registration</h3>
                  <p className="card-subtitle" style={{ fontSize: '12px' }}>
                    Rejecting application for {staffRejectionModal.name} (+91 {staffRejectionModal.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffRejectionModal(null);
                  setCustomRejectReason('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Please select or specify a reason for declining this field staff member’s registration. This notice will be recorded on their profile:
              </div>

              {/* Preset Reason Chips */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Common Reasons (Tap to select):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    'Selfie verification photo is unclear or identity unconfirmed',
                    'Operating territory is outside current recovery coverage',
                    'Duplicate phone number or candidate profile already exists',
                    'Applicant identity credentials could not be verified by HR',
                    'Location coordinates invalid or untagged during sign-up',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`preset-chip-btn ${customRejectReason === preset ? 'selected' : ''}`}
                      onClick={() => setCustomRejectReason(preset)}
                    >
                      • {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom reason input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Detailed Reason / Custom Remark:
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Enter custom rejection reason..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStaffRejectionModal(null);
                  setCustomRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  const finalReason = customRejectReason.trim() || 'Selfie or territory details not verified';
                  handleReviewStaff(staffRejectionModal.staffId, 'REJECT', '', finalReason);
                  setStaffRejectionModal(null);
                  setCustomRejectReason('');
                }}
              >
                <XCircle size={15} /> Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile screens < 768px) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-bottom-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={`mobile-bottom-tab ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('approvals');
            setApprovalsFilter('pending');
          }}
        >
          <UserCheck size={20} />
          <span>Approvals</span>
          {stats?.pendingStaffApprovals > 0 && (
            <span className="mobile-bottom-badge">{stats.pendingStaffApprovals}</span>
          )}
        </button>
        <button
          className={`mobile-bottom-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <Users size={20} />
          <span>Cases</span>
        </button>
        <button
          className={`mobile-bottom-tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Briefcase size={20} />
          <span>Staff</span>
        </button>
        <button
          className="mobile-bottom-tab"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* NAVI OFFICIAL APP MANUAL VISIT ENTRY MODAL */}
      {showNaviModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowNaviModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)', border: '1px solid var(--border)' }}>
            <div className="modal-header" style={{ padding: '20px 24px', background: '#ffffff', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#ecfeff', color: '#0891b2', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cffafe', flexShrink: 0 }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 3px 0' }}>Enter Navi App Visit Counts</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                    Separate third-party Navi mobile recovery visits for <span style={{ fontWeight: 600, color: '#0891b2' }}>{reportStartDate}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNaviModal(false)}
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSingleNaviModal}>
              <div className="modal-body" style={{ padding: '22px 24px', background: '#ffffff' }}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main, #1e293b)' }}>
                    Select Field Staff <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <select
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid var(--border, #cbd5e1)', background: '#f8fafc' }}
                    value={naviModalForm.staffId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const existingStaff = reportTimeSlotMatrix.find((r) => r.staffId === sId);
                      const sCounts = {
                        '9-11': existingStaff?.slots?.['9-11']?.['NAVI'] === 'AB' ? 0 : Number(existingStaff?.slots?.['9-11']?.['NAVI']) || 0,
                        '11-1': existingStaff?.slots?.['11-1']?.['NAVI'] === 'AB' ? 0 : Number(existingStaff?.slots?.['11-1']?.['NAVI']) || 0,
                        '1-3': existingStaff?.slots?.['1-3']?.['NAVI'] === 'AB' ? 0 : Number(existingStaff?.slots?.['1-3']?.['NAVI']) || 0,
                        '3-5': existingStaff?.slots?.['3-5']?.['NAVI'] === 'AB' ? 0 : Number(existingStaff?.slots?.['3-5']?.['NAVI']) || 0,
                        '5-6': existingStaff?.slots?.['5-6']?.['NAVI'] === 'AB' ? 0 : Number(existingStaff?.slots?.['5-6']?.['NAVI']) || 0,
                      };
                      setNaviModalForm({ ...naviModalForm, staffId: sId, slots: sCounts });
                    }}
                    required
                  >
                    <option value="">— Choose Field Staff Member —</option>
                    {staffList.map((stf) => (
                      <option key={stf._id} value={stf._id}>
                        {stf.name} ({stf.assignedArea || 'Field Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #64748b)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Enter Visit Counts by Time Slot:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {['9-11', '11-1', '1-3', '3-5', '5-6'].map((slot) => (
                      <div
                        key={slot}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '10px 4px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px', color: '#0891b2' }}>
                          {slot}
                        </div>
                        <input
                          type="number"
                          min="0"
                          className="input-field no-spinner"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '15px',
                            padding: '6px 2px',
                            background: '#ffffff',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                          }}
                          value={naviModalForm.slots[slot] ?? 0}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value || 0, 10));
                            setNaviModalForm({
                              ...naviModalForm,
                              slots: { ...naviModalForm.slots, [slot]: isNaN(v) ? 0 : v },
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%)',
                  border: '1px solid #a5f3fc',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0e7490', display: 'block' }}>Total Navi Visits for Day:</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Calculated across all 5 slots</span>
                  </div>
                  <strong style={{ fontSize: '20px', fontWeight: 800, color: '#0891b2' }}>
                    {Object.values(naviModalForm.slots).reduce((a, b) => a + (Number(b) || 0), 0)}
                  </strong>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '13.5px', borderRadius: '8px' }} onClick={() => setShowNaviModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: '#0891b2',
                    borderColor: '#0891b2',
                    padding: '8px 20px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(8, 145, 178, 0.25)'
                  }}
                  disabled={savingNavi}
                >
                  {savingNavi ? 'Saving...' : 'Save Navi Visits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL/CSV IMPORT MODAL */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => {
          setShowBulkImportModal(false);
          setBulkImportInitialStaffId('');
        }}
        apiFetch={apiFetch}
        portfolios={portfolios}
        staffList={staffList}
        initialPortfolioId={bulkImportInitialPortfolio}
        initialStaffId={bulkImportInitialStaffId}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ADD DATA FOR STAFF MODAL (SINGLE CASE & SPREADSHEET FILE) */}
      <AddDataStaffModal
        isOpen={Boolean(addDataStaffTarget)}
        onClose={() => setAddDataStaffTarget(null)}
        staff={addDataStaffTarget}
        portfolios={portfolios}
        apiFetch={apiFetch}
        onSuccess={() => {
          loadData();
        }}
        onOpenAdvancedImport={(staffId) => {
          setBulkImportInitialStaffId(staffId);
          setShowBulkImportModal(true);
        }}
      />

      {/* ACTIVATE / DEACTIVATE CONFIRMATION MODAL */}
      {statusConfirmStaff && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10001 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTogglingStatus) setStatusConfirmStaff(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '440px', width: '92%' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: statusConfirmStaff.targetStatus === 'inactive' ? 'var(--danger-text)' : 'var(--primary)',
                }}
              >
                {statusConfirmStaff.targetStatus === 'inactive' ? (
                  <AlertTriangle size={19} />
                ) : (
                  <UserCheck size={19} />
                )}
                <h3
                  className="modal-title"
                  style={{
                    color: statusConfirmStaff.targetStatus === 'inactive' ? 'var(--danger-text)' : 'var(--primary)',
                    fontSize: '16px',
                  }}
                >
                  {statusConfirmStaff.targetStatus === 'inactive' ? 'Deactivate Staff' : 'Activate Staff'}
                </h3>
              </div>
              <button
                onClick={() => !isTogglingStatus && setStatusConfirmStaff(null)}
                className="modal-close-btn"
                disabled={isTogglingStatus}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '14px', lineHeight: '1.5' }}>
                Are you sure you want to {statusConfirmStaff.targetStatus === 'inactive' ? 'deactivate' : 'activate'}{' '}
                <strong>{statusConfirmStaff.name}</strong> ({statusConfirmStaff.employeeId || 'STF-101'})?
              </p>

              {statusConfirmStaff.targetStatus === 'inactive' ? (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: '8px',
                    color: 'var(--danger-text)',
                    fontSize: '12.5px',
                    marginBottom: '18px',
                    lineHeight: '1.45',
                  }}
                >
                  ⚠️ <strong>Notice:</strong> Once deactivated, this field staff will be immediately blocked from logging in or conducting customer field visits on the FieldFlow mobile application.
                </div>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#ECFDF5',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    color: '#065F46',
                    fontSize: '12.5px',
                    marginBottom: '18px',
                    lineHeight: '1.45',
                  }}
                >
                  ✓ <strong>Notice:</strong> Activating this staff will grant them full field access to log in, view assigned portfolios and recovery cases, and record field visits.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStatusConfirmStaff(null)}
                  className="btn btn-secondary"
                  disabled={isTogglingStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStaffStatus(statusConfirmStaff.staffId, statusConfirmStaff.currentStatus)}
                  className={`btn ${statusConfirmStaff.targetStatus === 'inactive' ? 'btn-danger' : 'btn-primary'}`}
                  disabled={isTogglingStatus}
                  style={{ gap: '6px' }}
                >
                  {isTogglingStatus ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : statusConfirmStaff.targetStatus === 'inactive' ? (
                    <XCircle size={14} />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  {isTogglingStatus
                    ? 'Updating...'
                    : statusConfirmStaff.targetStatus === 'inactive'
                    ? 'Yes, Deactivate'
                    : 'Yes, Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP PHOTO SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={whatsAppModal.isOpen}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, isOpen: false }))}
        imageData={whatsAppModal.imageData}
        title={whatsAppModal.title}
        recipientName={whatsAppModal.recipientName}
        phone={whatsAppModal.phone}
      />

      {/* STAFF DETAILS VERIFICATION MODAL */}
      <StaffDetailsModal
        isOpen={!!selectedStaffDetails}
        onClose={() => setSelectedStaffDetails(null)}
        staff={selectedStaffDetails}
        onApprove={(id, area) => handleReviewStaff(id, 'APPROVE', area)}
        onDecline={(id, reason) => handleReviewStaff(id, 'REJECT', '', reason)}
        onOpenEdit={(staff) => {
          setSelectedStaffDetails(null);
          setEditingStaff(staff);
        }}
        getPhotoUrl={getPhotoUrl}
      />

      {/* EDIT STAFF DETAILS MODAL */}
      <EditStaffModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        staff={editingStaff}
        onSave={handleUpdateStaffDetails}
        isSaving={isUpdatingStaff}
      />
    </div>
  );
}
