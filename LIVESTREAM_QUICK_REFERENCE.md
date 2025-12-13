# Camera Livestream Architecture - Quick Reference

## Type Definition

```typescript
interface CameraStream {
  cameraId: string;              // Database ID
  cameraName: string;            // Display name for UI
  streamUrl: string;             // Backend-generated URL
  status: 'live' | 'offline' | 'recording';
}
```

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                   (React/Vue/etc)                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/WebSocket
                      │ (Secure, Authenticated)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Camera Service & Controller                          │  │
│  │ - Validates JWT token                               │  │
│  │ - Checks user's tenantId                            │  │
│  │ - Verifies camera.tenantId === user.tenantId        │  │
│  │ - Generates/proxies livestream URLs                 │  │
│  │ - Handles different protocols (WebRTC, MJPEG, HLS)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/TCP
                      │ (Internal, Trusted)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRIGATE (Internal)                        │
│  - Camera streaming service                                │
│  - NOT exposed to internet                                 │
│  - Not accessible by frontend                              │
│  - Backend acts as gateway                                 │
└─────────────────────────────────────────────────────────────┘
```

## Camera Key ↔ Frigate Name Mapping

```
Database (Backend)          Frigate Config
───────────────────         ──────────────
Camera {
  id: "cam-abc123"    ←→    cameras:
  key: "garage_cam"         garage_cam:
  label: "Front Door"       ffmpeg:
  tenantId: "tenant-1"      ...
}
```

**Critical Rule**: `camera.key` must EXACTLY match the Frigate camera name

## Tenant Scoping (SECURITY CRITICAL)

```
Request Flow:
─────────────

1. User makes request with JWT token
   GET /api/cameras/{cameraId}/stream

2. Backend extracts tenantId from JWT
   req.user.tenantId = "tenant-1"

3. Backend looks up camera from database
   camera = await db.get(cameraId)
   
4. Backend MUST VERIFY (or data leak!)
   if (camera.tenantId !== req.user.tenantId) {
     return 403 Forbidden  ← SECURITY
   }

5. If valid, generate stream URL
   streamUrl = generateStreamUrl(camera.key)

6. Return to frontend
   {
     cameraId: "cam-abc123",
     cameraName: "Front Door",
     streamUrl: "https://...",
     status: "live"
   }
```

## Planned Endpoints (Before Implementation)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/cameras/{id}/stream` | Get livestream URL + status |
| `GET /api/cameras/{id}/stream/webrtc` | Low-latency WebRTC |
| `GET /api/cameras/{id}/stream/mjpeg` | Fallback MJPEG |
| `GET /api/cameras/{id}/stream/hls` | Reliable HLS |
| `GET /api/cameras/{id}/stream/status` | Status only |

All endpoints must:
- ✅ Validate JWT token
- ✅ Extract and check tenantId
- ✅ Verify camera ownership (tenant match)
- ✅ Handle Frigate unavailable gracefully
- ✅ Return appropriate error codes

## Implementation Checklist

Before implementing livestream endpoints:

- [ ] Review Frigate API documentation
- [ ] Identify available streaming endpoints
- [ ] Verify camera names in running Frigate instance
- [ ] Design stream status checking mechanism
- [ ] Implement camera key validation against Frigate
- [ ] Add rate limiting for stream access
- [ ] Implement tenant scoping validation
- [ ] Add comprehensive error handling
- [ ] Design WebRTC signaling (if using WebRTC)
- [ ] Configure CORS headers for streams
- [ ] Add logging and audit trails
- [ ] Implement stream metrics/monitoring
- [ ] Write integration tests
- [ ] Document API responses and errors

## Security Requirements

### 1. Tenant Isolation (MANDATORY)
```typescript
// ALWAYS verify before stream access
const camera = await getCameraById(cameraId);
if (camera.tenantId !== req.user.tenantId) {
  throw new Error('Unauthorized');
}
```

### 2. Authentication
- All requests must have valid JWT token
- Token must contain tenantId
- Implement token expiration for long streams

### 3. Authorization
- User must have camera access permission
- Can implement role-based access (viewer, admin)
- Can restrict cameras by permission level

### 4. Rate Limiting
- Limit concurrent streams per user
- Limit new stream requests per minute
- Prevent brute-force enumeration

### 5. Logging
- Log all stream access attempts
- Include: userId, cameraId, tenantId, timestamp
- Track stream duration and data transferred

## Common Error Scenarios

| Scenario | Response |
|----------|----------|
| User not authenticated | 401 Unauthorized |
| Camera not found | 404 Not Found |
| Camera belongs to different tenant | 403 Forbidden |
| Frigate unavailable | 503 Service Unavailable |
| Camera offline in Frigate | 503 Service Unavailable (or stream status endpoint) |
| User rate limited | 429 Too Many Requests |
| Invalid stream protocol | 400 Bad Request |

## Files Created/Modified

1. **CAMERA_LIVESTREAM_DESIGN.md** (New)
   - Comprehensive architectural documentation
   - 200+ lines of design details

2. **src/types.ts** (Modified)
   - Added CameraStream interface
   - Architecture notes in comments

3. **src/modules/camera/service.ts** (Modified)
   - Enhanced header documentation
   - TODO functions for livestream
   - Comments on key-name mapping

4. **src/modules/camera/controller.ts** (Modified)
   - Enhanced header documentation
   - TODO endpoints for livestream
   - Security requirements noted

## References

For complete details, see:
- `CAMERA_LIVESTREAM_DESIGN.md` - Full architecture documentation
- `src/types.ts` - CameraStream type definition
- `src/modules/camera/service.ts` - Service layer documentation
- `src/modules/camera/controller.ts` - Controller layer documentation
