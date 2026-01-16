/**
 * Faces Service
 * Proxies Frigate face management endpoints
 */

import { config } from '../../config/index.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { getFrigateAuthToken } from '../explore/service.js';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

async function frigateRequest<T = JsonValue>(
  path: string,
  options: RequestInit
): Promise<T> {
  const baseUrl = config.frigatBaseUrl;
  const url = new URL(path, baseUrl);

  const token = await getFrigateAuthToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Cookie', `frigate_token=${token}`);
  }

  const originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const shouldDisableTls = config.nodeEnv === 'development' && url.protocol === 'https:';

  if (shouldDisableTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (shouldDisableTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTls;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const payload = contentType.includes('application/json')
      ? JSON.stringify(await response.json())
      : await response.text();
    throw new ApiError(`Frigate API error ${response.status}: ${payload}`, response.status, 'UPSTREAM_ERROR');
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export async function listFaces() {
  return frigateRequest('/api/faces', { method: 'GET' });
}

export async function createFace(name: string) {
  return frigateRequest(`/api/faces/${encodeURIComponent(name)}/create`, {
    method: 'POST',
  });
}

export async function registerFaceImage(name: string, file: { buffer: Buffer; filename: string; mimetype: string }) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
  form.append('file', blob, file.filename || 'face.jpg');

  return frigateRequest(`/api/faces/${encodeURIComponent(name)}/register`, {
    method: 'POST',
    body: form,
  });
}

export async function trainFace(name: string) {
  return frigateRequest(`/api/faces/train/${encodeURIComponent(name)}/classify`, {
    method: 'POST',
  });
}

export async function deleteFace(name: string) {
  return frigateRequest(`/api/faces/${encodeURIComponent(name)}/delete`, {
    method: 'POST',
  });
}

export async function renameFace(oldName: string, newName: string) {
  return frigateRequest(`/api/faces/${encodeURIComponent(oldName)}/rename`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newName,
      new_name: newName,
    }),
  });
}
