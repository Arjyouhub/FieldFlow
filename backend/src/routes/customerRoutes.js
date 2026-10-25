import express from 'express';
import { Customer } from '../models/Customer.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { Visit } from '../models/Visit.js';
import { CallLog } from '../models/CallLog.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

import { Case } from '../models/Case.js';
import { Portfolio } from '../models/Portfolio.js';

const router = express.Router();

router.use(protect);

/**
 * Get cases assigned to the logged-in staff
 */
router.get('/assigned', async (req, res) => {
  try {
    const filter = {
      isDeleted: { $ne: true },
      ...(req.user.role === 'staff' ? { assignedStaff: req.user._id } : {}),
    };

    // 1. Check if records exist in Case model
    const cases = await Case.find(filter)
      .populate('customerId')
      .populate('portfolioId', 'name code defaultRadiusMetres')
      .sort({ createdAt: -1 });

    if (cases && cases.length > 0) {
      const enrichedCases = await Promise.all(
        cases.map(async (c) => {
          const cust = c.customerId ? (c.customerId.toObject ? c.customerId.toObject() : c.customerId) : {};
          const locations = cust._id
            ? await CustomerLocation.find({ customerId: cust._id, isActive: true })
            : [];

          return {
            ...cust,
            _id: cust._id || c._id,
            caseDbId: c._id,
            caseId: c.caseId,
            referenceNumber: c.referenceNumber,
            loanAccountNo: c.loanAccountNo || cust.loanAccountNo,
            outstandingAmount: c.outstandingAmount !== undefined ? c.outstandingAmount : cust.outstandingAmount,
            dueAmount: c.dueAmount !== undefined ? c.dueAmount : cust.emiAmount,
            status: c.status || cust.status,
            portfolioId: c.portfolioId?._id || cust.portfolioId,
            portfolioName: c.portfolioId?.name || cust.portfolioName || 'General',
            portfolioCode: c.portfolioId?.code || cust.portfolioCode || 'GENERAL',
            batchMonth: c.batchMonth || cust.batchMonth,
            locations,
          };
        })
      );

      return res.json({
        success: true,
        count: enrichedCases.length,
        customers: enrichedCases,
      });
    }

    // 2. Fallback to Customer model
    const rawCustomers = await Customer.find(filter)
      .populate('portfolioId', 'name code')
      .sort({ createdAt: -1 });

    const enrichedCustomers = await Promise.all(
      rawCustomers.map(async (cust) => {
        const locations = await CustomerLocation.find({ customerId: cust._id, isActive: true });
        return {
          ...cust.toObject(),
          portfolioName: cust.portfolioId?.name || cust.portfolioName || 'General',
          portfolioCode: cust.portfolioId?.code || cust.portfolioCode || 'GENERAL',
          locations,
        };
      })
    );

    return res.json({
      success: true,
      count: enrichedCustomers.length,
      customers: enrichedCustomers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Get customer by ID with locations, visits history, and call logs
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const locations = await CustomerLocation.find({ customerId: customer._id, isActive: true });
    const visits = await Visit.find({ customerId: customer._id })
      .populate('staffId', 'name phone employeeId')
      .sort({ createdAt: -1 });
    const calls = await CallLog.find({ customerId: customer._id })
      .populate('staffId', 'name phone')
      .sort({ createdAt: -1 });

    const formattedVisits = visits.map((v) => {
      const vObj = v.toObject();
      return {
        ...vObj,
        staffName: vObj.staffId?.name || vObj.staffName || 'Former Field Staff',
        staffPhone: vObj.staffId?.phone || vObj.staffPhone || '',
        staffEmployeeId: vObj.staffId?.employeeId || vObj.staffEmployeeId || '',
      };
    });

    return res.json({
      success: true,
      customer,
      locations,
      visits: formattedVisits,
      calls,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Seed demo customers for testing
 */
router.post('/seed-demo', async (req, res) => {
  try {
    const count = await Customer.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: 'Customers already exist' });
    }

    const demoCustomers = [
      {
        name: 'Mohammed Shafi',
        phone: '9847123456',
        loanAccountNo: 'LON-2026-901',
        address: 'Shafi Manzil, Near Beach Road, Kozhikode',
        city: 'Kozhikode',
        area: 'Beach Road',
        outstandingAmount: 24500,
        emiAmount: 3500,
        assignedStaff: req.user._id,
        status: 'pending',
        batchMonth: 'OCT-2026',
      },
      {
        name: 'Anjali Menon',
        phone: '9447654321',
        loanAccountNo: 'LON-2026-902',
        address: 'Menon Villa, Mavoor Road, Kozhikode',
        city: 'Kozhikode',
        area: 'Mavoor Road',
        outstandingAmount: 18000,
        emiAmount: 2800,
        assignedStaff: req.user._id,
        status: 'pending',
        batchMonth: 'OCT-2026',
      },
      {
        name: 'Pradeep Kumar',
        phone: '9745112233',
        loanAccountNo: 'LON-2026-903',
        address: 'Devi Nilayam, Thondayad Bypass, Kozhikode',
        city: 'Kozhikode',
        area: 'Thondayad',
        outstandingAmount: 42000,
        emiAmount: 6000,
        assignedStaff: req.user._id,
        status: 'pending',
        batchMonth: 'OCT-2026',
      },
    ];

    const inserted = await Customer.insertMany(demoCustomers);

    // Also seed a verified location for Mohammed Shafi (Near Calicut Beach: 11.2588, 75.7725)
    await CustomerLocation.create({
      customerId: inserted[0]._id,
      label: 'Customer Home',
      type: 'Home',
      coordinates: { lat: 11.2588, lng: 75.7725 },
      accuracy: 10,
      capturedBy: req.user._id,
      status: 'VERIFIED',
      isDefault: true,
      remarks: 'White two-story house near beach gate',
    });

    return res.status(201).json({
      success: true,
      message: 'Demo customers and initial location seeded successfully',
      customers: inserted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
