# Prisma Database Setup

## Overview

This backend uses **Prisma ORM** for database management with PostgreSQL.

The schema includes three main models:
- **Tenant** - SaaS tenant (organization)
- **Camera** - Surveillance camera (linked to Frigate)
- **Event** - Detection events from Frigate

## Setup

### 1. Install Dependencies (Already Done)
```bash
npm install @prisma/client prisma
```

### 2. Configure Database URL

Edit `.env` and set your database URL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/sateliteyes_saas
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

This generates the TypeScript types from your schema.

## Database Commands

### Create & Apply Migrations (Development)
```bash
npm run db:migrate
```

This command:
1. Creates a new migration file
2. Applies it to your database
3. Regenerates the Prisma client

### Push Schema Changes (Quick Development)
```bash
npm run db:push
```

**Warning**: This skips migration files. Only use for local development.

### Deploy Migrations (Production)
```bash
npm run db:migrate:deploy
```

Applies pending migrations without prompting.

### Seed Database
```bash
npm run db:seed
```

Runs `prisma/seed.ts` to populate test data.

### Open Prisma Studio (GUI)
```bash
npm run db:studio
```

Opens a web UI to browse/edit your database.

## Schema Structure

### Tenant Model
```typescript
{
  id: string          // CUID primary key
  name: string        // Tenant name/company
  createdAt: DateTime // Creation timestamp
  
  // Relations
  cameras: Camera[]   // Cameras owned by tenant
  events: Event[]     // Events in tenant
}
```

### Camera Model
```typescript
{
  id: string          // CUID primary key
  tenantId: string    // Foreign key to Tenant
  tenant: Tenant      // Relation to Tenant
  key: string         // Frigate camera name
  label?: string      // Display label
  createdAt: DateTime // Creation timestamp
  
  // Relations
  events: Event[]     // Events for this camera
  
  // Unique constraint: one camera name per tenant
  @@unique([tenantId, key])
}
```

### Event Model
```typescript
{
  id: string          // CUID primary key
  tenantId: string    // Foreign key to Tenant
  tenant: Tenant      // Relation to Tenant
  cameraId: string    // Foreign key to Camera
  camera: Camera      // Relation to Camera
  frigateId: string   // Event ID from Frigate MQTT
  type: string        // Event type (person, car, etc.)
  label?: string      // Custom label
  hasSnapshot: boolean // Has screenshot
  hasClip: boolean    // Has video clip
  startTime?: float   // Event start timestamp
  endTime?: float     // Event end timestamp
  rawPayload: Json    // Raw MQTT payload
  createdAt: DateTime // Creation timestamp
  
  // Unique constraint: one event per frigate id per tenant
  @@unique([tenantId, frigateId])
  
  // Indexes for common queries
  @@index([tenantId])
  @@index([cameraId])
  @@index([createdAt])
}
```

## Using Prisma in Your Code

### Import the client
```typescript
import { prisma } from '@/db/client';
```

### Query examples

**Create a tenant:**
```typescript
const tenant = await prisma.tenant.create({
  data: {
    name: 'Acme Corp',
  },
});
```

**Find a tenant:**
```typescript
const tenant = await prisma.tenant.findUnique({
  where: { id: 'cuid...' },
  include: { cameras: true, events: true },
});
```

**Create a camera:**
```typescript
const camera = await prisma.camera.create({
  data: {
    tenantId: 'cuid...',
    key: 'front_door',
    label: 'Front Door Camera',
  },
});
```

**Query events with relations:**
```typescript
const events = await prisma.event.findMany({
  where: { tenantId: 'cuid...' },
  include: { camera: true, tenant: true },
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

## Migrations

Migrations are stored in `prisma/migrations/` and track all schema changes.

### Creating a migration

1. Modify `prisma/schema.prisma`
2. Run: `npm run db:migrate`
3. Name your migration descriptively (e.g., "add_status_to_event")
4. Commit migration files to git

### Reverting migrations (Development)

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

## Multi-Tenancy & Security

All models include `tenantId` for data isolation:
- Queries should always filter by `tenantId`
- Foreign key constraints ensure referential integrity
- Cascade delete ensures clean data removal

Example (query only tenant's data):
```typescript
const tenantEvents = await prisma.event.findMany({
  where: { tenantId: currentUser.tenantId },
});
```

## Environment Setup

### Development
- Use `DATABASE_URL` in `.env`
- Run `npm run db:migrate` for schema changes
- Use `npm run db:studio` to inspect data

### Production
- Use strong, unique database password
- Use connection pooling if needed
- Run `npm run db:migrate:deploy` in CI/CD
- Keep migration files in version control

## Troubleshooting

### "Database does not exist"
Create the database first:
```bash
createdb sateliteyes_saas
```

### "Unable to generate Prisma Client"
Run regeneration:
```bash
npm run db:generate
```

### Connection issues
- Verify `DATABASE_URL` format
- Check PostgreSQL is running
- Verify credentials
- Check firewall rules

### Type errors in editor
Regenerate types:
```bash
npm run db:generate
```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

## Next Steps

1. ✅ Schema created with Tenant, Camera, Event models
2. ✅ Prisma client generated
3. ✅ Database commands added to npm scripts
4. ⏳ Create initial migration: `npm run db:migrate`
5. ⏳ Seed development data: `npm run db:seed`
6. ⏳ Create repositories using Prisma client
7. ⏳ Add input validation & error handling

---

**Status**: ✅ Prisma configured and ready to use
