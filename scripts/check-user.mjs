#!/usr/bin/env node
/**
 * Check database user and reset password if needed
 */

import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🔍 Checking test user...');

  const user = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  if (!user) {
    console.error('❌ Test user not found');
    process.exit(1);
  }

  console.log('✅ User found:', user);

  // Verify password
  const password = 'Password123!';
  const match = await bcryptjs.compare(password, user.password);
  console.log('Password match:', match);

  // If password doesn't match, update it
  if (!match) {
    console.info('⚠️ Password mismatch, updating...');
    const newHash = await bcryptjs.hash(password, 10);
    const updated = await prisma.user.update({
      where: { email: 'test@example.com' },
      data: { password: newHash },
    });
    console.log('✅ Password updated');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
