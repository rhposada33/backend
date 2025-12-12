# Swagger / OpenAPI Documentation Setup

## Overview

Swagger/OpenAPI documentation has been successfully added to the Sateliteyes Guard backend API using `swagger-ui-express` and `swagger-jsdoc`.

## Installation

The following packages have been installed:

```bash
npm install swagger-ui-express
npm install --save-dev @types/swagger-ui-express
```

## Configuration

### Files Created

1. **`src/config/swagger.ts`** - Swagger configuration file
   - Defines OpenAPI 3.0.0 specification
   - Includes comprehensive schema definitions for all request/response models
   - Configures two server environments (development and production)
   - Points to compiled router files for JSDoc annotation parsing

2. **`src/types/swagger-jsdoc.d.ts`** - TypeScript type definitions for swagger-jsdoc
   - Required since swagger-jsdoc doesn't have official @types package

### Files Modified

1. **`src/server.ts`** - Added Swagger UI initialization
   - Import swagger-ui-express and swagger-jsdoc
   - Generate Swagger spec from JSDoc comments in router files
   - Serve Swagger JSON at `/docs/swagger.json`
   - Serve Swagger UI at `/docs`

2. **Router files** - Added JSDoc @swagger annotations
   - `src/modules/user/router.ts` - Auth endpoints
   - `src/modules/tenant/router.ts` - Tenant endpoints
   - `src/modules/camera/router.ts` - Camera endpoints
   - `src/modules/event/router.ts` - Event endpoints

## Endpoints

### Authentication (`/api/v1/auth`)
- **POST /auth/register** - Register new user
- **POST /auth/login** - Login user

### Tenants (`/api/v1/tenants`)
- **GET /tenants** - List all tenants (paginated)
- **GET /tenants/:id** - Get tenant by ID
- **POST /tenants** - Create new tenant (admin only)

### Cameras (`/api/v1/cameras`)
- **GET /cameras** - List cameras for authenticated user's tenant (paginated)
- **GET /cameras/:id** - Get camera by ID
- **POST /cameras** - Create new camera
- **PUT /cameras/:id** - Update camera
- **DELETE /cameras/:id** - Delete camera

### Events (`/api/v1/events`)
- **GET /events** - List events for authenticated user's tenant (paginated)
- **GET /events/:id** - Get event by ID
- **GET /events/byCamera/:cameraId** - Get events for specific camera (paginated)

## Schemas Documented

### Authentication Schemas
- `RegisterRequest` - User registration input
- `RegisterResponse` - User registration output with token
- `LoginRequest` - User login input
- `LoginResponse` - User login output with token

### Tenant Schemas
- `Tenant` - Tenant object
- `CreateTenantRequest` - Create tenant input
- `TenantListResponse` - Paginated tenant list

### Camera Schemas
- `Camera` - Camera object
- `CreateCameraRequest` - Create camera input
- `UpdateCameraRequest` - Update camera input
- `CameraListResponse` - Paginated camera list

### Event Schemas
- `Event` - Event object with full details
- `EventListResponse` - Paginated event list

### Error Schemas
- `ErrorResponse` - Standard error response
- `UnauthorizedError` - 401 error response
- `ForbiddenError` - 403 error response
- `NotFoundError` - 404 error response

## Security

All protected endpoints are documented with:
- **Bearer Authentication** - JWT token in Authorization header
- Proper `401 Unauthorized` and `403 Forbidden` response documentation
- Security scheme definition in OpenAPI spec

## Access the Documentation

### Swagger UI
```
http://localhost:3000/docs
```

Interactive API documentation with test capabilities.

### OpenAPI JSON Specification
```
http://localhost:3000/docs/swagger.json
```

Raw OpenAPI 3.0.0 specification in JSON format.

## How It Works

1. **JSDoc Comments** - Each router file contains `@swagger` tags documenting endpoints
2. **swagger-jsdoc** - Parses JSDoc comments from compiled `.js` files and generates OpenAPI spec
3. **swagger-ui-express** - Serves interactive Swagger UI at `/docs` endpoint
4. **Manual Spec Definition** - Schemas and security configurations defined in `swagger.ts`

## Response Format

All documented endpoints include:
- Summary and description
- Request/response schemas with examples
- HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Authentication requirements
- Pagination parameters for list endpoints

## Testing

To test the API documentation:

```bash
# Start the development server
npm run dev

# Or start compiled server
npm run build
npm start

# Visit in browser or curl
curl http://localhost:3000/docs/swagger.json | python3 -m json.tool
```

## Example Swagger Endpoint Documentation

```typescript
/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account and receive a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 */
```

## Benefits

✅ **Interactive Documentation** - Test endpoints directly from the UI  
✅ **Comprehensive Schemas** - All request/response types fully documented  
✅ **Auto-generated from Code** - Single source of truth with JSDoc comments  
✅ **OpenAPI Standard** - Compatible with code generation tools and other platforms  
✅ **Developer Friendly** - Clear examples and parameter descriptions  
✅ **Security Documented** - Bearer token authentication properly specified  

---

**Last Updated:** 2025-12-12  
**Status:** ✅ Complete
