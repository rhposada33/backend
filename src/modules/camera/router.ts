/**
 * Camera Router
 * Express routes for camera management endpoints
 * All routes require authentication (authMiddleware)
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import {
  createCamera,
  listCameras,
  getCamera,
  updateCamera,
  deleteCamera,
  getCameraStreams,
  proxyStream,
  proxyJsmpegStream,
  listAllCamerasAdmin,
  createCameraAdmin,
  updateCameraAdmin,
  deleteCameraAdmin,
  listTenantsAdmin,
} from './controller.js';

export const cameraRouter = Router();

/**
 * @swagger
 * /cameras:
 *   post:
 *     tags:
 *       - Cameras
 *     summary: Create a new camera
 *     description: Create a new camera for the authenticated user's tenant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCameraRequest'
 *     responses:
 *       201:
 *         description: Camera created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Camera created successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Camera'
 *       400:
 *         description: Invalid input
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags:
 *       - Cameras
 *     summary: List all cameras
 *     description: Get all cameras for the authenticated user's tenant with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts at 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page (1-100)
 *     responses:
 *       200:
 *         description: List of cameras
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CameraListResponse'
 *       400:
 *         description: Invalid pagination parameters
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
cameraRouter.post('/', authMiddleware, createCamera);
cameraRouter.get('/', authMiddleware, listCameras);
cameraRouter.get('/admin', authMiddleware, listAllCamerasAdmin);
cameraRouter.post('/admin', authMiddleware, createCameraAdmin);
cameraRouter.get('/admin/tenants', authMiddleware, listTenantsAdmin);

/**
 * @swagger
 * /cameras/streams:
 *   get:
 *     tags:
 *       - Cameras
 *     summary: Get camera livestream information
 *     description: Get all cameras with livestream URLs for the authenticated user's tenant. Returns an array of CameraStream objects with constructed livestream URLs that the frontend can use to display live video.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cameras with livestream URLs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cameraId:
 *                         type: string
 *                         description: Unique camera identifier
 *                       cameraName:
 *                         type: string
 *                         description: Camera display name (label or key)
 *                       streamUrl:
 *                         type: string
 *                         description: Backend-generated livestream URL to access the camera feed
 *                       status:
 *                         type: string
 *                         enum: ['live', 'offline', 'recording']
 *                         description: Current livestream status
 *                     example:
 *                       cameraId: "cam-abc123"
 *                       cameraName: "Front Entrance"
 *                       streamUrl: "http://localhost:3000/api/cameras/cam-abc123/stream/webrtc"
 *                       status: "live"
 *                 count:
 *                   type: integer
 *                   description: Total number of cameras returned
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
cameraRouter.get('/streams', authMiddleware, getCameraStreams);

/**
 * @swagger
 * /cameras/{id}:
 *   get:
 *     tags:
 *       - Cameras
 *     summary: Get camera by ID
 *     description: Retrieve a single camera by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Camera ID
 *     responses:
 *       200:
 *         description: Camera found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Camera'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Camera not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Cameras
 *     summary: Update camera
 *     description: Update a camera's key and/or label
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Camera ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCameraRequest'
 *     responses:
 *       200:
 *         description: Camera updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Camera updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Camera'
 *       400:
 *         description: Invalid input
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
 *       404:
 *         description: Camera not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Cameras
 *     summary: Delete camera
 *     description: Delete a camera (cascade deletes related events)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Camera ID
 *     responses:
 *       200:
 *         description: Camera deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Camera deleted successfully'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Camera not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
cameraRouter.patch('/admin/:id', authMiddleware, updateCameraAdmin);
cameraRouter.delete('/admin/:id', authMiddleware, deleteCameraAdmin);
cameraRouter.get('/:id', authMiddleware, getCamera);
cameraRouter.put('/:id', authMiddleware, updateCamera);
cameraRouter.patch('/:id', authMiddleware, updateCamera);
cameraRouter.delete('/:id', authMiddleware, deleteCamera);

/**
 * @swagger
 * /cameras/stream/{cameraKey}:
 *   get:
 *     tags:
 *       - Cameras
 *     summary: Proxy camera stream from Frigate
 *     description: Stream video from a camera. Returns a continuous video stream in the requested format. The format parameter defaults to HLS but supports mjpeg, webrtc, and snapshot.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cameraKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Frigate camera key/name (e.g., 'webcam')
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [hls, mjpeg, webrtc, snapshot]
 *           default: hls
 *         description: Stream format (hls=HLS playlist, mjpeg=Motion JPEG, webrtc=WebRTC, snapshot=static image)
 *     responses:
 *       200:
 *         description: Stream started
 *         content:
 *           video/mp2t:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request (camera key or format)
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
 *         description: Forbidden - camera does not belong to your tenant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       503:
 *         description: Service unavailable - Frigate is offline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
cameraRouter.get('/stream/:cameraKey', authMiddleware, proxyStream);

export default cameraRouter;
