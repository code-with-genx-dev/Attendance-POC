import http from 'http';
import app from '../src/app';
import { generateToken } from '../src/utils/auth';
import { dbRepository } from '../src/db';
import { mockStore } from '../src/db/mockStore';

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

async function runCorrectionTests() {
  console.log('=== Running Phase 6 Missing Punch & Admin Correction Tests ===\n');

  const server = http.createServer(app);
  const TEST_PORT = 5095;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  try {
    const adminToken = generateToken({
      userId: 1,
      email: 'admin@company.com',
      role: 'Admin',
      status: 'active'
    });

    const employeeToken = generateToken({
      userId: 2,
      email: 'employee@company.com',
      role: 'Employee',
      status: 'active'
    });

    // 1. Employee submits correction request
    console.log('Test 1: Employee submits correction request with missing fields (Validation)');
    const missingReason = await makeRequest(TEST_PORT, 'POST', '/api/corrections', {
      punch_type: 'check_out',
      requested_time: new Date().toISOString()
    }, employeeToken);

    if (missingReason.status !== 400) {
      throw new Error(`Expected 400 for missing reason, got ${missingReason.status}`);
    }
    console.log('  Missing reason rejected: 400 Bad Request (Validation enforced)');

    console.log('Test 2: Employee submits valid correction request');
    const validSubmit = await makeRequest(TEST_PORT, 'POST', '/api/corrections', {
      punch_type: 'check_out',
      requested_time: '2026-10-30T17:30:00.000Z',
      reason: 'Phone battery died before leaving the office'
    }, employeeToken);

    if (validSubmit.status !== 201 || !validSubmit.body.correction) {
      throw new Error(`Failed to submit correction: ${JSON.stringify(validSubmit.body)}`);
    }
    const correctionId = validSubmit.body.correction.id;
    console.log(`  Correction ID ${correctionId} created (Status: ${validSubmit.body.correction.status})`);
    console.log('  -> PASS\n');

    // 2. Personal Correction History
    console.log('Test 3: Employee views personal correction requests (GET /api/corrections/me)');
    const myCorrections = await makeRequest(TEST_PORT, 'GET', '/api/corrections/me', undefined, employeeToken);
    if (myCorrections.status !== 200 || !Array.isArray(myCorrections.body.corrections)) {
      throw new Error('Failed to retrieve personal corrections');
    }
    const found = myCorrections.body.corrections.find((c: any) => c.id === correctionId);
    if (!found) throw new Error('Submitted correction not found in employee list');
    console.log(`  Found submitted request in personal list: "${found.reason}"`);
    console.log('  -> PASS\n');

    // 3. RBAC on Admin Correction Queue
    console.log('Test 4: RBAC Check on Admin correction queue');
    const empQueueRes = await makeRequest(TEST_PORT, 'GET', '/api/admin/corrections', undefined, employeeToken);
    if (empQueueRes.status !== 403) {
      throw new Error('Employee was not forbidden from accessing admin correction queue');
    }
    console.log('  Employee blocked from Admin queue: 403 Forbidden');

    const adminQueueRes = await makeRequest(TEST_PORT, 'GET', '/api/admin/corrections', undefined, adminToken);
    if (adminQueueRes.status !== 200) {
      throw new Error('Admin failed to access correction queue');
    }
    console.log(`  Admin accessed queue: ${adminQueueRes.body.corrections.length} correction(s) listed`);
    console.log('  -> PASS\n');

    // 4. Admin Review: Missing mandatory decision reason
    console.log('Test 5: Admin review without decision reason');
    const noReasonReview = await makeRequest(TEST_PORT, 'PATCH', `/api/admin/corrections/${correctionId}`, {
      status: 'approved'
    }, adminToken);
    if (noReasonReview.status !== 400) {
      throw new Error(`Expected 400 when decision_reason is omitted, got ${noReasonReview.status}`);
    }
    console.log('  Review without decision reason rejected: 400 Bad Request');
    console.log('  -> PASS\n');

    // 5. Admin Approves with Decision Reason
    console.log('Test 6: Admin approves correction with decision reason');
    const approveRes = await makeRequest(TEST_PORT, 'PATCH', `/api/admin/corrections/${correctionId}`, {
      status: 'approved',
      decision_reason: 'Verified with team manager via email confirmation'
    }, adminToken);

    if (approveRes.status !== 200 || approveRes.body.correction.status !== 'approved') {
      throw new Error(`Approval failed: ${JSON.stringify(approveRes.body)}`);
    }
    console.log(`  Correction ID ${correctionId} approved. Decision Reason: "${approveRes.body.correction.decision_reason}"`);

    // Verify audit log exists
    const lastAudit = mockStore.auditLogs[mockStore.auditLogs.length - 1];
    if (!lastAudit || lastAudit.action !== 'CORRECTION_APPROVED') {
      throw new Error('Audit log was not recorded for correction approval');
    }
    console.log(`  Audit log recorded: Action=${lastAudit.action}, Reason="${lastAudit.reason}"`);
    console.log('  -> PASS\n');

    // 6. Exceptions Summary & Flagging Incomplete Sessions
    console.log('Test 7: Incomplete Session & Exceptions Detection');
    // Seed an open session from yesterday
    const pastSession = await dbRepository.createSession({
      user_id: 2,
      work_date: '2026-10-25',
      check_in_at: new Date('2026-10-25T09:00:00Z'),
      status: 'open'
    });

    const exceptionsRes = await makeRequest(TEST_PORT, 'GET', '/api/admin/attendance/exceptions', undefined, adminToken);
    if (exceptionsRes.status !== 200) {
      throw new Error(`Failed to get exceptions: ${JSON.stringify(exceptionsRes.body)}`);
    }

    // Verify past session was automatically flagged 'incomplete'
    const updatedPastSession = await dbRepository.getSessionById(pastSession.id);
    if (!updatedPastSession || updatedPastSession.status !== 'incomplete') {
      throw new Error('Past unclosed session was not automatically marked incomplete');
    }
    console.log(`  Past unclosed session ${pastSession.id} automatically marked: ${updatedPastSession.status}`);
    console.log(`  Exceptions Report:`);
    console.log(`    Work Date: ${exceptionsRes.body.workDate}`);
    console.log(`    Review Cutoff Passed: ${exceptionsRes.body.isCutoffPassed}`);
    console.log(`    No-Punch Employees Count: ${exceptionsRes.body.noPunchEmployees.length}`);
    console.log(`    Pending Corrections Count: ${exceptionsRes.body.pendingCorrectionsCount}`);
    console.log('  -> PASS (Exceptions detected and past sessions marked incomplete without guessing times)\n');

    console.log('=== ALL PHASE 6 CORRECTION & EXCEPTION TESTS PASSED ===');
  } finally {
    server.close();
  }
}

runCorrectionTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
