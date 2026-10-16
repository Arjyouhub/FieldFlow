import express from 'express';
import { CallLog } from '../models/CallLog.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.post('/', async (req, res) => {
  try {
    const { customerId, phoneNumberCalled, outcome, remarks } = req.body;

    if (!customerId || !phoneNumberCalled || !outcome) {
      return res.status(400).json({ success: false, message: 'customerId, phoneNumberCalled, and outcome are required.' });
    }

    const log = await CallLog.create({
      customerId,
      staffId: req.user._id,
      phoneNumberCalled,
      outcome,
      remarks: remarks || '',
    });

    return res.status(201).json({ success: true, message: 'Call log recorded', log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/customer/:customerId', async (req, res) => {
  try {
    const logs = await CallLog.find({ customerId: req.params.customerId })
      .populate('staffId', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
