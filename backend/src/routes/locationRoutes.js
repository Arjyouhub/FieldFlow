import express from 'express';
import {
  saveInitialLocation,
  addCustomerLocation,
  getCustomerLocations,
  updateLocationStatus,
} from '../controllers/locationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/initial', saveInitialLocation);
router.post('/add', addCustomerLocation);
router.get('/customer/:customerId', getCustomerLocations);
router.patch('/:locationId/status', authorize('admin'), updateLocationStatus);

export default router;
