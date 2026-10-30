import http from 'http';
import app from '../src/app';
import { api, setApiBaseUrl } from '../../mobile/src/services/api';
import { qrService } from '../src/services/qr.service';

async function runMobileApiIntegrationTest() {
  console.log('=== Running Phase 7 Mobile API Integration Tests ===\n');

  const server = http.createServer(app);
  const TEST_PORT = 5094;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  setApiBaseUrl(`http://localhost:${TEST_PORT}/api`);

  try {
    // 1. Mobile Login
    console.log('Test 1: Mobile Client Login (Employee credentials)');
    const loginRes = await api.login('employee@company.com', 'Employee@12345');
    if (!loginRes.token || loginRes.user.company_email !== 'employee@company.com') {
      throw new Error(`Mobile login failed: ${JSON.stringify(loginRes)}`);
    }
    console.log(`  Authenticated as: ${loginRes.user.full_name} (${loginRes.user.company_email})`);
    console.log('  -> PASS\n');

    // 2. Fetch Initial Attendance
    console.log('Test 2: Mobile Client getMyAttendance()');
    const initialAttendance = await api.getMyAttendance();
    console.log(`  Today Work Date: ${initialAttendance.today.workDate}`);
    console.log(`  Initial Status: ${initialAttendance.today.status}`);
    console.log('  -> PASS\n');

    // 3. Scan QR Code via Mobile API
    console.log('Test 3: Mobile Client scanAttendance()');
    const activeQr = await qrService.generateNewToken();
    const scanRes = await api.scanAttendance(activeQr.token);
    if (!scanRes.success || scanRes.action !== 'check_in') {
      throw new Error(`Mobile scan failed: ${JSON.stringify(scanRes)}`);
    }
    console.log(`  Scan Result Action: ${scanRes.action}, Formatted: ${scanRes.formattedTime}`);
    console.log('  -> PASS\n');

    // 4. Verify Today Attendance Updated
    console.log('Test 4: Attendance State Reconciliation');
    const updatedAttendance = await api.getMyAttendance();
    if (updatedAttendance.today.status !== 'open') {
      throw new Error(`Expected today status 'open', got ${updatedAttendance.today.status}`);
    }
    console.log(`  Attendance session successfully updated to: ${updatedAttendance.today.status}`);
    console.log('  -> PASS\n');

    // 5. Submit Missed-Punch Correction via Mobile API
    console.log('Test 5: Mobile Client submitCorrection()');
    const correctionRes = await api.submitCorrection({
      punch_type: 'check_out',
      requested_time: new Date().toISOString(),
      reason: 'Submitted from mobile app verification test'
    });
    if (!correctionRes.correction || correctionRes.correction.status !== 'pending') {
      throw new Error(`Correction submission failed: ${JSON.stringify(correctionRes)}`);
    }
    console.log(`  Created Correction ID ${correctionRes.correction.id}: ${correctionRes.correction.reason}`);
    console.log('  -> PASS\n');

    // 6. Fetch My Corrections List via Mobile API
    console.log('Test 6: Mobile Client getMyCorrections()');
    const myCorrections = await api.getMyCorrections();
    const found = myCorrections.corrections.find(c => c.id === correctionRes.correction.id);
    if (!found) {
      throw new Error('Submitted correction not returned in mobile list');
    }
    console.log(`  Found submitted request in mobile queue: Status=${found.status}`);
    console.log('  -> PASS\n');

    console.log('=== ALL PHASE 7 MOBILE API TESTS PASSED ===');
  } finally {
    server.close();
  }
}

runMobileApiIntegrationTest().catch(err => {
  console.error('Mobile test failed:', err);
  process.exit(1);
});

