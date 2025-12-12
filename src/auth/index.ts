/**
 * Authentication Module
 * Handles user authentication, authorization, and JWT management
 *
 * Exports:
 * - JWT service: signToken, verifyToken, extractTokenFromHeader
 * - Password service: hashPassword, verifyPassword
 * - Auth middleware: authMiddleware, requireTenant
 * - Auth types: JWTPayload, AuthenticatedRequest
 */

// JWT Token Service
export { signToken, verifyToken, extractTokenFromHeader } from './jwt.js';
export type { JWTPayload } from './jwt.js';

// Password Service
export { hashPassword, verifyPassword } from './password.js';

// Middleware
export { authMiddleware, requireTenant } from './middleware.js';
export type { AuthenticatedRequest } from './middleware.js';

