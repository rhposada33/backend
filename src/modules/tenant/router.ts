/**
 * Tenant Router
 * Express routes for tenant management endpoints
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { getTenant, listTenants, createTenant } from './controller.js';

export const tenantRouter = Router();

/**
 * GET /tenants/:id
 * Get a single tenant by ID
 * Public endpoint
 */
tenantRouter.get('/:id', getTenant);

/**
 * GET /tenants
 * Get all tenants with pagination
 * Public endpoint
 */
tenantRouter.get('/', listTenants);

/**
 * POST /tenants
 * Create a new tenant
 * Requires authentication + admin role
 */
tenantRouter.post('/', authMiddleware, createTenant);

export default tenantRouter;
