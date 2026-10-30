import http from 'http';
import app from '../src/app';
import { generateToken } from '../src/utils/auth';
import { mockStore } from '../src/db/mockStore';

function makeRequest(
  port: number,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any; rawText?: string }> {
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
          resolve({ status: res.statusCode || 500, body: parsed, rawText: rawData });
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

async function runAdminTests() {
  console.log('=== Running Phase 8 Admin Endpoint Tests ===\n');

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  console.log(`  [Server] Listening on port ${port} (mock store mode)\n`);

  // Tokens
  const adminToken = generateToken({ userId: 1, email: 'admin@company.com', role: 'Admin', status: 'active' });
  const empToken   = generateToken({ userId: 2, email: 'employee@company.com', role: 'Employee', status: 'active' });

  // -----------------------------------------------------------------------
  console.log('--- Test Group 1: GET /api/admin/employees ---');
  // -----------------------------------------------------------------------

  let res = await makeRequest(port, 'GET', '/api/admin/employees', undefined, adminToken);
  assert(res.status === 200, 'Admin can list employees', `status=${res.status}`);
  assert(Array.isArray(res.body.employees), 'Response has employees array');
  assert(res.body.employees.length >= 2, 'At least 2 seeded users returned', `got ${res.body.employees?.length}`);
  // password_hash must NOT be exposed
  assert(!res.body.employees[0]?.password_hash, 'password_hash not exposed in employee list');

  res = await makeRequest(port, 'GET', '/api/admin/employees', undefined, empToken);
  assert(res.status === 403, 'Employee gets 403 on admin employees endpoint', `status=${res.status}`);

  res = await makeRequest(port, 'GET', '/api/admin/employees');
  assert(res.status === 401, 'No token → 401 on admin employees endpoint', `status=${res.status}`);

  // -----------------------------------------------------------------------
  console.log('\n--- Test Group 2: POST /api/admin/employees ---');
  // -----------------------------------------------------------------------

  const newEmpPayload = {
    company_email: 'testphase8@company.com',
    full_name: 'Phase Eight Tester',
    employee_code: 'P8-001',
    role: 'Employee'
  };

  res = await makeRequest(port, 'POST', '/api/admin/employees', newEmpPayload, adminToken);
  assert(res.status === 201, 'Admin can create employee', `status=${res.status}, body=${JSON.stringify(res.body)}`);
  assert(typeof res.body.temporaryPassword === 'string', 'temporaryPassword returned as string');
  assert(res.body.temporaryPassword.length >= 8, 'Temp password length >= 8', `len=${res.body.temporaryPassword?.length}`);
  assert(res.body.employee?.company_email === 'testphase8@company.com', 'Correct email in response');
  assert(res.body.employee?.employee_code === 'P8-001', 'employee_code stored correctly');
  assert(res.body.employee?.status === 'pending_password_change', 'Status is pending_password_change');
  assert(!res.body.employee?.password_hash, 'password_hash not exposed in create response');

  // Duplicate email
  res = await makeRequest(port, 'POST', '/api/admin/employees', newEmpPayload, adminToken);
  assert(res.status === 409, 'Duplicate email returns 409', `status=${res.status}`);

  // Missing email
  res = await makeRequest(port, 'POST', '/api/admin/employees', { full_name: 'No Email' }, adminToken);
  assert(res.status === 400, 'Missing email returns 400', `status=${res.status}`);

  // Missing full_name
  res = await makeRequest(port, 'POST', '/api/admin/employees', { company_email: 'nofullname@company.com' }, adminToken);
  assert(res.status === 400, 'Missing full_name returns 400', `status=${res.status}`);

  // Employee cannot create other employees
  res = await makeRequest(port, 'POST', '/api/admin/employees', newEmpPayload, empToken);
  assert(res.status === 403, 'Employee cannot create employees (403)', `status=${res.status}`);

  // Default role should be Employee when not specified
  res = await makeRequest(port, 'POST', '/api/admin/employees',
    { company_email: 'defaultrole@company.com', full_name: 'Default Role User' }, adminToken);
  assert(res.status === 201, 'Create without role defaults fine', `status=${res.status}`);
  assert(res.body.employee?.role === 'Employee', 'Defaults to Employee role when role omitted');

  // Create Admin role user
  res = await makeRequest(port, 'POST', '/api/admin/employees',
    { company_email: 'adminrole@company.com', full_name: 'Admin Role User', role: 'Admin' }, adminToken);
  assert(res.status === 201, 'Admin role user created', `status=${res.status}`);
  assert(res.body.employee?.role === 'Admin', 'Role is Admin');

  // -----------------------------------------------------------------------
  console.log('\n--- Test Group 3: GET /api/admin/attendance ---');
  // -----------------------------------------------------------------------

  res = await makeRequest(port, 'GET', '/api/admin/attendance', undefined, adminToken);
  assert(res.status === 200, 'Admin can get attendance records', `status=${res.status}`);
  assert(Array.isArray(res.body.sessions), 'Response has sessions array');

  // With date filter
  const today = new Date().toISOString().split('T')[0];
  res = await makeRequest(port, 'GET', `/api/admin/attendance?from=${today}&to=${today}`, undefined, adminToken);
  assert(res.status === 200, 'Date-filtered attendance returns 200', `status=${res.status}`);

  // Employee blocked
  res = await makeRequest(port, 'GET', '/api/admin/attendance', undefined, empToken);
  assert(res.status === 403, 'Employee blocked from admin attendance', `status=${res.status}`);

  // -----------------------------------------------------------------------
  console.log('\n--- Test Group 4: GET /api/admin/reports/export ---');
  // -----------------------------------------------------------------------

  const exportRes = await new Promise<{ status: number; body: string; contentType: string }>((resolve, reject) => {
    const reqOut = http.request(
      {
        hostname: 'localhost',
        port,
        path: '/api/admin/reports/export',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      },
      (r) => {
        let raw = '';
        r.on('data', c => raw += c);
        r.on('end', () => resolve({
          status: r.statusCode || 500,
          body: raw,
          contentType: r.headers['content-type'] || ''
        }));
      }
    );
    reqOut.on('error', reject);
    reqOut.end();
  });

  assert(exportRes.status === 200, 'CSV export returns 200', `status=${exportRes.status}`);
  assert(exportRes.contentType.includes('text/csv'), 'Content-Type is text/csv', `got: ${exportRes.contentType}`);
  assert(exportRes.body.includes('Employee Name'), 'CSV contains header row');
  assert(exportRes.body.includes('Employee Code'), 'CSV header has Employee Code column');
  assert(exportRes.body.includes('Check-In'), 'CSV header has Check-In column');

  // Employee blocked from CSV export
  res = await makeRequest(port, 'GET', '/api/admin/reports/export', undefined, empToken);
  assert(res.status === 403, 'Employee blocked from CSV export', `status=${res.status}`);

  // -----------------------------------------------------------------------
  console.log('\n--- Test Group 5: Admin role ping ---');
  // -----------------------------------------------------------------------

  res = await makeRequest(port, 'GET', '/api/admin/ping', undefined, adminToken);
  assert(res.status === 200, 'Admin ping succeeds', `status=${res.status}`);
  assert(res.body.user === 'admin@company.com', 'Correct admin email in ping');

  res = await makeRequest(port, 'GET', '/api/admin/ping', undefined, empToken);
  assert(res.status === 403, 'Employee ping gets 403', `status=${res.status}`);

  // -----------------------------------------------------------------------
  server.close();
  console.log(`\n=== Admin Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAdminTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
