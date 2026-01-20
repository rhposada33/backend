/**
 * Frigate Proxy Service
 * Handles proxying requests to Frigate for livestreams
 *
 * IMPORTANT ARCHITECTURE:
 * - Backend acts as proxy/gateway to Frigate
 * - Frontend never has direct access to Frigate URLs
 * - All stream requests go through backend for access control
 * - Frigate is internal only (http://frigate:5000)
 * - Backend proxies to client with correct headers
 */

import { Response } from 'express';
import http from 'http';
import https from 'https';
import WebSocket from 'ws';
import { config } from '../../config/index.js';
import { prisma } from '../../db/client.js';

/**
 * Stream format types available in Frigate
 */
export type StreamFormat = 'hls' | 'mjpeg' | 'webrtc' | 'snapshot' | 'jsmpeg';

/**
 * Content-Type headers for different stream formats
 */
const STREAM_CONTENT_TYPES: Record<StreamFormat, string> = {
  hls: 'application/vnd.apple.mpegurl',
  mjpeg: 'multipart/x-mixed-replace; boundary=--boundary',
  webrtc: 'application/json',
  snapshot: 'image/jpeg',
  jsmpeg: 'application/octet-stream',
};

/**
 * Verify that a camera with the given key belongs to a specific tenant
 *
 * SECURITY: This ensures users can only proxy streams for their own cameras
 * Database query enforces tenant scoping
 */
export async function verifyCameraOwnership(
  tenantId: string,
  cameraKey: string
): Promise<{ id: string; label: string | null } | null> {
  const camera = await prisma.camera.findUnique({
    where: {
      tenantId_frigateCameraKey: {
        tenantId,
        frigateCameraKey: cameraKey,
      },
    },
    select: {
      id: true,
      label: true,
    },
  });

  return camera;
}

/**
 * Proxy a stream request from Frigate to the client
 *
 * Flow:
 * 1. Verify camera ownership (tenant scoping)
 * 2. Build Frigate URL with format protocol
 * 3. Make HTTP request to Frigate
 * 4. Pipe response to client
 * 5. Preserve content-type headers
 * 6. Handle errors gracefully
 *
 * @param tenantId - Authenticated user's tenant ID
 * @param cameraKey - Frigate camera name (must match key field)
 * @param format - Stream format: hls, mjpeg, webrtc, snapshot
 * @param res - Express Response object to pipe to
 *
 * @throws Error if camera not found or doesn't belong to tenant
 * @throws Error if Frigate request fails
 */
