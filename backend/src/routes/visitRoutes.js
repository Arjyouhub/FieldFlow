import express from 'express';
import {
  precheckVisitGPS,
  submitVisit,
  getSuspiciousVisits,
  reviewSuspiciousVisit,
} from '../controllers/visitController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/precheck-gps', precheckVisitGPS);
router.post('/submit', submitVisit);
router.get('/suspicious', authorize('admin', 'developer'), getSuspiciousVisits);
router.patch('/suspicious/:eventId/review', authorize('admin'), reviewSuspiciousVisit);

export default router;
