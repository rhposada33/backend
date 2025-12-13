# Camera Livestream Endpoint - Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/Vue)                               │
│                                                                             │
│  const response = await fetch('/api/cameras/streams', {                   │
│    headers: { 'Authorization': `Bearer ${jwtToken}` }                     │
│  })                                                                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                    HTTP POST (with JWT in Authorization header)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND API SERVER                                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Express Routes                                                        │ │
│  │ GET /api/cameras/streams                                            │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
│                                    ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Middleware Layer                                                      │ │
│  │ - authMiddleware: Validates JWT token                               │ │
│  │ - Extracts tenantId from token                                      │ │
│  │ - Attaches to req.user                                              │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
│                                    ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Controller (getCameraStreams)                                         │ │
│  │ 1. Verify req.user exists                                           │ │
│  │ 2. Call service.getCameraStreams(req.user.tenantId)                │ │
│  │ 3. Return { data: CameraStream[], count: number }                 │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
│                                    ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Service Layer (getCameraStreams)                                      │ │
│  │ 1. Query: SELECT * FROM cameras WHERE tenantId = ?                  │ │
│  │ 2. For each camera: buildCameraStream(camera)                      │ │
│  │    a. Construct URL: config.frigatBaseUrl + /api/camera/{key}/... │ │
│  │    b. Set status: 'live' (TODO: real status)                       │ │
│  │    c. Return CameraStream object                                    │ │
│  │ 3. Return CameraStream[]                                            │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
│                                    ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Database Query                                                        │ │
│  │ Prisma.camera.findMany({ where: { tenantId } })                    │ │
│  │ ✓ Enforces tenant scoping at DB level                              │ │
│  │ ✓ Prevents cross-tenant data access                                │ │
│  └─────────────────────────────────┬─────────────────────────────────────┘ │
│                                    │                                       │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │
                         Results: Array of Camera objects
                                     │
┌────────────────────────────────────┼───────────────────────────────────────┐
│                      POSTGRESQL DATABASE                                   │
│                                    │                                       │
│                                    ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ cameras table                                                         │ │
│  │ id | tenantId | key         | label           | createdAt          │ │
│  │ ---|----------|-------------|-----------------|------------------- │ │
│  │ 1  | tenant-1 | garage_cam  | Front Garage    | 2025-01-01T...    │ │
│  │ 2  | tenant-1 | backyard    | Backyard View   | 2025-01-02T...    │ │
│  │ 3  | tenant-2 | entrance    | Main Entrance   | 2025-01-03T...    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

    ↑ Query only tenant-1 cameras (due to WHERE tenantId = 'tenant-1')
    
    Returns to Backend:
    [
      { id: 1, tenantId: 'tenant-1', key: 'garage_cam', label: 'Front Garage' },
      { id: 2, tenantId: 'tenant-1', key: 'backyard', label: 'Backyard View' }
    ]
    
    ↓ Transform each to CameraStream with constructed URLs
    
    Returns to Frontend:
    [
      {
        cameraId: '1',
        cameraName: 'Front Garage',
        streamUrl: 'http://frigate:5000/api/camera/garage_cam/webrtc',
        status: 'live'
      },
      {
        cameraId: '2',
        cameraName: 'Backyard View',
        streamUrl: 'http://frigate:5000/api/camera/backyard/webrtc',
        status: 'live'
      }
    ]
```

## Data Flow Diagram

```
Frontend Request
    │
    │ GET /api/cameras/streams
    │ Headers: { Authorization: "Bearer eyJhbGc..." }
    │
    ▼
Authorization Middleware
    │
    ├─ Verify JWT signature
    ├─ Extract claims (userId, tenantId)
    ├─ Attach to req.user
    │
    ▼
Camera Controller
    │
    ├─ Check req.user exists
    ├─ Extract tenantId = req.user.tenantId
    │
    ▼
Camera Service
    │
    ├─ Query DB: findMany({ where: { tenantId } })
    │
    ├─ For each camera:
    │  │
    │  ├─ buildCameraStream(camera)
    │  │  │
    │  │  ├─ streamUrl = `${config.frigatBaseUrl}/api/camera/${camera.key}/webrtc`
    │  │  ├─ cameraName = camera.label || camera.key
    │  │  ├─ status = 'live'  [TODO: real status check]
    │  │  │
    │  │  └─ return CameraStream
    │  │
    │  └─ Collect in array
    │
    ▼
Frontend Response
    │
    └─ { data: CameraStream[], count: number }
```

## Security Boundary Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INTERNET / PUBLIC                             │
│                                                                      │
│  Frontend Browser                                                    │
│  (Only sees constructed URLs, never sees Frigate IP/port)          │
│  Can only access: http://localhost:3000/api/cameras/streams        │
│                                                                      │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ ← Authentication boundary
                           │   (JWT token required)
                           │
┌──────────────────────────┼───────────────────────────────────────────┐
│                         BACKEND / PRIVATE                             │
│                                                                      │
│  Backend API (Express)                                               │
│  Knows: FRIGATE_BASE_URL = "http://frigate:5000"                  │
│  Constructs: URLs like "http://frigate:5000/api/camera/..."       │
│  Sends to Frontend: Only sanitized URLs                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ DATABASE SECURITY                                           │  │
│  │ - Tenant scoping at query level                            │  │
│  │ - WHERE tenantId = ?                                       │  │
│  │ - User A can ONLY see User A's cameras                     │  │
│  │ - User B cannot access User A's stream URLs               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Frigate (Internal Docker Service)                                  │
│  Not exposed to Internet                                            │
│  Only accessible from Backend                                       │
│  Frontend never knows about Frigate directly                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## URL Construction Process

```
Input Camera from Database:
    {
      id: "cam-123",
      key: "garage_cam",
      label: "Front Garage",
      tenantId: "tenant-1"
    }

                        │
                        ▼

