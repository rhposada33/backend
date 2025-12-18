#!/usr/bin/env node

/**
 * Frigate WebSocket jsmpeg Stream Test - Node.js Version (ESM)
 * 
 * This script tests WebSocket connections to Frigate and backend proxy.
 * Uses native Node.js WebSocket support (Node 21+) or ws package.
 * 
 * IMPORTANT SETUP NOTES:
 * 
 * Direct Test Mode (test against Frigate directly):
 *   Works immediately without any setup
 *   Command: node test-jsmpeg-stream-ws.js direct 5
 * 
 * Proxy Test Mode (test through backend):
 *   REQUIRES: Backend server configured with correct FRIGATE_BASE_URL
 *   
 *   For localhost Frigate (https://localhost:8971):
 *     export FRIGATE_BASE_URL="https://localhost:8971"
 *     npm run dev    # Restart backend with new config
 *   
 *   Then run: node test-jsmpeg-stream-ws.js proxy 5 "jwt-token"
 * 
 * Usage:
 *   node test-jsmpeg-stream-ws.js direct [duration] [frigate_token]
 *   node test-jsmpeg-stream-ws.js proxy [duration] [jwt_token] [frigate_token]
 * 
 * Examples:
 *   node test-jsmpeg-stream-ws.js direct 10
 *   node test-jsmpeg-stream-ws.js proxy 10 jwt-token frigate-token
 * 
 * Documentation:
 *   See: /BACKEND_PROXY_TEST_SETUP.md for complete setup guide
 */

import fs from 'fs';
import path from 'path';
import ws from 'ws';
import jwt from 'jsonwebtoken';

// Use the WebSocket constructor from ws package
const WebSocket = ws;

// ============================================================================
// Colors for output
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// ============================================================================
// Helper Functions
// ============================================================================

function log(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[SUCCESS]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    warning: `${colors.yellow}[WARNING]${colors.reset}`,
  }[level] || `${colors.blue}[LOG]${colors.reset}`;

  console.log(`${prefix} ${message}`);
}

function separator() {
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
}

// ============================================================================
// Configuration
// ============================================================================

const testType = process.argv[2] || 'direct';
const testDuration = parseInt(process.argv[3]) || 10;
const arg4 = process.argv[4] || '';
const arg5 = process.argv[5] || '';

// Frigate token (authentication for Frigate WebSocket)
const FRIGATE_TOKEN = process.env.FRIGATE_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc2NjExNzg2NX0.wLd2y_205XVkO2w2AEN7jUm1ECQeV9CwQu-I5f2pIiQ';

// Backend JWT secret (must match backend config)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-with-32-chars';

// Generate a valid JWT token for the backend
const JWT_TOKEN = process.env.JWT_TOKEN || arg4 || jwt.sign(
  {
    userId: 'test-user',
    email: 'test@example.com',
    tenantId: 'test-tenant',
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Frigate token to pass to the proxy (for Frigate authentication)
const PROXY_FRIGATE_TOKEN = arg5 || FRIGATE_TOKEN;

const FRIGATE_HOST = 'localhost';
const FRIGATE_PORT = 8971;
const FRIGATE_URL = `wss://${FRIGATE_HOST}:${FRIGATE_PORT}`;
const CAMERA_KEY = 'webcam';

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3000;
const BACKEND_URL = `ws://${BACKEND_HOST}:${BACKEND_PORT}`;
const API_VERSION = 'v1';

const OUTPUT_FILE = `/tmp/jsmpeg_stream_${Date.now()}.bin`;

// ============================================================================
// Test: Direct Frigate Connection
// ============================================================================

async function testDirectFrigate() {
  separator();
  log('Testing DIRECT Frigate WebSocket connection', 'info');
  separator();

  const url = `${FRIGATE_URL}/live/jsmpeg/${CAMERA_KEY}`;

  log(`WebSocket URL: ${url}`, 'info');
  log(`Camera: ${CAMERA_KEY}`, 'info');
  log(`Output file: ${OUTPUT_FILE}`, 'info');
  log(`Stream duration: ${testDuration} seconds`, 'info');

  separator();
  log('Connecting to Frigate...', 'info');
  separator();

  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url, {
        headers: {
          Origin: FRIGATE_URL,
          'User-Agent': 'jsmpeg-test/1.0',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          Cookie: `frigate_token=${FRIGATE_TOKEN}`,
        },
        rejectUnauthorized: false, // For self-signed certificates
      });

      let bytesReceived = 0;
      let writeStream = fs.createWriteStream(OUTPUT_FILE);

      ws.on('open', () => {
        log('✅ Connected to Frigate!', 'success');
      });

      ws.on('message', (data) => {
        bytesReceived += data.length;
        writeStream.write(data);
        process.stdout.write('.');
      });

      ws.on('error', (error) => {
        // Ignore close frame errors
        if (error.message.includes('1005') || error.message.includes('status code')) {
          // Expected error when closing, ignore
          return;
        }
        log(`Connection error: ${error.message}`, 'error');
        writeStream.end();
        reject(error);
      });

      ws.on('close', () => {
        writeStream.end();
        console.log(''); // New line after dots
        separator();
        log(`Connection closed. Total bytes: ${formatBytes(bytesReceived)}`, 'info');

        if (bytesReceived > 0) {
          log(`✅ Stream successful! Data saved to: ${OUTPUT_FILE}`, 'success');
          resolve(bytesReceived);
        } else {
          log('❌ No data received', 'error');
          reject(new Error('No data received'));
        }
        separator();
      });

      // Set timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          log(`Closing connection after ${testDuration}s...`, 'info');
          ws.close();
        }
      }, testDuration * 1000);

    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Test: Backend Proxy Connection
