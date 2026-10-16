import express from 'express';
import {
  listPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  listBatches,
  createBatch,
} from '../controllers/portfolioController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Read portfolios (Admin & Staff need to fetch active portfolios for filtering)
router.get('/', listPortfolios);
router.get('/batches', listBatches);
router.get('/:id', getPortfolioById);

// Admin-only mutations
router.post('/', authorize('admin', 'super_admin'), createPortfolio);
router.put('/:id', authorize('admin', 'super_admin'), updatePortfolio);
router.post('/batches', authorize('admin', 'super_admin'), createBatch);

export default router;
