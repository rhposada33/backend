/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 *
 * Handles:
 * - Validation errors (400)
 * - Authentication errors (401)
 * - Authorization errors (403)
 * - Not found errors (404)
 * - Database errors (500)
 * - Unexpected errors (500)
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  constructor(message: string, public details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends ApiError {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message, 500, 'DATABASE_ERROR');
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Determine error status based on error type and message
 */
function determineErrorStatus(error: Error): { status: number; code: string } {
  const message = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  // Prisma errors
  if (errorName.includes('prismaclient')) {
    // Unique constraint violation
    if (errorName.includes('uniqueconstraint') || message.includes('unique')) {
      return { status: 409, code: 'CONFLICT' };
    }
    // Not found
    if (errorName.includes('notfound') || message.includes('not found')) {
      return { status: 404, code: 'NOT_FOUND' };
    }
    // Validation errors
    if (
      errorName.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return { status: 400, code: 'VALIDATION_ERROR' };
    }
    // General database error
    return { status: 500, code: 'DATABASE_ERROR' };
  }

  // JWT / Authentication errors
  if (errorName.includes('jsonwebtoken') || message.includes('token')) {
    if (message.includes('expired')) {
      return { status: 401, code: 'TOKEN_EXPIRED' };
    }
    if (message.includes('invalid')) {
      return { status: 401, code: 'INVALID_TOKEN' };
    }
    return { status: 401, code: 'AUTHENTICATION_ERROR' };
  }

  // Validation errors
  if (
    errorName.includes('validation') ||
    message.includes('validation') ||
    message.includes('invalid')
  ) {
    return { status: 400, code: 'VALIDATION_ERROR' };
  }

  // Not found errors
  if (message.includes('not found')) {
    return { status: 404, code: 'NOT_FOUND' };
  }

  // Unauthorized/forbidden
  if (
    message.includes('unauthorized') ||
    message.includes('permission') ||
    message.includes('forbidden')
  ) {
    return { status: 401, code: 'AUTHORIZATION_ERROR' };
  }

  // Default to server error
  return { status: 500, code: 'INTERNAL_SERVER_ERROR' };
}

/**
 * Format error response
 */
function formatErrorResponse(
  error: Error,
  status: number,
  code: string,
  isDevelopment: boolean
) {
  const errorObj: Record<string, unknown> = {
    code,
    message: error.message || 'An unexpected error occurred',
    status,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    errorObj.stack = error.stack.split('\n');
  }

  // Include details if validation error
  if (error instanceof ValidationError && error.details) {
    errorObj.details = error.details;
  }

  const response: Record<string, unknown> = {
    success: false,
    error: errorObj,
  };

  return response;
}

/**
 * Global error handler middleware
 *
 * Must be registered LAST in middleware chain:
 * app.use(errorHandler);
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';

  // Check if error is a custom ApiError
  if (error instanceof ApiError) {
    status = error.status;
    code = error.code;
  } else {
    // Determine status and code from error message/type
    const errorInfo = determineErrorStatus(error);
    status = errorInfo.status;
    code = errorInfo.code;
  }

  // Log error with appropriate level
  const logLevel =
    status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  const logMessage = `[${code}] ${error.message || 'Unknown error'}`;

  if (logLevel === 'error') {
    console.error(logMessage, error);
  } else if (logLevel === 'warn') {
    console.warn(logMessage);
  } else {
    console.info(logMessage);
  }

  // Don't send stack traces to client in production
  const response = formatErrorResponse(error, status, code, isDevelopment);

  res.status(status).json(response);
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes to error handler
 *
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   const data = await db.query();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
