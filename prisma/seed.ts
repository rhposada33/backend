/**
 * Prisma Database Seed Script
 * Run with: npm run db:seed
 *
 * TODO: Add seed data for development/testing
 */

import { prisma } from '../src/db/client.js';

async function main(): Promise<void> {
  console.info('🌱 Seeding database...');

  // TODO: Add seed data
  // Example:
  // const tenant = await prisma.tenant.create({
  //   data: {
  //     name: 'Default Tenant',
  //   },
  // });
  // console.log('Created tenant:', tenant);

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
