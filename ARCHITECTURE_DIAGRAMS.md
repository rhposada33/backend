# Backend System Architecture Diagram

## 🎯 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION                        │
│                   (Frontend / Mobile / API Client)               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                HTTP Requests          HTTP Requests
                    │                         │
                    ▼                         ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │  /api/v1/auth        │  │  /api/v1/tenants     │
        │  - /register         │  │  - GET /:id          │
        │  - /login            │  │  - GET /             │
        │  - /profile          │  │  - POST /            │
        └──────────────────────┘  └──────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                         ┌───────▼────────┐
                         │   API Router   │
                         │  (routes.ts)   │
                         └───────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │ Auth Controller  │      │ Tenant Controller│
          │  - register()    │      │  - getTenant()   │
          │  - login()       │      │  - listTenants() │
          │  - getProfile()  │      │  - createTenant()│
          └────────┬─────────┘      └────────┬─────────┘
                   │                         │
                   │    ┌──────────────┐    │
                   │    │   Middleware │    │
                   │    │  - Auth check│    │
                   │    │  - Error hdl │    │
                   │    └──────────────┘    │
                   │                         │
                   ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │  Auth Service    │      │ Tenant Service   │
          │  - register      │      │  - getTenantById │
          │  - login         │      │  - getAllTenants │
          │  - verifyToken   │      │  - createTenant  │
          │  - hashPassword  │      │  - updateTenant  │
          └────────┬─────────┘      └────────┬─────────┘
                   │                         │
                   └────────────┬────────────┘
                                 │
                         ┌───────▼────────┐
                         │  Prisma ORM    │
                         │  (Database)    │
                         └───────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
              ┌────────────┐          ┌────────────┐
              │  Users     │          │  Tenants   │
              │  Table     │          │  Table     │
              └────────────┘          └────────────┘
                    │                         │
                    │         ┌───────────────┤
                    │         │               │
                    ▼         ▼               ▼
              ┌─────────────────────────────────────┐
              │        PostgreSQL Database          │
              │  (Persistent Data Storage)          │
              └─────────────────────────────────────┘
```

## 🔄 Request Flow: Create Tenant (Admin)

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ POST /api/v1/tenants
     │ Authorization: Bearer eyJhbGc...
     │ Content-Type: application/json
     │
     ▼
┌──────────────┐
│ Express.js   │
│  (Router)    │
└────┬─────────┘
     │ Match POST /tenants
     │
     ▼
┌──────────────────────────┐
│ authMiddleware           │
│ 1. Extract token         │
│ 2. Verify JWT signature  │
│ 3. Decode userId         │
│ 4. Attach to req.user    │
└────┬─────────────────────┘
     │
     ├─ Valid? Continue : Return 401
     │
     ▼
┌──────────────────────────┐
│ tenantController         │
│ .createTenant(req, res)  │
│                          │
│ 1. Extract userId        │
│ 2. Check if admin        │
│ 3. Validate input        │
│ 4. Call service          │
└────┬─────────────────────┘
     │
     ├─ Not admin? Return 403
     ├─ Invalid input? Return 400
     │
     ▼
┌──────────────────────────┐
│ tenantService            │
│ .isUserAdmin(userId)     │
│ .createTenant(input)     │
│                          │
│ 1. Check User.isAdmin    │
│ 2. Insert into Tenants   │
│ 3. Return TenantResponse │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ PostgreSQL               │
│ INSERT INTO tenants      │
│ (id, name, description)  │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Prisma Client            │
│ Return created tenant     │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ tenantService            │
│ Return TenantResponse    │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ tenantController         │
│ res.status(201)          │
│ res.json(tenantResponse) │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Express.js               │
│ (Response Handler)       │
└────┬─────────────────────┘
     │ HTTP 201 Created
     │ Content-Type: application/json
     │ { id, name, description, ... }
     │
     ▼
┌─────────┐
│ Browser │
│ Display │
│ Success │
└─────────┘
```

## 📁 Complete File Structure

