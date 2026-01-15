/**
 * Camera Controller
 * Request handlers for camera management endpoints
 * All operations are scoped to the authenticated user's tenantId
 *
 * LIVESTREAM ARCHITECTURE:
 * ========================
 *
 * Frontend Access:
 * - Frontend NEVER accesses Frigate directly
 * - All livestream requests go through this controller
 * - Backend generates/proxies/forwards livestream URLs
 *
 * Tenant Scoping Requirements:
 * - CRITICAL: Always verify camera belongs to user's tenant
 * - Check: camera.tenantId === req.user.tenantId
 * - Failure to validate = Security vulnerability
 *
 * Camera Key Validation:
 * - The camera.key must EXACTLY match Frigate camera name
 * - Example: camera.key = "garage_camera" → Frigate must have camera named "garage_camera"
 * - This mapping is critical for livestream access
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for complete documentation
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import * as cameraService from './service.js';
import * as proxyService from './proxy.js';

/**
 * POST /cameras
 * Create a new camera for the authenticated user's tenant
 */
export async function createCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { key, label, isEnabled, ip, port, username, password } = req.body;

    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Validate required field
    if (!key || typeof key !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Camera key is required and must be a string',
      });
      return;
    }
    // Validate optional label
    if (label !== undefined && typeof label !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Label must be a string',
      });
      return;
    }

    if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'isEnabled must be a boolean',
      });
      return;
    }

    if (ip !== undefined && typeof ip !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'ip must be a string',
      });
      return;
    }

    if (port !== undefined && (typeof port !== 'number' || Number.isNaN(port))) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'port must be a number',
      });
      return;
    }

    if (username !== undefined && typeof username !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'username must be a string',
      });
      return;
    }

    if (password !== undefined && typeof password !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'password must be a string',
      });
      return;
    }

    const camera = await cameraService.createCamera(req.user.tenantId, {
      frigateCameraKey: key,
      label,
      ip,
      port,
      username,
      password,
    });

    res.status(201).json({
      data: camera,
    });
  } catch (error) {
    console.error('Create camera error:', error);

    // Handle specific error messages
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message.includes('required')) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create camera',
    });
  }
}

/**
 * GET /cameras
 * Get all cameras for the authenticated user's tenant
 * Supports pagination: ?page=1&limit=50
 */
export async function listCameras(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 500) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'page must be >= 1, limit must be between 1 and 500',
      });
      return;
    }

    const skip = (page - 1) * limit;

    const result = await cameraService.getCamerasByTenant(req.user.tenantId, skip, limit);

    res.status(200).json({
      data: result.cameras,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('List cameras error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get cameras',
    });
  }
}

/**
 * GET /cameras/:id
 * Get a single camera by ID
 */
export async function getCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    const camera = await cameraService.getCameraById(req.user.tenantId, id);

    if (!camera) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Camera not found',
      });
      return;
    }

    res.status(200).json({
      data: camera,
    });
  } catch (error) {
    console.error('Get camera error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get camera',
    });
  }
}

/**
 * PUT /cameras/:id
 * Update a camera's key and/or label
 */
export async function updateCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;
    const { key, label, isEnabled, ip, port, username, password } = req.body;

    // Validate input - at least one field must be provided
    if (key === undefined && label === undefined && isEnabled === undefined && ip === undefined && port === undefined && username === undefined && password === undefined) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'At least one field must be provided',
      });
      return;
    }

    // Validate types if provided
    if (key !== undefined && typeof key !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'key must be a string',
      });
      return;
    }

    if (label !== undefined && typeof label !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'label must be a string',
      });
      return;
    }

    if (isEnabled !== undefined && typeof isEnabled !== 'boolean') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'isEnabled must be a boolean',
      });
      return;
    }

    if (ip !== undefined && typeof ip !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'ip must be a string',
      });
      return;
    }

    if (port !== undefined && (typeof port !== 'number' || Number.isNaN(port))) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'port must be a number',
      });
      return;
    }

    if (username !== undefined && typeof username !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'username must be a string',
      });
      return;
    }

    if (password !== undefined && typeof password !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'password must be a string',
      });
      return;
    }

    const camera = await cameraService.updateCamera(req.user.tenantId, id, {
      frigateCameraKey: key,
      label,
      isEnabled,
      ip,
      port,
      username,
      password,
    });

    res.status(200).json({
      data: camera,
    });
  } catch (error) {
    console.error('Update camera error:', error);

    // Handle specific error messages
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update camera',
    });
  }
}

