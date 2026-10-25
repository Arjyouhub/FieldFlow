import express from 'express';
import {
  listCases,
  getCaseById,
  reassignCases,
  importBulkCases,
  createSingleCase,
  deleteCase,
  restoreCase,
  bulkDeleteCases,
  bulkRestoreCases,
} from '../controllers/caseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listCases);
router.get('/:id', getCaseById);
router.post('/', authorize('admin', 'super_admin'), createSingleCase);
router.post('/reassign', authorize('admin', 'super_admin'), reassignCases);
router.post('/import-bulk', authorize('admin', 'super_admin'), importBulkCases);
router.delete('/:id', authorize('admin', 'super_admin'), deleteCase);
router.post('/:id/restore', authorize('admin', 'super_admin'), restoreCase);
router.post('/bulk-delete', authorize('admin', 'super_admin'), bulkDeleteCases);
router.post('/bulk-restore', authorize('admin', 'super_admin'), bulkRestoreCases);

export default router;