Read from Environment:
    config.frigatBaseUrl = "http://frigate:5000"

                        │
                        ▼

Construct URL:
    base = "http://frigate:5000"
    path = "/api/camera"
    key = encodeURIComponent("garage_cam")  // URL-encode for safety
    protocol = "/webrtc"
    
    Full URL = base + path + "/" + key + protocol
            = "http://frigate:5000/api/camera/garage_cam/webrtc"

                        │
                        ▼

Build CameraStream Object:
    {
      cameraId: "cam-123",
      cameraName: "Front Garage",
      streamUrl: "http://frigate:5000/api/camera/garage_cam/webrtc",
      status: "live"
    }

                        │
                        ▼

Return to Frontend:
    Frontend receives URL
    Frontend uses URL in WebRTC player
    Frontend never knows Frigate's actual location/credentials
```

## Tenant Isolation Diagram

```
Scenario: Multi-tenant system with 2 tenants

┌─────────────────────────────────────────────────────────────┐
│ DATABASE (single shared instance)                           │
│                                                             │
│ ┌──────────────────────────────────────┐                  │
│ │ Tenant 1 Cameras                     │                  │
│ │ id    | tenantId   | key             │                  │
│ │ 1     | tenant-1   | garage_cam      │                  │
│ │ 2     | tenant-1   | backyard        │                  │
│ └──────────────────────────────────────┘                  │
│                                                             │
│ ┌──────────────────────────────────────┐                  │
│ │ Tenant 2 Cameras                     │                  │
│ │ id    | tenantId   | key             │                  │
│ │ 3     | tenant-2   | warehouse       │                  │
│ │ 4     | tenant-2   | dock            │                  │
│ └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘

User 1 (Tenant 1) makes request:
    GET /api/cameras/streams
    Authorization: Bearer token_for_user1
    
    Backend extracts: tenantId = "tenant-1"
    Query: SELECT * FROM cameras WHERE tenantId = "tenant-1"
    
    ✓ Returns cameras 1, 2 only
    ✗ Cannot see cameras 3, 4 (Tenant 2)
    
    Response:
    {
      data: [
        { cameraId: "1", cameraName: "...", streamUrl: "...", status: "live" },
        { cameraId: "2", cameraName: "...", streamUrl: "...", status: "live" }
      ],
      count: 2
    }

User 2 (Tenant 2) makes request:
    GET /api/cameras/streams
    Authorization: Bearer token_for_user2
    
    Backend extracts: tenantId = "tenant-2"
    Query: SELECT * FROM cameras WHERE tenantId = "tenant-2"
    
    ✓ Returns cameras 3, 4 only
    ✗ Cannot see cameras 1, 2 (Tenant 1)
    
    Response:
    {
      data: [
        { cameraId: "3", cameraName: "...", streamUrl: "...", status: "live" },
        { cameraId: "4", cameraName: "...", streamUrl: "...", status: "live" }
      ],
      count: 2
    }

KEY: Tenant isolation enforced at DATABASE level, not application level
     → More secure
     → Impossible to accidentally query wrong tenant's data
```

## Error Handling Flow

```
Frontend Request to GET /api/cameras/streams

                    │
                    ▼
            
        Is JWT token present?
        │
        ├─ NO → Return 401 Unauthorized
        │       (no attempt to access database)
        │
        └─ YES → Verify JWT signature
                 │
                 ├─ INVALID → Return 401 Unauthorized
                 │
                 └─ VALID → Extract claims (tenantId, userId)
                           │
                           ▼
                        
                    Query Database
                    WHERE tenantId = ?
                    │
                    ├─ DB ERROR → Return 500 Internal Server Error
                    │
                    └─ SUCCESS → Array of cameras (may be empty [])
                                │
                                ▼
                            
                        For each camera:
                        buildCameraStream()
                        │
                        ├─ CONSTRUCTION ERROR → Return 500
                        │
                        └─ SUCCESS → CameraStream object
                                     │
                                     └─ Add to results array
                    
                                     ▼
                        
                        Return 200 OK
                        {
                          data: CameraStream[],
                          count: number
                        }
```

## Environment Configuration

```
Development:
┌─────────────────────────────────────────┐
│ .env (Local file)                      │
│ FRIGATE_BASE_URL=http://frigate:5000  │
│ (Docker internal network)              │
└─────────────────────────────────────────┘
                    │
                    ▼
        config.frigatBaseUrl = 
        "http://frigate:5000"
        
        Generated URL:
        http://frigate:5000/api/camera/garage_cam/webrtc


Production:
┌─────────────────────────────────────────┐
│ Environment variable                    │
│ FRIGATE_BASE_URL=https://               │
│   frigate.example.com:8443             │
│ (External HTTPS domain)                │
└─────────────────────────────────────────┘
                    │
                    ▼
        config.frigatBaseUrl = 
        "https://frigate.example.com:8443"
        
        Generated URL:
        https://frigate.example.com:8443/api/camera/garage_cam/webrtc
        
        ✓ Same code, different configuration
        ✓ Frontend works in both environments
        ✓ No code changes needed
```

## Summary

These diagrams show:

1. **System Architecture**: How all components fit together
2. **Data Flow**: Request → Middleware → Controller → Service → DB → Response
3. **Security Boundaries**: What Frontend can see vs Backend/Frigate
4. **URL Construction**: How Frigate URLs are built safely
5. **Tenant Isolation**: How multi-tenant data is protected
6. **Error Handling**: Different error scenarios and responses
7. **Configuration**: How environment affects URL generation

The design ensures **security**, **tenant isolation**, and **flexibility** for different deployment environments.
