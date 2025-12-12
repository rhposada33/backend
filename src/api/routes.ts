/**
 * API Routes
 * Main routing configuration for the API
 *
 * Protected routes require JWT authentication via authMiddleware
 */

import { Router } from 'express';
import { authMiddleware } from '../auth/index.js';
import { tenantRouter } from '../modules/tenant/index.js';
import { cameraRouter } from '../modules/camera/index.js';

export const apiRouter = Router();

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
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
      },
      protected: '(Use JWT token in Authorization header)',
    },
  });
});

// Protected route example
apiRouter.get('/me', authMiddleware, (_req, res) => {
  res.status(200).json({
    message: 'This is a protected route. User is authenticated.',
    // User info available at req.user (see AuthenticatedRequest type)
  });
});

// Module routes
apiRouter.use('/tenants', tenantRouter);
apiRouter.use('/cameras', cameraRouter);

// TODO: Import and register route modules as they are created
// import { usersRouter } from './users/index.js';
// import { camerasRouter } from './cameras/index.js';
// import { eventsRouter } from './events/index.js';

// TODO: Register protected routes with authMiddleware
// apiRouter.use('/users', authMiddleware, usersRouter);
// apiRouter.use('/cameras', authMiddleware, camerasRouter);
// apiRouter.use('/events', authMiddleware, eventsRouter);
