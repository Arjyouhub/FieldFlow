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

          const resolvedPos = (c.pos !== undefined && c.pos !== null && c.pos > 0) ? c.pos : (cust.pos || 0);
          const resolvedTos = (c.tos !== undefined && c.tos !== null && c.tos > 0) ? c.tos : (cust.tos || c.outstandingAmount || cust.outstandingAmount || 0);
          const resolvedDpd = (c.dpd !== undefined && c.dpd !== null) ? c.dpd : (cust.dpd || 0);
          const resolvedLoanAmt = cust.loanAmount || c.outstandingAmount || cust.outstandingAmount || 0;
          const resolvedIsPlanned = c.isPlanned !== undefined ? Boolean(c.isPlanned) : Boolean(cust.isPlanned);
          const resolvedPlannedDate = c.plannedVisitDate || cust.plannedVisitDate || null;

          return {
            ...cust,
            _id: cust._id || c._id,
            caseDbId: c._id,
            caseId: c.caseId,
            referenceNumber: c.referenceNumber,
            loanAccountNo: c.loanAccountNo || cust.loanAccountNo,
            outstandingAmount: c.outstandingAmount !== undefined ? c.outstandingAmount : cust.outstandingAmount,
            dueAmount: c.dueAmount !== undefined ? c.dueAmount : cust.emiAmount,
            pos: resolvedPos,
            tos: resolvedTos,
            dpd: resolvedDpd,
            loanAmount: resolvedLoanAmt,
            isPlanned: resolvedIsPlanned,
            plannedVisitDate: resolvedPlannedDate,
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
        const custObj = cust.toObject();
        return {
          ...custObj,
          pos: custObj.pos || 0,
          tos: custObj.tos || custObj.outstandingAmount || 0,
          dpd: custObj.dpd || 0,
          loanAmount: custObj.loanAmount || custObj.outstandingAmount || 0,
          isPlanned: Boolean(custObj.isPlanned),
          plannedVisitDate: custObj.plannedVisitDate || null,
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
    let customerDoc = await Customer.findById(req.params.id);
    let associatedCase = null;

    if (!customerDoc) {
      associatedCase = await Case.findById(req.params.id).populate('portfolioId', 'name code');
      if (associatedCase && associatedCase.customerId) {
        customerDoc = await Customer.findById(associatedCase.customerId);
      }
    } else {
      associatedCase = await Case.findOne({ customerId: customerDoc._id }).populate('portfolioId', 'name code');
    }

    if (!customerDoc && !associatedCase) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customerObj = customerDoc ? customerDoc.toObject() : {};
    const locations = customerDoc?._id
      ? await CustomerLocation.find({ customerId: customerDoc._id, isActive: true })
      : [];

    const visits = customerDoc?._id
      ? await Visit.find({ customerId: customerDoc._id })
          .populate('staffId', 'name phone employeeId')
          .sort({ createdAt: -1 })
      : [];

    const calls = customerDoc?._id
      ? await CallLog.find({ customerId: customerDoc._id })
          .populate('staffId', 'name phone')
          .sort({ createdAt: -1 })
      : [];

    const formattedVisits = visits.map((v) => {
      const vObj = v.toObject();
      return {
        ...vObj,
        staffName: vObj.staffId?.name || vObj.staffName || 'Former Field Staff',
        staffPhone: vObj.staffId?.phone || vObj.staffPhone || '',
        staffEmployeeId: vObj.staffId?.employeeId || vObj.staffEmployeeId || '',
      };
    });

    const enrichedCustomer = {
      ...customerObj,
      _id: customerDoc?._id || associatedCase?.customerId || associatedCase?._id,
      caseDbId: associatedCase?._id || null,
      caseId: associatedCase?.caseId || '',
      referenceNumber: associatedCase?.referenceNumber || '',
      loanAccountNo: associatedCase?.loanAccountNo || customerObj.loanAccountNo || '',
      pos: (associatedCase?.pos !== undefined && associatedCase?.pos !== null && associatedCase.pos > 0)
        ? associatedCase.pos
        : (customerObj.pos || 0),
      tos: (associatedCase?.tos !== undefined && associatedCase?.tos !== null && associatedCase.tos > 0)
        ? associatedCase.tos
        : (customerObj.tos || customerObj.outstandingAmount || associatedCase?.outstandingAmount || 0),
      dpd: (associatedCase?.dpd !== undefined && associatedCase?.dpd !== null)
        ? associatedCase.dpd
        : (customerObj.dpd || 0),
      loanAmount: customerObj.loanAmount || associatedCase?.outstandingAmount || customerObj.outstandingAmount || 0,
      outstandingAmount: associatedCase?.outstandingAmount !== undefined ? associatedCase.outstandingAmount : customerObj.outstandingAmount,
      dueAmount: associatedCase?.dueAmount !== undefined ? associatedCase.dueAmount : (customerObj.emiAmount || 0),
      isPlanned: associatedCase?.isPlanned !== undefined ? Boolean(associatedCase.isPlanned) : Boolean(customerObj.isPlanned),
      plannedVisitDate: associatedCase?.plannedVisitDate || customerObj.plannedVisitDate || null,
    };

    return res.json({
      success: true,
      customer: enrichedCustomer,
      locations,
      visits: formattedVisits,
      calls,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Toggle or set planned visit status for a customer/case
 */
router.post('/:id/plan-visit', async (req, res) => {
  try {
    const { isPlanned, plannedVisitDate } = req.body;
    let customer = await Customer.findById(req.params.id);
    let targetCase = null;

    if (!customer) {
      targetCase = await Case.findById(req.params.id);
      if (targetCase && targetCase.customerId) {
        customer = await Customer.findById(targetCase.customerId);
      }
    } else {
      targetCase = await Case.findOne({ customerId: customer._id });
    }

    if (!customer && !targetCase) {
      return res.status(404).json({ success: false, message: 'Customer or case not found.' });
    }

    const nextIsPlanned = isPlanned !== undefined ? Boolean(isPlanned) : !(customer?.isPlanned || targetCase?.isPlanned);
    const nextDate = plannedVisitDate ? new Date(plannedVisitDate) : (nextIsPlanned ? new Date() : null);

    if (customer) {
      customer.isPlanned = nextIsPlanned;
      customer.plannedVisitDate = nextDate;
      await customer.save();
    }

    if (targetCase) {
      targetCase.isPlanned = nextIsPlanned;
      targetCase.plannedVisitDate = nextDate;
      await targetCase.save();
    }

    return res.json({
      success: true,
      message: nextIsPlanned ? 'Visit planned successfully' : 'Visit plan cancelled',
      isPlanned: nextIsPlanned,
      plannedVisitDate: nextDate,
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

    return res.status(201).json({
      success: true,
      message: 'Demo customers seeded successfully',
      customers: inserted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
