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
 * GET /events
 * Get all events for the authenticated user's tenant
 * Supports pagination: ?page=1&limit=50
 * Requires: Authentication
 */
eventRouter.get('/', authMiddleware, asyncHandler(listEvents));

/**
 * GET /events/byCamera/:cameraId
 * Get events for a specific camera
 * Supports pagination: ?page=1&limit=50
 * Requires: Authentication (must be before /:id)
 */
eventRouter.get('/byCamera/:cameraId', authMiddleware, asyncHandler(getEventsByCamera));

/**
 * GET /events/:id
 * Get a single event by ID
 * Requires: Authentication
 */
eventRouter.get('/:id', authMiddleware, asyncHandler(getEvent));

export default eventRouter;
