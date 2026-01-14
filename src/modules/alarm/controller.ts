/**
 * Alarm Controller
 * Exposes events as alarms for tenant-scoped queries
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError } from '../../middleware/errorHandler.js';
import * as alarmService from './service.js';

function parseDate(value: string | undefined, fieldName: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid ISO date-time`);
  }
  return parsed;
}

/**
 * GET /alarms
 * List alarms (events) for the authenticated user's tenant
 */
export async function listAlarms(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

  if (page < 1 || limit < 1 || limit > 500) {
    throw new ValidationError('page must be >= 1, limit must be between 1 and 500');
  }

  const filters = {
    cameraId: req.query.cameraId as string | undefined,
    label: req.query.label as string | undefined,
    type: req.query.type as string | undefined,
    from: parseDate(req.query.from as string | undefined, 'from'),
    to: parseDate(req.query.to as string | undefined, 'to'),
  };

  const skip = (page - 1) * limit;

  const result = await alarmService.getAlarmsByTenant(req.user.tenantId, filters, skip, limit);

  res.status(200).json({
    success: true,
    data: result.alarms,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}
