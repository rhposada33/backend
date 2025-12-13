# Frigate Stream Proxy Implementation

## Overview

Implemented a stream proxy endpoint that allows authenticated users to access Frigate livestreams through the backend without exposing Frigate URLs directly to the frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Browser)                                          │
│ GET /api/v1/streams/garage_cam?format=hls                 │
│ Header: Authorization: Bearer {JWT}                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (Authenticated)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Express.js)                                        │
│ Router: GET /streams/:cameraKey                           │
│ - Middleware: authMiddleware (verify JWT)                  │
│ - Extract: tenantId from token                             │
│ - Verify: Camera ownership (tenant scoping)                │
│ - Build: Frigate URL with format parameter                │
│ - Request: HTTP GET to Frigate                             │
│ - Pipe: Response directly to client                        │
│ - Preserve: Content-Type headers                           │
│ - Handle: Errors gracefully (503, 504, etc)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ (Internal only, never exposed to browser)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Frigate (Docker Internal)                                   │
│ http://frigate:5000/api/camera/garage_cam/hls             │
│ Returns: HLS stream or error                                │
└─────────────────────────────────────────────────────────────┘
```

## Endpoints

### GET /api/v1/streams/:cameraKey

Proxy a livestream from Frigate to the authenticated user.

#### Request

```http
GET /api/v1/streams/garage_cam?format=hls HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Host: localhost:3000
```

#### Query Parameters

| Parameter | Type | Default | Values |
|-----------|------|---------|--------|
| `format` | string | `hls` | `hls`, `mjpeg`, `webrtc`, `snapshot` |

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cameraKey` | string | Yes | Frigate camera name (must match database camera.key) |

#### Response (200 OK)

Response content and type varies by format:

**HLS** (default)
```
Content-Type: application/vnd.apple.mpegurl

#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
segment0000.ts
...
```

**MJPEG**
```
Content-Type: multipart/x-mixed-replace; boundary=--boundary

--boundary
Content-Type: image/jpeg
Content-Length: 12345

[JPEG binary data]
--boundary
...
```

**Snapshot**
```
Content-Type: image/jpeg

[JPEG binary data]
```

**WebRTC**
```
Content-Type: application/json

{
  "iceServers": [...],
  "sessionDescription": {...}
}
```

#### Error Responses

| Code | Scenario | Response |
|------|----------|----------|
| `400` | Invalid camera key or format | `{"error": "Bad Request", "message": "..."}` |
| `401` | Missing or invalid JWT token | `{"error": "Unauthorized", "message": "..."}` |
| `403` | Camera doesn't belong to tenant | `{"error": "Forbidden", "message": "..."}` |
| `503` | Frigate unavailable | `{"error": "Service Unavailable", "message": "..."}` |
| `504` | Frigate request timeout | `{"error": "Gateway Timeout", "message": "..."}` |
| `500` | Server error | `{"error": "Internal Server Error", "message": "..."}` |

## Implementation Details

### Files Created/Modified

1. **`src/modules/camera/proxy.ts`** (NEW)
   - `verifyCameraOwnership()` - Check camera belongs to tenant
   - `proxyFrigateStream()` - Proxy stream with proper headers
   - `checkCameraStatus()` - Check if camera is online

2. **`src/modules/camera/controller.ts`** (MODIFIED)
   - Added `proxyStream()` handler function
   - Validates authentication and parameters
   - Calls proxy service

3. **`src/modules/streams/router.ts`** (NEW)
   - GET /:cameraKey route
   - Swagger documentation
   - Protected with authMiddleware

4. **`src/modules/streams/index.ts`** (NEW)
   - Module exports

5. **`src/api/routes.ts`** (MODIFIED)
   - Import streamsRouter
   - Mount at /streams

### Security Features

#### 1. Tenant Isolation

```typescript
// Database query verifies ownership
const camera = await prisma.camera.findUnique({
  where: {
    tenantId_key: {      // ← Compound unique constraint
      tenantId,          // ← User's tenant from JWT
      key: cameraKey,    // ← Camera key from URL
    },
  },
});

if (!camera) {
  return 403 Forbidden   // ← Camera not owned by this tenant
}
```

**Security**: User A cannot access User B's cameras (different tenantId)

#### 2. Authentication

```typescript
// Route requires JWT token
streamsRouter.get('/:cameraKey', authMiddleware, proxyStream);
//                               ↑ Enforced for all requests
```

**Security**: Anonymous users cannot access streams

#### 3. URL Hiding

```typescript
// Frontend NEVER sees Frigate URL
// Frigate URL stays internal to backend
const frigateUrl = `http://frigate:5000/api/camera/garage_cam/hls`;
// ↑ Only backend knows this

