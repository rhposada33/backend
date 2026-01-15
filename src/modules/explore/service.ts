/**
 * Explore Service
 * Proxies Frigate Explore API with tenant scoping
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../../config/index.js';
import { prisma } from '../../db/client.js';

export interface ExploreFilters {
  label?: string;
  camera?: string;
  limit?: number;
  before?: number;
  after?: number;
}

export interface FrigateEvent {
  id: string;
  camera: string;
  label: string;
  start_time?: number;
  end_time?: number | null;
  score?: number;
  has_snapshot?: boolean;
  has_clip?: boolean;
  [key: string]: unknown;
}

async function fetchFrigateJson<T>(path: string): Promise<T> {
  const baseUrl = config.frigatBaseUrl;
  const url = new URL(path, baseUrl);
  const isHttps = url.protocol === 'https:';

  const options: https.RequestOptions = {
    method: 'GET',
    headers: {},
  };

  const token = await getFrigateAuthToken();
  if (token) {
    options.headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `frigate_token=${token}`,
    };
  }

  if (isHttps && config.nodeEnv === 'development') {
    options.rejectUnauthorized = false;
  }

  const requestFn = isHttps ? https.request : http.request;

  return new Promise<T>((resolve, reject) => {
    const req = requestFn(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Frigate API error ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data) as T);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

let cachedFrigateToken: string | null = null;

export async function getFrigateAuthToken(): Promise<string | null> {
  if (config.frigateAuthToken) {
    return config.frigateAuthToken;
  }

  if (cachedFrigateToken) {
    return cachedFrigateToken;
  }

  if (!config.frigateUsername || !config.frigatePassword) {
    return null;
  }

  const baseUrl = config.frigatBaseUrl;
  const url = new URL('/api/login', baseUrl);
  const isHttps = url.protocol === 'https:';

  const payload = JSON.stringify({
    user: config.frigateUsername,
    password: config.frigatePassword,
  });

  const options: https.RequestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  if (isHttps && config.nodeEnv === 'development') {
    options.rejectUnauthorized = false;
  }

  const requestFn = isHttps ? https.request : http.request;

  return new Promise<string | null>((resolve, reject) => {
    const req = requestFn(url, options, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (!setCookie || setCookie.length === 0) {
        reject(new Error('Frigate login did not return a token'));
        return;
      }

      const tokenCookie = setCookie.find((cookie) => cookie.startsWith('frigate_token='));
      if (!tokenCookie) {
        reject(new Error('Frigate token cookie not found'));
        return;
      }

      const token = tokenCookie.split(';')[0].split('=')[1];
      cachedFrigateToken = token;
      resolve(token);
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function getTenantCameraKeys(tenantId: string): Promise<string[]> {
  const cameras = await prisma.camera.findMany({
    where: { tenantId },
    select: { frigateCameraKey: true },
  });
  return cameras.map((camera) => camera.frigateCameraKey);
}

export async function getExploreEvents(
  tenantId: string,
  filters: ExploreFilters
): Promise<FrigateEvent[]> {
  const tenantCameras = await getTenantCameraKeys(tenantId);

  if (filters.camera && !tenantCameras.includes(filters.camera)) {
    return [];
  }

  const searchParams = new URLSearchParams();
  if (filters.limit) {
    searchParams.set('limit', String(filters.limit));
  }
  if (filters.label) {
    searchParams.set('label', filters.label);
  }
  if (filters.camera) {
    searchParams.set('camera', filters.camera);
  }
  if (filters.before) {
    searchParams.set('before', String(filters.before));
  }
  if (filters.after) {
    searchParams.set('after', String(filters.after));
  }

  const path = `/api/events${searchParams.toString() ? `?${searchParams}` : ''}`;
  const events = await fetchFrigateJson<FrigateEvent[]>(path);

  return events.filter((event) => tenantCameras.includes(event.camera));
}

export async function getExploreSummary(
  tenantId: string
): Promise<Record<string, number>> {
  const tenantCameras = await getTenantCameraKeys(tenantId);

  try {
    const rawSummary = await fetchFrigateJson<
      Array<{ label: string; count: number }> | Record<string, number>
    >('/api/events/summary');

    if (Array.isArray(rawSummary)) {
      const mapped: Record<string, number> = {};
      for (const entry of rawSummary) {
        if (entry && entry.label) {
          mapped[entry.label] = entry.count ?? 0;
        }
      }
      return mapped;
    }

    if (rawSummary && typeof rawSummary === 'object') {
      return rawSummary as Record<string, number>;
    }
  } catch {
    // fall back to local aggregation below
  }

  const events = await getExploreEvents(tenantId, { limit: 1000 });
  const summary: Record<string, number> = {};

  for (const event of events) {
    if (!tenantCameras.includes(event.camera)) {
      continue;
    }
    const label = event.label || 'unknown';
    summary[label] = (summary[label] || 0) + 1;
  }

  return summary;
}

export async function getExploreEventDetail(
  tenantId: string,
  eventId: string
): Promise<FrigateEvent | null> {
  const tenantCameras = await getTenantCameraKeys(tenantId);
  const event = await fetchFrigateJson<FrigateEvent>(`/api/events/${eventId}`);

  if (!tenantCameras.includes(event.camera)) {
    return null;
  }

  return event;
}
