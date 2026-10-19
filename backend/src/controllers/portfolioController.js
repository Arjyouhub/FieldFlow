import { Portfolio } from '../models/Portfolio.js';
import { Case } from '../models/Case.js';
import { Customer } from '../models/Customer.js';
import { MonthlyBatch } from '../models/MonthlyBatch.js';
import { Visit } from '../models/Visit.js';
import { SuspiciousEvent } from '../models/SuspiciousEvent.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * 1. List all portfolios with dynamic KPIs
 */
export async function listPortfolios(req, res) {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { code: reg }, { description: reg }];
    }

    const portfolios = await Portfolio.find(query).sort({ createdAt: -1 });

    // Aggregate statistics per portfolio
    const portfoliosWithStats = await Promise.all(
      portfolios.map(async (p) => {
        const pId = p._id;

        // Case counts from Case model (or fallback Customer model)
        const [
          totalCases,
          assignedCases,
          pendingCases,
          visitedCases,
          paidCases,
          ptpCases,
          brokenPtpCases,
          suspiciousVisits,
          collectionsAgg,
        ] = await Promise.all([
          Case.countDocuments({ portfolioId: pId }),
          Case.countDocuments({ portfolioId: pId, assignedStaff: { $exists: true, $ne: null } }),
          Case.countDocuments({ portfolioId: pId, status: { $in: ['assigned', 'pending'] } }),
          Case.countDocuments({ portfolioId: pId, status: 'visited' }),
          Case.countDocuments({ portfolioId: pId, status: 'paid' }),
          Case.countDocuments({ portfolioId: pId, status: 'ptp' }),
          Case.countDocuments({ portfolioId: pId, status: 'broken_ptp' }),
          SuspiciousEvent.countDocuments({ portfolioId: pId, reviewStatus: 'PENDING_REVIEW' }),
          Visit.aggregate([
            { $match: { portfolioId: pId, paymentStatus: 'APPROVED' } },
            { $group: { _id: null, total: { $sum: '$collectedAmount' } } },
          ]),
        ]);

        const verifiedCollectionTotal = collectionsAgg[0]?.total || 0;

        return {
          ...p.toObject(),
          stats: {
            totalCases,
            assignedCases,
            pendingCases,
            visitedCases,
            paidCases,
            ptpCases,
            brokenPtpCases,
            suspiciousVisits,
            verifiedCollectionTotal,
          },
        };
      })
    );

    return res.json({
      success: true,
      count: portfoliosWithStats.length,
      portfolios: portfoliosWithStats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get single portfolio by ID with detailed stats
 */
export async function getPortfolioById(req, res) {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }

    const pId = portfolio._id;
    const [
      totalCases,
      assignedCases,
      pendingCases,
      visitedCases,
      paidCases,
      ptpCases,
      brokenPtpCases,
      suspiciousVisits,
      collectionsAgg,
      batches,
    ] = await Promise.all([
      Case.countDocuments({ portfolioId: pId }),
      Case.countDocuments({ portfolioId: pId, assignedStaff: { $exists: true, $ne: null } }),
      Case.countDocuments({ portfolioId: pId, status: { $in: ['assigned', 'pending'] } }),
      Case.countDocuments({ portfolioId: pId, status: 'visited' }),
      Case.countDocuments({ portfolioId: pId, status: 'paid' }),
      Case.countDocuments({ portfolioId: pId, status: 'ptp' }),
      Case.countDocuments({ portfolioId: pId, status: 'broken_ptp' }),
      SuspiciousEvent.countDocuments({ portfolioId: pId, reviewStatus: 'PENDING_REVIEW' }),
      Visit.aggregate([
        { $match: { portfolioId: pId, paymentStatus: 'APPROVED' } },
        { $group: { _id: null, total: { $sum: '$collectedAmount' } } },
      ]),
      MonthlyBatch.find({ portfolioId: pId }).sort({ createdAt: -1 }),
    ]);

    return res.json({
      success: true,
      portfolio: {
        ...portfolio.toObject(),
        stats: {
          totalCases,
          assignedCases,
          pendingCases,
          visitedCases,
          paidCases,
          ptpCases,
          brokenPtpCases,
          suspiciousVisits,
          verifiedCollectionTotal: collectionsAgg[0]?.total || 0,
        },
        batches,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Create a new portfolio
 */
export async function createPortfolio(req, res) {
  try {
    const { name, code, description, clientContact, defaultRadiusMetres } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Portfolio name is required.' });
    }

    const cleanCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)).toUpperCase().trim();

    const existing = await Portfolio.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A portfolio with code "${cleanCode}" already exists.`,
      });
    }

    const portfolio = await Portfolio.create({
      name: name.trim(),
      code: cleanCode,
      description: description ? description.trim() : '',
      clientContact: clientContact || {},
      defaultRadiusMetres: Number(defaultRadiusMetres) || 100,
      isActive: true,
      auditHistory: [
        {
          action: 'CREATE_PORTFOLIO',
          performedBy: req.user?._id,
          details: { name: name.trim(), code: cleanCode },
        },
      ],
    });

    await AuditLog.create({
      actorId: req.user?._id,
      actorName: req.user?.name || 'Administrator',
      actorRole: req.user?.role || 'admin',
      action: 'CREATE_PORTFOLIO',
      entityType: 'Portfolio',
      entityId: portfolio._id.toString(),
      details: { name: portfolio.name, code: portfolio.code },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Portfolio created successfully.',
      portfolio,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Update an existing portfolio
 */
export async function updatePortfolio(req, res) {
  try {
    const { name, description, isActive, clientContact, defaultRadiusMetres } = req.body;
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found.' });
    }

    if (name) portfolio.name = name.trim();
    if (description !== undefined) portfolio.description = description.trim();
    if (isActive !== undefined) portfolio.isActive = Boolean(isActive);
    if (clientContact) portfolio.clientContact = { ...portfolio.clientContact, ...clientContact };
    if (defaultRadiusMetres) portfolio.defaultRadiusMetres = Number(defaultRadiusMetres);

    portfolio.auditHistory.push({
      action: 'UPDATE_PORTFOLIO',
      performedBy: req.user?._id,
      details: { name, description, isActive },
    });

    await portfolio.save();

    return res.json({
      success: true,
      message: 'Portfolio updated successfully.',
      portfolio,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Monthly Batches Management
 */
export async function listBatches(req, res) {
  try {
    const { portfolioId } = req.query;
    const query = {};
    if (portfolioId) query.portfolioId = portfolioId;

    const batches = await MonthlyBatch.find(query)
      .populate('portfolioId', 'name code')
      .populate('importedBy', 'name')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: batches.length, batches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createBatch(req, res) {
  try {
    const { portfolioId, name, month, year, notes } = req.body;

    if (!portfolioId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Portfolio ID and batch name (e.g. OCT-2026) are required.',
      });
    }

    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found.' });
    }

    const batchName = name.trim().toUpperCase();
    const existing = await MonthlyBatch.findOne({ portfolioId, name: batchName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Batch "${batchName}" already exists for portfolio "${portfolio.name}".`,
      });
    }

    const batch = await MonthlyBatch.create({
      name: batchName,
      code: `${portfolio.code}-${batchName}`,
      portfolioId,
      month: month || batchName.split('-')[0] || 'OCT',
      year: Number(year) || 2026,
      notes: notes || '',
      importedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Monthly batch created successfully.',
      batch,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Delete a portfolio
 */
export async function deletePortfolio(req, res) {
  try {
    const { id } = req.params;
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({ success: false, message: 'Portfolio not found.' });
    }

    const casesCount = await Case.countDocuments({ portfolioId: id });
    if (casesCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        casesCount,
        message: `Cannot delete "${portfolio.name}" because it contains ${casesCount} cases. Please confirm force delete to remove it along with its cases.`,
      });
    }

    // Delete associated monthly batches
    await MonthlyBatch.deleteMany({ portfolioId: id });
    if (req.query.force === 'true') {
      await Case.deleteMany({ portfolioId: id });
    }
    await Portfolio.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: `Portfolio "${portfolio.name}" deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

