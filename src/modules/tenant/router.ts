/**
 * Tenant Router
 * Express routes for tenant management endpoints
 */

import { Router } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { getTenant, listTenants, createTenant, listTenantsAdmin, updateTenantAdmin, deleteTenantAdmin } from './controller.js';

export const tenantRouter = Router();

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: Get tenant by ID
 *     description: Retrieve a single tenant by its unique identifier (public endpoint)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Tenant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       404:
 *         description: Tenant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /tenants:
 *   get:
 *     tags:
 *       - Tenants
 *     summary: List all tenants
 *     description: Retrieve all tenants with pagination support (public endpoint)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts at 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page (1-100)
 *     responses:
 *       200:
 *         description: List of tenants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TenantListResponse'
 *       400:
 *         description: Invalid pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Tenants
 *     summary: Create new tenant
 *     description: Create a new tenant (admin only, requires authentication)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenantRequest'
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Tenant created successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Forbidden - user is not an administrator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
tenantRouter.get('/admin', authMiddleware, listTenantsAdmin);
tenantRouter.patch('/admin/:id', authMiddleware, updateTenantAdmin);
tenantRouter.delete('/admin/:id', authMiddleware, deleteTenantAdmin);
tenantRouter.get('/:id', getTenant);

tenantRouter.post('/', authMiddleware, createTenant);

export default tenantRouter;
