# Event Module Documentation

## Overview

The Event module provides endpoints for managing and querying camera events in the Sateliteyes system. Events are tied to cameras and represent detection/trigger events from Frigate.

### Key Features
- ✅ List all events with pagination
- ✅ Get event details
- ✅ Get events filtered by camera
- ✅ Tenant-scoped queries (automatic filtering by JWT tenantId)
- ✅ Rich event data including camera info, flags, and raw payload

---

## API Endpoints

### 1. List All Events

**Endpoint:** `GET /api/v1/events`

**Description:** Get all events for the authenticated user's tenant with pagination support.

**Authentication:** Required (JWT)

**Query Parameters:**
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| page | integer | 1 | >= 1 | Page number (1-indexed) |
| limit | integer | 50 | 1-500 | Results per page |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "cmj30yjxy000174y0l65gn6gz",
      "tenantId": "cmj2eafv80000aanepp475424",
      "cameraId": "cmj30yjxy000174y0l65gn6gz",
      "frigateId": "front-door-1765553485162",
      "type": "person",
      "label": "Person detected",
      "hasSnapshot": true,
      "hasClip": true,
      "startTime": 1765553485.162,
      "endTime": 1765553495.500,
      "rawPayload": {
        "after": {...},
        "before": {...}
      },
      "createdAt": "2025-12-12T15:31:25.175Z",
      "camera": {
        "id": "cmj30yjxy000174y0l65gn6gz",
        "key": "front-door",
        "label": "Front Door Camera"
      }
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

**Error Responses:**

400 Bad Request - Invalid pagination:
```json
{
  "error": "Bad Request",
  "message": "page must be >= 1, limit must be between 1 and 500"
}
```

401 Unauthorized - Missing/invalid token:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

### 2. Get Event Details

**Endpoint:** `GET /api/v1/events/:id`

**Description:** Get detailed information about a specific event.

**Authentication:** Required (JWT)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Event ID (required) |

**Response (200 OK):**
```json
{
  "data": {
    "id": "cmj30yjxy000174y0l65gn6gz",
    "tenantId": "cmj2eafv80000aanepp475424",
    "cameraId": "cmj30yjxy000174y0l65gn6gz",
    "frigateId": "front-door-1765553485162",
    "type": "person",
    "label": "Person detected",
    "hasSnapshot": true,
    "hasClip": true,
    "startTime": 1765553485.162,
    "endTime": 1765553495.500,
    "rawPayload": {
      "after": {
        "id": "front-door-20251212-1531",
        "camera": "front-door",
        "top_score": 0.95,
        "false_positive": false
      },
      "before": {
        "id": "front-door-20251212-1530",
        "camera": "front-door",
        "top_score": 0.85
      }
    },
    "createdAt": "2025-12-12T15:31:25.175Z",
    "camera": {
      "id": "cmj30yjxy000174y0l65gn6gz",
      "key": "front-door",
      "label": "Front Door Camera"
    }
  }
}
```

**Error Responses:**

404 Not Found - Event not found:
```json
{
  "error": "Not Found",
  "message": "Event not found"
}
```

---

### 3. Get Events by Camera

**Endpoint:** `GET /api/v1/events/byCamera/:cameraId`

**Description:** Get events for a specific camera with pagination support.

**Authentication:** Required (JWT)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| cameraId | string | Camera ID (required) |

**Query Parameters:**
| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| page | integer | 1 | >= 1 | Page number (1-indexed) |
| limit | integer | 50 | 1-500 | Results per page |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "cmj30yjxy000174y0l65gn6gz",
      "tenantId": "cmj2eafv80000aanepp475424",
      "cameraId": "cmj30yjxy000174y0l65gn6gz",
      "frigateId": "front-door-1765553485162",
      "type": "person",
      "label": "Person detected",
      "hasSnapshot": true,
      "hasClip": true,
      "startTime": 1765553485.162,
      "endTime": 1765553495.500,
      "rawPayload": {...},
      "createdAt": "2025-12-12T15:31:25.175Z",
      "camera": {
        "id": "cmj30yjxy000174y0l65gn6gz",
        "key": "front-door",
        "label": "Front Door Camera"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 42,
    "totalPages": 1
  }
}
```

**Error Responses:**

404 Not Found - Camera not found:
```json
{
  "error": "Not Found",
  "message": "Camera not found or does not belong to your tenant"
}
```

---

## Event Object Structure

### EventWithCamera (List/ByCamera Response)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique event identifier |
| tenantId | string | Tenant that owns this event |
| cameraId | string | Camera that captured this event |
| frigateId | string | Frigate event ID (event_id from MQTT) |
| type | string | Event type (e.g., "person", "car", "dog") |
| label | string \| null | Human-readable event label |
| hasSnapshot | boolean | Whether event has a snapshot image |
| hasClip | boolean | Whether event has a video clip |
| startTime | float \| null | Event start time (Unix timestamp) |
| endTime | float \| null | Event end time (Unix timestamp) |
| rawPayload | object | Complete raw MQTT payload |
| createdAt | string | ISO 8601 timestamp when event was recorded |
| camera | object | Camera reference (see below) |

### Camera Object (Nested)

| Field | Type | Description |
|-------|------|-------------|
| id | string | Camera ID |
| key | string | Frigate camera name/key |
| label | string \| null | Custom camera label |

---

## Usage Examples

### JavaScript/TypeScript Client

```javascript
const token = 'eyJhbGc...'; // JWT token from /auth/login