export async function proxyFrigateStream(
  tenantId: string,
  cameraKey: string,
  format: StreamFormat,
  res: Response,
  options?: { baseUrl?: string; token?: string | null; verifyTls?: boolean }
): Promise<void> {
  // SECURITY: Verify camera belongs to this tenant
  const camera = await verifyCameraOwnership(tenantId, cameraKey);

  if (!camera) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Camera not found or does not belong to your tenant',
    });
    return;
  }

  // Build Frigate URL
  // Frigate base URL from config (internal Docker: http://frigate:5000)
  const baseUrl = options?.baseUrl || config.frigatBaseUrl;
  const frigateUrl = `${baseUrl}/api/camera/${encodeURIComponent(cameraKey)}/${format}`;

  try {
    // Determine if HTTPS or HTTP based on config
    const protocol = baseUrl.startsWith('https') ? https : http;

    // For HTTPS with self-signed certificates, disable SSL verification in development
    const requestOptions: https.RequestOptions = {};
    if (baseUrl.startsWith('https') && config.nodeEnv === 'development') {
      requestOptions.rejectUnauthorized = false;
    }
    if (baseUrl.startsWith('https') && options?.verifyTls === false) {
      requestOptions.rejectUnauthorized = false;
    }

    if (options?.token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${options.token}`,
        Cookie: `frigate_token=${options.token}`,
      };
    }

    // Make request to Frigate
    const request = protocol.get(frigateUrl, requestOptions, (frigateResponse) => {
      // Get content-type from Frigate response
      const contentType = frigateResponse.headers['content-type'];
      const customContentType = STREAM_CONTENT_TYPES[format];

      // Set response headers
      res.setHeader('Content-Type', customContentType || contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Handle different HTTP status codes
      if (frigateResponse.statusCode && frigateResponse.statusCode >= 400) {
        res.status(frigateResponse.statusCode);
      }

      // Pipe Frigate response to client
      frigateResponse.pipe(res);
    });

    // Handle request errors
    request.on('error', (error) => {
      console.error(`Frigate proxy error for camera ${cameraKey}:`, error);

      // Check if response has already been sent
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Frigate is unavailable or camera is offline',
        });
      } else {
        res.end();
      }
    });

    // Set timeout for Frigate request
    request.setTimeout(30000, () => {
      request.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Frigate request timed out',
        });
      }
    });
  } catch (error) {
    console.error(`Proxy stream error for camera ${cameraKey}:`, error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to proxy stream',
      });
    }
  }
}

/**
 * Check if a camera is currently online in Frigate
 * Useful for determining stream status before proxying
 *
 * Note: This makes an additional request to Frigate
 * For performance, consider caching the status
 */
export async function checkCameraStatus(
  cameraKey: string
): Promise<'online' | 'offline' | 'error'> {
  return new Promise((resolve) => {
    const url = `${config.frigatBaseUrl}/api/camera/${encodeURIComponent(cameraKey)}/snapshot`;
    const protocol = config.frigatBaseUrl.startsWith('https') ? https : http;

    // For HTTPS with self-signed certificates, disable SSL verification in development
    const requestOptions: https.RequestOptions = {};
    if (config.frigatBaseUrl.startsWith('https') && config.nodeEnv === 'development') {
      requestOptions.rejectUnauthorized = false;
    }

    const request = protocol.get(url, requestOptions, (response) => {
      if (response.statusCode === 200) {
        resolve('online');
      } else {
        resolve('offline');
      }
    });

    request.on('error', () => {
      resolve('error');
    });

    request.setTimeout(5000, () => {
      request.destroy();
      resolve('offline');
    });
  });
}

/**
 * Proxy a WebSocket jsmpeg stream from Frigate to the client
 *
 * Flow:
 * 1. Verify camera ownership (tenant scoping)
 * 2. Build Frigate WebSocket URL for jsmpeg
 * 3. Connect to Frigate WebSocket with authentication token
 * 4. Upgrade HTTP connection to WebSocket
 * 5. Forward all WebSocket frames from Frigate to client
 * 6. Handle connection errors and cleanup
 *
 * The jsmpeg format provides low-latency video streaming over WebSocket
 * suitable for real-time monitoring applications.
 *
 * @param tenantId - Authenticated user's tenant ID
 * @param cameraKey - Frigate camera name (must match key field)
 * @param req - Express Request object (contains ws for WebSocket upgrade)
 * @param socket - TCP socket for WebSocket upgrade
 * @param head - HTTP head for WebSocket upgrade
 * @param frigateToken - Frigate JWT token for authentication
 *
 * @throws Error if camera not found or doesn't belong to tenant
 * @throws Error if WebSocket connection fails
 */
export async function proxyFrigateWebSocketStream(
  tenantId: string,
  cameraKey: string,
  socket: any,
  head: Buffer,
  frigateToken: string,
  skipCameraCheck: boolean = false,
  baseUrl: string = config.frigatBaseUrl,
  verifyTls: boolean = true
): Promise<void> {
  console.log('[ProxyFrigateWebSocketStream] Called with:', {
    tenantId,
    cameraKey,
    hasSocket: !!socket,
    frigateTokenLength: frigateToken?.length,
    skipCameraCheck,
  });

  // SECURITY: Verify camera belongs to this tenant (can be skipped in dev/test mode)
  if (!skipCameraCheck) {
    const camera = await verifyCameraOwnership(tenantId, cameraKey);

    if (!camera) {
      socket.destroy();
      console.warn(`Unauthorized WebSocket access attempt for camera: ${cameraKey} by tenant: ${tenantId}`);
      return;
    }
  } else {
    console.log(`[ProxyFrigateWebSocketStream] ⚠️  DEVELOPMENT MODE: Skipping camera ownership check for ${cameraKey}`);
  }

  try {
    // Build Frigate WebSocket URL
    // Using wss:// or ws:// based on config
    const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const frigateHost = baseUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    const frigateUrl = `${protocol}://${frigateHost}:8971/live/jsmpeg/${encodeURIComponent(cameraKey)}`;

    console.log(`[ProxyFrigateWebSocketStream] Connecting to Frigate:`, { frigateUrl, protocol, frigateHost });

    // Create WebSocket connection to Frigate with authentication
    const wsOptions: WebSocket.ClientOptions = {
      headers: {
        'Origin': baseUrl,
        'User-Agent': 'SatelitEyes-Guard-Backend/1.0',
        Cookie: `frigate_token=${frigateToken}`,
      },
    };

    // For self-signed certificates in development
    if (protocol === 'wss' && config.nodeEnv === 'development') {
      (wsOptions as any).rejectUnauthorized = false;
    }
    if (protocol === 'wss' && !verifyTls) {
      (wsOptions as any).rejectUnauthorized = false;
    }

    const frigateWs = new WebSocket(frigateUrl, wsOptions);
    let clientConnected = true;

    console.log(`[ProxyFrigateWebSocketStream] WebSocket object created, waiting for connection...`);

    // Handle connection opened
    frigateWs.on('open', () => {
      console.log(`[ProxyFrigateWebSocketStream] ✅ Connected to Frigate for camera: ${cameraKey}`);
    });

    // Forward messages from Frigate to client
    frigateWs.on('message', (data: Buffer) => {
      console.log(`[ProxyFrigateWebSocketStream] Received ${data.length} bytes from Frigate`);
      if (clientConnected && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(data);
          console.log(`[ProxyFrigateWebSocketStream] Sent ${data.length} bytes to client`);
        } catch (error) {
          console.error(`[ProxyFrigateWebSocketStream] Error sending data to client:`, error);
        }
      } else {
        console.warn(`[ProxyFrigateWebSocketStream] Cannot send data: clientConnected=${clientConnected}, readyState=${socket.readyState}`);
      }
    });

    // Handle Frigate WebSocket close
    frigateWs.on('close', (code: number, reason: string) => {
      console.log(`[ProxyFrigateWebSocketStream] Frigate connection closed: ${code} ${reason}`);
      if (clientConnected && socket.readyState === WebSocket.OPEN) {
        socket.close(code, reason);
        clientConnected = false;
      }
    });

    // Handle Frigate WebSocket errors
    frigateWs.on('error', (error: Error) => {
      console.error(`[ProxyFrigateWebSocketStream] Frigate connection error for camera ${cameraKey}:`, error);
      if (clientConnected && socket.readyState === WebSocket.OPEN) {
        socket.close(1011, 'Frigate connection error');
        clientConnected = false;
      }
    });

    // Handle client socket close
    socket.on('close', () => {
      console.log(`[ProxyFrigateWebSocketStream] Client disconnected for camera: ${cameraKey}`);
      clientConnected = false;
      if (frigateWs.readyState === WebSocket.OPEN) {
        frigateWs.close();
      }
    });

    // Handle client socket errors
    socket.on('error', (error: Error) => {
      console.error(`[WebSocket] Client socket error for camera ${cameraKey}:`, error);
      if (frigateWs.readyState === WebSocket.OPEN) {
        frigateWs.close();
      }
    });

  } catch (error) {
    console.error(`[WebSocket] Proxy error for camera ${cameraKey}:`, error);
    socket.destroy();
  }
}