// Frontend only knows backend endpoint
const streamUrl = `/api/v1/streams/garage_cam?format=hls`;
// ↑ Frontend uses this, which proxies to Frigate
```

**Security**: Browser never knows Frigate exists

#### 4. Safe URL Encoding

```typescript
// Camera key is URL-encoded to prevent injection
const frigateUrl = `.../${encodeURIComponent(cameraKey)}/...`;
//                                           ↑
// Example: "my cam" → "my%20cam"
```

**Security**: Prevents URL injection attacks

#### 5. Error Handling

```typescript
// Check if headers already sent before responding
if (!res.headersSent) {
  res.status(503).json({...});  // ← Send error response
} else {
  res.end();                     // ← Just close stream
}
```

**Security**: Prevents "headers already sent" errors

### Stream Formats

The endpoint supports multiple stream formats:

#### HLS (HTTP Live Streaming)
- **Protocol**: HTTP-based adaptive streaming
- **Latency**: ~10-30 seconds
- **Quality**: Adaptable based on network
- **Compatibility**: Excellent (iOS, modern browsers)
- **Use Case**: Reliable streaming for any network condition

#### MJPEG (Motion JPEG)
- **Protocol**: Multipart/x-mixed-replace
- **Latency**: ~1-2 seconds
- **Quality**: Fixed
- **Compatibility**: Good (fallback for older browsers)
- **Use Case**: Reliable fallback when WebRTC not available

#### WebRTC (Web Real-Time Communication)
- **Protocol**: Peer-to-peer with signaling
- **Latency**: Low (100-500ms)
- **Quality**: High
- **Compatibility**: Good (modern browsers)
- **Use Case**: Real-time monitoring with low latency

#### Snapshot (JPEG)
- **Protocol**: Single frame
- **Latency**: Instant
- **Quality**: Single moment
- **Compatibility**: Universal
- **Use Case**: Thumbnail, preview, or polling-based updates

### Configuration

Frigate URL is configured in `.env`:

```bash
FRIGATE_BASE_URL=http://frigate:5000
```

The proxy automatically:
- Detects HTTP vs HTTPS
- Uses correct protocol for requests
- Works in both Docker (internal) and remote deployments

## Testing

### Test 1: Without Authentication

```bash
curl http://localhost:3000/api/v1/streams/garage_cam?format=hls
# Response: 401 Unauthorized ✓
```

### Test 2: With Invalid Camera Key

```bash
JWT_TOKEN="your-token-here"

curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:3000/api/v1/streams/nonexistent_cam?format=hls
# Response: 403 Forbidden (camera doesn't belong to tenant) ✓
```

### Test 3: With Valid Camera and Token

```bash
JWT_TOKEN="your-token-here"

curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:3000/api/v1/streams/garage_cam?format=hls

# Response: 200 OK with HLS stream ✓
# Or: 503 Service Unavailable (if Frigate down)
```

### Test 4: Tenant Isolation

```bash
# Create two tenants with different cameras
# Get tokens for each user

# User 1 (Tenant A) - should see camera 1
curl -H "Authorization: Bearer $TOKEN_USER1" \
     http://localhost:3000/api/v1/streams/camera_1?format=hls
# Response: 200 OK (or 503 if Frigate down)

# User 1 tries to access Tenant B's camera
curl -H "Authorization: Bearer $TOKEN_USER1" \
     http://localhost:3000/api/v1/streams/camera_2?format=hls
# Response: 403 Forbidden ✓ (Cannot access other tenant's camera)
```

### Test 5: Different Formats

```bash
JWT_TOKEN="your-token-here"

# HLS (default)
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam"

# MJPEG
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam?format=mjpeg"

# Snapshot
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam?format=snapshot" \
     > snapshot.jpg
```

## Frontend Integration

### JavaScript/React Example

```javascript
// Get livestream URL (from previous /cameras/streams endpoint)
const camerasResponse = await fetch('/api/v1/cameras/streams', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data: cameras } = await camerasResponse.json();

// Display HLS stream using player
const camera = cameras[0];  // { cameraId, cameraName, streamUrl, status }

// Using HLS.js for HLS playback
import HLS from 'hls.js';

const video = document.getElementById('video');
const streamUrl = `/api/v1/streams/${camera.cameraName}?format=hls`;

if (HLS.isSupported()) {
  const hls = new HLS();
  hls.loadSource(streamUrl);
  hls.attachMedia(video);
}

// Or for MJPEG (fallback)
const mjpegUrl = `/api/v1/streams/${camera.cameraName}?format=mjpeg`;
video.src = mjpegUrl;

// Or for WebRTC (low latency)
const webrtcUrl = `/api/v1/streams/${camera.cameraName}?format=webrtc`;
```

### HTML Example

```html
<!-- HLS Stream with video.js -->
<video id="video" class="video-js vjs-default-skin" controls preload="auto">
  <source 
    src="/api/v1/streams/garage_cam?format=hls" 
    type="application/x-mpegURL"
  />
