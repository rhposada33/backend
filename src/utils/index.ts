/**
 * Utility Functions
 * Common utility functions used across the application
 *
 * TODO: Add date/time utilities
 * TODO: Add validation utilities
 * TODO: Add string manipulation utilities
 * TODO: Add error utilities
 * TODO: Add logging utilities
 * TODO: Add crypto utilities
 */

/**
 * Generate a unique ID
 * TODO: Implement using uuid or custom format
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 * TODO: Use proper email validation library
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format API response
 * TODO: Add response wrapper for consistent API responses
 */
export function formatResponse<T>(data: T, message = 'Success'): {
  success: boolean;
  data: T;
  message: string;
} {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Format API error response
 */
export function formatErrorResponse(error: string, statusCode = 500): {
  success: boolean;
  error: string;
  statusCode: number;
} {
  return {
    success: false,
    error,
    statusCode,
  };
}

// TODO: Add more utility functions as needed
// - Pagination utilities
// - Sorting utilities
// - Filtering utilities
// - Date formatting utilities
// - Array manipulation utilities
// - Object utilities
