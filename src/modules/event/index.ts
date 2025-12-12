/**
 * Event Module
 * Complete event management module with service, controller, and router
 */

// Export service functions and types
export * as eventService from './service.js';
export type { EventWithCamera, EventDetail, ListEventsResult } from './service.js';

// Export controller
export * as eventController from './controller.js';

// Export router
export { eventRouter, default as EventRouter } from './router.js';
