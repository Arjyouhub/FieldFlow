import { Visit } from '../models/Visit.js';
import { Customer } from '../models/Customer.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { SuspiciousEvent } from '../models/SuspiciousEvent.js';
import { Case } from '../models/Case.js';
import { verifyVisitLocation } from '../utils/geo.js';

/**
 * Live GPS check before finalizing a visit
 * Called when staff taps "Start Visit" on mobile
 */
export async function precheckVisitGPS(req, res) {
  try {
    const { customerId, lat, lng, accuracy } = req.body;

    if (!customerId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'customerId, latitude (lat), and longitude (lng) are required.',
      });
    }

    const savedLocations = await CustomerLocation.find({
      customerId,
      isActive: true,
      status: 'VERIFIED',
    });

    const radiusMetres = Number(process.env.DEFAULT_RADIUS_METRES || 100);
    const maxAllowedAccuracy = Number(process.env.MAX_ALLOWED_ACCURACY_METRES || 50);

    const check = verifyVisitLocation({
      currentLat: Number(lat),
      currentLng: Number(lng),
      accuracy: Number(accuracy || 0),
      savedLocations,
      radiusMetres,
      maxAllowedAccuracy,
    });

    return res.json({
      success: true,
      verification: check,
      totalSavedLocations: savedLocations.length,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Submit and record a completed visit
 */
export async function submitVisit(req, res) {
  try {
    const {
      customerId,
      lat,
      lng,
      accuracy,
      clientTimestamp,
      outcome,
      collectedAmount,
      paymentMethod,
      paymentReference,
      ptpAmount,
      ptpDate,
      notes,
      photoUrl,
    } = req.body;

    if (!customerId || lat === undefined || lng === undefined || !outcome) {
      return res.status(400).json({
        success: false,
        message: 'customerId, coordinates, and visit outcome are required.',
      });
    }

    const savedLocations = await CustomerLocation.find({
      customerId,
      isActive: true,
      status: 'VERIFIED',
    });

    const radiusMetres = Number(process.env.DEFAULT_RADIUS_METRES || 100);
    const maxAllowedAccuracy = Number(process.env.MAX_ALLOWED_ACCURACY_METRES || 50);

    // Verify against all customer locations
    const check = verifyVisitLocation({
      currentLat: Number(lat),
      currentLng: Number(lng),
      accuracy: Number(accuracy || 0),
      savedLocations,
      radiusMetres,
      maxAllowedAccuracy,
    });

    // Fetch case and customer context to associate portfolio and case
    let targetCase = null;
    const { caseId: inputCaseId, portfolioId: inputPortfolioId, nonWorkableReason } = req.body;
    if (inputCaseId) {
      targetCase = await Case.findById(inputCaseId);
    } else {
      targetCase = await Case.findOne({ customerId, assignedStaff: req.user._id });
    }

    const customerDoc = await Customer.findById(customerId);
    const resolvedPortfolioId =
      inputPortfolioId || targetCase?.portfolioId || customerDoc?.portfolioId || null;
    const resolvedCaseId = targetCase?._id || null;

    // Create the Visit record with server timestamp & permanent staff snapshot
    const visit = await Visit.create({
      customerId,
      caseId: resolvedCaseId,
      portfolioId: resolvedPortfolioId,
      staffId: req.user._id,
      staffName: req.user.name || '',
      staffPhone: req.user.phone || '',
      staffEmployeeId: req.user.employeeId || '',
      locationAddress: customerDoc?.address || customerDoc?.area || '',
      coordinates: { lat: Number(lat), lng: Number(lng) },
      accuracy: Number(accuracy || 0),
      clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
      serverTimestamp: new Date(), // Authoritative time
      verificationStatus: check.status,
      matchedLocationId: check.matchedLocationId || null,
      distanceMetres: check.nearestDistance,
      configuredRadiusMetres: radiusMetres,
      isSuspicious: check.isSuspicious,
      verificationReason: check.reason,
      outcome,
      collectedAmount: Number(collectedAmount || 0),
      paymentMethod: paymentMethod || 'None',
      paymentReference: paymentReference || '',
      paymentStatus: Number(collectedAmount) > 0 ? 'PENDING_VERIFICATION' : 'NONE',
      ptpAmount: Number(ptpAmount || 0),
      ptpDate: ptpDate ? new Date(ptpDate) : null,
      notes: notes || '',
      photoUrl: photoUrl || '',
    });

    // Ensure customer has a verified CustomerLocation saved in database for future visits ONLY on first completed visit with real GPS
    const numLat = Number(lat);
    const numLng = Number(lng);
    const isValidGps = !isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0;

    const existingLocCount = await CustomerLocation.countDocuments({ customerId, isActive: true });
    if (existingLocCount === 0 && isValidGps) {
      await CustomerLocation.create({
        customerId,
        label: customerDoc?.area || customerDoc?.city ? `${customerDoc.area || customerDoc.city} Verified Location` : 'Primary Residence',
        type: 'Home',
        coordinates: { lat: numLat, lng: numLng },
        accuracy: Number(accuracy || 0),
        capturedBy: req.user._id,
        isDefault: true,
        isActive: true,
      }).catch(() => {});
    }

    // If visit is outside radius, generate an audit record in SuspiciousEvent
    if (check.isSuspicious) {
      await SuspiciousEvent.create({
        visitId: visit._id,
        customerId,
        caseId: resolvedCaseId,
        portfolioId: resolvedPortfolioId,
        staffId: req.user._id,
        distanceMetres: check.nearestDistance,
        radiusMetres,
        accuracy: Number(accuracy || 0),
        actualCoordinates: { lat: numLat, lng: numLng },
        reason: check.reason,
        reviewStatus: 'PENDING_REVIEW',
      });
    }

    // Determine Case and Customer status
    const isNonWorkable = [
      'Customer Unavailable',
      'House Locked',
      'Wrong Address',
      'Refused to Pay',
    ].includes(outcome);

    let updatedStatus = 'visited';
    if (Number(collectedAmount) > 0) {
      // Payment submitted: requires admin verification, NOT automatically paid
      updatedStatus = 'pending_verification';
    } else if (outcome === 'Promise to Pay (PTP)') {
      updatedStatus = 'ptp';
    } else if (isNonWorkable) {
      updatedStatus = 'non_workable';
    }

    // Update customer case status and reset isPlanned
    await Customer.findByIdAndUpdate(customerId, {
      status: updatedStatus === 'pending_verification' ? 'pending' : updatedStatus,
      isPlanned: false,
    });

    // Update Case if exists
    if (targetCase) {
      targetCase.status = updatedStatus;
      targetCase.isPlanned = false;
      targetCase.lastVisitDate = new Date();
      targetCase.lastVisitId = visit._id;
      if (outcome === 'Promise to Pay (PTP)') {
        targetCase.ptpAmount = Number(ptpAmount || 0);
        targetCase.ptpDate = ptpDate ? new Date(ptpDate) : null;
      }
      if (isNonWorkable) {
        targetCase.nonWorkableReason = nonWorkableReason || outcome;
      }
      await targetCase.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Visit submitted successfully',
      visit,
      verification: check,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Fetch suspicious visits for admin review with filtering
 */
export async function getSuspiciousVisits(req, res) {
  try {
    const { portfolioId, staffId, reviewStatus, search } = req.query;
    const query = {};

    if (portfolioId && portfolioId !== 'ALL') query.portfolioId = portfolioId;
    if (staffId && staffId !== 'ALL') query.staffId = staffId;
    if (reviewStatus && reviewStatus !== 'ALL') query.reviewStatus = reviewStatus;

    const list = await SuspiciousEvent.find(query)
      .populate('customerId', 'name phone loanAccountNo address city area photoUrl')
      .populate('staffId', 'name phone assignedArea employeeId')
      .populate('portfolioId', 'name code defaultRadiusMetres')
      .populate('caseId', 'loanAccountNo referenceNumber outstandingAmount dueAmount status')
      .populate('reviewedBy', 'name role')
      .populate('visitId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: list.length,
      suspiciousEvents: list,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin review action on suspicious visit
 * Actions: CONFIRM_MISMATCH, APPROVE_ALTERNATE, REQUEST_EVIDENCE, FALSE_ALERT, DISMISSED
 */
export async function reviewSuspiciousVisit(req, res) {
  try {
    const { eventId } = req.params;
    const { reviewStatus, reviewNotes, approvedAlternateLocation } = req.body;

    const event = await SuspiciousEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Suspicious event not found' });
    }

    const previousDecision = event.reviewStatus;
    event.reviewStatus = reviewStatus;
    event.reviewNotes = reviewNotes || '';
    event.reviewedBy = req.user._id;
    event.reviewedAt = new Date();

    // If approving alternate location, create new verified location for this customer
    if (reviewStatus === 'APPROVE_ALTERNATE' && event.actualCoordinates?.lat) {
      const { CustomerLocation } = await import('../models/CustomerLocation.js');
      await CustomerLocation.create({
        customerId: event.customerId,
        locationType: 'ALTERNATE_APPROVED',
        label: 'Approved Alternate Location',
        coordinates: event.actualCoordinates,
        accuracy: event.accuracy || 15,
        status: 'VERIFIED',
        staffId: event.staffId,
        remarks: `Auto-verified via Suspicious Review approval by ${req.user.name}: ${reviewNotes || 'Approved legitimate site'}`,
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      }).catch(() => {});
    }

    await event.save();

    // Log to AuditLog
    const { AuditLog } = await import('../models/AuditLog.js');
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action: 'REVIEW_SUSPICIOUS_VISIT',
      entityType: 'SuspiciousEvent',
      entityId: event._id.toString(),
      details: {
        previousDecision,
        newDecision: reviewStatus,
        reason: reviewNotes,
        customerId: event.customerId,
        staffId: event.staffId,
      },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Suspicious event review saved (${reviewStatus})`,
      event,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
