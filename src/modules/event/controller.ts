/**
 * Event Controller
 * Request handlers for event management endpoints
 * All operations are scoped to the authenticated user's tenantId
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
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

    const result = await eventService.getEventsByTenant(req.user.tenantId, skip, limit);

    res.status(200).json({
      data: result.events,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get events',
    });
  }
}

/**
 * GET /events/:id
 * Get a single event by ID
 */
export async function getEvent(
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

    const event = await eventService.getEventById(req.user.tenantId, id);

    if (!event) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Event not found',
      });
      return;
    }

    res.status(200).json({
      data: event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get event',
    });
  }
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
  try {
    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { cameraId } = req.params;
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

    const result = await eventService.getEventsByCamera(
      req.user.tenantId,
      cameraId,
      skip,
      limit
    );

    res.status(200).json({
      data: result.events,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Get events by camera error:', error);

    // Handle specific error messages
    if (error instanceof Error && error.message.includes('Camera not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get events',
    });
  }
}
