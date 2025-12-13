/**
 * Streams Router
 * Routes for proxying Frigate livestreams to clients
 *
 * ARCHITECTURE:
 * Frontend → Backend (/streams/:cameraKey) → Frigate (internal)
 *
 * The backend acts as a proxy/gateway:
 * - Verifies camera ownership (tenant scoping)
 * - Proxies HLS/MJPEG/WebRTC streams from Frigate
 * - Preserves content-type headers
 * - Handles errors gracefully
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { proxyStream } from '../camera/controller.js';

export const streamsRouter = Router();

/**
 * @swagger
 * /streams/{cameraKey}:
 *   get:
 *     tags:
 *       - Streams
 *     summary: Proxy a camera livestream from Frigate
 *     description: |
 *       Proxy a livestream from Frigate to the client. The backend verifies
 *       that the camera belongs to the authenticated user's tenant before
 *       proxying the stream. This ensures:
 *       - Frontend never has direct access to Frigate URLs
 *       - Proper tenant isolation
 *       - Secure camera access control
 *
 *       Supports multiple stream formats via query parameter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cameraKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Frigate camera name (must match camera.frigateCameraKey in database)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: ['hls', 'mjpeg', 'webrtc', 'snapshot']
 *           default: 'hls'
 *         description: Stream format to proxy
 *     responses:
 *       200:
 *         description: Livestream data (varies by format)
 *         content:
 *           application/vnd.apple.mpegurl:
 *             schema:
 *               type: string
 *               description: HLS playlist (default format)
 *           multipart/x-mixed-replace:
 *             schema:
 *               type: string
 *               format: binary
 *               description: MJPEG stream
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *               description: JPEG snapshot
 *           application/json:
 *             schema:
 *               type: object
 *               description: WebRTC signaling data
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - camera does not belong to tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Service unavailable - Frigate unreachable or camera offline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       504:
 *         description: Gateway timeout - Frigate request timed out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
streamsRouter.get('/:cameraKey', authMiddleware, proxyStream);

export default streamsRouter;
