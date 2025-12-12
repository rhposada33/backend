#!/usr/bin/env node
// Quick test script for camera endpoints
// Usage:
// TENANT_ID=<tenant id> node scripts/test-cameras.mjs
// Optional env vars: BASE_URL, API_PREFIX, API_VERSION, EMAIL, PASSWORD

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_PREFIX = process.env.API_PREFIX || '/api';
const API_VERSION = process.env.API_VERSION || 'v1';
const BASE_API = `${BASE_URL}${API_PREFIX}/${API_VERSION}`;

const TENANT_ID = process.env.TENANT_ID;
if (!TENANT_ID) {
  console.error('TENANT_ID environment variable is required.');
  console.error('Create a tenant first or pass an existing tenant id via TENANT_ID.');
  process.exit(1);
}

const EMAIL = process.env.EMAIL || `test+${Date.now()}@example.com`;
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
  console.log('Registering user:', EMAIL);

  // 1) Register user (public endpoint). If already exists, proceed.
  const registerResp = await http('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, tenantId: TENANT_ID }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('\n/register ->', registerResp.status);
  console.log(pretty(registerResp.body));

  if (registerResp.status === 404 && registerResp.body && registerResp.body.message && String(registerResp.body.message).includes('Tenant not found')) {
    console.error('Tenant not found. Create a tenant first or provide a valid TENANT_ID.');
    process.exit(2);
  }

  // 2) Login
  const loginResp = await http('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('\n/login ->', loginResp.status);
  console.log(pretty(loginResp.body));

  if (!loginResp.body || !loginResp.body.token) {
    console.error('Failed to obtain token. Aborting.');
    process.exit(3);
  }

  const token = loginResp.body.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3) Create camera
  const camKey = `cam-${Date.now()}`;
  const createResp = await http('/cameras', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: camKey, label: 'Test Camera' }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log('\nPOST /cameras ->', createResp.status);
  console.log(pretty(createResp.body));

  if (createResp.status !== 201) {
    console.error('Create camera failed. Aborting further camera checks.');
    process.exit(4);
  }

  const camera = createResp.body && createResp.body.data ? createResp.body.data : null;
  const cameraId = camera && camera.id ? camera.id : null;
  if (!cameraId) {
    console.error('No camera id returned. Aborting.');
    process.exit(5);
  }

  // 4) List cameras
  const listResp = await http('/cameras', { method: 'GET', headers: authHeaders }).catch((err) => ({ status: 0, body: err.message }));
  console.log('\nGET /cameras ->', listResp.status);
  console.log(pretty(listResp.body));

  // 5) Get camera by id
  const getResp = await http(`/cameras/${cameraId}`, { method: 'GET', headers: authHeaders }).catch((err) => ({ status: 0, body: err.message }));
  console.log(`\nGET /cameras/${cameraId} ->`, getResp.status);
  console.log(pretty(getResp.body));

  // 6) Update camera label
  const updateResp = await http(`/cameras/${cameraId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ label: 'Updated Test Camera' }),
  }).catch((err) => ({ status: 0, body: err.message }));

  console.log(`\nPUT /cameras/${cameraId} ->`, updateResp.status);
  console.log(pretty(updateResp.body));

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(10);
});
