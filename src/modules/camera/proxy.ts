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
import { config } from '../../config/index.js';
import { prisma } from '../../db/client.js';

/**
 * Stream format types available in Frigate
 */
export type StreamFormat = 'hls' | 'mjpeg' | 'webrtc' | 'snapshot';

/**
 * Content-Type headers for different stream formats
 */
const STREAM_CONTENT_TYPES: Record<StreamFormat, string> = {
  hls: 'application/vnd.apple.mpegurl',
  mjpeg: 'multipart/x-mixed-replace; boundary=--boundary',
  webrtc: 'application/json',
  snapshot: 'image/jpeg',
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
  res: Response
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
  const frigateUrl = `${config.frigatBaseUrl}/api/camera/${encodeURIComponent(cameraKey)}/${format}`;

  try {
    // Determine if HTTPS or HTTP based on config
    const protocol = config.frigatBaseUrl.startsWith('https') ? https : http;

    // For HTTPS with self-signed certificates, disable SSL verification in development
    const requestOptions: https.RequestOptions = {};
    if (config.frigatBaseUrl.startsWith('https') && config.nodeEnv === 'development') {
      requestOptions.rejectUnauthorized = false;
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
