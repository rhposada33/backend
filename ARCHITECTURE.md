# Project Architecture & Development Guide

## Overview

This is a multi-tenant SaaS backend built with:
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Package Manager**: npm/bun
- **Development**: nodemon + ts-node

## Project Structure

```
src/
├── api/                     # API Routes & Endpoints
│   ├── routes.ts            # Main route configuration
│   └── [feature]/           # Feature-specific routes (to be added)
│       ├── controller.ts
│       ├── routes.ts
│       └── index.ts
│
├── modules/                 # Business Logic Modules
│   ├── index.ts             # Module registry
│   ├── users/               # User management (TODO)
│   ├── tenants/             # Tenant management (TODO)
│   ├── teams/               # Team management (TODO)
│   ├── subscriptions/       # Subscription management (TODO)
│   └── notifications/       # Notifications (TODO)
│
├── middleware/              # Express Middleware
│   ├── errorHandler.ts      # Global error handling
│   ├── requestLogger.ts     # Request logging
│   ├── tenantResolver.ts    # Tenant extraction & validation
│   ├── auth.ts              # Authentication (TODO)
│   └── validation.ts        # Input validation (TODO)
│
├── config/                  # Configuration
│   ├── index.ts             # Config loader
│   ├── database.ts          # Database config (TODO)
│   └── constants.ts         # Application constants (TODO)
│
├── db/                      # Database Layer
│   ├── index.ts             # Connection & initialization
│   ├── models/              # Database models/schemas (TODO)
│   ├── migrations/          # Database migrations (TODO)
│   └── repositories/        # Data access layer (TODO)
│
├── auth/                    # Authentication & Authorization
│   ├── index.ts             # Auth exports
│   ├── jwt.ts               # JWT utilities (TODO)
│   ├── password.ts          # Password hashing (TODO)
│   ├── roles.ts             # RBAC configuration (TODO)
│   └── guards.ts            # Auth guards (TODO)
│
├── utils/                   # Utility Functions
│   ├── index.ts             # Common utilities
│   ├── validators.ts        # Validation helpers (TODO)
│   ├── formatters.ts        # Response formatters (TODO)
│   └── errors.ts            # Error utilities (TODO)
│
└── server.ts                # Application Entrypoint
```

## Development Workflow

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Available Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run type-check      # Check TypeScript types

# Building
npm run build           # Compile TypeScript
npm start              # Run compiled code

# Code Quality
npm run lint           # Check code with ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting
```

## Key Concepts

### Multi-Tenancy

The application is designed for multi-tenant isolation:
- Tenant ID extracted via middleware (header, subdomain, or JWT)
- Tenant context attached to every request
- Database queries filtered by tenant
- Access control enforced at middleware level

**Current Implementation**: `tenantResolver` middleware in `src/middleware/tenantResolver.ts`

### Request Flow

```
Request
  ↓
CORS & Helmet (Security)
  ↓
Body Parser
  ↓
Request Logger
  ↓
Tenant Resolver (Multi-tenancy)
  ↓
Route Handler
  ↓
Error Handler
  ↓
Response
```

### Error Handling

Global error handler in `src/middleware/errorHandler.ts`:
- Catches all errors
- Formats consistent error responses
- Logs errors with context
- Returns appropriate HTTP status codes

### Configuration

Environment-based configuration loaded from `.env`:
- Application settings (port, environment)
- Security settings (JWT secrets, CORS)
- Database connection strings
- Third-party API keys

## Implementation Checklist

### Phase 1: Core Infrastructure ✓
- [x] Project structure
- [x] TypeScript configuration
- [x] ESLint & Prettier setup
- [x] Express server setup
- [x] Middleware infrastructure
- [x] Error handling
- [x] Configuration system
- [x] Tenant resolver

### Phase 2: Authentication (TODO)
- [ ] JWT token generation/validation
- [ ] Password hashing (bcrypt)
- [ ] Refresh token mechanism
- [ ] Auth middleware
- [ ] Role-based access control (RBAC)
- [ ] Session management

### Phase 3: Database (TODO)
- [ ] Database client setup (ORM/query builder)
- [ ] Connection pooling
- [ ] Migration system
- [ ] Model definitions
- [ ] Repository pattern
- [ ] Transaction handling

### Phase 4: Core Modules (TODO)
- [ ] User management (CRUD)
- [ ] Tenant management
- [ ] Team management
- [ ] Subscription/billing (if needed)
- [ ] Notification system

### Phase 5: Advanced Features (TODO)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Request validation
- [ ] Rate limiting
- [ ] Caching layer
- [ ] Event system
- [ ] Webhooks
- [ ] Analytics/monitoring

## Technology Decisions

### Express vs Fastify

**Chose: Express**
- Mature and battle-tested
- Largest ecosystem
- Simple for standard SaaS needs
- Rich middleware ecosystem
- Great for multi-tenant applications

**Alternative (Fastify)**:
- Use if performance/throughput is critical
- Better for high-volume APIs
- JSON Schema validation built-in

### Database

**TODO: Choose database**
Options:
- PostgreSQL (recommended for SaaS)
- MongoDB (if document-based)
- MySQL
- Others

**ORM/Query Builder Options**:
- Prisma (modern, type-safe)
- TypeORM (feature-rich)
- Knex.js (query builder)
- Sequelize (traditional)

## Testing Strategy (TODO)

```
tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
└── e2e/                   # End-to-end tests
```

## Security Considerations

- [x] Helmet.js for HTTP headers
- [x] CORS configured
- [x] Environment variables for secrets
- [ ] Input validation & sanitization
- [ ] Rate limiting
- [ ] SQL injection prevention (via ORM)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Tenant isolation enforcement

## Logging Strategy (TODO)

Recommended packages:
- Winston
- Pino
- Bunyan

Structure:
- Request logging (all requests)
- Error logging (with stack traces)
- Audit logging (sensitive operations)
- Performance logging (slow queries)

## Deployment (TODO)

```
Deployment Options:
- Docker (recommended)
- Kubernetes
- Heroku
- AWS Lambda
- DigitalOcean App Platform
- Railway
- Fly.io
```

## Next Steps

1. **Install Dependencies**: `npm install`
2. **Setup Database**: Choose DB & ORM, create schema
3. **Implement Auth**: JWT, password hashing, RBAC
4. **Create User Module**: CRUD operations
5. **Create Tenant Module**: Multi-tenant setup
6. **Add API Documentation**: Swagger/OpenAPI
7. **Setup Testing**: Unit, integration, E2E tests
8. **Deploy**: Docker, CI/CD pipeline

## Useful Resources

- [Express.js Documentation](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [12 Factor App](https://12factor.net/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## Troubleshooting

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

### TypeScript errors
```bash
npm run type-check  # See detailed errors
npm run lint        # Check linting issues
```

### Dependencies issues
```bash
rm -rf node_modules package-lock.json
npm install
```

---

**Last Updated**: December 2025
**Version**: 1.0.0
