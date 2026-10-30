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

async function runQrTests() {
  console.log('=== Running Phase 4 Dynamic QR Token & Replay Protection Tests ===\n');

  const server = http.createServer(app);
  const TEST_PORT = 5097;

  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

  try {
    // 1. Fetch Current Office QR
    console.log('Test 1: GET /api/qr/current (Office Display Endpoint)');
    const qrRes = await makeRequest(TEST_PORT, 'GET', '/api/qr/current');
    if (qrRes.status !== 200) {
      throw new Error(`Failed to fetch QR code: ${JSON.stringify(qrRes.body)}`);
    }
    const { token, expiresAt, expiresInSeconds, qrImageDataUrl, refreshIntervalSeconds } = qrRes.body;

    if (!token || !expiresAt || typeof expiresInSeconds !== 'number') {
      throw new Error('Malformed QR payload structure');
    }
    if (!qrImageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('qrImageDataUrl is not a valid base64 PNG');
    }
    if (refreshIntervalSeconds !== 30) {
      throw new Error(`Expected 30s refresh interval, got ${refreshIntervalSeconds}`);
    }
    console.log(`  Token: ${token.substring(0, 30)}...`);
    console.log(`  Expires in: ${expiresInSeconds}s, Interval: ${refreshIntervalSeconds}s`);
    console.log(`  PNG Data URL Length: ${qrImageDataUrl.length} chars`);
    console.log('  -> PASS (Office QR successfully generated and rendered)\n');

    // 2. Token Consumption
    console.log('Test 2: Validate and Consume QR Token');
    const firstConsumption = await qrService.validateAndConsumeToken(token);
    if (!firstConsumption.valid || !firstConsumption.tokenId) {
      throw new Error(`Failed to validate fresh token: ${firstConsumption.reason}`);
    }
    console.log(`  Token successfully validated & consumed (DB Token ID: ${firstConsumption.tokenId})`);
    console.log('  -> PASS\n');

    // 3. Replay Protection Test
    console.log('Test 3: Replay Attack Protection (Attempting to reuse consumed token)');
    const replayAttempt = await qrService.validateAndConsumeToken(token);
    if (replayAttempt.valid) {
      throw new Error('Security Breach: Token was allowed to be consumed a second time!');
    }
    console.log(`  Replay blocked with reason: "${replayAttempt.reason}"`);
    if (!replayAttempt.reason?.includes('already been scanned')) {
      throw new Error('Unexpected replay rejection reason');
    }
    console.log('  -> PASS (Replay attack successfully prevented)\n');

    // 4. Signature Tamper Protection
    console.log('Test 4: Tampered Token Protection');
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2]}.deadbeefbadbad`;
    const tamperAttempt = await qrService.validateAndConsumeToken(tamperedToken);
    if (tamperAttempt.valid) {
      throw new Error('Security Breach: Tampered signature was accepted!');
    }
    console.log(`  Tampered token blocked with reason: "${tamperAttempt.reason}"`);
    console.log('  -> PASS (HMAC cryptographic integrity verified)\n');

    // 5. Expired Token Protection
    console.log('Test 5: Expired Token Rejection');
    const pastTime = Date.now() - 60000;
    const fakeExpiredToken = `raw.${pastTime}.${pastTime}.fake`;
    const expiredAttempt = await qrService.validateAndConsumeToken(fakeExpiredToken);
    if (expiredAttempt.valid) {
      throw new Error('Security Breach: Expired token was accepted!');
    }
    console.log(`  Expired token blocked with reason: "${expiredAttempt.reason}"`);
    console.log('  -> PASS (Expired tokens rejected)\n');

    // 6. Admin Manual Rotation Endpoint
    console.log('Test 6: POST /api/admin/qr/rotate (Admin Manual Override)');
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

    // Employee denied
    const employeeRotate = await makeRequest(TEST_PORT, 'POST', '/api/admin/qr/rotate', {}, employeeToken);
    if (employeeRotate.status !== 403) {
      throw new Error(`Expected 403 when non-admin rotates QR, got: ${employeeRotate.status}`);
    }
    console.log('  Non-admin blocked: 403 Forbidden');

    // Admin allowed
    const adminRotate = await makeRequest(TEST_PORT, 'POST', '/api/admin/qr/rotate', {}, adminToken);
    if (adminRotate.status !== 200 || !adminRotate.body.token) {
      throw new Error(`Admin rotation failed: ${JSON.stringify(adminRotate.body)}`);
    }
    console.log(`  Admin rotation succeeded: New token generated (${adminRotate.body.token.substring(0, 30)}...)`);
    console.log('  -> PASS (Admin rotation override operational)\n');

    console.log('=== ALL PHASE 4 QR ENGINE & REPLAY PROTECTION TESTS PASSED ===');
  } finally {
    server.close();
  }
}

runQrTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

