/**
 * Event Controller
 * Request handlers for event management endpoints
 * All operations are scoped to the authenticated user's tenantId
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { ValidationError, AuthenticationError, NotFoundError } from '../../middleware/errorHandler.js';
import * as eventService from './service.js';

/**
 * GET /events
 * Get all events for the authenticated user's tenant
 * Supports pagination: ?page=1&limit=50
 */
export async function listEvents(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Verify authenticated
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  // Validate pagination params
  if (page < 1 || limit < 1 || limit > 500) {
    throw new ValidationError('page must be >= 1, limit must be between 1 and 500');
  }

  const skip = (page - 1) * limit;

  const result = await eventService.getEventsByTenant(req.user.tenantId, skip, limit);

  res.status(200).json({
    success: true,
    data: result.events,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

/**
 * GET /events/:id
 * Get a single event by ID
 */
export async function getEvent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Verify authenticated
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;

  const event = await eventService.getEventById(req.user.tenantId, id);

  if (!event) {
    throw new NotFoundError('Event not found');
  }

  res.status(200).json({
    success: true,
    data: event,
  });
}

/**
 * GET /events/byCamera/:cameraId
 * Get events for a specific camera
 * Supports pagination: ?page=1&limit=50
 */
export async function getEventsByCamera(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Verify authenticated
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { cameraId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  // Validate pagination params
  if (page < 1 || limit < 1 || limit > 500) {
    throw new ValidationError('page must be >= 1, limit must be between 1 and 500');
  }

  const skip = (page - 1) * limit;

  const result = await eventService.getEventsByCamera(
    req.user.tenantId,
    cameraId,
    skip,
    limit
  );

  res.status(200).json({
    success: true,
    data: result.events,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}
