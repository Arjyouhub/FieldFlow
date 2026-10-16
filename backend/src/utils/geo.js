/**
 * FieldFlow GPS Verification & Geospatial Engine
 * Handles Haversine distance calculations, multi-location radius matching,
 * GPS accuracy thresholds, and duplicate location detection.
 */

const EARTH_RADIUS_METRES = 6371000;

/**
 * Calculate distance in metres between two coordinate pairs using Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in metres (rounded to 2 decimal places)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lon1 === undefined ||
    lat2 === undefined || lon2 === undefined ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
  ) {
    throw new Error('Valid numeric coordinates (lat1, lon1, lat2, lon2) are required.');
  }

  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METRES * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Verify a staff member's current visit location against all verified saved customer locations.
 * @param {Object} params
 * @param {number} params.currentLat Staff's current latitude
 * @param {number} params.currentLng Staff's current longitude
 * @param {number} params.accuracy Device-reported GPS accuracy in metres
 * @param {Array<Object>} params.savedLocations Array of customer's saved locations
 * @param {number} [params.radiusMetres=100] Allowed visit radius (default: 100m)
 * @param {number} [params.maxAllowedAccuracy=50] Maximum acceptable GPS accuracy in metres
 * @returns {Object} Verification outcome
 */
export function verifyVisitLocation({
  currentLat,
  currentLng,
  accuracy = 0,
  savedLocations = [],
  radiusMetres = 100,
  maxAllowedAccuracy = 50,
}) {
  // 1. Validate incoming coordinates
  if (currentLat === undefined || currentLng === undefined || isNaN(currentLat) || isNaN(currentLng)) {
    return {
      status: 'INVALID_COORDINATES',
      isMatched: false,
      isSuspicious: false,
      reason: 'Invalid or missing GPS coordinates.',
      accuracy,
      radiusMetres,
      nearestDistance: null,
      matchedLocation: null,
    };
  }

  // 2. Filter for active and verified customer locations
  const verifiedLocations = (savedLocations || []).filter(
    (loc) => loc.status === 'VERIFIED' && loc.isActive !== false
  );

  // 3. If customer has no verified locations saved yet
  if (verifiedLocations.length === 0) {
    return {
      status: 'NO_SAVED_LOCATIONS',
      isMatched: false,
      isSuspicious: false,
      reason: 'No verified saved locations exist for this customer. First visit registration required.',
      accuracy,
      radiusMetres,
      nearestDistance: null,
      matchedLocation: null,
    };
  }

  // 4. Check device GPS accuracy
  // If reported accuracy is worse than threshold (e.g. 85m > 50m), do NOT falsely accuse staff.
  // Instead, mark as ACCURACY_POOR / NEEDS_REVIEW.
  if (accuracy > maxAllowedAccuracy) {
    return {
      status: 'ACCURACY_POOR',
      isMatched: false,
      isSuspicious: false, // Low signal is NOT proof of fraud
      reason: `GPS accuracy is poor (${Math.round(accuracy)}m reported, max allowed is ${maxAllowedAccuracy}m). Visit marked for review.`,
      accuracy,
      radiusMetres,
      nearestDistance: null,
      matchedLocation: null,
    };
  }

  // 5. Compare current coordinates against each verified location
  let nearestLocation = null;
  let nearestDistance = Infinity;
  let matchedLocation = null;

  for (const loc of verifiedLocations) {
    const lat = loc.coordinates?.lat ?? loc.latitude;
    const lng = loc.coordinates?.lng ?? loc.longitude;

    if (lat !== undefined && lng !== undefined) {
      const distance = calculateHaversineDistance(currentLat, currentLng, lat, lng);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLocation = loc;
      }

      // Check if within configured radius (default 100m)
      if (distance <= radiusMetres && !matchedLocation) {
        matchedLocation = loc;
      }
    }
  }

  // 6. Evaluation outcome
  if (matchedLocation) {
    return {
      status: 'LOCATION_MATCHED',
      isMatched: true,
      isSuspicious: false,
      reason: `Matched verified location "${matchedLocation.label || matchedLocation.type}" within ${Math.round(nearestDistance)}m (radius: ${radiusMetres}m).`,
      accuracy,
      radiusMetres,
      distance: nearestDistance,
      nearestDistance,
      matchedLocationId: matchedLocation._id || matchedLocation.id,
      matchedLocation,
    };
  }

  // Outside radius from ALL verified locations with good GPS accuracy
  return {
    status: 'OUTSIDE_RADIUS',
    isMatched: false,
    isSuspicious: true, // Review signal for admin
    reason: `Staff is ${Math.round(nearestDistance)}m away from the nearest verified location "${nearestLocation?.label || nearestLocation?.type}" (configured radius: ${radiusMetres}m).`,
    accuracy,
    radiusMetres,
    distance: nearestDistance,
    nearestDistance,
    nearestLocationId: nearestLocation?._id || nearestLocation?.id,
    nearestLocation,
  };
}

/**
 * Check if a proposed new location is too close to an existing saved location (Duplicate check).
 * @param {number} newLat 
 * @param {number} newLng 
 * @param {Array<Object>} existingLocations 
 * @param {number} [thresholdMetres=25] 
 * @returns {{ isDuplicate: boolean, duplicateLocation: Object|null, distance: number|null }}
 */
export function checkDuplicateLocation(newLat, newLng, existingLocations = [], thresholdMetres = 25) {
  for (const loc of existingLocations) {
    const lat = loc.coordinates?.lat ?? loc.latitude;
    const lng = loc.coordinates?.lng ?? loc.longitude;

    if (lat !== undefined && lng !== undefined) {
      const distance = calculateHaversineDistance(newLat, newLng, lat, lng);
      if (distance <= thresholdMetres) {
        return {
          isDuplicate: true,
          duplicateLocation: loc,
          distance,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    duplicateLocation: null,
    distance: null,
  };
}
