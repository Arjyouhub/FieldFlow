import { CustomerLocation } from '../models/CustomerLocation.js';
import { Customer } from '../models/Customer.js';
import { checkDuplicateLocation } from '../utils/geo.js';

/**
 * Save initial customer location (First Visit)
 */
export async function saveInitialLocation(req, res) {
  try {
    const { customerId, label, type, lat, lng, accuracy, remarks, photoUrl } = req.body;

    if (!customerId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'customerId, latitude (lat), and longitude (lng) are required.',
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const newLocation = await CustomerLocation.create({
      customerId,
      label: label || `${type || 'Home'} Location`,
      type: type || 'Home',
      coordinates: { lat: Number(lat), lng: Number(lng) },
      accuracy: accuracy || 0,
      capturedBy: req.user._id,
      capturedAtDevice: new Date(),
      status: 'VERIFIED', // First visit location is verified as primary
      isDefault: true,
      remarks: remarks || '',
      photoUrl: photoUrl || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Initial customer location saved and verified successfully.',
      location: newLocation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Add an additional location for a customer (e.g. Workplace, Relative's House)
 * Performs duplicate detection before creating.
 */
export async function addCustomerLocation(req, res) {
  try {
    const { customerId, label, type, lat, lng, accuracy, remarks, photoUrl, allowDuplicate } = req.body;

    if (!customerId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'customerId, latitude (lat), and longitude (lng) are required.',
      });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Check existing locations for duplicates
    const existingLocations = await CustomerLocation.find({ customerId, isActive: true });
    const duplicateCheck = checkDuplicateLocation(Number(lat), Number(lng), existingLocations, 25);

    if (duplicateCheck.isDuplicate && !allowDuplicate) {
      return res.status(409).json({
        success: false,
        isDuplicateWarning: true,
        message: `This coordinate is only ${Math.round(duplicateCheck.distance)}m away from existing location "${duplicateCheck.duplicateLocation.label}".`,
        existingLocation: duplicateCheck.duplicateLocation,
      });
    }

    const newLocation = await CustomerLocation.create({
      customerId,
      label: label || `${type || 'Other'} Location`,
      type: type || 'Other',
      coordinates: { lat: Number(lat), lng: Number(lng) },
      accuracy: accuracy || 0,
      capturedBy: req.user._id,
      status: 'VERIFIED',
      remarks: remarks || '',
      photoUrl: photoUrl || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Additional customer location saved successfully.',
      location: newLocation,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Fetch all saved locations for a specific customer
 */
export async function getCustomerLocations(req, res) {
  try {
    const { customerId } = req.params;
    const locations = await CustomerLocation.find({ customerId, isActive: true })
      .populate('capturedBy', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: locations.length,
      locations,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Admin action: Approve, Reject, or deactivate a customer location
 */
export async function updateLocationStatus(req, res) {
  try {
    const { locationId } = req.params;
    const { status, rejectionReason, isActive } = req.body;

    const location = await CustomerLocation.findById(locationId);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found.' });
    }

    if (status) location.status = status;
    if (rejectionReason !== undefined) location.rejectionReason = rejectionReason;
    if (isActive !== undefined) location.isActive = isActive;

    location.reviewedBy = req.user._id;
    location.reviewedAt = new Date();

    await location.save();

    return res.json({
      success: true,
      message: `Location status updated to ${location.status}`,
      location,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
