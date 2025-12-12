#!/usr/bin/env node
// Comprehensive Events Module Validation
// Tests all requirements and specifications

const BASE_URL = 'http://localhost:3000';
const API_PREFIX = '/api';
const API_VERSION = 'v1';
const BASE_API = `${BASE_URL}${API_PREFIX}/${API_VERSION}`;

const EMAIL = 'test@example.com';
const PASSWORD = 'Password123!';

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
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, body };
}

function validateEventObject(event, isDetail = false) {
  const errors = [];

  // Required fields
  if (!event.id) errors.push('Missing id');
  if (!event.tenantId) errors.push('Missing tenantId');
  if (!event.cameraId) errors.push('Missing cameraId');
  if (!event.frigateId) errors.push('Missing frigateId');
  if (event.type === undefined) errors.push('Missing type');
  if (event.label === undefined) errors.push('Missing label');
  if (event.hasSnapshot === undefined) errors.push('Missing hasSnapshot');
  if (event.hasClip === undefined) errors.push('Missing hasClip');
  if (event.rawPayload === undefined) errors.push('Missing rawPayload');
  if (!event.createdAt) errors.push('Missing createdAt');

  // Camera info
  if (!event.camera) {
    errors.push('Missing camera object');
  } else {
    if (!event.camera.id) errors.push('Camera missing id');
    if (!event.camera.key) errors.push('Camera missing key');
  }

  // Timestamps (optional but should be present if available)
  if (isDetail || event.startTime !== undefined) {
    if (typeof event.startTime !== 'number' && event.startTime !== null) {
      errors.push('startTime should be number or null');
    }
    if (typeof event.endTime !== 'number' && event.endTime !== null) {
      errors.push('endTime should be number or null');
    }
  }

  return errors;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Events Module - Comprehensive Validation Test');
  console.log('='.repeat(60));

  try {
    // Login
    log('Step 1: Authentication');
    const loginResp = await http('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (loginResp.status === 200 && loginResp.body.token) {
      pass('Login successful and token obtained');
    } else {
      fail('Login failed');
      process.exit(1);
    }

    const token = loginResp.body.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // ===== TEST 1: GET /events =====
    log('\nTest 1: GET /events (List all events)');

    const listResp = await http('/events', { method: 'GET', headers: authHeaders });

    if (listResp.status === 200) {
      pass('Returns HTTP 200');
    } else {
      fail(`Expected 200, got ${listResp.status}`);
    }

    if (Array.isArray(listResp.body.data)) {
      pass('Response contains data array');
    } else {
      fail('Response data is not an array');
    }

    if (listResp.body.pagination) {
      pass('Response contains pagination object');
      const { page, limit, total, totalPages } = listResp.body.pagination;
      if (page === 1) pass('Default page is 1');
      if (limit === 50) pass('Default limit is 50');
      if (typeof total === 'number') pass('Pagination has total count');
      if (typeof totalPages === 'number') pass('Pagination has totalPages');
    } else {
      fail('Response missing pagination object');
    }

    // Validate event objects
    if (listResp.body.data.length > 0) {
      const firstEvent = listResp.body.data[0];
      const errors = validateEventObject(firstEvent);
      if (errors.length === 0) {
        pass('All required event fields present in list response');
      } else {
        errors.forEach((e) => fail(`Event validation: ${e}`));
      }
    }

    // ===== TEST 2: GET /events with pagination =====
    log('\nTest 2: GET /events with pagination parameters');

    const paginatedResp = await http('/events?page=1&limit=10', {
      method: 'GET',
      headers: authHeaders,
    });

    if (paginatedResp.status === 200) {
      pass('Pagination parameters accepted');
    } else {
      fail('Pagination parameters rejected');
    }

    if (paginatedResp.body.pagination.limit === 10) {
      pass('Custom limit parameter respected');
    } else {
      fail('Custom limit parameter not respected');
    }

    // ===== TEST 3: GET /events/:id =====
    log('\nTest 3: GET /events/:id (Get event details)');

    if (listResp.body.data.length > 0) {
      const firstEventId = listResp.body.data[0].id;
      const detailResp = await http(`/events/${firstEventId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (detailResp.status === 200) {
        pass('GET /events/:id returns 200');
      } else {
        fail(`GET /events/:id returned ${detailResp.status}`);
      }

      if (detailResp.body.data) {
        pass('Response contains data object');

        const eventDetail = detailResp.body.data;
        const errors = validateEventObject(eventDetail, true);
        if (errors.length === 0) {
          pass('All required fields present in detail response');
        } else {
          errors.forEach((e) => fail(`Detail validation: ${e}`));
        }

        // Check timestamps are included
        if (eventDetail.startTime !== undefined) {
          pass('Event detail includes startTime');
        }
        if (eventDetail.endTime !== undefined) {
          pass('Event detail includes endTime');
        }
        if (eventDetail.rawPayload) {
          pass('Event detail includes rawPayload');
        }
      }
    } else {
      console.log('  ⚠️ No events to test details - skipping /events/:id test');
    }

    // ===== TEST 4: GET /events/byCamera/:cameraId =====
    log('\nTest 4: GET /events/byCamera/:cameraId');

    if (listResp.body.data.length > 0) {
      const firstEvent = listResp.body.data[0];
      const cameraId = firstEvent.cameraId;

      const byCameraResp = await http(`/events/byCamera/${cameraId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (byCameraResp.status === 200) {
        pass(`GET /events/byCamera/:cameraId returns 200`);
      } else {
        fail(`Expected 200, got ${byCameraResp.status}`);
      }

      if (byCameraResp.body.pagination) {
        pass('byCamera response contains pagination');
      }

      // Verify all events belong to the camera
      if (byCameraResp.body.data.every((e) => e.cameraId === cameraId)) {
        pass('All returned events belong to specified camera');
      } else {
        fail('Some returned events do not belong to camera');
      }
    } else {
      console.log('  ⚠️ No events to test byCamera - skipping');
    }

    // ===== TEST 5: Tenant Isolation =====
    log('\nTest 5: Tenant Isolation & Security');

    const allEvents = listResp.body.data;
    if (allEvents.length > 0) {
      const userTenantId = loginResp.body.data.tenantId;
      const eventsMatch = allEvents.every((e) => e.tenantId === userTenantId);

      if (eventsMatch) {
        pass(`All events belong to user's tenant (${userTenantId})`);
      } else {
        fail('Some events belong to different tenants');
      }
    }

    // ===== TEST 6: Error Handling =====
    log('\nTest 6: Error Handling');

    // Invalid pagination
    const badPaginationResp = await http('/events?page=0&limit=1000', {
      method: 'GET',
      headers: authHeaders,
    });

    if (badPaginationResp.status === 400) {
      pass('Returns 400 for invalid pagination (page < 1)');
    } else {
      fail(`Expected 400, got ${badPaginationResp.status}`);
    }

    // Non-existent event
    const notFoundResp = await http('/events/nonexistent-id', {
      method: 'GET',
      headers: authHeaders,
    });

    if (notFoundResp.status === 404) {
      pass('Returns 404 for non-existent event');
    } else {
      fail(`Expected 404, got ${notFoundResp.status}`);
    }

    // Missing auth
    const noAuthResp = await http('/events', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (noAuthResp.status === 401 || noAuthResp.status === 404) {
      pass('Rejects requests without authentication');
    } else {
      fail(`Expected 401/404, got ${noAuthResp.status}`);
    }

    // ===== Summary =====
    log('\n' + '='.repeat(60));
    log(`Test Summary:`);
    log(`  ✅ Passed: ${testsPassed}`);
    log(`  ❌ Failed: ${testsFailed}`);
    log('='.repeat(60));

    if (testsFailed === 0) {
      log('\n🎉 All tests passed! Events module is working correctly.');
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
