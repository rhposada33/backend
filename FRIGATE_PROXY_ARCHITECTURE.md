# Frigate Stream Proxy - Architecture & Diagrams

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                            │
│                                                                  │
│  <video src="/api/v1/streams/garage_cam?format=hls">           │
│  Sends: GET /api/v1/streams/garage_cam                         │
│         Header: Authorization: Bearer eyJhbGc...              │
└──────────────────────────┬───────────────────────────────────────┘
                           │
           HTTPS/HTTP (with JWT in Authorization header)
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Router: GET /streams/:cameraKey                         │  │
│  │ Middleware: authMiddleware ← checks JWT                 │  │
│  │            (401 if invalid)                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Controller: proxyStream()                               │  │
│  │ - Validate camera key                                   │  │
│  │ - Validate format parameter                             │  │
│  │ - Calls: proxyService.proxyFrigateStream()             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Service: proxyFrigateStream()                           │  │
│  │ - verifyCameraOwnership(tenantId, cameraKey)           │  │
│  │   └─ Query: findUnique({tenantId_key})                │  │
│  │      └─ Checks: WHERE tenantId = ? AND key = ?        │  │
│  │      └─ Returns: 403 if not found                      │  │
│  │ - Build Frigate URL:                                    │  │
│  │   http://frigate:5000/api/camera/{key}/{format}       │  │
│  │ - http.get(frigateUrl)                                 │  │
│  │ - Set response headers (Content-Type, Cache-Control)  │  │
│  │ - frigateResponse.pipe(res) ← Stream piping             │  │
│  │ - Handle errors (503, 504)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                           │
        HTTP (internal Docker network, never exposed)
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              FRIGATE (Docker Container Internal)                │
│                                                                  │
│  GET /api/camera/garage_cam/hls                                │
│  GET /api/camera/garage_cam/mjpeg                              │
│  GET /api/camera/garage_cam/webrtc                             │
│  GET /api/camera/garage_cam/snapshot                           │
│                                                                  │
│  Returns:                                                        │
│  - 200: Stream data (HLS, MJPEG, WebRTC, JPEG)                │
│  - 404: Camera not found                                        │
│  - 503: Camera offline                                          │
│  - 5xx: Frigate error                                          │
└──────────────────────────────────────────────────────────────────┘
```

## Request/Response Flow

```
Request Lifecycle:
─────────────────

1. Client sends request
   GET /api/v1/streams/garage_cam?format=hls
   Authorization: Bearer eyJhbGci...

2. Express routes to /streams/:cameraKey
   
3. authMiddleware validates JWT
   ├─ Valid → Continue
   └─ Invalid → Return 401 Unauthorized

4. Controller: proxyStream()
   ├─ Extract cameraKey from URL
   ├─ Extract format from query (?format=hls)
   ├─ Validate format ∈ [hls, mjpeg, webrtc, snapshot]
   └─ Call service.proxyFrigateStream()

5. Service: verifyCameraOwnership()
   ├─ Query DB: findUnique({
   │    where: { tenantId_key: { tenantId, key } }
   │  })
   ├─ Found → Continue
   └─ Not found → Return 403 Forbidden

6. Service: Build Frigate URL
   Base:     http://frigate:5000
   Path:     /api/camera
   Key:      garage_cam (URL-encoded)
   Format:   hls|mjpeg|webrtc|snapshot
   Result:   http://frigate:5000/api/camera/garage_cam/hls

7. Service: http.get(frigateUrl)
   ├─ Frigate responds (200/404/503/etc)
   ├─ Set headers: Content-Type, Cache-Control
   ├─ Pipe: frigateResponse.pipe(res)
   ├─ Stream: Data flows directly
   └─ Timeout: 30 seconds max

8. Client receives stream
   ├─ Content-Type: application/vnd.apple.mpegurl (HLS)
   ├─ Content-Type: multipart/x-mixed-replace (MJPEG)
   ├─ Content-Type: image/jpeg (Snapshot)
   └─ Content-Type: application/json (WebRTC)

9. Browser video player
   ├─ HLS: Parse .m3u8, download segments
   ├─ MJPEG: Display continuous JPEG stream
   ├─ Snapshot: Display single image
   └─ WebRTC: Establish connection
```

## Tenant Isolation

```
Database Schema:
────────────────

