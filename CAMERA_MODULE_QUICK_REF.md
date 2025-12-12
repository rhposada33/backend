# Camera Module Quick Reference

## Base URL
`/api/v1/cameras`

## Authentication
All endpoints require JWT in `Authorization: Bearer <token>` header

## Endpoints

### POST /cameras - Create
```bash
curl -X POST http://localhost:3000/api/v1/cameras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"front_door","label":"Front Door"}'
```
**Returns:** 201 Created | 409 Conflict | 400 Bad Request

### GET /cameras - List (Paginated)
```bash
curl "http://localhost:3000/api/v1/cameras?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```
**Returns:** 200 OK with pagination data

### GET /cameras/:id - Get Single
```bash
curl http://localhost:3000/api/v1/cameras/camera-id \
  -H "Authorization: Bearer $TOKEN"
```
**Returns:** 200 OK | 404 Not Found

### PUT /cameras/:id - Update
```bash
curl -X PUT http://localhost:3000/api/v1/cameras/camera-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"new_key","label":"New Label"}'
```
**Returns:** 200 OK | 404 Not Found | 409 Conflict

### DELETE /cameras/:id - Delete
```bash
curl -X DELETE http://localhost:3000/api/v1/cameras/camera-id \
  -H "Authorization: Bearer $TOKEN"
```
**Returns:** 204 No Content | 404 Not Found

---

## Request/Response

### Create Request
```json
{
  "key": "front_door",
  "label": "Front Door Camera"
}
```

### Camera Response
```json
{
  "id": "clyabc123xyz",
  "tenantId": "tenant-uuid",
  "key": "front_door",
  "label": "Front Door Camera",
  "createdAt": "2025-12-12T10:30:00.000Z"
}
```

### List Response
```json
{
  "data": [{ camera objects }],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## Validation

- **key:** Required, string, unique per tenant
- **label:** Optional, string
- **page:** >= 1 (default 1)
- **limit:** 1-500 (default 50)

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 204 | Deleted (DELETE) |
| 400 | Bad input |
| 401 | No/invalid token |
| 404 | Not found |
| 409 | Duplicate key |
| 500 | Server error |

---

## Key Features

✅ Tenant-scoped (automatic)  
✅ Frigate camera name support  
✅ Full CRUD operations  
✅ Pagination (1-500 items)  
✅ Cascade delete (events deleted with camera)  

---

## Documentation

Full documentation: **CAMERA_MODULE.md**
