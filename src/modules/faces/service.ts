/**
 * Faces Service
 * Proxies Frigate face management endpoints
 */

import { ApiError } from '../../middleware/errorHandler.js';
import { getTenantFrigateClient } from '../frigateServer/service.js';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

async function frigateRequest<T = JsonValue>(
  tenantId: string,
  path: string,
  options: RequestInit
): Promise<T> {
  const client = await getTenantFrigateClient(tenantId);
  const url = new URL(path, client.baseUrl);

  const headers = new Headers(options.headers);

  if (client.token) {
    headers.set('Authorization', `Bearer ${client.token}`);
    headers.set('Cookie', `frigate_token=${client.token}`);
  }

  const originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const shouldDisableTls = client.verifyTls === false && url.protocol === 'https:';
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

export async function listFaces(tenantId: string) {
  return frigateRequest(tenantId, '/api/faces', { method: 'GET' });
}

export async function createFace(tenantId: string, name: string) {
  return frigateRequest(tenantId, `/api/faces/${encodeURIComponent(name)}/create`, {
    method: 'POST',
  });
}

export async function registerFaceImage(
  tenantId: string,
  name: string,
  file: { buffer: Buffer; filename: string; mimetype: string }
) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
  form.append('file', blob, file.filename || 'face.jpg');

  return frigateRequest(tenantId, `/api/faces/${encodeURIComponent(name)}/register`, {
    method: 'POST',
    body: form,
  });
}

export async function trainFace(tenantId: string, name: string) {
  return frigateRequest(tenantId, `/api/faces/train/${encodeURIComponent(name)}/classify`, {
    method: 'POST',
  });
}

export async function deleteFace(tenantId: string, name: string) {
  return frigateRequest(tenantId, `/api/faces/${encodeURIComponent(name)}/delete`, {
    method: 'POST',
  });
}

export async function renameFace(tenantId: string, oldName: string, newName: string) {
  return frigateRequest(tenantId, `/api/faces/${encodeURIComponent(oldName)}/rename`, {
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
