# 🔌 WebSocket Setup Guide for Backend

## Issue Found

Your backend was **missing WebSocket support**. The frontend was trying to connect to `ws://localhost:3000/events` but there was no WebSocket endpoint.

---

## Solution Implemented

I've added:

1. ✅ **`express-ws` package** - WebSocket support for Express
2. ✅ **`src/modules/event/websocket.ts`** - WebSocket handler with:
   - JWT token verification from query string
   - Connection tracking by tenant
   - Message handling (subscribe, unsubscribe, ping)
   - Broadcasting capability
3. ✅ **Updated `server.ts`** - WebSocket server initialization

---

## Installation Steps

### Step 1: Install express-ws package

```bash
cd /home/rafa/satelitrack/backend
npm install express-ws
npm install --save-dev @types/express-ws
```

### Step 2: Verify installation

```bash
npm list express-ws
# Should show: express-ws@5.0.2 (or similar)
```

### Step 3: Start the backend

```bash
npm run dev
# or
npm run build && npm run start
```

**Expected output:**
```
🔌 WebSocket endpoint ready at ws://localhost:3000/api/v1/events
✅ API routers mounted at /api/v1
   - /auth (register, login)
   - /tenants (GET, POST, GET/:id)
   - /cameras (GET, POST, GET/:id, PUT, DELETE)
   - /events (GET, POST, GET/:id, GET/byCamera/:cameraId, WebSocket)
```

---

## Verify It's Working

### From Backend Terminal

You should see:
```
🔌 WebSocket connection attempt
✅ WebSocket connected: rafaelposada+33@gmail.com (...)
📨 WebSocket message from rafaelposada+33@gmail.com: subscribe
📤 Event broadcasted to 1 clients
```

### From Browser Console

Open your frontend app and check the console:

```javascript
// Should see
"✅ WebSocket connected"
"🟢 connected"
```

### Quick Test in Browser Console

```javascript
window.addEventListener('websocket:event', (e) => {
  console.log('✅ Received event:', e.detail);
});
```

If you see events appearing → **It's working!** 🎉

---

## How It Works

### Connection Flow

```
Frontend
  ↓
Tries: ws://localhost:3000/api/v1/events?token=<JWT>
  ↓
Backend WebSocket Handler
  ↓
Verifies JWT token
  ↓
✅ Connection established
  ↓
Starts listening for messages
```

### Message Types

**Client can send:**
```json
{
  "type": "subscribe",
  "channel": "events"
}
```

**Server responds with:**
```json
{
  "type": "subscribed",
  "channel": "events",
  "message": "Subscribed to events"
}
```

**Server sends events:**
```json
{
  "type": "event",
  "data": {
    "id": "event-123",
    "type": "alarm",
    "message": "Motion detected",
    "camera": "Front Door"
  },
  "timestamp": "2025-12-12T14:30:00Z"
}
```

---

## Broadcasting Events

When you create or update an event in your backend, use:

```typescript
import { broadcastEventToTenant } from './modules/event/websocket.js';

// In your event controller or service
broadcastEventToTenant(tenantId, {
  id: event.id,
  type: 'alarm',
  message: 'Motion detected',
  camera: cameraName,
  severity: 'high',
  timestamp: new Date().toISOString(),
});
```

---

## Files Changed

```
backend/src/
├── server.ts                          ← Updated (added WebSocket support)
└── modules/event/
    └── websocket.ts                   ← NEW (WebSocket handler)
```

### Changes in `server.ts`:
1. Added `import expressWs from 'express-ws'`
2. Changed: `const app = express()` to enable WebSocket support
3. Added WebSocket route: `/api/v1/events`

### New File: `websocket.ts`:
- `handleEventWebSocket()` - Main connection handler
- `broadcastEventToTenant()` - Send events to specific tenant clients
- `broadcastToAll()` - Send events to all clients
- Connection tracking and management

---

## Testing

### Test 1: Backend Running

```bash
curl http://localhost:3000/health
# Should return 200 OK
```

### Test 2: WebSocket Connection

```bash
# Install wscat if not already installed
npm install -g wscat

# Connect to WebSocket
wscat -c "ws://localhost:3000/api/v1/events?token=YOUR_JWT_TOKEN"

# In wscat prompt, send:
{"type": "ping"}

# Should receive:
{"type": "pong", "timestamp": "2025-12-12T14:30:00Z"}
```

### Test 3: Frontend Connection

1. Open frontend in browser
2. Open DevTools Console
3. Go to any dashboard page
4. Should see: `✅ WebSocket connected`
5. Status should show: `🟢 connected`

---

## Troubleshooting

### Issue: express-ws package not found

**Solution:**
```bash
npm install express-ws @types/express-ws
npm run dev
```

### Issue: WebSocket connection refused

**Check:**
1. Backend is running: `curl http://localhost:3000/health`
2. Port 3000 is open: `lsof -i :3000`
3. Check backend logs for errors

### Issue: "Invalid token" error

**Check:**
1. Frontend is sending valid JWT token
2. Token hasn't expired
3. Backend JWT_SECRET matches

### Issue: Events not being broadcasted

**Check:**
1. Event is being created in backend
2. Call `broadcastEventToTenant()` in event creation code
3. Clients are connected (check backend logs)

---

## Next Steps

### In Your Event Module

Add broadcasting to your event controller:

```typescript
import { broadcastEventToTenant } from './websocket.js';

export async function createEvent(req: Request, res: Response) {
  // ... create event ...

  // Broadcast to all connected clients in this tenant
  broadcastEventToTenant(req.user!.tenantId, {
    type: 'event',
    id: event.id,
    message: event.description,
    camera: event.cameraId,
    severity: event.severity,
    timestamp: event.createdAt,
  });

  res.json(event);
}
```

---

## Summary

✅ **Added WebSocket support to backend**  
✅ **JWT token verification in WebSocket**  
✅ **Connection management by tenant**  
✅ **Message handling and broadcasting**  
✅ **Ready for real-time events**

**Status:** Ready to connect and stream events! 🚀

---

## Commands

```bash
# Install dependencies
npm install express-ws @types/express-ws

# Start backend
npm run dev

# Watch logs
npm run dev 2>&1 | grep -i websocket

# Test connection
wscat -c "ws://localhost:3000/api/v1/events?token=YOUR_TOKEN"
```

---

**Date:** December 12, 2025  
**Status:** ✅ WebSocket Backend Implementation Complete
