/**
 * Haversine Formula for Distance Calculation on Field Staff Mobile App
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return Infinity;
  }

  const R = 6371000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format metres into human readable text ("65 m" or "2.4 km")
 */
export function formatDistance(metres: number | null | undefined): string {
  if (metres === null || metres === undefined || !isFinite(metres)) {
    return 'Distance unavailable';
  }
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Find nearest verified location distance for a customer given staff coordinates
 */
export function getCustomerNearestDistance(
  staffLat: number,
  staffLng: number,
  locations: any[] = []
): { nearestDistance: number | null; nearestLocation: any | null } {
  if (!locations || locations.length === 0) {
    return { nearestDistance: null, nearestLocation: null };
  }

  let minDistance = Infinity;
  let nearestLoc = null;

  for (const loc of locations) {
    const locLat = loc.coordinates?.lat ?? loc.lat;
    const locLng = loc.coordinates?.lng ?? loc.lng;

    if (locLat !== undefined && locLng !== undefined) {
      const dist = calculateHaversineDistance(staffLat, staffLng, Number(locLat), Number(locLng));
      if (dist < minDistance) {
        minDistance = dist;
        nearestLoc = loc;
      }
    }
  }

  return {
    nearestDistance: minDistance !== Infinity ? minDistance : null,
    nearestLocation: nearestLoc,
  };
}
