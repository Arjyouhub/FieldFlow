import express from 'express';
import {
  getSystemOverview,
  getApiMetrics,
  getApplicationLogs,
  getSecurityEvents,
  resolveSecurityEvent,
  listActiveSessions,
  revokeSession,
  getAuditLogs,
} from '../controllers/developerController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require developer or super_admin authentication
router.use(protect);
router.use(authorize('developer', 'super_admin'));

router.get('/overview', getSystemOverview);
router.get('/metrics', getApiMetrics);
router.get('/logs', getApplicationLogs);
router.get('/security-events', getSecurityEvents);
router.post('/security-events/:id/resolve', resolveSecurityEvent);
router.get('/sessions', listActiveSessions);
router.post('/sessions/:id/revoke', revokeSession);
router.get('/audits', getAuditLogs);

export default router;
