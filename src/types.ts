/**
 * Global Type Definitions
 * Shared types used across the application
 *
 * TODO: Expand types as application grows
 */

/**
 * Standard API Response Format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User Type
 * TODO: Expand with full user properties
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  // TODO: Add additional user properties
}

/**
 * Tenant Type
 * TODO: Expand with full tenant properties
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  // TODO: Add additional tenant properties
}

/**
 * Request Context attached by middleware
 * TODO: Expand with user, roles, permissions
 */
export interface RequestContext {
  tenantId?: string;
  userId?: string;
  roles?: string[];
  // TODO: Add additional context properties
}

/**
 * Error Response Type
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    timestamp: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Database Entity Base
 * All database entities should extend this
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Camera Livestream Type
 *
 * IMPORTANT ARCHITECTURE NOTES:
 * - Frontend never accesses Frigate directly
 * - Backend generates/proxies all livestream URLs
 * - Each livestream is scoped to a tenant and camera
 * - The camera "key" must match the Frigate camera name
 *
 * See CAMERA_LIVESTREAM_DESIGN.md for full documentation
 */
export interface CameraStream {
  cameraId: string;
  cameraName: string;
  streamUrl: string;
  status: 'live' | 'offline' | 'recording';
}

/**
 * TODO: Add more types as needed
 * - Authentication types (JwtPayload, TokenPair, etc.)
 * - Subscription types
 * - Team types
 * - Notification types
 * - Event types
 * - etc.
 */
