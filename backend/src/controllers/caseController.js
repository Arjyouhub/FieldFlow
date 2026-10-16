import { Case } from '../models/Case.js';
import { Customer } from '../models/Customer.js';
import { Portfolio } from '../models/Portfolio.js';
import { MonthlyBatch } from '../models/MonthlyBatch.js';
import { User } from '../models/User.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { Visit } from '../models/Visit.js';
import { CallLog } from '../models/CallLog.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * 1. List cases with rich multi-dimensional filters
 */
export async function listCases(req, res) {
  try {
    const {
      portfolioId,
      batchMonth,
      assignedStaff,
      status,
      search,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    // Staff access boundary: Staff can only access their own assigned cases
    if (req.user.role === 'staff') {
      query.assignedStaff = req.user._id;
    } else if (assignedStaff && assignedStaff !== 'ALL') {
      query.assignedStaff = assignedStaff;
    }

    if (portfolioId && portfolioId !== 'ALL') {
      query.portfolioId = portfolioId;
    }

    if (batchMonth && batchMonth !== 'ALL') {
      query.batchMonth = batchMonth;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Search by loanAccountNo, referenceNumber, or customer phone/name
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');

      // Find matching customers first
      const matchedCustomers = await Customer.find({
        $or: [{ name: reg }, { phone: reg }, { address: reg }],
      }).select('_id');

      const customerIds = matchedCustomers.map((c) => c._id);

      query.$or = [
        { loanAccountNo: reg },
        { referenceNumber: reg },
        { customerId: { $in: customerIds } },
      ];
    }

    const total = await Case.countDocuments(query);
    const cases = await Case.find(query)
      .populate('customerId')
      .populate('portfolioId', 'name code defaultRadiusMetres')
      .populate('assignedStaff', 'name phone employeeId team assignedArea')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({
      success: true,
      total,
      page: Number(page),
      cases,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get single case by ID with full history and security check
 */
export async function getCaseById(req, res) {
  try {
    const singleCase = await Case.findById(req.params.id)
      .populate('customerId')
      .populate('portfolioId')
      .populate('assignedStaff', 'name phone employeeId team assignedArea');

    if (!singleCase) {
      return res.status(404).json({ success: false, message: 'Case record not found' });
    }

    // Role boundary: staff can only view their own assigned cases
    if (
      req.user.role === 'staff' &&
      (!singleCase.assignedStaff || singleCase.assignedStaff._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to view this unassigned case.',
      });
    }

    const locations = await CustomerLocation.find({
      customerId: singleCase.customerId._id,
      isActive: true,
    });

    const visits = await Visit.find({ customerId: singleCase.customerId._id })
      .populate('staffId', 'name phone employeeId')
      .sort({ createdAt: -1 });

    const calls = await CallLog.find({ customerId: singleCase.customerId._id })
      .populate('staffId', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      case: singleCase,
      customer: singleCase.customerId,
      locations,
      visits,
      calls,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Reassign Case(s) to another staff member
 */
export async function reassignCases(req, res) {
  try {
    const { caseIds, targetStaffId, reason } = req.body;

    if (!caseIds || !caseIds.length || !targetStaffId) {
      return res.status(400).json({
        success: false,
        message: 'Case IDs and target staff ID are required.',
      });
    }

    const targetStaff = await User.findById(targetStaffId);
    if (!targetStaff) {
      return res.status(404).json({ success: false, message: 'Target staff member not found.' });
    }

    const updated = [];

    for (const id of caseIds) {
      const c = await Case.findById(id);
      if (!c) continue;

      const previousStaff = c.assignedStaff;
      c.assignedStaff = targetStaff._id;
      c.status = 'assigned';
      c.assignmentHistory.push({
        previousStaff,
        newStaff: targetStaff._id,
        assignedBy: req.user._id,
        timestamp: new Date(),
        reason: reason || 'Administrative reallocation',
      });

      await c.save();

      // Also sync Customer assignedStaff if primary
      await Customer.findByIdAndUpdate(c.customerId, { assignedStaff: targetStaff._id });
      updated.push(c._id);
    }

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REASSIGN_CASES',
      entityType: 'Case',
      details: { count: updated.length, targetStaff: targetStaff.name, reason },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Successfully reassigned ${updated.length} case(s) to ${targetStaff.name}.`,
      updatedCount: updated.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Bulk Import Cases with Portfolio and Batch linking
 */
export async function importBulkCases(req, res) {
  try {
    const { portfolioId, batchMonth, defaultStaffId, cases: rawCases } = req.body;

    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio selection is mandatory before importing cases.',
      });
    }

    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Selected portfolio does not exist.' });
    }

    if (!rawCases || !Array.isArray(rawCases) || rawCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No case data rows provided for import.',
      });
    }

    const batchName = (batchMonth || 'OCT-2026').trim().toUpperCase();

    // Ensure MonthlyBatch exists or create it
    let batch = await MonthlyBatch.findOne({ portfolioId, name: batchName });
    if (!batch) {
      batch = await MonthlyBatch.create({
        name: batchName,
        code: `${portfolio.code}-${batchName}`,
        portfolioId,
        month: batchName.split('-')[0] || 'OCT',
        year: Number(batchName.split('-')[1]) || 2026,
        importedBy: req.user._id,
      });
    }

    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const errors = [];
    const createdCases = [];

    for (let i = 0; i < rawCases.length; i++) {
      const row = rawCases[i];
      const rowNum = i + 1;

      const accountNo = (row.accountNumber || row.loanAccountNo || row.accountId || row.loanNo || '').toString().trim();
      const customerName = (row.customerName || row.name || '').toString().trim();
      const mobile = (row.mobileNumber || row.mobile || row.phone || '').toString().trim().replace(/[^\d+]/g, '');
      const outstanding = Number(row.outstandingAmount || row.outstanding || row.pos || 0);
      const due = Number(row.dueAmount || row.emiAmount || row.due || 0);
      const refNo = (row.referenceNumber || row.refNo || '').toString().trim();
      const address = (row.address || 'Address on file').toString().trim();
      const city = (row.city || 'Kozhikode').toString().trim();
      const area = (row.area || '').toString().trim();
      const rowStaff = row.staffId || row.assignedStaff || defaultStaffId || null;

      // Validation
      if (!customerName) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Customer Name is required' });
        continue;
      }
      if (!mobile) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Mobile Number is required' });
        continue;
      }
      if (!accountNo) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Account/Loan Number is required' });
        continue;
      }

      // Check duplicate within this portfolio
      const existingCase = await Case.findOne({ portfolioId, loanAccountNo: accountNo });
      if (existingCase) {
        duplicateCount++;
        continue; // Safe retry without creating duplicates
      }

      // Find or create customer
      let customer = await Customer.findOne({ phone: mobile });
      if (!customer) {
        customer = await Customer.create({
          name: customerName,
          phone: mobile,
          alternatePhone: (row.alternatePhone || row.altPhone || '').toString().trim(),
          address,
          city,
          area,
          loanAccountNo: accountNo,
          outstandingAmount: outstanding,
          emiAmount: due,
          portfolioId,
          assignedStaff: rowStaff || null,
          batchMonth: batchName,
        });
      }

      // Create unique internal case ID
      const caseCode = `CAS-${portfolio.code}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const newCase = await Case.create({
        caseId: caseCode,
        customerId: customer._id,
        portfolioId,
        batchId: batch._id,
        batchMonth: batchName,
        loanAccountNo: accountNo,
        referenceNumber: refNo,
        outstandingAmount: outstanding,
        dueAmount: due,
        assignedStaff: rowStaff || null,
        status: rowStaff ? 'assigned' : 'pending',
      });

      createdCases.push(newCase);
      successCount++;
    }

    // Update batch totals
    batch.totalCases += successCount;
    await batch.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'BULK_IMPORT_CASES',
      entityType: 'Case',
      details: {
        portfolio: portfolio.name,
        batch: batchName,
        successCount,
        duplicateCount,
        failedCount,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: `Import processed: ${successCount} imported, ${duplicateCount} skipped duplicates, ${failedCount} failed.`,
      stats: {
        successCount,
        duplicateCount,
        failedCount,
        totalProcessed: rawCases.length,
      },
      errors,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
