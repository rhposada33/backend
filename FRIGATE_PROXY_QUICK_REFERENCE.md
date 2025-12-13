# Frigate Stream Proxy - Quick Reference

## Endpoint

```
GET /api/v1/streams/:cameraKey?format=hls
Authorization: Bearer {JWT_TOKEN}
```

## Request Examples

### HLS Stream (default)
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam"
```

### MJPEG Stream
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam?format=mjpeg"
```

### Snapshot (JPEG image)
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam?format=snapshot" \
     > snapshot.jpg
```

### WebRTC Stream (low latency)
```bash
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/v1/streams/garage_cam?format=webrtc"
```

## Response Types

| Format | Content-Type | Example |
|--------|--------------|---------|
| HLS | `application/vnd.apple.mpegurl` | `.m3u8` playlist |
| MJPEG | `multipart/x-mixed-replace` | Stream of JPEGs |
| WebRTC | `application/json` | Signaling data |
| Snapshot | `image/jpeg` | Single JPEG image |

## Error Responses

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad request (invalid format/key) | Invalid `format` parameter |
| 401 | Not authenticated | Missing JWT token |
| 403 | Camera not owned by tenant | Accessing other tenant's camera |
| 503 | Frigate unavailable | Frigate container stopped |
| 504 | Request timeout | Frigate took >30 seconds |
| 500 | Server error | Unexpected error |

## JavaScript Integration

### Using HLS.js

```javascript
import HLS from 'hls.js';

const video = document.getElementById('video');
const streamUrl = '/api/v1/streams/garage_cam';

if (HLS.isSupported()) {
  const hls = new HLS();
  hls.loadSource(streamUrl);
  hls.attachMedia(video);
  hls.play();
}
```

### Using Video.js

```html
<video id="video" class="video-js vjs-default-skin" controls>
  <source src="/api/v1/streams/garage_cam" type="application/x-mpegURL" />
</video>
```

```javascript
videojs('video', {
  controls: true,
  autoplay: true,
  preload: 'auto'
});
```

### Using WebRTC Player

```javascript
// Using webrtc-js library
const pc = new RTCPeerConnection();
const stream = await fetch('/api/v1/streams/garage_cam?format=webrtc')
  .then(r => r.json());

// Handle WebRTC signaling
pc.setRemoteDescription(new RTCSessionDescription(stream));
```

## Flow Diagram

```
Frontend Browser
      │
      │ GET /api/v1/streams/garage_cam
      │ With JWT Authorization header
      │
      ▼
Backend API (Express)
      │
      ├─ Verify JWT token (401 if invalid)
      │
      ├─ Extract tenantId from token
      │
      ├─ Query database:
      │  WHERE tenantId = user's tenant
      │    AND key = "garage_cam"
      │
      ├─ If not found: Return 403 Forbidden
      │
      ├─ Build Frigate URL:
      │  http://frigate:5000/api/camera/garage_cam/hls
      │
      ├─ Request from Frigate
      │
      └─ Stream response back to browser
           ├─ Preserve Content-Type header
           ├─ Set Cache-Control header
           └─ Pipe stream directly

Browser Video Player
      │
      └─ Display video from /api/v1/streams/...
```

## Security Checklist

- ✅ Authentication required (JWT)
- ✅ Tenant isolation enforced (database query)
- ✅ Camera ownership verified (unique constraint)
- ✅ Camera key URL-encoded (safe)
- ✅ Frigate URL hidden from browser (internal only)
- ✅ Error messages don't leak information
- ✅ Timeouts prevent hanging (30s)
- ✅ Headers check before responding

## Configuration

```bash
# .env file
FRIGATE_BASE_URL=http://frigate:5000

# Or for external Frigate
FRIGATE_BASE_URL=https://frigate.example.com:8443
```

## Camera Key Requirements

The `cameraKey` parameter must:
1. Exist in the database `cameras.key` field
2. Match exactly (case-sensitive)
3. Belong to the authenticated user's tenant
4. Correspond to a camera configured in Frigate

## Available Formats

### HLS (Default)
- Adaptive bitrate streaming
- Best for most use cases
- Works on all modern browsers
- Supports mobile devices

### MJPEG
- Fallback when HLS not available
- Older browser support
- Higher bandwidth usage
- Lower latency than HLS

### WebRTC
- Lowest latency (100-500ms)
- Real-time communication
- Requires signaling server
- Modern browsers only

### Snapshot
- Single frame JPEG
- Useful for thumbnails
- No streaming overhead
- Good for polling-based refresh

## Common Issues

### "Camera not found or does not belong to your tenant"
**Cause**: Camera doesn't exist or belongs to different tenant  
**Fix**: Check camera exists in database and belongs to your tenant

### "Frigate is unavailable or camera is offline"
**Cause**: Frigate not running or camera offline  
**Fix**: Start Frigate, verify camera is online

### "Invalid format"
**Cause**: Format parameter not in allowed list  
**Fix**: Use: `hls`, `mjpeg`, `webrtc`, or `snapshot`

### "Frigate request timed out"
**Cause**: Frigate took >30 seconds to respond  
**Fix**: Check Frigate health, increase timeout if needed

### CORS error in browser
**Cause**: CORS headers not configured  
**Fix**: Configure CORS in backend `.env`: `CORS_ORIGIN=http://localhost:3000`

## Performance Tips

1. **Use HLS for reliable streaming**
   - Better adaptive bitrate
   - Works over poor networks

2. **Use WebRTC for low-latency**
   - Requires modern browsers
   - Best for real-time monitoring

3. **Use Snapshot for fallback**
   - When streaming not available
   - For thumbnail views

4. **Monitor concurrent streams**
   - Each stream uses backend resources
   - Frigate has CPU/bandwidth limits

## Files Modified

```
backend/
├── src/
│   ├── modules/
│   │   ├── camera/
│   │   │   ├── proxy.ts              [NEW] Proxy service
│   │   │   ├── controller.ts         [MODIFIED] Added proxyStream()
│   │   │   └── router.ts             [MODIFIED] Added proxyStream import
│   │   └── streams/
│   │       ├── index.ts              [NEW] Module export
│   │       └── router.ts             [NEW] Proxy routes
│   └── api/
│       └── routes.ts                 [MODIFIED] Mount streamsRouter
│
└── FRIGATE_STREAM_PROXY_IMPLEMENTATION.md  [NEW] Full docs
```

## Summary

**Endpoint**: `GET /api/v1/streams/:cameraKey?format=hls`  
**Auth**: Required (JWT Bearer token)  
**Formats**: HLS (default), MJPEG, WebRTC, Snapshot  
**Security**: Tenant isolation + camera ownership verification  
**Status**: Production-ready for video player integration  
