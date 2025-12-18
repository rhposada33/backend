# Frigate jsmpeg Stream Integration Testing Guide

## Overview

This guide explains how to test the WebSocket jsmpeg stream proxy integration between the backend and Frigate.

## Architecture

```
Frigate (wss://localhost:8971/live/jsmpeg/webcam)
    ↓
    ├─ Direct Connection (Baseline Test)
    │  └─ Client connects directly to Frigate
    │     (Requires direct network access, Frigate token auth)
    │
    └─ Backend Proxy (Integration Test)
       └─ Client connects to Backend
          └─ Backend proxies to Frigate
             (Requires JWT auth, Tenant scoping, Camera verification)
```

## Prerequisites

1. **Frigate Running**
   - Address: `https://localhost:8971` (WSS)
   - Camera: `webcam` (or configure `CAMERA_KEY` in test script)
   - Frigate Token: Admin token for authentication

2. **Backend Running**
   - Address: `http://localhost:3000`
   - API Version: `/api/v1`
   - Requirements: Express + express-ws configured

3. **Test Environment**
   - `curl` installed (with WebSocket support)
   - `bash` shell
   - Test script: `backend/test-jsmpeg-stream.sh`

## Configuration

### 1. Update Frigate Token

Get your Frigate JWT token from the Frigate GUI:

1. Open `https://localhost:8971/`
2. Open browser DevTools → Application → Cookies
3. Find `frigate_token` cookie
4. Copy the token value
5. Update in `test-jsmpeg-stream.sh`:

```bash
FRIGATE_TOKEN="your-token-here"
```

### 2. Update Backend Token (for proxy test)

Generate a test JWT token:

```bash
# You can use any valid JWT token for testing
# For development, use: test-jwt-token-here
# Or generate a real token via: POST /api/v1/auth/register or /api/v1/auth/login
```

Update in `test-jsmpeg-stream.sh`:

```bash
BACKEND_TOKEN="your-jwt-token-here"
```

### 3. Configure Camera Key

If your camera is not named `webcam`, update:

```bash
CAMERA_KEY="your-camera-name"
```

## Running Tests

### Test 1: Direct Frigate Connection (Baseline)

Tests direct connection to Frigate to verify camera is working:

```bash
# Test for 10 seconds
./test-jsmpeg-stream.sh direct 10

# Test with no timeout
./test-jsmpeg-stream.sh direct
```

**Expected Output:**
- WebSocket connection established
- Binary stream data received
- File written to `/tmp/jsmpeg_stream_*.bin`
- File size > 0 bytes (indicates stream data)

**Troubleshooting:**
- If connection fails: Check Frigate is running at `https://localhost:8971`
- If auth fails: Verify Frigate token is current and has admin role
- If no data: Camera might be offline, check Frigate web UI

### Test 2: Backend Proxy Connection (Integration)

Tests backend's WebSocket proxy:

```bash
# Test for 10 seconds
./test-jsmpeg-stream.sh proxy 10

# Test with no timeout
./test-jsmpeg-stream.sh proxy
```

**Expected Output:**
- Connects to `ws://localhost:3000/api/v1/cameras/streams/webcam?token=...`
- Backend validates tenant + camera ownership
- Backend connects to Frigate
- Binary stream data received
- File written to `/tmp/jsmpeg_stream_*.bin`
- File size > 0 bytes (indicates stream data)

**Troubleshooting:**
- **401 Unauthorized**: Backend not recognizing JWT token
  - Ensure token is valid
  - Ensure camera is created for your tenant in database
  
- **403 Forbidden**: Camera doesn't belong to tenant
  - Verify camera exists in your tenant
  - Check `tenantId` in database matches JWT token
  
- **Connection refused**: Backend not running
  - Start backend: `npm run dev`
  - Ensure port 3000 is available
  
- **WebSocket connection fails**: Check server.ts
  - Verify express-ws is initialized
  - Check WebSocket routes are registered
  - Look for errors in backend console

## Understanding the Test Output

### File: `/tmp/jsmpeg_stream_*.bin`

- Binary data from jsmpeg stream
- Contains video frames encoded in jsmpeg format
- Can be analyzed with specialized tools
- Presence and size indicates successful stream transmission

### Console Output

Each test shows:
- ✅ **SUCCESS**: Stream test completed, data received
- ❌ **ERROR**: Connection failed or no data received
- ℹ️  **INFO**: Status and configuration details
- ⚠️  **WARNING**: Non-critical issues

## Advanced Testing

### Monitor Network Connections

In another terminal, watch WebSocket connections:

```bash
# macOS
lsof -i :3000 | grep LISTEN

# Linux
ss -tlnp | grep 3000
```

### View Backend Logs

Watch backend logs during test:

```bash
npm run dev 2>&1 | grep -i websocket
```

### Test Multiple Cameras

Modify `CAMERA_KEY` and run test:

```bash
CAMERA_KEY="garage" ./test-jsmpeg-stream.sh proxy 10
```

### Performance Testing

Run stress test with multiple streams:

```bash
# Terminal 1
./test-jsmpeg-stream.sh direct 30 &

# Terminal 2
./test-jsmpeg-stream.sh direct 30 &

# Terminal 3
./test-jsmpeg-stream.sh proxy 30 &

# Check how many bytes transferred
ls -lh /tmp/jsmpeg_stream_*.bin
```

## Implementation Details

### WebSocket Headers

The test includes these WebSocket upgrade headers:

```
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: 4glRQtG92lul9ufXPGjWWQ==
Sec-WebSocket-Version: 13
Origin: https://localhost:8971
```

### Authentication Methods

**Direct Frigate:**
- Cookie: `frigate_token=<jwt>`

**Backend Proxy:**
- Header: `Authorization: Bearer <jwt>`
- Query Parameter: `token=<frigate_token>` (passed to Frigate)

### Backend Proxy Flow

```
1. Client connects to: ws://backend:3000/api/v1/cameras/streams/webcam?token=...
2. Backend extracts:
   - cameraKey = "webcam"
   - tenantId from JWT in Authorization header
   - frigateToken from query parameter
3. Backend verifies:
   - JWT token is valid
   - User is authenticated
   - Camera "webcam" exists in database
   - Camera belongs to user's tenant
4. Backend connects to Frigate:
   - ws://frigate:8971/live/jsmpeg/webcam
   - Cookie: frigate_token=...
5. Backend forwards frames:
   - Frigate → Backend → Client

```

## Next Steps

1. ✅ Test direct Frigate connection to establish baseline
2. ✅ Test backend proxy with valid JWT and camera
3. ✅ Debug any failures using error messages
4. ✅ Create frontend test (HTML/JS) to consume stream
5. ✅ Implement jsmpeg player in React component

## Frontend Integration

See `test-jsmpeg-stream.html` for example frontend consumer that:
- Establishes WebSocket connection to backend
- Decodes jsmpeg stream frames
- Displays video in `<canvas>` element
- Handles connection errors and reconnection

## References

- [Frigate Documentation](https://docs.frigate.video/)
- [jsmpeg - JavaScript MPEG-1 Video Decoder](https://github.com/jnordberg/mpeg1.js)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [Express-WS Documentation](https://github.com/eropple/express-ws)
