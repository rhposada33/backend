/**
 * Frigate Server Controller
 * Admin-only management of tenant-linked Frigate servers.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import * as tenantService from '../tenant/service.js';
import * as frigateServerService from './service.js';
import { prisma } from '../../db/client.js';

export async function listFrigateServersAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can list servers' });
    return;
  }

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  if (page < 1 || limit < 1 || limit > 500) {
    throw new ValidationError('page must be >= 1, limit must be between 1 and 500');
  }

  const skip = (page - 1) * limit;
  const result = await frigateServerService.listAllServers(skip, limit);

  res.status(200).json({
    data: result.servers,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  });
}

export async function listTenantsAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can list tenants' });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;
  if (limit < 1 || limit > 500) {
    throw new ValidationError('limit must be between 1 and 500');
  }

  const tenants = await prisma.tenant.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });

  res.status(200).json({ data: tenants });
}

export async function createFrigateServerAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can create servers' });
    return;
  }

  const {
    tenantId,
    name,
    baseUrl,
    authType,
    username,
    password,
    token,
    configPath,
    verifyTls,
    isEnabled,
    isDefault,
  } = req.body;

  if (!tenantId || typeof tenantId !== 'string') {
    throw new ValidationError('tenantId is required');
  }
  if (!name || typeof name !== 'string') {
    throw new ValidationError('name is required');
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new ValidationError('baseUrl is required');
  }
  if (configPath !== undefined && typeof configPath !== 'string') {
    throw new ValidationError('configPath must be a string');
  }
  if (authType && !['none', 'token', 'login'].includes(authType)) {
    throw new ValidationError('authType must be one of: none, token, login');
  }
  if (authType === 'login' && (!username || !password)) {
    throw new ValidationError('username and password are required for login auth');
  }
  if (authType === 'token' && !token) {
    throw new ValidationError('token is required for token auth');
  }

  const server = await frigateServerService.createServer({
    tenantId,
    name,
    baseUrl,
    authType,
    username,
    password,
    token,
    configPath,
    verifyTls,
    isEnabled,
    isDefault,
  });

  res.status(201).json({ data: server });
}

export async function updateFrigateServerAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can update servers' });
    return;
  }

  const { id } = req.params;
  const {
    name,
    baseUrl,
    authType,
    username,
    password,
    token,
    configPath,
    verifyTls,
    isEnabled,
    isDefault,
  } = req.body;

  if (authType && !['none', 'token', 'login'].includes(authType)) {
    throw new ValidationError('authType must be one of: none, token, login');
  }
  if (configPath !== undefined && typeof configPath !== 'string') {
    throw new ValidationError('configPath must be a string');
  }

  const updated = await frigateServerService.updateServer(id, {
    name,
    baseUrl,
    authType,
    username,
    password,
    token,
    configPath,
    verifyTls,
    isEnabled,
    isDefault,
  });

  res.status(200).json({ data: updated });
}

export async function deleteFrigateServerAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can delete servers' });
    return;
  }

  const { id } = req.params;
  await frigateServerService.deleteServer(id);
  res.status(204).send();
}

export async function setDefaultFrigateServer(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const isAdmin = await tenantService.isUserAdmin(req.user.userId);
  if (!isAdmin) {
    res.status(403).json({ error: 'Forbidden', message: 'Only admins can update servers' });
    return;
  }

  const { id } = req.params;
  const updated = await frigateServerService.updateServer(id, { isDefault: true });
  res.status(200).json({ data: updated });
}
