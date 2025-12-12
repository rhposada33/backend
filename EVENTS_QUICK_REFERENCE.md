# Events Module Architecture & Quick Reference

## 📊 Module Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Application                            │
│              (Frontend / Mobile / API Client)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   GET /events  GET /:id    GET /byCamera/:id
   (paginated)  (details)   (paginated)
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │    API Router           │
        │   /api/v1/events        │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  authMiddleware         │
        │  (JWT validation)       │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────────────┐
        │    Event Controller             │
        │  - listEvents()                 │
        │  - getEvent()                   │
        │  - getEventsByCamera()          │
        └────────────┬────────────────────┘
                     │
        ┌────────────▼────────────────────┐
        │    Event Service                │
        │  - getEventsByTenant()          │
        │  - getEventById()               │
        │  - getEventsByCamera()          │
        │                                 │
        │  • Tenant isolation (WHERE)     │
        │  • Pagination (skip/limit)      │
        │  • Camera validation            │
        └────────────┬────────────────────┘
                     │
        ┌────────────▼────────────────────┐
        │    Prisma ORM                   │
        │                                 │
        │  findMany()                     │
        │  findFirst()                    │
        │  count()                        │
        └────────────┬────────────────────┘
                     │
        ┌────────────▼────────────────────┐
        │  PostgreSQL Database            │
        │                                 │
        │  events table                   │
        │  - @@index([tenantId])          │
        │  - @@index([cameraId])          │
        │  - @@index([createdAt])         │
        └────────────────────────────────┘
```

---

## 🔄 Request/Response Flow

### GET /events (List All Events)
```
┌─────────────────────────────────────────────────┐
│ CLIENT REQUEST                                  │
│ GET /api/v1/events?page=1&limit=50              │
│ Authorization: Bearer {JWT_TOKEN}              │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ MIDDLEWARE                                      │
│ authMiddleware                                  │
│ ✓ Extract token                                │
│ ✓ Verify signature                             │
│ ✓ Extract userId, tenantId                     │
│ ✓ Attach to req.user                           │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ CONTROLLER: listEvents()                        │
│ ✓ Validate authentication                      │
│ ✓ Parse page & limit query params              │
│ ✓ Validate pagination (1<=page, 1<=limit<=500)│
│ ✓ Calculate skip = (page-1) * limit            │
│ ✓ Call service                                 │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ SERVICE: getEventsByTenant()                    │
│                                                 │
│ query = Event.findMany({                       │
│   where: {                                     │
│     tenantId: req.user.tenantId  // ISOLATION │
│   },                                           │
│   include: { camera: { ... } },                │
│   orderBy: { createdAt: 'desc' },              │
│   skip: 0,                                     │
│   take: 50                                     │
│ })                                             │
│                                                 │
│ count = Event.count({                          │
│   where: { tenantId: req.user.tenantId }       │
│ })                                             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ DATABASE QUERY                                  │
│ SELECT * FROM events                           │
│ WHERE tenant_id = 'cmj2eafv80000aanepp475424'   │
│ ORDER BY created_at DESC                       │
│ LIMIT 50 OFFSET 0                              │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ SERVER RESPONSE                                 │
│ HTTP 200 OK                                    │
│ {                                              │
│   "data": [ ... 50 events ... ],                │
│   "pagination": {                              │
│     "page": 1,                                 │
│     "limit": 50,                               │
│     "total": 30,                               │
│     "totalPages": 1                            │
│   }                                            │
│ }                                              │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ CLIENT RECEIVES                                 │
│ Displays events in UI with pagination controls │
└─────────────────────────────────────────────────┘
```

---

## 📈 Event Object Structure

```json
{
  "id": "cmj327ijj001tdfhp5r20719s",
  "tenantId": "cmj2eafv80000aanepp475424",
  "cameraId": "cmj327iga0005dfhprjgwdldr",
  
  "frigateId": "event-camera-3-1765555582878-9",
  "type": "bike",
  "label": "Unknown object",
  
  "hasSnapshot": true,
  "hasClip": true,
  
  "startTime": 1765551982.765,
  "endTime": 1765552000.14467,
  
  "rawPayload": {
    "type": "bike",
    "score": "0.86",
    "camera": "camera-3",
    "metadata": {
      "zone": "zone-1",
      "confidence": "0.38"
    },
    "timestamp": 1765551982.765
  },
  
  "createdAt": "2025-12-12T16:06:22.879Z",
  
  "camera": {
    "id": "cmj327iga0005dfhprjgwdldr",
    "key": "camera-3",
    "label": "Test Camera 3"
  }
}
```

---

## 🔐 Security Features

```
┌────────────────────────────────────────────────┐
│ TENANT ISOLATION                               │
│ • All queries: WHERE tenantId = user.tenantId  │
│ • User can ONLY see their tenant's data        │
│ • Multi-tenant system enforced at DB level     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ CAMERA OWNERSHIP VALIDATION                    │
│ • GET /byCamera/:cameraId                      │
│ • Verifies: camera.tenantId == user.tenantId   │
│ • Prevents accessing other tenant's cameras    │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ AUTHENTICATION                                 │
│ • All routes protected with authMiddleware     │
│ • JWT token required in Authorization header   │
│ • Rejects requests without valid token (401)   │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ INPUT VALIDATION                               │
│ • page: must be >= 1                           │
│ • limit: must be 1-500                         │
│ • Returns 400 Bad Request for invalid input    │
└────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Script Output Summary
```
✅ Test 1: GET /events
   ✓ HTTP 200 response
   ✓ Contains data array
   ✓ Contains pagination object
   ✓ Default pagination (page=1, limit=50)
   ✓ All event fields present

✅ Test 2: Pagination Parameters
   ✓ Custom page/limit accepted
   ✓ Pagination respected

✅ Test 3: GET /events/:id
   ✓ HTTP 200 response
   ✓ Single event detail returned
   ✓ All fields including timestamps, rawPayload

✅ Test 4: GET /events/byCamera/:cameraId
   ✓ HTTP 200 response
   ✓ Pagination working
   ✓ Events filtered by camera

✅ Test 5: Tenant Isolation
   ✓ All events belong to user's tenant

✅ Test 6: Error Handling
   ✓ Invalid pagination → 400 Bad Request
   ✓ Non-existent event → 404 Not Found
   ✓ No authentication → 401 Unauthorized
```

