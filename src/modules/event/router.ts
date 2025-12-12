/**
 * Event Router
 * Express routes for event management endpoints
 * All routes require authentication (authMiddleware)
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { listEvents, getEvent, getEventsByCamera } from './controller.js';

export const eventRouter = Router();

/**
 * @swagger
 * /events:
 *   get:
 *     tags:
 *       - Events
 *     summary: List all events
 *     description: Get all events for the authenticated user's tenant with pagination support
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
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
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
eventRouter.get('/', authMiddleware, asyncHandler(listEvents));

/**
 * @swagger
 * /events/byCamera/{cameraId}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get events by camera
 *     description: Retrieve all events for a specific camera with pagination support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cameraId
 *         required: true
 *         schema:
 *           type: string
 *         description: Camera ID
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
 *         description: List of events for the camera
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventListResponse'
 *       400:
 *         description: Invalid pagination parameters or camera ID
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
 */
eventRouter.get('/byCamera/:cameraId', authMiddleware, asyncHandler(getEventsByCamera));

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get event by ID
 *     description: Retrieve a single event by its unique identifier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       404:
 *         description: Event not found
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
eventRouter.get('/:id', authMiddleware, asyncHandler(getEvent));

export default eventRouter;
