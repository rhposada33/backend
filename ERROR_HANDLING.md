# Error Handling Middleware Documentation

## Overview

A comprehensive global error handling middleware for the Sateliteyes backend that:
- ✅ Catches all thrown errors (sync and async)
- ✅ Maps errors to appropriate HTTP status codes
- ✅ Returns structured JSON error responses
- ✅ Handles validation, authentication, authorization, and database errors
- ✅ Includes stack traces in development mode
- ✅ Provides proper logging at different levels

---

## Error Response Format

All errors are returned in a consistent JSON format:

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "status": 400,
    "timestamp": "2025-12-12T16:30:00.000Z"
  }
}
```

### Development Mode (with stack trace)
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Connection failed",
    "status": 500,
    "timestamp": "2025-12-12T16:30:00.000Z",
    "stack": [
      "Error: Connection failed",
      "  at DatabaseConnection.connect (/path/to/db.ts:42:15)",
      "  ..."
    ]
  }
}
```

### Validation Error (with details)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "status": 400,
    "timestamp": "2025-12-12T16:30:00.000Z",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 6 characters"
    }
  }
}
```

---

## Error Classes

### ApiError (Base Class)
Base error class for all custom API errors.

```typescript
throw new ApiError('Something went wrong', 400, 'CUSTOM_ERROR');
```

**Parameters:**
- `message` (string) - Error message
- `status` (number, default: 500) - HTTP status code
- `code` (string, default: 'INTERNAL_ERROR') - Error code

---

### ValidationError
For validation failures and invalid input.

```typescript
throw new ValidationError('Validation failed', {
  email: 'Invalid email format',
  password: 'Password too short'
});
```

**Response Status:** 400 Bad Request  
**Error Code:** VALIDATION_ERROR

---

### AuthenticationError
For authentication failures (missing/invalid token).

```typescript
throw new AuthenticationError('Token expired');
```

**Response Status:** 401 Unauthorized  
**Error Code:** AUTHENTICATION_ERROR

---

### AuthorizationError
For insufficient permissions.

```typescript
throw new AuthorizationError('Only admins can perform this action');
```

**Response Status:** 403 Forbidden  
**Error Code:** AUTHORIZATION_ERROR

---

### NotFoundError
For missing resources.

```typescript
throw new NotFoundError('User not found');
```

**Response Status:** 404 Not Found  
**Error Code:** NOT_FOUND

---

### DatabaseError
For database operation failures.

```typescript
throw new DatabaseError('Failed to save user', originalError);
```

**Response Status:** 500 Internal Server Error  
**Error Code:** DATABASE_ERROR

---

## Usage Examples

### In Route Handlers

#### Synchronous Error
```typescript
router.post('/users', (req, res, next) => {
  if (!req.body.email) {
    return next(new ValidationError('Email is required'));
  }

  // Process request
  res.json({ success: true });
});
```

#### Asynchronous Error with asyncHandler
```typescript
import { asyncHandler } from '../middleware/errorHandler.js';

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
}));
```

#### Manual Promise Error Handling
```typescript
router.get('/data', (req, res, next) => {
  fetchData()
    .then(data => res.json(data))
    .catch(err => next(err)); // Pass to error handler
});
```

---

## Automatic Error Detection

The middleware automatically detects and maps errors based on error type and message:

### Detection Rules

| Error Type | Detection | Status | Code |
|------------|-----------|--------|------|
| PrismaClientUniqueConstraintError | Unique constraint violation | 409 | CONFLICT |
| PrismaClientNotFoundError | Resource not found | 404 | NOT_FOUND |
| PrismaClientValidationError | Invalid input | 400 | VALIDATION_ERROR |
| Other PrismaClientError | Database operation failed | 500 | DATABASE_ERROR |
| JsonWebTokenError | Token expired/invalid | 401 | TOKEN_EXPIRED/INVALID_TOKEN |
| ValidationError message | Contains "invalid", "required" | 400 | VALIDATION_ERROR |
| NotFound message | Contains "not found" | 404 | NOT_FOUND |
| Permission message | Contains "unauthorized", "forbidden" | 401 | AUTHORIZATION_ERROR |

---

## HTTP Status Codes

### 400 Bad Request
Returned for:
- Validation errors
- Invalid input parameters
- Malformed requests
- Missing required fields

### 401 Unauthorized
Returned for:
- Missing authentication token
- Invalid or expired JWT token
- Token verification failed

### 403 Forbidden
Returned for:
- Insufficient permissions
- User lacks required role/privilege
- Access denied

### 404 Not Found
Returned for:
- Resource doesn't exist
- Endpoint not found
- Resource deleted

### 409 Conflict
Returned for:
- Unique constraint violations (duplicate entries)
- Resource already exists
- Conflicting operations

### 500 Internal Server Error
Returned for:
- Database errors (except validation)
- Unexpected errors
- Server-side failures
- Unhandled exceptions

---

## Error Codes Reference

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| AUTHENTICATION_ERROR | 401 | Authentication required or failed |
| TOKEN_EXPIRED | 401 | JWT token has expired |
| INVALID_TOKEN | 401 | JWT token is invalid |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Unique constraint violated |
| DATABASE_ERROR | 500 | Database operation failed |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |

---

## Logging

The middleware logs errors at appropriate levels based on status code:

### Error Level (5xx errors)
```
[DATABASE_ERROR] Failed to connect to database
Error: connection timeout
    at DatabaseConnection.connect...
