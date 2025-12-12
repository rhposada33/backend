#!/usr/bin/env node
/**
 * Prisma Database Seed Script
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding database...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Default Tenant',
    },
  });
  console.log('✅ Tenant ready:', tenant.id, tenant.name);

  // Create test user for the default tenant
  const hashedPassword = await bcryptjs.hash('Password123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Test user ready:', user.email);

  console.info('✅ Database seeding completed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
