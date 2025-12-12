/**
 * API Routes
 * Main routing configuration for the API
 *
 * TODO: Add health check endpoint
 * TODO: Add authentication routes
 * TODO: Add user management routes
 * TODO: Add tenant management routes
 * TODO: Add business logic routes
 */

import { Router } from 'express';

export const apiRouter = Router();

// TODO: Import and register route modules
// import { authRouter } from './auth/index.js';
// import { usersRouter } from './users/index.js';
// import { tenantsRouter } from './tenants/index.js';

// TODO: Register route modules
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/users', usersRouter);
// apiRouter.use('/tenants', tenantsRouter);

// Health check endpoint (duplicate from server.ts can be removed)
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder message
apiRouter.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Sateliteyes SaaS Backend API',
    version: 'v1',
    endpoints: {
      health: '/health',
      // TODO: List API endpoints as they are added
    },
  });
});
