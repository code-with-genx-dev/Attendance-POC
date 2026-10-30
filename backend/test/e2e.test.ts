import http from 'http';
import app from '../src/app';
import { dbRepository } from '../src/db';
import { mockStore } from '../src/db/mockStore';
import { qrService } from '../src/services/qr.service';

function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders; rawText: string }> {
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
      { hostname: 'localhost', port, path, method, headers },
      (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = {};
          }
          resolve({
            status: res.statusCode || 500,
            body: parsed,
            headers: res.headers,
            rawText: rawData
          });
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('=== Running Phase 9 Comprehensive End-to-End Lifecycle Test ===');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  console.log(`  [Server] Listening on port ${port} (Testing against unified API)\n`);

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Admin Authentication (AC-01)
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Admin Login with Default Seed Credentials ---');
    let res = await makeRequest(port, 'POST', '/api/auth/login', {
      company_email: 'admin@company.com',
      password: 'Admin@12345'
    });
    assert(res.status === 200, 'Admin successfully logs in', `status=${res.status}`);
    assert(res.body.user.role === 'Admin', 'Admin role returned in payload');
    const adminToken = res.body.token;
    assert(typeof adminToken === 'string' && adminToken.length > 20, 'Admin JWT token received');

    // -------------------------------------------------------------------------
    // STEP 2: Admin Onboards New Employee (AC-02)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Admin Onboards New Employee ---');
    const e2eEmail = `pilot.employee.${Date.now()}@company.com`;
    res = await makeRequest(port, 'POST', '/api/admin/employees', {
      company_email: e2eEmail,
      full_name: 'Pilot Test Employee',
      employee_code: 'PILOT-007',
      role: 'Employee'
    }, adminToken);

    assert(res.status === 201, 'Employee successfully onboarded by Admin', `status=${res.status}`);
    const tempPassword = res.body.temporaryPassword;
    const newEmpId = res.body.employee.id;
    assert(typeof tempPassword === 'string' && tempPassword.length >= 8, 'Temporary password generated');
    assert(res.body.employee.status === 'pending_password_change', 'Employee status is pending_password_change');
    assert(!res.body.employee.password_hash, 'Password hash is strictly omitted from API response');

    // -------------------------------------------------------------------------
    // STEP 3: Employee First Login with Temporary Password (AC-02)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Employee First Login & Forced Password Change ---');
    res = await makeRequest(port, 'POST', '/api/auth/login', {
      company_email: e2eEmail,
      password: tempPassword
    });
    assert(res.status === 200, 'Employee authenticates with temporary password');
    assert(res.body.mustChangePassword === true, 'mustChangePassword flag is true');
    const empTempToken = res.body.token;

    // Reject weak password (< 8 chars)
    res = await makeRequest(port, 'POST', '/api/auth/change-password', {
      current_password: tempPassword,
      new_password: 'short'
    }, empTempToken);
    assert(res.status === 400, 'Weak password (<8 chars) rejected');

    // Set permanent password
    const permanentPassword = 'PermanentSecure@987';
    res = await makeRequest(port, 'POST', '/api/auth/change-password', {
      current_password: tempPassword,
      new_password: permanentPassword
    }, empTempToken);
    assert(res.status === 200, 'Permanent password set successfully');

    // Login with new permanent password
    res = await makeRequest(port, 'POST', '/api/auth/login', {
      company_email: e2eEmail,
      password: permanentPassword
    });
    assert(res.status === 200, 'Employee logs in with permanent password');
    assert(res.body.mustChangePassword === false, 'mustChangePassword flag is now false');
    assert(res.body.user.status === 'active', 'User account is now active');
    const empActiveToken = res.body.token;

    // -------------------------------------------------------------------------
    // STEP 4: QR Display & Generation (AC-03)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Office Display QR Generation & Replay Protection ---');
    res = await makeRequest(port, 'GET', '/api/qr/current');
    assert(res.status === 200, 'Office display fetches current rotating QR token');
    assert(typeof res.body.imageDataUrl === 'string' && res.body.imageDataUrl.startsWith('data:image/png;base64,'), 'QR code rendered as PNG Data URL');
    assert(res.body.ttlSeconds > 0 && res.body.ttlSeconds <= 30, 'QR TTL is within 30-second window');
    const rawQrToken = res.body.token;

    // -------------------------------------------------------------------------
    // STEP 5: Employee Check-In via Mobile QR Scan (AC-04)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Employee Check-In via QR Scan ---');
    const scanPayload = {
      qr_token: rawQrToken,
      idempotency_key: `e2e_checkin_${Date.now()}`
    };

    res = await makeRequest(port, 'POST', '/api/attendance/scan', scanPayload, empActiveToken);
    assert(res.status === 200, 'Attendance scan successful', `status=${res.status}`);
    assert(res.body.action === 'check_in', 'Action recorded as check_in');
    assert(res.body.status === 'open', 'Attendance session is open');
    const sessionId = res.body.sessionId || res.body.session_id;
    assert(typeof sessionId === 'number', 'Valid session_id assigned');
    assert(typeof (res.body.serverTimestamp || res.body.server_timestamp) === 'string', 'Server timestamp recorded (independent of client clock)');

    // Replay attack prevention: Scanning the same QR token again must be rejected
    res = await makeRequest(port, 'POST', '/api/attendance/scan', {
      qr_token: rawQrToken,
      idempotency_key: `replay_attack_${Date.now()}`
    }, empActiveToken);
    assert(res.status === 400, 'Replay of consumed QR token strictly rejected with 400');

    // -------------------------------------------------------------------------
    // STEP 6: Employee Check-Out via Next QR Scan (AC-04)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Employee Check-Out via Fresh QR Scan ---');
    // Rotate to get a fresh QR token
    await makeRequest(port, 'POST', '/api/admin/qr/rotate', {}, adminToken);
    const freshQrRes = await makeRequest(port, 'GET', '/api/qr/current');
    const checkOutQr = freshQrRes.body.token;

    res = await makeRequest(port, 'POST', '/api/attendance/scan', {
      qr_token: checkOutQr,
      idempotency_key: `e2e_checkout_${Date.now()}`
    }, empActiveToken);
    assert(res.status === 200, 'Check-out scan successful');
    assert(res.body.action === 'check_out', 'Action recorded as check_out');
    assert(res.body.status === 'completed', 'Attendance session state updated to completed');

    // -------------------------------------------------------------------------
    // STEP 7: Employee Views Personal History (AC-04)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Employee Views Attendance History ---');
    res = await makeRequest(port, 'GET', '/api/attendance/me', undefined, empActiveToken);
    assert(res.status === 200, 'Personal attendance history fetched');
    assert(res.body.today?.status === 'completed', 'Today session reflected as completed');
    assert(Array.isArray(res.body.history) && res.body.history.length >= 1, 'History contains today session');

    // -------------------------------------------------------------------------
    // STEP 8: Missed-Punch Correction Workflow (AC-05, AC-06, AC-07)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Missed-Punch Correction Submission & Review ---');
    const yesterday = new Date(Date.now() - 86400_000).toISOString().split('T')[0];
    const correctionPayload = {
      punch_type: 'check_out',
      requested_time: `${yesterday}T18:30:00.000Z`,
      reason: 'Office power outage prevented check-out scan'
    };

    res = await makeRequest(port, 'POST', '/api/corrections', correctionPayload, empActiveToken);
    assert(res.status === 201, 'Employee submits correction request');
    const correctionId = res.body.correction.id;
    assert(res.body.correction.status === 'pending', 'Correction status is pending');

    // Employee views pending corrections
    res = await makeRequest(port, 'GET', '/api/corrections/me', undefined, empActiveToken);
    assert(res.status === 200, 'Employee views personal corrections');
    assert(res.body.corrections.some((c: any) => c.id === correctionId), 'Submitted correction appears in personal list');

    // Admin views correction queue
    res = await makeRequest(port, 'GET', '/api/admin/corrections?status=pending', undefined, adminToken);
    assert(res.status === 200, 'Admin retrieves pending corrections queue');
    assert(res.body.corrections.some((c: any) => c.id === correctionId), 'Correction appears in Admin queue');

    // Admin review requires decision_reason (rejection if empty)
    res = await makeRequest(port, 'PATCH', `/api/admin/corrections/${correctionId}`, {
      decision: 'approved'
      // missing decision_reason
    }, adminToken);
    assert(res.status === 400, 'Admin approval without decision_reason rejected with 400');

    // Admin approves with mandatory justification
    res = await makeRequest(port, 'PATCH', `/api/admin/corrections/${correctionId}`, {
      decision: 'approved',
      decision_reason: 'Confirmed via building security log and floor manager confirmation'
    }, adminToken);
    assert(res.status === 200, 'Admin approves correction with mandatory reason');
    assert(res.body.correction.status === 'approved', 'Correction status updated to approved');

    // -------------------------------------------------------------------------
    // STEP 9: Exceptions & Missing-Punch Detection (AC-05)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Missing-Punch & Incomplete Session Detection ---');
    res = await makeRequest(port, 'GET', '/api/admin/attendance/exceptions', undefined, adminToken);
    assert(res.status === 200, 'Admin fetches attendance exceptions');
    assert(typeof res.body.workDate === 'string', 'Report provides current office workDate');
    assert(Array.isArray(res.body.incompleteSessions), 'Incomplete sessions array returned');
    assert(Array.isArray(res.body.noPunchEmployees), 'No-punch employees array returned');

    // -------------------------------------------------------------------------
    // STEP 10: Attendance Table & CSV Export (AC-09)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Admin Attendance Query & CSV Export ---');
    res = await makeRequest(port, 'GET', '/api/admin/attendance', undefined, adminToken);
    assert(res.status === 200, 'Admin queries full attendance table');
    assert(Array.isArray(res.body.sessions), 'Sessions array returned');
    const pilotSession = res.body.sessions.find((s: any) => s.user_id === newEmpId);
    assert(!!pilotSession, 'Onboarded employee attendance session present in admin table');

    // CSV Export
    res = await makeRequest(port, 'GET', '/api/admin/reports/export', undefined, adminToken);
    assert(res.status === 200, 'CSV export returns 200');
    assert(String(res.headers['content-type']).includes('text/csv'), 'Content-Type header is text/csv');
    assert(res.rawText.includes('Employee Name,Employee Code,Company Email,Work Date,Check-In,Check-Out,Status'), 'CSV contains correct standard header');
    assert(res.rawText.includes('Pilot Test Employee'), 'Exported CSV contains pilot employee name');
    assert(res.rawText.includes('PILOT-007'), 'Exported CSV contains pilot employee code');

    // -------------------------------------------------------------------------
    // STEP 11: Audit Trail Verification (AC-08)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Comprehensive Audit Trail Verification ---');
    const logs = mockStore.auditLogs;
    const empCreatedLog = logs.find(l => l.action === 'EMPLOYEE_CREATED' && l.entity_id === newEmpId);
    assert(!!empCreatedLog, 'Audit log recorded EMPLOYEE_CREATED action');

    const correctionApprovedLog = logs.find(l => l.action === 'CORRECTION_APPROVED' && l.entity_id === correctionId);
    assert(!!correctionApprovedLog, 'Audit log recorded CORRECTION_APPROVED action');
    assert(Boolean(correctionApprovedLog?.reason?.includes('Confirmed via building security')), 'Audit log captured admin review reason');

    // -------------------------------------------------------------------------
    // STEP 12: Role Isolation & Security Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Role Isolation & Access Control Boundaries ---');
    // Employee blocked from admin endpoints
    res = await makeRequest(port, 'GET', '/api/admin/employees', undefined, empActiveToken);
    assert(res.status === 403, 'Employee blocked from listing employees (403)');

    res = await makeRequest(port, 'GET', '/api/admin/attendance', undefined, empActiveToken);
    assert(res.status === 403, 'Employee blocked from viewing admin attendance (403)');

    res = await makeRequest(port, 'GET', '/api/admin/reports/export', undefined, empActiveToken);
    assert(res.status === 403, 'Employee blocked from exporting CSV reports (403)');

    res = await makeRequest(port, 'PATCH', `/api/admin/corrections/${correctionId}`, {
      decision: 'approved',
      decision_reason: 'Tampered review'
    }, empActiveToken);
    assert(res.status === 403, 'Employee blocked from reviewing corrections (403)');

    console.log('\n================================================================');
    console.log(`=== Phase 9 E2E Test Results: ${passed} passed, ${failed} failed ===`);
    console.log('================================================================\n');

  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndTests().catch(err => {
  console.error('Fatal crash during Phase 9 E2E test:', err);
  process.exit(1);
});
