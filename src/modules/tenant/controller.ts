/**
 * Tenant Controller
 * Request handlers for tenant management endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware.js';
import * as tenantService from './service.js';

/**
 * GET /tenants/:id
 * Get a single tenant by ID
 */
export async function getTenant(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Tenant not found',
      });
      return;
    }

    res.status(200).json({
      data: tenant,
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get tenant',
    });
  }
}

/**
 * GET /tenants
 * Get all tenants with pagination
 */
export async function listTenants(req: Request, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid pagination parameters. Page >= 1, limit between 1-100',
      });
      return;
    }

    const skip = (page - 1) * limit;
    const { tenants, total } = await tenantService.getAllTenants(skip, limit);

    res.status(200).json({
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tenants',
    });
  }
}

/**
 * GET /tenants/admin
 * Get all tenants with pagination (admin only)
 */
export async function listTenantsAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can list tenants',
      });
      return;
    }

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    if (page < 1 || limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid pagination parameters. Page >= 1, limit between 1-100',
      });
      return;
    }

    const skip = (page - 1) * limit;
    const { tenants, total } = await tenantService.getAllTenants(skip, limit);

    res.status(200).json({
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List tenants admin error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list tenants',
    });
  }
}

interface CreateTenantRequest {
  name: string;
  description?: string;
}

/**
 * POST /tenants
 * Create a new tenant (admin only)
 */
export async function createTenant(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { name, description } = req.body as CreateTenantRequest;

    // Verify authenticated
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Verify admin role
    const isAdmin = await tenantService.isUserAdmin(req.user.userId);

    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can create tenants',
      });
      return;
    }

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Tenant name is required and must be a non-empty string',
      });
      return;
    }

    if (name.length > 255) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Tenant name must be 255 characters or less',
      });
      return;
    }

    // Create tenant
    const tenant = await tenantService.createTenant({
      name: name.trim(),
      description: description?.trim() || undefined,
    });

    res.status(201).json({
      message: 'Tenant created successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create tenant',
    });
  }
}

interface UpdateTenantRequest {
  name?: string;
  description?: string;
}

/**
 * PATCH /tenants/admin/:id
 * Update a tenant (admin only)
 */
export async function updateTenantAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description } = req.body as UpdateTenantRequest;

    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can update tenants',
      });
      return;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Tenant name must be a non-empty string',
        });
        return;
      }
      if (name.length > 255) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Tenant name must be 255 characters or less',
        });
        return;
      }
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Description must be a string',
      });
      return;
    }

    const tenant = await tenantService.updateTenant(id, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });

    res.status(200).json({
      message: 'Tenant updated successfully',
      data: tenant,
    });
  } catch (error) {
    console.error('Update tenant admin error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update tenant',
    });
  }
}

/**
 * DELETE /tenants/admin/:id
 * Delete a tenant (admin only)
 */
export async function deleteTenantAdmin(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const isAdmin = await tenantService.isUserAdmin(req.user.userId);
    if (!isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can delete tenants',
      });
      return;
    }

    await tenantService.deleteTenant(id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete tenant admin error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete tenant',
    });
  }
}
