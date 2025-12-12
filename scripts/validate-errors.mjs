#!/usr/bin/env node
// Error Handling Validation Test Script

const BASE_URL = 'http://localhost:3000';
const API_PREFIX = '/api';
const API_VERSION = 'v1';
const BASE_API = `${BASE_URL}${API_PREFIX}/${API_VERSION}`;

let testsPassed = 0;
let testsFailed = 0;

function log(msg) {
  console.log(`\n${msg}`);
}

function pass(msg) {
  testsPassed++;
  console.log(`  ✅ ${msg}`);
}

function fail(msg) {
  testsFailed++;
  console.log(`  ❌ ${msg}`);
}

async function http(path, opts = {}) {
  const url = `${BASE_API}${path}`;
  const res = await fetch(url, opts).catch((err) => {
    throw new Error(`Request failed: ${err.message}`);
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (e) {
    body = text;
  }
  return { status: res.status, body };
}

function validateErrorResponse(response, expectedStatus, expectedCode) {
  const { body, status } = response;

  if (status !== expectedStatus) {
    fail(`Expected status ${expectedStatus}, got ${status}`);
    return false;
  }

  if (!body || typeof body !== 'object') {
    fail('Response is not valid JSON object');
    return false;
  }

  if (body.success !== false) {
    fail('Response success should be false');
    return false;
  }

  if (!body.error) {
    fail('Response missing error object');
    return false;
  }

  const error = body.error;

  if (!error.code) {
    fail('Error missing code');
    return false;
  }

  if (expectedCode && error.code !== expectedCode) {
    fail(`Expected code ${expectedCode}, got ${error.code}`);
    return false;
  }

  if (!error.message) {
    fail('Error missing message');
    return false;
  }

  if (!error.status) {
    fail('Error missing status');
    return false;
  }

  if (!error.timestamp) {
    fail('Error missing timestamp');
    return false;
  }

  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Error Handling Middleware - Validation Tests');
  console.log('='.repeat(60));

  try {
    // Test 1: 404 Not Found
    log('Test 1: 404 Not Found - Non-existent endpoint');
    const notFoundResp = await http('/nonexistent-endpoint', {
      method: 'GET',
    });

    if (validateErrorResponse(notFoundResp, 404, 'NOT_FOUND')) {
      pass('404 error response structure correct');
      pass(`Error message: "${notFoundResp.body.error.message}"`);
    }

    // Test 2: 401 Unauthorized - No token
    log('\nTest 2: 401 Unauthorized - Missing authentication');
    const noAuthResp = await http('/cameras', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (noAuthResp.status === 401 || noAuthResp.status === 404) {
      pass(`Returned ${noAuthResp.status} for missing auth`);
    } else {
      fail(`Expected 401 or 404, got ${noAuthResp.status}`);
    }

    // Test 3: 400 Validation Error - Invalid pagination
    log('\nTest 3: 400 Bad Request - Invalid pagination');

    // First login to get token
    const loginResp = await http('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password123!',
      }),
    });

    if (loginResp.status === 200 && loginResp.body.token) {
      const token = loginResp.body.token;
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Test bad pagination
      const badPaginationResp = await http('/events?page=0&limit=1000', {
        method: 'GET',
        headers: authHeaders,
      });

      if (validateErrorResponse(badPaginationResp, 400, 'VALIDATION_ERROR')) {
        pass('400 error for invalid pagination');
      }

      // Test 4: Conflict - Duplicate entry
      log('\nTest 4: 409 Conflict - Duplicate camera key');

      // Create a camera
      const createCamResp = await http('/cameras', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          key: `test-camera-${Date.now()}`,
          label: 'Test Camera',
        }),
      });

      if (createCamResp.status === 201) {
        const camKey = createCamResp.body.data.key;
        pass('Camera created for conflict test');

        // Try to create same camera again
        const duplicateResp = await http('/cameras', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            key: camKey,
            label: 'Duplicate',
          }),
        });

        if (duplicateResp.status === 409) {
          pass('409 Conflict returned for duplicate camera key');
          if (duplicateResp.body.error.code === 'Conflict') {
            pass(`Correct error code: ${duplicateResp.body.error.code}`);
          }
        } else {
          fail(`Expected 409, got ${duplicateResp.status}`);
        }
      }

      // Test 5: 404 Not Found - Non-existent resource
      log('\nTest 5: 404 Not Found - Non-existent resource');

      const notFoundResourceResp = await http('/cameras/nonexistent-id', {
        method: 'GET',
        headers: authHeaders,
      });

      if (validateErrorResponse(notFoundResourceResp, 404, 'NOT_FOUND')) {
        pass('404 error for non-existent resource');
      }
    } else {
      console.log(
        '⚠️ Could not authenticate for full test suite - skipping some tests'
      );
    }

    // Test 6: Error Response Structure
    log('\nTest 6: Error Response Structure Validation');

    const structureResp = await http('/nonexistent', { method: 'GET' });

    if (structureResp.body.success === false) {
      pass('Error response has success: false');
    } else {
      fail('Error response missing success: false');
    }

    if (structureResp.body.error && typeof structureResp.body.error === 'object') {
      pass('Error response has error object');

      const error = structureResp.body.error;
      const requiredFields = ['code', 'message', 'status', 'timestamp'];
      const missingFields = requiredFields.filter((field) => !error[field]);

      if (missingFields.length === 0) {
        pass(`Error has all required fields: ${requiredFields.join(', ')}`);
      } else {
        fail(`Error missing fields: ${missingFields.join(', ')}`);
      }
    } else {
      fail('Error response missing error object');
    }

    // Summary
    log('\n' + '='.repeat(60));
    log(`Test Summary:`);
    log(`  ✅ Passed: ${testsPassed}`);
    log(`  ❌ Failed: ${testsFailed}`);
    log('='.repeat(60));

    if (testsFailed === 0) {
      log(
        '\n🎉 All error handling tests passed! Middleware working correctly.'
      );
      process.exit(0);
    } else {
      log(`\n⚠️ ${testsFailed} test(s) failed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(10);
  }
}

main();
