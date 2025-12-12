#!/usr/bin/env cat
# 🔐 JWT Authentication Implementation

## Overview

Complete JWT-based authentication system with:
- User registration and login
- Password hashing with bcrypt
- JWT token generation and verification
- Authentication middleware for protected routes
- Multi-tenant user isolation

---

## 📦 Installed Packages

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

- **jsonwebtoken**: JWT token signing and verification
- **bcryptjs**: Password hashing and verification
- **Type definitions**: Full TypeScript support

---

## 🗄️ Database Schema

### User Model

```prisma
model User {
  id        String @id @default(cuid())
  email     String @unique
  password  String (hashed with bcrypt)
  tenantId  String
  tenant    Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@map("users")
}
```

**Key Features:**
- Unique email per user (prevents duplicates)
- Hashed password (never stored in plain text)
- Tenant association (multi-tenant isolation)
- Cascade delete (user deleted when tenant deleted)

---

## 🔑 JWT Token Structure

### Token Payload

```json
{
  "userId": "cldu4v9qj0000qz8r8j8r8r8j",
  "tenantId": "cldu4v9qj0001qz8r8j8r8r8j",
  "email": "user@example.com",
  "iat": 1702384800,
  "exp": 1703076000
}
```

### Token Configuration (from `.env`)

```env
JWT_SECRET=dev-secret-key-change-in-production-with-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-prod
JWT_EXPIRY=7d
```

**⚠️ Important:** Change `JWT_SECRET` to a secure random string in production!

---

## 📁 File Structure

```
src/auth/
├── jwt.ts           # Token signing/verification
├── password.ts      # Password hashing/verification
├── middleware.ts    # Auth middleware for routes
└── index.ts         # Module exports

src/routes/
└── auth.ts          # POST /auth/register, POST /auth/login

src/api/
└── routes.ts        # Protected route examples

src/server.ts        # Integration of auth routes
```

---

## 📚 Services

### JWT Service (`src/auth/jwt.ts`)

```typescript
// Sign a new token
signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string

// Verify and decode token
verifyToken(token: string): JWTPayload

// Extract token from "Bearer <token>" header
extractTokenFromHeader(authHeader?: string): string | null
```

### Password Service (`src/auth/password.ts`)

```typescript
// Hash a password with bcrypt
hashPassword(password: string): Promise<string>

// Verify password against hash
verifyPassword(password: string, hash: string): Promise<boolean>
```

### Auth Middleware (`src/auth/middleware.ts`)

```typescript
// Verify JWT and attach user to request
authMiddleware(req, res, next): void

// Optional: Require specific tenant
requireTenant(requiredTenantId: string): void
```

---

## 🔗 API Endpoints

### 1. Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_8chars_min",
  "tenantId": "existing_tenant_id",
  "tenantName": "New Company"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "cldu4v9qj0000qz8r8j8r8r8j",
    "email": "user@example.com",
    "tenantId": "cldu4v9qj0001qz8r8j8r8r8j",
    "tenantName": "New Company"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation:**
- Email and password required
- Password minimum 8 characters
- Email must be unique
- Either `tenantId` or `tenantName` required

### 2. Login User

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_8chars_min"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "cldu4v9qj0000qz8r8j8r8r8j",
    "email": "user@example.com",
    "tenantId": "cldu4v9qj0001qz8r8j8r8r8j",
    "tenantName": "New Company"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

---

## 🛡️ Using Auth Middleware

### Protect a Single Route

```typescript
import { authMiddleware } from '@/auth';

router.get('/profile', authMiddleware, (req, res) => {
  // Access authenticated user
  console.log(req.user); // { userId, tenantId, email }
  res.json({ message: 'User is authenticated' });
});
```

### Protect Multiple Routes

```typescript
import { authMiddleware } from '@/auth';

// All routes under /api/v1/* require authentication
app.use('/api/v1', authMiddleware, apiRouter);
```

### Access User Information

```typescript
import { AuthenticatedRequest } from '@/auth';

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    userId: req.user.userId,
    email: req.user.email,
    tenantId: req.user.tenantId,
  });
});
```

