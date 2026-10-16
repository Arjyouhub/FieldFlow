import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { Visit } from '../models/Visit.js';
import { SuspiciousEvent } from '../models/SuspiciousEvent.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { AuditLog } from '../models/AuditLog.js';
import { Portfolio } from '../models/Portfolio.js';
import { Case } from '../models/Case.js';
import { MonthlyBatch } from '../models/MonthlyBatch.js';
import { ExternalVisitMetric } from '../models/ExternalVisitMetric.js';

/**
 * 1. Admin Dashboard KPI Statistics (Portfolio & Multi-dimensional Filter Aware)
 */
export async function getDashboardStats(req, res) {
  try {
    const { portfolioId } = req.query;
    const filter = {};
    const caseFilter = {};
    const visitFilter = {};

    if (portfolioId && portfolioId !== 'ALL') {
      filter.portfolioId = portfolioId;
      caseFilter.portfolioId = portfolioId;
      visitFilter.portfolioId = portfolioId;
    }

    const totalCasesCount = await Case.countDocuments(caseFilter);
    const totalCustomers = await Customer.countDocuments(filter);

    // Status counts: check Case first or fallback Customer
    const pendingCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: { $in: ['assigned', 'pending'] } })
        : await Customer.countDocuments({ ...filter, status: 'pending' });

    const visitedCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: 'visited' })
        : await Customer.countDocuments({ ...filter, status: 'visited' });

    const collectedCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: 'paid' })
        : await Customer.countDocuments({ ...filter, status: 'collected' });

    const ptpCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: 'ptp' })
        : await Customer.countDocuments({ ...filter, status: 'ptp' });

    const brokenPtpCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: 'broken_ptp' })
        : await Customer.countDocuments({ ...filter, status: 'broken_ptp' });

    const nonWorkableCases =
      totalCasesCount > 0
        ? await Case.countDocuments({ ...caseFilter, status: 'non_workable' })
        : await Customer.countDocuments({ ...filter, status: 'non_workable' });

    const totalStaff = await User.countDocuments({ role: 'staff' });
    const activeStaff = await User.countDocuments({ role: 'staff', status: 'active' });
    const pendingStaffApprovals = await User.countDocuments({ role: 'staff', status: 'pending_approval' });

    const suspiciousCount = await SuspiciousEvent.countDocuments({
      reviewStatus: 'PENDING_REVIEW',
      ...(portfolioId && portfolioId !== 'ALL' ? { portfolioId } : {}),
    });
    const pendingLocationsCount = await CustomerLocation.countDocuments({ status: 'PENDING' });
    const pendingPaymentVerifications = await Visit.countDocuments({
      paymentStatus: 'PENDING_VERIFICATION',
      ...visitFilter,
    });

    const portfoliosCount = await Portfolio.countDocuments({ isActive: true });

    // Aggregate total verified collections vs pending collections
    const collectionsAgg = await Visit.aggregate([
      { $match: visitFilter },
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$collectedAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let approvedCollectionAmount = 0;
    let pendingCollectionAmount = 0;

    collectionsAgg.forEach((item) => {
      if (item._id === 'APPROVED') approvedCollectionAmount = item.totalAmount;
      if (item._id === 'PENDING_VERIFICATION') pendingCollectionAmount = item.totalAmount;
    });

    // Recent visits
    const recentVisits = await Visit.find(visitFilter)
      .populate('customerId', 'name loanAccountNo phone address')
      .populate('staffId', 'name phone assignedArea')
      .populate('portfolioId', 'name code')
      .sort({ createdAt: -1 })
      .limit(8);

    return res.json({
      success: true,
      stats: {
        totalCustomers: totalCasesCount > 0 ? totalCasesCount : totalCustomers,
        totalCases: totalCasesCount > 0 ? totalCasesCount : totalCustomers,
        pendingCases,
        visitedCases,
        collectedCases,
        ptpCases,
        brokenPtpCases,
        nonWorkableCases,
        totalStaff,
        activeStaff,
        pendingStaffApprovals,
        suspiciousCount,
        pendingLocationsCount,
        pendingPaymentVerifications,
        approvedCollectionAmount,
        pendingCollectionAmount,
        portfoliosCount,
      },
      recentVisits,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Staff Management
 */
export async function listStaff(req, res) {
  try {
    const staffMembers = await User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 });

    // Fetch case counts per staff
    const staffWithMetrics = await Promise.all(
      staffMembers.map(async (stf) => {
        const assignedCount = await Customer.countDocuments({ assignedStaff: stf._id });
        const visitedCount = await Customer.countDocuments({ assignedStaff: stf._id, status: { $in: ['visited', 'collected', 'ptp'] } });
        const collectedCount = await Customer.countDocuments({ assignedStaff: stf._id, status: 'collected' });

        return {
          ...stf.toObject(),
          assignedCount,
          visitedCount,
          collectedCount,
        };
      })
    );

    return res.json({ success: true, count: staffWithMetrics.length, staff: staffWithMetrics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createStaff(req, res) {
  try {
    const { name, phone, email, employeeId, team, assignedArea, password } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Staff name and phone number are required.' });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this mobile number already exists.' });
    }

    const newStaff = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : `${phone.trim()}@fieldflow.local`,
      employeeId: employeeId || `STF-${Math.floor(100 + Math.random() * 900)}`,
      team: team || 'Field Operations',
      assignedArea: assignedArea || 'Kozhikode',
      password: password || 'Welcome@123',
      role: 'staff',
      status: 'active',
    });

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CREATE_STAFF',
      entityType: 'User',
      entityId: newStaff._id.toString(),
      details: { name: newStaff.name, phone: newStaff.phone, employeeId: newStaff.employeeId },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      staff: {
        id: newStaff._id,
        name: newStaff.name,
        phone: newStaff.phone,
        employeeId: newStaff.employeeId,
        team: newStaff.team,
        assignedArea: newStaff.assignedArea,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStaffStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const staff = await User.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff user not found.' });
    }

    staff.status = status;
    await staff.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'UPDATE_STAFF_STATUS',
      entityType: 'User',
      entityId: staff._id.toString(),
      details: { newStatus: status },
    }).catch(() => {});

    return res.json({ success: true, message: `Staff status changed to ${status}`, staff });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function reviewStaffRegistration(req, res) {
  try {
    const { id } = req.params;
    const { action, assignedArea, rejectionReason } = req.body; // action: 'APPROVE' or 'REJECT'

    const staff = await User.findById(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff user not found.' });
    }

    if (action === 'APPROVE') {
      staff.status = 'active';
      staff.approvedBy = req.user._id;
      staff.approvedAt = new Date();
      if (assignedArea) staff.assignedArea = assignedArea.trim();
    } else if (action === 'REJECT') {
      staff.status = 'inactive';
      staff.rejectionReason = rejectionReason ? rejectionReason.trim() : 'Registration declined by administrator';
    } else {
      return res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT' });
    }

    await staff.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: action === 'APPROVE' ? 'APPROVE_STAFF_REGISTRATION' : 'REJECT_STAFF_REGISTRATION',
      entityType: 'User',
      entityId: staff._id.toString(),
      details: { staffName: staff.name, phone: staff.phone, action, rejectionReason },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Staff member ${staff.name} has been ${action === 'APPROVE' ? 'approved and activated' : 'declined'}.`,
      staff,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function reassignCases(req, res) {
  try {
    const { customerIds, targetStaffId } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || !targetStaffId) {
      return res.status(400).json({ success: false, message: 'customerIds array and targetStaffId are required.' });
    }

    const staff = await User.findById(targetStaffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Target staff member not found.' });
    }

    const result = await Customer.updateMany(
      { _id: { $in: customerIds } },
      { $set: { assignedStaff: targetStaffId } }
    );

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REASSIGN_CASES',
      entityType: 'Customer',
      details: { targetStaff: staff.name, reassignedCount: result.modifiedCount },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Successfully reassigned ${result.modifiedCount} cases to ${staff.name}`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Customer Management & Case Imports
 */
export async function listCustomers(req, res) {
  try {
    const { search, status, area, staffId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (area) query.area = area;
    if (staffId) query.assignedStaff = staffId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { loanAccountNo: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query)
      .populate('assignedStaff', 'name phone assignedArea')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createCustomer(req, res) {
  try {
    const { name, phone, loanAccountNo, address, city, area, outstandingAmount, emiAmount, assignedStaff, batchMonth, documents } = req.body;

    if (!name || !phone || !loanAccountNo || !address) {
      return res.status(400).json({ success: false, message: 'Name, phone, loan account number, and address are required.' });
    }

    const existing = await Customer.findOne({ loanAccountNo: loanAccountNo.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A customer with this loan account number already exists.' });
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      loanAccountNo: loanAccountNo.trim(),
      address: address.trim(),
      city: city || 'Kozhikode',
      area: area || '',
      outstandingAmount: Number(outstandingAmount || 0),
      emiAmount: Number(emiAmount || 0),
      assignedStaff: assignedStaff || null,
      batchMonth: batchMonth || 'OCT-2026',
      status: 'pending',
      documents: Array.isArray(documents) ? documents : [],
    });

    return res.status(201).json({ success: true, message: 'Customer created successfully', customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function importMonthlyCases(req, res) {
  try {
    const { cases, batchMonth, defaultStaffId } = req.body;

    if (!cases || !Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({ success: false, message: 'cases array is required.' });
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const item of cases) {
      try {
        if (!item.name || !item.loanAccountNo || !item.phone) {
          skipped++;
          continue;
        }

        const existing = await Customer.findOne({ loanAccountNo: item.loanAccountNo.trim() });
        if (existing) {
          if (item.outstandingAmount !== undefined) existing.outstandingAmount = Number(item.outstandingAmount);
          if (item.emiAmount !== undefined) existing.emiAmount = Number(item.emiAmount);
          if (item.dpd !== undefined) existing.dpd = Number(item.dpd);
          if (item.loanAmount !== undefined) existing.loanAmount = Number(item.loanAmount);
          if (item.pos !== undefined) existing.pos = Number(item.pos);
          if (item.pincode) existing.pincode = item.pincode;
          if (item.address) existing.address = item.address;
          if (item.city) existing.city = item.city;
          if (item.area) existing.area = item.area;
          if (item.phone) existing.phone = item.phone.trim();
          if (item.name) existing.name = item.name.trim();
          existing.batchMonth = batchMonth || existing.batchMonth || 'OCT-2026';
          if (defaultStaffId) existing.assignedStaff = defaultStaffId;
          await existing.save();
          updated++;
        } else {
          await Customer.create({
            name: item.name.trim(),
            phone: item.phone.trim(),
            loanAccountNo: item.loanAccountNo.trim(),
            address: item.address || 'Address provided on record',
            city: item.city || 'Kozhikode',
            area: item.area || '',
            pincode: item.pincode || '',
            outstandingAmount: Number(item.outstandingAmount || 0),
            emiAmount: Number(item.emiAmount || 0),
            dpd: Number(item.dpd || 0),
            loanAmount: Number(item.loanAmount || 0),
            pos: Number(item.pos || 0),
            assignedStaff: item.assignedStaffId || defaultStaffId || null,
            batchMonth: batchMonth || 'OCT-2026',
            status: 'pending',
          });
          inserted++;
        }
      } catch (err) {
        errors.push({ loanAccountNo: item.loanAccountNo, error: err.message });
      }
    }

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'IMPORT_MONTHLY_CASES',
      entityType: 'Customer',
      details: { batchMonth, inserted, updated, skipped, errorsCount: errors.length },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Batch import complete. ${inserted} inserted, ${updated} updated, ${skipped} skipped.`,
      summary: { inserted, updated, skipped, errors },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Location Management for Admin Map View
 */
export async function getAllLocations(req, res) {
  try {
    const locations = await CustomerLocation.find()
      .populate('customerId', 'name phone loanAccountNo address area status')
      .populate('capturedBy', 'name phone assignedArea')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: locations.length, locations });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Collection Submissions & Payment Verification
 */
export async function listCollections(req, res) {
  try {
    const { status } = req.query;
    const filter = { collectedAmount: { $gt: 0 } };
    if (status && status !== 'ALL') {
      filter.paymentStatus = status;
    }

    const collections = await Visit.find(filter)
      .populate('customerId', 'name phone loanAccountNo address')
      .populate('staffId', 'name phone assignedArea')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: collections.length, collections });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function verifyPayment(req, res) {
  try {
    const { visitId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'APPROVE' or 'REJECT'

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Collection visit record not found.' });
    }

    if (action === 'APPROVE') {
      visit.paymentStatus = 'APPROVED';
      // Deduct from customer's outstanding
      await Customer.findByIdAndUpdate(visit.customerId, {
        $inc: { outstandingAmount: -visit.collectedAmount },
        status: 'collected',
      });

      // Update associated Case
      if (visit.caseId) {
        await Case.findByIdAndUpdate(visit.caseId, {
          status: 'paid',
          $inc: { totalCollected: visit.collectedAmount, outstandingAmount: -visit.collectedAmount },
        });
      } else {
        await Case.updateMany(
          { customerId: visit.customerId },
          { status: 'paid', $inc: { totalCollected: visit.collectedAmount } }
        );
      }
    } else if (action === 'REJECT') {
      visit.paymentStatus = 'REJECTED';
      visit.notes = `${visit.notes || ''} [Rejected by Admin: ${rejectionReason || 'No reason provided'}]`;
      if (visit.caseId) {
        await Case.findByIdAndUpdate(visit.caseId, { status: 'visited' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Action must be APPROVE or REJECT' });
    }

    await visit.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: `PAYMENT_${action}`,
      entityType: 'Visit',
      entityId: visit._id.toString(),
      details: { amount: visit.collectedAmount, action, rejectionReason },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Payment ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`,
      visit,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Business Settings
 */
export async function getSettings(req, res) {
  try {
    let settings = await SystemSettings.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await SystemSettings.create({
        key: 'global_config',
        defaultRadiusMetres: 100,
        maxAllowedAccuracyMetres: 50,
        duplicateDetectionMetres: 25,
        allowedLocationTypes: ['Home', 'Office', 'Shop', 'Relative', 'Other'],
        maintenanceMode: false,
      });
    }
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const { defaultRadiusMetres, maxAllowedAccuracyMetres, duplicateDetectionMetres, requireApprovalForNewLocations, maintenanceMode } = req.body;

    let settings = await SystemSettings.findOne({ key: 'global_config' });
    if (!settings) {
      settings = new SystemSettings({ key: 'global_config' });
    }

    if (defaultRadiusMetres !== undefined) settings.defaultRadiusMetres = Number(defaultRadiusMetres);
    if (maxAllowedAccuracyMetres !== undefined) settings.maxAllowedAccuracyMetres = Number(maxAllowedAccuracyMetres);
    if (duplicateDetectionMetres !== undefined) settings.duplicateDetectionMetres = Number(duplicateDetectionMetres);
    if (requireApprovalForNewLocations !== undefined) settings.requireApprovalForNewLocations = Boolean(requireApprovalForNewLocations);
    if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'SystemSettings',
      details: { defaultRadiusMetres, maxAllowedAccuracyMetres },
    }).catch(() => {});

    return res.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function addCustomerDocument(req, res) {
  try {
    const { id } = req.params;
    const { name, url, fileType, size } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Document name and url are required.' });
    }
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    if (!customer.documents) customer.documents = [];
    customer.documents.push({ name, url, fileType: fileType || '', size: Number(size || 0) });
    await customer.save();
    return res.json({ success: true, message: 'Document attached successfully', customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Comprehensive Daily Visits Report
 */
export async function getDailyVisitsReport(req, res) {
  try {
    const { startDate, endDate, staffId, outcome, search } = req.query;
    const filter = {};

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (staffId && staffId !== 'ALL') {
      filter.staffId = staffId;
    }

    if (outcome && outcome !== 'ALL') {
      filter.outcome = outcome;
    }

    const visits = await Visit.find(filter)
      .populate('customerId', 'name phone loanAccountNo address city area status outstandingAmount portfolioId')
      .populate('portfolioId', 'name code')
      .populate('staffId', 'name phone assignedArea employeeId email')
      .sort({ createdAt: -1 });

    // Optional text search filter
    let filteredVisits = visits;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredVisits = visits.filter(
        (v) =>
          v.customerId?.name?.toLowerCase().includes(q) ||
          v.customerId?.loanAccountNo?.toLowerCase().includes(q) ||
          v.staffId?.name?.toLowerCase().includes(q) ||
          v.notes?.toLowerCase().includes(q)
      );
    }

    // Calculate aggregated statistics
    let totalVisits = filteredVisits.length;
    let totalCollectedAmount = 0;
    let paymentsCount = 0;
    let ptpCount = 0;
    let totalPtpAmount = 0;
    let houseLockedCount = 0;
    let customerUnavailableCount = 0;
    let suspiciousCount = 0;

    for (const v of filteredVisits) {
      if (v.collectedAmount > 0) {
        totalCollectedAmount += v.collectedAmount;
        paymentsCount++;
      }
      if (v.outcome === 'Promise to Pay (PTP)') {
        ptpCount++;
        totalPtpAmount += v.ptpAmount || 0;
      }
      if (v.outcome === 'House Locked') houseLockedCount++;
      if (v.outcome === 'Customer Unavailable') customerUnavailableCount++;
      if (v.isSuspicious) suspiciousCount++;
    }

    // -------------------------------------------------------------
    // Build Hourly Slot & Portfolio Matrix Model (FE Name x Time Slots)
    // Portfolios: KB (KreditBee), SC (SmartCoin), NAVI, MV (MoneyView/MoneySmart)
    // Time Slots: 9-11, 11-1, 1-3, 3-5, 5-6
    // -------------------------------------------------------------
    const allStaff = await User.find({ role: 'staff', status: { $ne: 'rejected' } })
      .select('name phone assignedArea employeeId status')
      .sort({ name: 1 })
      .lean();

    const getPortfolioCode = (p) => {
      if (!p) return 'KB';
      const c = (p.code || p.name || '').toUpperCase();
      if (c.includes('KREDIT') || c === 'KB') return 'KB';
      if (c.includes('SMART') || c === 'SC') return 'SC';
      if (c.includes('NAVI')) return 'NAVI';
      if (c.includes('MONEY') || c === 'MV') return 'MV';
      return 'KB';
    };

    const slots = ['9-11', '11-1', '1-3', '3-5', '5-6'];
    const pCols = ['KB', 'SC', 'NAVI', 'MV'];

    // Load external manual visit metrics (e.g. Navi official app visits) for the selected date
    const targetDateStr = startDate || new Date().toISOString().slice(0, 10);
    const naviMetrics = await ExternalVisitMetric.find({
      date: targetDateStr,
      portfolioCode: 'NAVI',
    }).lean();

    const naviMap = {};
    naviMetrics.forEach((m) => {
      naviMap[m.staffId.toString()] = m.slots || {};
    });

    // Group filtered visits by staff
    const timeSlotMatrix = allStaff.map((stf) => {
      const stfVisits = filteredVisits.filter(
        (v) => v.staffId?._id?.toString() === stf._id.toString() || v.staffId?.toString() === stf._id.toString()
      );
      const manualNavi = naviMap[stf._id.toString()];
      let naviTotal = 0;
      if (manualNavi) {
        slots.forEach((s) => {
          naviTotal += Number(manualNavi[s]) || 0;
        });
      }
      const hasAnyVisit = stfVisits.length > 0 || naviTotal > 0;

      const slotCounts = {};
      slots.forEach((s) => {
        slotCounts[s] = {};
        pCols.forEach((p) => {
          slotCounts[s][p] = hasAnyVisit ? 0 : 'AB';
        });
      });

      // Apply manual Navi app visits
      if (manualNavi) {
        slots.forEach((s) => {
          slotCounts[s]['NAVI'] = Number(manualNavi[s]) || 0;
        });
      }

      stfVisits.forEach((v) => {
        const vDate = new Date(v.createdAt || v.serverTimestamp);
        const hour = vDate.getHours();
        let slot = '9-11';
        if (hour >= 9 && hour < 11) slot = '9-11';
        else if (hour >= 11 && hour < 13) slot = '11-1';
        else if (hour >= 13 && hour < 15) slot = '1-3';
        else if (hour >= 15 && hour < 17) slot = '3-5';
        else if (hour >= 17) slot = '5-6';
        else slot = '9-11';

        const pCode = getPortfolioCode(v.portfolioId || v.customerId?.portfolioId);
        if (pCode === 'NAVI' && manualNavi) {
          // Handled via manual Navi override
        } else {
          const col = pCols.includes(pCode) ? pCode : 'KB';
          if (typeof slotCounts[slot][col] === 'number') {
            slotCounts[slot][col] += 1;
          } else {
            slotCounts[slot][col] = 1;
          }
        }
      });

      const totalVisitsCount =
        stfVisits.filter((v) => getPortfolioCode(v.portfolioId || v.customerId?.portfolioId) !== 'NAVI').length +
        naviTotal +
        (manualNavi ? 0 : stfVisits.filter((v) => getPortfolioCode(v.portfolioId || v.customerId?.portfolioId) === 'NAVI').length);

      return {
        staffId: stf._id,
        feName: stf.name,
        isAbsent: !hasAnyVisit,
        totalVisits: totalVisitsCount,
        slots: slotCounts,
        hasManualNavi: !!manualNavi,
      };
    });

    // Column totals across all staff
    const columnTotals = {};
    slots.forEach((s) => {
      columnTotals[s] = {};
      pCols.forEach((p) => {
        columnTotals[s][p] = timeSlotMatrix.reduce((sum, row) => {
          const val = row.slots[s]?.[p];
          return sum + (typeof val === 'number' ? val : 0);
        }, 0);
      });
    });
    const grandTotalVisits = timeSlotMatrix.reduce((sum, row) => sum + row.totalVisits, 0);

    return res.json({
      success: true,
      visits: filteredVisits,
      timeSlotMatrix,
      columnTotals,
      grandTotalVisits,
      summary: {
        totalVisits,
        totalCollectedAmount,
        paymentsCount,
        ptpCount,
        totalPtpAmount,
        houseLockedCount,
        customerUnavailableCount,
        suspiciousCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 8. Comprehensive Collections Report
 */
export async function getCollectionsReport(req, res) {
  try {
    const { startDate, endDate, staffId, paymentMethod, paymentStatus, search } = req.query;
    const filter = { collectedAmount: { $gt: 0 } };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (staffId && staffId !== 'ALL') {
      filter.staffId = staffId;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      filter.paymentMethod = paymentMethod;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      filter.paymentStatus = paymentStatus;
    }

    const collections = await Visit.find(filter)
      .populate('customerId', 'name phone loanAccountNo address city area status outstandingAmount portfolioId')
      .populate('portfolioId', 'name code')
      .populate('staffId', 'name phone assignedArea employeeId email')
      .sort({ createdAt: -1 });

    let filteredCollections = collections;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredCollections = collections.filter(
        (c) =>
          c.customerId?.name?.toLowerCase().includes(q) ||
          c.customerId?.loanAccountNo?.toLowerCase().includes(q) ||
          c.staffId?.name?.toLowerCase().includes(q) ||
          c.paymentReference?.toLowerCase().includes(q)
      );
    }

    let totalAmount = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let bankTransferTotal = 0;
    let approvedTotal = 0;
    let pendingTotal = 0;
    let rejectedTotal = 0;

    for (const c of filteredCollections) {
      const amt = c.collectedAmount || 0;
      totalAmount += amt;
      if (c.paymentMethod === 'Cash') cashTotal += amt;
      else if (c.paymentMethod === 'UPI') upiTotal += amt;
      else if (c.paymentMethod === 'Bank Transfer') bankTransferTotal += amt;

      if (c.paymentStatus === 'APPROVED') approvedTotal += amt;
      else if (c.paymentStatus === 'PENDING_VERIFICATION') pendingTotal += amt;
      else if (c.paymentStatus === 'REJECTED') rejectedTotal += amt;
    }

    // -------------------------------------------------------------
    // Build Collection Report Model (FS NAME, Sum of POS, Count of POS, Sum of COLLECTION, TARGET, DRR, YET TO GO, ACH%)
    // -------------------------------------------------------------
    const allStaff = await User.find({ role: 'staff', status: { $ne: 'rejected' } })
      .select('name phone assignedArea employeeId status')
      .sort({ name: 1 })
      .lean();

    // Aggregations on Customer POS by staff
    const customerAgg = await Customer.aggregate([
      { $match: { assignedStaff: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedStaff',
          sumOfPos: { $sum: '$outstandingAmount' },
          countOfPos: { $sum: 1 },
        },
      },
    ]);

    const posMap = {};
    customerAgg.forEach((a) => {
      posMap[a._id.toString()] = { sumOfPos: a.sumOfPos || 0, countOfPos: a.countOfPos || 0 };
    });

    // Staff collection totals within this filtered view
    const colMap = {};
    filteredCollections.forEach((c) => {
      if (c.paymentStatus !== 'REJECTED') {
        const sId = c.staffId?._id?.toString() || c.staffId?.toString();
        if (sId) {
          colMap[sId] = (colMap[sId] || 0) + (c.collectedAmount || 0);
        }
      }
    });

    const performanceMatrix = allStaff.map((stf) => {
      const pos = posMap[stf._id.toString()] || { sumOfPos: 0, countOfPos: 0 };
      const sumOfCollection = colMap[stf._id.toString()] || 0;
      const sumOfPos = pos.sumOfPos;
      const countOfPos = pos.countOfPos;
      const target = Math.round(sumOfPos * 0.10); // 10% standard recovery target
      const drr = Math.round(target / 25); // Daily Required Run-rate (25 working days)
      const yetToGo = Math.max(0, target - sumOfCollection);
      const achPercent = target > 0 ? Math.round((sumOfCollection / target) * 100) : 0;

      return {
        staffId: stf._id,
        fsName: stf.name,
        sumOfPos,
        countOfPos,
        sumOfCollection,
        target,
        drr,
        yetToGo,
        achPercent,
      };
    });

    const performanceGrandTotal = performanceMatrix.reduce(
      (acc, r) => {
        acc.sumOfPos += r.sumOfPos;
        acc.countOfPos += r.countOfPos;
        acc.sumOfCollection += r.sumOfCollection;
        acc.target += r.target;
        acc.drr += r.drr;
        acc.yetToGo += r.yetToGo;
        return acc;
      },
      { sumOfPos: 0, countOfPos: 0, sumOfCollection: 0, target: 0, drr: 0, yetToGo: 0 }
    );
    performanceGrandTotal.achPercent =
      performanceGrandTotal.target > 0
        ? Math.round((performanceGrandTotal.sumOfCollection / performanceGrandTotal.target) * 100)
        : 0;

    return res.json({
      success: true,
      collections: filteredCollections,
      performanceMatrix,
      performanceGrandTotal,
      summary: {
        totalAmount,
        cashTotal,
        upiTotal,
        bankTransferTotal,
        approvedTotal,
        pendingTotal,
        rejectedTotal,
        count: filteredCollections.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 9. Admin manual data entry for any Field Staff
 */
export async function recordStaffVisit(req, res) {
  try {
    const {
      staffId,
      customerId,
      outcome,
      collectedAmount,
      paymentMethod,
      paymentReference,
      paymentStatus,
      ptpAmount,
      ptpDate,
      notes,
      visitDate,
    } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Please select a Field Staff officer.' });
    }
    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Please select a Customer case.' });
    }
    if (!outcome) {
      return res.status(400).json({ success: false, message: 'Please select an Outcome for the visit.' });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Field Staff member not found.' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer case not found.' });
    }

    // Try to get customer's saved location coordinates, or fallback gracefully
    const savedLoc = await CustomerLocation.findOne({ customerId: customer._id });
    const coordinates = {
      lat: savedLoc?.coordinates?.lat || 11.2588,
      lng: savedLoc?.coordinates?.lng || 75.7804,
    };

    const parsedDate = visitDate ? new Date(visitDate) : new Date();
    const isPayment = outcome === 'Payment Collected' || Number(collectedAmount || 0) > 0;
    const finalPaymentStatus = isPayment ? (paymentStatus || 'APPROVED') : 'NONE';

    const visit = await Visit.create({
      customerId: customer._id,
      staffId: staff._id,
      coordinates,
      accuracy: 10,
      clientTimestamp: parsedDate,
      serverTimestamp: parsedDate,
      verificationStatus: savedLoc ? 'LOCATION_MATCHED' : 'NO_SAVED_LOCATIONS',
      matchedLocationId: savedLoc?._id || null,
      distanceMetres: 15,
      isSuspicious: false,
      outcome,
      collectedAmount: isPayment ? Number(collectedAmount || 0) : 0,
      paymentMethod: isPayment ? (paymentMethod || 'Cash') : 'None',
      paymentReference: paymentReference || '',
      paymentStatus: finalPaymentStatus,
      ptpAmount: outcome === 'Promise to Pay (PTP)' ? Number(ptpAmount || 0) : 0,
      ptpDate: outcome === 'Promise to Pay (PTP)' && ptpDate ? new Date(ptpDate) : null,
      notes: notes ? `${notes} (Recorded by Admin)` : 'Recorded by Admin',
      createdAt: parsedDate,
    });

    // Update customer status and balance
    if (isPayment && Number(collectedAmount || 0) > 0) {
      if (finalPaymentStatus === 'APPROVED') {
        customer.outstandingAmount = Math.max(0, customer.outstandingAmount - Number(collectedAmount));
      }
      customer.status = 'collected';
    } else if (outcome === 'Promise to Pay (PTP)') {
      customer.status = 'ptp';
    } else {
      customer.status = 'visited';
    }
    await customer.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'ADMIN_RECORD_STAFF_VISIT',
      entityType: 'Visit',
      entityId: visit._id.toString(),
      details: {
        staffName: staff.name,
        customerName: customer.name,
        loanAccountNo: customer.loanAccountNo,
        outcome,
        collectedAmount,
      },
    }).catch(() => {});

    const populated = await Visit.findById(visit._id)
      .populate('customerId', 'name phone loanAccountNo address city area status outstandingAmount')
      .populate('staffId', 'name phone assignedArea employeeId email');

    return res.status(201).json({
      success: true,
      message: `Visit & collection record successfully logged for ${staff.name}!`,
      visit: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 10. Audit Logs listing
 */
export async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50, action, entityType } = req.query;
    const query = {};
    if (action && action !== 'ALL') query.action = action;
    if (entityType && entityType !== 'ALL') query.entityType = entityType;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({ success: true, logs, total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 11. External Third-Party App Visit Metrics (e.g. Navi official app)
 */
export async function saveExternalVisitMetric(req, res) {
  try {
    const { date, staffId, portfolioCode = 'NAVI', slots, notes } = req.body;
    if (!date || !staffId) {
      return res.status(400).json({ success: false, message: 'Date and staffId are required.' });
    }

    const cleanedSlots = {
      '9-11': Math.max(0, parseInt(slots?.['9-11'] || 0, 10)),
      '11-1': Math.max(0, parseInt(slots?.['11-1'] || 0, 10)),
      '1-3': Math.max(0, parseInt(slots?.['1-3'] || 0, 10)),
      '3-5': Math.max(0, parseInt(slots?.['3-5'] || 0, 10)),
      '5-6': Math.max(0, parseInt(slots?.['5-6'] || 0, 10)),
    };
    const totalCount = Object.values(cleanedSlots).reduce((a, b) => a + b, 0);

    const metric = await ExternalVisitMetric.findOneAndUpdate(
      { date, staffId, portfolioCode: portfolioCode.toUpperCase() },
      {
        slots: cleanedSlots,
        totalCount,
        notes: notes || '',
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'External app visit counts saved successfully.', metric });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function saveBulkExternalVisitMetrics(req, res) {
  try {
    const { date, portfolioCode = 'NAVI', entries = [] } = req.body;
    if (!date || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: 'Date and valid entries array are required.' });
    }

    const pCode = portfolioCode.toUpperCase();
    const ops = entries.map((e) => {
      const cleanedSlots = {
        '9-11': Math.max(0, parseInt(e.slots?.['9-11'] || 0, 10)),
        '11-1': Math.max(0, parseInt(e.slots?.['11-1'] || 0, 10)),
        '1-3': Math.max(0, parseInt(e.slots?.['1-3'] || 0, 10)),
        '3-5': Math.max(0, parseInt(e.slots?.['3-5'] || 0, 10)),
        '5-6': Math.max(0, parseInt(e.slots?.['5-6'] || 0, 10)),
      };
      const totalCount = Object.values(cleanedSlots).reduce((a, b) => a + b, 0);

      return {
        updateOne: {
          filter: { date, staffId: e.staffId, portfolioCode: pCode },
          update: {
            $set: {
              slots: cleanedSlots,
              totalCount,
              updatedBy: req.user._id,
            },
          },
          upsert: true,
        },
      };
    });

    if (ops.length > 0) {
      await ExternalVisitMetric.bulkWrite(ops);
    }

    return res.json({ success: true, message: `Successfully updated ${ops.length} staff Navi visit counts.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

