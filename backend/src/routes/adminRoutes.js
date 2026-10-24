import express from 'express';
import {
  getDashboardStats,
  listStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  reviewStaffRegistration,
  deleteStaff,
  reassignCases,
  listCustomers,
  createCustomer,
  importMonthlyCases,
  addCustomerDocument,
  deleteCustomerDocument,
  getAllLocations,
  listCollections,
  verifyPayment,
  getSettings,
  updateSettings,
  getDailyVisitsReport,
  getCollectionsReport,
  recordStaffVisit,
  getAuditLogs,
  saveExternalVisitMetric,
  saveBulkExternalVisitMetrics,
  listAdmins,
  createAdmin,
  updateAdminStatus,
  deleteAdmin,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require admin or super_admin authentication
router.use(protect);
router.use(authorize('admin', 'super_admin'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/staff', listStaff);
router.post('/staff', createStaff);
router.put('/staff/:id', updateStaff);
router.put('/staff/:id/status', updateStaffStatus);
router.put('/staff/:id/review', reviewStaffRegistration);
router.delete('/staff/:id', deleteStaff);
router.post('/staff/reassign', reassignCases);

router.get('/customers', listCustomers);
router.post('/customers', createCustomer);
router.post('/customers/:id/documents', addCustomerDocument);
router.delete('/customers/:id/documents/:docId', deleteCustomerDocument);
router.post('/cases/import', importMonthlyCases);

router.get('/locations', getAllLocations);
router.get('/collections', listCollections);
router.put('/collections/:visitId/verify', verifyPayment);

// Reports & Staff Data Entry
router.get('/reports/daily-visits', getDailyVisitsReport);
router.get('/reports/collections', getCollectionsReport);
router.post('/reports/external-visits', saveExternalVisitMetric);
router.post('/reports/external-visits/bulk', saveBulkExternalVisitMetrics);
router.post('/visits/record', recordStaffVisit);
router.get('/audit-logs', getAuditLogs);

// Admin Management
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.put('/admins/:id/status', updateAdminStatus);
router.delete('/admins/:id', deleteAdmin);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