### Require Specific Tenant

```typescript
import { authMiddleware, requireTenant } from '@/auth';

router.get(
  '/tenant/:tenantId/data',
  authMiddleware,
  (req, res, next) => {
    const tenantId = req.params.tenantId;
    requireTenant(tenantId)(req as AuthenticatedRequest, res, next);
  },
  (req, res) => {
    res.json({ data: 'Tenant-specific data' });
  }
);
```

---

## 🔑 Client Usage (Frontend/Testing)

### 1. Register and Get Token

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123",
    "tenantName": "My Company"
  }'
```

**Response includes `token`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 3. Use Token in Protected Routes

```bash
curl -X GET http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Token Format:** `Bearer <token>`

---

## 📋 Error Handling

### Common Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 201 | Created | User registered successfully |
| 200 | OK | Login successful, token returned |
| 400 | Bad Request | Missing email/password, password too short |
| 401 | Unauthorized | Invalid credentials, token expired/invalid |
| 409 | Conflict | Email already registered |
| 500 | Server Error | Database error, token generation failed |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

---

## 🔒 Security Best Practices

### ✅ Implemented

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Signing**: HS256 algorithm with secret key
3. **Token Expiry**: Configurable expiration time (default 7 days)
4. **Multi-tenant Isolation**: All queries filtered by tenantId
5. **User Verification**: Checks user and tenant existence on auth middleware
6. **Input Validation**: Email format, password length requirements

### 🚨 Production Recommendations

1. **Update JWT_SECRET**
   ```env
   JWT_SECRET=<generate-with-openssl-rand-hex-32>
   ```

2. **Use HTTPS Only**
   ```
   All token transmission over HTTPS
   ```

3. **Implement Token Refresh**
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Refresh endpoint to get new access token

4. **Add Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const loginLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5 // 5 attempts
   });
   
   router.post('/login', loginLimiter, ...);
   ```

5. **Implement CORS Properly**
   ```env
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

6. **Add Logging**
   ```typescript
   console.log(`User ${userId} failed login attempt`);
   ```

7. **Monitor Token Usage**
   - Log all authentication events
   - Track failed login attempts
   - Alert on suspicious activity

8. **Implement Password Requirements**
   - Minimum 12 characters
   - Mixed case, numbers, special characters
   - No common passwords

---

## 🧪 Testing Examples

### With cURL

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234567",
    "tenantName": "Test Tenant"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234567"
  }'

# Access protected route
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer $TOKEN"
```

### With JavaScript/Node.js

```javascript
// Register
const registerResponse = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
    tenantName: 'My Company',
  }),
});

const { token } = await registerResponse.json();

// Use token in authenticated request
const protectedResponse = await fetch('http://localhost:3000/api/v1/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const userData = await protectedResponse.json();
console.log(userData);
```

---

## 📖 Type Definitions

```typescript
interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}
```

---

## 🐛 Troubleshooting

### "Invalid token"
- Check token format: `Bearer <token>`
- Verify token hasn't expired
- Ensure JWT_SECRET matches between signing and verification

### "User not found"
- User might have been deleted
- Check database connectivity

### "Tenant not found"
- Associated tenant was deleted
- Create new tenant or register with existing tenantId

### Password mismatch after hashing
- Normal! bcrypt produces different hashes for same password
- Always use `verifyPassword()` to compare

### CORS errors
- Update CORS_ORIGIN in .env
- Check browser console for specific origin issue

---

## 📝 Next Steps

1. ✅ JWT authentication implemented
2. ⏳ Add refresh token endpoint
3. ⏳ Implement password reset flow
4. ⏳ Add email verification
5. ⏳ Implement role-based access control (RBAC)
6. ⏳ Add OAuth2/OpenID Connect

---

## 📚 Related Documentation

- [PRISMA_SETUP.md](./PRISMA_SETUP.md) - Database configuration
- [README.md](./README.md) - Project overview

---

**Status**: ✅ IMPLEMENTED & READY TO USE