---

## 📋 Quick Reference

### File Locations
```
src/modules/event/
  ├── service.ts        → Business logic
  ├── controller.ts     → HTTP handlers
  ├── router.ts         → Route definitions
  └── index.ts          → Exports

scripts/
  ├── test-events.mjs        → E2E test
  ├── validate-events.mjs    → 24 validation tests
  ├── seed-events.mjs        → Create test data
  └── check-db.mjs           → DB inspection
```

### Commands
```bash
# Start backend
npm run dev

# Create test data
node scripts/seed-events.mjs

# Run tests
TENANT_ID=default node scripts/test-events.mjs
node scripts/validate-events.mjs

# Check database
node scripts/check-db.mjs
```

### API Endpoints
```
GET /api/v1/events                              # List all
GET /api/v1/events/:id                          # Single detail
GET /api/v1/events/byCamera/:cameraId           # Filter by camera
```

### Query Parameters
```
?page=1         # Page number (default: 1)
&limit=50       # Results per page (default: 50, max: 500)
```

---

## 📊 Database

### Event Table
- **Primary Key:** id (CUID)
- **Tenant Isolation:** tenantId (with index)
- **Camera Link:** cameraId (with index)
- **Frigate ID:** frigateId (unique per tenant)
- **Timestamps:** createdAt (with index)
- **Storage:** rawPayload (JSON)

### Indexes
```sql
CREATE INDEX ON events(tenantId);      -- Filter by tenant
CREATE INDEX ON events(cameraId);      -- Filter by camera
CREATE INDEX ON events(createdAt);     -- Sort by timestamp
```

---

## ✅ Requirements Met

- ✅ GET /events with pagination
- ✅ GET /events/:id with full details
- ✅ GET /events/byCamera/:cameraId
- ✅ All events filtered by tenantId
- ✅ Pagination: ?page=1&limit=50
- ✅ Event detail includes:
  - ✅ frigateId
  - ✅ camera info
  - ✅ label
  - ✅ timestamps (startTime, endTime)
  - ✅ flags (hasSnapshot, hasClip)
  - ✅ rawPayload

---

**Status:** ✅ Complete - All 24 tests passing
**Production Ready:** Yes
**Documentation:** Comprehensive
