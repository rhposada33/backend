#!/usr/bin/env node
// Quick test script for event endpoints
// Usage:
// TENANT_ID=<tenant id> node scripts/test-events.mjs
// Optional env vars: BASE_URL, API_PREFIX, API_VERSION, EMAIL, PASSWORD

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_PREFIX = process.env.API_PREFIX || '/api';
const API_VERSION = process.env.API_VERSION || 'v1';
const BASE_API = `${BASE_URL}${API_PREFIX}/${API_VERSION}`;

const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) {
  console.error('TENANT_ID environment variable is required.');
  process.exit(1);
}

const EMAIL = process.env.EMAIL || 'test@example.com';
const PASSWORD = process.env.PASSWORD || 'Password123!';

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

async function http(path, opts = {}) {
  const url = `${BASE_API}${path}`;
  const res = await fetch(url, opts).catch((err) => {
    throw new Error(`Request failed: ${err.message} (${url})`);
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, body };
}

async function main() {
  console.log('Base API:', BASE_API);
  console.log('Tenant ID:', TENANT_ID);
  console.log('User:', EMAIL);
  console.log('');

  // 1) Login
  const loginResp = await http('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('/auth/login ->', loginResp.status);

  if (!loginResp.body || !loginResp.body.token) {
    console.error('Failed to obtain token. Aborting.');
    console.log(pretty(loginResp.body));
    process.exit(3);
  }

  const token = loginResp.body.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('✅ Authenticated\n');

  // 2) Create a test camera if needed
  const camKey = `cam-${Date.now()}`;
  const createCamResp = await http('/cameras', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: camKey, label: 'Test Camera for Events' }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('POST /cameras ->', createCamResp.status);
  if (createCamResp.status === 201) {
    console.log('✅ Camera created\n');
  } else {
    console.log('Camera creation failed, will try to list existing cameras\n');
  }

  const cameraId = createCamResp.body?.data?.id;
  console.log('Using camera ID:', cameraId);
  console.log('');

  // 3) List all events for tenant
  const listResp = await http('/events', { 
    method: 'GET', 
    headers: authHeaders 
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('GET /events ->', listResp.status);
  console.log(pretty(listResp.body));
  console.log('');

  // 4) List events for specific camera (if we have a camera ID)
  if (cameraId) {
    const listByCamResp = await http(`/events/byCamera/${cameraId}`, {
      method: 'GET',
      headers: authHeaders,
    }).catch((err) => ({ status: 0, body: err.message }));

    console.log(`GET /events/byCamera/${cameraId} ->`, listByCamResp.status);
    console.log(pretty(listByCamResp.body));
    console.log('');
  }

  // 5) Test pagination
  const paginatedResp = await http('/events?page=1&limit=10', {
    method: 'GET',
    headers: authHeaders,
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('GET /events?page=1&limit=10 ->', paginatedResp.status);
  console.log(pretty(paginatedResp.body));
  console.log('');

  // 6) If we have events, try to get one
  if (listResp.body?.data && listResp.body.data.length > 0) {
    const firstEvent = listResp.body.data[0];
    const getResp = await http(`/events/${firstEvent.id}`, {
      method: 'GET',
      headers: authHeaders,
    }).catch((err) => ({ status: 0, body: err.message }));

    console.log(`GET /events/${firstEvent.id} ->`, getResp.status);
    console.log(pretty(getResp.body));
  } else {
    console.log('No events in database to fetch details for.');
  }

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(10);
});