cameras table:
┌─────────┬──────────┬──────────┬────────┐
│ id      │ tenantId │ key      │ label  │
├─────────┼──────────┼──────────┼────────┤
│ cam-1   │ tenant-a │ garage   │ Garage │
│ cam-2   │ tenant-a │ backyard │ Yard   │
│ cam-3   │ tenant-b │ entrance │ Door   │
└─────────┴──────────┴──────────┴────────┘

Compound unique index: (tenantId, key)


Scenario 1: User from Tenant A accesses garage_cam
────────────────────────────────────────────────────

JWT Token: { userId, tenantId: "tenant-a" }

Request: GET /api/v1/streams/garage?format=hls

Service Query:
  SELECT * FROM cameras WHERE tenantId = "tenant-a" AND key = "garage"
  
Result: cam-1 found (belongs to tenant-a) ✓
Action: Proxy stream

Response: 200 OK with HLS stream


Scenario 2: User from Tenant A tries to access Tenant B's camera
──────────────────────────────────────────────────────────────────

JWT Token: { userId, tenantId: "tenant-a" }

Request: GET /api/v1/streams/entrance?format=hls

Service Query:
  SELECT * FROM cameras WHERE tenantId = "tenant-a" AND key = "entrance"
  
Result: No camera found (entrance belongs to tenant-b) ✗
Action: Deny access

Response: 403 Forbidden
Message: "Camera not found or does not belong to your tenant"
```

## Error Handling Decision Tree

```
Request arrives
      │
      ▼
Is JWT present and valid?
      ├─ NO → 401 Unauthorized
      └─ YES
            │
            ▼
         Is cameraKey valid (not empty)?
            ├─ NO → 400 Bad Request
            └─ YES
                  │
                  ▼
            Is format in [hls, mjpeg, webrtc, snapshot]?
                  ├─ NO → 400 Bad Request
                  └─ YES
                        │
                        ▼
               Does camera exist AND belong to tenant?
                  ├─ NO → 403 Forbidden
                  └─ YES
                        │
                        ▼
              Connect to Frigate HTTP
                  ├─ Connection failed → 503 Service Unavailable
                  ├─ Timeout (>30s) → 504 Gateway Timeout
                  ├─ Frigate error (4xx/5xx) → Pass through to client
                  └─ SUCCESS
                        │
                        ▼
                   Set headers
                   Pipe stream
                        │
                        ▼
                   200 OK
                   (HLS, MJPEG, WebRTC, or JPEG data)
```

## Stream Format Processing

```
Format: HLS (HTTP Live Streaming)
─────────────────────────────────

Request: GET /streams/garage_cam?format=hls

Frigate Response:
  Content-Type: application/vnd.apple.mpegurl
  
  #EXTM3U
  #EXT-X-VERSION:3
  #EXT-X-TARGETDURATION:10
  segment-1.ts
  segment-2.ts
  ...

Backend: Preserves Content-Type, pipes response
Browser: Video.js or HLS.js downloads segments and plays


Format: MJPEG (Motion JPEG)
──────────────────────────────

Request: GET /streams/garage_cam?format=mjpeg

Frigate Response:
  Content-Type: multipart/x-mixed-replace; boundary=--boundary
  
  --boundary
  Content-Type: image/jpeg
  Content-Length: 12345
  
  [JPEG BINARY DATA]
  --boundary
  Content-Type: image/jpeg
  Content-Length: 12346
  
  [JPEG BINARY DATA]
  --boundary
  ...

Backend: Preserves Content-Type, pipes response
Browser: <img> tag or <video> displays continuous stream


Format: WebRTC
──────────────

Request: GET /streams/garage_cam?format=webrtc

Frigate Response:
  Content-Type: application/json
  
  {
    "iceServers": [
      { "urls": ["stun:stun.l.google.com:19302"] }
    ],
    "sessionDescription": {
      "type": "offer",
      "sdp": "v=0\no=..."
    }
  }

Backend: Preserves JSON, pipes response
Browser: WebRTC library processes signaling, establishes P2P stream


Format: Snapshot (JPEG)
───────────────────────

Request: GET /streams/garage_cam?format=snapshot

Frigate Response:
  Content-Type: image/jpeg
  
  [JPEG BINARY DATA - Single Frame]

Backend: Preserves Content-Type, pipes response
Browser: <img> tag displays snapshot, or polling for updates
```

## Security Layers

```
Layer 1: Transport Security
──────────────────────────
HTTPS (or HTTP in development)
  ├─ Encrypts data in transit
  └─ Prevents eavesdropping