/**
 * DELETE /cameras/:id
 * Delete a camera (cascade deletes related events)
 */
export async function deleteCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;

    await cameraService.deleteCamera(req.user.tenantId, id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete camera error:', error);

    // Handle specific error messages
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete camera',
    });
  }
}

/**
 * GET /cameras/streams
 * Get all cameras with livestream information for the authenticated user's tenant
 *
 * Returns an array of CameraStream objects with constructed livestream URLs
 * Frontend uses these URLs to access camera streams
 *
 * SECURITY:
 * - Enforces tenant scoping at both middleware and database levels
 * - Does NOT expose raw Frigate credentials
 * - Constructs URLs through backend to enable future access control
 */
export async function getCameraStreams(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Fetch all cameras with livestream URLs for this tenant
    const streams = await cameraService.getCameraStreams(req.user.tenantId);

    res.status(200).json({
      data: streams,
      count: streams.length,
    });
  } catch (error) {
    console.error('Get camera streams error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve camera streams',
    });
  }
}

/**
 * GET /streams/:cameraKey
 * Proxy a livestream from Frigate to the client
 *
 * Behavior:
 * 1. Authenticate user via JWT
 * 2. Extract tenantId from token
 * 3. Verify camera key belongs to tenant (security)
 * 4. Proxy HLS stream from Frigate
 * 5. Preserve content-type headers
 * 6. Handle errors gracefully (camera offline, etc)
 *
 * SECURITY:
 * - Frontend never has direct Frigate URL
 * - Camera ownership verified at database level
 * - Only tenant's cameras accessible
 * - Frigate URL completely hidden from browser
 *
 * Query Parameters (optional):
 * - ?format=hls|mjpeg|webrtc|snapshot  (default: hls)
 */
export async function proxyStream(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { cameraKey } = req.params;
    const format = (req.query.format as string) || 'hls';

    // Validate camera key
    if (!cameraKey || typeof cameraKey !== 'string' || cameraKey.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Camera key is required',
      });
      return;
    }

    // Validate format
    const validFormats = ['hls', 'mjpeg', 'webrtc', 'snapshot'];
    if (!validFormats.includes(format)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
      });
      return;
    }

    // Proxy the stream through service
    // Service handles:
    // - Camera ownership verification (tenant scoping)
    // - Frigate request
    // - Error handling
    // - Header preservation
    await proxyService.proxyFrigateStream(
      req.user.tenantId,
      cameraKey.trim(),
      format as any,
      res
    );
  } catch (error) {
    console.error('Proxy stream error:', error);

    // Only send error response if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to proxy stream',
      });
    }
  }
}

/**
 * WebSocket handler for jsmpeg stream
 * Proxies WebSocket connection from client to Frigate
 *
 * This is called via express-ws middleware on WebSocket upgrade
 * See router.ts for route definition
 */
