#!/usr/bin/env node
/**
 * Seed test events into the database
 * Creates sample event records for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding test events...');

  // Get the first tenant (where test user belongs)
  const tenant = await prisma.tenant.findFirst({
    include: { users: true },
  });

  if (!tenant) {
    console.error('❌ No tenants found. Run seed first.');
    process.exit(1);
  }

  console.log(`✅ Using tenant: ${tenant.id} (${tenant.name})`);
  console.log(`   Users in this tenant: ${tenant.users.map((u) => u.email).join(', ')}`);


  // Create test cameras
  const cameras = [];
  for (let i = 1; i <= 3; i++) {
    const camera = await prisma.camera.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: `camera-${i}`,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        key: `camera-${i}`,
        label: `Test Camera ${i}`,
      },
    });
    cameras.push(camera);
  }
  console.log(`✅ Created ${cameras.length} cameras`);

  // Create test events
  const eventTypes = ['person', 'car', 'dog', 'cat', 'bike'];
  const labels = [
    'Person detected',
    'Vehicle detected',
    'Animal detected',
    'Motion detected',
    'Unknown object',
  ];

  let eventCount = 0;
  const now = Date.now() / 1000; // Unix timestamp

  for (let camIdx = 0; camIdx < cameras.length; camIdx++) {
    const camera = cameras[camIdx];

    // Create 10 events per camera
    for (let i = 0; i < 10; i++) {
      const typeIdx = (camIdx * 10 + i) % eventTypes.length;
      const labelIdx = (camIdx * 10 + i) % labels.length;
      const startTime = now - (10 - i) * 3600; // Events spread over 10 hours

      const event = await prisma.event.upsert({
        where: {
          tenantId_frigateId: {
            tenantId: tenant.id,
            frigateId: `event-${camera.key}-${Date.now()}-${i}`,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          cameraId: camera.id,
          frigateId: `event-${camera.key}-${Date.now()}-${i}`,
          type: eventTypes[typeIdx],
          label: labels[labelIdx],
          hasSnapshot: Math.random() > 0.3,
          hasClip: Math.random() > 0.5,
          startTime,
          endTime: startTime + Math.random() * 30,
          rawPayload: {
            camera: camera.key,
            type: eventTypes[typeIdx],
            score: (Math.random() * 0.5 + 0.5).toFixed(2), // 0.5-1.0
            timestamp: startTime,
            metadata: {
              zone: `zone-${(camIdx % 2) + 1}`,
              confidence: Math.random().toFixed(2),
            },
          },
        },
      });

      eventCount++;
    }
  }

  console.log(`✅ Created ${eventCount} events across ${cameras.length} cameras`);
  console.log('✅ Database seeding completed');
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
