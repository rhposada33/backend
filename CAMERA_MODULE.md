# Camera Module API Documentation

## Overview

The Camera Module provides comprehensive management of Frigate cameras within a multi-tenant environment. All camera operations are automatically scoped to the authenticated user's tenant, ensuring complete data isolation.

**Base URL:** `/api/v1/cameras`  
**Authentication:** All endpoints require JWT authentication  
**Scoping:** All operations are scoped to the user's `tenantId`

---

## Key Features

✅ **Multi-Tenant Isolation** - All cameras are scoped to tenant  
✅ **Unique Camera Keys** - Keys (Frigate camera names) must be unique per tenant  
✅ **Full CRUD Operations** - Create, read, update, delete cameras  
✅ **Pagination Support** - List cameras with configurable pagination (1-500 per page)  
✅ **Automatic Cascade Delete** - Deleting a camera cascade deletes all related events  
✅ **Input Validation** - All inputs validated server-side  
✅ **Comprehensive Error Handling** - Clear, actionable error messages  
✅ **Type-Safe** - Full TypeScript type definitions  

---

## Data Model

### Camera Schema

```typescript
interface Camera {
  id: string;              // UUID (primary key)
  tenantId: string;        // Foreign key to Tenant (auto-scoped)
  key: string;             // Frigate camera name (unique per tenant)
  label?: string;          // Optional human-readable label
  createdAt: Date;         // ISO 8601 timestamp
}
```

### Uniqueness Constraints

- **`tenantId_key` unique index:** Each `key` must be unique within a tenant
- **Cascade delete:** Deleting a camera cascades to all related events

### Response Type

```typescript
interface CameraResponse {
  id: string;
  tenantId: string;
  key: string;
  label?: string | null;
  createdAt: Date;
}
```

---

## API Endpoints

### 1. Create Camera

**Endpoint:** `POST /api/v1/cameras`

Creates a new camera for the authenticated user's tenant.

#### Request