```

### Warning Level (4xx errors)
```
[NOT_FOUND] User not found
```

### Info Level (informational)
```
[VALIDATION_ERROR] Invalid email format
```

---

## Integration with Routes

### In Express Routes
```typescript
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';

router.post('/users', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Email is required');
  }

  const user = await prisma.user.create({
    data: req.body
  });

  res.status(201).json(user);
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
}));
```

### In Services
```typescript
import { ValidationError, DatabaseError } from '../middleware/errorHandler.js';

export async function createUser(data) {
  if (!data.email) {
    throw new ValidationError('Email is required');
  }

  try {
    return await prisma.user.create({ data });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ValidationError('Email already exists');
    }
    throw new DatabaseError('Failed to create user', error);
  }
}
```

---

## Development vs Production

### Development Mode
- ✅ Full stack traces included in error responses
- ✅ All error details shown to help debugging
- ✅ Console logs with full error information

### Production Mode (NODE_ENV !== 'development')
- ✅ Stack traces excluded from error responses
- ✅ Only error message and code shown
- ✅ Sensitive information not exposed
- ✅ Console logs still available for server-side debugging

---

## Best Practices

### 1. Always Use Appropriate Error Class
```typescript
// ✅ Good
throw new ValidationError('Invalid email');
throw new NotFoundError('User not found');
throw new AuthenticationError('Token invalid');

// ❌ Avoid
throw new Error('Invalid email'); // Generic error
```

### 2. Wrap Async Code with asyncHandler
```typescript
// ✅ Good
router.get('/data', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));

// ❌ Avoid (errors won't be caught)
router.get('/data', async (req, res) => {
  const data = await fetchData(); // Unhandled promise rejection
  res.json(data);
});
```

### 3. Always Validate Input Early
```typescript
// ✅ Good
if (!email || !password) {
  throw new ValidationError('Email and password required');
}

// ❌ Avoid
try {
  user.email = email; // Might be undefined
} catch (e) {
  // Error handling after the fact
}
```

### 4. Use Custom Error Details for Validation
```typescript
// ✅ Good
throw new ValidationError('Validation failed', {
  email: 'Invalid format',
  password: 'Too short'
});

// ❌ Avoid
throw new ValidationError('Validation failed'); // No details
```

### 5. Chain Errors for Context
```typescript
// ✅ Good
try {
  await db.save();
} catch (err) {
  throw new DatabaseError('Failed to save user', err);
}

// ❌ Avoid
try {
  await db.save();
} catch (err) {
  throw err; // Lost context
}
```

---

## Testing Error Handling

### Unit Tests
```typescript
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

test('should throw validation error for missing email', () => {
  expect(() => {
    createUser({ password: '123456' });
  }).toThrow(ValidationError);
});
```

### Integration Tests
```typescript
test('should return 404 for non-existent user', async () => {
  const res = await request(app)
    .get('/api/v1/users/nonexistent')
    .expect(404);

  expect(res.body).toEqual({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'User not found',
      status: 404,
      timestamp: expect.any(String)
    }
  });
});
```

---

## Common Error Scenarios

### Scenario 1: User Registration with Validation
```typescript
router.post('/auth/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ValidationError('Email and password required', {
      email: !email ? 'Required' : undefined,
      password: !password ? 'Required' : undefined
    });
  }

  if (password.length < 6) {
    throw new ValidationError('Password validation failed', {
      password: 'Must be at least 6 characters'
    });
  }

  try {
    const user = await prisma.user.create({
      data: { email, password }
    });

    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ValidationError('Email already registered');
    }
    throw new DatabaseError('Registration failed', error);
  }
}));
```

### Scenario 2: Resource Access with Auth Check
```typescript
router.delete('/users/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.tenantId !== req.user.tenantId && !req.user.isAdmin) {
    throw new AuthorizationError('Cannot delete users from other tenants');
  }

  await prisma.user.delete({ where: { id: req.params.id } });

  res.status(204).send();
}));
```

---

## Troubleshooting

### Error Not Being Caught
**Problem:** Async errors not being handled  
**Solution:** Use `asyncHandler` wrapper or add `.catch(next)` to promises

### Stack Trace Not Showing in Development
**Problem:** NODE_ENV not set to 'development'  
**Solution:** Set `NODE_ENV=development` in `.env` file

### Error Response Format Different
**Problem:** Custom route error handling overriding global handler  
**Solution:** Ensure error handler is registered LAST: `app.use(errorHandler)`

---

## Migration from Old Error Handling

### Before
```typescript
catch (error) {
  res.status(500).json({ error: 'Something went wrong' });
}
```

### After
```typescript
catch (error) {
  next(new DatabaseError('Operation failed', error));
}
```

---

**Last Updated:** 2025-12-12  
**Version:** 1.0.0  
**Status:** Production Ready
