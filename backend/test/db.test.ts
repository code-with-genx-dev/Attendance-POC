import { getDatabaseStatus, dbRepository } from '../src/db';

async function runTests() {
  console.log('=== Running Phase 2 Database Repository & Schema Tests ===\n');

  // Test 1: Health / Status reporting
  const status = getDatabaseStatus();
  console.log('Test 1: Status Reporting');
  console.log('  Mode:', status.mode);
  console.log('  IsConfigured:', status.isConfigured);
  console.log('  Target Database:', status.targetDatabase);
  if (!status.mode) throw new Error('Status mode is missing');
  console.log('  -> PASS\n');

  // Test 2: Seed Admin Account Query
  console.log('Test 2: Seed Admin Account Retrieval');
  const adminUser = await dbRepository.getUserByEmail('admin@company.com');
  if (!adminUser) throw new Error('Failed to find seed admin user');
  console.log(`  Found user: ${adminUser.full_name} (${adminUser.company_email}), Role: ${adminUser.role}`);
  if (adminUser.role !== 'Admin') throw new Error('Admin role mismatch');
  console.log('  -> PASS\n');

  // Test 3: User Creation with approved fields only
  console.log('Test 3: User Creation (Only Approved Fields)');
  const testUser = await dbRepository.createUser({
    company_email: 'test.emp@company.com',
    full_name: 'Test Employee',
    employee_code: 'EMP999',
    role: 'Employee',
    status: 'pending_password_change',
    password_hash: 'hashed_password_val'
  });
  if (!testUser || testUser.id <= 0) throw new Error('User creation failed');
  console.log(`  Created User ID ${testUser.id}: ${testUser.full_name}, Status: ${testUser.status}`);
  console.log('  -> PASS\n');

  // Test 4: QR Token Creation & Retrieval
  console.log('Test 4: QR Token Cycle');
  const sampleHash = 'hash_' + Date.now();
  const token = await dbRepository.createQrToken(
    sampleHash,
    new Date(),
    new Date(Date.now() + 30000)
  );
  if (!token || token.token_hash !== sampleHash) throw new Error('Token creation failed');
  const fetchedToken = await dbRepository.getQrTokenByHash(sampleHash);
  if (!fetchedToken) throw new Error('Failed to fetch created token');
  await dbRepository.markQrTokenUsed(fetchedToken.id);
  console.log(`  Created and marked token ${token.id} as used`);
  console.log('  -> PASS\n');

  // Test 5: Attendance Session & Event
  console.log('Test 5: Attendance Session & Event');
  const today = new Date().toISOString().split('T')[0];
  const session = await dbRepository.createSession({
    user_id: testUser.id,
    work_date: today,
    check_in_at: new Date(),
    status: 'open'
  });
  if (!session || session.status !== 'open') throw new Error('Session creation failed');
  console.log(`  Created Session ID ${session.id} for Date ${session.work_date}`);

  const event = await dbRepository.createAttendanceEvent({
    user_id: testUser.id,
    event_type: 'check_in',
    server_timestamp: new Date(),
    qr_token_id: token.id,
    source: 'qr_scan',
    idempotency_key: 'idem_' + Date.now()
  });
  if (!event || event.event_type !== 'check_in') throw new Error('Event creation failed');
  console.log(`  Created Attendance Event ID ${event.id} (${event.event_type})`);
  console.log('  -> PASS\n');

  // Test 6: Audit Log
  console.log('Test 6: Audit Log Recording');
  const audit = await dbRepository.createAuditLog({
    actor_user_id: 1,
    action: 'TEST_ACTION',
    entity_type: 'attendance_sessions',
    entity_id: session.id,
    reason: 'Automated Phase 2 verification test'
  });
  if (!audit || audit.id <= 0) throw new Error('Audit log creation failed');
  console.log(`  Recorded Audit Log ID ${audit.id}: ${audit.action}`);
  console.log('  -> PASS\n');

  console.log('=== ALL PHASE 2 DATABASE & REPOSITORY TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
