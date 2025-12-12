/**
 * Event Router
 * Express routes for event management endpoints
 * All routes require authentication (authMiddleware)
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { listEvents, getEvent, getEventsByCamera } from './controller.js';

export const eventRouter = Router();

/**
 * GET /events
 * Get all events for the authenticated user's tenant
 * Supports pagination: ?page=1&limit=50
 * Requires: Authentication
 */
eventRouter.get('/', authMiddleware, listEvents);

/**
 * GET /events/byCamera/:cameraId
 * Get events for a specific camera
 * Supports pagination: ?page=1&limit=50
 * Requires: Authentication
 */
eventRouter.get('/byCamera/:cameraId', authMiddleware, getEventsByCamera);

/**
 * GET /events/:id
 * Get a single event by ID
 * Requires: Authentication
 */
eventRouter.get('/:id', authMiddleware, getEvent);

export default eventRouter;
