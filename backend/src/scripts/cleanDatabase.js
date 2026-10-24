import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { CustomerLocation } from '../models/CustomerLocation.js';
import { Case } from '../models/Case.js';
import { Visit } from '../models/Visit.js';
import { SuspiciousEvent } from '../models/SuspiciousEvent.js';
import { AuditLog } from '../models/AuditLog.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { Session } from '../models/Session.js';
import { CallLog } from '../models/CallLog.js';
import { ExternalVisitMetric } from '../models/ExternalVisitMetric.js';
import { MonthlyBatch } from '../models/MonthlyBatch.js';
import { Portfolio } from '../models/Portfolio.js';

async function main() {
  console.log('[FieldFlow Fresh Reset] Connecting to database...');
  await connectDB();

  console.log('[FieldFlow Fresh Reset] Purging dummy data...');

  // 1. Delete dummy staff accounts (Rahul Kumar, Priya Sharma)
  const staffRes = await User.deleteMany({
    phone: { $in: ['9876543211', '9876543213'] }
  });
  console.log(`✓ Deleted ${staffRes.deletedCount} dummy staff accounts.`);

  // 2. Delete all dummy customers and locations
  const custRes = await Customer.deleteMany({});
  const locRes = await CustomerLocation.deleteMany({});
  console.log(`✓ Deleted ${custRes.deletedCount} customers and ${locRes.deletedCount} customer locations.`);

  // 3. Delete all cases and monthly batches
  const caseRes = await Case.deleteMany({});
  const batchRes = await MonthlyBatch.deleteMany({});
  console.log(`✓ Deleted ${caseRes.deletedCount} cases and ${batchRes.deletedCount} monthly batches.`);

  // 4. Delete all visits and suspicious events
  const visitRes = await Visit.deleteMany({});
  const suspRes = await SuspiciousEvent.deleteMany({});
  console.log(`✓ Deleted ${visitRes.deletedCount} visits and ${suspRes.deletedCount} suspicious events.`);

  // 5. Delete all logs, metrics and stale sessions
  const auditRes = await AuditLog.deleteMany({});
  const secRes = await SecurityEvent.deleteMany({});
  const sessRes = await Session.deleteMany({});
  const callRes = await CallLog.deleteMany({});
  const metricRes = await ExternalVisitMetric.deleteMany({});
  console.log(`✓ Deleted ${auditRes.deletedCount} audit logs, ${secRes.deletedCount} security events, ${sessRes.deletedCount} sessions, ${callRes.deletedCount} call logs, ${metricRes.deletedCount} metrics.`);

  console.log('\n[FieldFlow Fresh Reset] Remaining users in database:');
  const remainingUsers = await User.find({}, { name: 1, phone: 1, role: 1, status: 1 });
  console.log(JSON.stringify(remainingUsers, null, 2));

  console.log('\n✓ Database is now fresh, completely free of dummy data!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error cleaning database:', err);
  process.exit(1);
});
