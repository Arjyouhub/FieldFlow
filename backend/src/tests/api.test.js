import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { connectDB } from '../config/db.js';

describe('FieldFlow API Integration Tests', () => {
  let server;
  let BASE_URL = 'http://localhost:5001/api';
  let staffToken = '';
  let adminToken = '';
  let devToken = '';
  let customerId = '';

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(5001, () => {
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. GET /health should return 200 and database connected or online', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'ONLINE');
  });

  it('2. POST /auth/seed-initial-users should prepare test users', async () => {
    const res = await fetch(`${BASE_URL}/auth/seed-initial-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
  });

  it('3. POST /auth/login with staff credentials should return JWT and staff role', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneOrEmail: '9876543211',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.role, 'staff');
    staffToken = data.token;
  });

  it('4. POST /auth/login with admin credentials should return JWT and admin role', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneOrEmail: '9876543210',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'admin');
    adminToken = data.token;
  });

  it('5. POST /auth/login with dev credentials should return JWT and developer role', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneOrEmail: '9876543212',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'developer');
    devToken = data.token;
  });

  it('6. POST /customers/seed-demo should seed or retrieve cases', async () => {
    const res = await fetch(`${BASE_URL}/customers/seed-demo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
    });
    const data = await res.json();
    assert.ok(res.status === 200 || res.status === 201);
    
    // Ensure customerId is obtained for customer Mohammed Shafi (Beach Road coords 11.2588, 75.7725)
    const assignedRes = await fetch(`${BASE_URL}/customers/assigned`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const assignedData = await assignedRes.json();
    assert.ok(assignedData.customers.length > 0);
    const targetCust =
      assignedData.customers.find((c) => c.name === 'Mohammed Shafi') ||
      assignedData.customers[0];
    customerId = targetCust._id;
    assert.ok(customerId, 'customerId must be set');
  });

  it('7. GET /customers/assigned should return assigned cases for staff', async () => {
    const res = await fetch(`${BASE_URL}/customers/assigned`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.customers.length > 0);
  });

  it('8. POST /visits/precheck-gps: within 100m of customer verified home should MATCH', async () => {
    const res = await fetch(`${BASE_URL}/visits/precheck-gps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        lat: 11.25916,
        lng: 75.7725,
        accuracy: 10,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.verification.status, 'LOCATION_MATCHED');
    assert.equal(data.verification.isMatched, true);
    assert.equal(data.verification.isSuspicious, false);
  });

  it('9. POST /visits/precheck-gps: outside 100m should signal OUTSIDE_RADIUS', async () => {
    const res = await fetch(`${BASE_URL}/visits/precheck-gps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        lat: 11.26105,
        lng: 75.7725,
        accuracy: 10,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.verification.status, 'OUTSIDE_RADIUS');
    assert.equal(data.verification.isSuspicious, true);
  });

  it('10. POST /visits/submit should record visit and handle payment', async () => {
    const res = await fetch(`${BASE_URL}/visits/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customerId,
        lat: 11.25916,
        lng: 75.7725,
        accuracy: 10,
        outcome: 'Payment Collected',
        collectedAmount: 3500,
        paymentMethod: 'UPI',
        paymentReference: 'UPI-REF-998877',
        notes: 'Customer paid installment.',
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.visit.paymentStatus, 'PENDING_VERIFICATION');
    assert.equal(data.visit.collectedAmount, 3500);
  });

  it('11. GET /admin/dashboard-stats should allow admin and block staff (RBAC)', async () => {
    // 1. Staff access should be forbidden (403)
    const staffRes = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffRes.status, 403);

    // 2. Admin access should succeed (200)
    const adminRes = await fetch(`${BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRes.status, 200);
    const data = await adminRes.json();
    assert.equal(data.success, true);
    assert.ok(data.stats.totalCustomers >= 1);
  });

  it('12. GET /developer/overview should allow developer and block staff', async () => {
    // 1. Staff access should be forbidden (403)
    const staffRes = await fetch(`${BASE_URL}/developer/overview`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffRes.status, 403);

    // 2. Developer access should succeed (200)
    const devRes = await fetch(`${BASE_URL}/developer/overview`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(devRes.status, 200);
    const data = await devRes.json();
    assert.equal(data.success, true);
    assert.ok(data.system.nodeVersion);
  });
});