export async function proxyJsmpegStream(ws: any, req: any): Promise<void> {
  try {
    // Import jwt here to avoid circular dependencies
    const { default: jwt } = await import('jsonwebtoken');
    const { config } = await import('../../config/index.js');
    const { proxyFrigateWebSocketStream } = await import('./proxy.js');

    console.log('[WebSocket] Connection established, parsing request...');
    console.log('[WebSocket] URL:', req.url);

    // Parse URL to extract parameters
    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Extract camera key from pathname: /api/v1/cameras/streams/:cameraKey
    const pathParts = pathname.split('/');
    const cameraKeyIndex = pathParts.indexOf('streams');
    const cameraKey = cameraKeyIndex !== -1 && cameraKeyIndex + 1 < pathParts.length
      ? pathParts[cameraKeyIndex + 1]
      : null;

    // Extract query parameters
    const token = searchParams.get('jwt') || searchParams.get('token_param') || '';
    const frigateToken = searchParams.get('token') || '';
    const testMode = searchParams.get('test') === 'true';

    console.log('[WebSocket] Parsed:', { cameraKey, hasToken: !!token, hasFrigateToken: !!frigateToken, testMode });

    if (!token) {
      console.log('❌ WebSocket: No JWT token provided');
      if (ws.send) ws.send(JSON.stringify({ error: 'No JWT token' }));
      ws.close?.();
      return;
    }

    // 2. Verify JWT token
    let decoded: any;
    try {
      console.log('[WebSocket] JWT token received:', token.substring(0, 50) + '...' + token.substring(token.length - 20));
      console.log('[WebSocket] JWT secret being used:', config.jwtSecret.substring(0, 10) + '...');
      decoded = jwt.verify(token, config.jwtSecret as string) as {
        sub?: string;
        userId?: string;
        email?: string;
        tenantId?: string;
        iat: number;
        exp: number;
      };
    } catch (error) {
      console.log('❌ WebSocket: Invalid JWT token', error);
      ws.close?.();
      return;
    }

    const userId = decoded.userId || decoded.sub;
    const tenantId = decoded.tenantId;
    const email = decoded.email;

    if (!userId || !tenantId) {
      console.log('❌ WebSocket: Invalid token payload');
      ws.close?.();
      return;
    }

    console.log(`✅ WebSocket authenticated: ${email} (${userId})`);

    // Validate camera key
    if (!cameraKey || cameraKey === 'streams' || cameraKey.endsWith('.websocket')) {
      console.log('❌ Camera key invalid', { cameraKey });
      ws.close?.();
      return;
    }

    // Validate frigate token
    if (!frigateToken) {
      console.log('❌ Frigate token missing');
      ws.close?.();
      return;
    }

    console.log(`[WebSocket] jsmpeg stream request for camera: ${cameraKey} by tenant: ${tenantId}`);

    console.log('[WebSocket] Calling proxy service...', { testMode });
    
    await proxyFrigateWebSocketStream(
      tenantId,
      cameraKey.trim(),
      ws,
      Buffer.alloc(0),
      frigateToken,
      testMode
    );
  } catch (error) {
    console.error('WebSocket proxy error:', error);
    try {
      ws.close?.();
    } catch (e) {
      console.error('Error closing WebSocket:', e);
    }
  }
}

/**
 * ============================================================================
 * LIVESTREAM ENDPOINTS - TODO: Implement before enabling streaming features
 * ============================================================================
 *
 * These endpoints will handle camera livestream access.
 * CRITICAL Requirements:
 * 1. Tenant Scoping: Verify camera.tenantId === req.user.tenantId
 * 2. Camera Key: Verify camera.key matches Frigate camera name
 * 3. Frontend Access: Frontend must NOT access Frigate directly
 * 4. URL Generation: Backend generates all livestream URLs
 * 5. Error Handling: Handle Frigate unavailable, camera offline, etc.
 *
 * Planned Endpoints:
 * - GET /cameras/:id/stream              → Get livestream URL + status
 * - GET /cameras/:id/stream/webrtc       → WebRTC stream (low latency)
 * - GET /cameras/:id/stream/mjpeg        → MJPEG stream (fallback)
 * - GET /cameras/:id/stream/hls          → HLS stream (reliable)
 * - GET /cameras/:id/stream/status       → Stream status only
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for full API design
 */

// TODO: getCameraStream(req: AuthenticatedRequest, res: Response): Promise<void>
// TODO: getCameraWebRTCStream(req: AuthenticatedRequest, res: Response): Promise<void>
// TODO: getCameraMJPEGStream(req: AuthenticatedRequest, res: Response): Promise<void>
// TODO: getCameraHLSStream(req: AuthenticatedRequest, res: Response): Promise<void>
// TODO: getCameraStreamStatus(req: AuthenticatedRequest, res: Response): Promise<void>
