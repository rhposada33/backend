/**
 * Alarm Router
 * Express routes for alarm (event) queries
 * All routes require authentication (authMiddleware)
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { listAlarms } from './controller.js';

export const alarmRouter = Router();

/**
 * @swagger
 * /alarms:
 *   get:
 *     tags:
 *       - Alarms
 *     summary: List alarms
 *     description: Get events as alarms for the authenticated user's tenant with filters and pagination
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
 *       - in: query
 *         name: cameraId
 *         schema:
 *           type: string
 *         description: Filter by camera ID
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Filter by detected label (e.g., person, car)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by event type (new, update, end)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events created at or after this ISO timestamp
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events created at or before this ISO timestamp
 *     responses:
 *       200:
 *         description: List of alarms
 *       400:
 *         description: Invalid filters or pagination parameters
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Server error
 */
alarmRouter.get('/', authMiddleware, asyncHandler(listAlarms));

export default alarmRouter;