// List all events (first page)
fetch('http://localhost:3000/api/v1/events', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));

// List events with custom pagination
fetch('http://localhost:3000/api/v1/events?page=2&limit=25', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));

// Get event details
fetch('http://localhost:3000/api/v1/events/cmj30yjxy000174y0l65gn6gz', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));

// Get events for specific camera
fetch('http://localhost:3000/api/v1/events/byCamera/cmj30yjxy000174y0l65gn6gz?page=1&limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

### cURL Examples

```bash
# Login and store token
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' \
  | jq -r '.token')

# List all events
curl http://localhost:3000/api/v1/events \
  -H "Authorization: Bearer $TOKEN"

# List events with pagination
curl "http://localhost:3000/api/v1/events?page=2&limit=25" \
  -H "Authorization: Bearer $TOKEN"

# Get event details
curl http://localhost:3000/api/v1/events/cmj30yjxy000174y0l65gn6gz \
  -H "Authorization: Bearer $TOKEN"

# Get events by camera
curl "http://localhost:3000/api/v1/events/byCamera/cmj30yjxy000174y0l65gn6gz?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Test Script

```bash
# Run the built-in test script
TENANT_ID=default node scripts/test-events.mjs

# With custom credentials
TENANT_ID=default EMAIL=test@example.com PASSWORD=Password123! node scripts/test-events.mjs
```

---

## Implementation Details

### Service Layer (`service.ts`)

The service layer provides three main functions:

1. **getEventsByTenant(tenantId, skip, limit)**
   - Retrieves all events for a tenant
   - Supports pagination via skip/limit
   - Automatically filters by tenantId
   - Orders by createdAt (descending)

2. **getEventById(tenantId, eventId)**
   - Retrieves single event by ID
   - Validates tenant ownership via WHERE clause
   - Includes related camera data

3. **getEventsByCamera(tenantId, cameraId, skip, limit)**
   - Retrieves events for specific camera
   - Validates camera belongs to tenant
   - Supports pagination
   - Throws error if camera not found or doesn't belong to tenant

### Security Features

- **Tenant Isolation:** All queries include `where: { tenantId }` filter to ensure users can only see their own events
- **Camera Verification:** getEventsByCamera verifies camera belongs to tenant before returning events
- **Authentication Middleware:** All routes protected with `authMiddleware`
- **Pagination Limits:** Enforces max limit of 500 results per page

### Database Indexes

The Event model includes strategic indexes for performance:
- `@@index([tenantId])` - Fast filtering by tenant
- `@@index([cameraId])` - Fast filtering by camera
- `@@index([createdAt])` - Fast sorting by timestamp

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Scenario |
|--------|---------|----------|
| 200 | OK | Successful GET request |
| 400 | Bad Request | Invalid pagination params |
| 401 | Unauthorized | Missing/invalid JWT token |
| 404 | Not Found | Event or camera not found |
| 500 | Server Error | Database or service error |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

---

## Performance Considerations

### Query Optimization
- Events are ordered by `createdAt DESC` for most recent first
- Pagination prevents loading entire result sets
- Only required fields are selected from camera relation
- Database indexes on tenantId, cameraId, and createdAt

### Recommended Pagination Strategy
- Default limit: 50 events
- Max limit: 500 events
- Use ?page=2 to iterate through results
- Consider caching frequently accessed pages

### Typical Response Times
- List all events: ~50-100ms
- Get event details: ~20-30ms
- Get events by camera: ~50-100ms

---

## Future Enhancements

Potential features for future development:
- [ ] Filter by event type (person, car, dog, etc.)
- [ ] Filter by date range (startTime, endTime)
- [ ] Search by label/description
- [ ] Sort options (createdAt, startTime, type)
- [ ] Archive/delete old events
- [ ] Event alerts/notifications
- [ ] Snapshot/clip download endpoints

---

**Last Updated:** 2025-12-12  
**Module Version:** 1.0.0
