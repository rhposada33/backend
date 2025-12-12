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
} from './controller.js';

export const cameraRouter = Router();

/**
 * POST /cameras
 * Create a new camera for the authenticated user's tenant
 * Requires: Authentication
 */
cameraRouter.post('/', authMiddleware, createCamera);

/**
 * GET /cameras
 * Get all cameras for the authenticated user's tenant
 * Supports pagination: ?page=1&limit=50
 * Requires: Authentication
 */
cameraRouter.get('/', authMiddleware, listCameras);

/**
 * GET /cameras/:id
 * Get a single camera by ID
 * Requires: Authentication
 */
cameraRouter.get('/:id', authMiddleware, getCamera);

/**
 * PUT /cameras/:id
 * Update a camera's key and/or label
 * Requires: Authentication
 */
cameraRouter.put('/:id', authMiddleware, updateCamera);

/**
 * DELETE /cameras/:id
 * Delete a camera (cascade deletes related events)
 * Requires: Authentication
 */
cameraRouter.delete('/:id', authMiddleware, deleteCamera);

export default cameraRouter;
