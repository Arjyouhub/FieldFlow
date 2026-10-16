import express from 'express';
import {
  listCases,
  getCaseById,
  reassignCases,
  importBulkCases,
} from '../controllers/caseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', listCases);
router.get('/:id', getCaseById);
router.post('/reassign', authorize('admin', 'super_admin'), reassignCases);
router.post('/import-bulk', authorize('admin', 'super_admin'), importBulkCases);

export default router;
