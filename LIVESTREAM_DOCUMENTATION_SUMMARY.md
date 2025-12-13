# Camera Livestream Documentation Summary

## Overview

Added comprehensive documentation and TypeScript types for camera livestream access before implementation. This establishes the architectural foundation and design decisions.

## Files Created/Modified

### 1. `/backend/CAMERA_LIVESTREAM_DESIGN.md` (NEW)

A comprehensive design document covering:

- **Core Principles**:
  - Frontend never accesses Frigate directly
  - Backend acts as the livestream gateway
  - Tenant-scoped access control
  - Camera key ↔ Frigate name mapping

- **Architecture Details**:
  - Frontend request flow through backend
  - Backend responsibilities (auth, URL generation, proxying)
  - Tenant validation pattern
  - Stream types and protocols (MJPEG, WebRTC, HLS)

- **CameraStream Type Definition**:
  ```typescript
  interface CameraStream {
    cameraId: string;              // Database camera ID
    cameraName: string;            // Display name for UI
    streamUrl: string;             // Backend-generated stream URL
    status: "live" | "offline" | "recording";
  }
  ```

- **Implementation Checklist**:
  - Pre-implementation verification steps
  - Frigate API review
  - Error handling design
  - Rate limiting strategy
  - WebRTC signaling design
  - CORS configuration
  - Logging and auditing
  - Stream metrics

- **Security Considerations**:
  - Tenant isolation validation
  - Authentication requirements
  - Authorization checks
  - Rate limiting approach
  - Logging and audit trails

- **Future Enhancements**:
  - Stream transcoding
  - Recording clips
  - Multi-camera views
  - Stream analytics
  - Adaptive bitrate
  - DRM/watermarking

### 2. `/backend/src/types.ts` (MODIFIED)

Added the `CameraStream` interface:

```typescript
/**
 * Camera Livestream Type
 *
 * IMPORTANT ARCHITECTURE NOTES:
 * - Frontend never accesses Frigate directly
 * - Backend generates/proxies all livestream URLs
 * - Each livestream is scoped to a tenant and camera
 * - The camera "key" must match the Frigate camera name
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for full documentation
 */
export interface CameraStream {
  cameraId: string;
  cameraName: string;
  streamUrl: string;
  status: 'live' | 'offline' | 'recording';
}
```

### 3. `/backend/src/modules/camera/service.ts` (MODIFIED)

Enhanced with detailed documentation:

- **Updated file header** with livestream architecture notes explaining:
  - Frontend access pattern
  - Camera key ↔ Frigate name mapping
  - Tenant scoping requirements
  - Reference to design document

- **Updated `CreateCameraInput` interface** with clarified field comments:
  - `key` must exactly match Frigate camera name and be unique per tenant
  - `label` is the human-readable display name

- **Added TODO section** for future livestream functions:
  - `getCameraStreamUrl()` - Generate stream URLs for different protocols
  - `getCameraStreamStatus()` - Check if stream is live, offline, or recording
  - `validateCameraKeyWithFrigate()` - Verify key matches Frigate config
  - `proxyCameraStream()` - Proxy streams through backend

### 4. `/backend/src/modules/camera/controller.ts` (MODIFIED)

Enhanced with detailed documentation:

- **Updated file header** with livestream architecture notes:
  - Frontend access requirements
  - Tenant scoping critical requirement
  - Camera key validation importance
  - Reference to design document

- **Added TODO section** for future livestream endpoints:
  - `GET /cameras/:id/stream` - Get livestream URL + status
  - `GET /cameras/:id/stream/webrtc` - WebRTC stream
  - `GET /cameras/:id/stream/mjpeg` - MJPEG fallback
  - `GET /cameras/:id/stream/hls` - HLS stream
  - `GET /cameras/:id/stream/status` - Stream status only
  - Includes tenant scoping, error handling, and design reference

## Key Architectural Decisions Documented

### 1. Frontend Access Pattern
- Frontend **NEVER** accesses Frigate directly (not exposed to internet)
- All livestream requests → Backend API → Backend handles Frigate access
- Backend generates/proxies/forwards all livestream URLs

### 2. Camera Key Mapping
- Camera `key` field = Frigate camera name (exact match required)
- This is the critical bridge between database and Frigate
- Must be unique per tenant
- When creating a camera, key must already exist in Frigate configuration

### 3. Tenant Scoping (CRITICAL SECURITY)
- Every livestream request must validate tenant context
- Pattern: `camera.tenantId === req.user.tenantId`
- Failure to validate = Data leak across tenants
- Must verify before generating any stream URLs

### 4. Stream Protocols
- **MJPEG**: Good compatibility, lower quality, ~1-2s latency
- **WebRTC**: High quality, low latency (100-500ms), modern browsers
- **HLS**: Excellent compatibility, adaptable quality, ~10-30s latency

## Implementation Readiness

The codebase is now ready for livestream implementation with:

✅ Clear architectural documentation  
✅ Type definitions in place  
✅ Tenant scoping requirements documented  
✅ Security considerations outlined  
✅ Function stubs with clear requirements  
✅ Reference materials for implementation team  

## Next Steps for Implementation

1. Review `CAMERA_LIVESTREAM_DESIGN.md` for full architecture
2. Verify Frigate API endpoints for streaming
3. Implement stream URL generation functions
4. Implement stream status checking
5. Add livestream endpoints to router
6. Implement tenant scoping validation
7. Add rate limiting and logging
8. Write integration tests with Frigate
