import http from 'http';
import app from '../src/app';
import { dbRepository } from '../src/db';
import { hashPassword, generateTemporaryPassword } from '../src/utils/auth';

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

async function runAuthTests() {
  console.log('=== Running Phase 3 Auth & Role-Based Access Tests ===\n');

  const server = http.createServer(app);
  const TEST_PORT = 5098;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  try {
    // 1. Admin Login (Valid)
    console.log('Test 1: Admin Login with valid credentials');
    const adminRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'admin@company.com',
      password: 'Admin@12345'
    });
    if (adminRes.status !== 200 || !adminRes.body.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminRes.body)}`);
    }
    const adminToken = adminRes.body.token;
    console.log(`  -> PASS (Admin authenticated, token received, role: ${adminRes.body.user.role})\n`);

    // 2. Employee Login (Valid)
    console.log('Test 2: Employee Login with valid credentials');
    const empRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'employee@company.com',
      password: 'Employee@12345'
    });
    if (empRes.status !== 200 || !empRes.body.token) {
      throw new Error(`Employee login failed: ${JSON.stringify(empRes.body)}`);
    }
    const employeeToken = empRes.body.token;
    console.log(`  -> PASS (Employee authenticated, role: ${empRes.body.user.role})\n`);

    // 3. Login with Invalid Password
    console.log('Test 3: Login rejection on wrong password');
    const invalidPassRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'admin@company.com',
      password: 'WrongPassword999'
    });
    if (invalidPassRes.status !== 401) {
      throw new Error(`Expected 401 on wrong password, got ${invalidPassRes.status}`);
    }
    console.log('  -> PASS (Correctly rejected with 401 Unauthorized)\n');

    // 4. Authenticated /api/me Check
    console.log('Test 4: GET /api/me with valid and missing token');
    const noTokenRes = await makeRequest(TEST_PORT, 'GET', '/api/me');
    if (noTokenRes.status !== 401) {
      throw new Error(`Expected 401 for missing token, got ${noTokenRes.status}`);
    }

    const meRes = await makeRequest(TEST_PORT, 'GET', '/api/me', undefined, employeeToken);
    if (meRes.status !== 200 || meRes.body.user.company_email !== 'employee@company.com') {
      throw new Error(`Failed to retrieve profile: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`  -> PASS (/api/me returned: ${meRes.body.user.full_name}, ${meRes.body.user.company_email})\n`);

    // 5. Role-Based Access Isolation (RBAC)
    console.log('Test 5: RBAC enforcement on Admin endpoints (/api/admin/ping)');
    const adminAccess = await makeRequest(TEST_PORT, 'GET', '/api/admin/ping', undefined, adminToken);
    if (adminAccess.status !== 200) {
      throw new Error(`Admin was denied access to admin endpoint: ${adminAccess.status}`);
    }
    console.log('  Admin access to /api/admin/ping: 200 OK (Allowed)');

    const employeeAccess = await makeRequest(TEST_PORT, 'GET', '/api/admin/ping', undefined, employeeToken);
    if (employeeAccess.status !== 403) {
      throw new Error(`Employee was not forbidden from admin endpoint! Got: ${employeeAccess.status}`);
    }
    console.log('  Employee access to /api/admin/ping: 403 Forbidden (Blocked)');
    console.log('  -> PASS (Role isolation strictly enforced)\n');

    // 6. Temporary Password & First-Login Password Change Flow
    console.log('Test 6: Temporary password & forced password change workflow');
    const tempPassword = generateTemporaryPassword(10);
    const tempHash = await hashPassword(tempPassword);
    const newEmp = await dbRepository.createUser({
      company_email: 'onboarded.staff@company.com',
      full_name: 'Onboarded Staff',
      employee_code: 'EMP050',
      role: 'Employee',
      status: 'pending_password_change',
      password_hash: tempHash
    });

    // Login with temp password
    const tempLogin = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'onboarded.staff@company.com',
      password: tempPassword
    });
    if (tempLogin.status !== 200 || !tempLogin.body.user.mustChangePassword) {
      throw new Error(`Expected mustChangePassword=true, got: ${JSON.stringify(tempLogin.body)}`);
    }
    console.log('  Login with temporary password detected: mustChangePassword = true');

    const tempToken = tempLogin.body.token;

    // Attempt change with too short password
    const shortPassRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/change-password', {
      newPassword: 'short'
    }, tempToken);
    if (shortPassRes.status !== 400) {
      throw new Error('Expected 400 for password length < 8');
    }
    console.log('  Short password rejected: 400 Bad Request');

    // Change to valid permanent password
    const newPermPassword = 'PermPassword!2026';
    const changeRes = await makeRequest(TEST_PORT, 'POST', '/api/auth/change-password', {
      newPassword: newPermPassword
    }, tempToken);
    if (changeRes.status !== 200 || changeRes.body.mustChangePassword !== false) {
      throw new Error(`Failed to change password: ${JSON.stringify(changeRes.body)}`);
    }
    console.log('  Permanent password set: 200 OK');

    // Old temporary password should now fail
    const oldLogin = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'onboarded.staff@company.com',
      password: tempPassword
    });
    if (oldLogin.status !== 401) {
      throw new Error('Old temporary password should be rejected after change');
    }
    console.log('  Old temporary password rejected: 401 Unauthorized');

    // New permanent password succeeds
    const newLogin = await makeRequest(TEST_PORT, 'POST', '/api/auth/login', {
      company_email: 'onboarded.staff@company.com',
      password: newPermPassword
    });
    if (newLogin.status !== 200 || newLogin.body.user.mustChangePassword !== false) {
      throw new Error('New permanent password failed to authenticate');
    }
    console.log('  New permanent password authenticated: 200 OK');
    console.log('  -> PASS (Password change flow complete)\n');

    console.log('=== ALL PHASE 3 AUTH & ROLE MIDDLEWARE TESTS PASSED ===');
  } finally {
    server.close();
  }
}

runAuthTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
