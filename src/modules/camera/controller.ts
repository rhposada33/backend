/**
 * Camera Controller
 * Request handlers for camera management endpoints
 * All operations are scoped to the authenticated user's tenantId
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import * as cameraService from './service.js';

/**
 * POST /cameras
 * Create a new camera for the authenticated user's tenant
 */
export async function createCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { key, label } = req.body;

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

    const camera = await cameraService.createCamera(req.user.tenantId, {
      key,
      label,
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
    const { key, label } = req.body;

    // Validate input - at least one field must be provided
    if (key === undefined && label === undefined) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'At least one field (key or label) must be provided',
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

    const camera = await cameraService.updateCamera(req.user.tenantId, id, {
      key,
      label,
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