```bash
POST /api/v1/cameras
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "key": "front_door",
  "label": "Front Door Camera"
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Frigate camera name (must be unique in tenant) |
| `label` | string | No | Human-readable label for the camera |

#### Response - Success (201 Created)

```json
{
  "data": {
    "id": "clyabc123xyz",
    "tenantId": "tenant-uuid",
    "key": "front_door",
    "label": "Front Door Camera",
    "createdAt": "2025-12-12T10:30:00.000Z"
  }
}
```

#### Response - Conflict (409 Conflict)

Camera with this key already exists in the tenant:

```json
{
  "error": "Conflict",
  "message": "Camera with key \"front_door\" already exists in this tenant"
}
```

#### Response - Bad Request (400)

```json
{
  "error": "Bad Request",
  "message": "Camera key is required and must be a string"
}
```

#### Response - Unauthorized (401)

```json
{
  "error": "Unauthorized",
  "message": "No authorization token provided"
}
```

---

### 2. List Cameras

**Endpoint:** `GET /api/v1/cameras`

Lists all cameras for the authenticated user's tenant with pagination support.

#### Request

```bash
GET /api/v1/cameras?page=1&limit=50
Authorization: Bearer <jwt_token>
```

#### Query Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `page` | integer | 1 | >= 1 | Page number (1-based) |
| `limit` | integer | 50 | 1-500 | Items per page |

#### Response - Success (200)

```json
{
  "data": [
    {
      "id": "clyabc123xyz",
      "tenantId": "tenant-uuid",
      "key": "front_door",
      "label": "Front Door Camera",
      "createdAt": "2025-12-12T10:30:00.000Z"
    },
    {
      "id": "clydef456uvw",
      "tenantId": "tenant-uuid",
      "key": "garage",
      "label": "Garage Camera",
      "createdAt": "2025-12-12T10:31:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

#### Response - Bad Request (400)

Invalid pagination parameters:

```json
{
  "error": "Bad Request",
  "message": "page must be >= 1, limit must be between 1 and 500"
}
```

---

### 3. Get Single Camera

**Endpoint:** `GET /api/v1/cameras/:id`

Retrieves a single camera by ID (must belong to authenticated user's tenant).

#### Request

```bash
GET /api/v1/cameras/clyabc123xyz
Authorization: Bearer <jwt_token>
```

#### Response - Success (200)

```json
{
  "data": {
    "id": "clyabc123xyz",
    "tenantId": "tenant-uuid",
    "key": "front_door",
    "label": "Front Door Camera",
    "createdAt": "2025-12-12T10:30:00.000Z"
  }
}
```

#### Response - Not Found (404)

Camera not found or belongs to different tenant:

```json
{
  "error": "Not Found",
  "message": "Camera not found"
}
```

---

### 4. Update Camera

**Endpoint:** `PUT /api/v1/cameras/:id`

Updates a camera's key and/or label.

#### Request

```bash
PUT /api/v1/cameras/clyabc123xyz
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "key": "front_entrance",
  "label": "Front Entrance Door"
}
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | No | New Frigate camera name (must be unique in tenant) |
| `label` | string | No | New human-readable label |

**Note:** At least one field must be provided. Cannot update `tenantId` or `createdAt`.

#### Response - Success (200)

```json
{
  "data": {
    "id": "clyabc123xyz",
    "tenantId": "tenant-uuid",
    "key": "front_entrance",
    "label": "Front Entrance Door",
    "createdAt": "2025-12-12T10:30:00.000Z"
  }
}
```

#### Response - Conflict (409)

Key is already in use by another camera in this tenant:

```json
{
  "error": "Conflict",
  "message": "Camera with key \"front_entrance\" already exists in this tenant"
}
```

#### Response - Not Found (404)

```json
{
  "error": "Not Found",
  "message": "Camera not found"
}
```

---

### 5. Delete Camera

**Endpoint:** `DELETE /api/v1/cameras/:id`

Deletes a camera. Related events are cascade deleted via database constraints.

#### Request

```bash
DELETE /api/v1/cameras/clyabc123xyz
Authorization: Bearer <jwt_token>
```

#### Response - Success (204 No Content)

```
(Empty response body)
```

#### Response - Not Found (404)

```json
{
  "error": "Not Found",
  "message": "Camera not found"
}
```

---

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Camera not found or belongs to different tenant |
| 409 | Conflict | Duplicate key in tenant |
| 500 | Server Error | Unexpected server error |

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "<Error Type>",
  "message": "<Specific error message>"
}
```

### Common Errors

#### Missing Authentication Token

```json
{
  "error": "Unauthorized",
  "message": "No authorization token provided"
}
```

**Solution:** Include `Authorization: Bearer <token>` header

#### Invalid Token

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Solution:** Regenerate token via `/auth/login`

#### Duplicate Camera Key

```json
{
  "error": "Conflict",
  "message": "Camera with key \"front_door\" already exists in this tenant"
}
```

**Solution:** Use a different key or update the existing camera

#### Camera Not Found

```json
{
  "error": "Not Found",
  "message": "Camera not found"
}
```

**Solution:** Verify camera ID and that it belongs to your tenant

---

## Curl Examples

### Register and Get Token

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "tenantId": "tenant-uuid"
  }'

# Response contains token
# Save: TOKEN="<token_from_response>"
```

### Create Camera

```bash
curl -X POST http://localhost:3000/api/v1/cameras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "front_door",
    "label": "Front Door Camera"
  }'
```

### List Cameras

```bash
# Get first page (default 50 per page)
curl http://localhost:3000/api/v1/cameras \
  -H "Authorization: Bearer $TOKEN"

# Get specific page with custom limit
curl "http://localhost:3000/api/v1/cameras?page=2&limit=25" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Camera

```bash
curl http://localhost:3000/api/v1/cameras/clyabc123xyz \
  -H "Authorization: Bearer $TOKEN"
```

### Update Camera

```bash
curl -X PUT http://localhost:3000/api/v1/cameras/clyabc123xyz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "front_entrance",
    "label": "Front Entrance (Updated)"
  }'

# Update only label
curl -X PUT http://localhost:3000/api/v1/cameras/clyabc123xyz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Main Entrance Camera"
  }'
```

### Delete Camera

```bash
curl -X DELETE http://localhost:3000/api/v1/cameras/clyabc123xyz \
  -H "Authorization: Bearer $TOKEN"
```

---

## JavaScript/Node.js Examples

### Setup

```typescript
const API_BASE = 'http://localhost:3000/api/v1';
const TOKEN = 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};
```

### Create Camera

```typescript
async function createCamera(key: string, label?: string) {
  const response = await fetch(`${API_BASE}/cameras`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, label }),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const camera = await createCamera('front_door', 'Front Door Camera');
console.log(camera.data);
```

### List Cameras

```typescript
async function listCameras(page = 1, limit = 50) {
  const url = new URL(`${API_BASE}/cameras`);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await listCameras(1, 50);
console.log(`Found ${result.pagination.total} cameras`);
result.data.forEach(camera => {
  console.log(`- ${camera.label} (${camera.key})`);
});
```

### Get Single Camera

```typescript
async function getCamera(id: string) {
  const response = await fetch(`${API_BASE}/cameras/${id}`, { headers });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const camera = await getCamera('clyabc123xyz');
if (camera) {
  console.log(camera.data);
}
```

### Update Camera

```typescript
async function updateCamera(
  id: string,
  updates: { key?: string; label?: string }
) {
  const response = await fetch(`${API_BASE}/cameras/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return response.json();
}

// Usage
const updated = await updateCamera('clyabc123xyz', {
  label: 'Front Entrance (Updated)',
});
console.log(updated.data);
```

### Delete Camera

```typescript
async function deleteCamera(id: string) {
  const response = await fetch(`${API_BASE}/cameras/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (response.status === 404) {
    console.log('Camera not found');
    return;
  }

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  console.log('Camera deleted');
}

// Usage
await deleteCamera('clyabc123xyz');
```

---

## Service Layer API

For backend operations within the application, use the `CameraService` directly:

```typescript
import * as cameraService from './modules/camera/service.js';

// Create camera
const camera = await cameraService.createCamera(tenantId, {
  key: 'front_door',
  label: 'Front Door Camera',
});

// Get single camera
const camera = await cameraService.getCameraById(tenantId, cameraId);

// Get all cameras for tenant (with pagination)
const { cameras, total } = await cameraService.getCamerasByTenant(tenantId, skip, take);

// Update camera
const updated = await cameraService.updateCamera(tenantId, cameraId, {
  key: 'new_key',
  label: 'New Label',
});

// Delete camera
await cameraService.deleteCamera(tenantId, cameraId);

// Get camera by key (useful for Frigate event matching)
const camera = await cameraService.getCameraByKey(tenantId, 'front_door');
```

---

## Tenant Scoping

All camera operations are **automatically scoped to the authenticated user's tenantId**.

### How It Works

1. User authenticates → receives JWT with `tenantId`
2. Client sends request with JWT token
3. `authMiddleware` verifies token and extracts `tenantId`
4. Controller verifies `req.user.tenantId` before database operations
5. Service layer queries only cameras belonging to that `tenantId`

### Security Implications

✅ Users **cannot** access cameras from other tenants  
✅ Users **cannot** modify cameras from other tenants  
✅ All queries filtered by `tenantId` at database level  
✅ Cascade constraints prevent orphaned events  

### Example

```typescript
// User A's token contains: tenantId = "tenant-123"
// User A tries to delete another user's camera:

const response = await fetch('http://localhost:3000/api/v1/cameras/other-tenant-camera', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer <user-a-token>',
  },
});

// Result: 404 Not Found
// The camera belongs to "tenant-456", not "tenant-123"
```

---

## Validation Rules

### Key Field

- **Required:** Yes
- **Type:** String
- **Length:** Any (trimmed)
- **Uniqueness:** Unique per tenant (enforced by database)
- **Frigate Compliance:** Must match Frigate camera names

### Label Field

- **Required:** No
- **Type:** String or null
- **Length:** Any (trimmed)
- **Purpose:** Human-readable display name

### Pagination

- **Page:** Must be >= 1
- **Limit:** Must be between 1 and 500
- **Default Limit:** 50

---

## Integration with Other Modules

### Event Creation

When a Frigate event is ingested, use `getCameraByKey` to match the camera:

```typescript
async function processEvent(tenantId: string, frigateEventData: any) {
  // Match camera by Frigate key
  const camera = await cameraService.getCameraByKey(
    tenantId,
    frigateEventData.camera
  );

  if (!camera) {
    console.warn(`Camera not found: ${frigateEventData.camera}`);
    return;
  }

  // Create event linked to camera
  const event = await eventService.createEvent(tenantId, camera.id, {
    type: frigateEventData.type,
    // ...
  });
}
```

---

## Testing Checklist

### Functional Testing

- [ ] Create camera with valid key
- [ ] Create camera with optional label
- [ ] Attempt to create duplicate key → 409 Conflict
- [ ] Get camera by ID (valid)
- [ ] Get camera by ID (invalid/not found)
- [ ] List cameras with pagination
- [ ] List cameras with various page/limit combinations
- [ ] Update camera key
- [ ] Update camera label
- [ ] Update both key and label
- [ ] Delete camera (events should cascade delete)

### Security Testing

- [ ] Create camera without token → 401 Unauthorized
- [ ] Get camera from different tenant (should be 404)
- [ ] Delete camera from different tenant (should be 404)
- [ ] Update camera from different tenant (should be 404)

### Validation Testing

- [ ] Create with missing key → 400 Bad Request
- [ ] Create with invalid label type → 400 Bad Request
- [ ] Update with no fields → 400 Bad Request
- [ ] Invalid pagination parameters → 400 Bad Request
- [ ] Page = 0 → 400 Bad Request
- [ ] Limit = 0 → 400 Bad Request
- [ ] Limit = 501 → 400 Bad Request

### Pagination Testing

- [ ] First page returns correct items
- [ ] Last page returns remaining items
- [ ] totalPages calculated correctly
- [ ] Results ordered by creation date (newest first)

### Error Handling

- [ ] Network error handling
- [ ] Database error handling
- [ ] Invalid token handling
- [ ] Token expiry handling

---

## Implementation Notes

### Architecture

- **Service Layer:** Business logic with Prisma queries
- **Controller Layer:** HTTP request/response handling with validation
- **Router Layer:** Express route definitions with middleware
- **Module Index:** Centralized exports

### Scoping Strategy

All cameras scoped via `tenantId` foreign key:
- Database-level constraint: `Camera.tenantId_key` unique index
- Application-level filtering: All queries include `{ where: { tenantId } }`
- Middleware verification: `authMiddleware` ensures valid token

### Error Handling

1. **Validation Errors:** 400 Bad Request
2. **Authentication Errors:** 401 Unauthorized
3. **Authorization Errors:** 403 Forbidden (same tenant check)
4. **Not Found Errors:** 404 Not Found
5. **Conflict Errors:** 409 Conflict (duplicate key)
6. **Server Errors:** 500 Internal Server Error

### Type Safety

- Full TypeScript strict mode
- All inputs typed and validated
- Response types exported for frontend usage
- No implicit `any` types

---

## Support & Troubleshooting

### Common Issues

**Issue:** Getting 404 for camera that should exist  
**Cause:** Camera belongs to different tenant  
**Solution:** Verify token and camera's `tenantId`

**Issue:** Getting 409 Conflict when creating camera  
**Cause:** Camera key already exists in this tenant  
**Solution:** Use unique key or update existing camera

**Issue:** Delete returns 204 but events still exist  
**Cause:** Cascade delete is asynchronous  
**Solution:** Wait for delete to complete, then query events

### Debugging

Enable debug logging:

```typescript
// In service layer
console.log(`[Camera] Creating camera for tenant: ${tenantId}`);
console.log(`[Camera] Camera data:`, input);
```

Check database directly:

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# View all cameras for tenant
SELECT * FROM cameras WHERE "tenantId" = 'tenant-uuid';

# Check for duplicate keys
SELECT "tenantId", key, COUNT(*) FROM cameras GROUP BY "tenantId", key HAVING COUNT(*) > 1;
```

---

**Documentation Last Updated:** 2025-12-12  
**Status:** Production Ready  
**Version:** 1.0.0
