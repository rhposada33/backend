/**
 * API Routes
 * Main routing configuration for the API
 *
 * Protected routes require JWT authentication via authMiddleware
 */

import { Router } from 'express';
import { authMiddleware } from '../auth/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { authRouter, userRouter } from '../modules/user/index.js';
import { tenantRouter } from '../modules/tenant/index.js';
import { cameraRouter } from '../modules/camera/index.js';
import { streamsRouter } from '../modules/streams/index.js';
import { eventRouter } from '../modules/event/index.js';
import { alarmRouter } from '../modules/alarm/index.js';
import { exploreRouter } from '../modules/explore/index.js';

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
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', authMiddleware, userRouter);
apiRouter.use('/tenants', tenantRouter);
apiRouter.use('/cameras', cameraRouter);
apiRouter.use('/streams', streamsRouter);
apiRouter.use('/events', eventRouter);
apiRouter.use('/alarms', alarmRouter);
apiRouter.use('/explore', exploreRouter);

// Catch-all 404 handler for undefined routes
// Must be after all other route definitions
apiRouter.use((_req, _res, next) => {
  next(new NotFoundError('Endpoint not found'));
});

// TODO: Import and register route modules as they are created
// import { usersRouter } from './users/index.js';
// import { camerasRouter } from './cameras/index.js';
// import { eventsRouter } from './events/index.js';

// TODO: Register protected routes with authMiddleware
// apiRouter.use('/users', authMiddleware, usersRouter);
// apiRouter.use('/cameras', authMiddleware, camerasRouter);
// apiRouter.use('/events', authMiddleware, eventsRouter);
