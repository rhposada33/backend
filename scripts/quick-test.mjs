#!/usr/bin/env node
// Quick error handling test

const BASE = 'http://localhost:3000/api/v1';

async function test() {
  try {
    // Test 404
    console.log('Testing 404...');
    const res = await fetch(`${BASE}/nonexistent`);
    const body = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(body, null, 2));
    console.log(
      `✅ 404 test:`,
      body.success === false && body.error?.code === 'NOT_FOUND' ? 'PASS' : 'FAIL'
    );

    // Test pagination
    console.log('\nTesting pagination validation...');
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
      }),
    });
    const loginBody = await loginRes.json();
    const token = loginBody.token;

    const pagRes = await fetch(`${BASE}/events?page=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pagBody = await pagRes.json();
    console.log(`Status: ${pagRes.status}`);
    console.log(`Response:`, JSON.stringify(pagBody, null, 2));
    console.log(
      `✅ Validation test:`,
      pagBody.success === false && pagBody.error?.code === 'VALIDATION_ERROR' ? 'PASS' : 'FAIL'
    );
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