</video>

<!-- MJPEG Stream with img tag -->
<img src="/api/v1/streams/garage_cam?format=snapshot" alt="Camera" />

<!-- MJPEG Stream in video tag -->
<video controls>
  <source src="/api/v1/streams/garage_cam?format=mjpeg" type="multipart/x-mixed-replace" />
</video>
```

## Error Scenarios

### Scenario 1: Frigate Offline

```
User requests: GET /api/v1/streams/garage_cam
Backend tries to connect to http://frigate:5000/api/camera/garage_cam/hls
Connection fails (Frigate container stopped)

Response: 503 Service Unavailable
Message: "Frigate is unavailable or camera is offline"
```

**Cause**: Frigate service not running  
**Solution**: Start Frigate container with `docker-compose up`

### Scenario 2: Camera Offline in Frigate

```
User requests: GET /api/v1/streams/garage_cam
Backend connects to Frigate successfully
Frigate responds: 404 (camera not found) or 503 (camera offline)

Response: 503 Service Unavailable
Message: "Frigate is unavailable or camera is offline"
```

**Cause**: Camera not configured in Frigate or offline  
**Solution**: Configure camera in Frigate, ensure camera is online

### Scenario 3: Invalid Format Parameter

```
User requests: GET /api/v1/streams/garage_cam?format=invalid

Response: 400 Bad Request
Message: "Invalid format. Must be one of: hls, mjpeg, webrtc, snapshot"
```

**Cause**: Query parameter not in allowed list  
**Solution**: Use valid format: hls, mjpeg, webrtc, or snapshot

### Scenario 4: Request Timeout

```
User requests: GET /api/v1/streams/garage_cam
Frigate takes > 30 seconds to respond

Response: 504 Gateway Timeout
Message: "Frigate request timed out"
```

**Cause**: Frigate slow or network issue  
**Solution**: Check Frigate performance, network connectivity

## Performance Considerations

### Stream Piping

```typescript
// Response is piped directly from Frigate to client
frigateResponse.pipe(res);
```

**Benefits**:
- No buffering in memory (efficient)
- Low latency (streams immediately)
- Handles large/continuous data (HLS, MJPEG)

### Timeouts

```typescript
request.setTimeout(30000, () => {
  request.destroy();  // ← Prevents hanging connections
});
```

**Benefits**:
- Prevents server resource exhaustion
- Fast error feedback to client
- Protects against Frigate hangs

### Error Handling

```typescript
// Check if headers sent before responding
if (!res.headersSent) {
  res.status(503).json({...});
} else {
  res.end();
}
```

**Benefits**:
- Prevents "headers already sent" errors
- Graceful degradation
- Clean stream termination

## Camera Key Verification

The `cameraKey` parameter must exactly match a camera in the database:

```typescript
// Database schema
model Camera {
  id       String
  tenantId String
  key      String    // ← This field
  label    String?
  
  @@unique([tenantId, key])
}

// Valid camera.key values
"garage_cam"
"front_entrance"
"backyard"

// URL must use exact key
/api/v1/streams/garage_cam          // ✓ Matches database
/api/v1/streams/Garage_cam          // ✗ Case sensitive
/api/v1/streams/garage%20cam        // ✗ URL-encoded (will be decoded)
```

## Future Enhancements

### Phase 2: Direct Protocol Endpoints
```
GET /api/v1/streams/:cameraKey/hls       → Always HLS
GET /api/v1/streams/:cameraKey/mjpeg     → Always MJPEG
GET /api/v1/streams/:cameraKey/webrtc    → Always WebRTC
```

### Phase 3: Stream Statistics
```
GET /api/v1/streams/:cameraKey/stats
{
  "bitrate": "500 kbps",
  "resolution": "1920x1080",
  "fps": 30,
  "codec": "h264"
}
```

### Phase 4: Recording Access
```
GET /api/v1/streams/:cameraKey/recordings
[
  {
    "id": "rec-123",
    "start": "2025-01-01T12:00:00Z",
    "end": "2025-01-01T13:00:00Z",
    "url": "/api/v1/recordings/rec-123"
  }
]
```

### Phase 5: Rate Limiting
```
// Limit concurrent streams per user
// Limit bandwidth per user
// Implement stream quotas by subscription tier
```

## Summary

The Frigate stream proxy provides:

✅ **Secure Access**: Authentication + tenant isolation  
✅ **URL Hiding**: Frontend never sees Frigate  
✅ **Multiple Formats**: HLS, MJPEG, WebRTC, Snapshot  
✅ **Error Handling**: Graceful degradation  
✅ **Performance**: Stream piping, timeouts  
✅ **Extensible**: Ready for recordings, stats, etc.  

The implementation is **production-ready** for:
- Testing with real JWT tokens
- Frontend video player integration
- Multi-tenant stream access
- Different streaming protocols
