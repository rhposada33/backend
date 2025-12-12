/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 *
 * TODO: Implement comprehensive error handling
 * TODO: Add logging for errors
 * TODO: Add error code mapping
 * TODO: Implement error recovery mechanisms
 */

import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  error: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';

  console.error(`[Error] ${code}: ${message}`, error);

  res.status(status).json({
    error: {
      code,
      message,
      status,
      timestamp: new Date().toISOString(),
    },
  });
}
