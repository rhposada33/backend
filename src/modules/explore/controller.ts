/**
 * Explore Controller
 * Frigate Explore proxy endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError } from '../../middleware/errorHandler.js';
import * as exploreService from './service.js';
import { config } from '../../config/index.js';
import http from 'http';
import https from 'https';
import { getFrigateAuthToken } from './service.js';
import fs from 'fs';
import path from 'path';

function parseNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(`${name} must be a number`);
  }
  return parsed;
}

export async function listExploreEvents(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const filters = {
    label: req.query.label as string | undefined,
    camera: req.query.camera as string | undefined,
    limit: parseNumber(req.query.limit, 'limit') || 200,
    before: parseNumber(req.query.before, 'before'),
    after: parseNumber(req.query.after, 'after'),
  };

  const events = await exploreService.getExploreEvents(req.user.tenantId, filters);

  res.status(200).json({
    success: true,
    data: events,
  });
}

export async function getExploreSummary(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const summary = await exploreService.getExploreSummary(req.user.tenantId);

  res.status(200).json({
    success: true,
    data: summary,
  });
}

export async function getExploreEventDetail(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const event = await exploreService.getExploreEventDetail(req.user.tenantId, id);

  if (!event) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Event not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: event,
  });
}

export async function getExploreSnapshot(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  const { id } = req.params;
  const camera = typeof req.query.camera === 'string' ? req.query.camera : null;

  if (config.frigateMediaPath && camera) {
    const basePath = config.frigateMediaPath;
    const candidates = [
      path.join(basePath, 'clips', `${camera}-${id}.jpg`),
      path.join(basePath, 'clips', `${camera}-${id}-clean.png`),
      path.join(basePath, 'clips', 'thumbs', camera, `${id}.webp`),
    ];

    for (const candidate of candidates) {
      try {
        await fs.promises.stat(candidate);
        res.setHeader('Content-Type', getContentType(candidate));
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        fs.createReadStream(candidate).pipe(res);
        return;
      } catch {
        // ignore missing file
      }
    }
  }

  const frigateUrl = `${config.frigatBaseUrl}/api/events/${encodeURIComponent(id)}/snapshot.jpg`;
  const isHttps = frigateUrl.startsWith('https');
  const protocol = isHttps ? https : http;
  const requestOptions: https.RequestOptions = {};

  if (isHttps && config.nodeEnv === 'development') {
    requestOptions.rejectUnauthorized = false;
  }

  const token = await getFrigateAuthToken();
  if (token) {
    requestOptions.headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `frigate_token=${token}`,
    };
  }

  const request = protocol.get(frigateUrl, requestOptions, (frigateResponse) => {
    const contentType = frigateResponse.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (frigateResponse.statusCode && frigateResponse.statusCode >= 400) {
      res.status(frigateResponse.statusCode);
    }

    frigateResponse.pipe(res);
  });

  request.on('error', (error) => {
    console.error(`Frigate explore snapshot error for ${id}:`, error);
    if (!res.headersSent) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Frigate is unavailable',
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

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  return 'application/octet-stream';
}
