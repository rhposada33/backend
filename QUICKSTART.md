# Quick Start Guide

## Prerequisites

- Node.js v18+
- npm or bun package manager
- (Optional) PostgreSQL for database

## Initial Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your settings (defaults are good for local development).

### 3. Start Development Server

```bash
npm run dev
```

You should see:
```
🚀 Server is running on port 3000
📍 Environment: development
🔒 Multi-tenant mode: true
```

### 4. Test the Server

```bash
# In another terminal
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "OK",
  "version": "v1",
  "timestamp": "2025-12-12T10:30:00.000Z"
}
```

## Key Endpoints

- **Health Check**: `GET /health`
- **API Root**: `GET /api/v1/`

## Development Commands

```bash
# Start with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check

# Build for production
npm run build
npm start
```

## Project Structure

Key files:
- `src/server.ts` - Application entrypoint
- `src/config/index.ts` - Configuration loader
- `src/middleware/` - Express middleware
- `src/api/routes.ts` - API routes
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

## Multi-Tenant Support

The API is designed for multi-tenancy. Include tenant ID in requests:

```bash
# Example with tenant header
curl -H "X-Tenant-ID: tenant-123" http://localhost:3000/api/v1/
```

The `tenantResolver` middleware automatically extracts and validates tenant context.

## What's Next?

1. **Database Setup**
   - Choose database (PostgreSQL recommended)
   - Setup ORM (Prisma recommended)
   - Create schema and migrations

2. **Authentication**
   - Implement JWT token generation
   - Add password hashing
   - Create auth routes

3. **Business Logic**
   - Create user management module
   - Create tenant management module
   - Add business logic as needed

See `ARCHITECTURE.md` for detailed implementation guide.

## Troubleshooting

### Port 3000 already in use?

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Dependencies not installing?

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors?

```bash
# Check detailed type errors
npm run type-check

# Fix lint issues
npm run lint:fix
```

## Tips

- Keep environment secrets in `.env` (never commit)
- Use `.env.example` as template for new team members
- Follow the folder structure for new features
- Each module should be self-contained and testable
- Check `TODO` comments throughout code for implementation hints

---

For more details, see:
- `README.md` - Project overview
- `ARCHITECTURE.md` - Detailed architecture guide
- `.env.example` - Configuration options
