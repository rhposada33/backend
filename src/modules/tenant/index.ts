/**
 * Tenant Module
 * Complete tenant management module with service, controller, and router
 */

// Export service functions
export * as tenantService from './service.js';
export type { TenantResponse, CreateTenantInput } from './service.js';

// Export controller
export * as tenantController from './controller.js';

// Export router
export { tenantRouter, default as TenantRouter } from './router.js';
