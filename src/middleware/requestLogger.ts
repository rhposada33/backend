/**
 * Request Logger Middleware
 * Logs incoming requests and response times
 *
 * TODO: Implement structured logging
 * TODO: Add request/response body logging for debugging
 * TODO: Add performance metrics
 * TODO: Integrate with external logging service
 */

import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const path = req.path;

  console.info(`→ ${method} ${path}`);

  // TODO: Add response time tracking
  // TODO: Add status code logging
  // TODO: Add user/tenant context logging

  next();
}
