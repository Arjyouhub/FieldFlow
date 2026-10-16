import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { connectDB } from '../config/db.js';

describe('FieldFlow Portfolio & Case Architecture Tests', () => {
  let server;
  const BASE_URL = 'http://localhost:5002/api';
  let adminToken = '';
  let staffToken = '';
  let testPortfolioId = '';

  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(5002, () => resolve());
    });

    // Login admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail: '9876543210', password: 'password123' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // Login staff
    const staffRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail: '9876543211', password: 'password123' }),
    });
    const staffData = await staffRes.json();
    staffToken = staffData.token;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it('1. Admin can list portfolios with live stats', async () => {
    const res = await fetch(`${BASE_URL}/portfolios`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.portfolios.length >= 3);
    testPortfolioId = data.portfolios[0]._id;
    assert.ok(data.portfolios[0].stats, 'Portfolio must include aggregated statistics');
  });

  it('2. Admin can create a new finance portfolio', async () => {
    const code = `TEST${Date.now().toString().slice(-4)}`;
    const res = await fetch(`${BASE_URL}/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'NeoBank Consumer Finance',
        code,
        description: 'Instant credit card EMI collections',
        defaultRadiusMetres: 100,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.portfolio.code, code);
  });

  it('3. Staff CANNOT create portfolios (RBAC enforcement)', async () => {
    const res = await fetch(`${BASE_URL}/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Portfolio',
        code: 'UNAUTH',
      }),
    });
    assert.equal(res.status, 403);
  });

  it('4. Bulk import cases into portfolio validates columns and creates cases', async () => {
    const res = await fetch(`${BASE_URL}/cases/import-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        portfolioId: testPortfolioId,
        batchMonth: 'OCT-2026',
        cases: [
          {
            accountNumber: `ACC-TEST-${Date.now()}-1`,
            customerName: 'Test Customer A',
            mobileNumber: '9998881111',
            address: 'Calicut City Center',
            outstandingAmount: 15000,
            dueAmount: 2500,
          },
          {
            accountNumber: `ACC-TEST-${Date.now()}-2`,
            customerName: 'Test Customer B',
            mobileNumber: '9998882222',
            address: 'Bypass Junction',
            outstandingAmount: 22000,
            dueAmount: 3200,
          },
        ],
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.stats.successCount, 2);
    assert.equal(data.stats.failedCount, 0);
  });

  it('5. Safe retry: Re-importing identical accounts detects duplicates without overwriting', async () => {
    const duplicateAccount = `ACC-DUP-${Date.now()}`;
    // 1st import
    await fetch(`${BASE_URL}/cases/import-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        portfolioId: testPortfolioId,
        batchMonth: 'OCT-2026',
        cases: [
          {
            accountNumber: duplicateAccount,
            customerName: 'Idempotency Tester',
            mobileNumber: '9991112233',
            outstandingAmount: 10000,
          },
        ],
      }),
    });

    // 2nd import (Retry)
    const retryRes = await fetch(`${BASE_URL}/cases/import-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        portfolioId: testPortfolioId,
        batchMonth: 'OCT-2026',
        cases: [
          {
            accountNumber: duplicateAccount,
            customerName: 'Idempotency Tester',
            mobileNumber: '9991112233',
            outstandingAmount: 10000,
          },
        ],
      }),
    });

    const retryData = await retryRes.json();
    assert.equal(retryRes.status, 201);
    assert.equal(retryData.stats.duplicateCount, 1);
    assert.equal(retryData.stats.successCount, 0);
  });
});
