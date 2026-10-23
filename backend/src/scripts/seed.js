import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Portfolio } from '../models/Portfolio.js';
import { MonthlyBatch } from '../models/MonthlyBatch.js';
import { Customer } from '../models/Customer.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { Case } from '../models/Case.js';
import { Visit } from '../models/Visit.js';
import { SuspiciousEvent } from '../models/SuspiciousEvent.js';
import { SystemSettings } from '../models/SystemSettings.js';
import { AuditLog } from '../models/AuditLog.js';

export async function runMasterSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SAFETY: Cannot run development seed script in PRODUCTION environment.');
  }

  console.log('[FieldFlow Master Seed] Initializing development database seed...');
  await connectDB();

  // 1. System Settings
  let settings = await SystemSettings.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await SystemSettings.create({
      key: 'global_config',
      defaultRadiusMetres: 100,
      maxAllowedAccuracyMetres: 50,
      duplicateDetectionMetres: 25,
      requireApprovalForNewLocations: false,
      allowedLocationTypes: ['Home', 'Office', 'Shop', 'Relative', 'Other'],
      maintenanceMode: false,
    });
    console.log('✓ System settings initialized (100m default geofence radius)');
  }

  // 2. Demo Users
  // Admin
  let admin = await User.findOne({ phone: '9876543210' });
  if (!admin) {
    admin = await User.create({
      name: 'System Admin',
      employeeId: 'ADM-001',
      phone: '9876543210',
      email: 'admin@fieldflow.com',
      password: 'password123',
      role: 'admin',
      team: 'Headquarters Operations',
      assignedArea: 'Kerala State',
      status: 'active',
    });
    console.log('✓ Super Admin created: 9876543210 / password123');
  }

  // Staff 1
  let staff1 = await User.findOne({ phone: '9876543211' });
  if (!staff1) {
    staff1 = await User.create({
      name: 'Rahul Kumar (Field Staff)',
      employeeId: 'STF-101',
      phone: '9876543211',
      email: 'rahul@fieldflow.com',
      password: 'password123',
      role: 'staff',
      team: 'Kozhikode North Hub',
      assignedArea: 'Kozhikode Central',
      status: 'active',
    });
    console.log('✓ Staff 1 created: 9876543211 / password123');
  }

  // Staff 2
  let staff2 = await User.findOne({ phone: '9876543213' });
  if (!staff2) {
    staff2 = await User.create({
      name: 'Priya Sharma (Field Staff)',
      employeeId: 'STF-102',
      phone: '9876543213',
      email: 'priya@fieldflow.com',
      password: 'password123',
      role: 'staff',
      team: 'Kozhikode South Hub',
      assignedArea: 'Mavoor & Bypass',
      status: 'active',
    });
    console.log('✓ Staff 2 created: 9876543213 / password123');
  }

  // Developer
  let dev = await User.findOne({ phone: '9876543212' });
  if (!dev) {
    dev = await User.create({
      name: 'DevOps Lead Engineer',
      employeeId: 'DEV-901',
      phone: '9876543212',
      email: 'dev@fieldflow.com',
      password: 'password123',
      role: 'developer',
      team: 'Core Platform Engineering',
      status: 'active',
    });
    console.log('✓ Developer created: 9876543212 / password123');
  }

  // 3. Portfolios
  const portfolioConfigs = [
    { name: 'KreditBee', code: 'KREDITBEE', description: 'Digital Personal & Salary Loans', defaultRadiusMetres: 100 },
    { name: 'Money Smart', code: 'MONEYSMART', description: 'Consumer Durable & BNPL Finance', defaultRadiusMetres: 100 },
    { name: 'SmartCoin', code: 'SMARTCOIN', description: 'Micro-credit & Small Business Lending', defaultRadiusMetres: 100 },
    { name: 'Other Finance Portfolios', code: 'OTHERFIN', description: 'Retail Auto & Equipment Recovery', defaultRadiusMetres: 120 },
  ];

  const portfolios = {};
  for (const cfg of portfolioConfigs) {
    let p = await Portfolio.findOne({ code: cfg.code });
    if (!p) {
      p = await Portfolio.create({
        ...cfg,
        isActive: true,
        auditHistory: [{ action: 'SEED_INITIAL', timestamp: new Date() }],
      });
      console.log(`✓ Portfolio created: ${p.name} [${p.code}]`);
    }
    portfolios[cfg.code] = p;
  }

  // 4. Monthly Batches
  const batchConfigs = [
    { name: 'OCT-2026', portfolioId: portfolios['KREDITBEE']._id, month: 'OCT', year: 2026 },
    { name: 'NOV-2026', portfolioId: portfolios['MONEYSMART']._id, month: 'NOV', year: 2026 },
    { name: 'OCT-2026', portfolioId: portfolios['SMARTCOIN']._id, month: 'OCT', year: 2026 },
    { name: 'OCT-2026', portfolioId: portfolios['OTHERFIN']._id, month: 'OCT', year: 2026 },
  ];

  const batches = {};
  for (const bCfg of batchConfigs) {
    const key = `${bCfg.portfolioId.toString()}_${bCfg.name}`;
    let b = await MonthlyBatch.findOne({ portfolioId: bCfg.portfolioId, name: bCfg.name });
    if (!b) {
      b = await MonthlyBatch.create({
        ...bCfg,
        code: `${bCfg.name}`,
        importedBy: admin._id,
      });
      console.log(`✓ Monthly Batch created: ${b.name}`);
    }
    batches[key] = b;
  }

  // 5. Sample Customers (Real Calicut / Kozhikode GPS coordinates)
  // Calicut Beach: 11.2588, 75.7725
  // Mavoor Road: 11.2650, 75.7850
  // Thondayad: 11.2720, 75.8020
  // Palayam Market: 11.2515, 75.7840
  const customerSeeds = [
    {
      name: 'Mohammed Shafi',
      phone: '9847123456',
      alternatePhone: '9847199999',
      address: 'Shafi Manzil, Near Beach Road, Kozhikode',
      city: 'Kozhikode',
      area: 'Beach Road',
      locations: [
        { label: 'Home (Primary)', type: 'Home', lat: 11.2588, lng: 75.7725, accuracy: 10, remarks: 'White two-story house near beach gate' },
        { label: 'Shafi Electronics (Work)', type: 'Shop', lat: 11.2520, lng: 75.7830, accuracy: 12, remarks: 'Electronics shop in Palayam market' },
      ],
    },
    {
      name: 'Anjali Menon',
      phone: '9447654321',
      alternatePhone: '9447000111',
      address: 'Menon Villa, Mavoor Road, Kozhikode',
      city: 'Kozhikode',
      area: 'Mavoor Road',
      locations: [
        { label: 'Residence', type: 'Home', lat: 11.2650, lng: 75.7850, accuracy: 8, remarks: 'Green compound wall opposite bus stop' },
      ],
    },
    {
      name: 'Pradeep Kumar',
      phone: '9745112233',
      alternatePhone: '',
      address: 'Devi Nilayam, Thondayad Bypass, Kozhikode',
      city: 'Kozhikode',
      area: 'Thondayad',
      locations: [
        { label: 'Family Home', type: 'Home', lat: 11.2720, lng: 75.8020, accuracy: 15, remarks: 'Beside Federal Bank ATM' },
      ],
    },
    {
      name: 'Faizal Rahman',
      phone: '9846223344',
      alternatePhone: '9846001122',
      address: 'Rahman Cottage, Medical College Road, Kozhikode',
      city: 'Kozhikode',
      area: 'Medical College',
      locations: [
        { label: 'Home', type: 'Home', lat: 11.2850, lng: 75.8350, accuracy: 10, remarks: 'Near Medical College Police Station' },
      ],
    },
    {
      name: 'Aswin Krishna',
      phone: '8943392081',
      alternatePhone: '8943392000',
      address: 'Nikal Parambath, Eramala, Kozhikode',
      city: 'Kozhikode',
      area: 'Eramala',
      locations: [
        { label: 'Residence', type: 'Home', lat: 11.2650, lng: 75.7850, accuracy: 8, remarks: 'Nikal Parambath' },
      ],
    },
    {
      name: 'Kodakkattu Sudev',
      phone: '7909181020',
      alternatePhone: '7909181000',
      address: 'Karthikapalli, Vadakara, Kozhikode',
      city: 'Vadakara',
      area: 'Karthikapalli',
      locations: [
        { label: 'Home', type: 'Home', lat: 11.2720, lng: 75.8020, accuracy: 10, remarks: 'Karthikapalli junction' },
      ],
    },
    {
      name: 'Ramesh K',
      phone: '9847561230',
      alternatePhone: '',
      address: 'Eramala, Kozhikode',
      city: 'Kozhikode',
      area: 'Eramala',
      locations: [
        { label: 'Residence', type: 'Home', lat: 11.2850, lng: 75.8150, accuracy: 12, remarks: 'Eramala Post' },
      ],
    },
    {
      name: 'Shabeer M',
      phone: '9074112334',
      alternatePhone: '9074112000',
      address: 'Perambra, Kozhikode',
      city: 'Kozhikode',
      area: 'Perambra',
      locations: [
        { label: 'Home', type: 'Home', lat: 11.2588, lng: 75.7725, accuracy: 6, remarks: 'Near Bus Stand' },
      ],
    },
    {
      name: 'Nishad P',
      phone: '9061334221',
      alternatePhone: '',
      address: 'Kozhikode',
      city: 'Kozhikode',
      area: 'Kozhikode',
      locations: [
        { label: 'Residence', type: 'Home', lat: 11.2700, lng: 75.7900, accuracy: 9, remarks: 'Kozhikode City' },
      ],
    },
    {
      name: 'Vineeth Rajan',
      phone: '9895123401',
      alternatePhone: '',
      address: 'Meenchanda, Kozhikode',
      city: 'Kozhikode',
      area: 'Meenchanda',
      locations: [
        { label: 'Home', type: 'Home', lat: 11.2400, lng: 75.8000, accuracy: 10, remarks: 'Meenchanda Bypass' },
      ],
    },
  ];

  const customerMap = {};
  for (const cData of customerSeeds) {
    let cust = await Customer.findOne({ phone: cData.phone });
    if (!cust) {
      cust = await Customer.create({
        name: cData.name,
        phone: cData.phone,
        alternatePhone: cData.alternatePhone,
        address: cData.address,
        city: cData.city,
        area: cData.area,
        loanAccountNo: `ACC-${cData.phone.slice(-4)}`,
        outstandingAmount: 25000,
        emiAmount: 3500,
        status: 'pending',
        assignedStaff: staff1._id,
        batchMonth: 'OCT-2026',
        portfolioId: portfolios['KREDITBEE']._id,
      });
      console.log(`✓ Customer created: ${cust.name}`);
    }
    customerMap[cData.phone] = cust;

    // Seed verified locations for customer
    for (const loc of cData.locations) {
      const existingLoc = await CustomerLocation.findOne({
        customerId: cust._id,
        label: loc.label,
      });
      if (!existingLoc) {
        await CustomerLocation.create({
          customerId: cust._id,
          label: loc.label,
          type: loc.type,
          coordinates: { lat: loc.lat, lng: loc.lng },
          accuracy: loc.accuracy,
          capturedBy: staff1._id,
          status: 'VERIFIED',
          isActive: true,
          remarks: loc.remarks,
        });
      }
    }
  }

  // 6. Distinct Cases per Portfolio & Monthly Batch
  // Demonstrating separation: Mohammed Shafi has BOTH a KreditBee case AND a SmartCoin case!
  const caseDefinitions = [
    {
      caseId: 'CAS-KB-OCT-1001',
      customerPhone: '9847123456', // Mohammed Shafi
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB-PL-99881',
      referenceNumber: 'REF-KB-01',
      outstandingAmount: 24500,
      dueAmount: 3500,
      assignedStaff: staff1._id,
      status: 'assigned',
    },
    {
      caseId: 'CAS-SC-OCT-2001',
      customerPhone: '9847123456', // Mohammed Shafi (Different portfolio & loan!)
      portfolioCode: 'SMARTCOIN',
      batchName: 'OCT-2026',
      loanAccountNo: 'SC-MC-55442',
      referenceNumber: 'REF-SC-02',
      outstandingAmount: 12000,
      dueAmount: 2000,
      assignedStaff: staff1._id,
      status: 'assigned',
    },
    {
      caseId: 'CAS-MS-NOV-3001',
      customerPhone: '9447654321', // Anjali Menon
      portfolioCode: 'MONEYSMART',
      batchName: 'NOV-2026',
      loanAccountNo: 'MS-CD-77663',
      referenceNumber: 'REF-MS-03',
      outstandingAmount: 38000,
      dueAmount: 5200,
      assignedStaff: staff1._id,
      status: 'assigned',
    },
    {
      caseId: 'CAS-KB-OCT-1002',
      customerPhone: '9745112233', // Pradeep Kumar
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB-PL-11223',
      referenceNumber: 'REF-KB-04',
      outstandingAmount: 45000,
      dueAmount: 6500,
      assignedStaff: staff2._id,
      status: 'assigned',
    },
    {
      caseId: 'CAS-OF-OCT-4001',
      customerPhone: '9846223344', // Faizal Rahman
      portfolioCode: 'OTHERFIN',
      batchName: 'OCT-2026',
      loanAccountNo: 'OF-EQ-33445',
      referenceNumber: 'REF-OF-05',
      outstandingAmount: 85000,
      dueAmount: 11000,
      assignedStaff: staff2._id,
      status: 'assigned',
    },
    {
      caseId: 'CAS-KB-OCT-1003',
      customerPhone: '9495334455',
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB-PL-44556',
      referenceNumber: '',
      outstandingAmount: 18500,
      dueAmount: 2600,
      assignedStaff: staff1._id,
      status: 'unvisited',
    },
    {
      caseId: 'CAS-KB-OCT-5001',
      customerPhone: '8943392081', // Aswin Krishna
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB250212ZUCRQ',
      referenceNumber: '673528',
      outstandingAmount: 12000,
      dueAmount: 12431,
      assignedStaff: staff1._id,
      status: 'visited',
    },
    {
      caseId: 'CAS-SC-OCT-5002',
      customerPhone: '7909181020', // Kodakkattu Sudev
      portfolioCode: 'SMARTCOIN',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB241018YDCWF',
      referenceNumber: '673542',
      outstandingAmount: 13000,
      dueAmount: 15161,
      assignedStaff: staff1._id,
      status: 'paid',
    },
    {
      caseId: 'CAS-MS-OCT-5003',
      customerPhone: '9847561230', // Ramesh K
      portfolioCode: 'MONEYSMART',
      batchName: 'OCT-2026',
      loanAccountNo: 'MS20261155',
      referenceNumber: '-',
      outstandingAmount: 25000,
      dueAmount: 27400,
      assignedStaff: staff1._id,
      status: 'unpaid',
    },
    {
      caseId: 'CAS-KB-OCT-5004',
      customerPhone: '9074112334', // Shabeer M
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB20260988',
      referenceNumber: '118933',
      outstandingAmount: 8500,
      dueAmount: 9200,
      assignedStaff: staff1._id,
      status: 'ptp',
    },
    {
      caseId: 'CAS-OF-OCT-5005',
      customerPhone: '9061334221', // Nishad P
      portfolioCode: 'OTHERFIN',
      batchName: 'OCT-2026',
      loanAccountNo: 'OF20261010',
      referenceNumber: '-',
      outstandingAmount: 18000,
      dueAmount: 21350,
      assignedStaff: staff1._id,
      status: 'broken_ptp',
    },
    {
      caseId: 'CAS-KB-OCT-5006',
      customerPhone: '9895123401', // Vineeth Rajan
      portfolioCode: 'KREDITBEE',
      batchName: 'OCT-2026',
      loanAccountNo: 'KB20261109',
      referenceNumber: '778812',
      outstandingAmount: 14500,
      dueAmount: 16200,
      assignedStaff: staff1._id,
      status: 'rtp',
    },
  ];

  for (const cd of caseDefinitions) {
    const cust = customerMap[cd.customerPhone];
    const port = portfolios[cd.portfolioCode];
    if (!cust || !port) continue;

    const existingCase = await Case.findOne({
      portfolioId: port._id,
      loanAccountNo: cd.loanAccountNo,
    });

    if (!existingCase) {
      await Case.create({
        caseId: cd.caseId,
        customerId: cust._id,
        portfolioId: port._id,
        batchMonth: cd.batchName,
        loanAccountNo: cd.loanAccountNo,
        referenceNumber: cd.referenceNumber,
        outstandingAmount: cd.outstandingAmount,
        dueAmount: cd.dueAmount,
        assignedStaff: cd.assignedStaff,
        status: cd.status,
      });
      console.log(`✓ Case created: ${cd.caseId} [${port.name}] -> Customer: ${cust.name}`);
    }
  }

  // 7. Seed Example Visit Scenarios (Matched, Suspicious, Accuracy Poor, PTP, Collection)
  const shafiCust = customerMap['9847123456'];
  const anjaliCust = customerMap['9447654321'];
  const pradeepCust = customerMap['9745112233'];
  const kbPortfolio = portfolios['KREDITBEE'];
  const msPortfolio = portfolios['MONEYSMART'];

  const existingVisitsCount = await Visit.countDocuments();
  if (existingVisitsCount === 0 && shafiCust) {
    // Scenario A: Matched Visit within 100m (35m from Home)
    const matchedVisit = await Visit.create({
      customerId: shafiCust._id,
      portfolioId: kbPortfolio._id,
      staffId: staff1._id,
      coordinates: { lat: 11.2591, lng: 75.7725 },
      accuracy: 12,
      verificationStatus: 'LOCATION_MATCHED',
      distanceMetres: 34,
      configuredRadiusMetres: 100,
      isSuspicious: false,
      verificationReason: 'Verified within 100m of saved Customer Home (34m away)',
      outcome: 'Payment Collected',
      collectedAmount: 3500,
      paymentMethod: 'UPI',
      paymentReference: 'UPI-KB-882299',
      paymentStatus: 'APPROVED',
      notes: 'Customer paid through GPay. Verified receipt.',
    });

    // Scenario B: Suspicious Visit (> 100m, e.g. 250m North of Home)
    const suspiciousVisit = await Visit.create({
      customerId: shafiCust._id,
      portfolioId: kbPortfolio._id,
      staffId: staff1._id,
      coordinates: { lat: 11.26105, lng: 75.7725 },
      accuracy: 14,
      verificationStatus: 'OUTSIDE_RADIUS',
      distanceMetres: 251,
      configuredRadiusMetres: 100,
      isSuspicious: true,
      verificationReason: 'Staff location is 251m from nearest verified location (exceeds 100m geofence)',
      outcome: 'Promise to Pay (PTP)',
      ptpAmount: 7000,
      ptpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      notes: 'Customer promised installment next Monday.',
    });

    // Create SuspiciousEvent for admin review
    await SuspiciousEvent.create({
      visitId: suspiciousVisit._id,
      customerId: shafiCust._id,
      portfolioId: kbPortfolio._id,
      staffId: staff1._id,
      distanceMetres: 251,
      radiusMetres: 100,
      accuracy: 14,
      actualCoordinates: { lat: 11.26105, lng: 75.7725 },
      reason: 'Staff location is 251m from nearest verified location (exceeds 100m geofence)',
      reviewStatus: 'PENDING_REVIEW',
    });

    // Scenario C: Poor GPS Accuracy (85m accuracy > 50m max allowed -> ACCURACY_POOR, Needs Review, NOT suspicious)
    if (anjaliCust) {
      await Visit.create({
        customerId: anjaliCust._id,
        portfolioId: msPortfolio._id,
        staffId: staff1._id,
        coordinates: { lat: 11.2670, lng: 75.7860 },
        accuracy: 85, // Weak signal
        verificationStatus: 'ACCURACY_POOR',
        distanceMetres: 180,
        configuredRadiusMetres: 100,
        isSuspicious: false, // NOT falsely accused
        verificationReason: 'GPS signal weak (reported accuracy ±85m exceeds allowable 50m threshold)',
        outcome: 'Other Feedback',
        notes: 'Heavy rainfall degraded GPS reception; customer was met in apartment lobby.',
      });
    }

    // Scenario D: Broken PTP scenario
    if (pradeepCust) {
      await Visit.create({
        customerId: pradeepCust._id,
        portfolioId: kbPortfolio._id,
        staffId: staff2._id,
        coordinates: { lat: 11.2721, lng: 75.8021 },
        accuracy: 10,
        verificationStatus: 'LOCATION_MATCHED',
        distanceMetres: 15,
        configuredRadiusMetres: 100,
        isSuspicious: false,
        verificationReason: 'Verified within 100m of Family Home (15m)',
        outcome: 'Promise to Pay (PTP)',
        ptpAmount: 6000,
        ptpDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (Broken!)
        notes: 'PTP defaulted; phone switched off.',
      });

      // Update case to broken_ptp
      await Case.findOneAndUpdate(
        { customerId: pradeepCust._id },
        { status: 'broken_ptp', ptpAmount: 6000, ptpDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      );
    }

    // Scenario E: Non-workable Case (House Locked)
    if (customerMap['9495334455']) {
      const kavitha = customerMap['9495334455'];
      await Visit.create({
        customerId: kavitha._id,
        portfolioId: kbPortfolio._id,
        staffId: staff1._id,
        coordinates: { lat: 11.2751, lng: 75.7751 },
        accuracy: 11,
        verificationStatus: 'LOCATION_MATCHED',
        distanceMetres: 14,
        configuredRadiusMetres: 100,
        isSuspicious: false,
        outcome: 'House Locked',
        notes: 'House locked with double padlock. Neighbours state customer traveled to Bangalore.',
      });

      await Case.findOneAndUpdate(
        { customerId: kavitha._id },
        { status: 'non_workable', nonWorkableReason: 'House Locked' }
      );
    }

    console.log('✓ Example visit scenarios seeded (Matched, Suspicious, Poor Accuracy, Broken PTP, Non-workable)');
  }

  console.log('================================================================');
  console.log('🎉 FIELDFLOW MASTER SEED COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log('DEMO ACCOUNTS MATRIX:');
  console.log('1. Super Admin:       Phone: 9876543210 | Password: password123');
  console.log('2. Field Staff (1):   Phone: 9876543211 | Password: password123 (Rahul Kumar)');
  console.log('3. Field Staff (2):   Phone: 9876543213 | Password: password123 (Priya Sharma)');
  console.log('4. Developer Lead:    Phone: 9876543212 | Password: password123');
  console.log('================================================================');
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runMasterSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
