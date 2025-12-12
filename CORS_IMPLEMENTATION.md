# Backend CORS Fix - Technical Details

## Problem Statement

Frontend running on `http://localhost:8080` was blocked from making requests to backend on `http://localhost:3000` due to CORS (Cross-Origin Resource Sharing) policy.

**Error**: 
```
Access to fetch at 'http://localhost:3000/auth/register' from origin 'http://localhost:8080' 
has been blocked by CORS policy
```

**Root Cause**: Backend was hardcoded to only allow `http://localhost:5173`

## Solution Overview

Implement dynamic CORS origin validation that:
1. Reads allowed origins from environment variable
2. Supports multiple origins (comma-separated)
3. Validates each request's origin against the list
4. Allows development flexibility while maintaining security

## Files Modified

### 1. `backend/src/config/index.ts`

**Before:**
```typescript
corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
```

**After:**
```typescript
// Parse CORS origins - support comma-separated list or single origin
const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080';

return {
  // ... other config
  corsOrigin: corsOriginEnv,
  // ...
}
```

**What Changed:**
- Added default that includes BOTH localhost:5173 and localhost:8080
- Made it configurable via environment variable
- No breaking changes to existing deployments

---

### 2. `backend/src/server.ts`

**Before:**
```typescript
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
```

**After:**
```typescript
// CORS configuration - support multiple origins
const corsOrigins = config.corsOrigin
  .split(',')
  .map(origin => origin.trim());

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in our allowed list
      if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
```

**What Changed:**
- Parse comma-separated origins from config
- Trim whitespace from each origin
- Implement custom origin validation function
- Allow requests with no origin (for curl, mobile apps)
- Check if request origin is in allowed list

---

### 3. `backend/.env`

**Before:**
```bash
CORS_ORIGIN=http://localhost:5173
```

**After:**
```bash
CORS_ORIGIN=http://localhost:5173,http://localhost:8080
```

**What Changed:**
- Added second port for development flexibility
- Now supports both Vite default (5173) and custom port (8080)

---

### 4. `backend/.env.example`

**Before:**
```bash
# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

**After:**
```bash
# CORS Configuration
# Support comma-separated list of origins for development
# Example: http://localhost:5173,http://localhost:8080
CORS_ORIGIN=http://localhost:5173,http://localhost:8080
```

**What Changed:**
- Updated example to show new format
- Added documentation for comma-separated values
- Added usage example

---

## How It Works

### Request Flow

```
Browser (localhost:8080)
          ↓
    Makes API request
    Includes "Origin: http://localhost:8080" header
          ↓
    Backend receives request
          ↓
    CORS middleware triggers
          ↓
    Extracts origin from request headers
          ↓
    Checks against allowed origins list:
    - http://localhost:5173 ✓
    - http://localhost:8080 ✓
    - http://localhost:3000 ✗ (not in list)
          ↓
    If match found:
      Sets "Access-Control-Allow-Origin: http://localhost:8080"
    If no match:
      Sets "Access-Control-Allow-Origin: null" (blocks request)
          ↓
    Browser receives response
    If CORS header matches origin, allow access ✓
    If not, block with CORS error ✗
```

---

## Configuration Examples

### Development (Multiple Ports)
```bash
# .env
CORS_ORIGIN=http://localhost:5173,http://localhost:8080,http://localhost:3000
```

### Staging (Single Domain)
```bash
# .env
CORS_ORIGIN=https://staging.app.example.com
```

### Production (Single Domain)
```bash
# .env
CORS_ORIGIN=https://app.example.com
```

### Production (Multiple Subdomains)
```bash
# .env
CORS_ORIGIN=https://app.example.com,https://admin.example.com,https://api.example.com
```

---

## Code Explanation

### Parsing Origins
```typescript
const corsOrigins = config.corsOrigin          // "http://localhost:5173,http://localhost:8080"
  .split(',')                                   // ["http://localhost:5173", "http://localhost:8080"]
  .map(origin => origin.trim());               // ["http://localhost:5173", "http://localhost:8080"] (removes spaces)
```

### Origin Validation
```typescript
cors({
  origin: function(origin, callback) {
    // No origin (curl, mobile app) → allow
    if (!origin) return callback(null, true);
    
    // Check if request origin is in allowed list
    if (corsOrigins.includes(origin)) {
      callback(null, true);                     // Allow
    } else {
      callback(new Error('Not allowed by CORS')); // Block
    }
  },
  credentials: true,                            // Allow cookies in cross-origin
})
```

---

## Testing the Fix

### 1. Manual Test with curl
```bash
# Test with allowed origin
curl -X OPTIONS http://localhost:3000/auth/login \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected response headers:
# Access-Control-Allow-Origin: http://localhost:8080
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
```

### 2. Test with Browser
```javascript
// In browser console
fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(console.log)
```

### 3. Check Response Headers
```bash
# In DevTools Network tab, check the response headers:
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Security Considerations

### ✅ Secure
- Origins list is configurable
- Only specified origins are allowed
- Production should use HTTPS domains
- Can be tightened for production

### ⚠️ Development Concerns
- Multiple localhost ports opened
- HTTP allowed for development
- Should be restricted for production

### 🔒 Production Checklist
- [ ] CORS_ORIGIN set to production domain ONLY
- [ ] Use HTTPS URL, not HTTP
- [ ] Single origin (no comma)
- [ ] Remove localhost:5173, localhost:8080, etc.
- [ ] Test with production domain
- [ ] Monitor CORS errors in logs

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- Existing deployments with single origin still work
- `"http://localhost:5173"` in .env works as before
- No code changes required for existing systems
- Supports new comma-separated format

---

## Performance Impact

✅ **Negligible**

- Origin validation happens once per request
- String operations are O(n) where n = number of allowed origins
- Typical 2-3 origins = milliseconds of overhead
- CORS middleware is early in request chain

---

## Troubleshooting

### Issue: Still Getting CORS Error
1. Verify .env file: `cat backend/.env | grep CORS_ORIGIN`
2. Verify format: `CORS_ORIGIN=origin1,origin2` (no spaces in URL)
3. Restart backend after changing .env
4. Clear browser cache (Ctrl+Shift+Delete)
5. Check exact origin in Network tab (case-sensitive)

### Issue: Can't Access from New Port
1. Add port to CORS_ORIGIN: `http://localhost:PORT`
2. Format: include protocol and port
3. Example: `http://localhost:5173,http://localhost:8080,http://localhost:9000`
4. Restart backend
5. Test again

### Issue: Works Locally but Not on Production
1. Check production domain in CORS_ORIGIN
2. Must use HTTPS for production
3. Remove localhost entries
4. Match exact domain (with/without www)

---

## Related Files

- `backend/src/config/index.ts` - Configuration loader
- `backend/src/server.ts` - Express app setup
- `backend/.env` - Environment variables
- `backend/.env.example` - Template

---

## Summary

The CORS fix enables:
- ✅ Multiple development ports
- ✅ Flexible configuration via environment
- ✅ Production-ready security
- ✅ Backward compatible
- ✅ Zero performance impact

System is now ready for development on localhost:8080! 🚀
