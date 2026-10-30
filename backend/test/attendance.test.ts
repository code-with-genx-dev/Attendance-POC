import http from 'http';
import app from '../src/app';
import { qrService } from '../src/services/qr.service';
import { generateToken } from '../src/utils/auth';

function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = { raw: rawData };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runAttendanceTests() {
  console.log('=== Running Phase 5 Attendance Punch Core & Session State Machine Tests ===\n');

  const server = http.createServer(app);
  const TEST_PORT = 5096;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  try {
    const employeeToken = generateToken({
      userId: 2,
      email: 'employee@company.com',
      role: 'Employee',
      status: 'active'
    });

    // 1. Unauthenticated Scan Rejected
    console.log('Test 1: Unauthenticated QR Scan Attempt');
    const unauthRes = await makeRequest(TEST_PORT, 'POST', '/api/attendance/scan', {
      token: 'some.qr.token'
    });
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got: ${unauthRes.status}`);
    }
    console.log('  -> PASS (Unauthenticated scan rejected with 401)\n');

    // 2. Check-in with valid QR
    console.log('Test 2: Check-in with Valid Office QR');
    const qr1 = await qrService.generateNewToken();
    const checkInRes = await makeRequest(TEST_PORT, 'POST', '/api/attendance/scan', {
      token: qr1.token,
      idempotency_key: 'punch_checkin_test_001'
    }, employeeToken);

    if (checkInRes.status !== 200 || !checkInRes.body.success) {
      throw new Error(`Check-in failed: ${JSON.stringify(checkInRes.body)}`);
    }
    if (checkInRes.body.action !== 'check_in' || checkInRes.body.status !== 'open') {
      throw new Error(`Expected action 'check_in' and status 'open', got: ${JSON.stringify(checkInRes.body)}`);
    }
    console.log(`  Action: ${checkInRes.body.action}, Session ID: ${checkInRes.body.sessionId}`);
    console.log(`  Server Timestamp: ${checkInRes.body.serverTimestamp}`);
    console.log(`  Office Formatted Time: ${checkInRes.body.formattedTime}`);
    console.log('  -> PASS (Check-in transition successfully created)\n');

    // 3. Idempotency deduplication
    console.log('Test 3: Idempotency Protection on Duplicate Scan Request');
    const duplicateRes = await makeRequest(TEST_PORT, 'POST', '/api/attendance/scan', {
      token: qr1.token,
      idempotency_key: 'punch_checkin_test_001'
    }, employeeToken);

    if (duplicateRes.status !== 200 || duplicateRes.body.status !== 'duplicate_handled') {
      throw new Error(`Expected duplicate_handled, got: ${JSON.stringify(duplicateRes.body)}`);
    }
    console.log('  Duplicate request recognized without creating duplicate punch events');
    console.log('  -> PASS\n');

    // 4. Replay Rejection (Consumed QR without idempotency key)
    console.log('Test 4: Replay Rejection of already consumed QR token');
    const replayScanRes = await makeRequest(TEST_PORT, 'POST', '/api/attendance/scan', {
      token: qr1.token
    }, employeeToken);

    if (replayScanRes.status !== 400 || !replayScanRes.body.message.includes('already been scanned')) {
      throw new Error(`Expected 400 with replay rejection, got: ${JSON.stringify(replayScanRes.body)}`);
    }
    console.log(`  Replay blocked with 400: "${replayScanRes.body.message}"`);
    console.log('  -> PASS\n');

    // 5. Check-out with fresh QR (Completing open session)
    console.log('Test 5: Check-out with Next Rotating QR (Completes Open Session)');
    const qr2 = await qrService.generateNewToken();
    const checkOutRes = await makeRequest(TEST_PORT, 'POST', '/api/attendance/scan', {
      token: qr2.token,
      idempotency_key: 'punch_checkout_test_001'
    }, employeeToken);

    if (checkOutRes.status !== 200 || !checkOutRes.body.success) {
      throw new Error(`Check-out failed: ${JSON.stringify(checkOutRes.body)}`);
    }
    if (checkOutRes.body.action !== 'check_out' || checkOutRes.body.status !== 'completed') {
      throw new Error(`Expected action 'check_out' and status 'completed', got: ${JSON.stringify(checkOutRes.body)}`);
    }
    console.log(`  Action: ${checkOutRes.body.action}, Session ID: ${checkOutRes.body.sessionId}`);
    console.log(`  Completed Server Timestamp: ${checkOutRes.body.serverTimestamp}`);
    console.log(`  Office Formatted Time: ${checkOutRes.body.formattedTime}`);
    console.log('  -> PASS (Check-out transition successfully closed the session)\n');

    // 6. Personal Attendance History (/api/attendance/me)
    console.log('Test 6: GET /api/attendance/me (Personal Attendance History)');
    const historyRes = await makeRequest(TEST_PORT, 'GET', '/api/attendance/me', undefined, employeeToken);
    if (historyRes.status !== 200) {
      throw new Error(`Failed to get attendance history: ${JSON.stringify(historyRes.body)}`);
    }
    const { today, history, officeTimezone } = historyRes.body;
    if (!today.hasSession || today.status !== 'completed' || !today.checkInAt || !today.checkOutAt) {
      throw new Error(`Today session structure mismatch: ${JSON.stringify(today)}`);
    }
    if (!Array.isArray(history) || history.length === 0) {
      throw new Error('History list should contain the completed session');
    }
    console.log(`  Today Status: ${today.status}`);
    console.log(`  Check-in: ${today.checkInAt}`);
    console.log(`  Check-out: ${today.checkOutAt}`);
    console.log(`  Total Sessions in History: ${history.length}`);
    console.log(`  Office Timezone: ${officeTimezone}`);
    console.log('  -> PASS (Personal history returned accurately)\n');

    console.log('=== ALL PHASE 5 ATTENDANCE PUNCH CORE TESTS PASSED ===');
  } finally {
    server.close();
  }
}

runAttendanceTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
