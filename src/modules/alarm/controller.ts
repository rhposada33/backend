/**
 * Alarm Controller
 * Exposes events as alarms for tenant-scoped queries
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError, NotFoundError } from '../../middleware/errorHandler.js';
import * as alarmService from './service.js';
import { config } from '../../config/index.js';
import http from 'http';
import https from 'https';

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

/**
 * PATCH /alarms/:id/acknowledge
 * Mark alarm as acknowledged
 */
export async function acknowledgeAlarm(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const updated = await alarmService.acknowledgeAlarm(req.user.tenantId, id);

  if (!updated) {
    throw new NotFoundError('Alarm not found');
  }

  res.status(200).json({
    success: true,
    data: updated,
  });
}

/**
 * PATCH /alarms/:id/resolve
 * Mark alarm as resolved
 */
export async function resolveAlarm(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const updated = await alarmService.resolveAlarm(req.user.tenantId, id);

  if (!updated) {
    throw new NotFoundError('Alarm not found');
  }

  res.status(200).json({
    success: true,
    data: updated,
  });
}

async function proxyFrigateEventAsset(
  frigateId: string,
  assetPath: string,
  res: Response
): Promise<void> {
  const frigateUrl = `${config.frigatBaseUrl}/api/events/${encodeURIComponent(frigateId)}/${assetPath}`;
  const protocol = config.frigatBaseUrl.startsWith('https') ? https : http;
  const requestOptions: https.RequestOptions = {};

  if (config.frigatBaseUrl.startsWith('https') && config.nodeEnv === 'development') {
    requestOptions.rejectUnauthorized = false;
  }

  if (config.frigateAuthToken) {
    requestOptions.headers = {
      Authorization: `Bearer ${config.frigateAuthToken}`,
      Cookie: `frigate_token=${config.frigateAuthToken}`,
    };
  }

  const request = protocol.get(frigateUrl, requestOptions, (frigateResponse) => {
    const contentType = frigateResponse.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (frigateResponse.statusCode && frigateResponse.statusCode >= 400) {
      res.status(frigateResponse.statusCode);
    }

    frigateResponse.pipe(res);
  });

  request.on('error', (error) => {
    console.error(`Frigate proxy error for event ${frigateId}:`, error);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Frigate is unavailable or event media is missing',
      });
    } else {
      res.end();
    }
  });

  request.setTimeout(30000, () => {
    request.destroy();
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Frigate request timed out',
      });
    }
  });
}

/**
 * GET /alarms/:id/snapshot
 * Proxy snapshot for event from Frigate
 */
export async function getAlarmSnapshot(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const media = await alarmService.getAlarmMediaInfo(req.user.tenantId, id);

  if (!media) {
    throw new NotFoundError('Alarm not found');
  }

  if (!media.hasSnapshot) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Snapshot not available for this alarm',
    });
    return;
  }

  await proxyFrigateEventAsset(media.frigateId, 'snapshot.jpg', res);
}

/**
 * GET /alarms/:id/clip
 * Proxy clip for event from Frigate
 */
export async function getAlarmClip(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const media = await alarmService.getAlarmMediaInfo(req.user.tenantId, id);

  if (!media) {
    throw new NotFoundError('Alarm not found');
  }

  if (!media.hasClip) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Clip not available for this alarm',
    });
    return;
  }

  await proxyFrigateEventAsset(media.frigateId, 'clip.mp4', res);
}
