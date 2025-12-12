/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user information to requests
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt.js';
import { prisma } from '../db/client.js';

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT and attach user to request
 * Must be placed after middleware that sets req.headers
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization token provided',
      });
      return;
    }

    // Verify JWT token
    const payload = verifyToken(token);
    req.user = payload;

    // Optionally: Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true },
    });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
      return;
    }

    // Verify tenant still exists
    if (!user.tenant) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Tenant not found',
      });
      return;
    }

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication verification failed',
    });
  }
}

/**
 * Optional: Require specific tenant (for multi-tenant routes)
 * Use after authMiddleware
 */
export function requireTenant(requiredTenantId: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.tenantId !== requiredTenantId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this tenant',
      });
      return;
    }
    next();
  };
}
