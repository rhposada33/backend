/**
 * Explore Router
 * Frigate Explore proxy routes
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authMiddleware } from '../../auth/middleware.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { listExploreEvents, getExploreSummary, getExploreSnapshot, getExploreEventDetail } from './controller.js';

export const exploreRouter = Router();

async function authMiddlewareWithQueryToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.headers.authorization && typeof req.query.token === 'string') {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  await authMiddleware(req, res, next);
}

exploreRouter.get('/events', authMiddleware, asyncHandler(listExploreEvents));
exploreRouter.get('/events/summary', authMiddleware, asyncHandler(getExploreSummary));
exploreRouter.get('/events/:id', authMiddleware, asyncHandler(getExploreEventDetail));
exploreRouter.get('/events/:id/snapshot', authMiddlewareWithQueryToken, asyncHandler(getExploreSnapshot));

export default exploreRouter;
