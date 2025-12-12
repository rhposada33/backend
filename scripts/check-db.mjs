#!/usr/bin/env node
/**
 * Check tenant and user mapping
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: { users: true },
  });

  console.log('All tenants:');
  for (const tenant of tenants) {
    console.log(`  ID: ${tenant.id}, Name: ${tenant.name}`);
    console.log(`    Users: ${tenant.users.map((u) => u.email).join(', ')}`);
  }

  const users = await prisma.user.findMany();
  console.log('\nAll users:');
  for (const user of users) {
    console.log(`  Email: ${user.email}, TenantId: ${user.tenantId}`);
  }

  const eventCounts = await prisma.tenant.findMany({
    include: {
      _count: { select: { events: true } },
    },
  });
  console.log('\nEvent counts by tenant:');
  for (const tenant of eventCounts) {
    console.log(`  Tenant ${tenant.id}: ${tenant._count.events} events`);
  }

  await prisma.$disconnect();
}

main();