// ============================================================================

async function testBackendProxy() {
  separator();
  log('Testing BACKEND PROXY WebSocket connection', 'info');
  separator();

  const url = `${BACKEND_URL}/api/${API_VERSION}/cameras/streams/${CAMERA_KEY}?token=${encodeURIComponent(PROXY_FRIGATE_TOKEN)}&jwt=${encodeURIComponent(JWT_TOKEN)}&test=true`;

  log(`WebSocket Proxy URL: ${url}`, 'info');
  log(`Backend: ${BACKEND_HOST}:${BACKEND_PORT}`, 'info');
  log(`Camera: ${CAMERA_KEY}`, 'info');
  log(`Output file: ${OUTPUT_FILE}`, 'info');
  log(`Stream duration: ${testDuration} seconds`, 'info');

  separator();
  log('Connecting to backend proxy...', 'info');
  separator();

  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Origin': BACKEND_URL,
          'User-Agent': 'jsmpeg-test/1.0',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
        rejectUnauthorized: false,
      });

      let bytesReceived = 0;
      let writeStream = fs.createWriteStream(OUTPUT_FILE);

      ws.on('open', () => {
        log('✅ Connected to backend proxy!', 'success');
      });

      ws.on('message', (data) => {
        bytesReceived += data.length;
        writeStream.write(data);
        process.stdout.write('.');
      });

      ws.on('error', (error) => {
        // Ignore close frame errors
        if (error.message.includes('1005') || error.message.includes('status code')) {
          // Expected error when closing, ignore
          return;
        }
        log(`Connection error: ${error.message}`, 'error');
        writeStream.end();
        reject(error);
      });

      ws.on('close', (code, reason) => {
        writeStream.end();
        console.log(''); // New line after dots
        separator();
        log(`Connection closed (${code}). Total bytes: ${formatBytes(bytesReceived)}`, 'info');

        if (bytesReceived > 0) {
          log(`✅ Stream successful! Data saved to: ${OUTPUT_FILE}`, 'success');
          resolve(bytesReceived);
        } else {
          log('❌ No data received', 'error');
          reject(new Error('No data received'));
        }
        separator();
      });

      // Set timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          log(`Closing connection after ${testDuration}s...`, 'info');
          ws.close();
        }
      }, testDuration * 1000);

    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  separator();
  log('Frigate jsmpeg Stream Test Suite (Node.js)', 'info');
  separator();
  log(`Test Type: ${testType}`, 'info');
  log(`Camera: ${CAMERA_KEY}`, 'info');
  log(`Duration: ${testDuration}s`, 'info');
  log(`Timestamp: ${new Date().toISOString()}`, 'info');
  separator();

  try {
    let result;

    if (testType === 'direct') {
      result = await testDirectFrigate();
    } else if (testType === 'proxy') {
      result = await testBackendProxy();
    } else {
      log(`Unknown test type: ${testType}`, 'error');
      log('Usage: direct | proxy', 'info');
      process.exit(1);
    }

    separator();
    log('✅ Test completed successfully!', 'success');
    log(`Received ${formatBytes(result)} of stream data`, 'info');
    separator();
    process.exit(0);

  } catch (error) {
    separator();
    log(`❌ Test failed: ${error.message}`, 'error');
    separator();
    process.exit(1);
  }
}

main();
