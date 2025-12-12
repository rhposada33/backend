/**
 * Modules Directory
 * Business logic modules for the application
 *
 * Structure:
 * modules/
 *   ├── users/              # User management module
 *   ├── tenants/            # Tenant management module
 *   ├── teams/              # Team management module (optional)
 *   ├── subscriptions/      # Subscription management module (optional)
 *   ├── notifications/      # Notification module
 *   └── [feature]/          # Add feature-specific modules as needed
 *
 * Each module should follow this structure:
 * module/
 *   ├── types.ts            # TypeScript interfaces/types
 *   ├── controller.ts       # Route controllers
 *   ├── service.ts          # Business logic
 *   ├── repository.ts       # Database queries
 *   ├── middleware.ts       # Module-specific middleware
 *   ├── validations.ts      # Input validation schemas
 *   └── index.ts            # Module exports
 *
 * TODO: Create user management module
 * TODO: Create tenant management module
 * TODO: Create team management module
 * TODO: Create subscription management module
 * TODO: Create notification system
 * TODO: Add domain-specific modules as business requirements grow
 */

export const modulesIndex = {
  // TODO: Register modules here
  // users: require('./users'),
  // tenants: require('./tenants'),
  // teams: require('./teams'),
  // subscriptions: require('./subscriptions'),
  // notifications: require('./notifications'),
};