```
backend/
├── .env                          # Environment variables
├── .env.example                  # Example env template
├── .eslintrc.json               # ESLint configuration
├── .prettierrc.json             # Prettier formatting rules
├── .gitignore                   # Git ignore patterns
├── package.json                 # Node.js dependencies
├── package-lock.json            # Dependency lock file
├── tsconfig.json                # TypeScript configuration
├── tsconfig.app.json            # App-specific TS config
├── tsconfig.node.json           # Node-specific TS config
├── nodemon.json                 # Dev server configuration
│
├── src/
│   ├── server.ts               # Express server initialization
│   │
│   ├── auth/                   # Authentication module
│   │   ├── jwt.ts              # JWT token handling
│   │   ├── password.ts         # Password hashing
│   │   └── middleware.ts       # Auth middleware
│   │
│   ├── modules/                # Business domain modules
│   │   ├── index.ts            # Module exports
│   │   └── tenant/             # Tenant management module
│   │       ├── service.ts      # Business logic
│   │       ├── controller.ts   # HTTP handlers
│   │       ├── router.ts       # Express routes
│   │       └── index.ts        # Module exports
│   │
│   ├── api/
│   │   └── routes.ts           # Main API router
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts     # Error handling
│   │   ├── requestLogger.ts    # Request logging
│   │   └── tenantResolver.ts   # Tenant middleware
│   │
│   └── routes/                 # Legacy routes
│       └── auth.ts             # Auth endpoints
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Database seeding
│   └── migrations/             # Database migrations
│       └── [migration files]
│
├── dist/                       # Compiled JavaScript (auto-generated)
├── node_modules/               # Dependencies (auto-generated)
│
└── Documentation/
    ├── SESSION_SUMMARY.md      # This session's summary
    ├── TENANT_MODULE.md        # Tenant API documentation
    ├── JWT_QUICK_START.md      # Auth setup guide
    ├── ARCHITECTURE.md         # System architecture
    ├── QUICKSTART.md           # Quick reference
    ├── QUICK_REFERENCE.md      # API reference
    ├── EXAMPLE_MODULE.md       # Module template
    ├── PRISMA_SETUP.md         # Database setup
    ├── README.md               # Project overview
    └── [other documentation]
```

## 🔌 Module Connection Points

```
tenantController
    │
    ├─ Uses: tenantService
    │        ├─ Uses: prisma.tenant.findUnique()
    │        ├─ Uses: prisma.tenant.findMany()
    │        ├─ Uses: prisma.tenant.create()
    │        └─ Uses: prisma.user.findUnique()
    │
    └─ Expects: AuthenticatedRequest
             (from authMiddleware)
             ├─ req.user: { userId, tenantId }
             └─ req.tenantId: string
```

## 🔐 Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ POST /auth/register
       │ { email, password, tenantId }
       │
       ▼
┌──────────────────┐     ┌──────────────────┐
│ Register Route   │────▶│ Password Service │
│ (auth.ts)        │     │ .hashPassword()  │
│                  │     │ (bcrypt)         │
└──────┬───────────┘     └──────────────────┘
       │
       ▼
┌──────────────────┐
│ JWT Service      │
│ .signToken()     │
│ (jsonwebtoken)   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Response:        │
│ { token, user }  │
│ token ←────────┐ │
│                │ │
└────────────────┼─┘
                 │
                 │ Store in LocalStorage
                 │
                 ▼
            ┌──────────┐
            │ Browser  │
            │ Storage  │
            └──────────┘
                 │
                 │
                 │ Future Requests:
                 │ Authorization: Bearer {token}
                 │
                 ▼
            ┌──────────────────┐
            │ authMiddleware   │
            │ .verifyToken()   │
            │                  │
            │ 1. Extract token │
            │ 2. Verify sig    │
            │ 3. Decode payload│
            │ 4. Attach to req │
            └──────────────────┘
```

## 📊 Data Model Relationships

```
User                    Tenant
─────                   ──────
id ─────┐              id
email   │              name
pass    │              description
        │
        └──────────────▶ tenantId (FK)
isAdmin                 
createdAt               
updatedAt               

(Each User belongs to ONE Tenant)
(Each Tenant can have MANY Users)
(Only Tenant admins can manage tenants)
```

## 🎯 API Endpoints Summary

```
Public Endpoints (No Auth Required)
├── GET /api/v1/tenants/:id              Get tenant by ID
└── GET /api/v1/tenants?page=1&limit=10  List tenants (paginated)

Protected Endpoints (Auth Required)
└── POST /api/v1/tenants                 Create tenant (admin-only)

Authentication Endpoints
├── POST /api/v1/auth/register           Register new user
└── POST /api/v1/auth/login              Login user

Status Codes
├── 200 OK                 Successful GET/POST
├── 201 Created            Resource created
├── 400 Bad Request        Invalid input
├── 401 Unauthorized       Missing/invalid token
├── 403 Forbidden          Not admin / No permission
├── 404 Not Found          Resource not found
└── 500 Server Error       Internal error
```

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────┐
│  Developer Workstation (Local Dev)      │
│  npm run dev                            │
│  Port: 3000                            │
└─────────────────────────────────────────┘
         │
         │ docker build
         │
         ▼
┌─────────────────────────────────────────┐
│  Docker Image                           │
│  Node.js + TypeScript compiled          │
└─────────────────────────────────────────┘
         │
         │ docker-compose up
         │
         ▼
┌─────────────────────────────────────────┐
│  Docker Container (Production)          │
│  Backend Service                        │
│  Port: 3000                            │
└──────────┬──────────────────────────────┘
           │
           │ Network
           │
           ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Container                   │
│  Database Service                       │
│  Port: 5432                            │
└─────────────────────────────────────────┘
```

---

**Last Updated:** 2025-12-12  
**Session Status:** ✅ Complete  
