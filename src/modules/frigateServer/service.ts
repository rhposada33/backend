/**
 * Frigate Server Service
 * Manages tenant-linked Frigate server configurations.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { prisma } from '../../db/client.js';
import { config } from '../../config/index.js';

export type FrigateAuthType = 'none' | 'token' | 'login';

export interface FrigateServerInput {
  tenantId: string;
  name: string;
  baseUrl: string;
  authType?: FrigateAuthType;
  username?: string | null;
  password?: string | null;
  token?: string | null;
  configPath?: string | null;
  verifyTls?: boolean;
  isEnabled?: boolean;
  isDefault?: boolean;
}

export interface FrigateServerUpdateInput {
  name?: string;
  baseUrl?: string;
  authType?: FrigateAuthType;
  username?: string | null;
  password?: string | null;
  token?: string | null;
  configPath?: string | null;
  verifyTls?: boolean;
  isEnabled?: boolean;
  isDefault?: boolean;
}

export interface FrigateServerItem {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  baseUrl: string;
  authType: FrigateAuthType;
  username?: string | null;
  password?: string | null;
  token?: string | null;
  configPath?: string | null;
  verifyTls: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrigateClientConfig {
  baseUrl: string;
  token: string | null;
  verifyTls: boolean;
}

const tokenCache = new Map<string, string>();
let defaultTokenCache: string | null = null;

export async function listAllServers(
  skip = 0,
  take = 100
): Promise<{ servers: FrigateServerItem[]; total: number }> {
  const [servers, total] = await Promise.all([
    prisma.frigateServer.findMany({
      skip,
      take,
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.frigateServer.count(),
  ]);

  return {
    servers: servers.map((server) => ({
      id: server.id,
      tenantId: server.tenantId,
      tenantName: server.tenant.name,
      name: server.name,
      baseUrl: server.baseUrl,
      authType: server.authType as FrigateAuthType,
      username: server.username,
      password: server.password,
      token: server.token,
      configPath: server.configPath,
      verifyTls: server.verifyTls,
      isEnabled: server.isEnabled,
      isDefault: server.isDefault,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    })),
    total,
  };
}

export async function listServersForTenant(tenantId: string): Promise<FrigateServerItem[]> {
  const servers = await prisma.frigateServer.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return servers.map((server) => ({
    id: server.id,
    tenantId: server.tenantId,
    name: server.name,
    baseUrl: server.baseUrl,
    authType: server.authType as FrigateAuthType,
    username: server.username,
    password: server.password,
    token: server.token,
    configPath: server.configPath,
    verifyTls: server.verifyTls,
    isEnabled: server.isEnabled,
    isDefault: server.isDefault,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  }));
}

export async function createServer(input: FrigateServerInput): Promise<FrigateServerItem> {
  const existingDefault = await prisma.frigateServer.findFirst({
    where: { tenantId: input.tenantId, isDefault: true },
  });

  const shouldBeDefault = input.isDefault ?? !existingDefault;

  const server = await prisma.frigateServer.create({
    data: {
      tenantId: input.tenantId,
      name: input.name.trim(),
      baseUrl: input.baseUrl.trim(),
      authType: input.authType ?? 'none',
      username: input.username ?? null,
      password: input.password ?? null,
      token: input.token ?? null,
      configPath: input.configPath ?? null,
      verifyTls: input.verifyTls ?? true,
      isEnabled: input.isEnabled ?? true,
      isDefault: shouldBeDefault,
    },
  });

  if (shouldBeDefault) {
    await prisma.frigateServer.updateMany({
      where: { tenantId: input.tenantId, id: { not: server.id } },
      data: { isDefault: false },
    });
  }

  return {
    id: server.id,
    tenantId: server.tenantId,
    name: server.name,
    baseUrl: server.baseUrl,
    authType: server.authType as FrigateAuthType,
    username: server.username,
    password: server.password,
    token: server.token,
    configPath: server.configPath,
    verifyTls: server.verifyTls,
    isEnabled: server.isEnabled,
    isDefault: server.isDefault,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}

export async function updateServer(id: string, input: FrigateServerUpdateInput): Promise<FrigateServerItem> {
  const server = await prisma.frigateServer.findUnique({ where: { id } });
  if (!server) {
    throw new Error('Server not found');
  }

  const updated = await prisma.frigateServer.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      baseUrl: input.baseUrl?.trim() ?? undefined,
      authType: input.authType ?? undefined,
      username: input.username === undefined ? undefined : input.username,
      password: input.password === undefined ? undefined : input.password,
      token: input.token === undefined ? undefined : input.token,
      configPath: input.configPath === undefined ? undefined : input.configPath,
      verifyTls: input.verifyTls ?? undefined,
      isEnabled: input.isEnabled ?? undefined,
      isDefault: input.isDefault ?? undefined,
    },
  });

  if (input.isDefault) {
    await prisma.frigateServer.updateMany({
      where: { tenantId: updated.tenantId, id: { not: updated.id } },
      data: { isDefault: false },
    });
  }

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    name: updated.name,
    baseUrl: updated.baseUrl,
    authType: updated.authType as FrigateAuthType,
    username: updated.username,
    password: updated.password,
    token: updated.token,
    configPath: updated.configPath,
    verifyTls: updated.verifyTls,
    isEnabled: updated.isEnabled,
    isDefault: updated.isDefault,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteServer(id: string): Promise<void> {
  const server = await prisma.frigateServer.findUnique({ where: { id } });
  if (!server) {
    throw new Error('Server not found');
  }
  await prisma.frigateServer.delete({ where: { id } });
}

export async function getDefaultServerForTenant(tenantId: string) {
  const server = await prisma.frigateServer.findFirst({
    where: { tenantId, isDefault: true, isEnabled: true },
  });
  if (server) return server;

  return prisma.frigateServer.findFirst({
    where: { tenantId, isEnabled: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function loginForToken(baseUrl: string, username: string, password: string, verifyTls: boolean) {
  const url = new URL('/api/login', baseUrl);
  const isHttps = url.protocol === 'https:';
  const payload = JSON.stringify({ user: username, password });

  const options: https.RequestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  if (isHttps && !verifyTls) {
    options.rejectUnauthorized = false;
  }
  if (isHttps && config.nodeEnv === 'development' && options.rejectUnauthorized === undefined) {
    options.rejectUnauthorized = false;
  }

  const requestFn = isHttps ? https.request : http.request;

  return new Promise<string | null>((resolve, reject) => {
    const req = requestFn(url, options, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (!setCookie || setCookie.length === 0) {
        resolve(null);
        return;
      }
      const tokenCookie = setCookie.find((cookie) => cookie.startsWith('frigate_token='));
      if (!tokenCookie) {
        resolve(null);
        return;
      }
      const token = tokenCookie.split(';')[0].split('=')[1];
      resolve(token);
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function resolveTokenForServer(server: {
  id: string;
  baseUrl: string;
  authType: string;
  username: string | null;
  password: string | null;
  token: string | null;
  verifyTls: boolean;
}): Promise<string | null> {
  if (server.authType === 'token') {
    return server.token || null;
  }

  if (server.authType !== 'login') {
    return null;
  }

  if (!server.username || !server.password) {
    return null;
  }

  const cacheKey = server.id;
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey) || null;
  }

  const token = await loginForToken(server.baseUrl, server.username, server.password, server.verifyTls);
  if (token) {
    tokenCache.set(cacheKey, token);
  }
  return token;
}

async function resolveTokenFromEnv(): Promise<string | null> {
  if (config.frigateAuthToken) {
    return config.frigateAuthToken;
  }
  if (defaultTokenCache) {
    return defaultTokenCache;
  }
  if (!config.frigateUsername || !config.frigatePassword) {
    return null;
  }
  const token = await loginForToken(
    config.frigatBaseUrl,
    config.frigateUsername,
    config.frigatePassword,
    true
  );
  if (token) {
    defaultTokenCache = token;
  }
  return token;
}

export async function getTenantFrigateClient(tenantId: string): Promise<FrigateClientConfig> {
  const server = await getDefaultServerForTenant(tenantId);
  if (!server) {
    return {
      baseUrl: config.frigatBaseUrl,
      token: await resolveTokenFromEnv(),
      verifyTls: config.frigateVerifyTls,
    };
  }

  const token = await resolveTokenForServer(server);
  return {
    baseUrl: server.baseUrl,
    token,
    verifyTls: server.verifyTls,
  };
}
