# Camera Livestream Design & Architecture

## Overview

This document outlines the architecture and design decisions for camera livestream access in the Sateliteyes Guard backend. This is the foundational design before livestream implementation.

## Core Principles

### 1. Frontend Never Accesses Frigate Directly

**Rationale:**
- Frigate is an internal service not exposed to the internet
- Direct frontend access would require complex CORS and authentication setup
- Centralized access control through the backend ensures security

**Implementation:**
- Frontend makes all livestream requests to the backend API
- Backend handles authentication, authorization, and tenant isolation
- Backend proxies, generates, or forwards livestream URLs based on the streaming protocol

**Example Flow:**
```
Frontend → GET /api/cameras/{cameraId}/stream → Backend
                                                    ↓
                                        Backend authenticates user
                                        Backend checks tenant scope
                                        Backend proxies to Frigate
                                                    ↓
                                        Response → Frontend
```

### 2. Backend as Livestream Gateway

**Responsibilities:**
- **Authentication & Authorization**: Verify user tokens and tenant scope
- **URL Generation**: Create or proxy proper Frigate livestream URLs
- **Stream Proxying**: Optionally proxy streams for additional control
- **Status Monitoring**: Report stream status (live, offline, recording)
- **Rate Limiting**: Prevent abuse of streaming endpoints

**Example Endpoints:**
```
GET /api/cameras/{cameraId}/stream              → Get livestream URL
GET /api/cameras/{cameraId}/stream/mjpeg        → MJPEG stream
GET /api/cameras/{cameraId}/stream/webrtc       → WebRTC stream
GET /api/cameras/{cameraId}/stream/status       → Stream status
```

### 3. Tenant Scoping

**Critical Security Requirement:**
- Each livestream request must validate the tenant context
- A user can ONLY access livestreams for cameras in their tenant
- The backend must check both:
  - User's tenantId from JWT token
  - Camera's tenantId in database

**Validation Pattern:**
```typescript
// When accessing a livestream for camera {cameraId}:
1. Extract tenantId from authenticated user's JWT
2. Look up camera from database
3. Verify camera.tenantId === user.tenantId
4. If mismatch, return 403 Forbidden
5. If valid, proceed with stream access
```

### 4. Camera Key ↔ Frigate Name Mapping

**Important Relationship:**
- The camera `key` field MUST match the Frigate camera name exactly
- This is the bridge between the backend database and Frigate's configuration

**Example:**
```
Database:
  Camera { id: "cam-123", tenantId: "tenant-1", key: "garage_camera" }

Frigate Config:
  cameras:
    garage_camera:
      ffmpeg:
        ...

Livestream Access:
  GET /api/cameras/cam-123/stream
  → Backend looks up camera by ID
  → Retrieves key: "garage_camera"
  → Calls Frigate API: http://frigate:5000/api/camera/garage_camera/recordings
```

**Key Requirements:**
- Camera key must be unique per tenant (enforced in database)
- Camera key must exist as a camera name in Frigate
- When creating a new camera, the key MUST match a camera configured in Frigate
- If Frigate camera name changes, the database key must be updated

## Stream Types & Protocols

The backend should support multiple streaming protocols:

1. **MJPEG** (Motion JPEG)
   - Compatibility: Good (works in older browsers, img tags)
   - Quality: Lower
   - Latency: ~1-2 seconds
   - Use case: Reliable fallback

2. **WebRTC** (Web Real-Time Communication)
   - Compatibility: Good (modern browsers)
   - Quality: High
   - Latency: Low (100-500ms)
   - Use case: Primary real-time viewing

3. **HLS** (HTTP Live Streaming)
   - Compatibility: Excellent
   - Quality: Adaptable
   - Latency: ~10-30 seconds
   - Use case: Reliable streaming for any network

## CameraStream Type Definition

```typescript
interface CameraStream {
  cameraId: string;              // Database camera ID
  cameraName: string;            // Camera label for UI display
  streamUrl: string;             // URL to access the stream
  status: "live" | "offline" | "recording";  // Stream status
}
```

**Field Descriptions:**
- **cameraId**: The unique database identifier for the camera
- **cameraName**: Human-readable camera label (can be customized, used for UI)
- **streamUrl**: The full URL to the livestream (backend-generated based on protocol)
- **status**: Current stream status
  - `"live"`: Stream is active and accessible
  - `"offline"`: Frigate is unavailable or camera is offline
  - `"recording"`: Camera is actively recording

**Example Response:**
```json
{
  "cameraId": "cam-abc123",
  "cameraName": "Front Entrance",
  "streamUrl": "http://localhost:3000/api/cameras/cam-abc123/stream/webrtc",
  "status": "live"
}
```

## Implementation Checklist

Before implementing livestream endpoints:

- [ ] Verify Frigate API documentation for available streaming endpoints
- [ ] Confirm Frigate camera names in running instance
- [ ] Design error handling (camera offline, Frigate unavailable, etc.)
- [ ] Implement stream status check endpoint
- [ ] Add rate limiting for stream access
- [ ] Design WebRTC signaling if implementing WebRTC streams
- [ ] Plan CORS headers for stream responses
- [ ] Add logging for stream access (audit trail)
- [ ] Implement stream metrics (bandwidth, concurrent streams)

## Security Considerations

1. **Tenant Isolation**
   - Always validate tenant scope before returning any stream data
   - Never leak camera information across tenant boundaries

2. **Authentication**
   - Require valid JWT token for all stream endpoints
   - Consider token expiration for long-running streams

3. **Authorization**
   - Check user roles/permissions for specific camera streams
   - Implement camera-level access control if needed

4. **Rate Limiting**
   - Limit concurrent streams per user
   - Implement per-user stream request rate limiting
   - Monitor for abuse patterns

5. **Logging & Auditing**
   - Log all stream access attempts
   - Include user ID, camera ID, timestamp
   - Track stream duration and bandwidth

## Future Enhancements

- **Stream Transcoding**: Transcode streams for different bandwidth/device capabilities
- **Recording Clips**: Generate clips from recorded segments
- **Multi-Camera View**: Serve multiple camera feeds in single view
- **Stream Analytics**: Analyze stream performance and usage
- **Adaptive Bitrate**: Adjust stream quality based on network conditions
- **DRM/Watermarking**: Protect proprietary video content
