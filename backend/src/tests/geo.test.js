import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistance,
  verifyVisitLocation,
  checkDuplicateLocation,
} from '../utils/geo.js';

describe('FieldFlow GPS Verification Engine Tests', () => {
  // Test coordinates:
  // Calicut Beach: 11.2588, 75.7725
  // Point 40 metres away: 11.25916, 75.7725 (approx 40m North)
  // Point 250 metres away: 11.26105, 75.7725 (approx 250m North)

  describe('calculateHaversineDistance', () => {
    it('should return 0 metres for identical coordinates', () => {
      const distance = calculateHaversineDistance(11.2588, 75.7725, 11.2588, 75.7725);
      assert.equal(distance, 0);
    });

    it('should accurately calculate distance between two known points in Kerala', () => {
      // Point A: 11.2588, 75.7725
      // Point B: 11.25916, 75.7725 (approx ~40 metres)
      const distance = calculateHaversineDistance(11.2588, 75.7725, 11.25916, 75.7725);
      assert.ok(distance >= 39 && distance <= 42, `Expected ~40m, got ${distance}m`);
    });

    it('should throw error when coordinates are missing or invalid', () => {
      assert.throws(() => {
        calculateHaversineDistance(undefined, 75.7725, 11.25916, 75.7725);
      }, /Valid numeric coordinates/);
    });
  });

  describe('verifyVisitLocation', () => {
    const mockHomeLocation = {
      _id: 'loc_home_01',
      label: 'Customer Home',
      type: 'Home',
      status: 'VERIFIED',
      isActive: true,
      coordinates: { lat: 11.2588, lng: 75.7725 },
    };

    const mockOfficeLocation = {
      _id: 'loc_office_02',
      label: 'Workplace / Office',
      type: 'Office',
      status: 'VERIFIED',
      isActive: true,
      coordinates: { lat: 11.2700, lng: 75.7800 },
    };

    it('should mark LOCATION_MATCHED when staff is within 100m of Home', () => {
      // 40m away from Home with 15m GPS accuracy
      const result = verifyVisitLocation({
        currentLat: 11.25916,
        currentLng: 75.7725,
        accuracy: 15,
        savedLocations: [mockHomeLocation, mockOfficeLocation],
        radiusMetres: 100,
        maxAllowedAccuracy: 50,
      });

      assert.equal(result.status, 'LOCATION_MATCHED');
      assert.equal(result.isMatched, true);
      assert.equal(result.isSuspicious, false);
      assert.equal(result.matchedLocationId, 'loc_home_01');
      assert.ok(result.distance <= 100);
    });

    it('should mark LOCATION_MATCHED when staff visits Office instead of Home', () => {
      // Staff visits Office (~20m away from Office)
      const result = verifyVisitLocation({
        currentLat: 11.2701,
        currentLng: 75.7800,
        accuracy: 10,
        savedLocations: [mockHomeLocation, mockOfficeLocation],
        radiusMetres: 100,
      });

      assert.equal(result.status, 'LOCATION_MATCHED');
      assert.equal(result.isMatched, true);
      assert.equal(result.matchedLocationId, 'loc_office_02');
    });

    it('should mark OUTSIDE_RADIUS (Suspicious signal) when staff is > 100m from all locations', () => {
      // Staff is at 11.26105 (approx 250m away from Home, and >1km away from Office)
      const result = verifyVisitLocation({
        currentLat: 11.26105,
        currentLng: 75.7725,
        accuracy: 12,
        savedLocations: [mockHomeLocation, mockOfficeLocation],
        radiusMetres: 100,
      });

      assert.equal(result.status, 'OUTSIDE_RADIUS');
      assert.equal(result.isMatched, false);
      assert.equal(result.isSuspicious, true);
      assert.ok(result.distance > 100);
    });

    it('should mark ACCURACY_POOR and NOT accuse staff when GPS signal is weak', () => {
      // Device reported 85m accuracy (max allowed: 50m)
      const result = verifyVisitLocation({
        currentLat: 11.26105,
        currentLng: 75.7725,
        accuracy: 85,
        savedLocations: [mockHomeLocation],
        radiusMetres: 100,
        maxAllowedAccuracy: 50,
      });

      assert.equal(result.status, 'ACCURACY_POOR');
      assert.equal(result.isMatched, false);
      assert.equal(result.isSuspicious, false); // NOT falsely accused of fraud
    });

    it('should handle first visit when customer has no saved locations yet', () => {
      const result = verifyVisitLocation({
        currentLat: 11.2588,
        currentLng: 75.7725,
        accuracy: 10,
        savedLocations: [],
      });

      assert.equal(result.status, 'NO_SAVED_LOCATIONS');
      assert.equal(result.isMatched, false);
      assert.equal(result.isSuspicious, false);
    });
  });

  describe('checkDuplicateLocation', () => {
    const existing = [
      {
        _id: 'loc_1',
        label: 'Existing Home',
        coordinates: { lat: 11.2588, lng: 75.7725 },
      },
    ];

    it('should detect duplicate when new coordinates are within 10 metres', () => {
      // Very close (~5m)
      const check = checkDuplicateLocation(11.25884, 75.7725, existing, 25);
      assert.equal(check.isDuplicate, true);
      assert.ok(check.distance <= 25);
    });

    it('should allow new location when coordinates are distinct (> 25 metres)', () => {
      // 100m away
      const check = checkDuplicateLocation(11.2598, 75.7725, existing, 25);
      assert.equal(check.isDuplicate, false);
    });
  });
});
