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
      case: singleCase,
      customer: singleCase.customerId,
      locations,
      visits: formattedVisits,
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

      const accountNo = (
        row.accountNumber ||
        row.loanAccountNo ||
        row.accountId ||
        row.loanNo ||
        row.kbloanid ||
        row.lan ||
        ''
      ).toString().trim() || `ACC-${Date.now().toString().slice(-6)}-${rowNum}`;

      const customerName = (
        row.customerName ||
        row.name ||
        row.cxName ||
        row['cx name'] ||
        row.borrowerName ||
        row.clientName ||
        ''
      ).toString().trim();

      let mobile = (
        row.mobileNumber ||
        row.mobile ||
        row.phone ||
        row[' PHN NO '] ||
        row['PHN NO'] ||
        row.phnNo ||
        row.phn ||
        ''
      ).toString().trim().replace(/[^\d+]/g, '');

      if (mobile.length === 12 && mobile.startsWith('91')) {
        mobile = mobile.slice(2);
      } else if (mobile.length === 11 && mobile.startsWith('0')) {
        mobile = mobile.slice(1);
      }

      const outstanding = Number(
        String(row.outstandingAmount || row.outstanding || row.pos || row.tos || row.loan_amount || 0).replace(/[^0-9.-]/g, '')
      ) || 0;

      const due = Number(
        String(row.dueAmount || row.emiAmount || row.due || outstanding).replace(/[^0-9.-]/g, '')
      ) || 0;

      const refNo = (row.referenceNumber || row.refNo || row.ref || '').toString().trim();
      const address = (row.address || row.ADDRESS || 'Address on file').toString().trim();
      const city = (row.city || row.permanent_city || 'Kozhikode').toString().trim();
      const area = (row.area || row.permanent_city || row.permanent_pincode || '').toString().trim();
      const rowStaff = row.assignedStaffId || row.staffId || row.assignedStaff || defaultStaffId || null;

      // Validation
      if (!customerName) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Customer Name is required' });
        continue;
      }
      if (!mobile || mobile.length < 10) {
        failedCount++;
        errors.push({ row: rowNum, error: 'Valid 10-digit Mobile Number is required' });
        continue;
      }

      // Check duplicate within this portfolio
      const existingCase = await Case.findOne({ portfolioId, loanAccountNo: accountNo });
      if (existingCase) {
        if (rowStaff) {
          existingCase.assignedStaff = rowStaff;
          existingCase.status = 'assigned';
          await existingCase.save();
          await Customer.findByIdAndUpdate(existingCase.customerId, { assignedStaff: rowStaff });
        }
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
      } else if (rowStaff) {
        customer.assignedStaff = rowStaff;
        await customer.save();
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

/**
 * 5. Create a Single Case directly (with manual details and staff assignment)
 */
export async function createSingleCase(req, res) {
  try {
    const {
      portfolioId,
      batchMonth,
      assignedStaff,
      customerName,
      phone,
      alternatePhone,
      loanAccountNo,
      referenceNumber,
      address,
      area,
      city,
      outstandingAmount,
      dueAmount,
    } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');

    // Resolve Portfolio: if not provided or 'ALL', use first active portfolio or default
    let targetPortfolioId = portfolioId;
    if (!targetPortfolioId || targetPortfolioId === 'ALL') {
      const defaultPort = (await Portfolio.findOne({ status: 'active' })) || (await Portfolio.findOne());
      if (defaultPort) targetPortfolioId = defaultPort._id;
    }

    const portfolio = targetPortfolioId ? await Portfolio.findById(targetPortfolioId) : null;
    const portCode = portfolio ? portfolio.code : 'GEN';

    const batchName = (batchMonth || 'OCT-2026').trim().toUpperCase();

    // Ensure MonthlyBatch exists
    let batch = null;
    if (portfolio) {
      batch = await MonthlyBatch.findOne({ portfolioId: portfolio._id, name: batchName });
      if (!batch) {
        batch = await MonthlyBatch.create({
          name: batchName,
          code: `${portfolio.code}-${batchName}`,
          portfolioId: portfolio._id,
          month: batchName.split('-')[0] || 'OCT',
          year: Number(batchName.split('-')[1]) || 2026,
          importedBy: req.user._id,
        });
      }
    }

    const accountNo =
      loanAccountNo && loanAccountNo.trim()
        ? loanAccountNo.trim()
        : `ACC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const outstanding = Number(outstandingAmount || 0) || 0;
    const due = Number(dueAmount || outstanding) || 0;

    // Find or create customer
    let customer = await Customer.findOne({ phone: cleanPhone });
    if (!customer) {
      customer = await Customer.create({
        name: customerName.trim(),
        phone: cleanPhone,
        alternatePhone: (alternatePhone || '').trim(),
        address: (address || 'Address on file').trim(),
        city: (city || 'Kozhikode').trim(),
        area: (area || '').trim(),
        loanAccountNo: accountNo,
        outstandingAmount: outstanding,
        emiAmount: due,
        portfolioId: portfolio ? portfolio._id : null,
        assignedStaff: assignedStaff || null,
        batchMonth: batchName,
      });
    } else {
      if (assignedStaff) customer.assignedStaff = assignedStaff;
      if (address) customer.address = address.trim();
      if (area) customer.area = area.trim();
      customer.outstandingAmount = outstanding;
      customer.emiAmount = due;
      await customer.save();
    }

    // Check if case with accountNo already exists
    let caseItem = null;
    if (portfolio) {
      caseItem = await Case.findOne({ portfolioId: portfolio._id, loanAccountNo: accountNo });
    }
    if (caseItem) {
      caseItem.assignedStaff = assignedStaff || caseItem.assignedStaff;
      caseItem.status = assignedStaff ? 'assigned' : caseItem.status;
      caseItem.outstandingAmount = outstanding;
      caseItem.dueAmount = due;
      if (referenceNumber) caseItem.referenceNumber = referenceNumber.trim();
      await caseItem.save();
    } else {
      const caseCode = `CAS-${portCode}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      caseItem = await Case.create({
        caseId: caseCode,
        customerId: customer._id,
        portfolioId: portfolio ? portfolio._id : null,
        batchId: batch ? batch._id : null,
        batchMonth: batchName,
        loanAccountNo: accountNo,
        referenceNumber: (referenceNumber || '').trim(),
        outstandingAmount: outstanding,
        dueAmount: due,
        assignedStaff: assignedStaff || null,
        status: assignedStaff ? 'assigned' : 'pending',
      });
    }

    if (batch) {
      batch.totalCases = (batch.totalCases || 0) + 1;
      await batch.save();
    }

    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'CREATE_SINGLE_CASE',
      entityType: 'Case',
      entityId: caseItem._id,
      details: { caseId: caseItem.caseId, customerName, phone: cleanPhone, assignedStaff },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Case successfully created and allocated to staff officer.',
      case: caseItem,
      customer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