Layer 2: Authentication
───────────────────────
JWT Token Validation
  ├─ authMiddleware verifies signature
  ├─ Checks token not expired
  └─ Extracts tenantId from claims

Layer 3: Authorization (Tenant Isolation)
──────────────────────────────────────────
Database Query with Tenant Filter
  ├─ WHERE tenantId = ?
  ├─ Compound unique index (tenantId, key)
  └─ User can only access own tenant's cameras

Layer 4: Camera Ownership Verification
───────────────────────────────────────
verifyCameraOwnership()
  ├─ Checks camera exists
  ├─ Confirms tenant match
  └─ Returns 403 if mismatch

Layer 5: Input Validation
─────────────────────────
Parameter Validation
  ├─ cameraKey not empty
  ├─ format in allowed list
  └─ Returns 400 if invalid

Layer 6: URL Safety
──────────────────
encodeURIComponent()
  ├─ URL-encodes camera key
  └─ Prevents injection attacks

Layer 7: Rate Limiting (Future)
──────────────────────────────
Per-User Limits
  ├─ Max concurrent streams
  ├─ Max requests per minute
  └─ Quota based on subscription tier

Layer 8: Error Handling
──────────────────────
Graceful Degradation
  ├─ No sensitive info in errors
  ├─ Proper HTTP status codes
  └─ Informative messages only
```

## Configuration & Deployment

```
Development Setup:
──────────────────

.env:
  FRIGATE_BASE_URL=http://frigate:5000

docker-compose.yml:
  services:
    backend:
      ports: [3000:3000]
    frigate:
      ports: [5000:5000]
      network: internal (no external access)


Production Setup (Single Server):
─────────────────────────────────

.env:
  FRIGATE_BASE_URL=http://localhost:5000

Firewall:
  ├─ Port 443 (HTTPS) → Open to internet
  ├─ Port 5000 (Frigate) → Closed (internal only)
  └─ Backend on port 3000 (behind reverse proxy)

Nginx (Reverse Proxy):
  ├─ HTTPS termination
  ├─ Routes /api/* to backend:3000
  └─ CORS headers


Production Setup (Separate Frigate):
──────────────────────────────────────

.env:
  FRIGATE_BASE_URL=https://frigate.internal:8443

Network:
  ├─ Backend has access to frigate.internal:8443
  ├─ Frontend only knows backend URL
  └─ Frigate never exposed to internet

Firewall:
  ├─ Internet → 443 (HTTPS) → Backend
  ├─ Backend → frigate.internal:8443 → Frigate
  └─ Frigate → Closed to internet
```

## Performance Characteristics

```
Stream Piping:
──────────────
  Frigate Response
        │
        ▼ (no buffering)
    pipe()
        │
        ▼ (direct to client)
  Browser

Benefits:
  ✓ O(1) memory usage (constant)
  ✓ Low latency (no buffer)
  ✓ Handles large streams (HLS, MJPEG)
  ✓ Scalable to many concurrent streams


Timeout Protection:
───────────────────
  request.setTimeout(30000)
  
  30 seconds:
    ✓ Enough for slow networks
    ✓ Prevents hanging connections
    ✓ Frees resources quickly
    ✓ Fast error feedback


Concurrent Connections:
───────────────────────
  Single backend server can handle:
    ~200-500 concurrent HLS streams
    ~100 concurrent MJPEG streams
    (depends on CPU, memory, network)
  
  Scaling:
    ├─ Horizontal: Load balance across servers
    ├─ Vertical: Add CPU/memory to server
    └─ Frigate: Multiple Frigate instances
```

## Summary

The Frigate stream proxy provides:

✅ **Security**: Multi-layer protection (auth, tenant isolation, URL hiding)  
✅ **Performance**: Stream piping, timeouts, no buffering  
✅ **Reliability**: Graceful error handling, proper HTTP status codes  
✅ **Flexibility**: Multiple stream formats (HLS, MJPEG, WebRTC, Snapshot)  
✅ **Scalability**: Efficient resource usage, supports many concurrent streams  
✅ **Maintainability**: Clear separation of concerns, comprehensive documentation  

**Endpoint**: `GET /api/v1/streams/:cameraKey?format=hls`  
**Status**: Production-ready  
