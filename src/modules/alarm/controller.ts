/**
 * Alarm Controller
 * Exposes events as alarms for tenant-scoped queries
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { AuthenticationError, ValidationError, NotFoundError } from '../../middleware/errorHandler.js';
import * as alarmService from './service.js';
import { config } from '../../config/index.js';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';

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
    status: req.query.status as 'unresolved' | 'acknowledged' | 'resolved' | undefined,
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
  if (ext === '.mp4') {
    return 'video/mp4';
  }
  return 'application/octet-stream';
}

async function findFirstExistingPath(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    try {
      await fs.promises.stat(candidate);
      return candidate;
    } catch {
      // ignore missing file
    }
  }
  return null;
}

function parseEventTimestamp(frigateId: string, startTime: number | null): number | null {
  if (typeof startTime === 'number' && !Number.isNaN(startTime)) {
    return startTime;
  }

  const prefix = frigateId.split('-')[0];
  const parsed = Number.parseFloat(prefix);
  return Number.isNaN(parsed) ? null : parsed;
}

async function findPreviewClip(
  basePath: string,
  cameraKey: string,
  eventTimestamp: number
): Promise<string | null> {
  const previewDir = path.join(basePath, 'clips', 'previews', cameraKey);
  try {
    const entries = await fs.promises.readdir(previewDir);
    for (const entry of entries) {
      if (!entry.endsWith('.mp4')) continue;
      const name = entry.replace('.mp4', '');
      const parts = name.split('-');
      if (parts.length < 2) continue;
      const start = Number.parseFloat(parts[0]);
      const end = Number.parseFloat(parts[1]);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      if (eventTimestamp >= start && eventTimestamp <= end) {
        return path.join(previewDir, entry);
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function findRecordingClip(
  basePath: string,
  cameraKey: string,
  eventTimestamp: number
): Promise<string | null> {
  const eventDate = new Date(eventTimestamp * 1000);
  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, '0');
  const day = String(eventDate.getDate()).padStart(2, '0');
  const hour = String(eventDate.getHours()).padStart(2, '0');
  const minute = eventDate.getMinutes();
  const second = eventDate.getSeconds();
  const eventSecondInHour = minute * 60 + second;

  const recordingsDir = path.join(
    basePath,
    'recordings',
    `${year}-${month}-${day}`,
    hour,
    cameraKey
  );

  try {
    const entries = await fs.promises.readdir(recordingsDir);
    let bestMatch: { start: number; file: string } | null = null;

    for (const entry of entries) {
      if (!entry.endsWith('.mp4')) continue;
      const name = entry.replace('.mp4', '');
      const [minStr, secStr] = name.split('.');
      const startMin = Number.parseInt(minStr, 10);
      const startSec = Number.parseInt(secStr, 10);
      if (Number.isNaN(startMin) || Number.isNaN(startSec)) continue;
      const start = startMin * 60 + startSec;
      if (start <= eventSecondInHour && (!bestMatch || start > bestMatch.start)) {
        bestMatch = { start, file: entry };
      }
    }

    return bestMatch ? path.join(recordingsDir, bestMatch.file) : null;
  } catch {
    return null;
  }
}

async function streamLocalFile(filePath: string, res: Response): Promise<void> {
  res.setHeader('Content-Type', getContentType(filePath));
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    console.error('Failed to read media file', { filePath, error });
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to read media file',
      });
    }
  });
  stream.pipe(res);
}

interface FrigateBinaryResponse {
  statusCode: number;
  contentType: string | null;
  body: Buffer;
}

async function fetchFrigateBinary(
  baseUrl: string,
  token: string | null,
  verifyTls: boolean,
  endpointPath: string
): Promise<FrigateBinaryResponse> {
  const url = new URL(endpointPath, baseUrl);
  const isHttps = url.protocol === 'https:';
  const requestFn = isHttps ? https.request : http.request;

  const options: https.RequestOptions = {
    method: 'GET',
    headers: {},
  };

  if (token) {
    options.headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `frigate_token=${token}`,
    };
  }

  if (isHttps && (verifyTls === false || config.nodeEnv === 'development')) {
    options.rejectUnauthorized = false;
  }

  return new Promise((resolve, reject) => {
    const req = requestFn(url, options, (frigateRes) => {
      const chunks: Buffer[] = [];
      frigateRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      frigateRes.on('end', () => {
        resolve({
          statusCode: frigateRes.statusCode || 500,
          contentType:
            typeof frigateRes.headers['content-type'] === 'string'
              ? frigateRes.headers['content-type']
              : null,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy(new Error(`Timeout requesting Frigate endpoint: ${endpointPath}`));
    });
    req.end();
  });
}

function sendBinaryResponse(
  res: Response,
  payload: FrigateBinaryResponse,
  fallbackContentType: string
): void {
  res.setHeader('Content-Type', payload.contentType || fallbackContentType);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).send(payload.body);
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

  if (!config.frigateMediaPath) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'FRIGATE_MEDIA_PATH is not configured',
    });
    return;
  }

  if (!media.hasSnapshot) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Snapshot not available for this alarm',
    });
    return;
  }

  const basePath = config.frigateMediaPath;
  const filePath = await findFirstExistingPath([
    path.join(basePath, 'clips', `${media.cameraKey}-${media.frigateId}.jpg`),
    path.join(basePath, 'clips', `${media.cameraKey}-${media.frigateId}-clean.png`),
    path.join(basePath, 'clips', 'thumbs', media.cameraKey, `${media.frigateId}.webp`),
  ]);

  if (!filePath) {
    // Fallback to Frigate API when local media files are missing.
    const { getTenantFrigateClient } = await import('../frigateServer/service.js');
    const client = await getTenantFrigateClient(req.user.tenantId);

    const frameTime = parseEventTimestamp(media.frigateId, media.startTime);
    const snapshotCandidates = [
      frameTime !== null
        ? `/api/${encodeURIComponent(media.cameraKey)}/recordings/${frameTime}/snapshot.jpg`
        : null,
      `/api/${encodeURIComponent(media.cameraKey)}/latest.jpg`,
    ].filter((value): value is string => Boolean(value));

    for (const candidate of snapshotCandidates) {
      try {
        const remote = await fetchFrigateBinary(
          client.baseUrl,
          client.token,
          client.verifyTls,
          candidate
        );

        if (remote.statusCode >= 200 && remote.statusCode < 300) {
          sendBinaryResponse(res, remote, 'image/jpeg');
          return;
        }
      } catch (error) {
        console.warn('Snapshot fallback request failed', { candidate, error });
      }
    }

    res.status(404).json({
      error: 'Not Found',
      message: 'Snapshot not available for this event',
    });
    return;
  }

  await streamLocalFile(filePath, res);
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

  if (!config.frigateMediaPath) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'FRIGATE_MEDIA_PATH is not configured',
    });
    return;
  }

  if (!media.hasClip) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Clip not available for this alarm',
    });
    return;
  }

  const basePath = config.frigateMediaPath;
  const filePath = await findFirstExistingPath([
    path.join(basePath, 'clips', `${media.cameraKey}-${media.frigateId}.mp4`),
  ]);

  if (filePath) {
    await streamLocalFile(filePath, res);
    return;
  }

  const eventTimestamp = parseEventTimestamp(media.frigateId, media.startTime);
  if (eventTimestamp !== null) {
    const recordingClip = await findRecordingClip(basePath, media.cameraKey, eventTimestamp);
    if (recordingClip) {
      await streamLocalFile(recordingClip, res);
      return;
    }

    const previewClip = await findPreviewClip(basePath, media.cameraKey, eventTimestamp);
    if (previewClip) {
      await streamLocalFile(previewClip, res);
      return;
    }
  }

  // Fallback to Frigate API event clip endpoint when local files are missing.
  const { getTenantFrigateClient } = await import('../frigateServer/service.js');
  const client = await getTenantFrigateClient(req.user.tenantId);
  const remoteClipPath = `/api/events/${encodeURIComponent(media.frigateId)}/clip.mp4`;

  try {
    const remote = await fetchFrigateBinary(
      client.baseUrl,
      client.token,
      client.verifyTls,
      remoteClipPath
    );
    if (remote.statusCode >= 200 && remote.statusCode < 300) {
      sendBinaryResponse(res, remote, 'video/mp4');
      return;
    }
  } catch (error) {
    console.warn('Clip fallback request failed', { remoteClipPath, error });
  }

  res.status(404).json({
    error: 'Not Found',
    message: 'Clip not available for this event',
  });
}
